/* eslint-disable complexity,max-statements */
/**
 * file.js: Transport for outputting to a local log file.
 *
 * (C) 2010 Charlie Robbins
 * MIT LICENCE
 */

'use strict';

function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _callSuper(t, o, e) { return o = _getPrototypeOf(o), _possibleConstructorReturn(t, _isNativeReflectConstruct() ? Reflect.construct(o, e || [], _getPrototypeOf(t).constructor) : o.apply(t, e)); }
function _possibleConstructorReturn(t, e) { if (e && ("object" == _typeof(e) || "function" == typeof e)) return e; if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined"); return _assertThisInitialized(t); }
function _assertThisInitialized(e) { if (void 0 === e) throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); return e; }
function _isNativeReflectConstruct() { try { var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); } catch (t) {} return (_isNativeReflectConstruct = function _isNativeReflectConstruct() { return !!t; })(); }
function _getPrototypeOf(t) { return _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function (t) { return t.__proto__ || Object.getPrototypeOf(t); }, _getPrototypeOf(t); }
function _inherits(t, e) { if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function"); t.prototype = Object.create(e && e.prototype, { constructor: { value: t, writable: !0, configurable: !0 } }), Object.defineProperty(t, "prototype", { writable: !1 }), e && _setPrototypeOf(t, e); }
function _setPrototypeOf(t, e) { return _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function (t, e) { return t.__proto__ = e, t; }, _setPrototypeOf(t, e); }
var fs = require('fs');
var path = require('path');
var asyncSeries = require('async/series');
var zlib = require('zlib');
var _require = require('triple-beam'),
  MESSAGE = _require.MESSAGE;
var _require2 = require('readable-stream'),
  Stream = _require2.Stream,
  PassThrough = _require2.PassThrough;
var TransportStream = require('winston-transport');
var debug = require('@dabh/diagnostics')('winston:file');
var os = require('os');
var tailFile = require('../tail-file');

/**
 * Transport for outputting to a local log file.
 * @type {File}
 * @extends {TransportStream}
 */
module.exports = /*#__PURE__*/function (_TransportStream) {
  /**
   * Constructor function for the File transport object responsible for
   * persisting log messages and metadata to one or more files.
   * @param {Object} options - Options for this instance.
   */
  function File() {
    var _this;
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    _classCallCheck(this, File);
    _this = _callSuper(this, File, [options]);

    // Expose the name of this Transport on the prototype.
    _this.name = options.name || 'file';

    // Helper function which throws an `Error` in the event that any of the
    // rest of the arguments is present in `options`.
    function throwIf(target) {
      for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }
      args.slice(1).forEach(function (name) {
        if (options[name]) {
          throw new Error("Cannot set ".concat(name, " and ").concat(target, " together"));
        }
      });
    }

    // Setup the base stream that always gets piped to to handle buffering.
    _this._stream = new PassThrough();
    _this._stream.setMaxListeners(30);

    // Bind this context for listener methods.
    _this._onError = _this._onError.bind(_this);
    if (options.filename || options.dirname) {
      throwIf('filename or dirname', 'stream');
      _this._basename = _this.filename = options.filename ? path.basename(options.filename) : 'winston.log';
      _this.dirname = options.dirname || path.dirname(options.filename);
      _this.options = options.options || {
        flags: 'a'
      };
    } else if (options.stream) {
      // eslint-disable-next-line no-console
      console.warn('options.stream will be removed in winston@4. Use winston.transports.Stream');
      throwIf('stream', 'filename', 'maxsize');
      _this._dest = _this._stream.pipe(_this._setupStream(options.stream));
      _this.dirname = path.dirname(_this._dest.path);
      // We need to listen for drain events when write() returns false. This
      // can make node mad at times.
    } else {
      throw new Error('Cannot log to file without filename or stream.');
    }
    _this.maxsize = options.maxsize || null;
    _this.rotationFormat = options.rotationFormat || false;
    _this.zippedArchive = options.zippedArchive || false;
    _this.maxFiles = options.maxFiles || null;
    _this.eol = typeof options.eol === 'string' ? options.eol : os.EOL;
    _this.tailable = options.tailable || false;
    _this.lazy = options.lazy || false;

    // Internal state variables representing the number of files this instance
    // has created and the current size (in bytes) of the current logfile.
    _this._size = 0;
    _this._pendingSize = 0;
    _this._created = 0;
    _this._drain = false;
    _this._opening = false;
    _this._ending = false;
    _this._fileExist = false;
    if (_this.dirname) _this._createLogDirIfNotExist(_this.dirname);
    if (!_this.lazy) _this.open();
    return _this;
  }
  _inherits(File, _TransportStream);
  return _createClass(File, [{
    key: "finishIfEnding",
    value: function finishIfEnding() {
      var _this2 = this;
      if (this._ending) {
        if (this._opening) {
          this.once('open', function () {
            _this2._stream.once('finish', function () {
              return _this2.emit('finish');
            });
            setImmediate(function () {
              return _this2._stream.end();
            });
          });
        } else {
          this._stream.once('finish', function () {
            return _this2.emit('finish');
          });
          setImmediate(function () {
            return _this2._stream.end();
          });
        }
      }
    }

    /**
     * Core logging method exposed to Winston. Metadata is optional.
     * @param {Object} info - TODO: add param description.
     * @param {Function} callback - TODO: add param description.
     * @returns {undefined}
     */
  }, {
    key: "log",
    value: function log(info) {
      var _this3 = this;
      var callback = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : function () {};
      // Remark: (jcrugzz) What is necessary about this callback(null, true) now
      // when thinking about 3.x? Should silent be handled in the base
      // TransportStream _write method?
      if (this.silent) {
        callback();
        return true;
      }

      // Output stream buffer is full and has asked us to wait for the drain event
      if (this._drain) {
        this._stream.once('drain', function () {
          _this3._drain = false;
          _this3.log(info, callback);
        });
        return;
      }
      if (this._rotate) {
        this._stream.once('rotate', function () {
          _this3._rotate = false;
          _this3.log(info, callback);
        });
        return;
      }
      if (this.lazy) {
        if (!this._fileExist) {
          if (!this._opening) {
            this.open();
          }
          this.once('open', function () {
            _this3._fileExist = true;
            _this3.log(info, callback);
            return;
          });
          return;
        }
        if (this._needsNewFile(this._pendingSize)) {
          this._dest.once('close', function () {
            if (!_this3._opening) {
              _this3.open();
            }
            _this3.once('open', function () {
              _this3.log(info, callback);
              return;
            });
            return;
          });
          return;
        }
      }

      // Grab the raw string and append the expected EOL.
      var output = "".concat(info[MESSAGE]).concat(this.eol);
      var bytes = Buffer.byteLength(output);

      // After we have written to the PassThrough check to see if we need
      // to rotate to the next file.
      //
      // Remark: This gets called too early and does not depict when data
      // has been actually flushed to disk.
      function logged() {
        var _this4 = this;
        this._size += bytes;
        this._pendingSize -= bytes;
        debug('logged %s %s', this._size, output);
        this.emit('logged', info);

        // Do not attempt to rotate files while rotating
        if (this._rotate) {
          return;
        }

        // Do not attempt to rotate files while opening
        if (this._opening) {
          return;
        }

        // Check to see if we need to end the stream and create a new one.
        if (!this._needsNewFile()) {
          return;
        }
        if (this.lazy) {
          this._endStream(function () {
            _this4.emit('fileclosed');
          });
          return;
        }

        // End the current stream, ensure it flushes and create a new one.
        // This could potentially be optimized to not run a stat call but its
        // the safest way since we are supporting `maxFiles`.
        this._rotate = true;
        this._endStream(function () {
          return _this4._rotateFile();
        });
      }

      // Keep track of the pending bytes being written while files are opening
      // in order to properly rotate the PassThrough this._stream when the file
      // eventually does open.
      this._pendingSize += bytes;
      if (this._opening && !this.rotatedWhileOpening && this._needsNewFile(this._size + this._pendingSize)) {
        this.rotatedWhileOpening = true;
      }
      var written = this._stream.write(output, logged.bind(this));
      if (!written) {
        this._drain = true;
        this._stream.once('drain', function () {
          _this3._drain = false;
          callback();
        });
      } else {
        callback(); // eslint-disable-line callback-return
      }
      debug('written', written, this._drain);
      this.finishIfEnding();
      return written;
    }

    /**
     * Query the transport. Options object is optional.
     * @param {Object} options - Loggly-like query options for this instance.
     * @param {function} callback - Continuation to respond to when complete.
     * TODO: Refactor me.
     */
  }, {
    key: "query",
    value: function query(options, callback) {
      if (typeof options === 'function') {
        callback = options;
        options = {};
      }
      options = normalizeQuery(options);
      var file = path.join(this.dirname, this.filename);
      var buff = '';
      var results = [];
      var row = 0;
      var stream = fs.createReadStream(file, {
        encoding: 'utf8'
      });
      stream.on('error', function (err) {
        if (stream.readable) {
          stream.destroy();
        }
        if (!callback) {
          return;
        }
        return err.code !== 'ENOENT' ? callback(err) : callback(null, results);
      });
      stream.on('data', function (data) {
        data = (buff + data).split(/\n+/);
        var l = data.length - 1;
        var i = 0;
        for (; i < l; i++) {
          if (!options.start || row >= options.start) {
            add(data[i]);
          }
          row++;
        }
        buff = data[l];
      });
      stream.on('close', function () {
        if (buff) {
          add(buff, true);
        }
        if (options.order === 'desc') {
          results = results.reverse();
        }

        // eslint-disable-next-line callback-return
        if (callback) callback(null, results);
      });
      function add(buff, attempt) {
        try {
          var log = JSON.parse(buff);
          if (check(log)) {
            push(log);
          }
        } catch (e) {
          if (!attempt) {
            stream.emit('error', e);
          }
        }
      }
      function push(log) {
        if (options.rows && results.length >= options.rows && options.order !== 'desc') {
          if (stream.readable) {
            stream.destroy();
          }
          return;
        }
        if (options.fields) {
          log = options.fields.reduce(function (obj, key) {
            obj[key] = log[key];
            return obj;
          }, {});
        }
        if (options.order === 'desc') {
          if (results.length >= options.rows) {
            results.shift();
          }
        }
        results.push(log);
      }
      function check(log) {
        if (!log) {
          return;
        }
        if (_typeof(log) !== 'object') {
          return;
        }
        var time = new Date(log.timestamp);
        if (options.from && time < options.from || options.until && time > options.until || options.level && options.level !== log.level) {
          return;
        }
        return true;
      }
      function normalizeQuery(options) {
        options = options || {};

        // limit
        options.rows = options.rows || options.limit || 10;

        // starting row offset
        options.start = options.start || 0;

        // now
        options.until = options.until || new Date();
        if (_typeof(options.until) !== 'object') {
          options.until = new Date(options.until);
        }

        // now - 24
        options.from = options.from || options.until - 24 * 60 * 60 * 1000;
        if (_typeof(options.from) !== 'object') {
          options.from = new Date(options.from);
        }

        // 'asc' or 'desc'
        options.order = options.order || 'desc';
        return options;
      }
    }

    /**
     * Returns a log stream for this transport. Options object is optional.
     * @param {Object} options - Stream options for this instance.
     * @returns {Stream} - TODO: add return description.
     * TODO: Refactor me.
     */
  }, {
    key: "stream",
    value: function stream() {
      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      var file = path.join(this.dirname, this.filename);
      var stream = new Stream();
      var tail = {
        file: file,
        start: options.start
      };
      stream.destroy = tailFile(tail, function (err, line) {
        if (err) {
          return stream.emit('error', err);
        }
        try {
          stream.emit('data', line);
          line = JSON.parse(line);
          stream.emit('log', line);
        } catch (e) {
          stream.emit('error', e);
        }
      });
      return stream;
    }

    /**
     * Checks to see the filesize of.
     * @returns {undefined}
     */
  }, {
    key: "open",
    value: function open() {
      var _this5 = this;
      // If we do not have a filename then we were passed a stream and
      // don't need to keep track of size.
      if (!this.filename) return;
      if (this._opening) return;
      this._opening = true;

      // Stat the target file to get the size and create the stream.
      this.stat(function (err, size) {
        if (err) {
          return _this5.emit('error', err);
        }
        debug('stat done: %s { size: %s }', _this5.filename, size);
        _this5._size = size;
        _this5._dest = _this5._createStream(_this5._stream);
        _this5._opening = false;
        _this5.once('open', function () {
          if (!_this5._stream.emit('rotate')) {
            _this5._rotate = false;
          }
        });
      });
    }

    /**
     * Stat the file and assess information in order to create the proper stream.
     * @param {function} callback - TODO: add param description.
     * @returns {undefined}
     */
  }, {
    key: "stat",
    value: function stat(callback) {
      var _this6 = this;
      var target = this._getFile();
      var fullpath = path.join(this.dirname, target);
      fs.stat(fullpath, function (err, stat) {
        if (err && err.code === 'ENOENT') {
          debug('ENOENT ok', fullpath);
          // Update internally tracked filename with the new target name.
          _this6.filename = target;
          return callback(null, 0);
        }
        if (err) {
          debug("err ".concat(err.code, " ").concat(fullpath));
          return callback(err);
        }
        if (!stat || _this6._needsNewFile(stat.size)) {
          // If `stats.size` is greater than the `maxsize` for this
          // instance then try again.
          return _this6._incFile(function () {
            return _this6.stat(callback);
          });
        }

        // Once we have figured out what the filename is, set it
        // and return the size.
        _this6.filename = target;
        callback(null, stat.size);
      });
    }

    /**
     * Closes the stream associated with this instance.
     * @param {function} cb - TODO: add param description.
     * @returns {undefined}
     */
  }, {
    key: "close",
    value: function close(cb) {
      var _this7 = this;
      if (!this._stream) {
        return;
      }
      this._stream.end(function () {
        if (cb) {
          cb(); // eslint-disable-line callback-return
        }
        _this7.emit('flush');
        _this7.emit('closed');
      });
    }

    /**
     * TODO: add method description.
     * @param {number} size - TODO: add param description.
     * @returns {undefined}
     */
  }, {
    key: "_needsNewFile",
    value: function _needsNewFile(size) {
      size = size || this._size;
      return this.maxsize && size >= this.maxsize;
    }

    /**
     * TODO: add method description.
     * @param {Error} err - TODO: add param description.
     * @returns {undefined}
     */
  }, {
    key: "_onError",
    value: function _onError(err) {
      this.emit('error', err);
    }

    /**
     * TODO: add method description.
     * @param {Stream} stream - TODO: add param description.
     * @returns {mixed} - TODO: add return description.
     */
  }, {
    key: "_setupStream",
    value: function _setupStream(stream) {
      stream.on('error', this._onError);
      return stream;
    }

    /**
     * TODO: add method description.
     * @param {Stream} stream - TODO: add param description.
     * @returns {mixed} - TODO: add return description.
     */
  }, {
    key: "_cleanupStream",
    value: function _cleanupStream(stream) {
      stream.removeListener('error', this._onError);
      stream.destroy();
      return stream;
    }

    /**
     * TODO: add method description.
     */
  }, {
    key: "_rotateFile",
    value: function _rotateFile() {
      var _this8 = this;
      this._incFile(function () {
        return _this8.open();
      });
    }

    /**
     * Unpipe from the stream that has been marked as full and end it so it
     * flushes to disk.
     *
     * @param {function} callback - Callback for when the current file has closed.
     * @private
     */
  }, {
    key: "_endStream",
    value: function _endStream() {
      var _this9 = this;
      var callback = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : function () {};
      if (this._dest) {
        this._stream.unpipe(this._dest);
        this._dest.end(function () {
          _this9._cleanupStream(_this9._dest);
          callback();
        });
      } else {
        callback(); // eslint-disable-line callback-return
      }
    }

    /**
     * Returns the WritableStream for the active file on this instance. If we
     * should gzip the file then a zlib stream is returned.
     *
     * @param {ReadableStream} source –PassThrough to pipe to the file when open.
     * @returns {WritableStream} Stream that writes to disk for the active file.
     */
  }, {
    key: "_createStream",
    value: function _createStream(source) {
      var _this10 = this;
      var fullpath = path.join(this.dirname, this.filename);
      debug('create stream start', fullpath, this.options);
      var dest = fs.createWriteStream(fullpath, this.options)
      // TODO: What should we do with errors here?
      .on('error', function (err) {
        return debug(err);
      }).on('close', function () {
        return debug('close', dest.path, dest.bytesWritten);
      }).on('open', function () {
        debug('file open ok', fullpath);
        _this10.emit('open', fullpath);
        source.pipe(dest);

        // If rotation occured during the open operation then we immediately
        // start writing to a new PassThrough, begin opening the next file
        // and cleanup the previous source and dest once the source has drained.
        if (_this10.rotatedWhileOpening) {
          _this10._stream = new PassThrough();
          _this10._stream.setMaxListeners(30);
          _this10._rotateFile();
          _this10.rotatedWhileOpening = false;
          _this10._cleanupStream(dest);
          source.end();
        }
      });
      debug('create stream ok', fullpath);
      return dest;
    }

    /**
     * TODO: add method description.
     * @param {function} callback - TODO: add param description.
     * @returns {undefined}
     */
  }, {
    key: "_incFile",
    value: function _incFile(callback) {
      debug('_incFile', this.filename);
      var ext = path.extname(this._basename);
      var basename = path.basename(this._basename, ext);
      var tasks = [];
      if (this.zippedArchive) {
        tasks.push(function (cb) {
          var num = this._created > 0 && !this.tailable ? this._created : '';
          this._compressFile(path.join(this.dirname, "".concat(basename).concat(num).concat(ext)), path.join(this.dirname, "".concat(basename).concat(num).concat(ext, ".gz")), cb);
        }.bind(this));
      }
      tasks.push(function (cb) {
        if (!this.tailable) {
          this._created += 1;
          this._checkMaxFilesIncrementing(ext, basename, cb);
        } else {
          this._checkMaxFilesTailable(ext, basename, cb);
        }
      }.bind(this));
      asyncSeries(tasks, callback);
    }

    /**
     * Gets the next filename to use for this instance in the case that log
     * filesizes are being capped.
     * @returns {string} - TODO: add return description.
     * @private
     */
  }, {
    key: "_getFile",
    value: function _getFile() {
      var ext = path.extname(this._basename);
      var basename = path.basename(this._basename, ext);
      var isRotation = this.rotationFormat ? this.rotationFormat() : this._created;

      // Caveat emptor (indexzero): rotationFormat() was broken by design When
      // combined with max files because the set of files to unlink is never
      // stored.
      return !this.tailable && this._created ? "".concat(basename).concat(isRotation).concat(ext) : "".concat(basename).concat(ext);
    }

    /**
     * Increment the number of files created or checked by this instance.
     * @param {mixed} ext - TODO: add param description.
     * @param {mixed} basename - TODO: add param description.
     * @param {mixed} callback - TODO: add param description.
     * @returns {undefined}
     * @private
     */
  }, {
    key: "_checkMaxFilesIncrementing",
    value: function _checkMaxFilesIncrementing(ext, basename, callback) {
      // Check for maxFiles option and delete file.
      if (!this.maxFiles || this._created < this.maxFiles) {
        return setImmediate(callback);
      }
      var oldest = this._created - this.maxFiles;
      var isOldest = oldest !== 0 ? oldest : '';
      var isZipped = this.zippedArchive ? '.gz' : '';
      var filePath = "".concat(basename).concat(isOldest).concat(ext).concat(isZipped);
      var target = path.join(this.dirname, filePath);
      fs.unlink(target, callback);
    }

    /**
     * Roll files forward based on integer, up to maxFiles. e.g. if base if
     * file.log and it becomes oversized, roll to file1.log, and allow file.log
     * to be re-used. If file is oversized again, roll file1.log to file2.log,
     * roll file.log to file1.log, and so on.
     * @param {mixed} ext - TODO: add param description.
     * @param {mixed} basename - TODO: add param description.
     * @param {mixed} callback - TODO: add param description.
     * @returns {undefined}
     * @private
     */
  }, {
    key: "_checkMaxFilesTailable",
    value: function _checkMaxFilesTailable(ext, basename, callback) {
      var _this12 = this;
      var tasks = [];
      if (!this.maxFiles) {
        return;
      }

      // const isZipped = this.zippedArchive ? '.gz' : '';
      var isZipped = this.zippedArchive ? '.gz' : '';
      for (var x = this.maxFiles - 1; x > 1; x--) {
        tasks.push(function (i, cb) {
          var _this11 = this;
          var fileName = "".concat(basename).concat(i - 1).concat(ext).concat(isZipped);
          var tmppath = path.join(this.dirname, fileName);
          fs.exists(tmppath, function (exists) {
            if (!exists) {
              return cb(null);
            }
            fileName = "".concat(basename).concat(i).concat(ext).concat(isZipped);
            fs.rename(tmppath, path.join(_this11.dirname, fileName), cb);
          });
        }.bind(this, x));
      }
      asyncSeries(tasks, function () {
        fs.rename(path.join(_this12.dirname, "".concat(basename).concat(ext).concat(isZipped)), path.join(_this12.dirname, "".concat(basename, "1").concat(ext).concat(isZipped)), callback);
      });
    }

    /**
     * Compresses src to dest with gzip and unlinks src
     * @param {string} src - path to source file.
     * @param {string} dest - path to zipped destination file.
     * @param {Function} callback - callback called after file has been compressed.
     * @returns {undefined}
     * @private
     */
  }, {
    key: "_compressFile",
    value: function _compressFile(src, dest, callback) {
      fs.access(src, fs.F_OK, function (err) {
        if (err) {
          return callback();
        }
        var gzip = zlib.createGzip();
        var inp = fs.createReadStream(src);
        var out = fs.createWriteStream(dest);
        out.on('finish', function () {
          fs.unlink(src, callback);
        });
        inp.pipe(gzip).pipe(out);
      });
    }
  }, {
    key: "_createLogDirIfNotExist",
    value: function _createLogDirIfNotExist(dirPath) {
      /* eslint-disable no-sync */
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, {
          recursive: true
        });
      }
      /* eslint-enable no-sync */
    }
  }]);
}(TransportStream);