var findit = require('findit');

var files = findit.findSync(process.argv[2]||'./');

var count = files.length;

console.log(files);

files = files.join("\n");

process.stdout.write(files+"\n");

console.log('found '+count+' files');


