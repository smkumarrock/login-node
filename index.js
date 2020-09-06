const express = require('express')
const app = express();
const port = process.env.PORT || 3200;
var MongoClient = require('mongodb').MongoClient;
const bodyParser = require('body-parser')
var url = "mongodb://localhost:27017/smk";
const jwt = require("jsonwebtoken")
const multer = require("multer")
const bcrypt = require('bcrypt');
const jwtKey = "smk"
// const jwtExpirySeconds = 300
var router = express.Router();
var fs = require('fs');
const imageToBase64 = require('image-to-base64');

app.listen(port, () => {
  console.log(`Server running at http:${port}`);
});

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", req.headers.origin);
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, authorization ");
  next();
});

app.use(
  bodyParser.urlencoded({
    extended: true
  })
)

app.use(bodyParser.json())


const storage = multer.diskStorage({
  destination: (req, file, callback)=>{
    callback(null, 'uploads')
  },
  filename: (req, file, callback)=>{
    callback(null, `filename${file.originalname}`)
  }
})

var upload = multer({storage: storage})


app.route('/signup').post(upload.single('file'),(req, res, next) => {
  console.log('server hosting');
  console.log('req body', req.body.mobile);
  const file = req.file;
  MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    var dbo = db.db("smk");
    var user_id = Math.floor(100000 + Math.random() * 900000);
    var pwd = req.body.password;
    const token = jwt.sign({ user_id, pwd }, jwtKey, {
      algorithm: "HS256",
    });
    bcrypt.hash(pwd, 5, function(err, hash) {
      var myobj = { 
          email: req.body.email, 
          mobile: req.body.mobile, 
          firstName: req.body.firstName, 
          lastName: req.body.lastName, 
          gender: req.body.gender, 
          password: hash, 
          user_id: user_id, 
          profile: file.filename,
          access_token: token 
        };
      dbo.collection("users").insertOne(myobj, function(err, userres) {
        if (err) throw err;
        // console.log("1 document inserted", userres);
        db.close();
        console.log("token:", token);
        res.send({access_token: token});
      });
    });
  });
})





// app.route('/file').post(upload.single('file'), (req, res, next)=>{
//   console.log(req.file);
//   const file = req.file
//   console.log(file.filename);
//   if(!file){
//     const error = new Error('Please upload file')
//     error.httpStatusCode = 400;
//     return next(error)
//   }
//   res.send(file)
// })


app.route('/login').post((req, res) => {
  console.log('server hosting');
  console.log('req headers', req.body);
  const mongooseOpts = {
    useNewUrlParser: true,
    autoReconnect: true,
    reconnectTries: Number.MAX_VALUE,
    reconnectInterval: 1000,
    poolSize: 10,
  };
  MongoClient.connect(url, mongooseOpts, function(err, db) {
    if (err) throw err;
    var dbo = db.db("smk");
    dbo.collection("users").findOne({email: req.body.name}, function(err, userres) {
      if (err) throw err;
      console.log("1 document find", userres);

      bcrypt.compare(req.body.password, userres.password, function(err, result) {
        if(result == true){
            res.send({access_token: userres.access_token})
          }
        })
      // const base64Url = parsedToken.split('.')[1];
      // const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      // const buff = new Buffer(base64, 'base64');
      // const payloadinit = buff.toString('ascii');
      // const payload = JSON.parse(payloadinit);
      // console.log(payload);
      // if(payload.user_id && payload){
      //   if(payload.user_id == userres.user_id && payload.pwd == req.body.password){
      //     res.send({access_token: parsedToken});
      //   } else {
      //   res.status(404).send({errmsg:'wrong password'});
      // }
      // } else {
      //   res.status(404).send({errmsg:'unautherized'});
      // }
      db.close();
    });
  });
})

app.route('/device/read').get((req, res) => {
  console.log('server hosting');
  console.log('req headers', req.headers);
  MongoClient.connect(url, function(err, db) {
    if (err) throw err;
      var dbo = db.db("smk");
      const base64Url = req.headers.authorization.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const buff = new Buffer(base64, 'base64');
      const payloadinit = buff.toString('ascii');
      const payload = JSON.parse(payloadinit);
      console.log(payload);

    dbo.collection("users").findOne({user_id: payload.user_id}, function(err, userres) {
      if (err) throw err;
      console.log("document find", userres);
      res.send(userres);
      db.close();
    });
  });
})


app.route('/device/profile').post((req, res) => {
  console.log(req.body.profile);
  console.log("document find", __dirname);
  var image_path = __dirname+'/uploads/'+req.body.profile;
  console.log(image_path);
  fs.access(image_path, fs.constants.F_OK, err=>{
    console.log('doesnot exist');
  })
  imageToBase64(image_path) // Path to the image
      .then(
          (response) => {
            var res_profile = "data:image/jpg;base64,"+response;
            res.send({'img':res_profile});
          }
      )
      .catch(
          (error) => {
              console.log(error);
          }
      )
  // fs.readFile(image_path, (err, content)=>{
  //   if(!err){
  //     console.log('test', content);
  //     res.writeHead(200, {"content-type": "image/jpg"})
  //     res.end(content);
  //   }
  // })
})

module.exports = router;