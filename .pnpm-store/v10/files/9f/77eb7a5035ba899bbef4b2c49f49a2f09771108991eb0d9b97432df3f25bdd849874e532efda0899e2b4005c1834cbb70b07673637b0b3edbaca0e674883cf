var test = require('tape')
var walkdir = require('../')

test('async events',function(t){
  var paths = [],
  files = [],
  dirs = [];

  var emitter = walkdir(__dirname+'/dir/foo',function(path){
    paths.push(path.replace(__dirname+'/',''));
  }).ignore(__dirname+'/dir/foo');

  emitter.on('end',function(){
    t.equals(paths.length,0,'should have no paths')
    t.end();
  })

})
