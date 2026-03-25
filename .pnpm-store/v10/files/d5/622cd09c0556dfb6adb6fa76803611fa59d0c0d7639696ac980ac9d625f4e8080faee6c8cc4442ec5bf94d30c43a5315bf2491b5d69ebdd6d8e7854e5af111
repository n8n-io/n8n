var test = require('tape'),
walkdir = require('../walkdir.js');

var expectedPaths = {
'dir/foo/x':'file',
'dir/foo/a':'dir',
'dir/foo/a/y':'file',
'dir/foo/a/b':'dir',
'dir/foo/a/b/z':'file',
'dir/foo/a/b/c':'dir',
'dir/foo/a/b/c/w':'file'
};

test('async events',function(t){
  var paths = [],
  files = [],
  dirs = [];


  var emitter = walkdir(__dirname+'/dir/foo',function(path){
    //console.log('path: ',path);
    paths.push(path.replace(__dirname+'/',''));
  });

  emitter.on('directory',function(path,stat){
    dirs.push(path.replace(__dirname+'/',''));
  });

  emitter.on('file',function(path,stat){
    //console.log('file: ',path); 
    files.push(path.replace(__dirname+'/',''));
  });

  emitter.on('end',function(){

     files.forEach(function(v,k){
       t.equals(expectedPaths[v],'file','path from file event should be file');  
     });

     var expected = Object.keys(expectedPaths);

     t.ok(expected.length == paths.length, 'expected and emitted paths should have the same length');

     expected.forEach(function(v,k){
       if(expectedPaths[v] == 'file') {
          t.ok(files.indexOf(v) > -1,'should have file in files array');
       }
     });

     dirs.forEach(function(v,k){
       t.equals(expectedPaths[v],'dir','path from dir event should be dir '+v);  
     });

     expected.forEach(function(v,k){
       if(expectedPaths[v] == 'dir') {
          t.ok(dirs.indexOf(v) > -1,'should have dir in dirs array');
       }
     });

     expected.forEach(function(v,k){
       t.ok(paths.indexOf(v) !== -1,'should have found all expected paths '+v);
     });

     t.end();
  });
});
