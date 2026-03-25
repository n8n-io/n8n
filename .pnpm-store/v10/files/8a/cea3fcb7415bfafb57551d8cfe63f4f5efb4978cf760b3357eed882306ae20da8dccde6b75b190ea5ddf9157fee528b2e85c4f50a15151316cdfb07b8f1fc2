var test = require('tape');
var walkdir = require('../walkdir.js');
var path = require('path');

var expectedPaths = {
'dir/foo/x':'file',
'dir/foo/a':'dir',
'dir/foo/a/y':'file',
'dir/foo/a/b':'dir',
'dir/foo/a/b/z':'file',
'dir/foo/a/b/c':'dir',
'dir/foo/a/b/c/w':'file'
};


test("can use async method with promise",(t)=>{
  if(typeof Promise === 'undefined'){
    console.log('cannot use async promise returning methods in runtime without Promise')
    return t.end()
  }

  var p = walkdir.async(path.join(__dirname,'dir'))

  p.then(function(result){
    result = result.map(function(p){
      return p.replace(__dirname,'')
    })
    t.ok(result.indexOf('/dir/symlinks/dir1/dangling-symlink') > -1,'should be a list of found files and have found one in particular')
    t.end()
  }).catch(function(e){
    t.fail(e);
  })
})
