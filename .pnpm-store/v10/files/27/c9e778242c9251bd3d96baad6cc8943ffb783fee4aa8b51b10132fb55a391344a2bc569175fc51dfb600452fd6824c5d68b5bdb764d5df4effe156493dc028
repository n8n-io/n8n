"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.GoogleToken = void 0;
var fs = _interopRequireWildcard(require("fs"));
var _gaxios = require("gaxios");
var jws = _interopRequireWildcard(require("jws"));
var path = _interopRequireWildcard(require("path"));
var _util = require("util");
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function _interopRequireWildcard(e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, "default": e }; if (null === e || "object" != _typeof(e) && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (var _t3 in e) "default" !== _t3 && {}.hasOwnProperty.call(e, _t3) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, _t3)) && (i.get || i.set) ? o(f, _t3, i) : f[_t3] = e[_t3]); return f; })(e, t); }
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _classPrivateMethodInitSpec(e, a) { _checkPrivateRedeclaration(e, a), a.add(e); }
function _classPrivateFieldInitSpec(e, t, a) { _checkPrivateRedeclaration(e, t), t.set(e, a); }
function _checkPrivateRedeclaration(e, t) { if (t.has(e)) throw new TypeError("Cannot initialize the same private elements twice on an object"); }
function _classPrivateFieldSet(s, a, r) { return s.set(_assertClassBrand(s, a), r), r; }
function _classPrivateFieldGet(s, a) { return s.get(_assertClassBrand(s, a)); }
function _assertClassBrand(e, t, n) { if ("function" == typeof e ? e === t : e.has(t)) return arguments.length < 3 ? t : n; throw new TypeError("Private element is not present on this object"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _callSuper(t, o, e) { return o = _getPrototypeOf(o), _possibleConstructorReturn(t, _isNativeReflectConstruct() ? Reflect.construct(o, e || [], _getPrototypeOf(t).constructor) : o.apply(t, e)); }
function _possibleConstructorReturn(t, e) { if (e && ("object" == _typeof(e) || "function" == typeof e)) return e; if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined"); return _assertThisInitialized(t); }
function _assertThisInitialized(e) { if (void 0 === e) throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); return e; }
function _inherits(t, e) { if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function"); t.prototype = Object.create(e && e.prototype, { constructor: { value: t, writable: !0, configurable: !0 } }), Object.defineProperty(t, "prototype", { writable: !1 }), e && _setPrototypeOf(t, e); }
function _wrapNativeSuper(t) { var r = "function" == typeof Map ? new Map() : void 0; return _wrapNativeSuper = function _wrapNativeSuper(t) { if (null === t || !_isNativeFunction(t)) return t; if ("function" != typeof t) throw new TypeError("Super expression must either be null or a function"); if (void 0 !== r) { if (r.has(t)) return r.get(t); r.set(t, Wrapper); } function Wrapper() { return _construct(t, arguments, _getPrototypeOf(this).constructor); } return Wrapper.prototype = Object.create(t.prototype, { constructor: { value: Wrapper, enumerable: !1, writable: !0, configurable: !0 } }), _setPrototypeOf(Wrapper, t); }, _wrapNativeSuper(t); }
function _construct(t, e, r) { if (_isNativeReflectConstruct()) return Reflect.construct.apply(null, arguments); var o = [null]; o.push.apply(o, e); var p = new (t.bind.apply(t, o))(); return r && _setPrototypeOf(p, r.prototype), p; }
function _isNativeReflectConstruct() { try { var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); } catch (t) {} return (_isNativeReflectConstruct = function _isNativeReflectConstruct() { return !!t; })(); }
function _isNativeFunction(t) { try { return -1 !== Function.toString.call(t).indexOf("[native code]"); } catch (n) { return "function" == typeof t; } }
function _setPrototypeOf(t, e) { return _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function (t, e) { return t.__proto__ = e, t; }, _setPrototypeOf(t, e); }
function _getPrototypeOf(t) { return _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function (t) { return t.__proto__ || Object.getPrototypeOf(t); }, _getPrototypeOf(t); }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { if (r) i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n;else { var o = function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); }; o("next", 0), o("throw", 1), o("return", 2); } }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; } /**
 * Copyright 2018 Google LLC
 *
 * Distributed under MIT license.
 * See file LICENSE for detail or copy at https://opensource.org/licenses/MIT
 */
