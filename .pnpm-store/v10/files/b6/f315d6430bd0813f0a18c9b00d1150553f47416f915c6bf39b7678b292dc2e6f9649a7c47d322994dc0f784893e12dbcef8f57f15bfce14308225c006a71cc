/**
 * logger.js: TODO: add file header description.
 *
 * (C) 2010 Charlie Robbins
 * MIT LICENCE
 */

'use strict';

function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
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
var _require = require('readable-stream'),
  Stream = _require.Stream,
  Transform = _require.Transform;
var asyncForEach = require('async/forEach');
var _require2 = require('triple-beam'),
  LEVEL = _require2.LEVEL,
  SPLAT = _require2.SPLAT;
var isStream = require('is-stream');
var ExceptionHandler = require('./exception-handler');
var RejectionHandler = require('./rejection-handler');
var LegacyTransportStream = require('winston-transport/legacy');
var Profiler = require('./profiler');
var _require3 = require('./common'),
  warn = _require3.warn;
var config = require('./config');

/**
 * Captures the number of format (i.e. %s strings) in a given string.
 * Based on `util.format`, see Node.js source:
 * https://github.com/nodejs/node/blob/b1c8f15c5f169e021f7c46eb7b219de95fe97603/lib/util.js#L201-L230
 * @type {RegExp}
 */
var formatRegExp = /%[scdjifoO%]/g;

/**
 * TODO: add class description.
 * @type {Logger}
 * @extends {Transform}
 */
