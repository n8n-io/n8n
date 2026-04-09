"use strict";

/**
 * Module dependencies.
 */

const {
  format
} = require('url');
const Stream = require('stream');
const https = require('https');
const http = require('http');
const fs = require('fs');
const zlib = require('zlib');
const util = require('util');
const qs = require('qs');
const mime = require('mime');
let methods = require('methods');
const FormData = require('form-data');
const formidable = require('formidable');
const debug = require('debug')('superagent');
const CookieJar = require('cookiejar');
const safeStringify = require('fast-safe-stringify');
const utils = require('../utils');
const RequestBase = require('../request-base');
const http2 = require('./http2wrapper');
const {
  decompress
} = require('./unzip');
const Response = require('./response');
const {
  mixin,
  hasOwn,
  isBrotliEncoding,
  isGzipOrDeflateEncoding
} = utils;
const {
  chooseDecompresser
} = require('./decompress');
function request(method, url) {
  // callback
  if (typeof url === 'function') {
    return new exports.Request('GET', method).end(url);
  }

  // url first
  if (arguments.length === 1) {
    return new exports.Request('GET', method);
  }
  return new exports.Request(method, url);
}
module.exports = request;
exports = module.exports;

/**
 * Expose `Request`.
 */

exports.Request = Request;

/**
 * Expose the agent function
 */

exports.agent = require('./agent');

/**
 * Noop.
 */

function noop() {}

/**
 * Expose `Response`.
 */

exports.Response = Response;

/**
 * Define "form" mime type.
 */

mime.define({
  'application/x-www-form-urlencoded': ['form', 'urlencoded', 'form-data']
}, true);

/**
 * Protocol map.
 */

exports.protocols = {
  'http:': http,
  'https:': https,
  'http2:': http2
};

/**
 * Default serialization map.
 *
 *     superagent.serialize['application/xml'] = function(obj){
 *       return 'generated xml here';
 *     };
 *
 */

exports.serialize = {
  'application/x-www-form-urlencoded': obj => {
    return qs.stringify(obj, {
      indices: false,
      strictNullHandling: true
    });
  },
  'application/json': safeStringify
};

/**
 * Default parsers.
 *
 *     superagent.parse['application/xml'] = function(res, fn){
 *       fn(null, res);
 *     };
 *
 */

exports.parse = require('./parsers');

/**
 * Default buffering map. Can be used to set certain
 * response types to buffer/not buffer.
 *
 *     superagent.buffer['application/xml'] = true;
 */
exports.buffer = {};

/**
 * Initialize internal header tracking properties on a request instance.
 *
 * @param {Object} req the instance
 * @api private
 */
function _initHeaders(request_) {
  request_._header = {
    // coerces header names to lowercase
  };
  request_.header = {
    // preserves header name case
  };
}

/**
 * Initialize a new `Request` with the given `method` and `url`.
 *
 * @param {String} method
 * @param {String|Object} url
 * @api public
 */

function Request(method, url) {
  Stream.call(this);
  if (typeof url !== 'string') url = format(url);
  this._enableHttp2 = Boolean(process.env.HTTP2_TEST); // internal only
  this._agent = false;
  this._formData = null;
  this.method = method;
  this.url = url;
  _initHeaders(this);
  this.writable = true;
  this._redirects = 0;
  this.redirects(method === 'HEAD' ? 0 : 5);
  this.cookies = '';
  this.qs = {};
  this._query = [];
  this.qsRaw = this._query; // Unused, for backwards compatibility only
  this._redirectList = [];
  this._streamRequest = false;
  this._lookup = undefined;
  this.once('end', this.clearTimeout.bind(this));
}

/**
 * Inherit from `Stream` (which inherits from `EventEmitter`).
 * Mixin `RequestBase`.
 */
util.inherits(Request, Stream);
mixin(Request.prototype, RequestBase.prototype);

/**
 * Enable or Disable http2.
 *
 * Enable http2.
 *
 * ``` js
 * request.get('http://localhost/')
 *   .http2()
 *   .end(callback);
 *
 * request.get('http://localhost/')
 *   .http2(true)
 *   .end(callback);
 * ```
 *
 * Disable http2.
 *
 * ``` js
 * request = request.http2();
 * request.get('http://localhost/')
 *   .http2(false)
 *   .end(callback);
 * ```
 *
 * @param {Boolean} enable
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.http2 = function (bool) {
  if (exports.protocols['http2:'] === undefined) {
    throw new Error('superagent: this version of Node.js does not support http2');
  }
  this._enableHttp2 = bool === undefined ? true : bool;
  return this;
};

/**
 * Queue the given `file` as an attachment to the specified `field`,
 * with optional `options` (or filename).
 *
 * ``` js
 * request.post('http://localhost/upload')
 *   .attach('field', Buffer.from('<b>Hello world</b>'), 'hello.html')
 *   .end(callback);
 * ```
 *
 * A filename may also be used:
 *
 * ``` js
 * request.post('http://localhost/upload')
 *   .attach('files', 'image.jpg')
 *   .end(callback);
 * ```
 *
 * @param {String} field
 * @param {String|fs.ReadStream|Buffer} file
 * @param {String|Object} options
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.attach = function (field, file, options) {
  if (file) {
    if (this._data) {
      throw new Error("superagent can't mix .send() and .attach()");
    }
    let o = options || {};
    if (typeof options === 'string') {
      o = {
        filename: options
      };
    }
    if (typeof file === 'string') {
      if (!o.filename) o.filename = file;
      debug('creating `fs.ReadStream` instance for file: %s', file);
      file = fs.createReadStream(file);
      file.on('error', error => {
        const formData = this._getFormData();
        formData.emit('error', error);
      });
    } else if (!o.filename && file.path) {
      o.filename = file.path;
    }
    this._getFormData().append(field, file, o);
  }
  return this;
};
Request.prototype._getFormData = function () {
  if (!this._formData) {
    this._formData = new FormData();
    this._formData.on('error', error => {
      debug('FormData error', error);
      if (this.called) {
        // The request has already finished and the callback was called.
        // Silently ignore the error.
        return;
      }
      this.callback(error);
      this.abort();
    });
  }
  return this._formData;
};

/**
 * Gets/sets the `Agent` to use for this HTTP request. The default (if this
 * function is not called) is to opt out of connection pooling (`agent: false`).
 *
 * @param {http.Agent} agent
 * @return {http.Agent}
 * @api public
 */

Request.prototype.agent = function (agent) {
  if (arguments.length === 0) return this._agent;
  this._agent = agent;
  return this;
};

/**
 * Gets/sets the `lookup` function to use custom DNS resolver.
 *
 * @param {Function} lookup
 * @return {Function}
 * @api public
 */

Request.prototype.lookup = function (lookup) {
  if (arguments.length === 0) return this._lookup;
  this._lookup = lookup;
  return this;
};

/**
 * Set _Content-Type_ response header passed through `mime.getType()`.
 *
 * Examples:
 *
 *      request.post('/')
 *        .type('xml')
 *        .send(xmlstring)
 *        .end(callback);
 *
 *      request.post('/')
 *        .type('json')
 *        .send(jsonstring)
 *        .end(callback);
 *
 *      request.post('/')
 *        .type('application/json')
 *        .send(jsonstring)
 *        .end(callback);
 *
 * @param {String} type
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.type = function (type) {
  return this.set('Content-Type', type.includes('/') ? type : mime.getType(type));
};

/**
 * Set _Accept_ response header passed through `mime.getType()`.
 *
 * Examples:
 *
 *      superagent.types.json = 'application/json';
 *
 *      request.get('/agent')
 *        .accept('json')
 *        .end(callback);
 *
 *      request.get('/agent')
 *        .accept('application/json')
 *        .end(callback);
 *
 * @param {String} accept
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.accept = function (type) {
  return this.set('Accept', type.includes('/') ? type : mime.getType(type));
};

/**
 * Add query-string `val`.
 *
 * Examples:
 *
 *   request.get('/shoes')
 *     .query('size=10')
 *     .query({ color: 'blue' })
 *
 * @param {Object|String} val
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.query = function (value) {
  if (typeof value === 'string') {
    this._query.push(value);
  } else {
    Object.assign(this.qs, value);
  }
  return this;
};

/**
 * Write raw `data` / `encoding` to the socket.
 *
 * @param {Buffer|String} data
 * @param {String} encoding
 * @return {Boolean}
 * @api public
 */

Request.prototype.write = function (data, encoding) {
  const request_ = this.request();
  if (!this._streamRequest) {
    this._streamRequest = true;
  }
  return request_.write(data, encoding);
};

/**
 * Pipe the request body to `stream`.
 *
 * @param {Stream} stream
 * @param {Object} options
 * @return {Stream}
 * @api public
 */

Request.prototype.pipe = function (stream, options) {
  this.piped = true; // HACK...
  this.buffer(false);
  this.end();
  return this._pipeContinue(stream, options);
};
Request.prototype._pipeContinue = function (stream, options) {
  this.req.once('response', res => {
    // redirect
    if (isRedirect(res.statusCode) && this._redirects++ !== this._maxRedirects) {
      return this._redirect(res) === this ? this._pipeContinue(stream, options) : undefined;
    }
    this.res = res;
    this._emitResponse();
    if (this._aborted) return;
    if (this._shouldDecompress(res)) {
      let decompresser = chooseDecompresser(res);
      decompresser.on('error', error => {
        if (error && error.code === 'Z_BUF_ERROR') {
          // unexpected end of file is ignored by browsers and curl
          stream.emit('end');
          return;
        }
        stream.emit('error', error);
      });
      res.pipe(decompresser).pipe(stream, options);
      // don't emit 'end' until decompresser has completed writing all its data.
      decompresser.once('end', () => this.emit('end'));
    } else {
      res.pipe(stream, options);
      res.once('end', () => this.emit('end'));
    }
  });
  return stream;
};

/**
 * Enable / disable buffering.
 *
 * @return {Boolean} [val]
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.buffer = function (value) {
  this._buffer = value !== false;
  return this;
};

/**
 * Redirect to `url
 *
 * @param {IncomingMessage} res
 * @return {Request} for chaining
 * @api private
 */

Request.prototype._redirect = function (res) {
  let url = res.headers.location;
  if (!url) {
    return this.callback(new Error('No location header for redirect'), res);
  }
  debug('redirect %s -> %s', this.url, url);

  // location
  url = new URL(url, this.url).href;

  // ensure the response is being consumed
  // this is required for Node v0.10+
  res.resume();
  let headers = this.req.getHeaders ? this.req.getHeaders() : this.req._headers;
  const changesOrigin = new URL(url).host !== new URL(this.url).host;

  // implementation of 302 following defacto standard
  if (res.statusCode === 301 || res.statusCode === 302) {
    // strip Content-* related fields
    // in case of POST etc
    headers = utils.cleanHeader(headers, changesOrigin);

    // force GET
    this.method = this.method === 'HEAD' ? 'HEAD' : 'GET';

    // clear data
    this._data = null;
  }

  // 303 is always GET
  if (res.statusCode === 303) {
    // strip Content-* related fields
    // in case of POST etc
    headers = utils.cleanHeader(headers, changesOrigin);

    // force method
    this.method = 'GET';

    // clear data
    this._data = null;
  }

  // 307 preserves method
  // 308 preserves method
  delete headers.host;
  delete this.req;
  delete this._formData;

  // remove all add header except User-Agent
  _initHeaders(this);

  // redirect
  this.res = res;
  this._endCalled = false;
  this.url = url;
  this.qs = {};
  this._query.length = 0;
  this.set(headers);
  this._emitRedirect();
  this._redirectList.push(this.url);
  this.end(this._callback);
  return this;
};

/**
 * Set Authorization field value with `user` and `pass`.
 *
 * Examples:
 *
 *   .auth('tobi', 'learnboost')
 *   .auth('tobi:learnboost')
 *   .auth('tobi')
 *   .auth(accessToken, { type: 'bearer' })
 *
 * @param {String} user
 * @param {String} [pass]
 * @param {Object} [options] options with authorization type 'basic' or 'bearer' ('basic' is default)
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.auth = function (user, pass, options) {
  if (arguments.length === 1) pass = '';
  if (typeof pass === 'object' && pass !== null) {
    // pass is optional and can be replaced with options
    options = pass;
    pass = '';
  }
  if (!options) {
    options = {
      type: 'basic'
    };
  }
  const encoder = string => Buffer.from(string).toString('base64');
  return this._auth(user, pass, options, encoder);
};

/**
 * Set the certificate authority option for https request.
 *
 * @param {Buffer | Array} cert
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.ca = function (cert) {
  this._ca = cert;
  return this;
};

/**
 * Set the client certificate key option for https request.
 *
 * @param {Buffer | String} cert
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.key = function (cert) {
  this._key = cert;
  return this;
};

/**
 * Set the key, certificate, and CA certs of the client in PFX or PKCS12 format.
 *
 * @param {Buffer | String} cert
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.pfx = function (cert) {
  if (typeof cert === 'object' && !Buffer.isBuffer(cert)) {
    this._pfx = cert.pfx;
    this._passphrase = cert.passphrase;
  } else {
    this._pfx = cert;
  }
  return this;
};

/**
 * Set the client certificate option for https request.
 *
 * @param {Buffer | String} cert
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.cert = function (cert) {
  this._cert = cert;
  return this;
};

/**
 * Do not reject expired or invalid TLS certs.
 * sets `rejectUnauthorized=true`. Be warned that this allows MITM attacks.
 *
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.disableTLSCerts = function () {
  this._disableTLSCerts = true;
  return this;
};

/**
 * Return an http[s] request.
 *
 * @return {OutgoingMessage}
 * @api private
 */

// eslint-disable-next-line complexity
Request.prototype.request = function () {
  if (this.req) return this.req;
  const options = {};
  try {
    const query = qs.stringify(this.qs, {
      indices: false,
      strictNullHandling: true
    });
    if (query) {
      this.qs = {};
      this._query.push(query);
    }
    this._finalizeQueryString();
  } catch (err) {
    return this.emit('error', err);
  }
  let {
    url: urlString
  } = this;
  const retries = this._retries;

  // default to http://
  if (urlString.indexOf('http') !== 0) urlString = `http://${urlString}`;
  const url = new URL(urlString);
  let {
    protocol
  } = url;
  let path = `${url.pathname}${url.search}`;

  // support unix sockets
  if (/^https?\+unix:/.test(protocol) === true) {
    // get the protocol
    protocol = `${protocol.split('+')[0]}:`;

    // get the socket path
    options.socketPath = url.hostname.replace(/%2F/g, '/');
    url.host = '';
    url.hostname = '';
  }

  // Override IP address of a hostname
  if (this._connectOverride) {
    const {
      hostname
    } = url;
    const match = hostname in this._connectOverride ? this._connectOverride[hostname] : this._connectOverride['*'];
    if (match) {
      // backup the real host
      if (!this._header.host) {
        this.set('host', url.host);
      }
      let newHost;
      let newPort;
      if (typeof match === 'object') {
        newHost = match.host;
        newPort = match.port;
      } else {
        newHost = match;
        newPort = url.port;
      }

      // wrap [ipv6]
      url.host = /:/.test(newHost) ? `[${newHost}]` : newHost;
      if (newPort) {
        url.host += `:${newPort}`;
        url.port = newPort;
      }
      url.hostname = newHost;
    }
  }

  // options
  options.method = this.method;
  options.port = url.port;
  options.path = path;
  options.host = utils.normalizeHostname(url.hostname); // ex: [::1] -> ::1
  options.ca = this._ca;
  options.key = this._key;
  options.pfx = this._pfx;
  options.cert = this._cert;
  options.passphrase = this._passphrase;
  options.agent = this._agent;
  options.lookup = this._lookup;
  options.rejectUnauthorized = typeof this._disableTLSCerts === 'boolean' ? !this._disableTLSCerts : process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0';

  // Allows request.get('https://1.2.3.4/').set('Host', 'example.com')
  if (this._header.host) {
    options.servername = this._header.host.replace(/:\d+$/, '');
  }
  if (this._trustLocalhost && /^(?:localhost|127\.0\.0\.\d+|(0*:)+:0*1)$/.test(url.hostname)) {
    options.rejectUnauthorized = false;
  }

  // initiate request
  const module_ = this._enableHttp2 ? exports.protocols['http2:'].setProtocol(protocol) : exports.protocols[protocol];

  // request
  this.req = module_.request(options);
  const {
    req
  } = this;

  // set tcp no delay
  req.setNoDelay(true);
  if (options.method !== 'HEAD') {
    req.setHeader('Accept-Encoding', 'gzip, deflate');
  }
  this.protocol = protocol;
  this.host = url.host;

  // expose events
  req.once('drain', () => {
    this.emit('drain');
  });
  req.on('error', error => {
    // flag abortion here for out timeouts
    // because node will emit a faux-error "socket hang up"
    // when request is aborted before a connection is made
    if (this._aborted) return;
    // if not the same, we are in the **old** (cancelled) request,
    // so need to continue (same as for above)
    if (this._retries !== retries) return;
    // if we've received a response then we don't want to let
    // an error in the request blow up the response
    if (this.response) return;
    this.callback(error);
  });

  // auth
  if (url.username || url.password) {
    this.auth(url.username, url.password);
  }
  if (this.username && this.password) {
    this.auth(this.username, this.password);
  }
  for (const key in this.header) {
    if (hasOwn(this.header, key)) req.setHeader(key, this.header[key]);
  }

  // add cookies
  if (this.cookies) {
    if (hasOwn(this._header, 'cookie')) {
      // merge
      const temporaryJar = new CookieJar.CookieJar();
      temporaryJar.setCookies(this._header.cookie.split('; '));
      temporaryJar.setCookies(this.cookies.split('; '));
      req.setHeader('Cookie', temporaryJar.getCookies(CookieJar.CookieAccessInfo.All).toValueString());
    } else {
      req.setHeader('Cookie', this.cookies);
    }
  }
  return req;
};

/**
 * Invoke the callback with `err` and `res`
 * and handle arity check.
 *
 * @param {Error} err
 * @param {Response} res
 * @api private
 */

