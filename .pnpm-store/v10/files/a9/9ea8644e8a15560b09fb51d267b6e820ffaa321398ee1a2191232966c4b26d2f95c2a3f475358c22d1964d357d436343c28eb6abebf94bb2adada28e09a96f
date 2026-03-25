var test = require('tape');
var walkdir = require('../walkdir.js');
var path = require('path');

test("can use filter option returning array",(t)=>{
  
    var filterFn = function(dirPath,files){
        return files.filter((name)=>name != 'nested-symlink')
    }

    var p = walkdir.async(path.join(__dirname,'dir'),{filter:filterFn})
  
    p.then(function(result){
      result = result.map(function(p){
        return p.replace(__dirname,'')
      })

      t.ok(result.join(',').indexOf('nested-symlink') === -1,'should have no mention of nested-symlink if filtered')
      t.end()
    }).catch(function(e){
      t.fail(e);
    })
})

test("can use filter option returning promise",(t)=>{
    if(typeof Promise === 'undefined'){
      console.log('cannot use async promise returning methods in runtime without Promise')
      return t.end()
    }
  
    var filterFn = function(dirPath,files){
        return new Promise(function (resolve,reject){
            files = files.filter((name)=>name != 'nested-symlink')
            resolve(files);
        })
    }

    var p = walkdir.async(path.join(__dirname,'dir'),{filter:filterFn})
  
    p.then(function(result){
      result = result.map(function(p){
        return p.replace(__dirname,'')
      })

      t.ok(result.join(',').indexOf('nested-symlink') === -1,'should have no mention of nested-symlink if filtered')
      t.end()
    }).catch(function(e){
      t.fail(e);
    })
})
  