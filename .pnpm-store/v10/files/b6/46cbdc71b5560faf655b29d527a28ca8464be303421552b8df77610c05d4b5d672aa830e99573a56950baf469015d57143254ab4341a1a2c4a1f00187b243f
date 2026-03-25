var test = require('tape')
var walkdir = require('../walkdir.js')
var basename = require('path').basename

test('follow symlinks',function(t){

  var links = [],paths = [],failures = [],errors = [], files = [];

  var emitter = walkdir(__dirname+'/dir/nested-symlink',{follow_symlinks:true});

  emitter.on('path',function(path,stat){
    paths.push(path);
  });

  emitter.on('file',function(path,stat){
    files.push(path);
  });

  emitter.on('link',function(path,stat){
    links.push(path);
  });

  emitter.on('error',function(path,err){
    console.log('error!!', arguments);
    errors.push(arguments);
  });

  emitter.on('fail',function(path,err){
    failures.push(path);
  });

  emitter.on('end',function(){

    t.equal(files.length,1)
    t.equal(basename(files[0]),'found-me','found the nested symlink')
    t.equal(paths.length,3,'should find 3 things')

    t.ok(!failures.length,'no failures')

    t.end();

  });
})
