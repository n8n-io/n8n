/**
 * container.js: Inversion of control container for winston logger instances.
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
var createLogger = require('./create-logger');

/**
 * Inversion of control container for winston logger instances.
 * @type {Container}
 */
module.exports = /*#__PURE__*/function () {
  /**
   * Constructor function for the Container object responsible for managing a
   * set of `winston.Logger` instances based on string ids.
   * @param {!Object} [options={}] - Default pass-thru options for Loggers.
   */
  function Container() {
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    _classCallCheck(this, Container);
    this.loggers = new Map();
    this.options = options;
  }

  /**
   * Retrieves a `winston.Logger` instance for the specified `id`. If an
   * instance does not exist, one is created.
   * @param {!string} id - The id of the Logger to get.
   * @param {?Object} [options] - Options for the Logger instance.
   * @returns {Logger} - A configured Logger instance with a specified id.
   */
  return _createClass(Container, [{
    key: "add",
    value: function add(id, options) {
      var _this = this;
      if (!this.loggers.has(id)) {
        // Remark: Simple shallow clone for configuration options in case we pass
        // in instantiated protoypal objects
        options = Object.assign({}, options || this.options);
        var existing = options.transports || this.options.transports;

        // Remark: Make sure if we have an array of transports we slice it to
        // make copies of those references.
        if (existing) {
          options.transports = Array.isArray(existing) ? existing.slice() : [existing];
        } else {
          options.transports = [];
        }
        var logger = createLogger(options);
        logger.on('close', function () {
          return _this._delete(id);
        });
        this.loggers.set(id, logger);
      }
      return this.loggers.get(id);
    }

    /**
     * Retreives a `winston.Logger` instance for the specified `id`. If
     * an instance does not exist, one is created.
     * @param {!string} id - The id of the Logger to get.
     * @param {?Object} [options] - Options for the Logger instance.
     * @returns {Logger} - A configured Logger instance with a specified id.
     */
  }, {
    key: "get",
    value: function get(id, options) {
      return this.add(id, options);
    }

    /**
     * Check if the container has a logger with the id.
     * @param {?string} id - The id of the Logger instance to find.
     * @returns {boolean} - Boolean value indicating if this instance has a
     * logger with the specified `id`.
     */
  }, {
    key: "has",
    value: function has(id) {
      return !!this.loggers.has(id);
    }

    /**
     * Closes a `Logger` instance with the specified `id` if it exists.
     * If no `id` is supplied then all Loggers are closed.
     * @param {?string} id - The id of the Logger instance to close.
     * @returns {undefined}
     */
  }, {
    key: "close",
    value: function close(id) {
      var _this2 = this;
      if (id) {
        return this._removeLogger(id);
      }
      this.loggers.forEach(function (val, key) {
        return _this2._removeLogger(key);
      });
    }

    /**
     * Remove a logger based on the id.
     * @param {!string} id - The id of the logger to remove.
     * @returns {undefined}
     * @private
     */
  }, {
    key: "_removeLogger",
    value: function _removeLogger(id) {
      if (!this.loggers.has(id)) {
        return;
      }
      var logger = this.loggers.get(id);
      logger.close();
      this._delete(id);
    }

    /**
     * Deletes a `Logger` instance with the specified `id`.
     * @param {!string} id - The id of the Logger instance to delete from
     * container.
     * @returns {undefined}
     * @private
     */
  }, {
    key: "_delete",
    value: function _delete(id) {
      this.loggers["delete"](id);
    }
  }]);
}();