var test = require('tape'),
fs = require('fs'),
path = require('path'),
walk  = require('../walkdir.js');

test('should not emit fail events for empty dirs',function(t){
  fs.mkdir('./empty',function(err,data){
    if(err) {
      t.equals(err.code,'EEXIST','if error code on mkdir for fixture it should only be because it exists already');
    }

    var paths = [];
    var dirs = [];
    var emptys = [];
    var fails = [];

    var em = walk('./');

    em.on('fail',function(path,err){
      fails.push(path); 
    });

    em.on('empty',function(path,err){
      emptys.push(path); 
    });

    em.on('end',function(){
      t.equals(fails.length,0,'should not have any fails');
      t.equals(path.basename(emptys[0]),'empty','should find empty dir');
      t.end();
    });
  });
});

