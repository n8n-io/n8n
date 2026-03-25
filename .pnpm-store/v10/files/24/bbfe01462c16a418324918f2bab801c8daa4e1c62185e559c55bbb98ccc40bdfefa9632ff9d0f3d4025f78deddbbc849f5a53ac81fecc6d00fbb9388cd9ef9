
/**
 * Module dependencies.
 */

var spawn = require('cross-spawn');
var utils = require('./utils');
var debug = require('debug')('gm');
var series = require('array-series');
var PassThrough = require('stream').PassThrough;

/**
 * Error messaging.
 */

var noBufferConcat = 'gm v1.9.0+ required node v0.8+. Please update your version of node, downgrade gm < 1.9, or do not use `bufferStream`.';

/**
 * Extend proto
 */

module.exports = function (proto) {

  function args (prop) {
    return function args () {
      var len = arguments.length;
      var a = [];
      var i = 0;

      for (; i < len; ++i) {
        a.push(arguments[i]);
      }

      this[prop] = this[prop].concat(a);
      return this;
    }
  }

  function streamToUnemptyBuffer(stream, callback) {
    var done = false
    var buffers = []

    stream.on('data', function (data) {
      buffers.push(data)
    })

    stream.on('end', function () {
      if (done)
        return

      done = true
      let result = Buffer.concat(buffers)
      buffers = null

      if (result.length === 0) {
        const err = new Error("Stream yields empty buffer");
        callback(err, null);
      } else {
        callback(null, result);
      }
    })

    stream.on('error', function (err) {
      done = true
      buffers = null
      callback(err)
    })
  }

  proto.in = args('_in');
  proto.out = args('_out');

  proto._preprocessor = [];
  proto.preprocessor = args('_preprocessor');

  /**
   * Execute the command and write the image to the specified file name.
   *
   * @param {String} name
   * @param {Function} callback
   * @return {Object} gm
   */

  proto.write = function write (name, callback) {
    if (!callback) callback = name, name = null;

    if ("function" !== typeof callback) {
      throw new TypeError("gm().write() expects a callback function")
    }

    if (!name) {
      return callback(TypeError("gm().write() expects a filename when writing new files"));
    }

    this.outname = name;

    var self = this;
    this._preprocess(function (err) {
      if (err) return callback(err);
      self._spawn(self.args(), true, callback);
    });
  }

  /**
   * Execute the command and return stdin and stderr
   * ReadableStreams providing the image data.
   * If no callback is passed, a "through" stream will be returned,
   * and stdout will be piped through, otherwise the error will be passed.
   *
   * @param {String} format (optional)
   * @param {Function} callback (optional)
   * @return {Stream}
   */

  proto.stream = function stream (format, callback) {
    if (!callback && typeof format === 'function') {
      callback = format;
      format = null;
    }

    var throughStream;

    if ("function" !== typeof callback) {
      throughStream = new PassThrough();
      callback = function (err, stdout, stderr) {
        if (err) throughStream.emit('error', err);
        else stdout.pipe(throughStream);
      }
    }

    if (format) {
      format = format.split('.').pop();
      this.outname = format + ":-";
    }

    var self = this;
    this._preprocess(function (err) {
      if (err) return callback(err);
      return self._spawn(self.args(), false, callback);
    });

    return throughStream || this;
  }

  /**
   * Convenience function for `proto.stream`.
   * Simply returns the buffer instead of the stream.
   *
   * @param {String} format (optional)
   * @param {Function} callback
   * @return {null}
   */

  proto.toBuffer = function toBuffer (format, callback) {
    if (!callback) callback = format, format = null;

    if ("function" !== typeof callback) {
      throw new Error('gm().toBuffer() expects a callback.');
    }

    return this.stream(format, function (err, stdout) {
      if (err) return callback(err);

      streamToUnemptyBuffer(stdout, callback);
    })
  }

  /**
    * Run any preProcessor functions in series. Used by autoOrient.
    *
    * @param {Function} callback
    * @return {Object} gm
    */

  proto._preprocess = function _preprocess (callback) {
    series(this._preprocessor, this, callback);
  }

  /**
    * Execute the command, buffer input and output, return stdout and stderr buffers.
    *
    * @param {String} bin
    * @param {Array} args
    * @param {Function} callback
    * @return {Object} gm
    */

  proto._exec = function _exec (args, callback) {
    return this._spawn(args, true, callback);
  }

  /**
    * Execute the command with stdin, returning stdout and stderr streams or buffers.
    * @param {String} bin
    * @param {Array} args
    * @param {ReadableStream} stream
    * @param {Boolean} shouldBuffer
    * @param {Function} callback, signature (err, stdout, stderr) -> *
    * @return {Object} gm
    * @TODO refactor this mess
    */

  proto._spawn = function _spawn (args, bufferOutput, callback) {
    var appPath = this._options.appPath || '';
    var bin

    // Resolve executable
    switch (this._options.imageMagick) {
      // legacy behavior
      case true:
        bin = args.shift();
        break;

      // ImgeMagick >= 7
      case '7+':
        bin = 'magick'
        break;

      // GraphicsMagick
      default:
        bin = 'gm';
        break;
    }

    // Prepend app path
    bin = appPath + bin

    var cmd = bin + ' ' + args.map(utils.escape).join(' ')
      , self = this
      , proc, err
      , timeout = parseInt(this._options.timeout)
      , disposers = this._options.disposers
      , timeoutId;

    debug(cmd);
    //imageMagick does not support minify (https://github.com/aheckmann/gm/issues/385)
    if(args.indexOf("-minify") > -1 && this._options.imageMagick){
      return cb(new Error("imageMagick does not support minify, use -scale or -sample. Alternatively, use graphicsMagick"));
    }
    try {
      proc = spawn(bin, args);
    } catch (e) {
      return cb(e);
    }
    proc.stdin.once('error', cb);

    proc.on('error', function(err){
      if (err.code === 'ENOENT') {
        cb(new Error('Could not execute GraphicsMagick/ImageMagick: '+cmd+" this most likely means the gm/convert binaries can't be found"));
      } else {
        cb(err);
      }
    });

    if (timeout) {
      timeoutId = setTimeout(function(){
        dispose('gm() resulted in a timeout.');
      }, timeout);
    }

    if (disposers) {
      disposers.forEach(function(disposer) {
        disposer.events.forEach(function(event) {
          disposer.emitter.on(event, dispose);
        });
      });
    }

    if (self.sourceBuffer) {
      proc.stdin.write(this.sourceBuffer);
      proc.stdin.end();
    } else if (self.sourceStream) {

      if (!self.sourceStream.readable) {
        return cb(new Error("gm().stream() or gm().write() with a non-readable stream."));
      }

      self.sourceStream.pipe(proc.stdin);

      // bufferStream
      // We convert the input source from a stream to a buffer.
      if (self.bufferStream && !this._buffering) {
        if (!Buffer.concat) {
          throw new Error(noBufferConcat);
        }

        // Incase there are multiple processes in parallel,
        // we only need one
        self._buffering = true;

        streamToUnemptyBuffer(self.sourceStream, function (err, buffer) {
          self.sourceBuffer = buffer;
          self.sourceStream = null; // The stream is now dead
        })
      }
    }

    // for _exec operations (identify() mostly), we also
    // need to buffer the output stream before returning
    if (bufferOutput) {
      var stdout = ''
        , stderr = ''
        , onOut
        , onErr
        , onExit

      proc.stdout.on('data', onOut = function (data) {
        stdout += data;
      });

      proc.stderr.on('data', onErr = function (data) {
        stderr += data;
      });

      proc.on('close', onExit = function (code, signal) {
        let err;
        if (code !== 0 || signal !== null) {
          err = new Error('Command failed: ' + stderr);
          err.code = code;
          err.signal = signal;
        };
        cb(err, stdout, stderr, cmd);
        stdout = stderr = onOut = onErr = onExit = null;
      });
    } else {
      cb(null, proc.stdout, proc.stderr, cmd);
    }

    return self;

    function cb (err, stdout, stderr, cmd) {
      if (cb.called) return;
      if (timeoutId) clearTimeout(timeoutId);
      cb.called = 1;
      if (args[0] !== 'identify' && bin !== 'identify') {
        self._in = [];
        self._out = [];
      }
      callback.call(self, err, stdout, stderr, cmd);
    }

    function dispose (msg) {
      const message = msg ? msg : 'gm() was disposed';
      const err = new Error(message);
      cb(err);
      if (proc.exitCode === null) {
        proc.stdin.pause();
        proc.kill();
      }
    }
  }

  /**
   * Returns arguments to be used in the command.
   *
   * @return {Array}
   */

  proto.args = function args () {
    var outname = this.outname || "-";
  	if (this._outputFormat) outname = this._outputFormat + ':' + outname;

    return [].concat(
        this._subCommand
      , this._in
      , this.src()
      , this._out
      , outname
    ).filter(Boolean); // remove falsey
  }

  /**
   * Adds an img source formatter.
   *
   * `formatters` are passed an array of images which will be
   * used as 'input' images for the command. Useful for methods
   * like `.append()` where multiple source images may be used.
   *
   * @param {Function} formatter
   * @return {gm} this
   */

  proto.addSrcFormatter = function addSrcFormatter (formatter) {
    if ('function' != typeof formatter)
      throw new TypeError('sourceFormatter must be a function');
    this._sourceFormatters || (this._sourceFormatters = []);
    this._sourceFormatters.push(formatter);
    return this;
  }

  /**
   * Applies all _sourceFormatters
   *
   * @return {Array}
   */

  proto.src = function src () {
    var arr = [];
    for (var i = 0; i < this._sourceFormatters.length; ++i) {
      this._sourceFormatters[i].call(this, arr);
    }
    return arr;
  }

  /**
   * Image types.
   */

  var types = {
      'jpg': /\.jpe?g$/i
    , 'png' : /\.png$/i
    , 'gif' : /\.gif$/i
    , 'tiff': /\.tif?f$/i
    , 'bmp' : /(?:\.bmp|\.dib)$/i
    , 'webp': /\.webp$/i
  };

  types.jpeg = types.jpg;
  types.tif = types.tiff;
  types.dib = types.bmp;

  /**
   * Determine the type of source image.
   *
   * @param {String} type
   * @return {Boolean}
   * @example
   *   if (this.inputIs('png')) ...
   */

  proto.inputIs = function inputIs (type) {
    if (!type) return false;

    var rgx = types[type];
    if (!rgx) {
      if ('.' !== type[0]) type = '.' + type;
      rgx = new RegExp('\\' + type + '$', 'i');
    }

    return rgx.test(this.source);
  }

  /**
   * add disposer (like 'close' of http.IncomingMessage) in order to dispose gm() with any event
   *
   * @param {EventEmitter} emitter
   * @param {Array} events
   * @return {Object} gm
   * @example
   *   command.addDisposer(req, ['close', 'end', 'finish']);
   */

  proto.addDisposer = function addDisposer (emitter, events) {
    if (!this._options.disposers) {
      this._options.disposers = [];
    }
    this._options.disposers.push({
      emitter: emitter,
      events: events
    });
    return this;
  };
}