var readFile = fs.readFile ? (0, _util.promisify)(fs.readFile) : /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee() {
  return _regenerator().w(function (_context) {
    while (1) switch (_context.n) {
      case 0:
        throw new ErrorWithCode('use key rather than keyFile.', 'MISSING_CREDENTIALS');
      case 1:
        return _context.a(2);
    }
  }, _callee);
}));
var GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
var GOOGLE_REVOKE_TOKEN_URL = 'https://oauth2.googleapis.com/revoke?token=';
var ErrorWithCode = /*#__PURE__*/function (_Error) {
  function ErrorWithCode(message, code) {
    var _this;
    _classCallCheck(this, ErrorWithCode);
    _this = _callSuper(this, ErrorWithCode, [message]);
    _defineProperty(_this, "code", void 0);
    _this.code = code;
    return _this;
  }
  _inherits(ErrorWithCode, _Error);
  return _createClass(ErrorWithCode);
}(/*#__PURE__*/_wrapNativeSuper(Error));
var _inFlightRequest = /*#__PURE__*/new WeakMap();
var _GoogleToken_brand = /*#__PURE__*/new WeakSet();
var GoogleToken = exports.GoogleToken = /*#__PURE__*/function () {
  /**
   * Create a GoogleToken.
   *
   * @param options  Configuration object.
   */
  function GoogleToken(_options) {
    _classCallCheck(this, GoogleToken);
    _classPrivateMethodInitSpec(this, _GoogleToken_brand);
    _defineProperty(this, "expiresAt", void 0);
    _defineProperty(this, "key", void 0);
    _defineProperty(this, "keyFile", void 0);
    _defineProperty(this, "iss", void 0);
    _defineProperty(this, "sub", void 0);
    _defineProperty(this, "scope", void 0);
    _defineProperty(this, "rawToken", void 0);
    _defineProperty(this, "tokenExpires", void 0);
    _defineProperty(this, "email", void 0);
    _defineProperty(this, "additionalClaims", void 0);
    _defineProperty(this, "eagerRefreshThresholdMillis", void 0);
    _defineProperty(this, "transporter", {
      request: function request(opts) {
        return (0, _gaxios.request)(opts);
      }
    });
    _classPrivateFieldInitSpec(this, _inFlightRequest, void 0);
    _assertClassBrand(_GoogleToken_brand, this, _configure).call(this, _options);
  }

  /**
   * Returns whether the token has expired.
   *
   * @return true if the token has expired, false otherwise.
   */
  return _createClass(GoogleToken, [{
    key: "accessToken",
    get: function get() {
      return this.rawToken ? this.rawToken.access_token : undefined;
    }
  }, {
    key: "idToken",
    get: function get() {
      return this.rawToken ? this.rawToken.id_token : undefined;
    }
  }, {
    key: "tokenType",
    get: function get() {
      return this.rawToken ? this.rawToken.token_type : undefined;
    }
  }, {
    key: "refreshToken",
    get: function get() {
      return this.rawToken ? this.rawToken.refresh_token : undefined;
    }
  }, {
    key: "hasExpired",
    value: function hasExpired() {
      var now = new Date().getTime();
      if (this.rawToken && this.expiresAt) {
        return now >= this.expiresAt;
      } else {
        return true;
      }
    }

    /**
     * Returns whether the token will expire within eagerRefreshThresholdMillis
     *
     * @return true if the token will be expired within eagerRefreshThresholdMillis, false otherwise.
     */
  }, {
    key: "isTokenExpiring",
    value: function isTokenExpiring() {
      var _this$eagerRefreshThr;
      var now = new Date().getTime();
      var eagerRefreshThresholdMillis = (_this$eagerRefreshThr = this.eagerRefreshThresholdMillis) !== null && _this$eagerRefreshThr !== void 0 ? _this$eagerRefreshThr : 0;
      if (this.rawToken && this.expiresAt) {
        return this.expiresAt <= now + eagerRefreshThresholdMillis;
      } else {
        return true;
      }
    }

    /**
     * Returns a cached token or retrieves a new one from Google.
     *
     * @param callback The callback function.
     */
  }, {
    key: "getToken",
    value: function getToken(callback) {
      var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      if (_typeof(callback) === 'object') {
        opts = callback;
        callback = undefined;
      }
      opts = Object.assign({
        forceRefresh: false
      }, opts);
      if (callback) {
        var cb = callback;
        _assertClassBrand(_GoogleToken_brand, this, _getTokenAsync).call(this, opts).then(function (t) {
          return cb(null, t);
        }, callback);
        return;
      }
      return _assertClassBrand(_GoogleToken_brand, this, _getTokenAsync).call(this, opts);
    }

    /**
     * Given a keyFile, extract the key and client email if available
     * @param keyFile Path to a json, pem, or p12 file that contains the key.
     * @returns an object with privateKey and clientEmail properties
     */
  }, {
    key: "getCredentials",
    value: (function () {
      var _getCredentials = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2(keyFile) {
        var ext, key, body, privateKey, clientEmail, _privateKey, _t;
        return _regenerator().w(function (_context2) {
          while (1) switch (_context2.n) {
            case 0:
              ext = path.extname(keyFile);
              _t = ext;
              _context2.n = _t === '.json' ? 1 : _t === '.der' ? 4 : _t === '.crt' ? 4 : _t === '.pem' ? 4 : _t === '.p12' ? 6 : _t === '.pfx' ? 6 : 7;
              break;
            case 1:
              _context2.n = 2;
              return readFile(keyFile, 'utf8');
            case 2:
              key = _context2.v;
              body = JSON.parse(key);
              privateKey = body.private_key;
              clientEmail = body.client_email;
              if (!(!privateKey || !clientEmail)) {
                _context2.n = 3;
                break;
              }
              throw new ErrorWithCode('private_key and client_email are required.', 'MISSING_CREDENTIALS');
            case 3:
              return _context2.a(2, {
                privateKey: privateKey,
                clientEmail: clientEmail
              });
            case 4:
              _context2.n = 5;
              return readFile(keyFile, 'utf8');
            case 5:
              _privateKey = _context2.v;
              return _context2.a(2, {
                privateKey: _privateKey
              });
            case 6:
              throw new ErrorWithCode('*.p12 certificates are not supported after v6.1.2. ' + 'Consider utilizing *.json format or converting *.p12 to *.pem using the OpenSSL CLI.', 'UNKNOWN_CERTIFICATE_TYPE');
            case 7:
              throw new ErrorWithCode('Unknown certificate type. Type is determined based on file extension. ' + 'Current supported extensions are *.json, and *.pem.', 'UNKNOWN_CERTIFICATE_TYPE');
            case 8:
              return _context2.a(2);
          }
        }, _callee2);
      }));
      function getCredentials(_x) {
        return _getCredentials.apply(this, arguments);
      }
      return getCredentials;
    }())
  }, {
    key: "revokeToken",
    value: function revokeToken(callback) {
      if (callback) {
        _assertClassBrand(_GoogleToken_brand, this, _revokeTokenAsync).call(this).then(function () {
          return callback();
        }, callback);
        return;
      }
      return _assertClassBrand(_GoogleToken_brand, this, _revokeTokenAsync).call(this);
    }
  }]);
}();
function _getTokenAsync(_x2) {
  return _getTokenAsync2.apply(this, arguments);
}
function _getTokenAsync2() {
  _getTokenAsync2 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3(opts) {
    return _regenerator().w(function (_context3) {
      while (1) switch (_context3.n) {
        case 0:
          if (!(_classPrivateFieldGet(_inFlightRequest, this) && !opts.forceRefresh)) {
            _context3.n = 1;
            break;
          }
          return _context3.a(2, _classPrivateFieldGet(_inFlightRequest, this));
        case 1:
          _context3.p = 1;
          _context3.n = 2;
          return _classPrivateFieldSet(_inFlightRequest, this, _assertClassBrand(_GoogleToken_brand, this, _getTokenAsyncInner).call(this, opts));
        case 2:
          return _context3.a(2, _context3.v);
        case 3:
          _context3.p = 3;
          _classPrivateFieldSet(_inFlightRequest, this, undefined);
          return _context3.f(3);
        case 4:
          return _context3.a(2);
      }
    }, _callee3, this, [[1,, 3, 4]]);
  }));
  return _getTokenAsync2.apply(this, arguments);
}
function _getTokenAsyncInner(_x3) {
  return _getTokenAsyncInner2.apply(this, arguments);
}
function _getTokenAsyncInner2() {
  _getTokenAsyncInner2 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee4(opts) {
    var creds;
    return _regenerator().w(function (_context4) {
      while (1) switch (_context4.n) {
        case 0:
          if (!(this.isTokenExpiring() === false && opts.forceRefresh === false)) {
            _context4.n = 1;
            break;
          }
          return _context4.a(2, Promise.resolve(this.rawToken));
        case 1:
          if (!(!this.key && !this.keyFile)) {
            _context4.n = 2;
            break;
          }
          throw new Error('No key or keyFile set.');
        case 2:
          if (!(!this.key && this.keyFile)) {
            _context4.n = 4;
            break;
          }
          _context4.n = 3;
          return this.getCredentials(this.keyFile);
        case 3:
          creds = _context4.v;
          this.key = creds.privateKey;
          this.iss = creds.clientEmail || this.iss;
          if (!creds.clientEmail) {
            _assertClassBrand(_GoogleToken_brand, this, _ensureEmail).call(this);
          }
        case 4:
          return _context4.a(2, _assertClassBrand(_GoogleToken_brand, this, _requestToken).call(this));
      }
    }, _callee4, this);
  }));
  return _getTokenAsyncInner2.apply(this, arguments);
}
function _ensureEmail() {
  if (!this.iss) {
    throw new ErrorWithCode('email is required.', 'MISSING_CREDENTIALS');
  }
}
function _revokeTokenAsync() {
  return _revokeTokenAsync2.apply(this, arguments);
}
function _revokeTokenAsync2() {
  _revokeTokenAsync2 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee5() {
    var url;
    return _regenerator().w(function (_context5) {
      while (1) switch (_context5.n) {
        case 0:
          if (this.accessToken) {
            _context5.n = 1;
            break;
          }
          throw new Error('No token to revoke.');
        case 1:
          url = GOOGLE_REVOKE_TOKEN_URL + this.accessToken;
          _context5.n = 2;
          return this.transporter.request({
            url: url,
            retry: true
          });
        case 2:
          _assertClassBrand(_GoogleToken_brand, this, _configure).call(this, {
            email: this.iss,
            sub: this.sub,
            key: this.key,
            keyFile: this.keyFile,
            scope: this.scope,
            additionalClaims: this.additionalClaims
          });
        case 3:
          return _context5.a(2);
      }
    }, _callee5, this);
  }));
  return _revokeTokenAsync2.apply(this, arguments);
}
/**
 * Configure the GoogleToken for re-use.
 * @param  {object} options Configuration object.
 */