Request.prototype.callback = function (error, res) {
  if (this._shouldRetry(error, res)) {
    return this._retry();
  }

  // Avoid the error which is emitted from 'socket hang up' to cause the fn undefined error on JS runtime.
  const fn = this._callback || noop;
  this.clearTimeout();
  if (this.called) return console.warn('superagent: double callback bug');
  this.called = true;
  if (!error) {
    try {
      if (!this._isResponseOK(res)) {
        let message = 'Unsuccessful HTTP response';
        if (res) {
          message = http.STATUS_CODES[res.status] || message;
        }
        error = new Error(message);
        error.status = res ? res.status : undefined;
      }
    } catch (err) {
      error = err;
      error.status = error.status || (res ? res.status : undefined);
    }
  }

  // It's important that the callback is called outside try/catch
  // to avoid double callback
  if (!error) {
    return fn(null, res);
  }
  error.response = res;
  if (this._maxRetries) error.retries = this._retries - 1;

  // only emit error event if there is a listener
  // otherwise we assume the callback to `.end()` will get the error
  if (error && this.listeners('error').length > 0) {
    this.emit('error', error);
  }
  fn(error, res);
};

/**
 * Check if `obj` is a host object,
 *
 * @param {Object} obj host object
 * @return {Boolean} is a host object
 * @api private
 */
Request.prototype._isHost = function (object) {
  return Buffer.isBuffer(object) || object instanceof Stream || object instanceof FormData;
};

/**
 * Initiate request, invoking callback `fn(err, res)`
 * with an instanceof `Response`.
 *
 * @param {Function} fn
 * @return {Request} for chaining
 * @api public
 */

Request.prototype._emitResponse = function (body, files) {
  const response = new Response(this);
  this.response = response;
  response.redirects = this._redirectList;
  if (undefined !== body) {
    response.body = body;
  }
  response.files = files;
  if (this._endCalled) {
    response.pipe = function () {
      throw new Error("end() has already been called, so it's too late to start piping");
    };
  }
  this.emit('response', response);
  return response;
};

/**
 * Emit `redirect` event, passing an instanceof `Response`.
 *
 * @api private
 */

Request.prototype._emitRedirect = function () {
  const response = new Response(this);
  response.redirects = this._redirectList;
  this.emit('redirect', response);
};
Request.prototype.end = function (fn) {
  this.request();
  debug('%s %s', this.method, this.url);
  if (this._endCalled) {
    throw new Error('.end() was called twice. This is not supported in superagent');
  }
  this._endCalled = true;

  // store callback
  this._callback = fn || noop;
  this._end();
};
Request.prototype._end = function () {
  if (this._aborted) return this.callback(new Error('The request has been aborted even before .end() was called'));
  let data = this._data;
  const {
    req
  } = this;
  const {
    method
  } = this;
  this._setTimeouts();

  // body
  if (method !== 'HEAD' && !req._headerSent) {
    // serialize stuff
    if (typeof data !== 'string') {
      let contentType = req.getHeader('Content-Type');
      // Parse out just the content type from the header (ignore the charset)
      if (contentType) contentType = contentType.split(';')[0];
      let serialize = this._serializer || exports.serialize[contentType];
      if (!serialize && isJSON(contentType)) {
        serialize = exports.serialize['application/json'];
      }
      if (serialize) data = serialize(data);
    }

    // content-length
    if (data && !req.getHeader('Content-Length')) {
      req.setHeader('Content-Length', Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data));
    }
  }

  // response
  // eslint-disable-next-line complexity
  req.once('response', res => {
    debug('%s %s -> %s', this.method, this.url, res.statusCode);
    if (this._responseTimeoutTimer) {
      clearTimeout(this._responseTimeoutTimer);
    }
    if (this.piped) {
      return;
    }
    const max = this._maxRedirects;
    const mime = utils.type(res.headers['content-type'] || '') || 'text/plain';
    let type = mime.split('/')[0];
    if (type) type = type.toLowerCase().trim();
    const multipart = type === 'multipart';
    const redirect = isRedirect(res.statusCode);
    const responseType = this._responseType;
    this.res = res;

    // redirect
    if (redirect && this._redirects++ !== max) {
      return this._redirect(res);
    }
    if (this.method === 'HEAD') {
      this.emit('end');
      this.callback(null, this._emitResponse());
      return;
    }

    // zlib support
    if (this._shouldDecompress(res)) {
      decompress(req, res);
    }
    let buffer = this._buffer;
    if (buffer === undefined && mime in exports.buffer) {
      buffer = Boolean(exports.buffer[mime]);
    }
    let parser = this._parser;
    if (undefined === buffer && parser) {
      console.warn("A custom superagent parser has been set, but buffering strategy for the parser hasn't been configured. Call `req.buffer(true or false)` or set `superagent.buffer[mime] = true or false`");
      buffer = true;
    }
    if (!parser) {
      if (responseType) {
        parser = exports.parse.image; // It's actually a generic Buffer
        buffer = true;
      } else if (multipart) {
        const form = formidable.formidable();
        parser = (res, callback) => {
          // Create a PassThrough stream that acts as a proper HTTP request
          const bridgeStream = new Stream.PassThrough();

          // Add HTTP request properties from the current request context
          bridgeStream.method = this.method || 'POST';
          bridgeStream.url = this.url || '/';
          bridgeStream.httpVersion = res.httpVersion || '1.1';
          bridgeStream.headers = res.headers || {};
          bridgeStream.socket = res.socket || {
            readable: true
          };

          // Pipe the response data through the bridge stream
          res.pipe(bridgeStream);
          form.parse(bridgeStream, (err, fields, files) => {
            if (err) return callback(err);

            // Formidable v3 always returns arrays, but SuperAgent expects single values
            // Flatten single-item arrays to maintain backward compatibility
            const flattenedFields = {};
            if (fields) {
              for (const key in fields) {
                const value = fields[key];
                flattenedFields[key] = Array.isArray(value) && value.length === 1 ? value[0] : value;
              }
            }
            const flattenedFiles = {};
            if (files) {
              for (const key in files) {
                const value = files[key];
                flattenedFiles[key] = Array.isArray(value) && value.length === 1 ? value[0] : value;
              }
            }

            // Return flattened fields as the object parameter to match SuperAgent's expected format
            callback(null, flattenedFields, flattenedFiles);
          });
        };
        buffer = true;
      } else if (isBinary(mime)) {
        parser = exports.parse.image;
        buffer = true; // For backwards-compatibility buffering default is ad-hoc MIME-dependent
      } else if (exports.parse[mime]) {
        parser = exports.parse[mime];
      } else if (type === 'text') {
        parser = exports.parse.text;
        buffer = buffer !== false;
        // everyone wants their own white-labeled json
      } else if (isJSON(mime)) {
        parser = exports.parse['application/json'];
        buffer = buffer !== false;
      } else if (buffer) {
        parser = exports.parse.text;
      } else if (undefined === buffer) {
        parser = exports.parse.image; // It's actually a generic Buffer
        buffer = true;
      }
    }

    // by default only buffer text/*, json and messed up thing from hell
    if (undefined === buffer && isText(mime) || isJSON(mime)) {
      buffer = true;
    }
    this._resBuffered = buffer;
    let parserHandlesEnd = false;
    if (buffer) {
      // Protectiona against zip bombs and other nuisance
      let responseBytesLeft = this._maxResponseSize || 200000000;
      res.on('data', buf => {
        responseBytesLeft -= buf.byteLength || buf.length > 0 ? buf.length : 0;
        if (responseBytesLeft < 0) {
          // This will propagate through error event
          const error = new Error('Maximum response size reached');
          error.code = 'ETOOLARGE';
          // Parsers aren't required to observe error event,
          // so would incorrectly report success
          parserHandlesEnd = false;
          // Will not emit error event
          res.destroy(error);
          // so we do callback now
          this.callback(error, null);
        }
      });
    }
    if (parser) {
      try {
        // Unbuffered parsers are supposed to emit response early,
        // which is weird BTW, because response.body won't be there.
        parserHandlesEnd = buffer;
        parser(res, (error, object, files) => {
          if (this.timedout) {
            // Timeout has already handled all callbacks
            return;
          }

          // Intentional (non-timeout) abort is supposed to preserve partial response,
          // even if it doesn't parse.
          if (error && !this._aborted) {
            return this.callback(error);
          }
          if (parserHandlesEnd) {
            this.emit('end');
            this.callback(null, this._emitResponse(object, files));
          }
        });
      } catch (err) {
        this.callback(err);
        return;
      }
    }
    this.res = res;

    // unbuffered
    if (!buffer) {
      debug('unbuffered %s %s', this.method, this.url);
      this.callback(null, this._emitResponse());
      if (multipart) return; // allow multipart to handle end event
      res.once('end', () => {
        debug('end %s %s', this.method, this.url);
        this.emit('end');
      });
      return;
    }

    // terminating events
    res.once('error', error => {
      parserHandlesEnd = false;
      this.callback(error, null);
    });
    if (!parserHandlesEnd) res.once('end', () => {
      debug('end %s %s', this.method, this.url);
      // TODO: unless buffering emit earlier to stream
      this.emit('end');
      this.callback(null, this._emitResponse());
    });
  });
  this.emit('request', this);
  const getProgressMonitor = () => {
    const lengthComputable = true;
    const total = req.getHeader('Content-Length');
    let loaded = 0;
    const progress = new Stream.Transform();
    progress._transform = (chunk, encoding, callback) => {
      loaded += chunk.length;
      this.emit('progress', {
        direction: 'upload',
        lengthComputable,
        loaded,
        total
      });
      callback(null, chunk);
    };
    return progress;
  };
  const bufferToChunks = buffer => {
    const chunkSize = 16 * 1024; // default highWaterMark value
    const chunking = new Stream.Readable();
    const totalLength = buffer.length;
    const remainder = totalLength % chunkSize;
    const cutoff = totalLength - remainder;
    for (let i = 0; i < cutoff; i += chunkSize) {
      const chunk = buffer.slice(i, i + chunkSize);
      chunking.push(chunk);
    }
    if (remainder > 0) {
      const remainderBuffer = buffer.slice(-remainder);
      chunking.push(remainderBuffer);
    }
    chunking.push(null); // no more data

    return chunking;
  };

  // if a FormData instance got created, then we send that as the request body
  const formData = this._formData;
  if (formData) {
    // set headers
    const headers = formData.getHeaders();
    for (const i in headers) {
      if (hasOwn(headers, i)) {
        debug('setting FormData header: "%s: %s"', i, headers[i]);
        req.setHeader(i, headers[i]);
      }
    }

    // attempt to get "Content-Length" header
    formData.getLength((error, length) => {
      // TODO: Add chunked encoding when no length (if err)
      if (error) debug('formData.getLength had error', error, length);
      debug('got FormData Content-Length: %s', length);
      if (typeof length === 'number') {
        req.setHeader('Content-Length', length);
      }
      formData.pipe(getProgressMonitor()).pipe(req);
    });
  } else if (Buffer.isBuffer(data)) {
    bufferToChunks(data).pipe(getProgressMonitor()).pipe(req);
  } else {
    req.end(data);
  }
};

// Check whether response has a non-0-sized gzip-encoded body
Request.prototype._shouldDecompress = res => {
  return hasNonEmptyResponseContent(res) && (isGzipOrDeflateEncoding(res) || isBrotliEncoding(res));
};

/**
 * Overrides DNS for selected hostnames. Takes object mapping hostnames to IP addresses.
 *
 * When making a request to a URL with a hostname exactly matching a key in the object,
 * use the given IP address to connect, instead of using DNS to resolve the hostname.
 *
 * A special host `*` matches every hostname (keep redirects in mind!)
 *
 *      request.connect({
 *        'test.example.com': '127.0.0.1',
 *        'ipv6.example.com': '::1',
 *      })
 */
Request.prototype.connect = function (connectOverride) {
  if (typeof connectOverride === 'string') {
    this._connectOverride = {
      '*': connectOverride
    };
  } else if (typeof connectOverride === 'object') {
    this._connectOverride = connectOverride;
  } else {
    this._connectOverride = undefined;
  }
  return this;
};
Request.prototype.trustLocalhost = function (toggle) {
  this._trustLocalhost = toggle === undefined ? true : toggle;
  return this;
};

// generate HTTP verb methods
if (!methods.includes('del')) {
  // create a copy so we don't cause conflicts with
  // other packages using the methods package and
  // npm 3.x
  methods = [...methods];
  methods.push('del');
}
for (let method of methods) {
  const name = method;
  method = method === 'del' ? 'delete' : method;
  method = method.toUpperCase();
  request[name] = (url, data, fn) => {
    const request_ = request(method, url);
    if (typeof data === 'function') {
      fn = data;
      data = null;
    }
    if (data) {
      if (method === 'GET' || method === 'HEAD') {
        request_.query(data);
      } else {
        request_.send(data);
      }
    }
    if (fn) request_.end(fn);
    return request_;
  };
}

/**
 * Check if `mime` is text and should be buffered.
 *
 * @param {String} mime
 * @return {Boolean}
 * @api public
 */

function isText(mime) {
  const parts = mime.split('/');
  let type = parts[0];
  if (type) type = type.toLowerCase().trim();
  let subtype = parts[1];
  if (subtype) subtype = subtype.toLowerCase().trim();
  return type === 'text' || subtype === 'x-www-form-urlencoded';
}

// This is not a catchall, but a start. It might be useful
// in the long run to have file that includes all binary
// content types from https://www.iana.org/assignments/media-types/media-types.xhtml
function isBinary(mime) {
  let [registry, name] = mime.split('/');
  if (registry) registry = registry.toLowerCase().trim();
  if (name) name = name.toLowerCase().trim();
  return ['audio', 'font', 'image', 'video'].includes(registry) || ['gz', 'gzip'].includes(name);
}

/**
 * Check if `mime` is json or has +json structured syntax suffix.
 *
 * @param {String} mime
 * @return {Boolean}
 * @api private
 */

function isJSON(mime) {
  // should match /json or +json
  // but not /json-seq
  return /[/+]json($|[^-\w])/i.test(mime);
}

/**
 * Check if we should follow the redirect `code`.
 *
 * @param {Number} code
 * @return {Boolean}
 * @api private
 */

