var spawn = require('child_process').spawn;

var find = spawn('find',[process.argv[2]||'./']);

var fs = require('fs');

var buf = '',count = 0;

handleBuf = function(data){

	buf += data;

	if(buf.length >= 1024) {
		var lines = buf.split("\n");
		buf = lines.pop();//last line my not be complete
		count += lines.length;
		process.stdout.write(lines.join("\n")+"\n");
	}
};

find.stdout.on('data',function(data){
	//buf += data.toString();
	handleBuf(data)
	//process.stdout.write(data.toString());
});

find.on('end',function(){
	handleBuf("\n");
	console.log('found '+count+' files');
	console.log('ended');
});

find.stdin.end();
