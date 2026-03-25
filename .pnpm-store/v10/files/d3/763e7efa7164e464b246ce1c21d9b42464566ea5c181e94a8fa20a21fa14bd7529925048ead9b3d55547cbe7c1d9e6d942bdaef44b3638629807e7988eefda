var lsr = require('ls-r');

lsr(process.argv[2]||'./',{maxDepth:500000,recursive:true},function(err,origPath,args){
	if(err) {
		console.log('eww an error! ',err);
		return;
	}
//console.log('hit');
	var c = 0;
	args.forEach(function(stat){
		if(stat.isFile()){
			console.log(stat.path);
			c++;
		}
	});

	console.log('found '+args.length+" regular files");
});
