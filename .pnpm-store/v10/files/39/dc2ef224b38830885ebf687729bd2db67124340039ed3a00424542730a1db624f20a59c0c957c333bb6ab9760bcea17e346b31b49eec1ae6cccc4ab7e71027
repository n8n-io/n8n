var test = require('tape'),
walkdir = require('../walkdir.js');


test('follow symlinks',function(t){

  var links = [],paths = [],failures = [],errors = [];

  var emitter = walkdir(__dirname+'/dir/symlinks/dir2',{follow_symlinks:true});

  emitter.on('path',function(path,stat){
    paths.push(path);
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

    t.equal(errors.length,0,'should have no errors');
    t.equal(failures.length,1,'should have a failure');
    t.ok(paths.indexOf(__dirname+'/dir/symlinks/dir1/file1') !== -1,'if follow symlinks works i would have found dir1 file1');
    t.equal(require('path').basename(failures[0]),'does-not-exist','should have fail resolviong does-not-exist which dangling-symlink points to');
    t.end();

  });
});
