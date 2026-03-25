/**
 * create-logger.js: Logger factory for winston logger instances.
 *
 * (C) 2010 Charlie Robbins
 * MIT LICENCE
 */

'use strict';

function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _callSuper(t, o, e) { return o = _getPrototypeOf(o), _possibleConstructorReturn(t, _isNativeReflectConstruct() ? Reflect.construct(o, e || [], _getPrototypeOf(t).constructor) : o.apply(t, e)); }
function _possibleConstructorReturn(t, e) { if (e && ("object" == _typeof(e) || "function" == typeof e)) return e; if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined"); return _assertThisInitialized(t); }
function _assertThisInitialized(e) { if (void 0 === e) throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); return e; }
function _isNativeReflectConstruct() { try { var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); } catch (t) {} return (_isNativeReflectConstruct = function _isNativeReflectConstruct() { return !!t; })(); }
function _getPrototypeOf(t) { return _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function (t) { return t.__proto__ || Object.getPrototypeOf(t); }, _getPrototypeOf(t); }
function _inherits(t, e) { if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function"); t.prototype = Object.create(e && e.prototype, { constructor: { value: t, writable: !0, configurable: !0 } }), Object.defineProperty(t, "prototype", { writable: !1 }), e && _setPrototypeOf(t, e); }
function _setPrototypeOf(t, e) { return _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function (t, e) { return t.__proto__ = e, t; }, _setPrototypeOf(t, e); }
var _require = require('triple-beam'),
  LEVEL = _require.LEVEL;
var config = require('./config');
var Logger = require('./logger');
var debug = require('@dabh/diagnostics')('winston:create-logger');
function isLevelEnabledFunctionName(level) {
  return 'is' + level.charAt(0).toUpperCase() + level.slice(1) + 'Enabled';
}

/**
 * Create a new instance of a winston Logger. Creates a new
 * prototype for each instance.
 * @param {!Object} opts - Options for the created logger.
 * @returns {Logger} - A newly created logger instance.
 */
module.exports = function () {
  var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  //
  // Default levels: npm
  //
  opts.levels = opts.levels || config.npm.levels;

  /**
   * DerivedLogger to attach the logs level methods.
   * @type {DerivedLogger}
   * @extends {Logger}
   */
  var DerivedLogger = /*#__PURE__*/function (_Logger) {
    /**
     * Create a new class derived logger for which the levels can be attached to
     * the prototype of. This is a V8 optimization that is well know to increase
     * performance of prototype functions.
     * @param {!Object} options - Options for the created logger.
     */
    function DerivedLogger(options) {
      _classCallCheck(this, DerivedLogger);
      return _callSuper(this, DerivedLogger, [options]);
    }
    _inherits(DerivedLogger, _Logger);
    return _createClass(DerivedLogger);
  }(Logger);
  var logger = new DerivedLogger(opts);

  //
  // Create the log level methods for the derived logger.
  //
  Object.keys(opts.levels).forEach(function (level) {
    debug('Define prototype method for "%s"', level);
    if (level === 'log') {
      // eslint-disable-next-line no-console
      console.warn('Level "log" not defined: conflicts with the method "log". Use a different level name.');
      return;
    }

    //
    // Define prototype methods for each log level e.g.:
    // logger.log('info', msg) implies these methods are defined:
    // - logger.info(msg)
    // - logger.isInfoEnabled()
    //
    // Remark: to support logger.child this **MUST** be a function
    // so it'll always be called on the instance instead of a fixed
    // place in the prototype chain.
    //
    DerivedLogger.prototype[level] = function () {
      // Prefer any instance scope, but default to "root" logger
      var self = this || logger;

      // Optimize the hot-path which is the single object.
      for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }
      if (args.length === 1) {
        var msg = args[0];
        var info = msg && msg.message && msg || {
          message: msg
        };
        info.level = info[LEVEL] = level;
        self._addDefaultMeta(info);
        self.write(info);
        return this || logger;
      }

      // When provided nothing assume the empty string
      if (args.length === 0) {
        self.log(level, '');
        return self;
      }

      // Otherwise build argument list which could potentially conform to
      // either:
      // . v3 API: log(obj)
      // 2. v1/v2 API: log(level, msg, ... [string interpolate], [{metadata}], [callback])
      return self.log.apply(self, [level].concat(args));
    };
    DerivedLogger.prototype[isLevelEnabledFunctionName(level)] = function () {
      return (this || logger).isLevelEnabled(level);
    };
  });
  return logger;
};