/* eslint-disable no-console */
/*
 * console.js: Transport for outputting to the console.
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
var os = require('os');
var _require = require('triple-beam'),
  LEVEL = _require.LEVEL,
  MESSAGE = _require.MESSAGE;
var TransportStream = require('winston-transport');

/**
 * Transport for outputting to the console.
 * @type {Console}
 * @extends {TransportStream}
 */
module.exports = /*#__PURE__*/function (_TransportStream) {
  /**
   * Constructor function for the Console transport object responsible for
   * persisting log messages and metadata to a terminal or TTY.
   * @param {!Object} [options={}] - Options for this instance.
   */
  function Console() {
    var _this;
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    _classCallCheck(this, Console);
    _this = _callSuper(this, Console, [options]);

    // Expose the name of this Transport on the prototype
    _this.name = options.name || 'console';
    _this.stderrLevels = _this._stringArrayToSet(options.stderrLevels);
    _this.consoleWarnLevels = _this._stringArrayToSet(options.consoleWarnLevels);
    _this.eol = typeof options.eol === 'string' ? options.eol : os.EOL;
    _this.forceConsole = options.forceConsole || false;

    // Keep a reference to the log, warn, and error console methods
    // in case they get redirected to this transport after the logger is
    // instantiated. This prevents a circular reference issue.
    _this._consoleLog = console.log.bind(console);
    _this._consoleWarn = console.warn.bind(console);
    _this._consoleError = console.error.bind(console);
    _this.setMaxListeners(30);
    return _this;
  }

  /**
   * Core logging method exposed to Winston.
   * @param {Object} info - TODO: add param description.
   * @param {Function} callback - TODO: add param description.
   * @returns {undefined}
   */
  _inherits(Console, _TransportStream);
  return _createClass(Console, [{
    key: "log",
    value: function log(info, callback) {
      var _this2 = this;
      setImmediate(function () {
        return _this2.emit('logged', info);
      });

      // Remark: what if there is no raw...?
      if (this.stderrLevels[info[LEVEL]]) {
        if (console._stderr && !this.forceConsole) {
          // Node.js maps `process.stderr` to `console._stderr`.
          console._stderr.write("".concat(info[MESSAGE]).concat(this.eol));
        } else {
          // console.error adds a newline
          this._consoleError(info[MESSAGE]);
        }
        if (callback) {
          callback(); // eslint-disable-line callback-return
        }
        return;
      } else if (this.consoleWarnLevels[info[LEVEL]]) {
        if (console._stderr && !this.forceConsole) {
          // Node.js maps `process.stderr` to `console._stderr`.
          // in Node.js console.warn is an alias for console.error
          console._stderr.write("".concat(info[MESSAGE]).concat(this.eol));
        } else {
          // console.warn adds a newline
          this._consoleWarn(info[MESSAGE]);
        }
        if (callback) {
          callback(); // eslint-disable-line callback-return
        }
        return;
      }
      if (console._stdout && !this.forceConsole) {
        // Node.js maps `process.stdout` to `console._stdout`.
        console._stdout.write("".concat(info[MESSAGE]).concat(this.eol));
      } else {
        // console.log adds a newline.
        this._consoleLog(info[MESSAGE]);
      }
      if (callback) {
        callback(); // eslint-disable-line callback-return
      }
    }

    /**
     * Returns a Set-like object with strArray's elements as keys (each with the
     * value true).
     * @param {Array} strArray - Array of Set-elements as strings.
     * @param {?string} [errMsg] - Custom error message thrown on invalid input.
     * @returns {Object} - TODO: add return description.
     * @private
     */
  }, {
    key: "_stringArrayToSet",
    value: function _stringArrayToSet(strArray, errMsg) {
      if (!strArray) return {};
      errMsg = errMsg || 'Cannot make set from type other than Array of string elements';
      if (!Array.isArray(strArray)) {
        throw new Error(errMsg);
      }
      return strArray.reduce(function (set, el) {
        if (typeof el !== 'string') {
          throw new Error(errMsg);
        }
        set[el] = true;
        return set;
      }, {});
    }
  }]);
}(TransportStream);