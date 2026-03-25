var test = require('tape'),
walk  = require('../walkdir.js');

test('should be able to pause walk',function(t){

  var paths = [];
  var paused = false;
  var em = walk('./',function(path){
    if(!paused){
      em.pause();
      paused = 1;
      setTimeout(function(){
        t.equals(paths.length,1,'while paused should not emit any more paths');
        em.resume();
      },300);
    } else if(paused == 1){
      em.pause();
      paused = 2;
      setTimeout(function(){
        t.equals(paths.length,2,'while paused should not emit any more paths');
        em.resume();
      },300);
    }

    paths.push(path);

  });

  em.on('end',function(){
    console.log('end, and i found ',paths.length,'paths');
    t.ok(paths.length > 1,'should have more paths before end');
    t.end();
  });

});

