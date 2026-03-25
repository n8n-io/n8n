/**
 * http.js: Transport for outputting to a json-rpcserver.
 *
 * (C) 2010 Charlie Robbins
 * MIT LICENCE
 */

'use strict';

function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
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
var http = require('http');
var https = require('https');
var _require = require('readable-stream'),
  Stream = _require.Stream;
var TransportStream = require('winston-transport');
var _require2 = require('safe-stable-stringify'),
  configure = _require2.configure;

/**
 * Transport for outputting to a json-rpc server.
 * @type {Stream}
 * @extends {TransportStream}
 */
module.exports = /*#__PURE__*/function (_TransportStream) {
  /**
   * Constructor function for the Http transport object responsible for
   * persisting log messages and metadata to a terminal or TTY.
   * @param {!Object} [options={}] - Options for this instance.
   */
  // eslint-disable-next-line max-statements
  function Http() {
    var _this;
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    _classCallCheck(this, Http);
    _this = _callSuper(this, Http, [options]);
    _this.options = options;
    _this.name = options.name || 'http';
    _this.ssl = !!options.ssl;
    _this.host = options.host || 'localhost';
    _this.port = options.port;
    _this.auth = options.auth;
    _this.path = options.path || '';
    _this.maximumDepth = options.maximumDepth;
    _this.agent = options.agent;
    _this.headers = options.headers || {};
    _this.headers['content-type'] = 'application/json';
    _this.batch = options.batch || false;
    _this.batchInterval = options.batchInterval || 5000;
    _this.batchCount = options.batchCount || 10;
    _this.batchOptions = [];
    _this.batchTimeoutID = -1;
    _this.batchCallback = {};
    if (!_this.port) {
      _this.port = _this.ssl ? 443 : 80;
    }
    return _this;
  }

  /**
   * Core logging method exposed to Winston.
   * @param {Object} info - TODO: add param description.
   * @param {function} callback - TODO: add param description.
   * @returns {undefined}
   */
  _inherits(Http, _TransportStream);
  return _createClass(Http, [{
    key: "log",
    value: function log(info, callback) {
      var _this2 = this;
      this._request(info, null, null, function (err, res) {
        if (res && res.statusCode !== 200) {
          err = new Error("Invalid HTTP Status Code: ".concat(res.statusCode));
        }
        if (err) {
          _this2.emit('warn', err);
        } else {
          _this2.emit('logged', info);
        }
      });

      // Remark: (jcrugzz) Fire and forget here so requests dont cause buffering
      // and block more requests from happening?
      if (callback) {
        setImmediate(callback);
      }
    }

    /**
     * Query the transport. Options object is optional.
     * @param {Object} options -  Loggly-like query options for this instance.
     * @param {function} callback - Continuation to respond to when complete.
     * @returns {undefined}
     */
  }, {
    key: "query",
    value: function query(options, callback) {
      if (typeof options === 'function') {
        callback = options;
        options = {};
      }
      options = {
        method: 'query',
        params: this.normalizeQuery(options)
      };
      var auth = options.params.auth || null;
      delete options.params.auth;
      var path = options.params.path || null;
      delete options.params.path;
      this._request(options, auth, path, function (err, res, body) {
        if (res && res.statusCode !== 200) {
          err = new Error("Invalid HTTP Status Code: ".concat(res.statusCode));
        }
        if (err) {
          return callback(err);
        }
        if (typeof body === 'string') {
          try {
            body = JSON.parse(body);
          } catch (e) {
            return callback(e);
          }
        }
        callback(null, body);
      });
    }

    /**
     * Returns a log stream for this transport. Options object is optional.
     * @param {Object} options - Stream options for this instance.
     * @returns {Stream} - TODO: add return description
     */
  }, {
    key: "stream",
    value: function stream() {
      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      var stream = new Stream();
      options = {
        method: 'stream',
        params: options
      };
      var path = options.params.path || null;
      delete options.params.path;
      var auth = options.params.auth || null;
      delete options.params.auth;
      var buff = '';
      var req = this._request(options, auth, path);
      stream.destroy = function () {
        return req.destroy();
      };
      req.on('data', function (data) {
        data = (buff + data).split(/\n+/);
        var l = data.length - 1;
        var i = 0;
        for (; i < l; i++) {
          try {
            stream.emit('log', JSON.parse(data[i]));
          } catch (e) {
            stream.emit('error', e);
          }
        }
        buff = data[l];
      });
      req.on('error', function (err) {
        return stream.emit('error', err);
      });
      return stream;
    }

    /**
     * Make a request to a winstond server or any http server which can
     * handle json-rpc.
     * @param {function} options - Options to sent the request.
     * @param {Object?} auth - authentication options
     * @param {string} path - request path
     * @param {function} callback - Continuation to respond to when complete.
     */
  }, {
    key: "_request",
    value: function _request(options, auth, path, callback) {
      options = options || {};
      auth = auth || this.auth;
      path = path || this.path || '';
      if (this.batch) {
        this._doBatch(options, callback, auth, path);
      } else {
        this._doRequest(options, callback, auth, path);
      }
    }

    /**
     * Send or memorize the options according to batch configuration
     * @param {function} options - Options to sent the request.
     * @param {function} callback - Continuation to respond to when complete.
     * @param {Object?} auth - authentication options
     * @param {string} path - request path
     */
  }, {
    key: "_doBatch",
    value: function _doBatch(options, callback, auth, path) {
      this.batchOptions.push(options);
      if (this.batchOptions.length === 1) {
        // First message stored, it's time to start the timeout!
        var me = this;
        this.batchCallback = callback;
        this.batchTimeoutID = setTimeout(function () {
          // timeout is reached, send all messages to endpoint
          me.batchTimeoutID = -1;
          me._doBatchRequest(me.batchCallback, auth, path);
        }, this.batchInterval);
      }
      if (this.batchOptions.length === this.batchCount) {
        // max batch count is reached, send all messages to endpoint
        this._doBatchRequest(this.batchCallback, auth, path);
      }
    }

    /**
     * Initiate a request with the memorized batch options, stop the batch timeout
     * @param {function} callback - Continuation to respond to when complete.
     * @param {Object?} auth - authentication options
     * @param {string} path - request path
     */
  }, {
    key: "_doBatchRequest",
    value: function _doBatchRequest(callback, auth, path) {
      if (this.batchTimeoutID > 0) {
        clearTimeout(this.batchTimeoutID);
        this.batchTimeoutID = -1;
      }
      var batchOptionsCopy = this.batchOptions.slice();
      this.batchOptions = [];
      this._doRequest(batchOptionsCopy, callback, auth, path);
    }

    /**
     * Make a request to a winstond server or any http server which can
     * handle json-rpc.
     * @param {function} options - Options to sent the request.
     * @param {function} callback - Continuation to respond to when complete.
     * @param {Object?} auth - authentication options
     * @param {string} path - request path
     */
  }, {
    key: "_doRequest",
    value: function _doRequest(options, callback, auth, path) {
      // Prepare options for outgoing HTTP request
      var headers = Object.assign({}, this.headers);
      if (auth && auth.bearer) {
        headers.Authorization = "Bearer ".concat(auth.bearer);
      }
      var req = (this.ssl ? https : http).request(_objectSpread(_objectSpread({}, this.options), {}, {
        method: 'POST',
        host: this.host,
        port: this.port,
        path: "/".concat(path.replace(/^\//, '')),
        headers: headers,
        auth: auth && auth.username && auth.password ? "".concat(auth.username, ":").concat(auth.password) : '',
        agent: this.agent
      }));
      req.on('error', callback);
      req.on('response', function (res) {
        return res.on('end', function () {
          return callback(null, res);
        }).resume();
      });
      var jsonStringify = configure(_objectSpread({}, this.maximumDepth && {
        maximumDepth: this.maximumDepth
      }));
      req.end(Buffer.from(jsonStringify(options, this.options.replacer), 'utf8'));
    }
  }]);
}(TransportStream);