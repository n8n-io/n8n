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
        parser = form.parse.bind(form);
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
            if (multipart) {
              // formidable v3 always returns an array with the value in it
              // so we need to flatten it
              if (object) {
                for (const key in object) {
                  const value = object[key];
                  if (Array.isArray(value) && value.length === 1) {
                    object[key] = value[0];
                  } else {
                    object[key] = value;
                  }
                }
              }
              if (files) {
                for (const key in files) {
                  const value = files[key];
                  if (Array.isArray(value) && value.length === 1) {
                    files[key] = value[0];
                  } else {
                    files[key] = value;
                  }
                }
              }
            }
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6WyJmb3JtYXQiLCJyZXF1aXJlIiwiU3RyZWFtIiwiaHR0cHMiLCJodHRwIiwiZnMiLCJ6bGliIiwidXRpbCIsInFzIiwibWltZSIsIm1ldGhvZHMiLCJGb3JtRGF0YSIsImZvcm1pZGFibGUiLCJkZWJ1ZyIsIkNvb2tpZUphciIsInNhZmVTdHJpbmdpZnkiLCJ1dGlscyIsIlJlcXVlc3RCYXNlIiwiaHR0cDIiLCJkZWNvbXByZXNzIiwiUmVzcG9uc2UiLCJtaXhpbiIsImhhc093biIsImlzQnJvdGxpRW5jb2RpbmciLCJpc0d6aXBPckRlZmxhdGVFbmNvZGluZyIsImNob29zZURlY29tcHJlc3NlciIsInJlcXVlc3QiLCJtZXRob2QiLCJ1cmwiLCJleHBvcnRzIiwiUmVxdWVzdCIsImVuZCIsImFyZ3VtZW50cyIsImxlbmd0aCIsIm1vZHVsZSIsImFnZW50Iiwibm9vcCIsImRlZmluZSIsInByb3RvY29scyIsInNlcmlhbGl6ZSIsIm9iaiIsInN0cmluZ2lmeSIsImluZGljZXMiLCJzdHJpY3ROdWxsSGFuZGxpbmciLCJwYXJzZSIsImJ1ZmZlciIsIl9pbml0SGVhZGVycyIsInJlcXVlc3RfIiwiX2hlYWRlciIsImhlYWRlciIsImNhbGwiLCJfZW5hYmxlSHR0cDIiLCJCb29sZWFuIiwicHJvY2VzcyIsImVudiIsIkhUVFAyX1RFU1QiLCJfYWdlbnQiLCJfZm9ybURhdGEiLCJ3cml0YWJsZSIsIl9yZWRpcmVjdHMiLCJyZWRpcmVjdHMiLCJjb29raWVzIiwiX3F1ZXJ5IiwicXNSYXciLCJfcmVkaXJlY3RMaXN0IiwiX3N0cmVhbVJlcXVlc3QiLCJfbG9va3VwIiwidW5kZWZpbmVkIiwib25jZSIsImNsZWFyVGltZW91dCIsImJpbmQiLCJpbmhlcml0cyIsInByb3RvdHlwZSIsImJvb2wiLCJFcnJvciIsImF0dGFjaCIsImZpZWxkIiwiZmlsZSIsIm9wdGlvbnMiLCJfZGF0YSIsIm8iLCJmaWxlbmFtZSIsImNyZWF0ZVJlYWRTdHJlYW0iLCJvbiIsImVycm9yIiwiZm9ybURhdGEiLCJfZ2V0Rm9ybURhdGEiLCJlbWl0IiwicGF0aCIsImFwcGVuZCIsImNhbGxlZCIsImNhbGxiYWNrIiwiYWJvcnQiLCJsb29rdXAiLCJ0eXBlIiwic2V0IiwiaW5jbHVkZXMiLCJnZXRUeXBlIiwiYWNjZXB0IiwicXVlcnkiLCJ2YWx1ZSIsInB1c2giLCJPYmplY3QiLCJhc3NpZ24iLCJ3cml0ZSIsImRhdGEiLCJlbmNvZGluZyIsInBpcGUiLCJzdHJlYW0iLCJwaXBlZCIsIl9waXBlQ29udGludWUiLCJyZXEiLCJyZXMiLCJpc1JlZGlyZWN0Iiwic3RhdHVzQ29kZSIsIl9tYXhSZWRpcmVjdHMiLCJfcmVkaXJlY3QiLCJfZW1pdFJlc3BvbnNlIiwiX2Fib3J0ZWQiLCJfc2hvdWxkRGVjb21wcmVzcyIsImRlY29tcHJlc3NlciIsImNvZGUiLCJfYnVmZmVyIiwiaGVhZGVycyIsImxvY2F0aW9uIiwiVVJMIiwiaHJlZiIsInJlc3VtZSIsImdldEhlYWRlcnMiLCJfaGVhZGVycyIsImNoYW5nZXNPcmlnaW4iLCJob3N0IiwiY2xlYW5IZWFkZXIiLCJfZW5kQ2FsbGVkIiwiX2VtaXRSZWRpcmVjdCIsIl9jYWxsYmFjayIsImF1dGgiLCJ1c2VyIiwicGFzcyIsImVuY29kZXIiLCJzdHJpbmciLCJCdWZmZXIiLCJmcm9tIiwidG9TdHJpbmciLCJfYXV0aCIsImNhIiwiY2VydCIsIl9jYSIsImtleSIsIl9rZXkiLCJwZngiLCJpc0J1ZmZlciIsIl9wZngiLCJfcGFzc3BocmFzZSIsInBhc3NwaHJhc2UiLCJfY2VydCIsImRpc2FibGVUTFNDZXJ0cyIsIl9kaXNhYmxlVExTQ2VydHMiLCJfZmluYWxpemVRdWVyeVN0cmluZyIsImVyciIsInVybFN0cmluZyIsInJldHJpZXMiLCJfcmV0cmllcyIsImluZGV4T2YiLCJwcm90b2NvbCIsInBhdGhuYW1lIiwic2VhcmNoIiwidGVzdCIsInNwbGl0Iiwic29ja2V0UGF0aCIsImhvc3RuYW1lIiwicmVwbGFjZSIsIl9jb25uZWN0T3ZlcnJpZGUiLCJtYXRjaCIsIm5ld0hvc3QiLCJuZXdQb3J0IiwicG9ydCIsIm5vcm1hbGl6ZUhvc3RuYW1lIiwicmVqZWN0VW5hdXRob3JpemVkIiwiTk9ERV9UTFNfUkVKRUNUX1VOQVVUSE9SSVpFRCIsInNlcnZlcm5hbWUiLCJfdHJ1c3RMb2NhbGhvc3QiLCJtb2R1bGVfIiwic2V0UHJvdG9jb2wiLCJzZXROb0RlbGF5Iiwic2V0SGVhZGVyIiwicmVzcG9uc2UiLCJ1c2VybmFtZSIsInBhc3N3b3JkIiwidGVtcG9yYXJ5SmFyIiwic2V0Q29va2llcyIsImNvb2tpZSIsImdldENvb2tpZXMiLCJDb29raWVBY2Nlc3NJbmZvIiwiQWxsIiwidG9WYWx1ZVN0cmluZyIsIl9zaG91bGRSZXRyeSIsIl9yZXRyeSIsImZuIiwiY29uc29sZSIsIndhcm4iLCJfaXNSZXNwb25zZU9LIiwibWVzc2FnZSIsIlNUQVRVU19DT0RFUyIsInN0YXR1cyIsIl9tYXhSZXRyaWVzIiwibGlzdGVuZXJzIiwiX2lzSG9zdCIsIm9iamVjdCIsImJvZHkiLCJmaWxlcyIsIl9lbmQiLCJfc2V0VGltZW91dHMiLCJfaGVhZGVyU2VudCIsImNvbnRlbnRUeXBlIiwiZ2V0SGVhZGVyIiwiX3NlcmlhbGl6ZXIiLCJpc0pTT04iLCJieXRlTGVuZ3RoIiwiX3Jlc3BvbnNlVGltZW91dFRpbWVyIiwibWF4IiwidG9Mb3dlckNhc2UiLCJ0cmltIiwibXVsdGlwYXJ0IiwicmVkaXJlY3QiLCJyZXNwb25zZVR5cGUiLCJfcmVzcG9uc2VUeXBlIiwicGFyc2VyIiwiX3BhcnNlciIsImltYWdlIiwiZm9ybSIsImlzQmluYXJ5IiwidGV4dCIsImlzVGV4dCIsIl9yZXNCdWZmZXJlZCIsInBhcnNlckhhbmRsZXNFbmQiLCJyZXNwb25zZUJ5dGVzTGVmdCIsIl9tYXhSZXNwb25zZVNpemUiLCJidWYiLCJkZXN0cm95IiwidGltZWRvdXQiLCJBcnJheSIsImlzQXJyYXkiLCJnZXRQcm9ncmVzc01vbml0b3IiLCJsZW5ndGhDb21wdXRhYmxlIiwidG90YWwiLCJsb2FkZWQiLCJwcm9ncmVzcyIsIlRyYW5zZm9ybSIsIl90cmFuc2Zvcm0iLCJjaHVuayIsImRpcmVjdGlvbiIsImJ1ZmZlclRvQ2h1bmtzIiwiY2h1bmtTaXplIiwiY2h1bmtpbmciLCJSZWFkYWJsZSIsInRvdGFsTGVuZ3RoIiwicmVtYWluZGVyIiwiY3V0b2ZmIiwiaSIsInNsaWNlIiwicmVtYWluZGVyQnVmZmVyIiwiZ2V0TGVuZ3RoIiwiaGFzTm9uRW1wdHlSZXNwb25zZUNvbnRlbnQiLCJjb25uZWN0IiwiY29ubmVjdE92ZXJyaWRlIiwidHJ1c3RMb2NhbGhvc3QiLCJ0b2dnbGUiLCJuYW1lIiwidG9VcHBlckNhc2UiLCJzZW5kIiwicGFydHMiLCJzdWJ0eXBlIiwicmVnaXN0cnkiXSwic291cmNlcyI6WyIuLi8uLi9zcmMvbm9kZS9pbmRleC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxuY29uc3QgeyBmb3JtYXQgfSA9IHJlcXVpcmUoJ3VybCcpO1xuY29uc3QgU3RyZWFtID0gcmVxdWlyZSgnc3RyZWFtJyk7XG5jb25zdCBodHRwcyA9IHJlcXVpcmUoJ2h0dHBzJyk7XG5jb25zdCBodHRwID0gcmVxdWlyZSgnaHR0cCcpO1xuY29uc3QgZnMgPSByZXF1aXJlKCdmcycpO1xuY29uc3QgemxpYiA9IHJlcXVpcmUoJ3psaWInKTtcbmNvbnN0IHV0aWwgPSByZXF1aXJlKCd1dGlsJyk7XG5jb25zdCBxcyA9IHJlcXVpcmUoJ3FzJyk7XG5jb25zdCBtaW1lID0gcmVxdWlyZSgnbWltZScpO1xubGV0IG1ldGhvZHMgPSByZXF1aXJlKCdtZXRob2RzJyk7XG5jb25zdCBGb3JtRGF0YSA9IHJlcXVpcmUoJ2Zvcm0tZGF0YScpO1xuY29uc3QgZm9ybWlkYWJsZSA9IHJlcXVpcmUoJ2Zvcm1pZGFibGUnKTtcbmNvbnN0IGRlYnVnID0gcmVxdWlyZSgnZGVidWcnKSgnc3VwZXJhZ2VudCcpO1xuY29uc3QgQ29va2llSmFyID0gcmVxdWlyZSgnY29va2llamFyJyk7XG5jb25zdCBzYWZlU3RyaW5naWZ5ID0gcmVxdWlyZSgnZmFzdC1zYWZlLXN0cmluZ2lmeScpO1xuXG5jb25zdCB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzJyk7XG5jb25zdCBSZXF1ZXN0QmFzZSA9IHJlcXVpcmUoJy4uL3JlcXVlc3QtYmFzZScpO1xuY29uc3QgaHR0cDIgPSByZXF1aXJlKCcuL2h0dHAyd3JhcHBlcicpO1xuY29uc3QgeyBkZWNvbXByZXNzIH0gPSByZXF1aXJlKCcuL3VuemlwJyk7XG5jb25zdCBSZXNwb25zZSA9IHJlcXVpcmUoJy4vcmVzcG9uc2UnKTtcblxuY29uc3QgeyBtaXhpbiwgaGFzT3duLCBpc0Jyb3RsaUVuY29kaW5nLCBpc0d6aXBPckRlZmxhdGVFbmNvZGluZyB9ID0gdXRpbHM7XG5jb25zdCB7IGNob29zZURlY29tcHJlc3NlciB9ID0gcmVxdWlyZSgnLi9kZWNvbXByZXNzJyk7XG5cbmZ1bmN0aW9uIHJlcXVlc3QobWV0aG9kLCB1cmwpIHtcbiAgLy8gY2FsbGJhY2tcbiAgaWYgKHR5cGVvZiB1cmwgPT09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gbmV3IGV4cG9ydHMuUmVxdWVzdCgnR0VUJywgbWV0aG9kKS5lbmQodXJsKTtcbiAgfVxuXG4gIC8vIHVybCBmaXJzdFxuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSkge1xuICAgIHJldHVybiBuZXcgZXhwb3J0cy5SZXF1ZXN0KCdHRVQnLCBtZXRob2QpO1xuICB9XG5cbiAgcmV0dXJuIG5ldyBleHBvcnRzLlJlcXVlc3QobWV0aG9kLCB1cmwpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHJlcXVlc3Q7XG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHM7XG5cbi8qKlxuICogRXhwb3NlIGBSZXF1ZXN0YC5cbiAqL1xuXG5leHBvcnRzLlJlcXVlc3QgPSBSZXF1ZXN0O1xuXG4vKipcbiAqIEV4cG9zZSB0aGUgYWdlbnQgZnVuY3Rpb25cbiAqL1xuXG5leHBvcnRzLmFnZW50ID0gcmVxdWlyZSgnLi9hZ2VudCcpO1xuXG4vKipcbiAqIE5vb3AuXG4gKi9cblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbi8qKlxuICogRXhwb3NlIGBSZXNwb25zZWAuXG4gKi9cblxuZXhwb3J0cy5SZXNwb25zZSA9IFJlc3BvbnNlO1xuXG4vKipcbiAqIERlZmluZSBcImZvcm1cIiBtaW1lIHR5cGUuXG4gKi9cblxubWltZS5kZWZpbmUoXG4gIHtcbiAgICAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkJzogWydmb3JtJywgJ3VybGVuY29kZWQnLCAnZm9ybS1kYXRhJ11cbiAgfSxcbiAgdHJ1ZVxuKTtcblxuLyoqXG4gKiBQcm90b2NvbCBtYXAuXG4gKi9cblxuZXhwb3J0cy5wcm90b2NvbHMgPSB7XG4gICdodHRwOic6IGh0dHAsXG4gICdodHRwczonOiBodHRwcyxcbiAgJ2h0dHAyOic6IGh0dHAyXG59O1xuXG4vKipcbiAqIERlZmF1bHQgc2VyaWFsaXphdGlvbiBtYXAuXG4gKlxuICogICAgIHN1cGVyYWdlbnQuc2VyaWFsaXplWydhcHBsaWNhdGlvbi94bWwnXSA9IGZ1bmN0aW9uKG9iail7XG4gKiAgICAgICByZXR1cm4gJ2dlbmVyYXRlZCB4bWwgaGVyZSc7XG4gKiAgICAgfTtcbiAqXG4gKi9cblxuZXhwb3J0cy5zZXJpYWxpemUgPSB7XG4gICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnOiAob2JqKSA9PiB7XG4gICAgcmV0dXJuIHFzLnN0cmluZ2lmeShvYmosIHsgaW5kaWNlczogZmFsc2UsIHN0cmljdE51bGxIYW5kbGluZzogdHJ1ZSB9KTtcbiAgfSxcbiAgJ2FwcGxpY2F0aW9uL2pzb24nOiBzYWZlU3RyaW5naWZ5XG59O1xuXG4vKipcbiAqIERlZmF1bHQgcGFyc2Vycy5cbiAqXG4gKiAgICAgc3VwZXJhZ2VudC5wYXJzZVsnYXBwbGljYXRpb24veG1sJ10gPSBmdW5jdGlvbihyZXMsIGZuKXtcbiAqICAgICAgIGZuKG51bGwsIHJlcyk7XG4gKiAgICAgfTtcbiAqXG4gKi9cblxuZXhwb3J0cy5wYXJzZSA9IHJlcXVpcmUoJy4vcGFyc2VycycpO1xuXG4vKipcbiAqIERlZmF1bHQgYnVmZmVyaW5nIG1hcC4gQ2FuIGJlIHVzZWQgdG8gc2V0IGNlcnRhaW5cbiAqIHJlc3BvbnNlIHR5cGVzIHRvIGJ1ZmZlci9ub3QgYnVmZmVyLlxuICpcbiAqICAgICBzdXBlcmFnZW50LmJ1ZmZlclsnYXBwbGljYXRpb24veG1sJ10gPSB0cnVlO1xuICovXG5leHBvcnRzLmJ1ZmZlciA9IHt9O1xuXG4vKipcbiAqIEluaXRpYWxpemUgaW50ZXJuYWwgaGVhZGVyIHRyYWNraW5nIHByb3BlcnRpZXMgb24gYSByZXF1ZXN0IGluc3RhbmNlLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSByZXEgdGhlIGluc3RhbmNlXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gX2luaXRIZWFkZXJzKHJlcXVlc3RfKSB7XG4gIHJlcXVlc3RfLl9oZWFkZXIgPSB7XG4gICAgLy8gY29lcmNlcyBoZWFkZXIgbmFtZXMgdG8gbG93ZXJjYXNlXG4gIH07XG4gIHJlcXVlc3RfLmhlYWRlciA9IHtcbiAgICAvLyBwcmVzZXJ2ZXMgaGVhZGVyIG5hbWUgY2FzZVxuICB9O1xufVxuXG4vKipcbiAqIEluaXRpYWxpemUgYSBuZXcgYFJlcXVlc3RgIHdpdGggdGhlIGdpdmVuIGBtZXRob2RgIGFuZCBgdXJsYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbWV0aG9kXG4gKiBAcGFyYW0ge1N0cmluZ3xPYmplY3R9IHVybFxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5mdW5jdGlvbiBSZXF1ZXN0KG1ldGhvZCwgdXJsKSB7XG4gIFN0cmVhbS5jYWxsKHRoaXMpO1xuICBpZiAodHlwZW9mIHVybCAhPT0gJ3N0cmluZycpIHVybCA9IGZvcm1hdCh1cmwpO1xuICB0aGlzLl9lbmFibGVIdHRwMiA9IEJvb2xlYW4ocHJvY2Vzcy5lbnYuSFRUUDJfVEVTVCk7IC8vIGludGVybmFsIG9ubHlcbiAgdGhpcy5fYWdlbnQgPSBmYWxzZTtcbiAgdGhpcy5fZm9ybURhdGEgPSBudWxsO1xuICB0aGlzLm1ldGhvZCA9IG1ldGhvZDtcbiAgdGhpcy51cmwgPSB1cmw7XG4gIF9pbml0SGVhZGVycyh0aGlzKTtcbiAgdGhpcy53cml0YWJsZSA9IHRydWU7XG4gIHRoaXMuX3JlZGlyZWN0cyA9IDA7XG4gIHRoaXMucmVkaXJlY3RzKG1ldGhvZCA9PT0gJ0hFQUQnID8gMCA6IDUpO1xuICB0aGlzLmNvb2tpZXMgPSAnJztcbiAgdGhpcy5xcyA9IHt9O1xuICB0aGlzLl9xdWVyeSA9IFtdO1xuICB0aGlzLnFzUmF3ID0gdGhpcy5fcXVlcnk7IC8vIFVudXNlZCwgZm9yIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5IG9ubHlcbiAgdGhpcy5fcmVkaXJlY3RMaXN0ID0gW107XG4gIHRoaXMuX3N0cmVhbVJlcXVlc3QgPSBmYWxzZTtcbiAgdGhpcy5fbG9va3VwID0gdW5kZWZpbmVkO1xuICB0aGlzLm9uY2UoJ2VuZCcsIHRoaXMuY2xlYXJUaW1lb3V0LmJpbmQodGhpcykpO1xufVxuXG4vKipcbiAqIEluaGVyaXQgZnJvbSBgU3RyZWFtYCAod2hpY2ggaW5oZXJpdHMgZnJvbSBgRXZlbnRFbWl0dGVyYCkuXG4gKiBNaXhpbiBgUmVxdWVzdEJhc2VgLlxuICovXG51dGlsLmluaGVyaXRzKFJlcXVlc3QsIFN0cmVhbSk7XG5cbm1peGluKFJlcXVlc3QucHJvdG90eXBlLCBSZXF1ZXN0QmFzZS5wcm90b3R5cGUpO1xuXG4vKipcbiAqIEVuYWJsZSBvciBEaXNhYmxlIGh0dHAyLlxuICpcbiAqIEVuYWJsZSBodHRwMi5cbiAqXG4gKiBgYGAganNcbiAqIHJlcXVlc3QuZ2V0KCdodHRwOi8vbG9jYWxob3N0LycpXG4gKiAgIC5odHRwMigpXG4gKiAgIC5lbmQoY2FsbGJhY2spO1xuICpcbiAqIHJlcXVlc3QuZ2V0KCdodHRwOi8vbG9jYWxob3N0LycpXG4gKiAgIC5odHRwMih0cnVlKVxuICogICAuZW5kKGNhbGxiYWNrKTtcbiAqIGBgYFxuICpcbiAqIERpc2FibGUgaHR0cDIuXG4gKlxuICogYGBgIGpzXG4gKiByZXF1ZXN0ID0gcmVxdWVzdC5odHRwMigpO1xuICogcmVxdWVzdC5nZXQoJ2h0dHA6Ly9sb2NhbGhvc3QvJylcbiAqICAgLmh0dHAyKGZhbHNlKVxuICogICAuZW5kKGNhbGxiYWNrKTtcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gZW5hYmxlXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdC5wcm90b3R5cGUuaHR0cDIgPSBmdW5jdGlvbiAoYm9vbCkge1xuICBpZiAoZXhwb3J0cy5wcm90b2NvbHNbJ2h0dHAyOiddID09PSB1bmRlZmluZWQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAnc3VwZXJhZ2VudDogdGhpcyB2ZXJzaW9uIG9mIE5vZGUuanMgZG9lcyBub3Qgc3VwcG9ydCBodHRwMidcbiAgICApO1xuICB9XG5cbiAgdGhpcy5fZW5hYmxlSHR0cDIgPSBib29sID09PSB1bmRlZmluZWQgPyB0cnVlIDogYm9vbDtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFF1ZXVlIHRoZSBnaXZlbiBgZmlsZWAgYXMgYW4gYXR0YWNobWVudCB0byB0aGUgc3BlY2lmaWVkIGBmaWVsZGAsXG4gKiB3aXRoIG9wdGlvbmFsIGBvcHRpb25zYCAob3IgZmlsZW5hbWUpLlxuICpcbiAqIGBgYCBqc1xuICogcmVxdWVzdC5wb3N0KCdodHRwOi8vbG9jYWxob3N0L3VwbG9hZCcpXG4gKiAgIC5hdHRhY2goJ2ZpZWxkJywgQnVmZmVyLmZyb20oJzxiPkhlbGxvIHdvcmxkPC9iPicpLCAnaGVsbG8uaHRtbCcpXG4gKiAgIC5lbmQoY2FsbGJhY2spO1xuICogYGBgXG4gKlxuICogQSBmaWxlbmFtZSBtYXkgYWxzbyBiZSB1c2VkOlxuICpcbiAqIGBgYCBqc1xuICogcmVxdWVzdC5wb3N0KCdodHRwOi8vbG9jYWxob3N0L3VwbG9hZCcpXG4gKiAgIC5hdHRhY2goJ2ZpbGVzJywgJ2ltYWdlLmpwZycpXG4gKiAgIC5lbmQoY2FsbGJhY2spO1xuICogYGBgXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGZpZWxkXG4gKiBAcGFyYW0ge1N0cmluZ3xmcy5SZWFkU3RyZWFtfEJ1ZmZlcn0gZmlsZVxuICogQHBhcmFtIHtTdHJpbmd8T2JqZWN0fSBvcHRpb25zXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdC5wcm90b3R5cGUuYXR0YWNoID0gZnVuY3Rpb24gKGZpZWxkLCBmaWxlLCBvcHRpb25zKSB7XG4gIGlmIChmaWxlKSB7XG4gICAgaWYgKHRoaXMuX2RhdGEpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcInN1cGVyYWdlbnQgY2FuJ3QgbWl4IC5zZW5kKCkgYW5kIC5hdHRhY2goKVwiKTtcbiAgICB9XG5cbiAgICBsZXQgbyA9IG9wdGlvbnMgfHwge307XG4gICAgaWYgKHR5cGVvZiBvcHRpb25zID09PSAnc3RyaW5nJykge1xuICAgICAgbyA9IHsgZmlsZW5hbWU6IG9wdGlvbnMgfTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIGZpbGUgPT09ICdzdHJpbmcnKSB7XG4gICAgICBpZiAoIW8uZmlsZW5hbWUpIG8uZmlsZW5hbWUgPSBmaWxlO1xuICAgICAgZGVidWcoJ2NyZWF0aW5nIGBmcy5SZWFkU3RyZWFtYCBpbnN0YW5jZSBmb3IgZmlsZTogJXMnLCBmaWxlKTtcbiAgICAgIGZpbGUgPSBmcy5jcmVhdGVSZWFkU3RyZWFtKGZpbGUpO1xuICAgICAgZmlsZS5vbignZXJyb3InLCAoZXJyb3IpID0+IHtcbiAgICAgICAgY29uc3QgZm9ybURhdGEgPSB0aGlzLl9nZXRGb3JtRGF0YSgpO1xuICAgICAgICBmb3JtRGF0YS5lbWl0KCdlcnJvcicsIGVycm9yKTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSBpZiAoIW8uZmlsZW5hbWUgJiYgZmlsZS5wYXRoKSB7XG4gICAgICBvLmZpbGVuYW1lID0gZmlsZS5wYXRoO1xuICAgIH1cblxuICAgIHRoaXMuX2dldEZvcm1EYXRhKCkuYXBwZW5kKGZpZWxkLCBmaWxlLCBvKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuUmVxdWVzdC5wcm90b3R5cGUuX2dldEZvcm1EYXRhID0gZnVuY3Rpb24gKCkge1xuICBpZiAoIXRoaXMuX2Zvcm1EYXRhKSB7XG4gICAgdGhpcy5fZm9ybURhdGEgPSBuZXcgRm9ybURhdGEoKTtcbiAgICB0aGlzLl9mb3JtRGF0YS5vbignZXJyb3InLCAoZXJyb3IpID0+IHtcbiAgICAgIGRlYnVnKCdGb3JtRGF0YSBlcnJvcicsIGVycm9yKTtcbiAgICAgIGlmICh0aGlzLmNhbGxlZCkge1xuICAgICAgICAvLyBUaGUgcmVxdWVzdCBoYXMgYWxyZWFkeSBmaW5pc2hlZCBhbmQgdGhlIGNhbGxiYWNrIHdhcyBjYWxsZWQuXG4gICAgICAgIC8vIFNpbGVudGx5IGlnbm9yZSB0aGUgZXJyb3IuXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdGhpcy5jYWxsYmFjayhlcnJvcik7XG4gICAgICB0aGlzLmFib3J0KCk7XG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4gdGhpcy5fZm9ybURhdGE7XG59O1xuXG4vKipcbiAqIEdldHMvc2V0cyB0aGUgYEFnZW50YCB0byB1c2UgZm9yIHRoaXMgSFRUUCByZXF1ZXN0LiBUaGUgZGVmYXVsdCAoaWYgdGhpc1xuICogZnVuY3Rpb24gaXMgbm90IGNhbGxlZCkgaXMgdG8gb3B0IG91dCBvZiBjb25uZWN0aW9uIHBvb2xpbmcgKGBhZ2VudDogZmFsc2VgKS5cbiAqXG4gKiBAcGFyYW0ge2h0dHAuQWdlbnR9IGFnZW50XG4gKiBAcmV0dXJuIHtodHRwLkFnZW50fVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0LnByb3RvdHlwZS5hZ2VudCA9IGZ1bmN0aW9uIChhZ2VudCkge1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHRoaXMuX2FnZW50O1xuICB0aGlzLl9hZ2VudCA9IGFnZW50O1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogR2V0cy9zZXRzIHRoZSBgbG9va3VwYCBmdW5jdGlvbiB0byB1c2UgY3VzdG9tIEROUyByZXNvbHZlci5cbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBsb29rdXBcbiAqIEByZXR1cm4ge0Z1bmN0aW9ufVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0LnByb3RvdHlwZS5sb29rdXAgPSBmdW5jdGlvbiAobG9va3VwKSB7XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSByZXR1cm4gdGhpcy5fbG9va3VwO1xuICB0aGlzLl9sb29rdXAgPSBsb29rdXA7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBTZXQgX0NvbnRlbnQtVHlwZV8gcmVzcG9uc2UgaGVhZGVyIHBhc3NlZCB0aHJvdWdoIGBtaW1lLmdldFR5cGUoKWAuXG4gKlxuICogRXhhbXBsZXM6XG4gKlxuICogICAgICByZXF1ZXN0LnBvc3QoJy8nKVxuICogICAgICAgIC50eXBlKCd4bWwnKVxuICogICAgICAgIC5zZW5kKHhtbHN0cmluZylcbiAqICAgICAgICAuZW5kKGNhbGxiYWNrKTtcbiAqXG4gKiAgICAgIHJlcXVlc3QucG9zdCgnLycpXG4gKiAgICAgICAgLnR5cGUoJ2pzb24nKVxuICogICAgICAgIC5zZW5kKGpzb25zdHJpbmcpXG4gKiAgICAgICAgLmVuZChjYWxsYmFjayk7XG4gKlxuICogICAgICByZXF1ZXN0LnBvc3QoJy8nKVxuICogICAgICAgIC50eXBlKCdhcHBsaWNhdGlvbi9qc29uJylcbiAqICAgICAgICAuc2VuZChqc29uc3RyaW5nKVxuICogICAgICAgIC5lbmQoY2FsbGJhY2spO1xuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB0eXBlXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdC5wcm90b3R5cGUudHlwZSA9IGZ1bmN0aW9uICh0eXBlKSB7XG4gIHJldHVybiB0aGlzLnNldChcbiAgICAnQ29udGVudC1UeXBlJyxcbiAgICB0eXBlLmluY2x1ZGVzKCcvJykgPyB0eXBlIDogbWltZS5nZXRUeXBlKHR5cGUpXG4gICk7XG59O1xuXG4vKipcbiAqIFNldCBfQWNjZXB0XyByZXNwb25zZSBoZWFkZXIgcGFzc2VkIHRocm91Z2ggYG1pbWUuZ2V0VHlwZSgpYC5cbiAqXG4gKiBFeGFtcGxlczpcbiAqXG4gKiAgICAgIHN1cGVyYWdlbnQudHlwZXMuanNvbiA9ICdhcHBsaWNhdGlvbi9qc29uJztcbiAqXG4gKiAgICAgIHJlcXVlc3QuZ2V0KCcvYWdlbnQnKVxuICogICAgICAgIC5hY2NlcHQoJ2pzb24nKVxuICogICAgICAgIC5lbmQoY2FsbGJhY2spO1xuICpcbiAqICAgICAgcmVxdWVzdC5nZXQoJy9hZ2VudCcpXG4gKiAgICAgICAgLmFjY2VwdCgnYXBwbGljYXRpb24vanNvbicpXG4gKiAgICAgICAgLmVuZChjYWxsYmFjayk7XG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGFjY2VwdFxuICogQHJldHVybiB7UmVxdWVzdH0gZm9yIGNoYWluaW5nXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlcXVlc3QucHJvdG90eXBlLmFjY2VwdCA9IGZ1bmN0aW9uICh0eXBlKSB7XG4gIHJldHVybiB0aGlzLnNldCgnQWNjZXB0JywgdHlwZS5pbmNsdWRlcygnLycpID8gdHlwZSA6IG1pbWUuZ2V0VHlwZSh0eXBlKSk7XG59O1xuXG4vKipcbiAqIEFkZCBxdWVyeS1zdHJpbmcgYHZhbGAuXG4gKlxuICogRXhhbXBsZXM6XG4gKlxuICogICByZXF1ZXN0LmdldCgnL3Nob2VzJylcbiAqICAgICAucXVlcnkoJ3NpemU9MTAnKVxuICogICAgIC5xdWVyeSh7IGNvbG9yOiAnYmx1ZScgfSlcbiAqXG4gKiBAcGFyYW0ge09iamVjdHxTdHJpbmd9IHZhbFxuICogQHJldHVybiB7UmVxdWVzdH0gZm9yIGNoYWluaW5nXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlcXVlc3QucHJvdG90eXBlLnF1ZXJ5ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgdGhpcy5fcXVlcnkucHVzaCh2YWx1ZSk7XG4gIH0gZWxzZSB7XG4gICAgT2JqZWN0LmFzc2lnbih0aGlzLnFzLCB2YWx1ZSk7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogV3JpdGUgcmF3IGBkYXRhYCAvIGBlbmNvZGluZ2AgdG8gdGhlIHNvY2tldC5cbiAqXG4gKiBAcGFyYW0ge0J1ZmZlcnxTdHJpbmd9IGRhdGFcbiAqIEBwYXJhbSB7U3RyaW5nfSBlbmNvZGluZ1xuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdC5wcm90b3R5cGUud3JpdGUgPSBmdW5jdGlvbiAoZGF0YSwgZW5jb2RpbmcpIHtcbiAgY29uc3QgcmVxdWVzdF8gPSB0aGlzLnJlcXVlc3QoKTtcbiAgaWYgKCF0aGlzLl9zdHJlYW1SZXF1ZXN0KSB7XG4gICAgdGhpcy5fc3RyZWFtUmVxdWVzdCA9IHRydWU7XG4gIH1cblxuICByZXR1cm4gcmVxdWVzdF8ud3JpdGUoZGF0YSwgZW5jb2RpbmcpO1xufTtcblxuLyoqXG4gKiBQaXBlIHRoZSByZXF1ZXN0IGJvZHkgdG8gYHN0cmVhbWAuXG4gKlxuICogQHBhcmFtIHtTdHJlYW19IHN0cmVhbVxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAqIEByZXR1cm4ge1N0cmVhbX1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdC5wcm90b3R5cGUucGlwZSA9IGZ1bmN0aW9uIChzdHJlYW0sIG9wdGlvbnMpIHtcbiAgdGhpcy5waXBlZCA9IHRydWU7IC8vIEhBQ0suLi5cbiAgdGhpcy5idWZmZXIoZmFsc2UpO1xuICB0aGlzLmVuZCgpO1xuICByZXR1cm4gdGhpcy5fcGlwZUNvbnRpbnVlKHN0cmVhbSwgb3B0aW9ucyk7XG59O1xuXG5SZXF1ZXN0LnByb3RvdHlwZS5fcGlwZUNvbnRpbnVlID0gZnVuY3Rpb24gKHN0cmVhbSwgb3B0aW9ucykge1xuICB0aGlzLnJlcS5vbmNlKCdyZXNwb25zZScsIChyZXMpID0+IHtcbiAgICAvLyByZWRpcmVjdFxuICAgIGlmIChcbiAgICAgIGlzUmVkaXJlY3QocmVzLnN0YXR1c0NvZGUpICYmXG4gICAgICB0aGlzLl9yZWRpcmVjdHMrKyAhPT0gdGhpcy5fbWF4UmVkaXJlY3RzXG4gICAgKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcmVkaXJlY3QocmVzKSA9PT0gdGhpc1xuICAgICAgICA/IHRoaXMuX3BpcGVDb250aW51ZShzdHJlYW0sIG9wdGlvbnMpXG4gICAgICAgIDogdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIHRoaXMucmVzID0gcmVzO1xuICAgIHRoaXMuX2VtaXRSZXNwb25zZSgpO1xuICAgIGlmICh0aGlzLl9hYm9ydGVkKSByZXR1cm47XG5cbiAgICBpZiAodGhpcy5fc2hvdWxkRGVjb21wcmVzcyhyZXMpKSB7XG5cbiAgICAgIGxldCBkZWNvbXByZXNzZXIgPSBjaG9vc2VEZWNvbXByZXNzZXIocmVzKTtcblxuICAgICAgZGVjb21wcmVzc2VyLm9uKCdlcnJvcicsIChlcnJvcikgPT4ge1xuICAgICAgICBpZiAoZXJyb3IgJiYgZXJyb3IuY29kZSA9PT0gJ1pfQlVGX0VSUk9SJykge1xuICAgICAgICAgIC8vIHVuZXhwZWN0ZWQgZW5kIG9mIGZpbGUgaXMgaWdub3JlZCBieSBicm93c2VycyBhbmQgY3VybFxuICAgICAgICAgIHN0cmVhbS5lbWl0KCdlbmQnKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBzdHJlYW0uZW1pdCgnZXJyb3InLCBlcnJvcik7XG4gICAgICB9KTtcbiAgICAgIHJlcy5waXBlKGRlY29tcHJlc3NlcikucGlwZShzdHJlYW0sIG9wdGlvbnMpO1xuICAgICAgLy8gZG9uJ3QgZW1pdCAnZW5kJyB1bnRpbCBkZWNvbXByZXNzZXIgaGFzIGNvbXBsZXRlZCB3cml0aW5nIGFsbCBpdHMgZGF0YS5cbiAgICAgIGRlY29tcHJlc3Nlci5vbmNlKCdlbmQnLCAoKSA9PiB0aGlzLmVtaXQoJ2VuZCcpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVzLnBpcGUoc3RyZWFtLCBvcHRpb25zKTtcbiAgICAgIHJlcy5vbmNlKCdlbmQnLCAoKSA9PiB0aGlzLmVtaXQoJ2VuZCcpKTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gc3RyZWFtO1xufTtcblxuLyoqXG4gKiBFbmFibGUgLyBkaXNhYmxlIGJ1ZmZlcmluZy5cbiAqXG4gKiBAcmV0dXJuIHtCb29sZWFufSBbdmFsXVxuICogQHJldHVybiB7UmVxdWVzdH0gZm9yIGNoYWluaW5nXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlcXVlc3QucHJvdG90eXBlLmJ1ZmZlciA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICB0aGlzLl9idWZmZXIgPSB2YWx1ZSAhPT0gZmFsc2U7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZWRpcmVjdCB0byBgdXJsXG4gKlxuICogQHBhcmFtIHtJbmNvbWluZ01lc3NhZ2V9IHJlc1xuICogQHJldHVybiB7UmVxdWVzdH0gZm9yIGNoYWluaW5nXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5SZXF1ZXN0LnByb3RvdHlwZS5fcmVkaXJlY3QgPSBmdW5jdGlvbiAocmVzKSB7XG4gIGxldCB1cmwgPSByZXMuaGVhZGVycy5sb2NhdGlvbjtcbiAgaWYgKCF1cmwpIHtcbiAgICByZXR1cm4gdGhpcy5jYWxsYmFjayhuZXcgRXJyb3IoJ05vIGxvY2F0aW9uIGhlYWRlciBmb3IgcmVkaXJlY3QnKSwgcmVzKTtcbiAgfVxuXG4gIGRlYnVnKCdyZWRpcmVjdCAlcyAtPiAlcycsIHRoaXMudXJsLCB1cmwpO1xuXG4gIC8vIGxvY2F0aW9uXG4gIHVybCA9IG5ldyBVUkwodXJsLCB0aGlzLnVybCkuaHJlZjtcblxuICAvLyBlbnN1cmUgdGhlIHJlc3BvbnNlIGlzIGJlaW5nIGNvbnN1bWVkXG4gIC8vIHRoaXMgaXMgcmVxdWlyZWQgZm9yIE5vZGUgdjAuMTArXG4gIHJlcy5yZXN1bWUoKTtcblxuICBsZXQgaGVhZGVycyA9IHRoaXMucmVxLmdldEhlYWRlcnMgPyB0aGlzLnJlcS5nZXRIZWFkZXJzKCkgOiB0aGlzLnJlcS5faGVhZGVycztcblxuICBjb25zdCBjaGFuZ2VzT3JpZ2luID0gbmV3IFVSTCh1cmwpLmhvc3QgIT09IG5ldyBVUkwodGhpcy51cmwpLmhvc3Q7XG5cbiAgLy8gaW1wbGVtZW50YXRpb24gb2YgMzAyIGZvbGxvd2luZyBkZWZhY3RvIHN0YW5kYXJkXG4gIGlmIChyZXMuc3RhdHVzQ29kZSA9PT0gMzAxIHx8IHJlcy5zdGF0dXNDb2RlID09PSAzMDIpIHtcbiAgICAvLyBzdHJpcCBDb250ZW50LSogcmVsYXRlZCBmaWVsZHNcbiAgICAvLyBpbiBjYXNlIG9mIFBPU1QgZXRjXG4gICAgaGVhZGVycyA9IHV0aWxzLmNsZWFuSGVhZGVyKGhlYWRlcnMsIGNoYW5nZXNPcmlnaW4pO1xuXG4gICAgLy8gZm9yY2UgR0VUXG4gICAgdGhpcy5tZXRob2QgPSB0aGlzLm1ldGhvZCA9PT0gJ0hFQUQnID8gJ0hFQUQnIDogJ0dFVCc7XG5cbiAgICAvLyBjbGVhciBkYXRhXG4gICAgdGhpcy5fZGF0YSA9IG51bGw7XG4gIH1cblxuICAvLyAzMDMgaXMgYWx3YXlzIEdFVFxuICBpZiAocmVzLnN0YXR1c0NvZGUgPT09IDMwMykge1xuICAgIC8vIHN0cmlwIENvbnRlbnQtKiByZWxhdGVkIGZpZWxkc1xuICAgIC8vIGluIGNhc2Ugb2YgUE9TVCBldGNcbiAgICBoZWFkZXJzID0gdXRpbHMuY2xlYW5IZWFkZXIoaGVhZGVycywgY2hhbmdlc09yaWdpbik7XG5cbiAgICAvLyBmb3JjZSBtZXRob2RcbiAgICB0aGlzLm1ldGhvZCA9ICdHRVQnO1xuXG4gICAgLy8gY2xlYXIgZGF0YVxuICAgIHRoaXMuX2RhdGEgPSBudWxsO1xuICB9XG5cbiAgLy8gMzA3IHByZXNlcnZlcyBtZXRob2RcbiAgLy8gMzA4IHByZXNlcnZlcyBtZXRob2RcbiAgZGVsZXRlIGhlYWRlcnMuaG9zdDtcblxuICBkZWxldGUgdGhpcy5yZXE7XG4gIGRlbGV0ZSB0aGlzLl9mb3JtRGF0YTtcblxuICAvLyByZW1vdmUgYWxsIGFkZCBoZWFkZXIgZXhjZXB0IFVzZXItQWdlbnRcbiAgX2luaXRIZWFkZXJzKHRoaXMpO1xuXG4gIC8vIHJlZGlyZWN0XG4gIHRoaXMucmVzID0gcmVzO1xuICB0aGlzLl9lbmRDYWxsZWQgPSBmYWxzZTtcbiAgdGhpcy51cmwgPSB1cmw7XG4gIHRoaXMucXMgPSB7fTtcbiAgdGhpcy5fcXVlcnkubGVuZ3RoID0gMDtcbiAgdGhpcy5zZXQoaGVhZGVycyk7XG4gIHRoaXMuX2VtaXRSZWRpcmVjdCgpO1xuICB0aGlzLl9yZWRpcmVjdExpc3QucHVzaCh0aGlzLnVybCk7XG4gIHRoaXMuZW5kKHRoaXMuX2NhbGxiYWNrKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFNldCBBdXRob3JpemF0aW9uIGZpZWxkIHZhbHVlIHdpdGggYHVzZXJgIGFuZCBgcGFzc2AuXG4gKlxuICogRXhhbXBsZXM6XG4gKlxuICogICAuYXV0aCgndG9iaScsICdsZWFybmJvb3N0JylcbiAqICAgLmF1dGgoJ3RvYmk6bGVhcm5ib29zdCcpXG4gKiAgIC5hdXRoKCd0b2JpJylcbiAqICAgLmF1dGgoYWNjZXNzVG9rZW4sIHsgdHlwZTogJ2JlYXJlcicgfSlcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gdXNlclxuICogQHBhcmFtIHtTdHJpbmd9IFtwYXNzXVxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSBvcHRpb25zIHdpdGggYXV0aG9yaXphdGlvbiB0eXBlICdiYXNpYycgb3IgJ2JlYXJlcicgKCdiYXNpYycgaXMgZGVmYXVsdClcbiAqIEByZXR1cm4ge1JlcXVlc3R9IGZvciBjaGFpbmluZ1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0LnByb3RvdHlwZS5hdXRoID0gZnVuY3Rpb24gKHVzZXIsIHBhc3MsIG9wdGlvbnMpIHtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHBhc3MgPSAnJztcbiAgaWYgKHR5cGVvZiBwYXNzID09PSAnb2JqZWN0JyAmJiBwYXNzICE9PSBudWxsKSB7XG4gICAgLy8gcGFzcyBpcyBvcHRpb25hbCBhbmQgY2FuIGJlIHJlcGxhY2VkIHdpdGggb3B0aW9uc1xuICAgIG9wdGlvbnMgPSBwYXNzO1xuICAgIHBhc3MgPSAnJztcbiAgfVxuXG4gIGlmICghb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSB7IHR5cGU6ICdiYXNpYycgfTtcbiAgfVxuXG4gIGNvbnN0IGVuY29kZXIgPSAoc3RyaW5nKSA9PiBCdWZmZXIuZnJvbShzdHJpbmcpLnRvU3RyaW5nKCdiYXNlNjQnKTtcblxuICByZXR1cm4gdGhpcy5fYXV0aCh1c2VyLCBwYXNzLCBvcHRpb25zLCBlbmNvZGVyKTtcbn07XG5cbi8qKlxuICogU2V0IHRoZSBjZXJ0aWZpY2F0ZSBhdXRob3JpdHkgb3B0aW9uIGZvciBodHRwcyByZXF1ZXN0LlxuICpcbiAqIEBwYXJhbSB7QnVmZmVyIHwgQXJyYXl9IGNlcnRcbiAqIEByZXR1cm4ge1JlcXVlc3R9IGZvciBjaGFpbmluZ1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0LnByb3RvdHlwZS5jYSA9IGZ1bmN0aW9uIChjZXJ0KSB7XG4gIHRoaXMuX2NhID0gY2VydDtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFNldCB0aGUgY2xpZW50IGNlcnRpZmljYXRlIGtleSBvcHRpb24gZm9yIGh0dHBzIHJlcXVlc3QuXG4gKlxuICogQHBhcmFtIHtCdWZmZXIgfCBTdHJpbmd9IGNlcnRcbiAqIEByZXR1cm4ge1JlcXVlc3R9IGZvciBjaGFpbmluZ1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0LnByb3RvdHlwZS5rZXkgPSBmdW5jdGlvbiAoY2VydCkge1xuICB0aGlzLl9rZXkgPSBjZXJ0O1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogU2V0IHRoZSBrZXksIGNlcnRpZmljYXRlLCBhbmQgQ0EgY2VydHMgb2YgdGhlIGNsaWVudCBpbiBQRlggb3IgUEtDUzEyIGZvcm1hdC5cbiAqXG4gKiBAcGFyYW0ge0J1ZmZlciB8IFN0cmluZ30gY2VydFxuICogQHJldHVybiB7UmVxdWVzdH0gZm9yIGNoYWluaW5nXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlcXVlc3QucHJvdG90eXBlLnBmeCA9IGZ1bmN0aW9uIChjZXJ0KSB7XG4gIGlmICh0eXBlb2YgY2VydCA9PT0gJ29iamVjdCcgJiYgIUJ1ZmZlci5pc0J1ZmZlcihjZXJ0KSkge1xuICAgIHRoaXMuX3BmeCA9IGNlcnQucGZ4O1xuICAgIHRoaXMuX3Bhc3NwaHJhc2UgPSBjZXJ0LnBhc3NwaHJhc2U7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5fcGZ4ID0gY2VydDtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBTZXQgdGhlIGNsaWVudCBjZXJ0aWZpY2F0ZSBvcHRpb24gZm9yIGh0dHBzIHJlcXVlc3QuXG4gKlxuICogQHBhcmFtIHtCdWZmZXIgfCBTdHJpbmd9IGNlcnRcbiAqIEByZXR1cm4ge1JlcXVlc3R9IGZvciBjaGFpbmluZ1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0LnByb3RvdHlwZS5jZXJ0ID0gZnVuY3Rpb24gKGNlcnQpIHtcbiAgdGhpcy5fY2VydCA9IGNlcnQ7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBEbyBub3QgcmVqZWN0IGV4cGlyZWQgb3IgaW52YWxpZCBUTFMgY2VydHMuXG4gKiBzZXRzIGByZWplY3RVbmF1dGhvcml6ZWQ9dHJ1ZWAuIEJlIHdhcm5lZCB0aGF0IHRoaXMgYWxsb3dzIE1JVE0gYXR0YWNrcy5cbiAqXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdC5wcm90b3R5cGUuZGlzYWJsZVRMU0NlcnRzID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLl9kaXNhYmxlVExTQ2VydHMgPSB0cnVlO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUmV0dXJuIGFuIGh0dHBbc10gcmVxdWVzdC5cbiAqXG4gKiBAcmV0dXJuIHtPdXRnb2luZ01lc3NhZ2V9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG4vLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgY29tcGxleGl0eVxuUmVxdWVzdC5wcm90b3R5cGUucmVxdWVzdCA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKHRoaXMucmVxKSByZXR1cm4gdGhpcy5yZXE7XG5cbiAgY29uc3Qgb3B0aW9ucyA9IHt9O1xuXG4gIHRyeSB7XG4gICAgY29uc3QgcXVlcnkgPSBxcy5zdHJpbmdpZnkodGhpcy5xcywge1xuICAgICAgaW5kaWNlczogZmFsc2UsXG4gICAgICBzdHJpY3ROdWxsSGFuZGxpbmc6IHRydWVcbiAgICB9KTtcbiAgICBpZiAocXVlcnkpIHtcbiAgICAgIHRoaXMucXMgPSB7fTtcbiAgICAgIHRoaXMuX3F1ZXJ5LnB1c2gocXVlcnkpO1xuICAgIH1cblxuICAgIHRoaXMuX2ZpbmFsaXplUXVlcnlTdHJpbmcoKTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgcmV0dXJuIHRoaXMuZW1pdCgnZXJyb3InLCBlcnIpO1xuICB9XG5cbiAgbGV0IHsgdXJsOiB1cmxTdHJpbmcgfSA9IHRoaXM7XG4gIGNvbnN0IHJldHJpZXMgPSB0aGlzLl9yZXRyaWVzO1xuXG4gIC8vIGRlZmF1bHQgdG8gaHR0cDovL1xuICBpZiAodXJsU3RyaW5nLmluZGV4T2YoJ2h0dHAnKSAhPT0gMCkgdXJsU3RyaW5nID0gYGh0dHA6Ly8ke3VybFN0cmluZ31gO1xuICBjb25zdCB1cmwgPSBuZXcgVVJMKHVybFN0cmluZyk7XG4gIGxldCB7IHByb3RvY29sIH0gPSB1cmw7XG4gIGxldCBwYXRoID0gYCR7dXJsLnBhdGhuYW1lfSR7dXJsLnNlYXJjaH1gO1xuXG4gIC8vIHN1cHBvcnQgdW5peCBzb2NrZXRzXG4gIGlmICgvXmh0dHBzP1xcK3VuaXg6Ly50ZXN0KHByb3RvY29sKSA9PT0gdHJ1ZSkge1xuICAgIC8vIGdldCB0aGUgcHJvdG9jb2xcbiAgICBwcm90b2NvbCA9IGAke3Byb3RvY29sLnNwbGl0KCcrJylbMF19OmA7XG5cbiAgICAvLyBnZXQgdGhlIHNvY2tldCBwYXRoXG4gICAgb3B0aW9ucy5zb2NrZXRQYXRoID0gdXJsLmhvc3RuYW1lLnJlcGxhY2UoLyUyRi9nLCAnLycpO1xuICAgIHVybC5ob3N0ID0gJyc7XG4gICAgdXJsLmhvc3RuYW1lID0gJyc7XG4gIH1cblxuICAvLyBPdmVycmlkZSBJUCBhZGRyZXNzIG9mIGEgaG9zdG5hbWVcbiAgaWYgKHRoaXMuX2Nvbm5lY3RPdmVycmlkZSkge1xuICAgIGNvbnN0IHsgaG9zdG5hbWUgfSA9IHVybDtcbiAgICBjb25zdCBtYXRjaCA9XG4gICAgICBob3N0bmFtZSBpbiB0aGlzLl9jb25uZWN0T3ZlcnJpZGVcbiAgICAgICAgPyB0aGlzLl9jb25uZWN0T3ZlcnJpZGVbaG9zdG5hbWVdXG4gICAgICAgIDogdGhpcy5fY29ubmVjdE92ZXJyaWRlWycqJ107XG4gICAgaWYgKG1hdGNoKSB7XG4gICAgICAvLyBiYWNrdXAgdGhlIHJlYWwgaG9zdFxuICAgICAgaWYgKCF0aGlzLl9oZWFkZXIuaG9zdCkge1xuICAgICAgICB0aGlzLnNldCgnaG9zdCcsIHVybC5ob3N0KTtcbiAgICAgIH1cblxuICAgICAgbGV0IG5ld0hvc3Q7XG4gICAgICBsZXQgbmV3UG9ydDtcblxuICAgICAgaWYgKHR5cGVvZiBtYXRjaCA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgbmV3SG9zdCA9IG1hdGNoLmhvc3Q7XG4gICAgICAgIG5ld1BvcnQgPSBtYXRjaC5wb3J0O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbmV3SG9zdCA9IG1hdGNoO1xuICAgICAgICBuZXdQb3J0ID0gdXJsLnBvcnQ7XG4gICAgICB9XG5cbiAgICAgIC8vIHdyYXAgW2lwdjZdXG4gICAgICB1cmwuaG9zdCA9IC86Ly50ZXN0KG5ld0hvc3QpID8gYFske25ld0hvc3R9XWAgOiBuZXdIb3N0O1xuICAgICAgaWYgKG5ld1BvcnQpIHtcbiAgICAgICAgdXJsLmhvc3QgKz0gYDoke25ld1BvcnR9YDtcbiAgICAgICAgdXJsLnBvcnQgPSBuZXdQb3J0O1xuICAgICAgfVxuXG4gICAgICB1cmwuaG9zdG5hbWUgPSBuZXdIb3N0O1xuICAgIH1cbiAgfVxuXG4gIC8vIG9wdGlvbnNcbiAgb3B0aW9ucy5tZXRob2QgPSB0aGlzLm1ldGhvZDtcbiAgb3B0aW9ucy5wb3J0ID0gdXJsLnBvcnQ7XG4gIG9wdGlvbnMucGF0aCA9IHBhdGg7XG4gIG9wdGlvbnMuaG9zdCA9IHV0aWxzLm5vcm1hbGl6ZUhvc3RuYW1lKHVybC5ob3N0bmFtZSk7IC8vIGV4OiBbOjoxXSAtPiA6OjFcbiAgb3B0aW9ucy5jYSA9IHRoaXMuX2NhO1xuICBvcHRpb25zLmtleSA9IHRoaXMuX2tleTtcbiAgb3B0aW9ucy5wZnggPSB0aGlzLl9wZng7XG4gIG9wdGlvbnMuY2VydCA9IHRoaXMuX2NlcnQ7XG4gIG9wdGlvbnMucGFzc3BocmFzZSA9IHRoaXMuX3Bhc3NwaHJhc2U7XG4gIG9wdGlvbnMuYWdlbnQgPSB0aGlzLl9hZ2VudDtcbiAgb3B0aW9ucy5sb29rdXAgPSB0aGlzLl9sb29rdXA7XG4gIG9wdGlvbnMucmVqZWN0VW5hdXRob3JpemVkID1cbiAgICB0eXBlb2YgdGhpcy5fZGlzYWJsZVRMU0NlcnRzID09PSAnYm9vbGVhbidcbiAgICAgID8gIXRoaXMuX2Rpc2FibGVUTFNDZXJ0c1xuICAgICAgOiBwcm9jZXNzLmVudi5OT0RFX1RMU19SRUpFQ1RfVU5BVVRIT1JJWkVEICE9PSAnMCc7XG5cbiAgLy8gQWxsb3dzIHJlcXVlc3QuZ2V0KCdodHRwczovLzEuMi4zLjQvJykuc2V0KCdIb3N0JywgJ2V4YW1wbGUuY29tJylcbiAgaWYgKHRoaXMuX2hlYWRlci5ob3N0KSB7XG4gICAgb3B0aW9ucy5zZXJ2ZXJuYW1lID0gdGhpcy5faGVhZGVyLmhvc3QucmVwbGFjZSgvOlxcZCskLywgJycpO1xuICB9XG5cbiAgaWYgKFxuICAgIHRoaXMuX3RydXN0TG9jYWxob3N0ICYmXG4gICAgL14oPzpsb2NhbGhvc3R8MTI3XFwuMFxcLjBcXC5cXGQrfCgwKjopKzowKjEpJC8udGVzdCh1cmwuaG9zdG5hbWUpXG4gICkge1xuICAgIG9wdGlvbnMucmVqZWN0VW5hdXRob3JpemVkID0gZmFsc2U7XG4gIH1cblxuICAvLyBpbml0aWF0ZSByZXF1ZXN0XG4gIGNvbnN0IG1vZHVsZV8gPSB0aGlzLl9lbmFibGVIdHRwMlxuICAgID8gZXhwb3J0cy5wcm90b2NvbHNbJ2h0dHAyOiddLnNldFByb3RvY29sKHByb3RvY29sKVxuICAgIDogZXhwb3J0cy5wcm90b2NvbHNbcHJvdG9jb2xdO1xuXG4gIC8vIHJlcXVlc3RcbiAgdGhpcy5yZXEgPSBtb2R1bGVfLnJlcXVlc3Qob3B0aW9ucyk7XG4gIGNvbnN0IHsgcmVxIH0gPSB0aGlzO1xuXG4gIC8vIHNldCB0Y3Agbm8gZGVsYXlcbiAgcmVxLnNldE5vRGVsYXkodHJ1ZSk7XG5cbiAgaWYgKG9wdGlvbnMubWV0aG9kICE9PSAnSEVBRCcpIHtcbiAgICByZXEuc2V0SGVhZGVyKCdBY2NlcHQtRW5jb2RpbmcnLCAnZ3ppcCwgZGVmbGF0ZScpO1xuICB9XG5cbiAgdGhpcy5wcm90b2NvbCA9IHByb3RvY29sO1xuICB0aGlzLmhvc3QgPSB1cmwuaG9zdDtcblxuICAvLyBleHBvc2UgZXZlbnRzXG4gIHJlcS5vbmNlKCdkcmFpbicsICgpID0+IHtcbiAgICB0aGlzLmVtaXQoJ2RyYWluJyk7XG4gIH0pO1xuXG4gIHJlcS5vbignZXJyb3InLCAoZXJyb3IpID0+IHtcbiAgICAvLyBmbGFnIGFib3J0aW9uIGhlcmUgZm9yIG91dCB0aW1lb3V0c1xuICAgIC8vIGJlY2F1c2Ugbm9kZSB3aWxsIGVtaXQgYSBmYXV4LWVycm9yIFwic29ja2V0IGhhbmcgdXBcIlxuICAgIC8vIHdoZW4gcmVxdWVzdCBpcyBhYm9ydGVkIGJlZm9yZSBhIGNvbm5lY3Rpb24gaXMgbWFkZVxuICAgIGlmICh0aGlzLl9hYm9ydGVkKSByZXR1cm47XG4gICAgLy8gaWYgbm90IHRoZSBzYW1lLCB3ZSBhcmUgaW4gdGhlICoqb2xkKiogKGNhbmNlbGxlZCkgcmVxdWVzdCxcbiAgICAvLyBzbyBuZWVkIHRvIGNvbnRpbnVlIChzYW1lIGFzIGZvciBhYm92ZSlcbiAgICBpZiAodGhpcy5fcmV0cmllcyAhPT0gcmV0cmllcykgcmV0dXJuO1xuICAgIC8vIGlmIHdlJ3ZlIHJlY2VpdmVkIGEgcmVzcG9uc2UgdGhlbiB3ZSBkb24ndCB3YW50IHRvIGxldFxuICAgIC8vIGFuIGVycm9yIGluIHRoZSByZXF1ZXN0IGJsb3cgdXAgdGhlIHJlc3BvbnNlXG4gICAgaWYgKHRoaXMucmVzcG9uc2UpIHJldHVybjtcbiAgICB0aGlzLmNhbGxiYWNrKGVycm9yKTtcbiAgfSk7XG5cbiAgLy8gYXV0aFxuICBpZiAodXJsLnVzZXJuYW1lIHx8IHVybC5wYXNzd29yZCkge1xuICAgIHRoaXMuYXV0aCh1cmwudXNlcm5hbWUsIHVybC5wYXNzd29yZCk7XG4gIH1cblxuICBpZiAodGhpcy51c2VybmFtZSAmJiB0aGlzLnBhc3N3b3JkKSB7XG4gICAgdGhpcy5hdXRoKHRoaXMudXNlcm5hbWUsIHRoaXMucGFzc3dvcmQpO1xuICB9XG5cbiAgZm9yIChjb25zdCBrZXkgaW4gdGhpcy5oZWFkZXIpIHtcbiAgICBpZiAoaGFzT3duKHRoaXMuaGVhZGVyLCBrZXkpKSByZXEuc2V0SGVhZGVyKGtleSwgdGhpcy5oZWFkZXJba2V5XSk7XG4gIH1cblxuICAvLyBhZGQgY29va2llc1xuICBpZiAodGhpcy5jb29raWVzKSB7XG4gICAgaWYgKGhhc093bih0aGlzLl9oZWFkZXIsICdjb29raWUnKSkge1xuICAgICAgLy8gbWVyZ2VcbiAgICAgIGNvbnN0IHRlbXBvcmFyeUphciA9IG5ldyBDb29raWVKYXIuQ29va2llSmFyKCk7XG4gICAgICB0ZW1wb3JhcnlKYXIuc2V0Q29va2llcyh0aGlzLl9oZWFkZXIuY29va2llLnNwbGl0KCc7ICcpKTtcbiAgICAgIHRlbXBvcmFyeUphci5zZXRDb29raWVzKHRoaXMuY29va2llcy5zcGxpdCgnOyAnKSk7XG4gICAgICByZXEuc2V0SGVhZGVyKFxuICAgICAgICAnQ29va2llJyxcbiAgICAgICAgdGVtcG9yYXJ5SmFyLmdldENvb2tpZXMoQ29va2llSmFyLkNvb2tpZUFjY2Vzc0luZm8uQWxsKS50b1ZhbHVlU3RyaW5nKClcbiAgICAgICk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlcS5zZXRIZWFkZXIoJ0Nvb2tpZScsIHRoaXMuY29va2llcyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJlcTtcbn07XG5cbi8qKlxuICogSW52b2tlIHRoZSBjYWxsYmFjayB3aXRoIGBlcnJgIGFuZCBgcmVzYFxuICogYW5kIGhhbmRsZSBhcml0eSBjaGVjay5cbiAqXG4gKiBAcGFyYW0ge0Vycm9yfSBlcnJcbiAqIEBwYXJhbSB7UmVzcG9uc2V9IHJlc1xuICogQGFwaSBwcml2YXRlXG4gKi9cblxuUmVxdWVzdC5wcm90b3R5cGUuY2FsbGJhY2sgPSBmdW5jdGlvbiAoZXJyb3IsIHJlcykge1xuICBpZiAodGhpcy5fc2hvdWxkUmV0cnkoZXJyb3IsIHJlcykpIHtcbiAgICByZXR1cm4gdGhpcy5fcmV0cnkoKTtcbiAgfVxuXG4gIC8vIEF2b2lkIHRoZSBlcnJvciB3aGljaCBpcyBlbWl0dGVkIGZyb20gJ3NvY2tldCBoYW5nIHVwJyB0byBjYXVzZSB0aGUgZm4gdW5kZWZpbmVkIGVycm9yIG9uIEpTIHJ1bnRpbWUuXG4gIGNvbnN0IGZuID0gdGhpcy5fY2FsbGJhY2sgfHwgbm9vcDtcbiAgdGhpcy5jbGVhclRpbWVvdXQoKTtcbiAgaWYgKHRoaXMuY2FsbGVkKSByZXR1cm4gY29uc29sZS53YXJuKCdzdXBlcmFnZW50OiBkb3VibGUgY2FsbGJhY2sgYnVnJyk7XG4gIHRoaXMuY2FsbGVkID0gdHJ1ZTtcblxuICBpZiAoIWVycm9yKSB7XG4gICAgdHJ5IHtcbiAgICAgIGlmICghdGhpcy5faXNSZXNwb25zZU9LKHJlcykpIHtcbiAgICAgICAgbGV0IG1lc3NhZ2UgPSAnVW5zdWNjZXNzZnVsIEhUVFAgcmVzcG9uc2UnO1xuICAgICAgICBpZiAocmVzKSB7XG4gICAgICAgICAgbWVzc2FnZSA9IGh0dHAuU1RBVFVTX0NPREVTW3Jlcy5zdGF0dXNdIHx8IG1lc3NhZ2U7XG4gICAgICAgIH1cblxuICAgICAgICBlcnJvciA9IG5ldyBFcnJvcihtZXNzYWdlKTtcbiAgICAgICAgZXJyb3Iuc3RhdHVzID0gcmVzID8gcmVzLnN0YXR1cyA6IHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGVycm9yID0gZXJyO1xuICAgICAgZXJyb3Iuc3RhdHVzID0gZXJyb3Iuc3RhdHVzIHx8IChyZXMgPyByZXMuc3RhdHVzIDogdW5kZWZpbmVkKTtcbiAgICB9XG4gIH1cblxuICAvLyBJdCdzIGltcG9ydGFudCB0aGF0IHRoZSBjYWxsYmFjayBpcyBjYWxsZWQgb3V0c2lkZSB0cnkvY2F0Y2hcbiAgLy8gdG8gYXZvaWQgZG91YmxlIGNhbGxiYWNrXG4gIGlmICghZXJyb3IpIHtcbiAgICByZXR1cm4gZm4obnVsbCwgcmVzKTtcbiAgfVxuXG4gIGVycm9yLnJlc3BvbnNlID0gcmVzO1xuICBpZiAodGhpcy5fbWF4UmV0cmllcykgZXJyb3IucmV0cmllcyA9IHRoaXMuX3JldHJpZXMgLSAxO1xuXG4gIC8vIG9ubHkgZW1pdCBlcnJvciBldmVudCBpZiB0aGVyZSBpcyBhIGxpc3RlbmVyXG4gIC8vIG90aGVyd2lzZSB3ZSBhc3N1bWUgdGhlIGNhbGxiYWNrIHRvIGAuZW5kKClgIHdpbGwgZ2V0IHRoZSBlcnJvclxuICBpZiAoZXJyb3IgJiYgdGhpcy5saXN0ZW5lcnMoJ2Vycm9yJykubGVuZ3RoID4gMCkge1xuICAgIHRoaXMuZW1pdCgnZXJyb3InLCBlcnJvcik7XG4gIH1cblxuICBmbihlcnJvciwgcmVzKTtcbn07XG5cbi8qKlxuICogQ2hlY2sgaWYgYG9iamAgaXMgYSBob3N0IG9iamVjdCxcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqIGhvc3Qgb2JqZWN0XG4gKiBAcmV0dXJuIHtCb29sZWFufSBpcyBhIGhvc3Qgb2JqZWN0XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuUmVxdWVzdC5wcm90b3R5cGUuX2lzSG9zdCA9IGZ1bmN0aW9uIChvYmplY3QpIHtcbiAgcmV0dXJuIChcbiAgICBCdWZmZXIuaXNCdWZmZXIob2JqZWN0KSB8fFxuICAgIG9iamVjdCBpbnN0YW5jZW9mIFN0cmVhbSB8fFxuICAgIG9iamVjdCBpbnN0YW5jZW9mIEZvcm1EYXRhXG4gICk7XG59O1xuXG4vKipcbiAqIEluaXRpYXRlIHJlcXVlc3QsIGludm9raW5nIGNhbGxiYWNrIGBmbihlcnIsIHJlcylgXG4gKiB3aXRoIGFuIGluc3RhbmNlb2YgYFJlc3BvbnNlYC5cbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICogQHJldHVybiB7UmVxdWVzdH0gZm9yIGNoYWluaW5nXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlcXVlc3QucHJvdG90eXBlLl9lbWl0UmVzcG9uc2UgPSBmdW5jdGlvbiAoYm9keSwgZmlsZXMpIHtcbiAgY29uc3QgcmVzcG9uc2UgPSBuZXcgUmVzcG9uc2UodGhpcyk7XG4gIHRoaXMucmVzcG9uc2UgPSByZXNwb25zZTtcbiAgcmVzcG9uc2UucmVkaXJlY3RzID0gdGhpcy5fcmVkaXJlY3RMaXN0O1xuICBpZiAodW5kZWZpbmVkICE9PSBib2R5KSB7XG4gICAgcmVzcG9uc2UuYm9keSA9IGJvZHk7XG4gIH1cblxuICByZXNwb25zZS5maWxlcyA9IGZpbGVzO1xuICBpZiAodGhpcy5fZW5kQ2FsbGVkKSB7XG4gICAgcmVzcG9uc2UucGlwZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgXCJlbmQoKSBoYXMgYWxyZWFkeSBiZWVuIGNhbGxlZCwgc28gaXQncyB0b28gbGF0ZSB0byBzdGFydCBwaXBpbmdcIlxuICAgICAgKTtcbiAgICB9O1xuICB9XG5cbiAgdGhpcy5lbWl0KCdyZXNwb25zZScsIHJlc3BvbnNlKTtcbiAgcmV0dXJuIHJlc3BvbnNlO1xufTtcblxuLyoqXG4gKiBFbWl0IGByZWRpcmVjdGAgZXZlbnQsIHBhc3NpbmcgYW4gaW5zdGFuY2VvZiBgUmVzcG9uc2VgLlxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cblJlcXVlc3QucHJvdG90eXBlLl9lbWl0UmVkaXJlY3QgPSBmdW5jdGlvbiAoKSB7XG4gIGNvbnN0IHJlc3BvbnNlID0gbmV3IFJlc3BvbnNlKHRoaXMpO1xuICByZXNwb25zZS5yZWRpcmVjdHMgPSB0aGlzLl9yZWRpcmVjdExpc3Q7XG4gIHRoaXMuZW1pdCgncmVkaXJlY3QnLCByZXNwb25zZSk7XG59O1xuXG5SZXF1ZXN0LnByb3RvdHlwZS5lbmQgPSBmdW5jdGlvbiAoZm4pIHtcbiAgdGhpcy5yZXF1ZXN0KCk7XG4gIGRlYnVnKCclcyAlcycsIHRoaXMubWV0aG9kLCB0aGlzLnVybCk7XG5cbiAgaWYgKHRoaXMuX2VuZENhbGxlZCkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICcuZW5kKCkgd2FzIGNhbGxlZCB0d2ljZS4gVGhpcyBpcyBub3Qgc3VwcG9ydGVkIGluIHN1cGVyYWdlbnQnXG4gICAgKTtcbiAgfVxuXG4gIHRoaXMuX2VuZENhbGxlZCA9IHRydWU7XG5cbiAgLy8gc3RvcmUgY2FsbGJhY2tcbiAgdGhpcy5fY2FsbGJhY2sgPSBmbiB8fCBub29wO1xuXG4gIHRoaXMuX2VuZCgpO1xufTtcblxuUmVxdWVzdC5wcm90b3R5cGUuX2VuZCA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKHRoaXMuX2Fib3J0ZWQpXG4gICAgcmV0dXJuIHRoaXMuY2FsbGJhY2soXG4gICAgICBuZXcgRXJyb3IoJ1RoZSByZXF1ZXN0IGhhcyBiZWVuIGFib3J0ZWQgZXZlbiBiZWZvcmUgLmVuZCgpIHdhcyBjYWxsZWQnKVxuICAgICk7XG5cbiAgbGV0IGRhdGEgPSB0aGlzLl9kYXRhO1xuICBjb25zdCB7IHJlcSB9ID0gdGhpcztcbiAgY29uc3QgeyBtZXRob2QgfSA9IHRoaXM7XG5cbiAgdGhpcy5fc2V0VGltZW91dHMoKTtcblxuICAvLyBib2R5XG4gIGlmIChtZXRob2QgIT09ICdIRUFEJyAmJiAhcmVxLl9oZWFkZXJTZW50KSB7XG4gICAgLy8gc2VyaWFsaXplIHN0dWZmXG4gICAgaWYgKHR5cGVvZiBkYXRhICE9PSAnc3RyaW5nJykge1xuICAgICAgbGV0IGNvbnRlbnRUeXBlID0gcmVxLmdldEhlYWRlcignQ29udGVudC1UeXBlJyk7XG4gICAgICAvLyBQYXJzZSBvdXQganVzdCB0aGUgY29udGVudCB0eXBlIGZyb20gdGhlIGhlYWRlciAoaWdub3JlIHRoZSBjaGFyc2V0KVxuICAgICAgaWYgKGNvbnRlbnRUeXBlKSBjb250ZW50VHlwZSA9IGNvbnRlbnRUeXBlLnNwbGl0KCc7JylbMF07XG4gICAgICBsZXQgc2VyaWFsaXplID0gdGhpcy5fc2VyaWFsaXplciB8fCBleHBvcnRzLnNlcmlhbGl6ZVtjb250ZW50VHlwZV07XG4gICAgICBpZiAoIXNlcmlhbGl6ZSAmJiBpc0pTT04oY29udGVudFR5cGUpKSB7XG4gICAgICAgIHNlcmlhbGl6ZSA9IGV4cG9ydHMuc2VyaWFsaXplWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICB9XG5cbiAgICAgIGlmIChzZXJpYWxpemUpIGRhdGEgPSBzZXJpYWxpemUoZGF0YSk7XG4gICAgfVxuXG4gICAgLy8gY29udGVudC1sZW5ndGhcbiAgICBpZiAoZGF0YSAmJiAhcmVxLmdldEhlYWRlcignQ29udGVudC1MZW5ndGgnKSkge1xuICAgICAgcmVxLnNldEhlYWRlcihcbiAgICAgICAgJ0NvbnRlbnQtTGVuZ3RoJyxcbiAgICAgICAgQnVmZmVyLmlzQnVmZmVyKGRhdGEpID8gZGF0YS5sZW5ndGggOiBCdWZmZXIuYnl0ZUxlbmd0aChkYXRhKVxuICAgICAgKTtcbiAgICB9XG4gIH1cblxuICAvLyByZXNwb25zZVxuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgY29tcGxleGl0eVxuICByZXEub25jZSgncmVzcG9uc2UnLCAocmVzKSA9PiB7XG4gICAgZGVidWcoJyVzICVzIC0+ICVzJywgdGhpcy5tZXRob2QsIHRoaXMudXJsLCByZXMuc3RhdHVzQ29kZSk7XG5cbiAgICBpZiAodGhpcy5fcmVzcG9uc2VUaW1lb3V0VGltZXIpIHtcbiAgICAgIGNsZWFyVGltZW91dCh0aGlzLl9yZXNwb25zZVRpbWVvdXRUaW1lcik7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMucGlwZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBtYXggPSB0aGlzLl9tYXhSZWRpcmVjdHM7XG4gICAgY29uc3QgbWltZSA9IHV0aWxzLnR5cGUocmVzLmhlYWRlcnNbJ2NvbnRlbnQtdHlwZSddIHx8ICcnKSB8fCAndGV4dC9wbGFpbic7XG4gICAgbGV0IHR5cGUgPSBtaW1lLnNwbGl0KCcvJylbMF07XG4gICAgaWYgKHR5cGUpIHR5cGUgPSB0eXBlLnRvTG93ZXJDYXNlKCkudHJpbSgpO1xuICAgIGNvbnN0IG11bHRpcGFydCA9IHR5cGUgPT09ICdtdWx0aXBhcnQnO1xuICAgIGNvbnN0IHJlZGlyZWN0ID0gaXNSZWRpcmVjdChyZXMuc3RhdHVzQ29kZSk7XG4gICAgY29uc3QgcmVzcG9uc2VUeXBlID0gdGhpcy5fcmVzcG9uc2VUeXBlO1xuXG4gICAgdGhpcy5yZXMgPSByZXM7XG5cbiAgICAvLyByZWRpcmVjdFxuICAgIGlmIChyZWRpcmVjdCAmJiB0aGlzLl9yZWRpcmVjdHMrKyAhPT0gbWF4KSB7XG4gICAgICByZXR1cm4gdGhpcy5fcmVkaXJlY3QocmVzKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5tZXRob2QgPT09ICdIRUFEJykge1xuICAgICAgdGhpcy5lbWl0KCdlbmQnKTtcbiAgICAgIHRoaXMuY2FsbGJhY2sobnVsbCwgdGhpcy5fZW1pdFJlc3BvbnNlKCkpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIHpsaWIgc3VwcG9ydFxuICAgIGlmICh0aGlzLl9zaG91bGREZWNvbXByZXNzKHJlcykpIHtcbiAgICAgIGRlY29tcHJlc3MocmVxLCByZXMpO1xuICAgIH1cblxuICAgIGxldCBidWZmZXIgPSB0aGlzLl9idWZmZXI7XG4gICAgaWYgKGJ1ZmZlciA9PT0gdW5kZWZpbmVkICYmIG1pbWUgaW4gZXhwb3J0cy5idWZmZXIpIHtcbiAgICAgIGJ1ZmZlciA9IEJvb2xlYW4oZXhwb3J0cy5idWZmZXJbbWltZV0pO1xuICAgIH1cblxuICAgIGxldCBwYXJzZXIgPSB0aGlzLl9wYXJzZXI7XG4gICAgaWYgKHVuZGVmaW5lZCA9PT0gYnVmZmVyICYmIHBhcnNlcikge1xuICAgICAgY29uc29sZS53YXJuKFxuICAgICAgICBcIkEgY3VzdG9tIHN1cGVyYWdlbnQgcGFyc2VyIGhhcyBiZWVuIHNldCwgYnV0IGJ1ZmZlcmluZyBzdHJhdGVneSBmb3IgdGhlIHBhcnNlciBoYXNuJ3QgYmVlbiBjb25maWd1cmVkLiBDYWxsIGByZXEuYnVmZmVyKHRydWUgb3IgZmFsc2UpYCBvciBzZXQgYHN1cGVyYWdlbnQuYnVmZmVyW21pbWVdID0gdHJ1ZSBvciBmYWxzZWBcIlxuICAgICAgKTtcbiAgICAgIGJ1ZmZlciA9IHRydWU7XG4gICAgfVxuXG4gICAgaWYgKCFwYXJzZXIpIHtcbiAgICAgIGlmIChyZXNwb25zZVR5cGUpIHtcbiAgICAgICAgcGFyc2VyID0gZXhwb3J0cy5wYXJzZS5pbWFnZTsgLy8gSXQncyBhY3R1YWxseSBhIGdlbmVyaWMgQnVmZmVyXG4gICAgICAgIGJ1ZmZlciA9IHRydWU7XG4gICAgICB9IGVsc2UgaWYgKG11bHRpcGFydCkge1xuICAgICAgICBjb25zdCBmb3JtID0gZm9ybWlkYWJsZS5mb3JtaWRhYmxlKCk7XG4gICAgICAgIHBhcnNlciA9IGZvcm0ucGFyc2UuYmluZChmb3JtKTtcbiAgICAgICAgYnVmZmVyID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSBpZiAoaXNCaW5hcnkobWltZSkpIHtcbiAgICAgICAgcGFyc2VyID0gZXhwb3J0cy5wYXJzZS5pbWFnZTtcbiAgICAgICAgYnVmZmVyID0gdHJ1ZTsgLy8gRm9yIGJhY2t3YXJkcy1jb21wYXRpYmlsaXR5IGJ1ZmZlcmluZyBkZWZhdWx0IGlzIGFkLWhvYyBNSU1FLWRlcGVuZGVudFxuICAgICAgfSBlbHNlIGlmIChleHBvcnRzLnBhcnNlW21pbWVdKSB7XG4gICAgICAgIHBhcnNlciA9IGV4cG9ydHMucGFyc2VbbWltZV07XG4gICAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICd0ZXh0Jykge1xuICAgICAgICBwYXJzZXIgPSBleHBvcnRzLnBhcnNlLnRleHQ7XG4gICAgICAgIGJ1ZmZlciA9IGJ1ZmZlciAhPT0gZmFsc2U7XG4gICAgICAgIC8vIGV2ZXJ5b25lIHdhbnRzIHRoZWlyIG93biB3aGl0ZS1sYWJlbGVkIGpzb25cbiAgICAgIH0gZWxzZSBpZiAoaXNKU09OKG1pbWUpKSB7XG4gICAgICAgIHBhcnNlciA9IGV4cG9ydHMucGFyc2VbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgICAgYnVmZmVyID0gYnVmZmVyICE9PSBmYWxzZTtcbiAgICAgIH0gZWxzZSBpZiAoYnVmZmVyKSB7XG4gICAgICAgIHBhcnNlciA9IGV4cG9ydHMucGFyc2UudGV4dDtcbiAgICAgIH0gZWxzZSBpZiAodW5kZWZpbmVkID09PSBidWZmZXIpIHtcbiAgICAgICAgcGFyc2VyID0gZXhwb3J0cy5wYXJzZS5pbWFnZTsgLy8gSXQncyBhY3R1YWxseSBhIGdlbmVyaWMgQnVmZmVyXG4gICAgICAgIGJ1ZmZlciA9IHRydWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gYnkgZGVmYXVsdCBvbmx5IGJ1ZmZlciB0ZXh0LyosIGpzb24gYW5kIG1lc3NlZCB1cCB0aGluZyBmcm9tIGhlbGxcbiAgICBpZiAoKHVuZGVmaW5lZCA9PT0gYnVmZmVyICYmIGlzVGV4dChtaW1lKSkgfHwgaXNKU09OKG1pbWUpKSB7XG4gICAgICBidWZmZXIgPSB0cnVlO1xuICAgIH1cblxuICAgIHRoaXMuX3Jlc0J1ZmZlcmVkID0gYnVmZmVyO1xuICAgIGxldCBwYXJzZXJIYW5kbGVzRW5kID0gZmFsc2U7XG4gICAgaWYgKGJ1ZmZlcikge1xuICAgICAgLy8gUHJvdGVjdGlvbmEgYWdhaW5zdCB6aXAgYm9tYnMgYW5kIG90aGVyIG51aXNhbmNlXG4gICAgICBsZXQgcmVzcG9uc2VCeXRlc0xlZnQgPSB0aGlzLl9tYXhSZXNwb25zZVNpemUgfHwgMjAwMDAwMDAwO1xuICAgICAgcmVzLm9uKCdkYXRhJywgKGJ1ZikgPT4ge1xuICAgICAgICByZXNwb25zZUJ5dGVzTGVmdCAtPSBidWYuYnl0ZUxlbmd0aCB8fCBidWYubGVuZ3RoID4gMCA/IGJ1Zi5sZW5ndGggOiAwO1xuICAgICAgICBpZiAocmVzcG9uc2VCeXRlc0xlZnQgPCAwKSB7XG4gICAgICAgICAgLy8gVGhpcyB3aWxsIHByb3BhZ2F0ZSB0aHJvdWdoIGVycm9yIGV2ZW50XG4gICAgICAgICAgY29uc3QgZXJyb3IgPSBuZXcgRXJyb3IoJ01heGltdW0gcmVzcG9uc2Ugc2l6ZSByZWFjaGVkJyk7XG4gICAgICAgICAgZXJyb3IuY29kZSA9ICdFVE9PTEFSR0UnO1xuICAgICAgICAgIC8vIFBhcnNlcnMgYXJlbid0IHJlcXVpcmVkIHRvIG9ic2VydmUgZXJyb3IgZXZlbnQsXG4gICAgICAgICAgLy8gc28gd291bGQgaW5jb3JyZWN0bHkgcmVwb3J0IHN1Y2Nlc3NcbiAgICAgICAgICBwYXJzZXJIYW5kbGVzRW5kID0gZmFsc2U7XG4gICAgICAgICAgLy8gV2lsbCBub3QgZW1pdCBlcnJvciBldmVudFxuICAgICAgICAgIHJlcy5kZXN0cm95KGVycm9yKTtcbiAgICAgICAgICAvLyBzbyB3ZSBkbyBjYWxsYmFjayBub3dcbiAgICAgICAgICB0aGlzLmNhbGxiYWNrKGVycm9yLCBudWxsKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKHBhcnNlcikge1xuICAgICAgdHJ5IHtcbiAgICAgICAgLy8gVW5idWZmZXJlZCBwYXJzZXJzIGFyZSBzdXBwb3NlZCB0byBlbWl0IHJlc3BvbnNlIGVhcmx5LFxuICAgICAgICAvLyB3aGljaCBpcyB3ZWlyZCBCVFcsIGJlY2F1c2UgcmVzcG9uc2UuYm9keSB3b24ndCBiZSB0aGVyZS5cbiAgICAgICAgcGFyc2VySGFuZGxlc0VuZCA9IGJ1ZmZlcjtcblxuICAgICAgICBwYXJzZXIocmVzLCAoZXJyb3IsIG9iamVjdCwgZmlsZXMpID0+IHtcbiAgICAgICAgICBpZiAodGhpcy50aW1lZG91dCkge1xuICAgICAgICAgICAgLy8gVGltZW91dCBoYXMgYWxyZWFkeSBoYW5kbGVkIGFsbCBjYWxsYmFja3NcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBJbnRlbnRpb25hbCAobm9uLXRpbWVvdXQpIGFib3J0IGlzIHN1cHBvc2VkIHRvIHByZXNlcnZlIHBhcnRpYWwgcmVzcG9uc2UsXG4gICAgICAgICAgLy8gZXZlbiBpZiBpdCBkb2Vzbid0IHBhcnNlLlxuICAgICAgICAgIGlmIChlcnJvciAmJiAhdGhpcy5fYWJvcnRlZCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY2FsbGJhY2soZXJyb3IpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChwYXJzZXJIYW5kbGVzRW5kKSB7XG4gICAgICAgICAgICBpZiAobXVsdGlwYXJ0KSB7XG4gICAgICAgICAgICAgIC8vIGZvcm1pZGFibGUgdjMgYWx3YXlzIHJldHVybnMgYW4gYXJyYXkgd2l0aCB0aGUgdmFsdWUgaW4gaXRcbiAgICAgICAgICAgICAgLy8gc28gd2UgbmVlZCB0byBmbGF0dGVuIGl0XG4gICAgICAgICAgICAgIGlmIChvYmplY3QpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGtleSBpbiBvYmplY3QpIHtcbiAgICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gb2JqZWN0W2tleV07XG4gICAgICAgICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkgJiYgdmFsdWUubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIG9iamVjdFtrZXldID0gdmFsdWVbMF07XG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBvYmplY3Rba2V5XSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIGlmIChmaWxlcykge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3Qga2V5IGluIGZpbGVzKSB7XG4gICAgICAgICAgICAgICAgICBjb25zdCB2YWx1ZSA9IGZpbGVzW2tleV07XG4gICAgICAgICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkgJiYgdmFsdWUubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIGZpbGVzW2tleV0gPSB2YWx1ZVswXTtcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGZpbGVzW2tleV0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuZW1pdCgnZW5kJyk7XG4gICAgICAgICAgICB0aGlzLmNhbGxiYWNrKG51bGwsIHRoaXMuX2VtaXRSZXNwb25zZShvYmplY3QsIGZpbGVzKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICB0aGlzLmNhbGxiYWNrKGVycik7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLnJlcyA9IHJlcztcblxuICAgIC8vIHVuYnVmZmVyZWRcbiAgICBpZiAoIWJ1ZmZlcikge1xuICAgICAgZGVidWcoJ3VuYnVmZmVyZWQgJXMgJXMnLCB0aGlzLm1ldGhvZCwgdGhpcy51cmwpO1xuICAgICAgdGhpcy5jYWxsYmFjayhudWxsLCB0aGlzLl9lbWl0UmVzcG9uc2UoKSk7XG4gICAgICBpZiAobXVsdGlwYXJ0KSByZXR1cm47IC8vIGFsbG93IG11bHRpcGFydCB0byBoYW5kbGUgZW5kIGV2ZW50XG4gICAgICByZXMub25jZSgnZW5kJywgKCkgPT4ge1xuICAgICAgICBkZWJ1ZygnZW5kICVzICVzJywgdGhpcy5tZXRob2QsIHRoaXMudXJsKTtcbiAgICAgICAgdGhpcy5lbWl0KCdlbmQnKTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIHRlcm1pbmF0aW5nIGV2ZW50c1xuICAgIHJlcy5vbmNlKCdlcnJvcicsIChlcnJvcikgPT4ge1xuICAgICAgcGFyc2VySGFuZGxlc0VuZCA9IGZhbHNlO1xuICAgICAgdGhpcy5jYWxsYmFjayhlcnJvciwgbnVsbCk7XG4gICAgfSk7XG4gICAgaWYgKCFwYXJzZXJIYW5kbGVzRW5kKVxuICAgICAgcmVzLm9uY2UoJ2VuZCcsICgpID0+IHtcbiAgICAgICAgZGVidWcoJ2VuZCAlcyAlcycsIHRoaXMubWV0aG9kLCB0aGlzLnVybCk7XG4gICAgICAgIC8vIFRPRE86IHVubGVzcyBidWZmZXJpbmcgZW1pdCBlYXJsaWVyIHRvIHN0cmVhbVxuICAgICAgICB0aGlzLmVtaXQoJ2VuZCcpO1xuICAgICAgICB0aGlzLmNhbGxiYWNrKG51bGwsIHRoaXMuX2VtaXRSZXNwb25zZSgpKTtcbiAgICAgIH0pO1xuICB9KTtcblxuICB0aGlzLmVtaXQoJ3JlcXVlc3QnLCB0aGlzKTtcblxuICBjb25zdCBnZXRQcm9ncmVzc01vbml0b3IgPSAoKSA9PiB7XG4gICAgY29uc3QgbGVuZ3RoQ29tcHV0YWJsZSA9IHRydWU7XG4gICAgY29uc3QgdG90YWwgPSByZXEuZ2V0SGVhZGVyKCdDb250ZW50LUxlbmd0aCcpO1xuICAgIGxldCBsb2FkZWQgPSAwO1xuXG4gICAgY29uc3QgcHJvZ3Jlc3MgPSBuZXcgU3RyZWFtLlRyYW5zZm9ybSgpO1xuICAgIHByb2dyZXNzLl90cmFuc2Zvcm0gPSAoY2h1bmssIGVuY29kaW5nLCBjYWxsYmFjaykgPT4ge1xuICAgICAgbG9hZGVkICs9IGNodW5rLmxlbmd0aDtcbiAgICAgIHRoaXMuZW1pdCgncHJvZ3Jlc3MnLCB7XG4gICAgICAgIGRpcmVjdGlvbjogJ3VwbG9hZCcsXG4gICAgICAgIGxlbmd0aENvbXB1dGFibGUsXG4gICAgICAgIGxvYWRlZCxcbiAgICAgICAgdG90YWxcbiAgICAgIH0pO1xuICAgICAgY2FsbGJhY2sobnVsbCwgY2h1bmspO1xuICAgIH07XG5cbiAgICByZXR1cm4gcHJvZ3Jlc3M7XG4gIH07XG5cbiAgY29uc3QgYnVmZmVyVG9DaHVua3MgPSAoYnVmZmVyKSA9PiB7XG4gICAgY29uc3QgY2h1bmtTaXplID0gMTYgKiAxMDI0OyAvLyBkZWZhdWx0IGhpZ2hXYXRlck1hcmsgdmFsdWVcbiAgICBjb25zdCBjaHVua2luZyA9IG5ldyBTdHJlYW0uUmVhZGFibGUoKTtcbiAgICBjb25zdCB0b3RhbExlbmd0aCA9IGJ1ZmZlci5sZW5ndGg7XG4gICAgY29uc3QgcmVtYWluZGVyID0gdG90YWxMZW5ndGggJSBjaHVua1NpemU7XG4gICAgY29uc3QgY3V0b2ZmID0gdG90YWxMZW5ndGggLSByZW1haW5kZXI7XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGN1dG9mZjsgaSArPSBjaHVua1NpemUpIHtcbiAgICAgIGNvbnN0IGNodW5rID0gYnVmZmVyLnNsaWNlKGksIGkgKyBjaHVua1NpemUpO1xuICAgICAgY2h1bmtpbmcucHVzaChjaHVuayk7XG4gICAgfVxuXG4gICAgaWYgKHJlbWFpbmRlciA+IDApIHtcbiAgICAgIGNvbnN0IHJlbWFpbmRlckJ1ZmZlciA9IGJ1ZmZlci5zbGljZSgtcmVtYWluZGVyKTtcbiAgICAgIGNodW5raW5nLnB1c2gocmVtYWluZGVyQnVmZmVyKTtcbiAgICB9XG5cbiAgICBjaHVua2luZy5wdXNoKG51bGwpOyAvLyBubyBtb3JlIGRhdGFcblxuICAgIHJldHVybiBjaHVua2luZztcbiAgfTtcblxuICAvLyBpZiBhIEZvcm1EYXRhIGluc3RhbmNlIGdvdCBjcmVhdGVkLCB0aGVuIHdlIHNlbmQgdGhhdCBhcyB0aGUgcmVxdWVzdCBib2R5XG4gIGNvbnN0IGZvcm1EYXRhID0gdGhpcy5fZm9ybURhdGE7XG4gIGlmIChmb3JtRGF0YSkge1xuICAgIC8vIHNldCBoZWFkZXJzXG4gICAgY29uc3QgaGVhZGVycyA9IGZvcm1EYXRhLmdldEhlYWRlcnMoKTtcbiAgICBmb3IgKGNvbnN0IGkgaW4gaGVhZGVycykge1xuICAgICAgaWYgKGhhc093bihoZWFkZXJzLCBpKSkge1xuICAgICAgICBkZWJ1Zygnc2V0dGluZyBGb3JtRGF0YSBoZWFkZXI6IFwiJXM6ICVzXCInLCBpLCBoZWFkZXJzW2ldKTtcbiAgICAgICAgcmVxLnNldEhlYWRlcihpLCBoZWFkZXJzW2ldKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBhdHRlbXB0IHRvIGdldCBcIkNvbnRlbnQtTGVuZ3RoXCIgaGVhZGVyXG4gICAgZm9ybURhdGEuZ2V0TGVuZ3RoKChlcnJvciwgbGVuZ3RoKSA9PiB7XG4gICAgICAvLyBUT0RPOiBBZGQgY2h1bmtlZCBlbmNvZGluZyB3aGVuIG5vIGxlbmd0aCAoaWYgZXJyKVxuICAgICAgaWYgKGVycm9yKSBkZWJ1ZygnZm9ybURhdGEuZ2V0TGVuZ3RoIGhhZCBlcnJvcicsIGVycm9yLCBsZW5ndGgpO1xuXG4gICAgICBkZWJ1ZygnZ290IEZvcm1EYXRhIENvbnRlbnQtTGVuZ3RoOiAlcycsIGxlbmd0aCk7XG4gICAgICBpZiAodHlwZW9mIGxlbmd0aCA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgcmVxLnNldEhlYWRlcignQ29udGVudC1MZW5ndGgnLCBsZW5ndGgpO1xuICAgICAgfVxuXG4gICAgICBmb3JtRGF0YS5waXBlKGdldFByb2dyZXNzTW9uaXRvcigpKS5waXBlKHJlcSk7XG4gICAgfSk7XG4gIH0gZWxzZSBpZiAoQnVmZmVyLmlzQnVmZmVyKGRhdGEpKSB7XG4gICAgYnVmZmVyVG9DaHVua3MoZGF0YSkucGlwZShnZXRQcm9ncmVzc01vbml0b3IoKSkucGlwZShyZXEpO1xuICB9IGVsc2Uge1xuICAgIHJlcS5lbmQoZGF0YSk7XG4gIH1cbn07XG5cbi8vIENoZWNrIHdoZXRoZXIgcmVzcG9uc2UgaGFzIGEgbm9uLTAtc2l6ZWQgZ3ppcC1lbmNvZGVkIGJvZHlcblJlcXVlc3QucHJvdG90eXBlLl9zaG91bGREZWNvbXByZXNzID0gKHJlcykgPT4ge1xuICByZXR1cm4gaGFzTm9uRW1wdHlSZXNwb25zZUNvbnRlbnQocmVzKSAmJiAoaXNHemlwT3JEZWZsYXRlRW5jb2RpbmcocmVzKSB8fCBpc0Jyb3RsaUVuY29kaW5nKHJlcykpO1xufTtcblxuXG4vKipcbiAqIE92ZXJyaWRlcyBETlMgZm9yIHNlbGVjdGVkIGhvc3RuYW1lcy4gVGFrZXMgb2JqZWN0IG1hcHBpbmcgaG9zdG5hbWVzIHRvIElQIGFkZHJlc3Nlcy5cbiAqXG4gKiBXaGVuIG1ha2luZyBhIHJlcXVlc3QgdG8gYSBVUkwgd2l0aCBhIGhvc3RuYW1lIGV4YWN0bHkgbWF0Y2hpbmcgYSBrZXkgaW4gdGhlIG9iamVjdCxcbiAqIHVzZSB0aGUgZ2l2ZW4gSVAgYWRkcmVzcyB0byBjb25uZWN0LCBpbnN0ZWFkIG9mIHVzaW5nIEROUyB0byByZXNvbHZlIHRoZSBob3N0bmFtZS5cbiAqXG4gKiBBIHNwZWNpYWwgaG9zdCBgKmAgbWF0Y2hlcyBldmVyeSBob3N0bmFtZSAoa2VlcCByZWRpcmVjdHMgaW4gbWluZCEpXG4gKlxuICogICAgICByZXF1ZXN0LmNvbm5lY3Qoe1xuICogICAgICAgICd0ZXN0LmV4YW1wbGUuY29tJzogJzEyNy4wLjAuMScsXG4gKiAgICAgICAgJ2lwdjYuZXhhbXBsZS5jb20nOiAnOjoxJyxcbiAqICAgICAgfSlcbiAqL1xuUmVxdWVzdC5wcm90b3R5cGUuY29ubmVjdCA9IGZ1bmN0aW9uIChjb25uZWN0T3ZlcnJpZGUpIHtcbiAgaWYgKHR5cGVvZiBjb25uZWN0T3ZlcnJpZGUgPT09ICdzdHJpbmcnKSB7XG4gICAgdGhpcy5fY29ubmVjdE92ZXJyaWRlID0geyAnKic6IGNvbm5lY3RPdmVycmlkZSB9O1xuICB9IGVsc2UgaWYgKHR5cGVvZiBjb25uZWN0T3ZlcnJpZGUgPT09ICdvYmplY3QnKSB7XG4gICAgdGhpcy5fY29ubmVjdE92ZXJyaWRlID0gY29ubmVjdE92ZXJyaWRlO1xuICB9IGVsc2Uge1xuICAgIHRoaXMuX2Nvbm5lY3RPdmVycmlkZSA9IHVuZGVmaW5lZDtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuUmVxdWVzdC5wcm90b3R5cGUudHJ1c3RMb2NhbGhvc3QgPSBmdW5jdGlvbiAodG9nZ2xlKSB7XG4gIHRoaXMuX3RydXN0TG9jYWxob3N0ID0gdG9nZ2xlID09PSB1bmRlZmluZWQgPyB0cnVlIDogdG9nZ2xlO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8vIGdlbmVyYXRlIEhUVFAgdmVyYiBtZXRob2RzXG5pZiAoIW1ldGhvZHMuaW5jbHVkZXMoJ2RlbCcpKSB7XG4gIC8vIGNyZWF0ZSBhIGNvcHkgc28gd2UgZG9uJ3QgY2F1c2UgY29uZmxpY3RzIHdpdGhcbiAgLy8gb3RoZXIgcGFja2FnZXMgdXNpbmcgdGhlIG1ldGhvZHMgcGFja2FnZSBhbmRcbiAgLy8gbnBtIDMueFxuICBtZXRob2RzID0gWy4uLm1ldGhvZHNdO1xuICBtZXRob2RzLnB1c2goJ2RlbCcpO1xufVxuXG5mb3IgKGxldCBtZXRob2Qgb2YgbWV0aG9kcykge1xuICBjb25zdCBuYW1lID0gbWV0aG9kO1xuICBtZXRob2QgPSBtZXRob2QgPT09ICdkZWwnID8gJ2RlbGV0ZScgOiBtZXRob2Q7XG5cbiAgbWV0aG9kID0gbWV0aG9kLnRvVXBwZXJDYXNlKCk7XG4gIHJlcXVlc3RbbmFtZV0gPSAodXJsLCBkYXRhLCBmbikgPT4ge1xuICAgIGNvbnN0IHJlcXVlc3RfID0gcmVxdWVzdChtZXRob2QsIHVybCk7XG4gICAgaWYgKHR5cGVvZiBkYXRhID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBmbiA9IGRhdGE7XG4gICAgICBkYXRhID0gbnVsbDtcbiAgICB9XG5cbiAgICBpZiAoZGF0YSkge1xuICAgICAgaWYgKG1ldGhvZCA9PT0gJ0dFVCcgfHwgbWV0aG9kID09PSAnSEVBRCcpIHtcbiAgICAgICAgcmVxdWVzdF8ucXVlcnkoZGF0YSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXF1ZXN0Xy5zZW5kKGRhdGEpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChmbikgcmVxdWVzdF8uZW5kKGZuKTtcbiAgICByZXR1cm4gcmVxdWVzdF87XG4gIH07XG59XG5cbi8qKlxuICogQ2hlY2sgaWYgYG1pbWVgIGlzIHRleHQgYW5kIHNob3VsZCBiZSBidWZmZXJlZC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbWltZVxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gaXNUZXh0KG1pbWUpIHtcbiAgY29uc3QgcGFydHMgPSBtaW1lLnNwbGl0KCcvJyk7XG4gIGxldCB0eXBlID0gcGFydHNbMF07XG4gIGlmICh0eXBlKSB0eXBlID0gdHlwZS50b0xvd2VyQ2FzZSgpLnRyaW0oKTtcbiAgbGV0IHN1YnR5cGUgPSBwYXJ0c1sxXTtcbiAgaWYgKHN1YnR5cGUpIHN1YnR5cGUgPSBzdWJ0eXBlLnRvTG93ZXJDYXNlKCkudHJpbSgpO1xuXG4gIHJldHVybiB0eXBlID09PSAndGV4dCcgfHwgc3VidHlwZSA9PT0gJ3gtd3d3LWZvcm0tdXJsZW5jb2RlZCc7XG59XG5cbi8vIFRoaXMgaXMgbm90IGEgY2F0Y2hhbGwsIGJ1dCBhIHN0YXJ0LiBJdCBtaWdodCBiZSB1c2VmdWxcbi8vIGluIHRoZSBsb25nIHJ1biB0byBoYXZlIGZpbGUgdGhhdCBpbmNsdWRlcyBhbGwgYmluYXJ5XG4vLyBjb250ZW50IHR5cGVzIGZyb20gaHR0cHM6Ly93d3cuaWFuYS5vcmcvYXNzaWdubWVudHMvbWVkaWEtdHlwZXMvbWVkaWEtdHlwZXMueGh0bWxcbmZ1bmN0aW9uIGlzQmluYXJ5KG1pbWUpIHtcbiAgbGV0IFtyZWdpc3RyeSwgbmFtZV0gPSBtaW1lLnNwbGl0KCcvJyk7XG4gIGlmIChyZWdpc3RyeSkgcmVnaXN0cnkgPSByZWdpc3RyeS50b0xvd2VyQ2FzZSgpLnRyaW0oKTtcbiAgaWYgKG5hbWUpIG5hbWUgPSBuYW1lLnRvTG93ZXJDYXNlKCkudHJpbSgpO1xuICByZXR1cm4gKFxuICAgIFsnYXVkaW8nLCAnZm9udCcsICdpbWFnZScsICd2aWRlbyddLmluY2x1ZGVzKHJlZ2lzdHJ5KSB8fFxuICAgIFsnZ3onLCAnZ3ppcCddLmluY2x1ZGVzKG5hbWUpXG4gICk7XG59XG5cbi8qKlxuICogQ2hlY2sgaWYgYG1pbWVgIGlzIGpzb24gb3IgaGFzICtqc29uIHN0cnVjdHVyZWQgc3ludGF4IHN1ZmZpeC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbWltZVxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIGlzSlNPTihtaW1lKSB7XG4gIC8vIHNob3VsZCBtYXRjaCAvanNvbiBvciAranNvblxuICAvLyBidXQgbm90IC9qc29uLXNlcVxuICByZXR1cm4gL1svK11qc29uKCR8W14tXFx3XSkvaS50ZXN0KG1pbWUpO1xufVxuXG4vKipcbiAqIENoZWNrIGlmIHdlIHNob3VsZCBmb2xsb3cgdGhlIHJlZGlyZWN0IGBjb2RlYC5cbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gY29kZVxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIGlzUmVkaXJlY3QoY29kZSkge1xuICByZXR1cm4gWzMwMSwgMzAyLCAzMDMsIDMwNSwgMzA3LCAzMDhdLmluY2x1ZGVzKGNvZGUpO1xufVxuXG5mdW5jdGlvbiBoYXNOb25FbXB0eVJlc3BvbnNlQ29udGVudChyZXMpIHtcbiAgaWYgKHJlcy5zdGF0dXNDb2RlID09PSAyMDQgfHwgcmVzLnN0YXR1c0NvZGUgPT09IDMwNCkge1xuICAgIC8vIFRoZXNlIGFyZW4ndCBzdXBwb3NlZCB0byBoYXZlIGFueSBib2R5XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLy8gaGVhZGVyIGNvbnRlbnQgaXMgYSBzdHJpbmcsIGFuZCBkaXN0aW5jdGlvbiBiZXR3ZWVuIDAgYW5kIG5vIGluZm9ybWF0aW9uIGlzIGNydWNpYWxcbiAgaWYgKHJlcy5oZWFkZXJzWydjb250ZW50LWxlbmd0aCddID09PSAnMCcpIHtcbiAgICAvLyBXZSBrbm93IHRoYXQgdGhlIGJvZHkgaXMgZW1wdHkgKHVuZm9ydHVuYXRlbHksIHRoaXMgY2hlY2sgZG9lcyBub3QgY292ZXIgY2h1bmtlZCBlbmNvZGluZylcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn1cbiJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7O0FBRUEsTUFBTTtFQUFFQTtBQUFPLENBQUMsR0FBR0MsT0FBTyxDQUFDLEtBQUssQ0FBQztBQUNqQyxNQUFNQyxNQUFNLEdBQUdELE9BQU8sQ0FBQyxRQUFRLENBQUM7QUFDaEMsTUFBTUUsS0FBSyxHQUFHRixPQUFPLENBQUMsT0FBTyxDQUFDO0FBQzlCLE1BQU1HLElBQUksR0FBR0gsT0FBTyxDQUFDLE1BQU0sQ0FBQztBQUM1QixNQUFNSSxFQUFFLEdBQUdKLE9BQU8sQ0FBQyxJQUFJLENBQUM7QUFDeEIsTUFBTUssSUFBSSxHQUFHTCxPQUFPLENBQUMsTUFBTSxDQUFDO0FBQzVCLE1BQU1NLElBQUksR0FBR04sT0FBTyxDQUFDLE1BQU0sQ0FBQztBQUM1QixNQUFNTyxFQUFFLEdBQUdQLE9BQU8sQ0FBQyxJQUFJLENBQUM7QUFDeEIsTUFBTVEsSUFBSSxHQUFHUixPQUFPLENBQUMsTUFBTSxDQUFDO0FBQzVCLElBQUlTLE9BQU8sR0FBR1QsT0FBTyxDQUFDLFNBQVMsQ0FBQztBQUNoQyxNQUFNVSxRQUFRLEdBQUdW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