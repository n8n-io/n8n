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

test('sync',function(t){
  var paths = [],
  files = [],
  dirs = [];

  var pathResult = walkdir.sync(__dirname+'/dir/foo',function(path){
    console.log('path: ',path);
    paths.push(path);
  });

  t.ok(pathResult instanceof Array,'if return object is not specified should be an array');

  t.equals(Object.keys(expectedPaths).length,paths.length,'should have found the same number of paths as expected');


  Object.keys(expectedPaths).forEach(function(v,k){

      t.ok(paths.indexOf(__dirname+'/'+v) > -1,v+' should be found');
  });

  t.deepEquals(paths,pathResult,'paths should be equal to pathResult');

  t.end();
});

test('sync return object',function(t){

  var pathResult = walkdir.sync(__dirname+'/dir/foo',{return_object:true});

  t.ok(!(pathResult instanceof Array),'if return object is not specified should be an array');

  t.equals(Object.keys(expectedPaths).length,Object.keys(pathResult).length,'should find the same number of paths as expected');

  Object.keys(expectedPaths).forEach(function(v,k){
      t.ok(pathResult[__dirname+'/'+v],'should  find path in result object');
  });

  t.end();
});