function isRedirect(code) {
  return [301, 302, 303, 305, 307, 308].includes(code);
}
function hasNonEmptyResponseContent(res) {
  if (res.statusCode === 204 || res.statusCode === 304) {
    // These aren't supposed to have any body
    return false;
  }

  // header content is a string, and distinction between 0 and no information is crucial
  if (res.headers['content-length'] === '0') {
    // We know that the body is empty (unfortunately, this check does not cover chunked encoding)
    return false;
  }
  return true;
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6WyJmb3JtYXQiLCJyZXF1aXJlIiwiU3RyZWFtIiwiaHR0cHMiLCJodHRwIiwiZnMiLCJ6bGliIiwidXRpbCIsInFzIiwibWltZSIsIm1ldGhvZHMiLCJGb3JtRGF0YSIsImZvcm1pZGFibGUiLCJkZWJ1ZyIsIkNvb2tpZUphciIsInNhZmVTdHJpbmdpZnkiLCJ1dGlscyIsIlJlcXVlc3RCYXNlIiwiaHR0cDIiLCJkZWNvbXByZXNzIiwiUmVzcG9uc2UiLCJtaXhpbiIsImhhc093biIsImlzQnJvdGxpRW5jb2RpbmciLCJpc0d6aXBPckRlZmxhdGVFbmNvZGluZyIsImNob29zZURlY29tcHJlc3NlciIsInJlcXVlc3QiLCJtZXRob2QiLCJ1cmwiLCJleHBvcnRzIiwiUmVxdWVzdCIsImVuZCIsImFyZ3VtZW50cyIsImxlbmd0aCIsIm1vZHVsZSIsImFnZW50Iiwibm9vcCIsImRlZmluZSIsInByb3RvY29scyIsInNlcmlhbGl6ZSIsIm9iaiIsInN0cmluZ2lmeSIsImluZGljZXMiLCJzdHJpY3ROdWxsSGFuZGxpbmciLCJwYXJzZSIsImJ1ZmZlciIsIl9pbml0SGVhZGVycyIsInJlcXVlc3RfIiwiX2hlYWRlciIsImhlYWRlciIsImNhbGwiLCJfZW5hYmxlSHR0cDIiLCJCb29sZWFuIiwicHJvY2VzcyIsImVudiIsIkhUVFAyX1RFU1QiLCJfYWdlbnQiLCJfZm9ybURhdGEiLCJ3cml0YWJsZSIsIl9yZWRpcmVjdHMiLCJyZWRpcmVjdHMiLCJjb29raWVzIiwiX3F1ZXJ5IiwicXNSYXciLCJfcmVkaXJlY3RMaXN0IiwiX3N0cmVhbVJlcXVlc3QiLCJfbG9va3VwIiwidW5kZWZpbmVkIiwib25jZSIsImNsZWFyVGltZW91dCIsImJpbmQiLCJpbmhlcml0cyIsInByb3RvdHlwZSIsImJvb2wiLCJFcnJvciIsImF0dGFjaCIsImZpZWxkIiwiZmlsZSIsIm9wdGlvbnMiLCJfZGF0YSIsIm8iLCJmaWxlbmFtZSIsImNyZWF0ZVJlYWRTdHJlYW0iLCJvbiIsImVycm9yIiwiZm9ybURhdGEiLCJfZ2V0Rm9ybURhdGEiLCJlbWl0IiwicGF0aCIsImFwcGVuZCIsImNhbGxlZCIsImNhbGxiYWNrIiwiYWJvcnQiLCJsb29rdXAiLCJ0eXBlIiwic2V0IiwiaW5jbHVkZXMiLCJnZXRUeXBlIiwiYWNjZXB0IiwicXVlcnkiLCJ2YWx1ZSIsInB1c2giLCJPYmplY3QiLCJhc3NpZ24iLCJ3cml0ZSIsImRhdGEiLCJlbmNvZGluZyIsInBpcGUiLCJzdHJlYW0iLCJwaXBlZCIsIl9waXBlQ29udGludWUiLCJyZXEiLCJyZXMiLCJpc1JlZGlyZWN0Iiwic3RhdHVzQ29kZSIsIl9tYXhSZWRpcmVjdHMiLCJfcmVkaXJlY3QiLCJfZW1pdFJlc3BvbnNlIiwiX2Fib3J0ZWQiLCJfc2hvdWxkRGVjb21wcmVzcyIsImRlY29tcHJlc3NlciIsImNvZGUiLCJfYnVmZmVyIiwiaGVhZGVycyIsImxvY2F0aW9uIiwiVVJMIiwiaHJlZiIsInJlc3VtZSIsImdldEhlYWRlcnMiLCJfaGVhZGVycyIsImNoYW5nZXNPcmlnaW4iLCJob3N0IiwiY2xlYW5IZWFkZXIiLCJfZW5kQ2FsbGVkIiwiX2VtaXRSZWRpcmVjdCIsIl9jYWxsYmFjayIsImF1dGgiLCJ1c2VyIiwicGFzcyIsImVuY29kZXIiLCJzdHJpbmciLCJCdWZmZXIiLCJmcm9tIiwidG9TdHJpbmciLCJfYXV0aCIsImNhIiwiY2VydCIsIl9jYSIsImtleSIsIl9rZXkiLCJwZngiLCJpc0J1ZmZlciIsIl9wZngiLCJfcGFzc3BocmFzZSIsInBhc3NwaHJhc2UiLCJfY2VydCIsImRpc2FibGVUTFNDZXJ0cyIsIl9kaXNhYmxlVExTQ2VydHMiLCJfZmluYWxpemVRdWVyeVN0cmluZyIsImVyciIsInVybFN0cmluZyIsInJldHJpZXMiLCJfcmV0cmllcyIsImluZGV4T2YiLCJwcm90b2NvbCIsInBhdGhuYW1lIiwic2VhcmNoIiwidGVzdCIsInNwbGl0Iiwic29ja2V0UGF0aCIsImhvc3RuYW1lIiwicmVwbGFjZSIsIl9jb25uZWN0T3ZlcnJpZGUiLCJtYXRjaCIsIm5ld0hvc3QiLCJuZXdQb3J0IiwicG9ydCIsIm5vcm1hbGl6ZUhvc3RuYW1lIiwicmVqZWN0VW5hdXRob3JpemVkIiwiTk9ERV9UTFNfUkVKRUNUX1VOQVVUSE9SSVpFRCIsInNlcnZlcm5hbWUiLCJfdHJ1c3RMb2NhbGhvc3QiLCJtb2R1bGVfIiwic2V0UHJvdG9jb2wiLCJzZXROb0RlbGF5Iiwic2V0SGVhZGVyIiwicmVzcG9uc2UiLCJ1c2VybmFtZSIsInBhc3N3b3JkIiwidGVtcG9yYXJ5SmFyIiwic2V0Q29va2llcyIsImNvb2tpZSIsImdldENvb2tpZXMiLCJDb29raWVBY2Nlc3NJbmZvIiwiQWxsIiwidG9WYWx1ZVN0cmluZyIsIl9zaG91bGRSZXRyeSIsIl9yZXRyeSIsImZuIiwiY29uc29sZSIsIndhcm4iLCJfaXNSZXNwb25zZU9LIiwibWVzc2FnZSIsIlNUQVRVU19DT0RFUyIsInN0YXR1cyIsIl9tYXhSZXRyaWVzIiwibGlzdGVuZXJzIiwiX2lzSG9zdCIsIm9iamVjdCIsImJvZHkiLCJmaWxlcyIsIl9lbmQiLCJfc2V0VGltZW91dHMiLCJfaGVhZGVyU2VudCIsImNvbnRlbnRUeXBlIiwiZ2V0SGVhZGVyIiwiX3NlcmlhbGl6ZXIiLCJpc0pTT04iLCJieXRlTGVuZ3RoIiwiX3Jlc3BvbnNlVGltZW91dFRpbWVyIiwibWF4IiwidG9Mb3dlckNhc2UiLCJ0cmltIiwibXVsdGlwYXJ0IiwicmVkaXJlY3QiLCJyZXNwb25zZVR5cGUiLCJfcmVzcG9uc2VUeXBlIiwicGFyc2VyIiwiX3BhcnNlciIsImltYWdlIiwiZm9ybSIsImJyaWRnZVN0cmVhbSIsIlBhc3NUaHJvdWdoIiwiaHR0cFZlcnNpb24iLCJzb2NrZXQiLCJyZWFkYWJsZSIsImZpZWxkcyIsImZsYXR0ZW5lZEZpZWxkcyIsIkFycmF5IiwiaXNBcnJheSIsImZsYXR0ZW5lZEZpbGVzIiwiaXNCaW5hcnkiLCJ0ZXh0IiwiaXNUZXh0IiwiX3Jlc0J1ZmZlcmVkIiwicGFyc2VySGFuZGxlc0VuZCIsInJlc3BvbnNlQnl0ZXNMZWZ0IiwiX21heFJlc3BvbnNlU2l6ZSIsImJ1ZiIsImRlc3Ryb3kiLCJ0aW1lZG91dCIsImdldFByb2dyZXNzTW9uaXRvciIsImxlbmd0aENvbXB1dGFibGUiLCJ0b3RhbCIsImxvYWRlZCIsInByb2dyZXNzIiwiVHJhbnNmb3JtIiwiX3RyYW5zZm9ybSIsImNodW5rIiwiZGlyZWN0aW9uIiwiYnVmZmVyVG9DaHVua3MiLCJjaHVua1NpemUiLCJjaHVua2luZyIsIlJlYWRhYmxlIiwidG90YWxMZW5ndGgiLCJyZW1haW5kZXIiLCJjdXRvZmYiLCJpIiwic2xpY2UiLCJyZW1haW5kZXJCdWZmZXIiLCJnZXRMZW5ndGgiLCJoYXNOb25FbXB0eVJlc3BvbnNlQ29udGVudCIsImNvbm5lY3QiLCJjb25uZWN0T3ZlcnJpZGUiLCJ0cnVzdExvY2FsaG9zdCIsInRvZ2dsZSIsIm5hbWUiLCJ0b1VwcGVyQ2FzZSIsInNlbmQiLCJwYXJ0cyIsInN1YnR5cGUiLCJyZWdpc3RyeSJdLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9ub2RlL2luZGV4LmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xuXG5jb25zdCB7IGZvcm1hdCB9ID0gcmVxdWlyZSgndXJsJyk7XG5jb25zdCBTdHJlYW0gPSByZXF1aXJlKCdzdHJlYW0nKTtcbmNvbnN0IGh0dHBzID0gcmVxdWlyZSgnaHR0cHMnKTtcbmNvbnN0IGh0dHAgPSByZXF1aXJlKCdodHRwJyk7XG5jb25zdCBmcyA9IHJlcXVpcmUoJ2ZzJyk7XG5jb25zdCB6bGliID0gcmVxdWlyZSgnemxpYicpO1xuY29uc3QgdXRpbCA9IHJlcXVpcmUoJ3V0aWwnKTtcbmNvbnN0IHFzID0gcmVxdWlyZSgncXMnKTtcbmNvbnN0IG1pbWUgPSByZXF1aXJlKCdtaW1lJyk7XG5sZXQgbWV0aG9kcyA9IHJlcXVpcmUoJ21ldGhvZHMnKTtcbmNvbnN0IEZvcm1EYXRhID0gcmVxdWlyZSgnZm9ybS1kYXRhJyk7XG5jb25zdCBmb3JtaWRhYmxlID0gcmVxdWlyZSgnZm9ybWlkYWJsZScpO1xuY29uc3QgZGVidWcgPSByZXF1aXJlKCdkZWJ1ZycpKCdzdXBlcmFnZW50Jyk7XG5jb25zdCBDb29raWVKYXIgPSByZXF1aXJlKCdjb29raWVqYXInKTtcbmNvbnN0IHNhZmVTdHJpbmdpZnkgPSByZXF1aXJlKCdmYXN0LXNhZmUtc3RyaW5naWZ5Jyk7XG5cbmNvbnN0IHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMnKTtcbmNvbnN0IFJlcXVlc3RCYXNlID0gcmVxdWlyZSgnLi4vcmVxdWVzdC1iYXNlJyk7XG5jb25zdCBodHRwMiA9IHJlcXVpcmUoJy4vaHR0cDJ3cmFwcGVyJyk7XG5jb25zdCB7IGRlY29tcHJlc3MgfSA9IHJlcXVpcmUoJy4vdW56aXAnKTtcbmNvbnN0IFJlc3BvbnNlID0gcmVxdWlyZSgnLi9yZXNwb25zZScpO1xuXG5jb25zdCB7IG1peGluLCBoYXNPd24sIGlzQnJvdGxpRW5jb2RpbmcsIGlzR3ppcE9yRGVmbGF0ZUVuY29kaW5nIH0gPSB1dGlscztcbmNvbnN0IHsgY2hvb3NlRGVjb21wcmVzc2VyIH0gPSByZXF1aXJlKCcuL2RlY29tcHJlc3MnKTtcblxuZnVuY3Rpb24gcmVxdWVzdChtZXRob2QsIHVybCkge1xuICAvLyBjYWxsYmFja1xuICBpZiAodHlwZW9mIHVybCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiBuZXcgZXhwb3J0cy5SZXF1ZXN0KCdHRVQnLCBtZXRob2QpLmVuZCh1cmwpO1xuICB9XG5cbiAgLy8gdXJsIGZpcnN0XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgcmV0dXJuIG5ldyBleHBvcnRzLlJlcXVlc3QoJ0dFVCcsIG1ldGhvZCk7XG4gIH1cblxuICByZXR1cm4gbmV3IGV4cG9ydHMuUmVxdWVzdChtZXRob2QsIHVybCk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gcmVxdWVzdDtcbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cztcblxuLyoqXG4gKiBFeHBvc2UgYFJlcXVlc3RgLlxuICovXG5cbmV4cG9ydHMuUmVxdWVzdCA9IFJlcXVlc3Q7XG5cbi8qKlxuICogRXhwb3NlIHRoZSBhZ2VudCBmdW5jdGlvblxuICovXG5cbmV4cG9ydHMuYWdlbnQgPSByZXF1aXJlKCcuL2FnZW50Jyk7XG5cbi8qKlxuICogTm9vcC5cbiAqL1xuXG5mdW5jdGlvbiBub29wKCkge31cblxuLyoqXG4gKiBFeHBvc2UgYFJlc3BvbnNlYC5cbiAqL1xuXG5leHBvcnRzLlJlc3BvbnNlID0gUmVzcG9uc2U7XG5cbi8qKlxuICogRGVmaW5lIFwiZm9ybVwiIG1pbWUgdHlwZS5cbiAqL1xuXG5taW1lLmRlZmluZShcbiAge1xuICAgICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnOiBbJ2Zvcm0nLCAndXJsZW5jb2RlZCcsICdmb3JtLWRhdGEnXVxuICB9LFxuICB0cnVlXG4pO1xuXG4vKipcbiAqIFByb3RvY29sIG1hcC5cbiAqL1xuXG5leHBvcnRzLnByb3RvY29scyA9IHtcbiAgJ2h0dHA6JzogaHR0cCxcbiAgJ2h0dHBzOic6IGh0dHBzLFxuICAnaHR0cDI6JzogaHR0cDJcbn07XG5cbi8qKlxuICogRGVmYXVsdCBzZXJpYWxpemF0aW9uIG1hcC5cbiAqXG4gKiAgICAgc3VwZXJhZ2VudC5zZXJpYWxpemVbJ2FwcGxpY2F0aW9uL3htbCddID0gZnVuY3Rpb24ob2JqKXtcbiAqICAgICAgIHJldHVybiAnZ2VuZXJhdGVkIHhtbCBoZXJlJztcbiAqICAgICB9O1xuICpcbiAqL1xuXG5leHBvcnRzLnNlcmlhbGl6ZSA9IHtcbiAgJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZCc6IChvYmopID0+IHtcbiAgICByZXR1cm4gcXMuc3RyaW5naWZ5KG9iaiwgeyBpbmRpY2VzOiBmYWxzZSwgc3RyaWN0TnVsbEhhbmRsaW5nOiB0cnVlIH0pO1xuICB9LFxuICAnYXBwbGljYXRpb24vanNvbic6IHNhZmVTdHJpbmdpZnlcbn07XG5cbi8qKlxuICogRGVmYXVsdCBwYXJzZXJzLlxuICpcbiAqICAgICBzdXBlcmFnZW50LnBhcnNlWydhcHBsaWNhdGlvbi94bWwnXSA9IGZ1bmN0aW9uKHJlcywgZm4pe1xuICogICAgICAgZm4obnVsbCwgcmVzKTtcbiAqICAgICB9O1xuICpcbiAqL1xuXG5leHBvcnRzLnBhcnNlID0gcmVxdWlyZSgnLi9wYXJzZXJzJyk7XG5cbi8qKlxuICogRGVmYXVsdCBidWZmZXJpbmcgbWFwLiBDYW4gYmUgdXNlZCB0byBzZXQgY2VydGFpblxuICogcmVzcG9uc2UgdHlwZXMgdG8gYnVmZmVyL25vdCBidWZmZXIuXG4gKlxuICogICAgIHN1cGVyYWdlbnQuYnVmZmVyWydhcHBsaWNhdGlvbi94bWwnXSA9IHRydWU7XG4gKi9cbmV4cG9ydHMuYnVmZmVyID0ge307XG5cbi8qKlxuICogSW5pdGlhbGl6ZSBpbnRlcm5hbCBoZWFkZXIgdHJhY2tpbmcgcHJvcGVydGllcyBvbiBhIHJlcXVlc3QgaW5zdGFuY2UuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHJlcSB0aGUgaW5zdGFuY2VcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBfaW5pdEhlYWRlcnMocmVxdWVzdF8pIHtcbiAgcmVxdWVzdF8uX2hlYWRlciA9IHtcbiAgICAvLyBjb2VyY2VzIGhlYWRlciBuYW1lcyB0byBsb3dlcmNhc2VcbiAgfTtcbiAgcmVxdWVzdF8uaGVhZGVyID0ge1xuICAgIC8vIHByZXNlcnZlcyBoZWFkZXIgbmFtZSBjYXNlXG4gIH07XG59XG5cbi8qKlxuICogSW5pdGlhbGl6ZSBhIG5ldyBgUmVxdWVzdGAgd2l0aCB0aGUgZ2l2ZW4gYG1ldGhvZGAgYW5kIGB1cmxgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBtZXRob2RcbiAqIEBwYXJhbSB7U3RyaW5nfE9iamVjdH0gdXJsXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmZ1bmN0aW9uIFJlcXVlc3QobWV0aG9kLCB1cmwpIHtcbiAgU3RyZWFtLmNhbGwodGhpcyk7XG4gIGlmICh0eXBlb2YgdXJsICE9PSAnc3RyaW5nJykgdXJsID0gZm9ybWF0KHVybCk7XG4gIHRoaXMuX2VuYWJsZUh0dHAyID0gQm9vbGVhbihwcm9jZXNzLmVudi5IVFRQMl9URVNUKTsgLy8gaW50ZXJuYWwgb25seVxuICB0aGlzLl9hZ2VudCA9IGZhbHNlO1xuICB0aGlzLl9mb3JtRGF0YSA9IG51bGw7XG4gIHRoaXMubWV0aG9kID0gbWV0aG9kO1xuICB0aGlzLnVybCA9IHVybDtcbiAgX2luaXRIZWFkZXJzKHRoaXMpO1xuICB0aGlzLndyaXRhYmxlID0gdHJ1ZTtcbiAgdGhpcy5fcmVkaXJlY3RzID0gMDtcbiAgdGhpcy5yZWRpcmVjdHMobWV0aG9kID09PSAnSEVBRCcgPyAwIDogNSk7XG4gIHRoaXMuY29va2llcyA9ICcnO1xuICB0aGlzLnFzID0ge307XG4gIHRoaXMuX3F1ZXJ5ID0gW107XG4gIHRoaXMucXNSYXcgPSB0aGlzLl9xdWVyeTsgLy8gVW51c2VkLCBmb3IgYmFja3dhcmRzIGNvbXBhdGliaWxpdHkgb25seVxuICB0aGlzLl9yZWRpcmVjdExpc3QgPSBbXTtcbiAgdGhpcy5fc3RyZWFtUmVxdWVzdCA9IGZhbHNlO1xuICB0aGlzLl9sb29rdXAgPSB1bmRlZmluZWQ7XG4gIHRoaXMub25jZSgnZW5kJywgdGhpcy5jbGVhclRpbWVvdXQuYmluZCh0aGlzKSk7XG59XG5cbi8qKlxuICogSW5oZXJpdCBmcm9tIGBTdHJlYW1gICh3aGljaCBpbmhlcml0cyBmcm9tIGBFdmVudEVtaXR0ZXJgKS5cbiAqIE1peGluIGBSZXF1ZXN0QmFzZWAuXG4gKi9cbnV0aWwuaW5oZXJpdHMoUmVxdWVzdCwgU3RyZWFtKTtcblxubWl4aW4oUmVxdWVzdC5wcm90b3R5cGUsIFJlcXVlc3RCYXNlLnByb3RvdHlwZSk7XG5cbi8qKlxuICogRW5hYmxlIG9yIERpc2FibGUgaHR0cDIuXG4gKlxuICogRW5hYmxlIGh0dHAyLlxuICpcbiAqIGBgYCBqc1xuICogcmVxdWVzdC5nZXQoJ2h0dHA6Ly9sb2NhbGhvc3QvJylcbiAqICAgLmh0dHAyKClcbiAqICAgLmVuZChjYWxsYmFjayk7XG4gKlxuICogcmVxdWVzdC5nZXQoJ2h0dHA6Ly9sb2NhbGhvc3QvJylcbiAqICAgLmh0dHAyKHRydWUpXG4gKiAgIC5lbmQoY2FsbGJhY2spO1xuICogYGBgXG4gKlxuICogRGlzYWJsZSBodHRwMi5cbiAqXG4gKiBgYGAganNcbiAqIHJlcXVlc3QgPSByZXF1ZXN0Lmh0dHAyKCk7XG4gKiByZXF1ZXN0LmdldCgnaHR0cDovL2xvY2FsaG9zdC8nKVxuICogICAuaHR0cDIoZmFsc2UpXG4gKiAgIC5lbmQoY2FsbGJhY2spO1xuICogYGBgXG4gKlxuICogQHBhcmFtIHtCb29sZWFufSBlbmFibGVcbiAqIEByZXR1cm4ge1JlcXVlc3R9IGZvciBjaGFpbmluZ1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0LnByb3RvdHlwZS5odHRwMiA9IGZ1bmN0aW9uIChib29sKSB7XG4gIGlmIChleHBvcnRzLnByb3RvY29sc1snaHR0cDI6J10gPT09IHVuZGVmaW5lZCkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICdzdXBlcmFnZW50OiB0aGlzIHZlcnNpb24gb2YgTm9kZS5qcyBkb2VzIG5vdCBzdXBwb3J0IGh0dHAyJ1xuICAgICk7XG4gIH1cblxuICB0aGlzLl9lbmFibGVIdHRwMiA9IGJvb2wgPT09IHVuZGVmaW5lZCA/IHRydWUgOiBib29sO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUXVldWUgdGhlIGdpdmVuIGBmaWxlYCBhcyBhbiBhdHRhY2htZW50IHRvIHRoZSBzcGVjaWZpZWQgYGZpZWxkYCxcbiAqIHdpdGggb3B0aW9uYWwgYG9wdGlvbnNgIChvciBmaWxlbmFtZSkuXG4gKlxuICogYGBgIGpzXG4gKiByZXF1ZXN0LnBvc3QoJ2h0dHA6Ly9sb2NhbGhvc3QvdXBsb2FkJylcbiAqICAgLmF0dGFjaCgnZmllbGQnLCBCdWZmZXIuZnJvbSgnPGI+SGVsbG8gd29ybGQ8L2I+JyksICdoZWxsby5odG1sJylcbiAqICAgLmVuZChjYWxsYmFjayk7XG4gKiBgYGBcbiAqXG4gKiBBIGZpbGVuYW1lIG1heSBhbHNvIGJlIHVzZWQ6XG4gKlxuICogYGBgIGpzXG4gKiByZXF1ZXN0LnBvc3QoJ2h0dHA6Ly9sb2NhbGhvc3QvdXBsb2FkJylcbiAqICAgLmF0dGFjaCgnZmlsZXMnLCAnaW1hZ2UuanBnJylcbiAqICAgLmVuZChjYWxsYmFjayk7XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZmllbGRcbiAqIEBwYXJhbSB7U3RyaW5nfGZzLlJlYWRTdHJlYW18QnVmZmVyfSBmaWxlXG4gKiBAcGFyYW0ge1N0cmluZ3xPYmplY3R9IG9wdGlvbnNcbiAqIEByZXR1cm4ge1JlcXVlc3R9IGZvciBjaGFpbmluZ1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0LnByb3RvdHlwZS5hdHRhY2ggPSBmdW5jdGlvbiAoZmllbGQsIGZpbGUsIG9wdGlvbnMpIHtcbiAgaWYgKGZpbGUpIHtcbiAgICBpZiAodGhpcy5fZGF0YSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwic3VwZXJhZ2VudCBjYW4ndCBtaXggLnNlbmQoKSBhbmQgLmF0dGFjaCgpXCIpO1xuICAgIH1cblxuICAgIGxldCBvID0gb3B0aW9ucyB8fCB7fTtcbiAgICBpZiAodHlwZW9mIG9wdGlvbnMgPT09ICdzdHJpbmcnKSB7XG4gICAgICBvID0geyBmaWxlbmFtZTogb3B0aW9ucyB9O1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgZmlsZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGlmICghby5maWxlbmFtZSkgby5maWxlbmFtZSA9IGZpbGU7XG4gICAgICBkZWJ1ZygnY3JlYXRpbmcgYGZzLlJlYWRTdHJlYW1gIGluc3RhbmNlIGZvciBmaWxlOiAlcycsIGZpbGUpO1xuICAgICAgZmlsZSA9IGZzLmNyZWF0ZVJlYWRTdHJlYW0oZmlsZSk7XG4gICAgICBmaWxlLm9uKCdlcnJvcicsIChlcnJvcikgPT4ge1xuICAgICAgICBjb25zdCBmb3JtRGF0YSA9IHRoaXMuX2dldEZvcm1EYXRhKCk7XG4gICAgICAgIGZvcm1EYXRhLmVtaXQoJ2Vycm9yJywgZXJyb3IpO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIGlmICghby5maWxlbmFtZSAmJiBmaWxlLnBhdGgpIHtcbiAgICAgIG8uZmlsZW5hbWUgPSBmaWxlLnBhdGg7XG4gICAgfVxuXG4gICAgdGhpcy5fZ2V0Rm9ybURhdGEoKS5hcHBlbmQoZmllbGQsIGZpbGUsIG8pO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5SZXF1ZXN0LnByb3RvdHlwZS5fZ2V0Rm9ybURhdGEgPSBmdW5jdGlvbiAoKSB7XG4gIGlmICghdGhpcy5fZm9ybURhdGEpIHtcbiAgICB0aGlzLl9mb3JtRGF0YSA9IG5ldyBGb3JtRGF0YSgpO1xuICAgIHRoaXMuX2Zvcm1EYXRhLm9uKCdlcnJvcicsIChlcnJvcikgPT4ge1xuICAgICAgZGVidWcoJ0Zvcm1EYXRhIGVycm9yJywgZXJyb3IpO1xuICAgICAgaWYgKHRoaXMuY2FsbGVkKSB7XG4gICAgICAgIC8vIFRoZSByZXF1ZXN0IGhhcyBhbHJlYWR5IGZpbmlzaGVkIGFuZCB0aGUgY2FsbGJhY2sgd2FzIGNhbGxlZC5cbiAgICAgICAgLy8gU2lsZW50bHkgaWdub3JlIHRoZSBlcnJvci5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB0aGlzLmNhbGxiYWNrKGVycm9yKTtcbiAgICAgIHRoaXMuYWJvcnQoKTtcbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiB0aGlzLl9mb3JtRGF0YTtcbn07XG5cbi8qKlxuICogR2V0cy9zZXRzIHRoZSBgQWdlbnRgIHRvIHVzZSBmb3IgdGhpcyBIVFRQIHJlcXVlc3QuIFRoZSBkZWZhdWx0IChpZiB0aGlzXG4gKiBmdW5jdGlvbiBpcyBub3QgY2FsbGVkKSBpcyB0byBvcHQgb3V0IG9mIGNvbm5lY3Rpb24gcG9vbGluZyAoYGFnZW50OiBmYWxzZWApLlxuICpcbiAqIEBwYXJhbSB7aHR0cC5BZ2VudH0gYWdlbnRcbiAqIEByZXR1cm4ge2h0dHAuQWdlbnR9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlcXVlc3QucHJvdG90eXBlLmFnZW50ID0gZnVuY3Rpb24gKGFnZW50KSB7XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSByZXR1cm4gdGhpcy5fYWdlbnQ7XG4gIHRoaXMuX2FnZW50ID0gYWdlbnQ7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBHZXRzL3NldHMgdGhlIGBsb29rdXBgIGZ1bmN0aW9uIHRvIHVzZSBjdXN0b20gRE5TIHJlc29sdmVyLlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGxvb2t1cFxuICogQHJldHVybiB7RnVuY3Rpb259XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlcXVlc3QucHJvdG90eXBlLmxvb2t1cCA9IGZ1bmN0aW9uIChsb29rdXApIHtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHJldHVybiB0aGlzLl9sb29rdXA7XG4gIHRoaXMuX2xvb2t1cCA9IGxvb2t1cDtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFNldCBfQ29udGVudC1UeXBlXyByZXNwb25zZSBoZWFkZXIgcGFzc2VkIHRocm91Z2ggYG1pbWUuZ2V0VHlwZSgpYC5cbiAqXG4gKiBFeGFtcGxlczpcbiAqXG4gKiAgICAgIHJlcXVlc3QucG9zdCgnLycpXG4gKiAgICAgICAgLnR5cGUoJ3htbCcpXG4gKiAgICAgICAgLnNlbmQoeG1sc3RyaW5nKVxuICogICAgICAgIC5lbmQoY2FsbGJhY2spO1xuICpcbiAqICAgICAgcmVxdWVzdC5wb3N0KCcvJylcbiAqICAgICAgICAudHlwZSgnanNvbicpXG4gKiAgICAgICAgLnNlbmQoanNvbnN0cmluZylcbiAqICAgICAgICAuZW5kKGNhbGxiYWNrKTtcbiAqXG4gKiAgICAgIHJlcXVlc3QucG9zdCgnLycpXG4gKiAgICAgICAgLnR5cGUoJ2FwcGxpY2F0aW9uL2pzb24nKVxuICogICAgICAgIC5zZW5kKGpzb25zdHJpbmcpXG4gKiAgICAgICAgLmVuZChjYWxsYmFjayk7XG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHR5cGVcbiAqIEByZXR1cm4ge1JlcXVlc3R9IGZvciBjaGFpbmluZ1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0LnByb3RvdHlwZS50eXBlID0gZnVuY3Rpb24gKHR5cGUpIHtcbiAgcmV0dXJuIHRoaXMuc2V0KFxuICAgICdDb250ZW50LVR5cGUnLFxuICAgIHR5cGUuaW5jbHVkZXMoJy8nKSA/IHR5cGUgOiBtaW1lLmdldFR5cGUodHlwZSlcbiAgKTtcbn07XG5cbi8qKlxuICogU2V0IF9BY2NlcHRfIHJlc3BvbnNlIGhlYWRlciBwYXNzZWQgdGhyb3VnaCBgbWltZS5nZXRUeXBlKClgLlxuICpcbiAqIEV4YW1wbGVzOlxuICpcbiAqICAgICAgc3VwZXJhZ2VudC50eXBlcy5qc29uID0gJ2FwcGxpY2F0aW9uL2pzb24nO1xuICpcbiAqICAgICAgcmVxdWVzdC5nZXQoJy9hZ2VudCcpXG4gKiAgICAgICAgLmFjY2VwdCgnanNvbicpXG4gKiAgICAgICAgLmVuZChjYWxsYmFjayk7XG4gKlxuICogICAgICByZXF1ZXN0LmdldCgnL2FnZW50JylcbiAqICAgICAgICAuYWNjZXB0KCdhcHBsaWNhdGlvbi9qc29uJylcbiAqICAgICAgICAuZW5kKGNhbGxiYWNrKTtcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gYWNjZXB0XG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdC5wcm90b3R5cGUuYWNjZXB0ID0gZnVuY3Rpb24gKHR5cGUpIHtcbiAgcmV0dXJuIHRoaXMuc2V0KCdBY2NlcHQnLCB0eXBlLmluY2x1ZGVzKCcvJykgPyB0eXBlIDogbWltZS5nZXRUeXBlKHR5cGUpKTtcbn07XG5cbi8qKlxuICogQWRkIHF1ZXJ5LXN0cmluZyBgdmFsYC5cbiAqXG4gKiBFeGFtcGxlczpcbiAqXG4gKiAgIHJlcXVlc3QuZ2V0KCcvc2hvZXMnKVxuICogICAgIC5xdWVyeSgnc2l6ZT0xMCcpXG4gKiAgICAgLnF1ZXJ5KHsgY29sb3I6ICdibHVlJyB9KVxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fFN0cmluZ30gdmFsXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdC5wcm90b3R5cGUucXVlcnkgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICB0aGlzLl9xdWVyeS5wdXNoKHZhbHVlKTtcbiAgfSBlbHNlIHtcbiAgICBPYmplY3QuYXNzaWduKHRoaXMucXMsIHZhbHVlKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBXcml0ZSByYXcgYGRhdGFgIC8gYGVuY29kaW5nYCB0byB0aGUgc29ja2V0LlxuICpcbiAqIEBwYXJhbSB7QnVmZmVyfFN0cmluZ30gZGF0YVxuICogQHBhcmFtIHtTdHJpbmd9IGVuY29kaW5nXG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0LnByb3RvdHlwZS53cml0ZSA9IGZ1bmN0aW9uIChkYXRhLCBlbmNvZGluZykge1xuICBjb25zdCByZXF1ZXN0XyA9IHRoaXMucmVxdWVzdCgpO1xuICBpZiAoIXRoaXMuX3N0cmVhbVJlcXVlc3QpIHtcbiAgICB0aGlzLl9zdHJlYW1SZXF1ZXN0ID0gdHJ1ZTtcbiAgfVxuXG4gIHJldHVybiByZXF1ZXN0Xy53cml0ZShkYXRhLCBlbmNvZGluZyk7XG59O1xuXG4vKipcbiAqIFBpcGUgdGhlIHJlcXVlc3QgYm9keSB0byBgc3RyZWFtYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmVhbX0gc3RyZWFtXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICogQHJldHVybiB7U3RyZWFtfVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0LnByb3RvdHlwZS5waXBlID0gZnVuY3Rpb24gKHN0cmVhbSwgb3B0aW9ucykge1xuICB0aGlzLnBpcGVkID0gdHJ1ZTsgLy8gSEFDSy4uLlxuICB0aGlzLmJ1ZmZlcihmYWxzZSk7XG4gIHRoaXMuZW5kKCk7XG4gIHJldHVybiB0aGlzLl9waXBlQ29udGludWUoc3RyZWFtLCBvcHRpb25zKTtcbn07XG5cblJlcXVlc3QucHJvdG90eXBlLl9waXBlQ29udGludWUgPSBmdW5jdGlvbiAoc3RyZWFtLCBvcHRpb25zKSB7XG4gIHRoaXMucmVxLm9uY2UoJ3Jlc3BvbnNlJywgKHJlcykgPT4ge1xuICAgIC8vIHJlZGlyZWN0XG4gICAgaWYgKFxuICAgICAgaXNSZWRpcmVjdChyZXMuc3RhdHVzQ29kZSkgJiZcbiAgICAgIHRoaXMuX3JlZGlyZWN0cysrICE9PSB0aGlzLl9tYXhSZWRpcmVjdHNcbiAgICApIHtcbiAgICAgIHJldHVybiB0aGlzLl9yZWRpcmVjdChyZXMpID09PSB0aGlzXG4gICAgICAgID8gdGhpcy5fcGlwZUNvbnRpbnVlKHN0cmVhbSwgb3B0aW9ucylcbiAgICAgICAgOiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgdGhpcy5yZXMgPSByZXM7XG4gICAgdGhpcy5fZW1pdFJlc3BvbnNlKCk7XG4gICAgaWYgKHRoaXMuX2Fib3J0ZWQpIHJldHVybjtcblxuICAgIGlmICh0aGlzLl9zaG91bGREZWNvbXByZXNzKHJlcykpIHtcblxuICAgICAgbGV0IGRlY29tcHJlc3NlciA9IGNob29zZURlY29tcHJlc3NlcihyZXMpO1xuXG4gICAgICBkZWNvbXByZXNzZXIub24oJ2Vycm9yJywgKGVycm9yKSA9PiB7XG4gICAgICAgIGlmIChlcnJvciAmJiBlcnJvci5jb2RlID09PSAnWl9CVUZfRVJST1InKSB7XG4gICAgICAgICAgLy8gdW5leHBlY3RlZCBlbmQgb2YgZmlsZSBpcyBpZ25vcmVkIGJ5IGJyb3dzZXJzIGFuZCBjdXJsXG4gICAgICAgICAgc3RyZWFtLmVtaXQoJ2VuZCcpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHN0cmVhbS5lbWl0KCdlcnJvcicsIGVycm9yKTtcbiAgICAgIH0pO1xuICAgICAgcmVzLnBpcGUoZGVjb21wcmVzc2VyKS5waXBlKHN0cmVhbSwgb3B0aW9ucyk7XG4gICAgICAvLyBkb24ndCBlbWl0ICdlbmQnIHVudGlsIGRlY29tcHJlc3NlciBoYXMgY29tcGxldGVkIHdyaXRpbmcgYWxsIGl0cyBkYXRhLlxuICAgICAgZGVjb21wcmVzc2VyLm9uY2UoJ2VuZCcsICgpID0+IHRoaXMuZW1pdCgnZW5kJykpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXMucGlwZShzdHJlYW0sIG9wdGlvbnMpO1xuICAgICAgcmVzLm9uY2UoJ2VuZCcsICgpID0+IHRoaXMuZW1pdCgnZW5kJykpO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBzdHJlYW07XG59O1xuXG4vKipcbiAqIEVuYWJsZSAvIGRpc2FibGUgYnVmZmVyaW5nLlxuICpcbiAqIEByZXR1cm4ge0Jvb2xlYW59IFt2YWxdXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdC5wcm90b3R5cGUuYnVmZmVyID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gIHRoaXMuX2J1ZmZlciA9IHZhbHVlICE9PSBmYWxzZTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJlZGlyZWN0IHRvIGB1cmxcbiAqXG4gKiBAcGFyYW0ge0luY29taW5nTWVzc2FnZX0gcmVzXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cblJlcXVlc3QucHJvdG90eXBlLl9yZWRpcmVjdCA9IGZ1bmN0aW9uIChyZXMpIHtcbiAgbGV0IHVybCA9IHJlcy5oZWFkZXJzLmxvY2F0aW9uO1xuICBpZiAoIXVybCkge1xuICAgIHJldHVybiB0aGlzLmNhbGxiYWNrKG5ldyBFcnJvcignTm8gbG9jYXRpb24gaGVhZGVyIGZvciByZWRpcmVjdCcpLCByZXMpO1xuICB9XG5cbiAgZGVidWcoJ3JlZGlyZWN0ICVzIC0+ICVzJywgdGhpcy51cmwsIHVybCk7XG5cbiAgLy8gbG9jYXRpb25cbiAgdXJsID0gbmV3IFVSTCh1cmwsIHRoaXMudXJsKS5ocmVmO1xuXG4gIC8vIGVuc3VyZSB0aGUgcmVzcG9uc2UgaXMgYmVpbmcgY29uc3VtZWRcbiAgLy8gdGhpcyBpcyByZXF1aXJlZCBmb3IgTm9kZSB2MC4xMCtcbiAgcmVzLnJlc3VtZSgpO1xuXG4gIGxldCBoZWFkZXJzID0gdGhpcy5yZXEuZ2V0SGVhZGVycyA/IHRoaXMucmVxLmdldEhlYWRlcnMoKSA6IHRoaXMucmVxLl9oZWFkZXJzO1xuXG4gIGNvbnN0IGNoYW5nZXNPcmlnaW4gPSBuZXcgVVJMKHVybCkuaG9zdCAhPT0gbmV3IFVSTCh0aGlzLnVybCkuaG9zdDtcblxuICAvLyBpbXBsZW1lbnRhdGlvbiBvZiAzMDIgZm9sbG93aW5nIGRlZmFjdG8gc3RhbmRhcmRcbiAgaWYgKHJlcy5zdGF0dXNDb2RlID09PSAzMDEgfHwgcmVzLnN0YXR1c0NvZGUgPT09IDMwMikge1xuICAgIC8vIHN0cmlwIENvbnRlbnQtKiByZWxhdGVkIGZpZWxkc1xuICAgIC8vIGluIGNhc2Ugb2YgUE9TVCBldGNcbiAgICBoZWFkZXJzID0gdXRpbHMuY2xlYW5IZWFkZXIoaGVhZGVycywgY2hhbmdlc09yaWdpbik7XG5cbiAgICAvLyBmb3JjZSBHRVRcbiAgICB0aGlzLm1ldGhvZCA9IHRoaXMubWV0aG9kID09PSAnSEVBRCcgPyAnSEVBRCcgOiAnR0VUJztcblxuICAgIC8vIGNsZWFyIGRhdGFcbiAgICB0aGlzLl9kYXRhID0gbnVsbDtcbiAgfVxuXG4gIC8vIDMwMyBpcyBhbHdheXMgR0VUXG4gIGlmIChyZXMuc3RhdHVzQ29kZSA9PT0gMzAzKSB7XG4gICAgLy8gc3RyaXAgQ29udGVudC0qIHJlbGF0ZWQgZmllbGRzXG4gICAgLy8gaW4gY2FzZSBvZiBQT1NUIGV0Y1xuICAgIGhlYWRlcnMgPSB1dGlscy5jbGVhbkhlYWRlcihoZWFkZXJzLCBjaGFuZ2VzT3JpZ2luKTtcblxuICAgIC8vIGZvcmNlIG1ldGhvZFxuICAgIHRoaXMubWV0aG9kID0gJ0dFVCc7XG5cbiAgICAvLyBjbGVhciBkYXRhXG4gICAgdGhpcy5fZGF0YSA9IG51bGw7XG4gIH1cblxuICAvLyAzMDcgcHJlc2VydmVzIG1ldGhvZFxuICAvLyAzMDggcHJlc2VydmVzIG1ldGhvZFxuICBkZWxldGUgaGVhZGVycy5ob3N0O1xuXG4gIGRlbGV0ZSB0aGlzLnJlcTtcbiAgZGVsZXRlIHRoaXMuX2Zvcm1EYXRhO1xuXG4gIC8vIHJlbW92ZSBhbGwgYWRkIGhlYWRlciBleGNlcHQgVXNlci1BZ2VudFxuICBfaW5pdEhlYWRlcnModGhpcyk7XG5cbiAgLy8gcmVkaXJlY3RcbiAgdGhpcy5yZXMgPSByZXM7XG4gIHRoaXMuX2VuZENhbGxlZCA9IGZhbHNlO1xuICB0aGlzLnVybCA9IHVybDtcbiAgdGhpcy5xcyA9IHt9O1xuICB0aGlzLl9xdWVyeS5sZW5ndGggPSAwO1xuICB0aGlzLnNldChoZWFkZXJzKTtcbiAgdGhpcy5fZW1pdFJlZGlyZWN0KCk7XG4gIHRoaXMuX3JlZGlyZWN0TGlzdC5wdXNoKHRoaXMudXJsKTtcbiAgdGhpcy5lbmQodGhpcy5fY2FsbGJhY2spO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogU2V0IEF1dGhvcml6YXRpb24gZmllbGQgdmFsdWUgd2l0aCBgdXNlcmAgYW5kIGBwYXNzYC5cbiAqXG4gKiBFeGFtcGxlczpcbiAqXG4gKiAgIC5hdXRoKCd0b2JpJywgJ2xlYXJuYm9vc3QnKVxuICogICAuYXV0aCgndG9iaTpsZWFybmJvb3N0JylcbiAqICAgLmF1dGgoJ3RvYmknKVxuICogICAuYXV0aChhY2Nlc3NUb2tlbiwgeyB0eXBlOiAnYmVhcmVyJyB9KVxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB1c2VyXG4gKiBAcGFyYW0ge1N0cmluZ30gW3Bhc3NdXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIG9wdGlvbnMgd2l0aCBhdXRob3JpemF0aW9uIHR5cGUgJ2Jhc2ljJyBvciAnYmVhcmVyJyAoJ2Jhc2ljJyBpcyBkZWZhdWx0KVxuICogQHJldHVybiB7UmVxdWVzdH0gZm9yIGNoYWluaW5nXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlcXVlc3QucHJvdG90eXBlLmF1dGggPSBmdW5jdGlvbiAodXNlciwgcGFzcywgb3B0aW9ucykge1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSkgcGFzcyA9ICcnO1xuICBpZiAodHlwZW9mIHBhc3MgPT09ICdvYmplY3QnICYmIHBhc3MgIT09IG51bGwpIHtcbiAgICAvLyBwYXNzIGlzIG9wdGlvbmFsIGFuZCBjYW4gYmUgcmVwbGFjZWQgd2l0aCBvcHRpb25zXG4gICAgb3B0aW9ucyA9IHBhc3M7XG4gICAgcGFzcyA9ICcnO1xuICB9XG5cbiAgaWYgKCFvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IHsgdHlwZTogJ2Jhc2ljJyB9O1xuICB9XG5cbiAgY29uc3QgZW5jb2RlciA9IChzdHJpbmcpID0+IEJ1ZmZlci5mcm9tKHN0cmluZykudG9TdHJpbmcoJ2Jhc2U2NCcpO1xuXG4gIHJldHVybiB0aGlzLl9hdXRoKHVzZXIsIHBhc3MsIG9wdGlvbnMsIGVuY29kZXIpO1xufTtcblxuLyoqXG4gKiBTZXQgdGhlIGNlcnRpZmljYXRlIGF1dGhvcml0eSBvcHRpb24gZm9yIGh0dHBzIHJlcXVlc3QuXG4gKlxuICogQHBhcmFtIHtCdWZmZXIgfCBBcnJheX0gY2VydFxuICogQHJldHVybiB7UmVxdWVzdH0gZm9yIGNoYWluaW5nXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlcXVlc3QucHJvdG90eXBlLmNhID0gZnVuY3Rpb24gKGNlcnQpIHtcbiAgdGhpcy5fY2EgPSBjZXJ0O1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogU2V0IHRoZSBjbGllbnQgY2VydGlmaWNhdGUga2V5IG9wdGlvbiBmb3IgaHR0cHMgcmVxdWVzdC5cbiAqXG4gKiBAcGFyYW0ge0J1ZmZlciB8IFN0cmluZ30gY2VydFxuICogQHJldHVybiB7UmVxdWVzdH0gZm9yIGNoYWluaW5nXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlcXVlc3QucHJvdG90eXBlLmtleSA9IGZ1bmN0aW9uIChjZXJ0KSB7XG4gIHRoaXMuX2tleSA9IGNlcnQ7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBTZXQgdGhlIGtleSwgY2VydGlmaWNhdGUsIGFuZCBDQSBjZXJ0cyBvZiB0aGUgY2xpZW50IGluIFBGWCBvciBQS0NTMTIgZm9ybWF0LlxuICpcbiAqIEBwYXJhbSB7QnVmZmVyIHwgU3RyaW5nfSBjZXJ0XG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdC5wcm90b3R5cGUucGZ4ID0gZnVuY3Rpb24gKGNlcnQpIHtcbiAgaWYgKHR5cGVvZiBjZXJ0ID09PSAnb2JqZWN0JyAmJiAhQnVmZmVyLmlzQnVmZmVyKGNlcnQpKSB7XG4gICAgdGhpcy5fcGZ4ID0gY2VydC5wZng7XG4gICAgdGhpcy5fcGFzc3BocmFzZSA9IGNlcnQucGFzc3BocmFzZTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLl9wZnggPSBjZXJ0O1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFNldCB0aGUgY2xpZW50IGNlcnRpZmljYXRlIG9wdGlvbiBmb3IgaHR0cHMgcmVxdWVzdC5cbiAqXG4gKiBAcGFyYW0ge0J1ZmZlciB8IFN0cmluZ30gY2VydFxuICogQHJldHVybiB7UmVxdWVzdH0gZm9yIGNoYWluaW5nXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlcXVlc3QucHJvdG90eXBlLmNlcnQgPSBmdW5jdGlvbiAoY2VydCkge1xuICB0aGlzLl9jZXJ0ID0gY2VydDtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIERvIG5vdCByZWplY3QgZXhwaXJlZCBvciBpbnZhbGlkIFRMUyBjZXJ0cy5cbiAqIHNldHMgYHJlamVjdFVuYXV0aG9yaXplZD10cnVlYC4gQmUgd2FybmVkIHRoYXQgdGhpcyBhbGxvd3MgTUlUTSBhdHRhY2tzLlxuICpcbiAqIEByZXR1cm4ge1JlcXVlc3R9IGZvciBjaGFpbmluZ1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0LnByb3RvdHlwZS5kaXNhYmxlVExTQ2VydHMgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMuX2Rpc2FibGVUTFNDZXJ0cyA9IHRydWU7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZXR1cm4gYW4gaHR0cFtzXSByZXF1ZXN0LlxuICpcbiAqIEByZXR1cm4ge091dGdvaW5nTWVzc2FnZX1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbi8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBjb21wbGV4aXR5XG5SZXF1ZXN0LnByb3RvdHlwZS5yZXF1ZXN0ID0gZnVuY3Rpb24gKCkge1xuICBpZiAodGhpcy5yZXEpIHJldHVybiB0aGlzLnJlcTtcblxuICBjb25zdCBvcHRpb25zID0ge307XG5cbiAgdHJ5IHtcbiAgICBjb25zdCBxdWVyeSA9IHFzLnN0cmluZ2lmeSh0aGlzLnFzLCB7XG4gICAgICBpbmRpY2VzOiBmYWxzZSxcbiAgICAgIHN0cmljdE51bGxIYW5kbGluZzogdHJ1ZVxuICAgIH0pO1xuICAgIGlmIChxdWVyeSkge1xuICAgICAgdGhpcy5xcyA9IHt9O1xuICAgICAgdGhpcy5fcXVlcnkucHVzaChxdWVyeSk7XG4gICAgfVxuXG4gICAgdGhpcy5fZmluYWxpemVRdWVyeVN0cmluZygpO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICByZXR1cm4gdGhpcy5lbWl0KCdlcnJvcicsIGVycik7XG4gIH1cblxuICBsZXQgeyB1cmw6IHVybFN0cmluZyB9ID0gdGhpcztcbiAgY29uc3QgcmV0cmllcyA9IHRoaXMuX3JldHJpZXM7XG5cbiAgLy8gZGVmYXVsdCB0byBodHRwOi8vXG4gIGlmICh1cmxTdHJpbmcuaW5kZXhPZignaHR0cCcpICE9PSAwKSB1cmxTdHJpbmcgPSBgaHR0cDovLyR7dXJsU3RyaW5nfWA7XG4gIGNvbnN0IHVybCA9IG5ldyBVUkwodXJsU3RyaW5nKTtcbiAgbGV0IHsgcHJvdG9jb2wgfSA9IHVybDtcbiAgbGV0IHBhdGggPSBgJHt1cmwucGF0aG5hbWV9JHt1cmwuc2VhcmNofWA7XG5cbiAgLy8gc3VwcG9ydCB1bml4IHNvY2tldHNcbiAgaWYgKC9eaHR0cHM/XFwrdW5peDovLnRlc3QocHJvdG9jb2wpID09PSB0cnVlKSB7XG4gICAgLy8gZ2V0IHRoZSBwcm90b2NvbFxuICAgIHByb3RvY29sID0gYCR7cHJvdG9jb2wuc3BsaXQoJysnKVswXX06YDtcblxuICAgIC8vIGdldCB0aGUgc29ja2V0IHBhdGhcbiAgICBvcHRpb25zLnNvY2tldFBhdGggPSB1cmwuaG9zdG5hbWUucmVwbGFjZSgvJTJGL2csICcvJyk7XG4gICAgdXJsLmhvc3QgPSAnJztcbiAgICB1cmwuaG9zdG5hbWUgPSAnJztcbiAgfVxuXG4gIC8vIE92ZXJyaWRlIElQIGFkZHJlc3Mgb2YgYSBob3N0bmFtZVxuICBpZiAodGhpcy5fY29ubmVjdE92ZXJyaWRlKSB7XG4gICAgY29uc3QgeyBob3N0bmFtZSB9ID0gdXJsO1xuICAgIGNvbnN0IG1hdGNoID1cbiAgICAgIGhvc3RuYW1lIGluIHRoaXMuX2Nvbm5lY3RPdmVycmlkZVxuICAgICAgICA/IHRoaXMuX2Nvbm5lY3RPdmVycmlkZVtob3N0bmFtZV1cbiAgICAgICAgOiB0aGlzLl9jb25uZWN0T3ZlcnJpZGVbJyonXTtcbiAgICBpZiAobWF0Y2gpIHtcbiAgICAgIC8vIGJhY2t1cCB0aGUgcmVhbCBob3N0XG4gICAgICBpZiAoIXRoaXMuX2hlYWRlci5ob3N0KSB7XG4gICAgICAgIHRoaXMuc2V0KCdob3N0JywgdXJsLmhvc3QpO1xuICAgICAgfVxuXG4gICAgICBsZXQgbmV3SG9zdDtcbiAgICAgIGxldCBuZXdQb3J0O1xuXG4gICAgICBpZiAodHlwZW9mIG1hdGNoID09PSAnb2JqZWN0Jykge1xuICAgICAgICBuZXdIb3N0ID0gbWF0Y2guaG9zdDtcbiAgICAgICAgbmV3UG9ydCA9IG1hdGNoLnBvcnQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBuZXdIb3N0ID0gbWF0Y2g7XG4gICAgICAgIG5ld1BvcnQgPSB1cmwucG9ydDtcbiAgICAgIH1cblxuICAgICAgLy8gd3JhcCBbaXB2Nl1cbiAgICAgIHVybC5ob3N0ID0gLzovLnRlc3QobmV3SG9zdCkgPyBgWyR7bmV3SG9zdH1dYCA6IG5ld0hvc3Q7XG4gICAgICBpZiAobmV3UG9ydCkge1xuICAgICAgICB1cmwuaG9zdCArPSBgOiR7bmV3UG9ydH1gO1xuICAgICAgICB1cmwucG9ydCA9IG5ld1BvcnQ7XG4gICAgICB9XG5cbiAgICAgIHVybC5ob3N0bmFtZSA9IG5ld0hvc3Q7XG4gICAgfVxuICB9XG5cbiAgLy8gb3B0aW9uc1xuICBvcHRpb25zLm1ldGhvZCA9IHRoaXMubWV0aG9kO1xuICBvcHRpb25zLnBvcnQgPSB1cmwucG9ydDtcbiAgb3B0aW9ucy5wYXRoID0gcGF0aDtcbiAgb3B0aW9ucy5ob3N0ID0gdXRpbHMubm9ybWFsaXplSG9zdG5hbWUodXJsLmhvc3RuYW1lKTsgLy8gZXg6IFs6OjFdIC0+IDo6MVxuICBvcHRpb25zLmNhID0gdGhpcy5fY2E7XG4gIG9wdGlvbnMua2V5ID0gdGhpcy5fa2V5O1xuICBvcHRpb25zLnBmeCA9IHRoaXMuX3BmeDtcbiAgb3B0aW9ucy5jZXJ0ID0gdGhpcy5fY2VydDtcbiAgb3B0aW9ucy5wYXNzcGhyYXNlID0gdGhpcy5fcGFzc3BocmFzZTtcbiAgb3B0aW9ucy5hZ2VudCA9IHRoaXMuX2FnZW50O1xuICBvcHRpb25zLmxvb2t1cCA9IHRoaXMuX2xvb2t1cDtcbiAgb3B0aW9ucy5yZWplY3RVbmF1dGhvcml6ZWQgPVxuICAgIHR5cGVvZiB0aGlzLl9kaXNhYmxlVExTQ2VydHMgPT09ICdib29sZWFuJ1xuICAgICAgPyAhdGhpcy5fZGlzYWJsZVRMU0NlcnRzXG4gICAgICA6IHByb2Nlc3MuZW52Lk5PREVfVExTX1JFSkVDVF9VTkFVVEhPUklaRUQgIT09ICcwJztcblxuICAvLyBBbGxvd3MgcmVxdWVzdC5nZXQoJ2h0dHBzOi8vMS4yLjMuNC8nKS5zZXQoJ0hvc3QnLCAnZXhhbXBsZS5jb20nKVxuICBpZiAodGhpcy5faGVhZGVyLmhvc3QpIHtcbiAgICBvcHRpb25zLnNlcnZlcm5hbWUgPSB0aGlzLl9oZWFkZXIuaG9zdC5yZXBsYWNlKC86XFxkKyQvLCAnJyk7XG4gIH1cblxuICBpZiAoXG4gICAgdGhpcy5fdHJ1c3RMb2NhbGhvc3QgJiZcbiAgICAvXig/OmxvY2FsaG9zdHwxMjdcXC4wXFwuMFxcLlxcZCt8KDAqOikrOjAqMSkkLy50ZXN0KHVybC5ob3N0bmFtZSlcbiAgKSB7XG4gICAgb3B0aW9ucy5yZWplY3RVbmF1dGhvcml6ZWQgPSBmYWxzZTtcbiAgfVxuXG4gIC8vIGluaXRpYXRlIHJlcXVlc3RcbiAgY29uc3QgbW9kdWxlXyA9IHRoaXMuX2VuYWJsZUh0dHAyXG4gICAgPyBleHBvcnRzLnByb3RvY29sc1snaHR0cDI6J10uc2V0UHJvdG9jb2wocHJvdG9jb2wpXG4gICAgOiBleHBvcnRzLnByb3RvY29sc1twcm90b2NvbF07XG5cbiAgLy8gcmVxdWVzdFxuICB0aGlzLnJlcSA9IG1vZHVsZV8ucmVxdWVzdChvcHRpb25zKTtcbiAgY29uc3QgeyByZXEgfSA9IHRoaXM7XG5cbiAgLy8gc2V0IHRjcCBubyBkZWxheVxuICByZXEuc2V0Tm9EZWxheSh0cnVlKTtcblxuICBpZiAob3B0aW9ucy5tZXRob2QgIT09ICdIRUFEJykge1xuICAgIHJlcS5zZXRIZWFkZXIoJ0FjY2VwdC1FbmNvZGluZycsICdnemlwLCBkZWZsYXRlJyk7XG4gIH1cblxuICB0aGlzLnByb3RvY29sID0gcHJvdG9jb2w7XG4gIHRoaXMuaG9zdCA9IHVybC5ob3N0O1xuXG4gIC8vIGV4cG9zZSBldmVudHNcbiAgcmVxLm9uY2UoJ2RyYWluJywgKCkgPT4ge1xuICAgIHRoaXMuZW1pdCgnZHJhaW4nKTtcbiAgfSk7XG5cbiAgcmVxLm9uKCdlcnJvcicsIChlcnJvcikgPT4ge1xuICAgIC8vIGZsYWcgYWJvcnRpb24gaGVyZSBmb3Igb3V0IHRpbWVvdXRzXG4gICAgLy8gYmVjYXVzZSBub2RlIHdpbGwgZW1pdCBhIGZhdXgtZXJyb3IgXCJzb2NrZXQgaGFuZyB1cFwiXG4gICAgLy8gd2hlbiByZXF1ZXN0IGlzIGFib3J0ZWQgYmVmb3JlIGEgY29ubmVjdGlvbiBpcyBtYWRlXG4gICAgaWYgKHRoaXMuX2Fib3J0ZWQpIHJldHVybjtcbiAgICAvLyBpZiBub3QgdGhlIHNhbWUsIHdlIGFyZSBpbiB0aGUgKipvbGQqKiAoY2FuY2VsbGVkKSByZXF1ZXN0LFxuICAgIC8vIHNvIG5lZWQgdG8gY29udGludWUgKHNhbWUgYXMgZm9yIGFib3ZlKVxuICAgIGlmICh0aGlzLl9yZXRyaWVzICE9PSByZXRyaWVzKSByZXR1cm47XG4gICAgLy8gaWYgd2UndmUgcmVjZWl2ZWQgYSByZXNwb25zZSB0aGVuIHdlIGRvbid0IHdhbnQgdG8gbGV0XG4gICAgLy8gYW4gZXJyb3IgaW4gdGhlIHJlcXVlc3QgYmxvdyB1cCB0aGUgcmVzcG9uc2VcbiAgICBpZiAodGhpcy5yZXNwb25zZSkgcmV0dXJuO1xuICAgIHRoaXMuY2FsbGJhY2soZXJyb3IpO1xuICB9KTtcblxuICAvLyBhdXRoXG4gIGlmICh1cmwudXNlcm5hbWUgfHwgdXJsLnBhc3N3b3JkKSB7XG4gICAgdGhpcy5hdXRoKHVybC51c2VybmFtZSwgdXJsLnBhc3N3b3JkKTtcbiAgfVxuXG4gIGlmICh0aGlzLnVzZXJuYW1lICYmIHRoaXMucGFzc3dvcmQpIHtcbiAgICB0aGlzLmF1dGgodGhpcy51c2VybmFtZSwgdGhpcy5wYXNzd29yZCk7XG4gIH1cblxuICBmb3IgKGNvbnN0IGtleSBpbiB0aGlzLmhlYWRlcikge1xuICAgIGlmIChoYXNPd24odGhpcy5oZWFkZXIsIGtleSkpIHJlcS5zZXRIZWFkZXIoa2V5LCB0aGlzLmhlYWRlcltrZXldKTtcbiAgfVxuXG4gIC8vIGFkZCBjb29raWVzXG4gIGlmICh0aGlzLmNvb2tpZXMpIHtcbiAgICBpZiAoaGFzT3duKHRoaXMuX2hlYWRlciwgJ2Nvb2tpZScpKSB7XG4gICAgICAvLyBtZXJnZVxuICAgICAgY29uc3QgdGVtcG9yYXJ5SmFyID0gbmV3IENvb2tpZUphci5Db29raWVKYXIoKTtcbiAgICAgIHRlbXBvcmFyeUphci5zZXRDb29raWVzKHRoaXMuX2hlYWRlci5jb29raWUuc3BsaXQoJzsgJykpO1xuICAgICAgdGVtcG9yYXJ5SmFyLnNldENvb2tpZXModGhpcy5jb29raWVzLnNwbGl0KCc7ICcpKTtcbiAgICAgIHJlcS5zZXRIZWFkZXIoXG4gICAgICAgICdDb29raWUnLFxuICAgICAgICB0ZW1wb3JhcnlKYXIuZ2V0Q29va2llcyhDb29raWVKYXIuQ29va2llQWNjZXNzSW5mby5BbGwpLnRvVmFsdWVTdHJpbmcoKVxuICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVxLnNldEhlYWRlcignQ29va2llJywgdGhpcy5jb29raWVzKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVxO1xufTtcblxuLyoqXG4gKiBJbnZva2UgdGhlIGNhbGxiYWNrIHdpdGggYGVycmAgYW5kIGByZXNgXG4gKiBhbmQgaGFuZGxlIGFyaXR5IGNoZWNrLlxuICpcbiAqIEBwYXJhbSB7RXJyb3J9IGVyclxuICogQHBhcmFtIHtSZXNwb25zZX0gcmVzXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5SZXF1ZXN0LnByb3RvdHlwZS5jYWxsYmFjayA9IGZ1bmN0aW9uIChlcnJvciwgcmVzKSB7XG4gIGlmICh0aGlzLl9zaG91bGRSZXRyeShlcnJvciwgcmVzKSkge1xuICAgIHJldHVybiB0aGlzLl9yZXRyeSgpO1xuICB9XG5cbiAgLy8gQXZvaWQgdGhlIGVycm9yIHdoaWNoIGlzIGVtaXR0ZWQgZnJvbSAnc29ja2V0IGhhbmcgdXAnIHRvIGNhdXNlIHRoZSBmbiB1bmRlZmluZWQgZXJyb3Igb24gSlMgcnVudGltZS5cbiAgY29uc3QgZm4gPSB0aGlzLl9jYWxsYmFjayB8fCBub29wO1xuICB0aGlzLmNsZWFyVGltZW91dCgpO1xuICBpZiAodGhpcy5jYWxsZWQpIHJldHVybiBjb25zb2xlLndhcm4oJ3N1cGVyYWdlbnQ6IGRvdWJsZSBjYWxsYmFjayBidWcnKTtcbiAgdGhpcy5jYWxsZWQgPSB0cnVlO1xuXG4gIGlmICghZXJyb3IpIHtcbiAgICB0cnkge1xuICAgICAgaWYgKCF0aGlzLl9pc1Jlc3BvbnNlT0socmVzKSkge1xuICAgICAgICBsZXQgbWVzc2FnZSA9ICdVbnN1Y2Nlc3NmdWwgSFRUUCByZXNwb25zZSc7XG4gICAgICAgIGlmIChyZXMpIHtcbiAgICAgICAgICBtZXNzYWdlID0gaHR0cC5TVEFUVVNfQ09ERVNbcmVzLnN0YXR1c10gfHwgbWVzc2FnZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGVycm9yID0gbmV3IEVycm9yKG1lc3NhZ2UpO1xuICAgICAgICBlcnJvci5zdGF0dXMgPSByZXMgPyByZXMuc3RhdHVzIDogdW5kZWZpbmVkO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgZXJyb3IgPSBlcnI7XG4gICAgICBlcnJvci5zdGF0dXMgPSBlcnJvci5zdGF0dXMgfHwgKHJlcyA/IHJlcy5zdGF0dXMgOiB1bmRlZmluZWQpO1xuICAgIH1cbiAgfVxuXG4gIC8vIEl0J3MgaW1wb3J0YW50IHRoYXQgdGhlIGNhbGxiYWNrIGlzIGNhbGxlZCBvdXRzaWRlIHRyeS9jYXRjaFxuICAvLyB0byBhdm9pZCBkb3VibGUgY2FsbGJhY2tcbiAgaWYgKCFlcnJvcikge1xuICAgIHJldHVybiBmbihudWxsLCByZXMpO1xuICB9XG5cbiAgZXJyb3IucmVzcG9uc2UgPSByZXM7XG4gIGlmICh0aGlzLl9tYXhSZXRyaWVzKSBlcnJvci5yZXRyaWVzID0gdGhpcy5fcmV0cmllcyAtIDE7XG5cbiAgLy8gb25seSBlbWl0IGVycm9yIGV2ZW50IGlmIHRoZXJlIGlzIGEgbGlzdGVuZXJcbiAgLy8gb3RoZXJ3aXNlIHdlIGFzc3VtZSB0aGUgY2FsbGJhY2sgdG8gYC5lbmQoKWAgd2lsbCBnZXQgdGhlIGVycm9yXG4gIGlmIChlcnJvciAmJiB0aGlzLmxpc3RlbmVycygnZXJyb3InKS5sZW5ndGggPiAwKSB7XG4gICAgdGhpcy5lbWl0KCdlcnJvcicsIGVycm9yKTtcbiAgfVxuXG4gIGZuKGVycm9yLCByZXMpO1xufTtcblxuLyoqXG4gKiBDaGVjayBpZiBgb2JqYCBpcyBhIGhvc3Qgb2JqZWN0LFxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmogaG9zdCBvYmplY3RcbiAqIEByZXR1cm4ge0Jvb2xlYW59IGlzIGEgaG9zdCBvYmplY3RcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5SZXF1ZXN0LnByb3RvdHlwZS5faXNIb3N0ID0gZnVuY3Rpb24gKG9iamVjdCkge1xuICByZXR1cm4gKFxuICAgIEJ1ZmZlci5pc0J1ZmZlcihvYmplY3QpIHx8XG4gICAgb2JqZWN0IGluc3RhbmNlb2YgU3RyZWFtIHx8XG4gICAgb2JqZWN0IGluc3RhbmNlb2YgRm9ybURhdGFcbiAgKTtcbn07XG5cbi8qKlxuICogSW5pdGlhdGUgcmVxdWVzdCwgaW52b2tpbmcgY2FsbGJhY2sgYGZuKGVyciwgcmVzKWBcbiAqIHdpdGggYW4gaW5zdGFuY2VvZiBgUmVzcG9uc2VgLlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdC5wcm90b3R5cGUuX2VtaXRSZXNwb25zZSA9IGZ1bmN0aW9uIChib2R5LCBmaWxlcykge1xuICBjb25zdCByZXNwb25zZSA9IG5ldyBSZXNwb25zZSh0aGlzKTtcbiAgdGhpcy5yZXNwb25zZSA9IHJlc3BvbnNlO1xuICByZXNwb25zZS5yZWRpcmVjdHMgPSB0aGlzLl9yZWRpcmVjdExpc3Q7XG4gIGlmICh1bmRlZmluZWQgIT09IGJvZHkpIHtcbiAgICByZXNwb25zZS5ib2R5ID0gYm9keTtcbiAgfVxuXG4gIHJlc3BvbnNlLmZpbGVzID0gZmlsZXM7XG4gIGlmICh0aGlzLl9lbmRDYWxsZWQpIHtcbiAgICByZXNwb25zZS5waXBlID0gZnVuY3Rpb24gKCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBcImVuZCgpIGhhcyBhbHJlYWR5IGJlZW4gY2FsbGVkLCBzbyBpdCdzIHRvbyBsYXRlIHRvIHN0YXJ0IHBpcGluZ1wiXG4gICAgICApO1xuICAgIH07XG4gIH1cblxuICB0aGlzLmVtaXQoJ3Jlc3BvbnNlJywgcmVzcG9uc2UpO1xuICByZXR1cm4gcmVzcG9uc2U7XG59O1xuXG4vKipcbiAqIEVtaXQgYHJlZGlyZWN0YCBldmVudCwgcGFzc2luZyBhbiBpbnN0YW5jZW9mIGBSZXNwb25zZWAuXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuUmVxdWVzdC5wcm90b3R5cGUuX2VtaXRSZWRpcmVjdCA9IGZ1bmN0aW9uICgpIHtcbiAgY29uc3QgcmVzcG9uc2UgPSBuZXcgUmVzcG9uc2UodGhpcyk7XG4gIHJlc3BvbnNlLnJlZGlyZWN0cyA9IHRoaXMuX3JlZGlyZWN0TGlzdDtcbiAgdGhpcy5lbWl0KCdyZWRpcmVjdCcsIHJlc3BvbnNlKTtcbn07XG5cblJlcXVlc3QucHJvdG90eXBlLmVuZCA9IGZ1bmN0aW9uIChmbikge1xuICB0aGlzLnJlcXVlc3QoKTtcbiAgZGVidWcoJyVzICVzJywgdGhpcy5tZXRob2QsIHRoaXMudXJsKTtcblxuICBpZiAodGhpcy5fZW5kQ2FsbGVkKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgJy5lbmQoKSB3YXMgY2FsbGVkIHR3aWNlLiBUaGlzIGlzIG5vdCBzdXBwb3J0ZWQgaW4gc3VwZXJhZ2VudCdcbiAgICApO1xuICB9XG5cbiAgdGhpcy5fZW5kQ2FsbGVkID0gdHJ1ZTtcblxuICAvLyBzdG9yZSBjYWxsYmFja1xuICB0aGlzLl9jYWxsYmFjayA9IGZuIHx8IG5vb3A7XG5cbiAgdGhpcy5fZW5kKCk7XG59O1xuXG5SZXF1ZXN0LnByb3RvdHlwZS5fZW5kID0gZnVuY3Rpb24gKCkge1xuICBpZiAodGhpcy5fYWJvcnRlZClcbiAgICByZXR1cm4gdGhpcy5jYWxsYmFjayhcbiAgICAgIG5ldyBFcnJvcignVGhlIHJlcXVlc3QgaGFzIGJlZW4gYWJvcnRlZCBldmVuIGJlZm9yZSAuZW5kKCkgd2FzIGNhbGxlZCcpXG4gICAgKTtcblxuICBsZXQgZGF0YSA9IHRoaXMuX2RhdGE7XG4gIGNvbnN0IHsgcmVxIH0gPSB0aGlzO1xuICBjb25zdCB7IG1ldGhvZCB9ID0gdGhpcztcblxuICB0aGlzLl9zZXRUaW1lb3V0cygpO1xuXG4gIC8vIGJvZHlcbiAgaWYgKG1ldGhvZCAhPT0gJ0hFQUQnICYmICFyZXEuX2hlYWRlclNlbnQpIHtcbiAgICAvLyBzZXJpYWxpemUgc3R1ZmZcbiAgICBpZiAodHlwZW9mIGRhdGEgIT09ICdzdHJpbmcnKSB7XG4gICAgICBsZXQgY29udGVudFR5cGUgPSByZXEuZ2V0SGVhZGVyKCdDb250ZW50LVR5cGUnKTtcbiAgICAgIC8vIFBhcnNlIG91dCBqdXN0IHRoZSBjb250ZW50IHR5cGUgZnJvbSB0aGUgaGVhZGVyIChpZ25vcmUgdGhlIGNoYXJzZXQpXG4gICAgICBpZiAoY29udGVudFR5cGUpIGNvbnRlbnRUeXBlID0gY29udGVudFR5cGUuc3BsaXQoJzsnKVswXTtcbiAgICAgIGxldCBzZXJpYWxpemUgPSB0aGlzLl9zZXJpYWxpemVyIHx8IGV4cG9ydHMuc2VyaWFsaXplW2NvbnRlbnRUeXBlXTtcbiAgICAgIGlmICghc2VyaWFsaXplICYmIGlzSlNPTihjb250ZW50VHlwZSkpIHtcbiAgICAgICAgc2VyaWFsaXplID0gZXhwb3J0cy5zZXJpYWxpemVbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgIH1cblxuICAgICAgaWYgKHNlcmlhbGl6ZSkgZGF0YSA9IHNlcmlhbGl6ZShkYXRhKTtcbiAgICB9XG5cbiAgICAvLyBjb250ZW50LWxlbmd0aFxuICAgIGlmIChkYXRhICYmICFyZXEuZ2V0SGVhZGVyKCdDb250ZW50LUxlbmd0aCcpKSB7XG4gICAgICByZXEuc2V0SGVhZGVyKFxuICAgICAgICAnQ29udGVudC1MZW5ndGgnLFxuICAgICAgICBCdWZmZXIuaXNCdWZmZXIoZGF0YSkgPyBkYXRhLmxlbmd0aCA6IEJ1ZmZlci5ieXRlTGVuZ3RoKGRhdGEpXG4gICAgICApO1xuICAgIH1cbiAgfVxuXG4gIC8vIHJlc3BvbnNlXG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBjb21wbGV4aXR5XG4gIHJlcS5vbmNlKCdyZXNwb25zZScsIChyZXMpID0+IHtcbiAgICBkZWJ1ZygnJXMgJXMgLT4gJXMnLCB0aGlzLm1ldGhvZCwgdGhpcy51cmwsIHJlcy5zdGF0dXNDb2RlKTtcblxuICAgIGlmICh0aGlzLl9yZXNwb25zZVRpbWVvdXRUaW1lcikge1xuICAgICAgY2xlYXJUaW1lb3V0KHRoaXMuX3Jlc3BvbnNlVGltZW91dFRpbWVyKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5waXBlZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IG1heCA9IHRoaXMuX21heFJlZGlyZWN0cztcbiAgICBjb25zdCBtaW1lID0gdXRpbHMudHlwZShyZXMuaGVhZGVyc1snY29udGVudC10eXBlJ10gfHwgJycpIHx8ICd0ZXh0L3BsYWluJztcbiAgICBsZXQgdHlwZSA9IG1pbWUuc3BsaXQoJy8nKVswXTtcbiAgICBpZiAodHlwZSkgdHlwZSA9IHR5cGUudG9Mb3dlckNhc2UoKS50cmltKCk7XG4gICAgY29uc3QgbXVsdGlwYXJ0ID0gdHlwZSA9PT0gJ211bHRpcGFydCc7XG4gICAgY29uc3QgcmVkaXJlY3QgPSBpc1JlZGlyZWN0KHJlcy5zdGF0dXNDb2RlKTtcbiAgICBjb25zdCByZXNwb25zZVR5cGUgPSB0aGlzLl9yZXNwb25zZVR5cGU7XG5cbiAgICB0aGlzLnJlcyA9IHJlcztcblxuICAgIC8vIHJlZGlyZWN0XG4gICAgaWYgKHJlZGlyZWN0ICYmIHRoaXMuX3JlZGlyZWN0cysrICE9PSBtYXgpIHtcbiAgICAgIHJldHVybiB0aGlzLl9yZWRpcmVjdChyZXMpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm1ldGhvZCA9PT0gJ0hFQUQnKSB7XG4gICAgICB0aGlzLmVtaXQoJ2VuZCcpO1xuICAgICAgdGhpcy5jYWxsYmFjayhudWxsLCB0aGlzLl9lbWl0UmVzcG9uc2UoKSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gemxpYiBzdXBwb3J0XG4gICAgaWYgKHRoaXMuX3Nob3VsZERlY29tcHJlc3MocmVzKSkge1xuICAgICAgZGVjb21wcmVzcyhyZXEsIHJlcyk7XG4gICAgfVxuXG4gICAgbGV0IGJ1ZmZlciA9IHRoaXMuX2J1ZmZlcjtcbiAgICBpZiAoYnVmZmVyID09PSB1bmRlZmluZWQgJiYgbWltZSBpbiBleHBvcnRzLmJ1ZmZlcikge1xuICAgICAgYnVmZmVyID0gQm9vbGVhbihleHBvcnRzLmJ1ZmZlclttaW1lXSk7XG4gICAgfVxuXG4gICAgbGV0IHBhcnNlciA9IHRoaXMuX3BhcnNlcjtcbiAgICBpZiAodW5kZWZpbmVkID09PSBidWZmZXIgJiYgcGFyc2VyKSB7XG4gICAgICBjb25zb2xlLndhcm4oXG4gICAgICAgIFwiQSBjdXN0b20gc3VwZXJhZ2VudCBwYXJzZXIgaGFzIGJlZW4gc2V0LCBidXQgYnVmZmVyaW5nIHN0cmF0ZWd5IGZvciB0aGUgcGFyc2VyIGhhc24ndCBiZWVuIGNvbmZpZ3VyZWQuIENhbGwgYHJlcS5idWZmZXIodHJ1ZSBvciBmYWxzZSlgIG9yIHNldCBgc3VwZXJhZ2VudC5idWZmZXJbbWltZV0gPSB0cnVlIG9yIGZhbHNlYFwiXG4gICAgICApO1xuICAgICAgYnVmZmVyID0gdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAoIXBhcnNlcikge1xuICAgICAgaWYgKHJlc3BvbnNlVHlwZSkge1xuICAgICAgICBwYXJzZXIgPSBleHBvcnRzLnBhcnNlLmltYWdlOyAvLyBJdCdzIGFjdHVhbGx5IGEgZ2VuZXJpYyBCdWZmZXJcbiAgICAgICAgYnVmZmVyID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSBpZiAobXVsdGlwYXJ0KSB7XG4gICAgICAgIGNvbnN0IGZvcm0gPSBmb3JtaWRhYmxlLmZvcm1pZGFibGUoKTtcbiAgICAgICAgcGFyc2VyID0gKHJlcywgY2FsbGJhY2spID0+IHtcbiAgICAgICAgICAvLyBDcmVhdGUgYSBQYXNzVGhyb3VnaCBzdHJlYW0gdGhhdCBhY3RzIGFzIGEgcHJvcGVyIEhUVFAgcmVxdWVzdFxuICAgICAgICAgIGNvbnN0IGJyaWRnZVN0cmVhbSA9IG5ldyBTdHJlYW0uUGFzc1Rocm91Z2goKTtcblxuICAgICAgICAgIC8vIEFkZCBIVFRQIHJlcXVlc3QgcHJvcGVydGllcyBmcm9tIHRoZSBjdXJyZW50IHJlcXVlc3QgY29udGV4dFxuICAgICAgICAgIGJyaWRnZVN0cmVhbS5tZXRob2QgPSB0aGlzLm1ldGhvZCB8fCAnUE9TVCc7XG4gICAgICAgICAgYnJpZGdlU3RyZWFtLnVybCA9IHRoaXMudXJsIHx8ICcvJztcbiAgICAgICAgICBicmlkZ2VTdHJlYW0uaHR0cFZlcnNpb24gPSByZXMuaHR0cFZlcnNpb24gfHwgJzEuMSc7XG4gICAgICAgICAgYnJpZGdlU3RyZWFtLmhlYWRlcnMgPSByZXMuaGVhZGVycyB8fCB7fTtcbiAgICAgICAgICBicmlkZ2VTdHJlYW0uc29ja2V0ID0gcmVzLnNvY2tldCB8fCB7IHJlYWRhYmxlOiB0cnVlIH07XG5cbiAgICAgICAgICAvLyBQaXBlIHRoZSByZXNwb25zZSBkYXRhIHRocm91Z2ggdGhlIGJyaWRnZSBzdHJlYW1cbiAgICAgICAgICByZXMucGlwZShicmlkZ2VTdHJlYW0pO1xuXG4gICAgICAgICAgZm9ybS5wYXJzZShicmlkZ2VTdHJlYW0sIChlcnIsIGZpZWxkcywgZmlsZXMpID0+IHtcbiAgICAgICAgICAgIGlmIChlcnIpIHJldHVybiBjYWxsYmFjayhlcnIpO1xuXG4gICAgICAgICAgICAvLyBGb3JtaWRhYmxlIHYzIGFsd2F5cyByZXR1cm5zIGFycmF5cywgYnV0IFN1cGVyQWdlbnQgZXhwZWN0cyBzaW5nbGUgdmFsdWVzXG4gICAgICAgICAgICAvLyBGbGF0dGVuIHNpbmdsZS1pdGVtIGFycmF5cyB0byBtYWludGFpbiBiYWNrd2FyZCBjb21wYXRpYmlsaXR5XG4gICAgICAgICAgICBjb25zdCBmbGF0dGVuZWRGaWVsZHMgPSB7fTtcbiAgICAgICAgICAgIGlmIChmaWVsZHMpIHtcbiAgICAgICAgICAgICAgZm9yIChjb25zdCBrZXkgaW4gZmllbGRzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSBmaWVsZHNba2V5XTtcbiAgICAgICAgICAgICAgICBmbGF0dGVuZWRGaWVsZHNba2V5XSA9IEFycmF5LmlzQXJyYXkodmFsdWUpICYmIHZhbHVlLmxlbmd0aCA9PT0gMSA/IHZhbHVlWzBdIDogdmFsdWU7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgZmxhdHRlbmVkRmlsZXMgPSB7fTtcbiAgICAgICAgICAgIGlmIChmaWxlcykge1xuICAgICAgICAgICAgICBmb3IgKGNvbnN0IGtleSBpbiBmaWxlcykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gZmlsZXNba2V5XTtcbiAgICAgICAgICAgICAgICBmbGF0dGVuZWRGaWxlc1trZXldID0gQXJyYXkuaXNBcnJheSh2YWx1ZSkgJiYgdmFsdWUubGVuZ3RoID09PSAxID8gdmFsdWVbMF0gOiB2YWx1ZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBSZXR1cm4gZmxhdHRlbmVkIGZpZWxkcyBhcyB0aGUgb2JqZWN0IHBhcmFtZXRlciB0byBtYXRjaCBTdXBlckFnZW50J3MgZXhwZWN0ZWQgZm9ybWF0XG4gICAgICAgICAgICBjYWxsYmFjayhudWxsLCBmbGF0dGVuZWRGaWVsZHMsIGZsYXR0ZW5lZEZpbGVzKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICAgICAgYnVmZmVyID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSBpZiAoaXNCaW5hcnkobWltZSkpIHtcbiAgICAgICAgcGFyc2VyID0gZXhwb3J0cy5wYXJzZS5pbWFnZTtcbiAgICAgICAgYnVmZmVyID0gdHJ1ZTsgLy8gRm9yIGJhY2t3YXJkcy1jb21wYXRpYmlsaXR5IGJ1ZmZlcmluZyBkZWZhdWx0IGlzIGFkLWhvYyBNSU1FLWRlcGVuZGVudFxuICAgICAgfSBlbHNlIGlmIChleHBvcnRzLnBhcnNlW21pbWVdKSB7XG4gICAgICAgIHBhcnNlciA9IGV4cG9ydHMucGFyc2VbbWltZV07XG4gICAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICd0ZXh0Jykge1xuICAgICAgICBwYXJzZXIgPSBleHBvcnRzLnBhcnNlLnRleHQ7XG4gICAgICAgIGJ1ZmZlciA9IGJ1ZmZlciAhPT0gZmFsc2U7XG4gICAgICAgIC8vIGV2ZXJ5b25lIHdhbnRzIHRoZWlyIG93biB3aGl0ZS1sYWJlbGVkIGpzb25cbiAgICAgIH0gZWxzZSBpZiAoaXNKU09OKG1pbWUpKSB7XG4gICAgICAgIHBhcnNlciA9IGV4cG9ydHMucGFyc2VbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgICAgYnVmZmVyID0gYnVmZmVyICE9PSBmYWxzZTtcbiAgICAgIH0gZWxzZSBpZiAoYnVmZmVyKSB7XG4gICAgICAgIHBhcnNlciA9IGV4cG9ydHMucGFyc2UudGV4dDtcbiAgICAgIH0gZWxzZSBpZiAodW5kZWZpbmVkID09PSBidWZmZXIpIHtcbiAgICAgICAgcGFyc2VyID0gZXhwb3J0cy5wYXJzZS5pbWFnZTsgLy8gSXQncyBhY3R1YWxseSBhIGdlbmVyaWMgQnVmZmVyXG4gICAgICAgIGJ1ZmZlciA9IHRydWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gYnkgZGVmYXVsdCBvbmx5IGJ1ZmZlciB0ZXh0LyosIGpzb24gYW5kIG1lc3NlZCB1cCB0aGluZyBmcm9tIGhlbGxcbiAgICBpZiAoKHVuZGVmaW5lZCA9PT0gYnVmZmVyICYmIGlzVGV4dChtaW1lKSkgfHwgaXNKU09OKG1pbWUpKSB7XG4gICAgICBidWZmZXIgPSB0cnVlO1xuICAgIH1cblxuICAgIHRoaXMuX3Jlc0J1ZmZlcmVkID0gYnVmZmVyO1xuICAgIGxldCBwYXJzZXJIYW5kbGVzRW5kID0gZmFsc2U7XG4gICAgaWYgKGJ1ZmZlcikge1xuICAgICAgLy8gUHJvdGVjdGlvbmEgYWdhaW5zdCB6aXAgYm9tYnMgYW5kIG90aGVyIG51aXNhbmNlXG4gICAgICBsZXQgcmVzcG9uc2VCeXRlc0xlZnQgPSB0aGlzLl9tYXhSZXNwb25zZVNpemUgfHwgMjAwMDAwMDAwO1xuICAgICAgcmVzLm9uKCdkYXRhJywgKGJ1ZikgPT4ge1xuICAgICAgICByZXNwb25zZUJ5dGVzTGVmdCAtPSBidWYuYnl0ZUxlbmd0aCB8fCBidWYubGVuZ3RoID4gMCA/IGJ1Zi5sZW5ndGggOiAwO1xuICAgICAgICBpZiAocmVzcG9uc2VCeXRlc0xlZnQgPCAwKSB7XG4gICAgICAgICAgLy8gVGhpcyB3aWxsIHByb3BhZ2F0ZSB0aHJvdWdoIGVycm9yIGV2ZW50XG4gICAgICAgICAgY29uc3QgZXJyb3IgPSBuZXcgRXJyb3IoJ01heGltdW0gcmVzcG9uc2Ugc2l6ZSByZWFjaGVkJyk7XG4gICAgICAgICAgZXJyb3IuY29kZSA9ICdFVE9PTEFSR0UnO1xuICAgICAgICAgIC8vIFBhcnNlcnMgYXJlbid0IHJlcXVpcmVkIHRvIG9ic2VydmUgZXJyb3IgZXZlbnQsXG4gICAgICAgICAgLy8gc28gd291bGQgaW5jb3JyZWN0bHkgcmVwb3J0IHN1Y2Nlc3NcbiAgICAgICAgICBwYXJzZXJIYW5kbGVzRW5kID0gZmFsc2U7XG4gICAgICAgICAgLy8gV2lsbCBub3QgZW1pdCBlcnJvciBldmVudFxuICAgICAgICAgIHJlcy5kZXN0cm95KGVycm9yKTtcbiAgICAgICAgICAvLyBzbyB3ZSBkbyBjYWxsYmFjayBub3dcbiAgICAgICAgICB0aGlzLmNhbGxiYWNrKGVycm9yLCBudWxsKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKHBhcnNlcikge1xuICAgICAgdHJ5IHtcbiAgICAgICAgLy8gVW5idWZmZXJlZCBwYXJzZXJzIGFyZSBzdXBwb3NlZCB0byBlbWl0IHJlc3BvbnNlIGVhcmx5LFxuICAgICAgICAvLyB3aGljaCBpcyB3ZWlyZCBCVFcsIGJlY2F1c2UgcmVzcG9uc2UuYm9keSB3b24ndCBiZSB0aGVyZS5cbiAgICAgICAgcGFyc2VySGFuZGxlc0VuZCA9IGJ1ZmZlcjtcblxuICAgICAgICBwYXJzZXIocmVzLCAoZXJyb3IsIG9iamVjdCwgZmlsZXMpID0+IHtcbiAgICAgICAgICBpZiAodGhpcy50aW1lZG91dCkge1xuICAgICAgICAgICAgLy8gVGltZW91dCBoYXMgYWxyZWFkeSBoYW5kbGVkIGFsbCBjYWxsYmFja3NcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBJbnRlbnRpb25hbCAobm9uLXRpbWVvdXQpIGFib3J0IGlzIHN1cHBvc2VkIHRvIHByZXNlcnZlIHBhcnRpYWwgcmVzcG9uc2UsXG4gICAgICAgICAgLy8gZXZlbiBpZiBpdCBkb2Vzbid0IHBhcnNlLlxuICAgICAgICAgIGlmIChlcnJvciAmJiAhdGhpcy5fYWJvcnRlZCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY2FsbGJhY2soZXJyb3IpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChwYXJzZXJIYW5kbGVzRW5kKSB7XG4gICAgICAgICAgICB0aGlzLmVtaXQoJ2VuZCcpO1xuICAgICAgICAgICAgdGhpcy5jYWxsYmFjayhudWxsLCB0aGlzLl9lbWl0UmVzcG9uc2Uob2JqZWN0LCBmaWxlcykpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgdGhpcy5jYWxsYmFjayhlcnIpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5yZXMgPSByZXM7XG5cbiAgICAvLyB1bmJ1ZmZlcmVkXG4gICAgaWYgKCFidWZmZXIpIHtcbiAgICAgIGRlYnVnKCd1bmJ1ZmZlcmVkICVzICVzJywgdGhpcy5tZXRob2QsIHRoaXMudXJsKTtcbiAgICAgIHRoaXMuY2FsbGJhY2sobnVsbCwgdGhpcy5fZW1pdFJlc3BvbnNlKCkpO1xuICAgICAgaWYgKG11bHRpcGFydCkgcmV0dXJuOyAvLyBhbGxvdyBtdWx0aXBhcnQgdG8gaGFuZGxlIGVuZCBldmVudFxuICAgICAgcmVzLm9uY2UoJ2VuZCcsICgpID0+IHtcbiAgICAgICAgZGVidWcoJ2VuZCAlcyAlcycsIHRoaXMubWV0aG9kLCB0aGlzLnVybCk7XG4gICAgICAgIHRoaXMuZW1pdCgnZW5kJyk7XG4gICAgICB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyB0ZXJtaW5hdGluZyBldmVudHNcbiAgICByZXMub25jZSgnZXJyb3InLCAoZXJyb3IpID0+IHtcbiAgICAgIHBhcnNlckhhbmRsZXNFbmQgPSBmYWxzZTtcbiAgICAgIHRoaXMuY2FsbGJhY2soZXJyb3IsIG51bGwpO1xuICAgIH0pO1xuICAgIGlmICghcGFyc2VySGFuZGxlc0VuZClcbiAgICAgIHJlcy5vbmNlKCdlbmQnLCAoKSA9PiB7XG4gICAgICAgIGRlYnVnKCdlbmQgJXMgJXMnLCB0aGlzLm1ldGhvZCwgdGhpcy51cmwpO1xuICAgICAgICAvLyBUT0RPOiB1bmxlc3MgYnVmZmVyaW5nIGVtaXQgZWFybGllciB0byBzdHJlYW1cbiAgICAgICAgdGhpcy5lbWl0KCdlbmQnKTtcbiAgICAgICAgdGhpcy5jYWxsYmFjayhudWxsLCB0aGlzLl9lbWl0UmVzcG9uc2UoKSk7XG4gICAgICB9KTtcbiAgfSk7XG5cbiAgdGhpcy5lbWl0KCdyZXF1ZXN0JywgdGhpcyk7XG5cbiAgY29uc3QgZ2V0UHJvZ3Jlc3NNb25pdG9yID0gKCkgPT4ge1xuICAgIGNvbnN0IGxlbmd0aENvbXB1dGFibGUgPSB0cnVlO1xuICAgIGNvbnN0IHRvdGFsID0gcmVxLmdldEhlYWRlcignQ29udGVudC1MZW5ndGgnKTtcbiAgICBsZXQgbG9hZGVkID0gMDtcblxuICAgIGNvbnN0IHByb2dyZXNzID0gbmV3IFN0cmVhbS5UcmFuc2Zvcm0oKTtcbiAgICBwcm9ncmVzcy5fdHJhbnNmb3JtID0gKGNodW5rLCBlbmNvZGluZywgY2FsbGJhY2spID0+IHtcbiAgICAgIGxvYWRlZCArPSBjaHVuay5sZW5ndGg7XG4gICAgICB0aGlzLmVtaXQoJ3Byb2dyZXNzJywge1xuICAgICAgICBkaXJlY3Rpb246ICd1cGxvYWQnLFxuICAgICAgICBsZW5ndGhDb21wdXRhYmxlLFxuICAgICAgICBsb2FkZWQsXG4gICAgICAgIHRvdGFsXG4gICAgICB9KTtcbiAgICAgIGNhbGxiYWNrKG51bGwsIGNodW5rKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIHByb2dyZXNzO1xuICB9O1xuXG4gIGNvbnN0IGJ1ZmZlclRvQ2h1bmtzID0gKGJ1ZmZlcikgPT4ge1xuICAgIGNvbnN0IGNodW5rU2l6ZSA9IDE2ICogMTAyNDsgLy8gZGVmYXVsdCBoaWdoV2F0ZXJNYXJrIHZhbHVlXG4gICAgY29uc3QgY2h1bmtpbmcgPSBuZXcgU3RyZWFtLlJlYWRhYmxlKCk7XG4gICAgY29uc3QgdG90YWxMZW5ndGggPSBidWZmZXIubGVuZ3RoO1xuICAgIGNvbnN0IHJlbWFpbmRlciA9IHRvdGFsTGVuZ3RoICUgY2h1bmtTaXplO1xuICAgIGNvbnN0IGN1dG9mZiA9IHRvdGFsTGVuZ3RoIC0gcmVtYWluZGVyO1xuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjdXRvZmY7IGkgKz0gY2h1bmtTaXplKSB7XG4gICAgICBjb25zdCBjaHVuayA9IGJ1ZmZlci5zbGljZShpLCBpICsgY2h1bmtTaXplKTtcbiAgICAgIGNodW5raW5nLnB1c2goY2h1bmspO1xuICAgIH1cblxuICAgIGlmIChyZW1haW5kZXIgPiAwKSB7XG4gICAgICBjb25zdCByZW1haW5kZXJCdWZmZXIgPSBidWZmZXIuc2xpY2UoLXJlbWFpbmRlcik7XG4gICAgICBjaHVua2luZy5wdXNoKHJlbWFpbmRlckJ1ZmZlcik7XG4gICAgfVxuXG4gICAgY2h1bmtpbmcucHVzaChudWxsKTsgLy8gbm8gbW9yZSBkYXRhXG5cbiAgICByZXR1cm4gY2h1bmtpbmc7XG4gIH07XG5cbiAgLy8gaWYgYSBGb3JtRGF0YSBpbnN0YW5jZSBnb3QgY3JlYXRlZCwgdGhlbiB3ZSBzZW5kIHRoYXQgYXMgdGhlIHJlcXVlc3QgYm9keVxuICBjb25zdCBmb3JtRGF0YSA9IHRoaXMuX2Zvcm1EYXRhO1xuICBpZiAoZm9ybURhdGEpIHtcbiAgICAvLyBzZXQgaGVhZGVyc1xuICAgIGNvbnN0IGhlYWRlcnMgPSBmb3JtRGF0YS5nZXRIZWFkZXJzKCk7XG4gICAgZm9yIChjb25zdCBpIGluIGhlYWRlcnMpIHtcbiAgICAgIGlmIChoYXNPd24oaGVhZGVycywgaSkpIHtcbiAgICAgICAgZGVidWcoJ3NldHRpbmcgRm9ybURhdGEgaGVhZGVyOiBcIiVzOiAlc1wiJywgaSwgaGVhZGVyc1tpXSk7XG4gICAgICAgIHJlcS5zZXRIZWFkZXIoaSwgaGVhZGVyc1tpXSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gYXR0ZW1wdCB0byBnZXQgXCJDb250ZW50LUxlbmd0aFwiIGhlYWRlclxuICAgIGZvcm1EYXRhLmdldExlbmd0aCgoZXJyb3IsIGxlbmd0aCkgPT4ge1xuICAgICAgLy8gVE9ETzogQWRkIGNodW5rZWQgZW5jb2Rpbmcgd2hlbiBubyBsZW5ndGggKGlmIGVycilcbiAgICAgIGlmIChlcnJvcikgZGVidWcoJ2Zvcm1EYXRhLmdldExlbmd0aCBoYWQgZXJyb3InLCBlcnJvciwgbGVuZ3RoKTtcblxuICAgICAgZGVidWcoJ2dvdCBGb3JtRGF0YSBDb250ZW50LUxlbmd0aDogJXMnLCBsZW5ndGgpO1xuICAgICAgaWYgKHR5cGVvZiBsZW5ndGggPT09ICdudW1iZXInKSB7XG4gICAgICAgIHJlcS5zZXRIZWFkZXIoJ0NvbnRlbnQtTGVuZ3RoJywgbGVuZ3RoKTtcbiAgICAgIH1cblxuICAgICAgZm9ybURhdGEucGlwZShnZXRQcm9ncmVzc01vbml0b3IoKSkucGlwZShyZXEpO1xuICAgIH0pO1xuICB9IGVsc2UgaWYgKEJ1ZmZlci5pc0J1ZmZlcihkYXRhKSkge1xuICAgIGJ1ZmZlclRvQ2h1bmtzKGRhdGEpLnBpcGUoZ2V0UHJvZ3Jlc3NNb25pdG9yKCkpLnBpcGUocmVxKTtcbiAgfSBlbHNlIHtcbiAgICByZXEuZW5kKGRhdGEpO1xuICB9XG59O1xuXG4vLyBDaGVjayB3aGV0aGVyIHJlc3BvbnNlIGhhcyBhIG5vbi0wLXNpemVkIGd6aXAtZW5jb2RlZCBib2R5XG5SZXF1ZXN0LnByb3RvdHlwZS5fc2hvdWxkRGVjb21wcmVzcyA9IChyZXMpID0+IHtcbiAgcmV0dXJuIGhhc05vbkVtcHR5UmVzcG9uc2VDb250ZW50KHJlcykgJiYgKGlzR3ppcE9yRGVmbGF0ZUVuY29kaW5nKHJlcykgfHwgaXNCcm90bGlFbmNvZGluZyhyZXMpKTtcbn07XG5cblxuLyoqXG4gKiBPdmVycmlkZXMgRE5TIGZvciBzZWxlY3RlZCBob3N0bmFtZXMuIFRha2VzIG9iamVjdCBtYXBwaW5nIGhvc3RuYW1lcyB0byBJUCBhZGRyZXNzZXMuXG4gKlxuICogV2hlbiBtYWtpbmcgYSByZXF1ZXN0IHRvIGEgVVJMIHdpdGggYSBob3N0bmFtZSBleGFjdGx5IG1hdGNoaW5nIGEga2V5IGluIHRoZSBvYmplY3QsXG4gKiB1c2UgdGhlIGdpdmVuIElQIGFkZHJlc3MgdG8gY29ubmVjdCwgaW5zdGVhZCBvZiB1c2luZyBETlMgdG8gcmVzb2x2ZSB0aGUgaG9zdG5hbWUuXG4gKlxuICogQSBzcGVjaWFsIGhvc3QgYCpgIG1hdGNoZXMgZXZlcnkgaG9zdG5hbWUgKGtlZXAgcmVkaXJlY3RzIGluIG1pbmQhKVxuICpcbiAqICAgICAgcmVxdWVzdC5jb25uZWN0KHtcbiAqICAgICAgICAndGVzdC5leGFtcGxlLmNvbSc6ICcxMjcuMC4wLjEnLFxuICogICAgICAgICdpcHY2LmV4YW1wbGUuY29tJzogJzo6MScsXG4gKiAgICAgIH0pXG4gKi9cblJlcXVlc3QucHJvdG90eXBlLmNvbm5lY3QgPSBmdW5jdGlvbiAoY29ubmVjdE92ZXJyaWRlKSB7XG4gIGlmICh0eXBlb2YgY29ubmVjdE92ZXJyaWRlID09PSAnc3RyaW5nJykge1xuICAgIHRoaXMuX2Nvbm5lY3RPdmVycmlkZSA9IHsgJyonOiBjb25uZWN0T3ZlcnJpZGUgfTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgY29ubmVjdE92ZXJyaWRlID09PSAnb2JqZWN0Jykge1xuICAgIHRoaXMuX2Nvbm5lY3RPdmVycmlkZSA9IGNvbm5lY3RPdmVycmlkZTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLl9jb25uZWN0T3ZlcnJpZGUgPSB1bmRlZmluZWQ7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cblJlcXVlc3QucHJvdG90eXBlLnRydXN0TG9jYWxob3N0ID0gZnVuY3Rpb24gKHRvZ2dsZSkge1xuICB0aGlzLl90cnVzdExvY2FsaG9zdCA9IHRvZ2dsZSA9PT0gdW5kZWZpbmVkID8gdHJ1ZSA6IHRvZ2dsZTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vLyBnZW5lcmF0ZSBIVFRQIHZlcmIgbWV0aG9kc1xuaWYgKCFtZXRob2RzLmluY2x1ZGVzKCdkZWwnKSkge1xuICAvLyBjcmVhdGUgYSBjb3B5IHNvIHdlIGRvbid0IGNhdXNlIGNvbmZsaWN0cyB3aXRoXG4gIC8vIG90aGVyIHBhY2thZ2VzIHVzaW5nIHRoZSBtZXRob2RzIHBhY2thZ2UgYW5kXG4gIC8vIG5wbSAzLnhcbiAgbWV0aG9kcyA9IFsuLi5tZXRob2RzXTtcbiAgbWV0aG9kcy5wdXNoKCdkZWwnKTtcbn1cblxuZm9yIChsZXQgbWV0aG9kIG9mIG1ldGhvZHMpIHtcbiAgY29uc3QgbmFtZSA9IG1ldGhvZDtcbiAgbWV0aG9kID0gbWV0aG9kID09PSAnZGVsJyA/ICdkZWxldGUnIDogbWV0aG9kO1xuXG4gIG1ldGhvZCA9IG1ldGhvZC50b1VwcGVyQ2FzZSgpO1xuICByZXF1ZXN0W25hbWVdID0gKHVybCwgZGF0YSwgZm4pID0+IHtcbiAgICBjb25zdCByZXF1ZXN0XyA9IHJlcXVlc3QobWV0aG9kLCB1cmwpO1xuICAgIGlmICh0eXBlb2YgZGF0YSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgZm4gPSBkYXRhO1xuICAgICAgZGF0YSA9IG51bGw7XG4gICAgfVxuXG4gICAgaWYgKGRhdGEpIHtcbiAgICAgIGlmIChtZXRob2QgPT09ICdHRVQnIHx8IG1ldGhvZCA9PT0gJ0hFQUQnKSB7XG4gICAgICAgIHJlcXVlc3RfLnF1ZXJ5KGRhdGEpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVxdWVzdF8uc2VuZChkYXRhKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoZm4pIHJlcXVlc3RfLmVuZChmbik7XG4gICAgcmV0dXJuIHJlcXVlc3RfO1xuICB9O1xufVxuXG4vKipcbiAqIENoZWNrIGlmIGBtaW1lYCBpcyB0ZXh0IGFuZCBzaG91bGQgYmUgYnVmZmVyZWQuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG1pbWVcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmZ1bmN0aW9uIGlzVGV4dChtaW1lKSB7XG4gIGNvbnN0IHBhcnRzID0gbWltZS5zcGxpdCgnLycpO1xuICBsZXQgdHlwZSA9IHBhcnRzWzBdO1xuICBpZiAodHlwZSkgdHlwZSA9IHR5cGUudG9Mb3dlckNhc2UoKS50cmltKCk7XG4gIGxldCBzdWJ0eXBlID0gcGFydHNbMV07XG4gIGlmIChzdWJ0eXBlKSBzdWJ0eXBlID0gc3VidHlwZS50b0xvd2VyQ2FzZSgpLnRyaW0oKTtcblxuICByZXR1cm4gdHlwZSA9PT0gJ3RleHQnIHx8IHN1YnR5cGUgPT09ICd4LXd3dy1mb3JtLXVybGVuY29kZWQnO1xufVxuXG4vLyBUaGlzIGlzIG5vdCBhIGNhdGNoYWxsLCBidXQgYSBzdGFydC4gSXQgbWlnaHQgYmUgdXNlZnVsXG4vLyBpbiB0aGUgbG9uZyBydW4gdG8gaGF2ZSBmaWxlIHRoYXQgaW5jbHVkZXMgYWxsIGJpbmFyeVxuLy8gY29udGVudCB0eXBlcyBmcm9tIGh0dHBzOi8vd3d3LmlhbmEub3JnL2Fzc2lnbm1lbnRzL21lZGlhLXR5cGVzL21lZGlhLXR5cGVzLnhodG1sXG5mdW5jdGlvbiBpc0JpbmFyeShtaW1lKSB7XG4gIGxldCBbcmVnaXN0cnksIG5hbWVdID0gbWltZS5zcGxpdCgnLycpO1xuICBpZiAocmVnaXN0cnkpIHJlZ2lzdHJ5ID0gcmVnaXN0cnkudG9Mb3dlckNhc2UoKS50cmltKCk7XG4gIGlmIChuYW1lKSBuYW1lID0gbmFtZS50b0xvd2VyQ2FzZSgpLnRyaW0oKTtcbiAgcmV0dXJuIChcbiAgICBbJ2F1ZGlvJywgJ2ZvbnQnLCAnaW1hZ2UnLCAndmlkZW8nXS5pbmNsdWRlcyhyZWdpc3RyeSkgfHxcbiAgICBbJ2d6JywgJ2d6aXAnXS5pbmNsdWRlcyhuYW1lKVxuICApO1xufVxuXG4vKipcbiAqIENoZWNrIGlmIGBtaW1lYCBpcyBqc29uIG9yIGhhcyAranNvbiBzdHJ1Y3R1cmVkIHN5bnRheCBzdWZmaXguXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG1pbWVcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBpc0pTT04obWltZSkge1xuICAvLyBzaG91bGQgbWF0Y2ggL2pzb24gb3IgK2pzb25cbiAgLy8gYnV0IG5vdCAvanNvbi1zZXFcbiAgcmV0dXJuIC9bLytdanNvbigkfFteLVxcd10pL2kudGVzdChtaW1lKTtcbn1cblxuLyoqXG4gKiBDaGVjayBpZiB3ZSBzaG91bGQgZm9sbG93IHRoZSByZWRpcmVjdCBgY29kZWAuXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IGNvZGVcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBpc1JlZGlyZWN0KGNvZGUpIHtcbiAgcmV0dXJuIFszMDEsIDMwMiwgMzAzLCAzMDUsIDMwNywgMzA4XS5pbmNsdWRlcyhjb2RlKTtcbn1cblxuZnVuY3Rpb24gaGFzTm9uRW1wdHlSZXNwb25zZUNvbnRlbnQocmVzKSB7XG4gIGlmIChyZXMuc3RhdHVzQ29kZSA9PT0gMjA0IHx8IHJlcy5zdGF0dXNDb2RlID09PSAzMDQpIHtcbiAgICAvLyBUaGVzZSBhcmVuJ3Qgc3VwcG9zZWQgdG8gaGF2ZSBhbnkgYm9keVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8vIGhlYWRlciBjb250ZW50IGlzIGEgc3RyaW5nLCBhbmQgZGlzdGluY3Rpb24gYmV0d2VlbiAwIGFuZCBubyBpbmZvcm1hdGlvbiBpcyBjcnVjaWFsXG4gIGlmIChyZXMuaGVhZGVyc1snY29udGVudC1sZW5ndGgnXSA9PT0gJzAnKSB7XG4gICAgLy8gV2Uga25vdyB0aGF0IHRoZSBib2R5IGlzIGVtcHR5ICh1bmZvcnR1bmF0ZWx5LCB0aGlzIGNoZWNrIGRvZXMgbm90IGNvdmVyIGNodW5rZWQgZW5jb2RpbmcpXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59XG4iXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBOztBQUVBLE1BQU07RUFBRUE7QUFBTyxDQUFDLEdBQUdDLE9BQU8sQ0FBQyxLQUFLLENBQUM7QUFDakMsTUFBTUMsTUFBTSxHQUFHRCxPQUFPLENBQUMsUUFBUSxDQUFDO0FBQ2hDLE1BQU1FLEtBQUssR0FBR0YsT0FBTyxDQUFDLE9BQU8sQ0FBQztBQUM5QixNQUFNRyxJQUFJLEdBQUdILE9BQU8sQ0FBQyxNQUFNLENBQUM7QUFDNUIsTUFBTUksRUFBRSxHQUFHSixPQUFPLENBQUMsSUFBSSxDQUFDO0FBQ3hCLE1BQU1LLElBQUksR0FBR0wsT0FBTyxDQUFDLE1BQU0sQ0FBQztBQUM1QixNQUFNTSxJQUFJLEdBQUdOLE9BQU8sQ0FBQyxNQUFNLENBQUM7QUFDNUIsTUFBTU8sRUFBRSxHQUFHUCxPQUFPLENBQUMsSUFBSSxDQUFDO0FBQ3hCLE1BQU1RLElBQUksR0FBR1IsT0FBTyxDQUFDLE1BQU0sQ0FBQztBQUM1QixJQUFJUyxPQUFPLEdBQUdULE9BQU8sQ0FBQyxTQUFTLENBQUM7QUFDaEMsTUFBTVUsUUFBUSxHQUFHVixPQUFPLENBQUMsV0FBVyxDQUFDO0FBQ3JDLE1BQU1X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