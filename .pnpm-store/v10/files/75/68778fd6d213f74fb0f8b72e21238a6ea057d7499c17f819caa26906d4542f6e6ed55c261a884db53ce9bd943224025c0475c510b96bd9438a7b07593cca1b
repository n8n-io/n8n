var test = require('tape'),
_fs = require('fs'),
walkdir = require('../walkdir.js');

var expectedPaths = {};

test('fs option',function(t){
  var paths = [];

  var emitter = walkdir(__dirname+'/dir/foo',{fs:
    {
      readdir: function () {
        var cb = arguments[arguments.length - 1];
        cb(null, []);
      },
      lstat: function (file) {
        var cb = arguments[arguments.length - 1];
        return _fs.lstat(__dirname, cb);
      }
    }
  },function(path,stat,depth){
    t.fail('there should be no files emitted');
  });

  emitter.on('end',function(){
     var expected = Object.keys(expectedPaths);
     t.ok(expected.length == paths.length, 'expected and emitted paths should have the same length');
     paths.forEach(function(v){ 
          t.ok(expected.indexOf(v) > -1,'all expected files should be in paths');
     });

     t.end();
  });
});
