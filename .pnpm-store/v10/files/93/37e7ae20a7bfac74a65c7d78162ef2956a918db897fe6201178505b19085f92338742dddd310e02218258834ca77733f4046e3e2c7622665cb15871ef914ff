var test = require('tape'),
walk  = require('../walkdir.js');

test('should be able to end walk after first path',function(t){

  var paths = [];

  var em = walk('../',function(path){
    paths.push(path);
    this.end();
  });

  em.on('end',function(){
    t.equals(paths.length,1,'should have only found one path');
    t.end();
  });

});

