var test = require('tape'),
walkdir = require('../walkdir.js');

var expectedPaths = {
'dir/foo/x':'file',
'dir/foo/a':'dir',
'dir/foo/a/y':'file',
'dir/foo/a/b':'dir'
};

test('no_recurse option',function(t){
  var paths = [];

  var emitter = walkdir(__dirname+'/dir/foo',{max_depth:2},function(path,stat,depth){
    paths.push(path.replace(__dirname+'/',''));
    t.ok(depth < 3,' all paths emitted should have a depth less than 3');
  });

  emitter.on('end',function(){
     var expected = Object.keys(expectedPaths);

     t.ok(expected.length == paths.length, 'expected and emitted paths should have the same length');

     paths.forEach(function(v){ 
          t.ok(expected.indexOf(v) > -1,'paths should not have any unexpected files');
     });

     t.end();
  });
});