var Logger = /*#__PURE__*/function (_Transform) {
  /**
   * Constructor function for the Logger object responsible for persisting log
   * messages and metadata to one or more transports.
   * @param {!Object} options - foo
   */
  function Logger(options) {
    var _this;
    _classCallCheck(this, Logger);
    _this = _callSuper(this, Logger, [{
      objectMode: true
    }]);
    _this.configure(options);
    return _this;
  }
  _inherits(Logger, _Transform);
  return _createClass(Logger, [{
    key: "child",
    value: function child(defaultRequestMetadata) {
      var logger = this;
      return Object.create(logger, {
        write: {
          value: function value(info) {
            var infoClone = Object.assign({}, defaultRequestMetadata, info);

            // Object.assign doesn't copy inherited Error
            // properties so we have to do that explicitly
            //
            // Remark (indexzero): we should remove this
            // since the errors format will handle this case.
            //
            if (info instanceof Error) {
              infoClone.stack = info.stack;
              infoClone.message = info.message;
            }
            logger.write(infoClone);
          }
        }
      });
    }

    /**
     * This will wholesale reconfigure this instance by:
     * 1. Resetting all transports. Older transports will be removed implicitly.
     * 2. Set all other options including levels, colors, rewriters, filters,
     *    exceptionHandlers, etc.
     * @param {!Object} options - TODO: add param description.
     * @returns {undefined}
     */
  }, {
    key: "configure",
    value: function configure() {
      var _this2 = this;
      var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
        silent = _ref.silent,
        format = _ref.format,
        defaultMeta = _ref.defaultMeta,
        levels = _ref.levels,
        _ref$level = _ref.level,
        level = _ref$level === void 0 ? 'info' : _ref$level,
        _ref$exitOnError = _ref.exitOnError,
        exitOnError = _ref$exitOnError === void 0 ? true : _ref$exitOnError,
        transports = _ref.transports,
        colors = _ref.colors,
        emitErrs = _ref.emitErrs,
        formatters = _ref.formatters,
        padLevels = _ref.padLevels,
        rewriters = _ref.rewriters,
        stripColors = _ref.stripColors,
        exceptionHandlers = _ref.exceptionHandlers,
        rejectionHandlers = _ref.rejectionHandlers;
      // Reset transports if we already have them
      if (this.transports.length) {
        this.clear();
      }
      this.silent = silent;
      this.format = format || this.format || require('logform/json')();
      this.defaultMeta = defaultMeta || null;
      // Hoist other options onto this instance.
      this.levels = levels || this.levels || config.npm.levels;
      this.level = level;
      if (this.exceptions) {
        this.exceptions.unhandle();
      }
      if (this.rejections) {
        this.rejections.unhandle();
      }
      this.exceptions = new ExceptionHandler(this);
      this.rejections = new RejectionHandler(this);
      this.profilers = {};
      this.exitOnError = exitOnError;

      // Add all transports we have been provided.
      if (transports) {
        transports = Array.isArray(transports) ? transports : [transports];
        transports.forEach(function (transport) {
          return _this2.add(transport);
        });
      }
      if (colors || emitErrs || formatters || padLevels || rewriters || stripColors) {
        throw new Error(['{ colors, emitErrs, formatters, padLevels, rewriters, stripColors } were removed in winston@3.0.0.', 'Use a custom winston.format(function) instead.', 'See: https://github.com/winstonjs/winston/tree/master/UPGRADE-3.0.md'].join('\n'));
      }
      if (exceptionHandlers) {
        this.exceptions.handle(exceptionHandlers);
      }
      if (rejectionHandlers) {
        this.rejections.handle(rejectionHandlers);
      }
    }
  }, {
    key: "isLevelEnabled",
    value: function isLevelEnabled(level) {
      var _this3 = this;
      var givenLevelValue = getLevelValue(this.levels, level);
      if (givenLevelValue === null) {
        return false;
      }
      var configuredLevelValue = getLevelValue(this.levels, this.level);
      if (configuredLevelValue === null) {
        return false;
      }
      if (!this.transports || this.transports.length === 0) {
        return configuredLevelValue >= givenLevelValue;
      }
      var index = this.transports.findIndex(function (transport) {
        var transportLevelValue = getLevelValue(_this3.levels, transport.level);
        if (transportLevelValue === null) {
          transportLevelValue = configuredLevelValue;
        }
        return transportLevelValue >= givenLevelValue;
      });
      return index !== -1;
    }

    /* eslint-disable valid-jsdoc */
    /**
     * Ensure backwards compatibility with a `log` method
     * @param {mixed} level - Level the log message is written at.
     * @param {mixed} msg - TODO: add param description.
     * @param {mixed} meta - TODO: add param description.
     * @returns {Logger} - TODO: add return description.
     *
     * @example
     *    // Supports the existing API:
     *    logger.log('info', 'Hello world', { custom: true });
     *    logger.log('info', new Error('Yo, it\'s on fire'));
     *
     *    // Requires winston.format.splat()
     *    logger.log('info', '%s %d%%', 'A string', 50, { thisIsMeta: true });
     *
     *    // And the new API with a single JSON literal:
     *    logger.log({ level: 'info', message: 'Hello world', custom: true });
     *    logger.log({ level: 'info', message: new Error('Yo, it\'s on fire') });
     *
     *    // Also requires winston.format.splat()
     *    logger.log({
     *      level: 'info',
     *      message: '%s %d%%',
     *      [SPLAT]: ['A string', 50],
     *      meta: { thisIsMeta: true }
     *    });
     *
     */
    /* eslint-enable valid-jsdoc */
  }, {
    key: "log",
    value: function log(level, msg) {
      for (var _len = arguments.length, splat = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
        splat[_key - 2] = arguments[_key];
      }
      // eslint-disable-line max-params
      // Optimize for the hotpath of logging JSON literals
      if (arguments.length === 1) {
        // Yo dawg, I heard you like levels ... seriously ...
        // In this context the LHS `level` here is actually the `info` so read
        // this as: info[LEVEL] = info.level;
        level[LEVEL] = level.level;
        this._addDefaultMeta(level);
        this.write(level);
        return this;
      }

      // Slightly less hotpath, but worth optimizing for.
      if (arguments.length === 2) {
        if (msg && _typeof(msg) === 'object') {
          msg[LEVEL] = msg.level = level;
          this._addDefaultMeta(msg);
          this.write(msg);
          return this;
        }
        msg = _defineProperty(_defineProperty(_defineProperty({}, LEVEL, level), "level", level), "message", msg);
        this._addDefaultMeta(msg);
        this.write(msg);
        return this;
      }
      var meta = splat[0];
      if (_typeof(meta) === 'object' && meta !== null) {
        // Extract tokens, if none available default to empty array to
        // ensure consistancy in expected results
        var tokens = msg && msg.match && msg.match(formatRegExp);
        if (!tokens) {
          var info = Object.assign({}, this.defaultMeta, meta, _defineProperty(_defineProperty(_defineProperty(_defineProperty({}, LEVEL, level), SPLAT, splat), "level", level), "message", msg));
          if (meta.message) info.message = "".concat(info.message, " ").concat(meta.message);
          if (meta.stack) info.stack = meta.stack;
          this.write(info);
          return this;
        }
      }
      this.write(Object.assign({}, this.defaultMeta, _defineProperty(_defineProperty(_defineProperty(_defineProperty({}, LEVEL, level), SPLAT, splat), "level", level), "message", msg)));
      return this;
    }

    /**
     * Pushes data so that it can be picked up by all of our pipe targets.
     * @param {mixed} info - TODO: add param description.
     * @param {mixed} enc - TODO: add param description.
     * @param {mixed} callback - Continues stream processing.
     * @returns {undefined}
     * @private
     */
  }, {
    key: "_transform",
    value: function _transform(info, enc, callback) {
      if (this.silent) {
        return callback();
      }

      // [LEVEL] is only soft guaranteed to be set here since we are a proper
      // stream. It is likely that `info` came in through `.log(info)` or
      // `.info(info)`. If it is not defined, however, define it.
      // This LEVEL symbol is provided by `triple-beam` and also used in:
      // - logform
      // - winston-transport
      // - abstract-winston-transport
      if (!info[LEVEL]) {
        info[LEVEL] = info.level;
      }

      // Remark: really not sure what to do here, but this has been reported as
      // very confusing by pre winston@2.0.0 users as quite confusing when using
      // custom levels.
      if (!this.levels[info[LEVEL]] && this.levels[info[LEVEL]] !== 0) {
        // eslint-disable-next-line no-console
        console.error('[winston] Unknown logger level: %s', info[LEVEL]);
      }

      // Remark: not sure if we should simply error here.
      if (!this._readableState.pipes) {
        // eslint-disable-next-line no-console
        console.error('[winston] Attempt to write logs with no transports, which can increase memory usage: %j', info);
      }

      // Here we write to the `format` pipe-chain, which on `readable` above will
      // push the formatted `info` Object onto the buffer for this instance. We trap
      // (and re-throw) any errors generated by the user-provided format, but also
      // guarantee that the streams callback is invoked so that we can continue flowing.
      try {
        this.push(this.format.transform(info, this.format.options));
      } finally {
        this._writableState.sync = false;
        // eslint-disable-next-line callback-return
        callback();
      }
    }

    /**
     * Delays the 'finish' event until all transport pipe targets have
     * also emitted 'finish' or are already finished.
     * @param {mixed} callback - Continues stream processing.
     */
  }, {
    key: "_final",
    value: function _final(callback) {
      var transports = this.transports.slice();
      asyncForEach(transports, function (transport, next) {
        if (!transport || transport.finished) return setImmediate(next);
        transport.once('finish', next);
        transport.end();
      }, callback);
    }

    /**
     * Adds the transport to this logger instance by piping to it.
     * @param {mixed} transport - TODO: add param description.
     * @returns {Logger} - TODO: add return description.
     */
  }, {
    key: "add",
    value: function add(transport) {
      // Support backwards compatibility with all existing `winston < 3.x.x`
      // transports which meet one of two criteria:
      // 1. They inherit from winston.Transport in  < 3.x.x which is NOT a stream.
      // 2. They expose a log method which has a length greater than 2 (i.e. more then
      //    just `log(info, callback)`.
      var target = !isStream(transport) || transport.log.length > 2 ? new LegacyTransportStream({
        transport: transport
      }) : transport;
      if (!target._writableState || !target._writableState.objectMode) {
        throw new Error('Transports must WritableStreams in objectMode. Set { objectMode: true }.');
      }

      // Listen for the `error` event and the `warn` event on the new Transport.
      this._onEvent('error', target);
      this._onEvent('warn', target);
      this.pipe(target);
      if (transport.handleExceptions) {
        this.exceptions.handle();
      }
      if (transport.handleRejections) {
        this.rejections.handle();
      }
      return this;
    }

    /**
     * Removes the transport from this logger instance by unpiping from it.
     * @param {mixed} transport - TODO: add param description.
     * @returns {Logger} - TODO: add return description.
     */
  }, {
    key: "remove",
    value: function remove(transport) {
      if (!transport) return this;
      var target = transport;
      if (!isStream(transport) || transport.log.length > 2) {
        target = this.transports.filter(function (match) {
          return match.transport === transport;
        })[0];
      }
      if (target) {
        this.unpipe(target);
      }
      return this;
    }

    /**
     * Removes all transports from this logger instance.
     * @returns {Logger} - TODO: add return description.
     */
  }, {
    key: "clear",
    value: function clear() {
      this.unpipe();
      return this;
    }

    /**
     * Cleans up resources (streams, event listeners) for all transports
     * associated with this instance (if necessary).
     * @returns {Logger} - TODO: add return description.
     */
  }, {
    key: "close",
    value: function close() {
      this.exceptions.unhandle();
      this.rejections.unhandle();
      this.clear();
      this.emit('close');
      return this;
    }

    /**
     * Sets the `target` levels specified on this instance.
     * @param {Object} Target levels to use on this instance.
     */
  }, {
    key: "setLevels",
    value: function setLevels() {
      warn.deprecated('setLevels');
    }

    /**
     * Queries the all transports for this instance with the specified `options`.
     * This will aggregate each transport's results into one object containing
     * a property per transport.
     * @param {Object} options - Query options for this instance.
     * @param {function} callback - Continuation to respond to when complete.
     */
  }, {
    key: "query",
    value: function query(options, callback) {
      if (typeof options === 'function') {
        callback = options;
        options = {};
      }
      options = options || {};
      var results = {};
      var queryObject = Object.assign({}, options.query || {});

      // Helper function to query a single transport
      function queryTransport(transport, next) {
        if (options.query && typeof transport.formatQuery === 'function') {
          options.query = transport.formatQuery(queryObject);
        }
        transport.query(options, function (err, res) {
          if (err) {
            return next(err);
          }
          if (typeof transport.formatResults === 'function') {
            res = transport.formatResults(res, options.format);
          }
          next(null, res);
        });
      }

      // Helper function to accumulate the results from `queryTransport` into
      // the `results`.
      function addResults(transport, next) {
        queryTransport(transport, function (err, result) {
          // queryTransport could potentially invoke the callback multiple times
          // since Transport code can be unpredictable.
          if (next) {
            result = err || result;
            if (result) {
              results[transport.name] = result;
            }

            // eslint-disable-next-line callback-return
            next();
          }
          next = null;
        });
      }

      // Iterate over the transports in parallel setting the appropriate key in
      // the `results`.
      asyncForEach(this.transports.filter(function (transport) {
        return !!transport.query;
      }), addResults, function () {
        return callback(null, results);
      });
    }

    /**
     * Returns a log stream for all transports. Options object is optional.
     * @param{Object} options={} - Stream options for this instance.
     * @returns {Stream} - TODO: add return description.
     */
  }, {
    key: "stream",
    value: function stream() {
      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      var out = new Stream();
      var streams = [];
      out._streams = streams;
      out.destroy = function () {
        var i = streams.length;
        while (i--) {
          streams[i].destroy();
        }
      };

      // Create a list of all transports for this instance.
      this.transports.filter(function (transport) {
        return !!transport.stream;
      }).forEach(function (transport) {
        var str = transport.stream(options);
        if (!str) {
          return;
        }
        streams.push(str);
        str.on('log', function (log) {
          log.transport = log.transport || [];
          log.transport.push(transport.name);
          out.emit('log', log);
        });
        str.on('error', function (err) {
          err.transport = err.transport || [];
          err.transport.push(transport.name);
          out.emit('error', err);
        });
      });
      return out;
    }

    /**
     * Returns an object corresponding to a specific timing. When done is called
     * the timer will finish and log the duration. e.g.:
     * @returns {Profile} - TODO: add return description.
     * @example
     *    const timer = winston.startTimer()
     *    setTimeout(() => {
     *      timer.done({
     *        message: 'Logging message'
     *      });
     *    }, 1000);
     */
  }, {
    key: "startTimer",
    value: function startTimer() {
      return new Profiler(this);
    }

    /**
     * Tracks the time inbetween subsequent calls to this method with the same
     * `id` parameter. The second call to this method will log the difference in
     * milliseconds along with the message.
     * @param {string} id Unique id of the profiler
     * @returns {Logger} - TODO: add return description.
     */
  }, {
    key: "profile",
    value: function profile(id) {
      var time = Date.now();
      if (this.profilers[id]) {
        var timeEnd = this.profilers[id];
        delete this.profilers[id];

        // Attempt to be kind to users if they are still using older APIs.
        for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
          args[_key2 - 1] = arguments[_key2];
        }
        if (typeof args[args.length - 2] === 'function') {
          // eslint-disable-next-line no-console
          console.warn('Callback function no longer supported as of winston@3.0.0');
          args.pop();
        }

        // Set the duration property of the metadata
        var info = _typeof(args[args.length - 1]) === 'object' ? args.pop() : {};
        info.level = info.level || 'info';
        info.durationMs = time - timeEnd;
        info.message = info.message || id;
        return this.write(info);
      }
      this.profilers[id] = time;
      return this;
    }

    /**
     * Backwards compatibility to `exceptions.handle` in winston < 3.0.0.
     * @returns {undefined}
     * @deprecated
     */
  }, {
    key: "handleExceptions",
    value: function handleExceptions() {
      var _this$exceptions;
      // eslint-disable-next-line no-console
      console.warn('Deprecated: .handleExceptions() will be removed in winston@4. Use .exceptions.handle()');
      (_this$exceptions = this.exceptions).handle.apply(_this$exceptions, arguments);
    }

    /**
     * Backwards compatibility to `exceptions.handle` in winston < 3.0.0.
     * @returns {undefined}
     * @deprecated
     */
  }, {
    key: "unhandleExceptions",
    value: function unhandleExceptions() {
      var _this$exceptions2;
      // eslint-disable-next-line no-console
      console.warn('Deprecated: .unhandleExceptions() will be removed in winston@4. Use .exceptions.unhandle()');
      (_this$exceptions2 = this.exceptions).unhandle.apply(_this$exceptions2, arguments);
    }

    /**
     * Throw a more meaningful deprecation notice
     * @throws {Error} - TODO: add throws description.
     */
  }, {
    key: "cli",
    value: function cli() {
      throw new Error(['Logger.cli() was removed in winston@3.0.0', 'Use a custom winston.formats.cli() instead.', 'See: https://github.com/winstonjs/winston/tree/master/UPGRADE-3.0.md'].join('\n'));
    }

    /**
     * Bubbles the `event` that occured on the specified `transport` up
     * from this instance.
     * @param {string} event - The event that occured
     * @param {Object} transport - Transport on which the event occured
     * @private
     */
  }, {
    key: "_onEvent",
    value: function _onEvent(event, transport) {
      function transportEvent(err) {
        // https://github.com/winstonjs/winston/issues/1364
        if (event === 'error' && !this.transports.includes(transport)) {
          this.add(transport);
        }
        this.emit(event, err, transport);
      }
      if (!transport['__winston' + event]) {
        transport['__winston' + event] = transportEvent.bind(this);
        transport.on(event, transport['__winston' + event]);
      }
    }
  }, {
    key: "_addDefaultMeta",
    value: function _addDefaultMeta(msg) {
      if (this.defaultMeta) {
        Object.assign(msg, this.defaultMeta);
      }
    }
  }]);
}(Transform);
function getLevelValue(levels, level) {
  var value = levels[level];
  if (!value && value !== 0) {
    return null;
  }
  return value;
}

/**
 * Represents the current readableState pipe targets for this Logger instance.
 * @type {Array|Object}
 */
Object.defineProperty(Logger.prototype, 'transports', {
  configurable: false,
  enumerable: true,
  get: function get() {
    var pipes = this._readableState.pipes;
    return !Array.isArray(pipes) ? [pipes].filter(Boolean) : pipes;
  }
});
module.exports = Logger;