function _configure() {
  var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  this.keyFile = options.keyFile;
  this.key = options.key;
  this.rawToken = undefined;
  this.iss = options.email || options.iss;
  this.sub = options.sub;
  this.additionalClaims = options.additionalClaims;
  if (_typeof(options.scope) === 'object') {
    this.scope = options.scope.join(' ');
  } else {
    this.scope = options.scope;
  }
  this.eagerRefreshThresholdMillis = options.eagerRefreshThresholdMillis;
  if (options.transporter) {
    this.transporter = options.transporter;
  }
}
/**
 * Request the token from Google.
 */
function _requestToken() {
  return _requestToken2.apply(this, arguments);
}
function _requestToken2() {
  _requestToken2 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee6() {
    var iat, additionalClaims, payload, signedJWT, r, _response, _response2, body, desc, _t2;
    return _regenerator().w(function (_context6) {
      while (1) switch (_context6.n) {
        case 0:
          iat = Math.floor(new Date().getTime() / 1000);
          additionalClaims = this.additionalClaims || {};
          payload = Object.assign({
            iss: this.iss,
            scope: this.scope,
            aud: GOOGLE_TOKEN_URL,
            exp: iat + 3600,
            iat: iat,
            sub: this.sub
          }, additionalClaims);
          signedJWT = jws.sign({
            header: {
              alg: 'RS256'
            },
            payload: payload,
            secret: this.key
          });
          _context6.p = 1;
          _context6.n = 2;
          return this.transporter.request({
            method: 'POST',
            url: GOOGLE_TOKEN_URL,
            data: new URLSearchParams({
              grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
              assertion: signedJWT
            }),
            responseType: 'json',
            retryConfig: {
              httpMethodsToRetry: ['POST']
            }
          });
        case 2:
          r = _context6.v;
          this.rawToken = r.data;
          this.expiresAt = r.data.expires_in === null || r.data.expires_in === undefined ? undefined : (iat + r.data.expires_in) * 1000;
          return _context6.a(2, this.rawToken);
        case 3:
          _context6.p = 3;
          _t2 = _context6.v;
          this.rawToken = undefined;
          this.tokenExpires = undefined;
          body = _t2.response && (_response = _t2.response) !== null && _response !== void 0 && _response.data ? (_response2 = _t2.response) === null || _response2 === void 0 ? void 0 : _response2.data : {};
          if (body.error) {
            desc = body.error_description ? ": ".concat(body.error_description) : '';
            _t2.message = "".concat(body.error).concat(desc);
          }
          throw _t2;
        case 4:
          return _context6.a(2);
      }
    }, _callee6, this, [[1, 3]]);
  }));
  return _requestToken2.apply(this, arguments);
}