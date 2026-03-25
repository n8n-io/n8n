var findit = require('findit');

var find = findit.find(process.argv[2]||'./');

var count = 0;

find.on('file',function(path,stat){
	count++;
	process.stdout.write(path+"\n");
});

find.on('end',function(){
	console.log('found '+count+' regular files');
});
