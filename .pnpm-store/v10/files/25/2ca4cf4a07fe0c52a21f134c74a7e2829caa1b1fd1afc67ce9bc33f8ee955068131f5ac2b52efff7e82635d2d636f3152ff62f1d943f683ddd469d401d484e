var fstream = require('fstream');

var pipe = fstream.Reader(process.argv[2]||"../");

var count = 0,errorHandler;

pipe.on('entry',function fn(entry){
  if(entry.type == "Directory"){
  	entry.on('entry',fn);
  } else if(entry.type == "File") {
  	count++;
  }
  entry.on('error',errorHandler);
});

pipe.on('error',(errorHandler = function(error){
	console.log('error event ',error);
}));

pipe.on('end',function(){
	console.log('end! '+count);
});

//this is pretty slow
