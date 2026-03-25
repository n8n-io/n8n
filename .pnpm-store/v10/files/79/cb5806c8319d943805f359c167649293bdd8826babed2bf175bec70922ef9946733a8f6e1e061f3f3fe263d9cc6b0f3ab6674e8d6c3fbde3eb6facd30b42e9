var EventEmitter = require('events').EventEmitter,
_fs = require('fs'),
_path = require('path'),
sep = _path.sep||'/';// 0.6.x


module.exports = walkdir;

walkdir.find = walkdir.walk = walkdir;

walkdir.sync = function(path,options,eventHandler){
  if(typeof options == 'function') cb = options;
  options = options || {};
  options.sync = true;
  return walkdir(path,options,eventHandler);
};

// return promise.
walkdir.async = function(path,options,eventHandler){
  return new Promise((resolve,reject)=>{
    if(typeof options == 'function') cb = options;
    options = options || {};

    let emitter = walkdir(path,options,eventHandler)

    emitter.on('error',reject)
    emitter.on('fail',(path,err)=>{
      err.message = 'Error walking": '+path+' '+err.message
      if(err) reject(err)
    })

    let allPaths = {}
    emitter.on('path',(path,stat)=>{
      if(options.no_return !== true) allPaths[path] = stat;
    })
    emitter.on('end',()=>{
      if(options.no_return !== true){
        return resolve(options.return_object?allPaths:Object.keys(allPaths))
      }
      resolve()
    })
  })
}

function walkdir(path,options,cb){

  if(typeof options == 'function') cb = options;

  options = options || {};
  if(options.find_links === undefined){
    options.find_links = true;
  }
  
  var fs = options.fs || _fs;

  var emitter = new EventEmitter(),
  dontTraverse = [],
  allPaths = (options.return_object?{}:[]),
  resolved = false,
  inos = {},
  stop = 0,
  pause = null,
  ended = 0, 
  jobs=0, 
  job = function(value) {
    jobs += value;
    if(value < 1 && !tick) {
      tick = 1;
      process.nextTick(function(){
        tick = 0;
        if(jobs <= 0 && !ended) {
          ended = 1;
          emitter.emit('end');
        }
      });
    }
  }, tick = 0;

  emitter.ignore = function(path){
    if(Array.isArray(path)) dontTraverse.push.apply(dontTraverse,path)
    else dontTraverse.push(path)
    return this
  }

  //mapping is stat functions to event names.	
  var statIs = [['isFile','file'],['isDirectory','directory'],['isSymbolicLink','link'],['isSocket','socket'],['isFIFO','fifo'],['isBlockDevice','blockdevice'],['isCharacterDevice','characterdevice']];

  var statter = function (path,first,depth) {
    job(1);
    var statAction = function fn(err,stat,data) {

      job(-1);
      if(stop) return;

      // in sync mode i found that node will sometimes return a null stat and no error =(
      // this is reproduceable in file descriptors that no longer exist from this process
      // after a readdir on /proc/3321/task/3321/ for example. Where 3321 is this pid
      // node @ v0.6.10 
      if(err || !stat) { 
        emitter.emit('fail',path,err);
        return;
      }

      //if i have evented this inode already dont again.
      var fileName = _path.basename(path);
      var fileKey = stat.dev + '-' + stat.ino + '-' + fileName;
      if(options.track_inodes !== false) {
        if(inos[fileKey] && stat.ino) return;
        inos[fileKey] = 1;
      }

      if (first && stat.isDirectory()) {
        emitter.emit('targetdirectory',path,stat,depth);
        return;
      }

      emitter.emit('path', path, stat, depth);

      var i,name;

      for(var j=0,k=statIs.length;j<k;j++) {
        if(stat[statIs[j][0]]()) {
          emitter.emit(statIs[j][1],path,stat,depth);
          break;
        }
      }
    };
    
    if(options.sync) {
      var stat,ex;
      try{
        stat = fs[options.find_links?'lstatSync':'statSync'](path);
      } catch (e) {
        ex = e;
      }

      statAction(ex,stat);
    } else {
        fs[options.find_links?'lstat':'stat'](path,statAction);
    }
  },readdir = function(path,stat,depth){

    if(!resolved) {
      path = _path.resolve(path);
      resolved = 1;
    }

    if(options.max_depth && depth >= options.max_depth){
      emitter.emit('maxdepth',path,stat,depth);
      return;
    }

    if(dontTraverse.length){
      for(var i=0;i<dontTraverse.length;++i){
        if(dontTraverse[i] == path) {
          dontTraverse.splice(i,1)
          return;
        }
      }
    }

    job(1);
    var readdirAction = function(err,files) {
      job(-1);
      if (err || !files) {
        //permissions error or invalid files
        emitter.emit('fail',path,err);
        return;
      }

      if(!files.length) {
        // empty directory event.
        emitter.emit('empty',path,stat,depth);
        return;     
      }

      if(path == sep) path='';
      if(options.filter){
        var res = options.filter(path,files)
        if(!res){
          throw new Error('option.filter function must return a array of strings or a promise')
        }
        // support filters that return a promise
        if(res.then){
          job(1)
          res.then((files)=>{
            job(-1)
            for(var i=0,j=files.length;i<j;i++){
              statter(path+sep+files[i],false,(depth||0)+1);
            }
          })
          return;
        }
        //filtered files.
        files = res
      }
      for(var i=0,j=files.length;i<j;i++){
        statter(path+sep+files[i],false,(depth||0)+1);
      }

    };


    //use same pattern for sync as async api
    if(options.sync) {
      var e,files;
      try {
          files = fs.readdirSync(path);
      } catch (_e) { e = _e}

      readdirAction(e,files);
    } else {
      fs.readdir(path,readdirAction);
    }
  };

  if (options.follow_symlinks) {
    var linkAction = function(err,path,depth){
      job(-1);
      //TODO should fail event here on error?
      statter(path,false,depth);
    };

    emitter.on('link',function(path,stat,depth){
      job(1);
      if(options.sync) {
        var lpath,ex;
        try {
          lpath = fs.readlinkSync(path);
        } catch(e) {
          ex = e;
        }
        linkAction(ex,_path.resolve(_path.dirname(path),lpath),depth);

      } else {
        fs.readlink(path,function(err,lpath){
          linkAction(err,_path.resolve(_path.dirname(path),lpath),depth);
        });
      }
    });
  }

  if (cb) {
    emitter.on('path',cb);
  }

  if (options.sync) {
    if(!options.no_return){
      emitter.on('path',function(path,stat){
        if(options.return_object) allPaths[path] = stat;
        else allPaths.push(path);
      });
    }
  }

  if (!options.no_recurse) {
    emitter.on('directory',readdir);
  }
  //directory that was specified by argument.
  emitter.once('targetdirectory',readdir);
  //only a fail on the path specified by argument is fatal 
  emitter.once('fail',function(_path,err){
    //if the first dir fails its a real error
    if(path == _path) {
      emitter.emit('error',new Error('error reading first path in the walk '+path+'\n'+err),err);
    }
  });

  statter(path,1);
  if (options.sync) {
    return allPaths;
  } else {
    //support stopping everything.
    emitter.end = emitter.stop = function(){stop = 1;};
    //support pausing everything
    var emitQ = [];
    emitter.pause = function(){
      job(1);
      pause = true;
      emitter.emit = function(){
        emitQ.push(arguments);
      };
    };
    // support getting the show going again
    emitter.resume = function(){
      if(!pause) return;
      pause = false;
      // not pending
      job(-1);
      //replace emit
      emitter.emit = EventEmitter.prototype.emit;
      // local ref
      var q = emitQ;
      // clear ref to prevent infinite loops
      emitQ = [];
      while(q.length) {
        emitter.emit.apply(emitter,q.shift());
      }
    };

    return emitter;
  }

}
