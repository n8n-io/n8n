"use strict";

/**
 * Root reference for iframes.
 */

let root;
if (typeof window !== 'undefined') {
  // Browser window
  root = window;
} else if (typeof self === 'undefined') {
  // Other environments
  console.warn('Using browser-only version of superagent in non-browser environment');
  root = void 0;
} else {
  // Web Worker
  root = self;
}
const Emitter = require('component-emitter');
const safeStringify = require('fast-safe-stringify');
const qs = require('qs');
const RequestBase = require('./request-base');
const {
  isObject,
  mixin,
  hasOwn
} = require('./utils');
const ResponseBase = require('./response-base');
const Agent = require('./agent-base');

/**
 * Noop.
 */

function noop() {}

/**
 * Expose `request`.
 */

module.exports = function (method, url) {
  // callback
  if (typeof url === 'function') {
    return new exports.Request('GET', method).end(url);
  }

  // url first
  if (arguments.length === 1) {
    return new exports.Request('GET', method);
  }
  return new exports.Request(method, url);
};
exports = module.exports;
const request = exports;
exports.Request = Request;

/**
 * Determine XHR.
 */

request.getXHR = () => {
  if (root.XMLHttpRequest) {
    return new root.XMLHttpRequest();
  }
  throw new Error('Browser-only version of superagent could not find XHR');
};

/**
 * Removes leading and trailing whitespace, added to support IE.
 *
 * @param {String} s
 * @return {String}
 * @api private
 */

const trim = ''.trim ? s => s.trim() : s => s.replace(/(^\s*|\s*$)/g, '');

/**
 * Serialize the given `obj`.
 *
 * @param {Object} obj
 * @return {String}
 * @api private
 */

function serialize(object) {
  if (!isObject(object)) return object;
  const pairs = [];
  for (const key in object) {
    if (hasOwn(object, key)) pushEncodedKeyValuePair(pairs, key, object[key]);
  }
  return pairs.join('&');
}

/**
 * Helps 'serialize' with serializing arrays.
 * Mutates the pairs array.
 *
 * @param {Array} pairs
 * @param {String} key
 * @param {Mixed} val
 */

function pushEncodedKeyValuePair(pairs, key, value) {
  if (value === undefined) return;
  if (value === null) {
    pairs.push(encodeURI(key));
    return;
  }
  if (Array.isArray(value)) {
    for (const v of value) {
      pushEncodedKeyValuePair(pairs, key, v);
    }
  } else if (isObject(value)) {
    for (const subkey in value) {
      if (hasOwn(value, subkey)) pushEncodedKeyValuePair(pairs, `${key}[${subkey}]`, value[subkey]);
    }
  } else {
    pairs.push(encodeURI(key) + '=' + encodeURIComponent(value));
  }
}

/**
 * Expose serialization method.
 */

request.serializeObject = serialize;

/**
 * Parse the given x-www-form-urlencoded `str`.
 *
 * @param {String} str
 * @return {Object}
 * @api private
 */

function parseString(string_) {
  const object = {};
  const pairs = string_.split('&');
  let pair;
  let pos;
  for (let i = 0, length_ = pairs.length; i < length_; ++i) {
    pair = pairs[i];
    pos = pair.indexOf('=');
    if (pos === -1) {
      object[decodeURIComponent(pair)] = '';
    } else {
      object[decodeURIComponent(pair.slice(0, pos))] = decodeURIComponent(pair.slice(pos + 1));
    }
  }
  return object;
}

/**
 * Expose parser.
 */

request.parseString = parseString;

/**
 * Default MIME type map.
 *
 *     superagent.types.xml = 'application/xml';
 *
 */

request.types = {
  html: 'text/html',
  json: 'application/json',
  xml: 'text/xml',
  urlencoded: 'application/x-www-form-urlencoded',
  form: 'application/x-www-form-urlencoded',
  'form-data': 'application/x-www-form-urlencoded'
};

/**
 * Default serialization map.
 *
 *     superagent.serialize['application/xml'] = function(obj){
 *       return 'generated xml here';
 *     };
 *
 */

request.serialize = {
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
 *     superagent.parse['application/xml'] = function(str){
 *       return { object parsed from str };
 *     };
 *
 */

request.parse = {
  'application/x-www-form-urlencoded': parseString,
  'application/json': JSON.parse
};

/**
 * Parse the given header `str` into
 * an object containing the mapped fields.
 *
 * @param {String} str
 * @return {Object}
 * @api private
 */

function parseHeader(string_) {
  const lines = string_.split(/\r?\n/);
  const fields = {};
  let index;
  let line;
  let field;
  let value;
  for (let i = 0, length_ = lines.length; i < length_; ++i) {
    line = lines[i];
    index = line.indexOf(':');
    if (index === -1) {
      // could be empty line, just skip it
      continue;
    }
    field = line.slice(0, index).toLowerCase();
    value = trim(line.slice(index + 1));
    fields[field] = value;
  }
  return fields;
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
 * Initialize a new `Response` with the given `xhr`.
 *
 *  - set flags (.ok, .error, etc)
 *  - parse header
 *
 * Examples:
 *
 *  Aliasing `superagent` as `request` is nice:
 *
 *      request = superagent;
 *
 *  We can use the promise-like API, or pass callbacks:
 *
 *      request.get('/').end(function(res){});
 *      request.get('/', function(res){});
 *
 *  Sending data can be chained:
 *
 *      request
 *        .post('/user')
 *        .send({ name: 'tj' })
 *        .end(function(res){});
 *
 *  Or passed to `.send()`:
 *
 *      request
 *        .post('/user')
 *        .send({ name: 'tj' }, function(res){});
 *
 *  Or passed to `.post()`:
 *
 *      request
 *        .post('/user', { name: 'tj' })
 *        .end(function(res){});
 *
 * Or further reduced to a single call for simple cases:
 *
 *      request
 *        .post('/user', { name: 'tj' }, function(res){});
 *
 * @param {XMLHTTPRequest} xhr
 * @param {Object} options
 * @api private
 */

function Response(request_) {
  this.req = request_;
  this.xhr = this.req.xhr;
  // responseText is accessible only if responseType is '' or 'text' and on older browsers
  this.text = this.req.method !== 'HEAD' && (this.xhr.responseType === '' || this.xhr.responseType === 'text') || typeof this.xhr.responseType === 'undefined' ? this.xhr.responseText : null;
  this.statusText = this.req.xhr.statusText;
  let {
    status
  } = this.xhr;
  // handle IE9 bug: http://stackoverflow.com/questions/10046972/msie-returns-status-code-of-1223-for-ajax-request
  if (status === 1223) {
    status = 204;
  }
  this._setStatusProperties(status);
  this.headers = parseHeader(this.xhr.getAllResponseHeaders());
  this.header = this.headers;
  // getAllResponseHeaders sometimes falsely returns "" for CORS requests, but
  // getResponseHeader still works. so we get content-type even if getting
  // other headers fails.
  this.header['content-type'] = this.xhr.getResponseHeader('content-type');
  this._setHeaderProperties(this.header);
  if (this.text === null && request_._responseType) {
    this.body = this.xhr.response;
  } else {
    this.body = this.req.method === 'HEAD' ? null : this._parseBody(this.text ? this.text : this.xhr.response);
  }
}
mixin(Response.prototype, ResponseBase.prototype);

/**
 * Parse the given body `str`.
 *
 * Used for auto-parsing of bodies. Parsers
 * are defined on the `superagent.parse` object.
 *
 * @param {String} str
 * @return {Mixed}
 * @api private
 */

Response.prototype._parseBody = function (string_) {
  let parse = request.parse[this.type];
  if (this.req._parser) {
    return this.req._parser(this, string_);
  }
  if (!parse && isJSON(this.type)) {
    parse = request.parse['application/json'];
  }
  return parse && string_ && (string_.length > 0 || string_ instanceof Object) ? parse(string_) : null;
};

/**
 * Return an `Error` representative of this response.
 *
 * @return {Error}
 * @api public
 */

Response.prototype.toError = function () {
  const {
    req
  } = this;
  const {
    method
  } = req;
  const {
    url
  } = req;
  const message = `cannot ${method} ${url} (${this.status})`;
  const error = new Error(message);
  error.status = this.status;
  error.method = method;
  error.url = url;
  return error;
};

/**
 * Expose `Response`.
 */

request.Response = Response;

/**
 * Initialize a new `Request` with the given `method` and `url`.
 *
 * @param {String} method
 * @param {String} url
 * @api public
 */

function Request(method, url) {
  const self = this;
  this._query = this._query || [];
  this.method = method;
  this.url = url;
  this.header = {}; // preserves header name case
  this._header = {}; // coerces header names to lowercase
  this.on('end', () => {
    let error = null;
    let res = null;
    try {
      res = new Response(self);
    } catch (err) {
      error = new Error('Parser is unable to parse the response');
      error.parse = true;
      error.original = err;
      // issue #675: return the raw response if the response parsing fails
      if (self.xhr) {
        // ie9 doesn't have 'response' property
        error.rawResponse = typeof self.xhr.responseType === 'undefined' ? self.xhr.responseText : self.xhr.response;
        // issue #876: return the http status code if the response parsing fails
        error.status = self.xhr.status ? self.xhr.status : null;
        error.statusCode = error.status; // backwards-compat only
      } else {
        error.rawResponse = null;
        error.status = null;
      }
      return self.callback(error);
    }
    self.emit('response', res);
    let new_error;
    try {
      if (!self._isResponseOK(res)) {
        new_error = new Error(res.statusText || res.text || 'Unsuccessful HTTP response');
      }
    } catch (err) {
      new_error = err; // ok() callback can throw
    }

    // #1000 don't catch errors from the callback to avoid double calling it
    if (new_error) {
      new_error.original = error;
      new_error.response = res;
      new_error.status = new_error.status || res.status;
      self.callback(new_error, res);
    } else {
      self.callback(null, res);
    }
  });
}

/**
 * Mixin `Emitter` and `RequestBase`.
 */

// eslint-disable-next-line new-cap
Emitter(Request.prototype);
mixin(Request.prototype, RequestBase.prototype);

/**
 * Set Content-Type to `type`, mapping values from `request.types`.
 *
 * Examples:
 *
 *      superagent.types.xml = 'application/xml';
 *
 *      request.post('/')
 *        .type('xml')
 *        .send(xmlstring)
 *        .end(callback);
 *
 *      request.post('/')
 *        .type('application/xml')
 *        .send(xmlstring)
 *        .end(callback);
 *
 * @param {String} type
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.type = function (type) {
  this.set('Content-Type', request.types[type] || type);
  return this;
};

/**
 * Set Accept to `type`, mapping values from `request.types`.
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
  this.set('Accept', request.types[type] || type);
  return this;
};

/**
 * Set Authorization field value with `user` and `pass`.
 *
 * @param {String} user
 * @param {String} [pass] optional in case of using 'bearer' as type
 * @param {Object} options with 'type' property 'auto', 'basic' or 'bearer' (default 'basic')
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
      type: typeof btoa === 'function' ? 'basic' : 'auto'
    };
  }
  const encoder = options.encoder ? options.encoder : string => {
    if (typeof btoa === 'function') {
      return btoa(string);
    }
    throw new Error('Cannot use basic auth, btoa is not a function');
  };
  return this._auth(user, pass, options, encoder);
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
  if (typeof value !== 'string') value = serialize(value);
  if (value) this._query.push(value);
  return this;
};

/**
 * Queue the given `file` as an attachment to the specified `field`,
 * with optional `options` (or filename).
 *
 * ``` js
 * request.post('/upload')
 *   .attach('content', new Blob(['<a id="a"><b id="b">hey!</b></a>'], { type: "text/html"}))
 *   .end(callback);
 * ```
 *
 * @param {String} field
 * @param {Blob|File} file
 * @param {String|Object} options
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.attach = function (field, file, options) {
  if (file) {
    if (this._data) {
      throw new Error("superagent can't mix .send() and .attach()");
    }
    this._getFormData().append(field, file, options || file.name);
  }
  return this;
};
Request.prototype._getFormData = function () {
  if (!this._formData) {
    this._formData = new root.FormData();
  }
  return this._formData;
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
  const fn = this._callback;
  this.clearTimeout();
  if (error) {
    if (this._maxRetries) error.retries = this._retries - 1;
    this.emit('error', error);
  }
  fn(error, res);
};

/**
 * Invoke callback with x-domain error.
 *
 * @api private
 */

Request.prototype.crossDomainError = function () {
  const error = new Error('Request has been terminated\nPossible causes: the network is offline, Origin is not allowed by Access-Control-Allow-Origin, the page is being unloaded, etc.');
  error.crossDomain = true;
  error.status = this.status;
  error.method = this.method;
  error.url = this.url;
  this.callback(error);
};

// This only warns, because the request is still likely to work
Request.prototype.agent = function () {
  console.warn('This is not supported in browser version of superagent');
  return this;
};
Request.prototype.ca = Request.prototype.agent;
Request.prototype.buffer = Request.prototype.ca;

// This throws, because it can't send/receive data as expected
Request.prototype.write = () => {
  throw new Error('Streaming is not supported in browser version of superagent');
};
Request.prototype.pipe = Request.prototype.write;

/**
 * Check if `obj` is a host object,
 * we don't want to serialize these :)
 *
 * @param {Object} obj host object
 * @return {Boolean} is a host object
 * @api private
 */
Request.prototype._isHost = function (object) {
  // Native objects stringify to [object File], [object Blob], [object FormData], etc.
  return object && typeof object === 'object' && !Array.isArray(object) && Object.prototype.toString.call(object) !== '[object Object]';
};

/**
 * Initiate request, invoking callback `fn(res)`
 * with an instanceof `Response`.
 *
 * @param {Function} fn
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.end = function (fn) {
  if (this._endCalled) {
    console.warn('Warning: .end() was called twice. This is not supported in superagent');
  }
  this._endCalled = true;

  // store callback
  this._callback = fn || noop;

  // querystring
  this._finalizeQueryString();
  this._end();
};
Request.prototype._setUploadTimeout = function () {
  const self = this;

  // upload timeout it's wokrs only if deadline timeout is off
  if (this._uploadTimeout && !this._uploadTimeoutTimer) {
    this._uploadTimeoutTimer = setTimeout(() => {
      self._timeoutError('Upload timeout of ', self._uploadTimeout, 'ETIMEDOUT');
    }, this._uploadTimeout);
  }
};

// eslint-disable-next-line complexity
Request.prototype._end = function () {
  if (this._aborted) return this.callback(new Error('The request has been aborted even before .end() was called'));
  const self = this;
  this.xhr = request.getXHR();
  const {
    xhr
  } = this;
  let data = this._formData || this._data;
  this._setTimeouts();

  // state change
  xhr.addEventListener('readystatechange', () => {
    const {
      readyState
    } = xhr;
    if (readyState >= 2 && self._responseTimeoutTimer) {
      clearTimeout(self._responseTimeoutTimer);
    }
    if (readyState !== 4) {
      return;
    }

    // In IE9, reads to any property (e.g. status) off of an aborted XHR will
    // result in the error "Could not complete the operation due to error c00c023f"
    let status;
    try {
      status = xhr.status;
    } catch (err) {
      status = 0;
    }
    if (!status) {
      if (self.timedout || self._aborted) return;
      return self.crossDomainError();
    }
    self.emit('end');
  });

  // progress
  const handleProgress = (direction, e) => {
    if (e.total > 0) {
      e.percent = e.loaded / e.total * 100;
      if (e.percent === 100) {
        clearTimeout(self._uploadTimeoutTimer);
      }
    }
    e.direction = direction;
    self.emit('progress', e);
  };
  if (this.hasListeners('progress')) {
    try {
      xhr.addEventListener('progress', handleProgress.bind(null, 'download'));
      if (xhr.upload) {
        xhr.upload.addEventListener('progress', handleProgress.bind(null, 'upload'));
      }
    } catch (err) {
      // Accessing xhr.upload fails in IE from a web worker, so just pretend it doesn't exist.
      // Reported here:
      // https://connect.microsoft.com/IE/feedback/details/837245/xmlhttprequest-upload-throws-invalid-argument-when-used-from-web-worker-context
    }
  }
  if (xhr.upload) {
    this._setUploadTimeout();
  }

  // initiate request
  try {
    if (this.username && this.password) {
      xhr.open(this.method, this.url, true, this.username, this.password);
    } else {
      xhr.open(this.method, this.url, true);
    }
  } catch (err) {
    // see #1149
    return this.callback(err);
  }

  // CORS
  if (this._withCredentials) xhr.withCredentials = true;

  // body
  if (!this._formData && this.method !== 'GET' && this.method !== 'HEAD' && typeof data !== 'string' && !this._isHost(data)) {
    // serialize stuff
    const contentType = this._header['content-type'];
    let serialize = this._serializer || request.serialize[contentType ? contentType.split(';')[0] : ''];
    if (!serialize && isJSON(contentType)) {
      serialize = request.serialize['application/json'];
    }
    if (serialize) data = serialize(data);
  }

  // set header fields
  for (const field in this.header) {
    if (this.header[field] === null) continue;
    if (hasOwn(this.header, field)) xhr.setRequestHeader(field, this.header[field]);
  }
  if (this._responseType) {
    xhr.responseType = this._responseType;
  }

  // send stuff
  this.emit('request', this);

  // IE11 xhr.send(undefined) sends 'undefined' string as POST payload (instead of nothing)
  // We need null here if data is undefined
  xhr.send(typeof data === 'undefined' ? null : data);
};
request.agent = () => new Agent();
for (const method of ['GET', 'POST', 'OPTIONS', 'PATCH', 'PUT', 'DELETE']) {
  Agent.prototype[method.toLowerCase()] = function (url, fn) {
    const request_ = new request.Request(method, url);
    this._setDefaults(request_);
    if (fn) {
      request_.end(fn);
    }
    return request_;
  };
}
Agent.prototype.del = Agent.prototype.delete;

/**
 * GET `url` with optional callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed|Function} [data] or fn
 * @param {Function} [fn]
 * @return {Request}
 * @api public
 */

request.get = (url, data, fn) => {
  const request_ = request('GET', url);
  if (typeof data === 'function') {
    fn = data;
    data = null;
  }
  if (data) request_.query(data);
  if (fn) request_.end(fn);
  return request_;
};

/**
 * HEAD `url` with optional callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed|Function} [data] or fn
 * @param {Function} [fn]
 * @return {Request}
 * @api public
 */

request.head = (url, data, fn) => {
  const request_ = request('HEAD', url);
  if (typeof data === 'function') {
    fn = data;
    data = null;
  }
  if (data) request_.query(data);
  if (fn) request_.end(fn);
  return request_;
};

/**
 * OPTIONS query to `url` with optional callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed|Function} [data] or fn
 * @param {Function} [fn]
 * @return {Request}
 * @api public
 */

request.options = (url, data, fn) => {
  const request_ = request('OPTIONS', url);
  if (typeof data === 'function') {
    fn = data;
    data = null;
  }
  if (data) request_.send(data);
  if (fn) request_.end(fn);
  return request_;
};

/**
 * DELETE `url` with optional `data` and callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed} [data]
 * @param {Function} [fn]
 * @return {Request}
 * @api public
 */

function del(url, data, fn) {
  const request_ = request('DELETE', url);
  if (typeof data === 'function') {
    fn = data;
    data = null;
  }
  if (data) request_.send(data);
  if (fn) request_.end(fn);
  return request_;
}
request.del = del;
request.delete = del;

/**
 * PATCH `url` with optional `data` and callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed} [data]
 * @param {Function} [fn]
 * @return {Request}
 * @api public
 */

request.patch = (url, data, fn) => {
  const request_ = request('PATCH', url);
  if (typeof data === 'function') {
    fn = data;
    data = null;
  }
  if (data) request_.send(data);
  if (fn) request_.end(fn);
  return request_;
};

/**
 * POST `url` with optional `data` and callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed} [data]
 * @param {Function} [fn]
 * @return {Request}
 * @api public
 */

request.post = (url, data, fn) => {
  const request_ = request('POST', url);
  if (typeof data === 'function') {
    fn = data;
    data = null;
  }
  if (data) request_.send(data);
  if (fn) request_.end(fn);
  return request_;
};

/**
 * PUT `url` with optional `data` and callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed|Function} [data] or fn
 * @param {Function} [fn]
 * @return {Request}
 * @api public
 */

request.put = (url, data, fn) => {
  const request_ = request('PUT', url);
  if (typeof data === 'function') {
    fn = data;
    data = null;
  }
  if (data) request_.send(data);
  if (fn) request_.end(fn);
  return request_;
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6WyJyb290Iiwid2luZG93Iiwic2VsZiIsImNvbnNvbGUiLCJ3YXJuIiwiRW1pdHRlciIsInJlcXVpcmUiLCJzYWZlU3RyaW5naWZ5IiwicXMiLCJSZXF1ZXN0QmFzZSIsImlzT2JqZWN0IiwibWl4aW4iLCJoYXNPd24iLCJSZXNwb25zZUJhc2UiLCJBZ2VudCIsIm5vb3AiLCJtb2R1bGUiLCJleHBvcnRzIiwibWV0aG9kIiwidXJsIiwiUmVxdWVzdCIsImVuZCIsImFyZ3VtZW50cyIsImxlbmd0aCIsInJlcXVlc3QiLCJnZXRYSFIiLCJYTUxIdHRwUmVxdWVzdCIsIkVycm9yIiwidHJpbSIsInMiLCJyZXBsYWNlIiwic2VyaWFsaXplIiwib2JqZWN0IiwicGFpcnMiLCJrZXkiLCJwdXNoRW5jb2RlZEtleVZhbHVlUGFpciIsImpvaW4iLCJ2YWx1ZSIsInVuZGVmaW5lZCIsInB1c2giLCJlbmNvZGVVUkkiLCJBcnJheSIsImlzQXJyYXkiLCJ2Iiwic3Via2V5IiwiZW5jb2RlVVJJQ29tcG9uZW50Iiwic2VyaWFsaXplT2JqZWN0IiwicGFyc2VTdHJpbmciLCJzdHJpbmdfIiwic3BsaXQiLCJwYWlyIiwicG9zIiwiaSIsImxlbmd0aF8iLCJpbmRleE9mIiwiZGVjb2RlVVJJQ29tcG9uZW50Iiwic2xpY2UiLCJ0eXBlcyIsImh0bWwiLCJqc29uIiwieG1sIiwidXJsZW5jb2RlZCIsImZvcm0iLCJvYmoiLCJzdHJpbmdpZnkiLCJpbmRpY2VzIiwic3RyaWN0TnVsbEhhbmRsaW5nIiwicGFyc2UiLCJKU09OIiwicGFyc2VIZWFkZXIiLCJsaW5lcyIsImZpZWxkcyIsImluZGV4IiwibGluZSIsImZpZWxkIiwidG9Mb3dlckNhc2UiLCJpc0pTT04iLCJtaW1lIiwidGVzdCIsIlJlc3BvbnNlIiwicmVxdWVzdF8iLCJyZXEiLCJ4aHIiLCJ0ZXh0IiwicmVzcG9uc2VUeXBlIiwicmVzcG9uc2VUZXh0Iiwic3RhdHVzVGV4dCIsInN0YXR1cyIsIl9zZXRTdGF0dXNQcm9wZXJ0aWVzIiwiaGVhZGVycyIsImdldEFsbFJlc3BvbnNlSGVhZGVycyIsImhlYWRlciIsImdldFJlc3BvbnNlSGVhZGVyIiwiX3NldEhlYWRlclByb3BlcnRpZXMiLCJfcmVzcG9uc2VUeXBlIiwiYm9keSIsInJlc3BvbnNlIiwiX3BhcnNlQm9keSIsInByb3RvdHlwZSIsInR5cGUiLCJfcGFyc2VyIiwiT2JqZWN0IiwidG9FcnJvciIsIm1lc3NhZ2UiLCJlcnJvciIsIl9xdWVyeSIsIl9oZWFkZXIiLCJvbiIsInJlcyIsImVyciIsIm9yaWdpbmFsIiwicmF3UmVzcG9uc2UiLCJzdGF0dXNDb2RlIiwiY2FsbGJhY2siLCJlbWl0IiwibmV3X2Vycm9yIiwiX2lzUmVzcG9uc2VPSyIsInNldCIsImFjY2VwdCIsImF1dGgiLCJ1c2VyIiwicGFzcyIsIm9wdGlvbnMiLCJidG9hIiwiZW5jb2RlciIsInN0cmluZyIsIl9hdXRoIiwicXVlcnkiLCJhdHRhY2giLCJmaWxlIiwiX2RhdGEiLCJfZ2V0Rm9ybURhdGEiLCJhcHBlbmQiLCJuYW1lIiwiX2Zvcm1EYXRhIiwiRm9ybURhdGEiLCJfc2hvdWxkUmV0cnkiLCJfcmV0cnkiLCJmbiIsIl9jYWxsYmFjayIsImNsZWFyVGltZW91dCIsIl9tYXhSZXRyaWVzIiwicmV0cmllcyIsIl9yZXRyaWVzIiwiY3Jvc3NEb21haW5FcnJvciIsImNyb3NzRG9tYWluIiwiYWdlbnQiLCJjYSIsImJ1ZmZlciIsIndyaXRlIiwicGlwZSIsIl9pc0hvc3QiLCJ0b1N0cmluZyIsImNhbGwiLCJfZW5kQ2FsbGVkIiwiX2ZpbmFsaXplUXVlcnlTdHJpbmciLCJfZW5kIiwiX3NldFVwbG9hZFRpbWVvdXQiLCJfdXBsb2FkVGltZW91dCIsIl91cGxvYWRUaW1lb3V0VGltZXIiLCJzZXRUaW1lb3V0IiwiX3RpbWVvdXRFcnJvciIsIl9hYm9ydGVkIiwiZGF0YSIsIl9zZXRUaW1lb3V0cyIsImFkZEV2ZW50TGlzdGVuZXIiLCJyZWFkeVN0YXRlIiwiX3Jlc3BvbnNlVGltZW91dFRpbWVyIiwidGltZWRvdXQiLCJoYW5kbGVQcm9ncmVzcyIsImRpcmVjdGlvbiIsImUiLCJ0b3RhbCIsInBlcmNlbnQiLCJsb2FkZWQiLCJoYXNMaXN0ZW5lcnMiLCJiaW5kIiwidXBsb2FkIiwidXNlcm5hbWUiLCJwYXNzd29yZCIsIm9wZW4iLCJfd2l0aENyZWRlbnRpYWxzIiwid2l0aENyZWRlbnRpYWxzIiwiY29udGVudFR5cGUiLCJfc2VyaWFsaXplciIsInNldFJlcXVlc3RIZWFkZXIiLCJzZW5kIiwiX3NldERlZmF1bHRzIiwiZGVsIiwiZGVsZXRlIiwiZ2V0IiwiaGVhZCIsInBhdGNoIiwicG9zdCIsInB1dCJdLCJzb3VyY2VzIjpbIi4uL3NyYy9jbGllbnQuanMiXSwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBSb290IHJlZmVyZW5jZSBmb3IgaWZyYW1lcy5cbiAqL1xuXG5sZXQgcm9vdDtcbmlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykge1xuICAvLyBCcm93c2VyIHdpbmRvd1xuICByb290ID0gd2luZG93O1xufSBlbHNlIGlmICh0eXBlb2Ygc2VsZiA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgLy8gT3RoZXIgZW52aXJvbm1lbnRzXG4gIGNvbnNvbGUud2FybihcbiAgICAnVXNpbmcgYnJvd3Nlci1vbmx5IHZlcnNpb24gb2Ygc3VwZXJhZ2VudCBpbiBub24tYnJvd3NlciBlbnZpcm9ubWVudCdcbiAgKTtcbiAgcm9vdCA9IHRoaXM7XG59IGVsc2Uge1xuICAvLyBXZWIgV29ya2VyXG4gIHJvb3QgPSBzZWxmO1xufVxuXG5jb25zdCBFbWl0dGVyID0gcmVxdWlyZSgnY29tcG9uZW50LWVtaXR0ZXInKTtcbmNvbnN0IHNhZmVTdHJpbmdpZnkgPSByZXF1aXJlKCdmYXN0LXNhZmUtc3RyaW5naWZ5Jyk7XG5jb25zdCBxcyA9IHJlcXVpcmUoJ3FzJyk7XG5jb25zdCBSZXF1ZXN0QmFzZSA9IHJlcXVpcmUoJy4vcmVxdWVzdC1iYXNlJyk7XG5jb25zdCB7IGlzT2JqZWN0LCBtaXhpbiwgaGFzT3duIH0gPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5jb25zdCBSZXNwb25zZUJhc2UgPSByZXF1aXJlKCcuL3Jlc3BvbnNlLWJhc2UnKTtcbmNvbnN0IEFnZW50ID0gcmVxdWlyZSgnLi9hZ2VudC1iYXNlJyk7XG5cbi8qKlxuICogTm9vcC5cbiAqL1xuXG5mdW5jdGlvbiBub29wKCkge31cblxuLyoqXG4gKiBFeHBvc2UgYHJlcXVlc3RgLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKG1ldGhvZCwgdXJsKSB7XG4gIC8vIGNhbGxiYWNrXG4gIGlmICh0eXBlb2YgdXJsID09PSAnZnVuY3Rpb24nKSB7XG4gICAgcmV0dXJuIG5ldyBleHBvcnRzLlJlcXVlc3QoJ0dFVCcsIG1ldGhvZCkuZW5kKHVybCk7XG4gIH1cblxuICAvLyB1cmwgZmlyc3RcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHtcbiAgICByZXR1cm4gbmV3IGV4cG9ydHMuUmVxdWVzdCgnR0VUJywgbWV0aG9kKTtcbiAgfVxuXG4gIHJldHVybiBuZXcgZXhwb3J0cy5SZXF1ZXN0KG1ldGhvZCwgdXJsKTtcbn07XG5cbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cztcblxuY29uc3QgcmVxdWVzdCA9IGV4cG9ydHM7XG5cbmV4cG9ydHMuUmVxdWVzdCA9IFJlcXVlc3Q7XG5cbi8qKlxuICogRGV0ZXJtaW5lIFhIUi5cbiAqL1xuXG5yZXF1ZXN0LmdldFhIUiA9ICgpID0+IHtcbiAgaWYgKHJvb3QuWE1MSHR0cFJlcXVlc3QpIHtcbiAgICByZXR1cm4gbmV3IHJvb3QuWE1MSHR0cFJlcXVlc3QoKTtcbiAgfVxuXG4gIHRocm93IG5ldyBFcnJvcignQnJvd3Nlci1vbmx5IHZlcnNpb24gb2Ygc3VwZXJhZ2VudCBjb3VsZCBub3QgZmluZCBYSFInKTtcbn07XG5cbi8qKlxuICogUmVtb3ZlcyBsZWFkaW5nIGFuZCB0cmFpbGluZyB3aGl0ZXNwYWNlLCBhZGRlZCB0byBzdXBwb3J0IElFLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBzXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5jb25zdCB0cmltID0gJycudHJpbSA/IChzKSA9PiBzLnRyaW0oKSA6IChzKSA9PiBzLnJlcGxhY2UoLyheXFxzKnxcXHMqJCkvZywgJycpO1xuXG4vKipcbiAqIFNlcmlhbGl6ZSB0aGUgZ2l2ZW4gYG9iamAuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9ialxuICogQHJldHVybiB7U3RyaW5nfVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gc2VyaWFsaXplKG9iamVjdCkge1xuICBpZiAoIWlzT2JqZWN0KG9iamVjdCkpIHJldHVybiBvYmplY3Q7XG4gIGNvbnN0IHBhaXJzID0gW107XG4gIGZvciAoY29uc3Qga2V5IGluIG9iamVjdCkge1xuICAgIGlmIChoYXNPd24ob2JqZWN0LCBrZXkpKSBwdXNoRW5jb2RlZEtleVZhbHVlUGFpcihwYWlycywga2V5LCBvYmplY3Rba2V5XSk7XG4gIH1cblxuICByZXR1cm4gcGFpcnMuam9pbignJicpO1xufVxuXG4vKipcbiAqIEhlbHBzICdzZXJpYWxpemUnIHdpdGggc2VyaWFsaXppbmcgYXJyYXlzLlxuICogTXV0YXRlcyB0aGUgcGFpcnMgYXJyYXkuXG4gKlxuICogQHBhcmFtIHtBcnJheX0gcGFpcnNcbiAqIEBwYXJhbSB7U3RyaW5nfSBrZXlcbiAqIEBwYXJhbSB7TWl4ZWR9IHZhbFxuICovXG5cbmZ1bmN0aW9uIHB1c2hFbmNvZGVkS2V5VmFsdWVQYWlyKHBhaXJzLCBrZXksIHZhbHVlKSB7XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSByZXR1cm47XG4gIGlmICh2YWx1ZSA9PT0gbnVsbCkge1xuICAgIHBhaXJzLnB1c2goZW5jb2RlVVJJKGtleSkpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgIGZvciAoY29uc3QgdiBvZiB2YWx1ZSkge1xuICAgICAgcHVzaEVuY29kZWRLZXlWYWx1ZVBhaXIocGFpcnMsIGtleSwgdik7XG4gICAgfVxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KHZhbHVlKSkge1xuICAgIGZvciAoY29uc3Qgc3Via2V5IGluIHZhbHVlKSB7XG4gICAgICBpZiAoaGFzT3duKHZhbHVlLCBzdWJrZXkpKVxuICAgICAgICBwdXNoRW5jb2RlZEtleVZhbHVlUGFpcihwYWlycywgYCR7a2V5fVske3N1YmtleX1dYCwgdmFsdWVbc3Via2V5XSk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHBhaXJzLnB1c2goZW5jb2RlVVJJKGtleSkgKyAnPScgKyBlbmNvZGVVUklDb21wb25lbnQodmFsdWUpKTtcbiAgfVxufVxuXG4vKipcbiAqIEV4cG9zZSBzZXJpYWxpemF0aW9uIG1ldGhvZC5cbiAqL1xuXG5yZXF1ZXN0LnNlcmlhbGl6ZU9iamVjdCA9IHNlcmlhbGl6ZTtcblxuLyoqXG4gKiBQYXJzZSB0aGUgZ2l2ZW4geC13d3ctZm9ybS11cmxlbmNvZGVkIGBzdHJgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHJcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIHBhcnNlU3RyaW5nKHN0cmluZ18pIHtcbiAgY29uc3Qgb2JqZWN0ID0ge307XG4gIGNvbnN0IHBhaXJzID0gc3RyaW5nXy5zcGxpdCgnJicpO1xuICBsZXQgcGFpcjtcbiAgbGV0IHBvcztcblxuICBmb3IgKGxldCBpID0gMCwgbGVuZ3RoXyA9IHBhaXJzLmxlbmd0aDsgaSA8IGxlbmd0aF87ICsraSkge1xuICAgIHBhaXIgPSBwYWlyc1tpXTtcbiAgICBwb3MgPSBwYWlyLmluZGV4T2YoJz0nKTtcbiAgICBpZiAocG9zID09PSAtMSkge1xuICAgICAgb2JqZWN0W2RlY29kZVVSSUNvbXBvbmVudChwYWlyKV0gPSAnJztcbiAgICB9IGVsc2Uge1xuICAgICAgb2JqZWN0W2RlY29kZVVSSUNvbXBvbmVudChwYWlyLnNsaWNlKDAsIHBvcykpXSA9IGRlY29kZVVSSUNvbXBvbmVudChcbiAgICAgICAgcGFpci5zbGljZShwb3MgKyAxKVxuICAgICAgKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gb2JqZWN0O1xufVxuXG4vKipcbiAqIEV4cG9zZSBwYXJzZXIuXG4gKi9cblxucmVxdWVzdC5wYXJzZVN0cmluZyA9IHBhcnNlU3RyaW5nO1xuXG4vKipcbiAqIERlZmF1bHQgTUlNRSB0eXBlIG1hcC5cbiAqXG4gKiAgICAgc3VwZXJhZ2VudC50eXBlcy54bWwgPSAnYXBwbGljYXRpb24veG1sJztcbiAqXG4gKi9cblxucmVxdWVzdC50eXBlcyA9IHtcbiAgaHRtbDogJ3RleHQvaHRtbCcsXG4gIGpzb246ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgeG1sOiAndGV4dC94bWwnLFxuICB1cmxlbmNvZGVkOiAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkJyxcbiAgZm9ybTogJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZCcsXG4gICdmb3JtLWRhdGEnOiAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkJ1xufTtcblxuLyoqXG4gKiBEZWZhdWx0IHNlcmlhbGl6YXRpb24gbWFwLlxuICpcbiAqICAgICBzdXBlcmFnZW50LnNlcmlhbGl6ZVsnYXBwbGljYXRpb24veG1sJ10gPSBmdW5jdGlvbihvYmope1xuICogICAgICAgcmV0dXJuICdnZW5lcmF0ZWQgeG1sIGhlcmUnO1xuICogICAgIH07XG4gKlxuICovXG5cbnJlcXVlc3Quc2VyaWFsaXplID0ge1xuICAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkJzogKG9iaikgPT4ge1xuICAgIHJldHVybiBxcy5zdHJpbmdpZnkob2JqLCB7IGluZGljZXM6IGZhbHNlLCBzdHJpY3ROdWxsSGFuZGxpbmc6IHRydWUgfSk7XG4gIH0sXG4gICdhcHBsaWNhdGlvbi9qc29uJzogc2FmZVN0cmluZ2lmeVxufTtcblxuLyoqXG4gKiBEZWZhdWx0IHBhcnNlcnMuXG4gKlxuICogICAgIHN1cGVyYWdlbnQucGFyc2VbJ2FwcGxpY2F0aW9uL3htbCddID0gZnVuY3Rpb24oc3RyKXtcbiAqICAgICAgIHJldHVybiB7IG9iamVjdCBwYXJzZWQgZnJvbSBzdHIgfTtcbiAqICAgICB9O1xuICpcbiAqL1xuXG5yZXF1ZXN0LnBhcnNlID0ge1xuICAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkJzogcGFyc2VTdHJpbmcsXG4gICdhcHBsaWNhdGlvbi9qc29uJzogSlNPTi5wYXJzZVxufTtcblxuLyoqXG4gKiBQYXJzZSB0aGUgZ2l2ZW4gaGVhZGVyIGBzdHJgIGludG9cbiAqIGFuIG9iamVjdCBjb250YWluaW5nIHRoZSBtYXBwZWQgZmllbGRzLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHJcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIHBhcnNlSGVhZGVyKHN0cmluZ18pIHtcbiAgY29uc3QgbGluZXMgPSBzdHJpbmdfLnNwbGl0KC9cXHI/XFxuLyk7XG4gIGNvbnN0IGZpZWxkcyA9IHt9O1xuICBsZXQgaW5kZXg7XG4gIGxldCBsaW5lO1xuICBsZXQgZmllbGQ7XG4gIGxldCB2YWx1ZTtcblxuICBmb3IgKGxldCBpID0gMCwgbGVuZ3RoXyA9IGxpbmVzLmxlbmd0aDsgaSA8IGxlbmd0aF87ICsraSkge1xuICAgIGxpbmUgPSBsaW5lc1tpXTtcbiAgICBpbmRleCA9IGxpbmUuaW5kZXhPZignOicpO1xuICAgIGlmIChpbmRleCA9PT0gLTEpIHtcbiAgICAgIC8vIGNvdWxkIGJlIGVtcHR5IGxpbmUsIGp1c3Qgc2tpcCBpdFxuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgZmllbGQgPSBsaW5lLnNsaWNlKDAsIGluZGV4KS50b0xvd2VyQ2FzZSgpO1xuICAgIHZhbHVlID0gdHJpbShsaW5lLnNsaWNlKGluZGV4ICsgMSkpO1xuICAgIGZpZWxkc1tmaWVsZF0gPSB2YWx1ZTtcbiAgfVxuXG4gIHJldHVybiBmaWVsZHM7XG59XG5cbi8qKlxuICogQ2hlY2sgaWYgYG1pbWVgIGlzIGpzb24gb3IgaGFzICtqc29uIHN0cnVjdHVyZWQgc3ludGF4IHN1ZmZpeC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbWltZVxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIGlzSlNPTihtaW1lKSB7XG4gIC8vIHNob3VsZCBtYXRjaCAvanNvbiBvciAranNvblxuICAvLyBidXQgbm90IC9qc29uLXNlcVxuICByZXR1cm4gL1svK11qc29uKCR8W14tXFx3XSkvaS50ZXN0KG1pbWUpO1xufVxuXG4vKipcbiAqIEluaXRpYWxpemUgYSBuZXcgYFJlc3BvbnNlYCB3aXRoIHRoZSBnaXZlbiBgeGhyYC5cbiAqXG4gKiAgLSBzZXQgZmxhZ3MgKC5vaywgLmVycm9yLCBldGMpXG4gKiAgLSBwYXJzZSBoZWFkZXJcbiAqXG4gKiBFeGFtcGxlczpcbiAqXG4gKiAgQWxpYXNpbmcgYHN1cGVyYWdlbnRgIGFzIGByZXF1ZXN0YCBpcyBuaWNlOlxuICpcbiAqICAgICAgcmVxdWVzdCA9IHN1cGVyYWdlbnQ7XG4gKlxuICogIFdlIGNhbiB1c2UgdGhlIHByb21pc2UtbGlrZSBBUEksIG9yIHBhc3MgY2FsbGJhY2tzOlxuICpcbiAqICAgICAgcmVxdWVzdC5nZXQoJy8nKS5lbmQoZnVuY3Rpb24ocmVzKXt9KTtcbiAqICAgICAgcmVxdWVzdC5nZXQoJy8nLCBmdW5jdGlvbihyZXMpe30pO1xuICpcbiAqICBTZW5kaW5nIGRhdGEgY2FuIGJlIGNoYWluZWQ6XG4gKlxuICogICAgICByZXF1ZXN0XG4gKiAgICAgICAgLnBvc3QoJy91c2VyJylcbiAqICAgICAgICAuc2VuZCh7IG5hbWU6ICd0aicgfSlcbiAqICAgICAgICAuZW5kKGZ1bmN0aW9uKHJlcyl7fSk7XG4gKlxuICogIE9yIHBhc3NlZCB0byBgLnNlbmQoKWA6XG4gKlxuICogICAgICByZXF1ZXN0XG4gKiAgICAgICAgLnBvc3QoJy91c2VyJylcbiAqICAgICAgICAuc2VuZCh7IG5hbWU6ICd0aicgfSwgZnVuY3Rpb24ocmVzKXt9KTtcbiAqXG4gKiAgT3IgcGFzc2VkIHRvIGAucG9zdCgpYDpcbiAqXG4gKiAgICAgIHJlcXVlc3RcbiAqICAgICAgICAucG9zdCgnL3VzZXInLCB7IG5hbWU6ICd0aicgfSlcbiAqICAgICAgICAuZW5kKGZ1bmN0aW9uKHJlcyl7fSk7XG4gKlxuICogT3IgZnVydGhlciByZWR1Y2VkIHRvIGEgc2luZ2xlIGNhbGwgZm9yIHNpbXBsZSBjYXNlczpcbiAqXG4gKiAgICAgIHJlcXVlc3RcbiAqICAgICAgICAucG9zdCgnL3VzZXInLCB7IG5hbWU6ICd0aicgfSwgZnVuY3Rpb24ocmVzKXt9KTtcbiAqXG4gKiBAcGFyYW0ge1hNTEhUVFBSZXF1ZXN0fSB4aHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBSZXNwb25zZShyZXF1ZXN0Xykge1xuICB0aGlzLnJlcSA9IHJlcXVlc3RfO1xuICB0aGlzLnhociA9IHRoaXMucmVxLnhocjtcbiAgLy8gcmVzcG9uc2VUZXh0IGlzIGFjY2Vzc2libGUgb25seSBpZiByZXNwb25zZVR5cGUgaXMgJycgb3IgJ3RleHQnIGFuZCBvbiBvbGRlciBicm93c2Vyc1xuICB0aGlzLnRleHQgPVxuICAgICh0aGlzLnJlcS5tZXRob2QgIT09ICdIRUFEJyAmJlxuICAgICAgKHRoaXMueGhyLnJlc3BvbnNlVHlwZSA9PT0gJycgfHwgdGhpcy54aHIucmVzcG9uc2VUeXBlID09PSAndGV4dCcpKSB8fFxuICAgIHR5cGVvZiB0aGlzLnhoci5yZXNwb25zZVR5cGUgPT09ICd1bmRlZmluZWQnXG4gICAgICA/IHRoaXMueGhyLnJlc3BvbnNlVGV4dFxuICAgICAgOiBudWxsO1xuICB0aGlzLnN0YXR1c1RleHQgPSB0aGlzLnJlcS54aHIuc3RhdHVzVGV4dDtcbiAgbGV0IHsgc3RhdHVzIH0gPSB0aGlzLnhocjtcbiAgLy8gaGFuZGxlIElFOSBidWc6IGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMTAwNDY5NzIvbXNpZS1yZXR1cm5zLXN0YXR1cy1jb2RlLW9mLTEyMjMtZm9yLWFqYXgtcmVxdWVzdFxuICBpZiAoc3RhdHVzID09PSAxMjIzKSB7XG4gICAgc3RhdHVzID0gMjA0O1xuICB9XG5cbiAgdGhpcy5fc2V0U3RhdHVzUHJvcGVydGllcyhzdGF0dXMpO1xuICB0aGlzLmhlYWRlcnMgPSBwYXJzZUhlYWRlcih0aGlzLnhoci5nZXRBbGxSZXNwb25zZUhlYWRlcnMoKSk7XG4gIHRoaXMuaGVhZGVyID0gdGhpcy5oZWFkZXJzO1xuICAvLyBnZXRBbGxSZXNwb25zZUhlYWRlcnMgc29tZXRpbWVzIGZhbHNlbHkgcmV0dXJucyBcIlwiIGZvciBDT1JTIHJlcXVlc3RzLCBidXRcbiAgLy8gZ2V0UmVzcG9uc2VIZWFkZXIgc3RpbGwgd29ya3MuIHNvIHdlIGdldCBjb250ZW50LXR5cGUgZXZlbiBpZiBnZXR0aW5nXG4gIC8vIG90aGVyIGhlYWRlcnMgZmFpbHMuXG4gIHRoaXMuaGVhZGVyWydjb250ZW50LXR5cGUnXSA9IHRoaXMueGhyLmdldFJlc3BvbnNlSGVhZGVyKCdjb250ZW50LXR5cGUnKTtcbiAgdGhpcy5fc2V0SGVhZGVyUHJvcGVydGllcyh0aGlzLmhlYWRlcik7XG5cbiAgaWYgKHRoaXMudGV4dCA9PT0gbnVsbCAmJiByZXF1ZXN0Xy5fcmVzcG9uc2VUeXBlKSB7XG4gICAgdGhpcy5ib2R5ID0gdGhpcy54aHIucmVzcG9uc2U7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5ib2R5ID1cbiAgICAgIHRoaXMucmVxLm1ldGhvZCA9PT0gJ0hFQUQnXG4gICAgICAgID8gbnVsbFxuICAgICAgICA6IHRoaXMuX3BhcnNlQm9keSh0aGlzLnRleHQgPyB0aGlzLnRleHQgOiB0aGlzLnhoci5yZXNwb25zZSk7XG4gIH1cbn1cblxubWl4aW4oUmVzcG9uc2UucHJvdG90eXBlLCBSZXNwb25zZUJhc2UucHJvdG90eXBlKTtcblxuLyoqXG4gKiBQYXJzZSB0aGUgZ2l2ZW4gYm9keSBgc3RyYC5cbiAqXG4gKiBVc2VkIGZvciBhdXRvLXBhcnNpbmcgb2YgYm9kaWVzLiBQYXJzZXJzXG4gKiBhcmUgZGVmaW5lZCBvbiB0aGUgYHN1cGVyYWdlbnQucGFyc2VgIG9iamVjdC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gc3RyXG4gKiBAcmV0dXJuIHtNaXhlZH1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cblJlc3BvbnNlLnByb3RvdHlwZS5fcGFyc2VCb2R5ID0gZnVuY3Rpb24gKHN0cmluZ18pIHtcbiAgbGV0IHBhcnNlID0gcmVxdWVzdC5wYXJzZVt0aGlzLnR5cGVdO1xuICBpZiAodGhpcy5yZXEuX3BhcnNlcikge1xuICAgIHJldHVybiB0aGlzLnJlcS5fcGFyc2VyKHRoaXMsIHN0cmluZ18pO1xuICB9XG5cbiAgaWYgKCFwYXJzZSAmJiBpc0pTT04odGhpcy50eXBlKSkge1xuICAgIHBhcnNlID0gcmVxdWVzdC5wYXJzZVsnYXBwbGljYXRpb24vanNvbiddO1xuICB9XG5cbiAgcmV0dXJuIHBhcnNlICYmIHN0cmluZ18gJiYgKHN0cmluZ18ubGVuZ3RoID4gMCB8fCBzdHJpbmdfIGluc3RhbmNlb2YgT2JqZWN0KVxuICAgID8gcGFyc2Uoc3RyaW5nXylcbiAgICA6IG51bGw7XG59O1xuXG4vKipcbiAqIFJldHVybiBhbiBgRXJyb3JgIHJlcHJlc2VudGF0aXZlIG9mIHRoaXMgcmVzcG9uc2UuXG4gKlxuICogQHJldHVybiB7RXJyb3J9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlc3BvbnNlLnByb3RvdHlwZS50b0Vycm9yID0gZnVuY3Rpb24gKCkge1xuICBjb25zdCB7IHJlcSB9ID0gdGhpcztcbiAgY29uc3QgeyBtZXRob2QgfSA9IHJlcTtcbiAgY29uc3QgeyB1cmwgfSA9IHJlcTtcblxuICBjb25zdCBtZXNzYWdlID0gYGNhbm5vdCAke21ldGhvZH0gJHt1cmx9ICgke3RoaXMuc3RhdHVzfSlgO1xuICBjb25zdCBlcnJvciA9IG5ldyBFcnJvcihtZXNzYWdlKTtcbiAgZXJyb3Iuc3RhdHVzID0gdGhpcy5zdGF0dXM7XG4gIGVycm9yLm1ldGhvZCA9IG1ldGhvZDtcbiAgZXJyb3IudXJsID0gdXJsO1xuXG4gIHJldHVybiBlcnJvcjtcbn07XG5cbi8qKlxuICogRXhwb3NlIGBSZXNwb25zZWAuXG4gKi9cblxucmVxdWVzdC5SZXNwb25zZSA9IFJlc3BvbnNlO1xuXG4vKipcbiAqIEluaXRpYWxpemUgYSBuZXcgYFJlcXVlc3RgIHdpdGggdGhlIGdpdmVuIGBtZXRob2RgIGFuZCBgdXJsYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbWV0aG9kXG4gKiBAcGFyYW0ge1N0cmluZ30gdXJsXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmZ1bmN0aW9uIFJlcXVlc3QobWV0aG9kLCB1cmwpIHtcbiAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gIHRoaXMuX3F1ZXJ5ID0gdGhpcy5fcXVlcnkgfHwgW107XG4gIHRoaXMubWV0aG9kID0gbWV0aG9kO1xuICB0aGlzLnVybCA9IHVybDtcbiAgdGhpcy5oZWFkZXIgPSB7fTsgLy8gcHJlc2VydmVzIGhlYWRlciBuYW1lIGNhc2VcbiAgdGhpcy5faGVhZGVyID0ge307IC8vIGNvZXJjZXMgaGVhZGVyIG5hbWVzIHRvIGxvd2VyY2FzZVxuICB0aGlzLm9uKCdlbmQnLCAoKSA9PiB7XG4gICAgbGV0IGVycm9yID0gbnVsbDtcbiAgICBsZXQgcmVzID0gbnVsbDtcblxuICAgIHRyeSB7XG4gICAgICByZXMgPSBuZXcgUmVzcG9uc2Uoc2VsZik7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBlcnJvciA9IG5ldyBFcnJvcignUGFyc2VyIGlzIHVuYWJsZSB0byBwYXJzZSB0aGUgcmVzcG9uc2UnKTtcbiAgICAgIGVycm9yLnBhcnNlID0gdHJ1ZTtcbiAgICAgIGVycm9yLm9yaWdpbmFsID0gZXJyO1xuICAgICAgLy8gaXNzdWUgIzY3NTogcmV0dXJuIHRoZSByYXcgcmVzcG9uc2UgaWYgdGhlIHJlc3BvbnNlIHBhcnNpbmcgZmFpbHNcbiAgICAgIGlmIChzZWxmLnhocikge1xuICAgICAgICAvLyBpZTkgZG9lc24ndCBoYXZlICdyZXNwb25zZScgcHJvcGVydHlcbiAgICAgICAgZXJyb3IucmF3UmVzcG9uc2UgPVxuICAgICAgICAgIHR5cGVvZiBzZWxmLnhoci5yZXNwb25zZVR5cGUgPT09ICd1bmRlZmluZWQnXG4gICAgICAgICAgICA/IHNlbGYueGhyLnJlc3BvbnNlVGV4dFxuICAgICAgICAgICAgOiBzZWxmLnhoci5yZXNwb25zZTtcbiAgICAgICAgLy8gaXNzdWUgIzg3NjogcmV0dXJuIHRoZSBodHRwIHN0YXR1cyBjb2RlIGlmIHRoZSByZXNwb25zZSBwYXJzaW5nIGZhaWxzXG4gICAgICAgIGVycm9yLnN0YXR1cyA9IHNlbGYueGhyLnN0YXR1cyA/IHNlbGYueGhyLnN0YXR1cyA6IG51bGw7XG4gICAgICAgIGVycm9yLnN0YXR1c0NvZGUgPSBlcnJvci5zdGF0dXM7IC8vIGJhY2t3YXJkcy1jb21wYXQgb25seVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZXJyb3IucmF3UmVzcG9uc2UgPSBudWxsO1xuICAgICAgICBlcnJvci5zdGF0dXMgPSBudWxsO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gc2VsZi5jYWxsYmFjayhlcnJvcik7XG4gICAgfVxuXG4gICAgc2VsZi5lbWl0KCdyZXNwb25zZScsIHJlcyk7XG5cbiAgICBsZXQgbmV3X2Vycm9yO1xuICAgIHRyeSB7XG4gICAgICBpZiAoIXNlbGYuX2lzUmVzcG9uc2VPSyhyZXMpKSB7XG4gICAgICAgIG5ld19lcnJvciA9IG5ldyBFcnJvcihcbiAgICAgICAgICByZXMuc3RhdHVzVGV4dCB8fCByZXMudGV4dCB8fCAnVW5zdWNjZXNzZnVsIEhUVFAgcmVzcG9uc2UnXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBuZXdfZXJyb3IgPSBlcnI7IC8vIG9rKCkgY2FsbGJhY2sgY2FuIHRocm93XG4gICAgfVxuXG4gICAgLy8gIzEwMDAgZG9uJ3QgY2F0Y2ggZXJyb3JzIGZyb20gdGhlIGNhbGxiYWNrIHRvIGF2b2lkIGRvdWJsZSBjYWxsaW5nIGl0XG4gICAgaWYgKG5ld19lcnJvcikge1xuICAgICAgbmV3X2Vycm9yLm9yaWdpbmFsID0gZXJyb3I7XG4gICAgICBuZXdfZXJyb3IucmVzcG9uc2UgPSByZXM7XG4gICAgICBuZXdfZXJyb3Iuc3RhdHVzID0gbmV3X2Vycm9yLnN0YXR1cyB8fCByZXMuc3RhdHVzO1xuICAgICAgc2VsZi5jYWxsYmFjayhuZXdfZXJyb3IsIHJlcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNlbGYuY2FsbGJhY2sobnVsbCwgcmVzKTtcbiAgICB9XG4gIH0pO1xufVxuXG4vKipcbiAqIE1peGluIGBFbWl0dGVyYCBhbmQgYFJlcXVlc3RCYXNlYC5cbiAqL1xuXG4vLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbmV3LWNhcFxuRW1pdHRlcihSZXF1ZXN0LnByb3RvdHlwZSk7XG5cbm1peGluKFJlcXVlc3QucHJvdG90eXBlLCBSZXF1ZXN0QmFzZS5wcm90b3R5cGUpO1xuXG4vKipcbiAqIFNldCBDb250ZW50LVR5cGUgdG8gYHR5cGVgLCBtYXBwaW5nIHZhbHVlcyBmcm9tIGByZXF1ZXN0LnR5cGVzYC5cbiAqXG4gKiBFeGFtcGxlczpcbiAqXG4gKiAgICAgIHN1cGVyYWdlbnQudHlwZXMueG1sID0gJ2FwcGxpY2F0aW9uL3htbCc7XG4gKlxuICogICAgICByZXF1ZXN0LnBvc3QoJy8nKVxuICogICAgICAgIC50eXBlKCd4bWwnKVxuICogICAgICAgIC5zZW5kKHhtbHN0cmluZylcbiAqICAgICAgICAuZW5kKGNhbGxiYWNrKTtcbiAqXG4gKiAgICAgIHJlcXVlc3QucG9zdCgnLycpXG4gKiAgICAgICAgLnR5cGUoJ2FwcGxpY2F0aW9uL3htbCcpXG4gKiAgICAgICAgLnNlbmQoeG1sc3RyaW5nKVxuICogICAgICAgIC5lbmQoY2FsbGJhY2spO1xuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB0eXBlXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdC5wcm90b3R5cGUudHlwZSA9IGZ1bmN0aW9uICh0eXBlKSB7XG4gIHRoaXMuc2V0KCdDb250ZW50LVR5cGUnLCByZXF1ZXN0LnR5cGVzW3R5cGVdIHx8IHR5cGUpO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogU2V0IEFjY2VwdCB0byBgdHlwZWAsIG1hcHBpbmcgdmFsdWVzIGZyb20gYHJlcXVlc3QudHlwZXNgLlxuICpcbiAqIEV4YW1wbGVzOlxuICpcbiAqICAgICAgc3VwZXJhZ2VudC50eXBlcy5qc29uID0gJ2FwcGxpY2F0aW9uL2pzb24nO1xuICpcbiAqICAgICAgcmVxdWVzdC5nZXQoJy9hZ2VudCcpXG4gKiAgICAgICAgLmFjY2VwdCgnanNvbicpXG4gKiAgICAgICAgLmVuZChjYWxsYmFjayk7XG4gKlxuICogICAgICByZXF1ZXN0LmdldCgnL2FnZW50JylcbiAqICAgICAgICAuYWNjZXB0KCdhcHBsaWNhdGlvbi9qc29uJylcbiAqICAgICAgICAuZW5kKGNhbGxiYWNrKTtcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gYWNjZXB0XG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdC5wcm90b3R5cGUuYWNjZXB0ID0gZnVuY3Rpb24gKHR5cGUpIHtcbiAgdGhpcy5zZXQoJ0FjY2VwdCcsIHJlcXVlc3QudHlwZXNbdHlwZV0gfHwgdHlwZSk7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBTZXQgQXV0aG9yaXphdGlvbiBmaWVsZCB2YWx1ZSB3aXRoIGB1c2VyYCBhbmQgYHBhc3NgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB1c2VyXG4gKiBAcGFyYW0ge1N0cmluZ30gW3Bhc3NdIG9wdGlvbmFsIGluIGNhc2Ugb2YgdXNpbmcgJ2JlYXJlcicgYXMgdHlwZVxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgd2l0aCAndHlwZScgcHJvcGVydHkgJ2F1dG8nLCAnYmFzaWMnIG9yICdiZWFyZXInIChkZWZhdWx0ICdiYXNpYycpXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdC5wcm90b3R5cGUuYXV0aCA9IGZ1bmN0aW9uICh1c2VyLCBwYXNzLCBvcHRpb25zKSB7XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSBwYXNzID0gJyc7XG4gIGlmICh0eXBlb2YgcGFzcyA9PT0gJ29iamVjdCcgJiYgcGFzcyAhPT0gbnVsbCkge1xuICAgIC8vIHBhc3MgaXMgb3B0aW9uYWwgYW5kIGNhbiBiZSByZXBsYWNlZCB3aXRoIG9wdGlvbnNcbiAgICBvcHRpb25zID0gcGFzcztcbiAgICBwYXNzID0gJyc7XG4gIH1cblxuICBpZiAoIW9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0ge1xuICAgICAgdHlwZTogdHlwZW9mIGJ0b2EgPT09ICdmdW5jdGlvbicgPyAnYmFzaWMnIDogJ2F1dG8nXG4gICAgfTtcbiAgfVxuXG4gIGNvbnN0IGVuY29kZXIgPSBvcHRpb25zLmVuY29kZXJcbiAgICA/IG9wdGlvbnMuZW5jb2RlclxuICAgIDogKHN0cmluZykgPT4ge1xuICAgICAgICBpZiAodHlwZW9mIGJ0b2EgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICByZXR1cm4gYnRvYShzdHJpbmcpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYW5ub3QgdXNlIGJhc2ljIGF1dGgsIGJ0b2EgaXMgbm90IGEgZnVuY3Rpb24nKTtcbiAgICAgIH07XG5cbiAgcmV0dXJuIHRoaXMuX2F1dGgodXNlciwgcGFzcywgb3B0aW9ucywgZW5jb2Rlcik7XG59O1xuXG4vKipcbiAqIEFkZCBxdWVyeS1zdHJpbmcgYHZhbGAuXG4gKlxuICogRXhhbXBsZXM6XG4gKlxuICogICByZXF1ZXN0LmdldCgnL3Nob2VzJylcbiAqICAgICAucXVlcnkoJ3NpemU9MTAnKVxuICogICAgIC5xdWVyeSh7IGNvbG9yOiAnYmx1ZScgfSlcbiAqXG4gKiBAcGFyYW0ge09iamVjdHxTdHJpbmd9IHZhbFxuICogQHJldHVybiB7UmVxdWVzdH0gZm9yIGNoYWluaW5nXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlcXVlc3QucHJvdG90eXBlLnF1ZXJ5ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gIGlmICh0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnKSB2YWx1ZSA9IHNlcmlhbGl6ZSh2YWx1ZSk7XG4gIGlmICh2YWx1ZSkgdGhpcy5fcXVlcnkucHVzaCh2YWx1ZSk7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBRdWV1ZSB0aGUgZ2l2ZW4gYGZpbGVgIGFzIGFuIGF0dGFjaG1lbnQgdG8gdGhlIHNwZWNpZmllZCBgZmllbGRgLFxuICogd2l0aCBvcHRpb25hbCBgb3B0aW9uc2AgKG9yIGZpbGVuYW1lKS5cbiAqXG4gKiBgYGAganNcbiAqIHJlcXVlc3QucG9zdCgnL3VwbG9hZCcpXG4gKiAgIC5hdHRhY2goJ2NvbnRlbnQnLCBuZXcgQmxvYihbJzxhIGlkPVwiYVwiPjxiIGlkPVwiYlwiPmhleSE8L2I+PC9hPiddLCB7IHR5cGU6IFwidGV4dC9odG1sXCJ9KSlcbiAqICAgLmVuZChjYWxsYmFjayk7XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZmllbGRcbiAqIEBwYXJhbSB7QmxvYnxGaWxlfSBmaWxlXG4gKiBAcGFyYW0ge1N0cmluZ3xPYmplY3R9IG9wdGlvbnNcbiAqIEByZXR1cm4ge1JlcXVlc3R9IGZvciBjaGFpbmluZ1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0LnByb3RvdHlwZS5hdHRhY2ggPSBmdW5jdGlvbiAoZmllbGQsIGZpbGUsIG9wdGlvbnMpIHtcbiAgaWYgKGZpbGUpIHtcbiAgICBpZiAodGhpcy5fZGF0YSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwic3VwZXJhZ2VudCBjYW4ndCBtaXggLnNlbmQoKSBhbmQgLmF0dGFjaCgpXCIpO1xuICAgIH1cblxuICAgIHRoaXMuX2dldEZvcm1EYXRhKCkuYXBwZW5kKGZpZWxkLCBmaWxlLCBvcHRpb25zIHx8IGZpbGUubmFtZSk7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cblJlcXVlc3QucHJvdG90eXBlLl9nZXRGb3JtRGF0YSA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKCF0aGlzLl9mb3JtRGF0YSkge1xuICAgIHRoaXMuX2Zvcm1EYXRhID0gbmV3IHJvb3QuRm9ybURhdGEoKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzLl9mb3JtRGF0YTtcbn07XG5cbi8qKlxuICogSW52b2tlIHRoZSBjYWxsYmFjayB3aXRoIGBlcnJgIGFuZCBgcmVzYFxuICogYW5kIGhhbmRsZSBhcml0eSBjaGVjay5cbiAqXG4gKiBAcGFyYW0ge0Vycm9yfSBlcnJcbiAqIEBwYXJhbSB7UmVzcG9uc2V9IHJlc1xuICogQGFwaSBwcml2YXRlXG4gKi9cblxuUmVxdWVzdC5wcm90b3R5cGUuY2FsbGJhY2sgPSBmdW5jdGlvbiAoZXJyb3IsIHJlcykge1xuICBpZiAodGhpcy5fc2hvdWxkUmV0cnkoZXJyb3IsIHJlcykpIHtcbiAgICByZXR1cm4gdGhpcy5fcmV0cnkoKTtcbiAgfVxuXG4gIGNvbnN0IGZuID0gdGhpcy5fY2FsbGJhY2s7XG4gIHRoaXMuY2xlYXJUaW1lb3V0KCk7XG5cbiAgaWYgKGVycm9yKSB7XG4gICAgaWYgKHRoaXMuX21heFJldHJpZXMpIGVycm9yLnJldHJpZXMgPSB0aGlzLl9yZXRyaWVzIC0gMTtcbiAgICB0aGlzLmVtaXQoJ2Vycm9yJywgZXJyb3IpO1xuICB9XG5cbiAgZm4oZXJyb3IsIHJlcyk7XG59O1xuXG4vKipcbiAqIEludm9rZSBjYWxsYmFjayB3aXRoIHgtZG9tYWluIGVycm9yLlxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cblJlcXVlc3QucHJvdG90eXBlLmNyb3NzRG9tYWluRXJyb3IgPSBmdW5jdGlvbiAoKSB7XG4gIGNvbnN0IGVycm9yID0gbmV3IEVycm9yKFxuICAgICdSZXF1ZXN0IGhhcyBiZWVuIHRlcm1pbmF0ZWRcXG5Qb3NzaWJsZSBjYXVzZXM6IHRoZSBuZXR3b3JrIGlzIG9mZmxpbmUsIE9yaWdpbiBpcyBub3QgYWxsb3dlZCBieSBBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4sIHRoZSBwYWdlIGlzIGJlaW5nIHVubG9hZGVkLCBldGMuJ1xuICApO1xuICBlcnJvci5jcm9zc0RvbWFpbiA9IHRydWU7XG5cbiAgZXJyb3Iuc3RhdHVzID0gdGhpcy5zdGF0dXM7XG4gIGVycm9yLm1ldGhvZCA9IHRoaXMubWV0aG9kO1xuICBlcnJvci51cmwgPSB0aGlzLnVybDtcblxuICB0aGlzLmNhbGxiYWNrKGVycm9yKTtcbn07XG5cbi8vIFRoaXMgb25seSB3YXJucywgYmVjYXVzZSB0aGUgcmVxdWVzdCBpcyBzdGlsbCBsaWtlbHkgdG8gd29ya1xuUmVxdWVzdC5wcm90b3R5cGUuYWdlbnQgPSBmdW5jdGlvbiAoKSB7XG4gIGNvbnNvbGUud2FybignVGhpcyBpcyBub3Qgc3VwcG9ydGVkIGluIGJyb3dzZXIgdmVyc2lvbiBvZiBzdXBlcmFnZW50Jyk7XG4gIHJldHVybiB0aGlzO1xufTtcblxuUmVxdWVzdC5wcm90b3R5cGUuY2EgPSBSZXF1ZXN0LnByb3RvdHlwZS5hZ2VudDtcblJlcXVlc3QucHJvdG90eXBlLmJ1ZmZlciA9IFJlcXVlc3QucHJvdG90eXBlLmNhO1xuXG4vLyBUaGlzIHRocm93cywgYmVjYXVzZSBpdCBjYW4ndCBzZW5kL3JlY2VpdmUgZGF0YSBhcyBleHBlY3RlZFxuUmVxdWVzdC5wcm90b3R5cGUud3JpdGUgPSAoKSA9PiB7XG4gIHRocm93IG5ldyBFcnJvcihcbiAgICAnU3RyZWFtaW5nIGlzIG5vdCBzdXBwb3J0ZWQgaW4gYnJvd3NlciB2ZXJzaW9uIG9mIHN1cGVyYWdlbnQnXG4gICk7XG59O1xuXG5SZXF1ZXN0LnByb3RvdHlwZS5waXBlID0gUmVxdWVzdC5wcm90b3R5cGUud3JpdGU7XG5cbi8qKlxuICogQ2hlY2sgaWYgYG9iamAgaXMgYSBob3N0IG9iamVjdCxcbiAqIHdlIGRvbid0IHdhbnQgdG8gc2VyaWFsaXplIHRoZXNlIDopXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9iaiBob3N0IG9iamVjdFxuICogQHJldHVybiB7Qm9vbGVhbn0gaXMgYSBob3N0IG9iamVjdFxuICogQGFwaSBwcml2YXRlXG4gKi9cblJlcXVlc3QucHJvdG90eXBlLl9pc0hvc3QgPSBmdW5jdGlvbiAob2JqZWN0KSB7XG4gIC8vIE5hdGl2ZSBvYmplY3RzIHN0cmluZ2lmeSB0byBbb2JqZWN0IEZpbGVdLCBbb2JqZWN0IEJsb2JdLCBbb2JqZWN0IEZvcm1EYXRhXSwgZXRjLlxuICByZXR1cm4gKFxuICAgIG9iamVjdCAmJlxuICAgIHR5cGVvZiBvYmplY3QgPT09ICdvYmplY3QnICYmXG4gICAgIUFycmF5LmlzQXJyYXkob2JqZWN0KSAmJlxuICAgIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmplY3QpICE9PSAnW29iamVjdCBPYmplY3RdJ1xuICApO1xufTtcblxuLyoqXG4gKiBJbml0aWF0ZSByZXF1ZXN0LCBpbnZva2luZyBjYWxsYmFjayBgZm4ocmVzKWBcbiAqIHdpdGggYW4gaW5zdGFuY2VvZiBgUmVzcG9uc2VgLlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdC5wcm90b3R5cGUuZW5kID0gZnVuY3Rpb24gKGZuKSB7XG4gIGlmICh0aGlzLl9lbmRDYWxsZWQpIHtcbiAgICBjb25zb2xlLndhcm4oXG4gICAgICAnV2FybmluZzogLmVuZCgpIHdhcyBjYWxsZWQgdHdpY2UuIFRoaXMgaXMgbm90IHN1cHBvcnRlZCBpbiBzdXBlcmFnZW50J1xuICAgICk7XG4gIH1cblxuICB0aGlzLl9lbmRDYWxsZWQgPSB0cnVlO1xuXG4gIC8vIHN0b3JlIGNhbGxiYWNrXG4gIHRoaXMuX2NhbGxiYWNrID0gZm4gfHwgbm9vcDtcblxuICAvLyBxdWVyeXN0cmluZ1xuICB0aGlzLl9maW5hbGl6ZVF1ZXJ5U3RyaW5nKCk7XG5cbiAgdGhpcy5fZW5kKCk7XG59O1xuXG5SZXF1ZXN0LnByb3RvdHlwZS5fc2V0VXBsb2FkVGltZW91dCA9IGZ1bmN0aW9uICgpIHtcbiAgY29uc3Qgc2VsZiA9IHRoaXM7XG5cbiAgLy8gdXBsb2FkIHRpbWVvdXQgaXQncyB3b2tycyBvbmx5IGlmIGRlYWRsaW5lIHRpbWVvdXQgaXMgb2ZmXG4gIGlmICh0aGlzLl91cGxvYWRUaW1lb3V0ICYmICF0aGlzLl91cGxvYWRUaW1lb3V0VGltZXIpIHtcbiAgICB0aGlzLl91cGxvYWRUaW1lb3V0VGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIHNlbGYuX3RpbWVvdXRFcnJvcihcbiAgICAgICAgJ1VwbG9hZCB0aW1lb3V0IG9mICcsXG4gICAgICAgIHNlbGYuX3VwbG9hZFRpbWVvdXQsXG4gICAgICAgICdFVElNRURPVVQnXG4gICAgICApO1xuICAgIH0sIHRoaXMuX3VwbG9hZFRpbWVvdXQpO1xuICB9XG59O1xuXG4vLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgY29tcGxleGl0eVxuUmVxdWVzdC5wcm90b3R5cGUuX2VuZCA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKHRoaXMuX2Fib3J0ZWQpXG4gICAgcmV0dXJuIHRoaXMuY2FsbGJhY2soXG4gICAgICBuZXcgRXJyb3IoJ1RoZSByZXF1ZXN0IGhhcyBiZWVuIGFib3J0ZWQgZXZlbiBiZWZvcmUgLmVuZCgpIHdhcyBjYWxsZWQnKVxuICAgICk7XG5cbiAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gIHRoaXMueGhyID0gcmVxdWVzdC5nZXRYSFIoKTtcbiAgY29uc3QgeyB4aHIgfSA9IHRoaXM7XG4gIGxldCBkYXRhID0gdGhpcy5fZm9ybURhdGEgfHwgdGhpcy5fZGF0YTtcblxuICB0aGlzLl9zZXRUaW1lb3V0cygpO1xuXG4gIC8vIHN0YXRlIGNoYW5nZVxuICB4aHIuYWRkRXZlbnRMaXN0ZW5lcigncmVhZHlzdGF0ZWNoYW5nZScsICgpID0+IHtcbiAgICBjb25zdCB7IHJlYWR5U3RhdGUgfSA9IHhocjtcbiAgICBpZiAocmVhZHlTdGF0ZSA+PSAyICYmIHNlbGYuX3Jlc3BvbnNlVGltZW91dFRpbWVyKSB7XG4gICAgICBjbGVhclRpbWVvdXQoc2VsZi5fcmVzcG9uc2VUaW1lb3V0VGltZXIpO1xuICAgIH1cblxuICAgIGlmIChyZWFkeVN0YXRlICE9PSA0KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gSW4gSUU5LCByZWFkcyB0byBhbnkgcHJvcGVydHkgKGUuZy4gc3RhdHVzKSBvZmYgb2YgYW4gYWJvcnRlZCBYSFIgd2lsbFxuICAgIC8vIHJlc3VsdCBpbiB0aGUgZXJyb3IgXCJDb3VsZCBub3QgY29tcGxldGUgdGhlIG9wZXJhdGlvbiBkdWUgdG8gZXJyb3IgYzAwYzAyM2ZcIlxuICAgIGxldCBzdGF0dXM7XG4gICAgdHJ5IHtcbiAgICAgIHN0YXR1cyA9IHhoci5zdGF0dXM7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBzdGF0dXMgPSAwO1xuICAgIH1cblxuICAgIGlmICghc3RhdHVzKSB7XG4gICAgICBpZiAoc2VsZi50aW1lZG91dCB8fCBzZWxmLl9hYm9ydGVkKSByZXR1cm47XG4gICAgICByZXR1cm4gc2VsZi5jcm9zc0RvbWFpbkVycm9yKCk7XG4gICAgfVxuXG4gICAgc2VsZi5lbWl0KCdlbmQnKTtcbiAgfSk7XG5cbiAgLy8gcHJvZ3Jlc3NcbiAgY29uc3QgaGFuZGxlUHJvZ3Jlc3MgPSAoZGlyZWN0aW9uLCBlKSA9PiB7XG4gICAgaWYgKGUudG90YWwgPiAwKSB7XG4gICAgICBlLnBlcmNlbnQgPSAoZS5sb2FkZWQgLyBlLnRvdGFsKSAqIDEwMDtcblxuICAgICAgaWYgKGUucGVyY2VudCA9PT0gMTAwKSB7XG4gICAgICAgIGNsZWFyVGltZW91dChzZWxmLl91cGxvYWRUaW1lb3V0VGltZXIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGUuZGlyZWN0aW9uID0gZGlyZWN0aW9uO1xuICAgIHNlbGYuZW1pdCgncHJvZ3Jlc3MnLCBlKTtcbiAgfTtcblxuICBpZiAodGhpcy5oYXNMaXN0ZW5lcnMoJ3Byb2dyZXNzJykpIHtcbiAgICB0cnkge1xuICAgICAgeGhyLmFkZEV2ZW50TGlzdGVuZXIoJ3Byb2dyZXNzJywgaGFuZGxlUHJvZ3Jlc3MuYmluZChudWxsLCAnZG93bmxvYWQnKSk7XG4gICAgICBpZiAoeGhyLnVwbG9hZCkge1xuICAgICAgICB4aHIudXBsb2FkLmFkZEV2ZW50TGlzdGVuZXIoXG4gICAgICAgICAgJ3Byb2dyZXNzJyxcbiAgICAgICAgICBoYW5kbGVQcm9ncmVzcy5iaW5kKG51bGwsICd1cGxvYWQnKVxuICAgICAgICApO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgLy8gQWNjZXNzaW5nIHhoci51cGxvYWQgZmFpbHMgaW4gSUUgZnJvbSBhIHdlYiB3b3JrZXIsIHNvIGp1c3QgcHJldGVuZCBpdCBkb2Vzbid0IGV4aXN0LlxuICAgICAgLy8gUmVwb3J0ZWQgaGVyZTpcbiAgICAgIC8vIGh0dHBzOi8vY29ubmVjdC5taWNyb3NvZnQuY29tL0lFL2ZlZWRiYWNrL2RldGFpbHMvODM3MjQ1L3htbGh0dHByZXF1ZXN0LXVwbG9hZC10aHJvd3MtaW52YWxpZC1hcmd1bWVudC13aGVuLXVzZWQtZnJvbS13ZWItd29ya2VyLWNvbnRleHRcbiAgICB9XG4gIH1cblxuICBpZiAoeGhyLnVwbG9hZCkge1xuICAgIHRoaXMuX3NldFVwbG9hZFRpbWVvdXQoKTtcbiAgfVxuXG4gIC8vIGluaXRpYXRlIHJlcXVlc3RcbiAgdHJ5IHtcbiAgICBpZiAodGhpcy51c2VybmFtZSAmJiB0aGlzLnBhc3N3b3JkKSB7XG4gICAgICB4aHIub3Blbih0aGlzLm1ldGhvZCwgdGhpcy51cmwsIHRydWUsIHRoaXMudXNlcm5hbWUsIHRoaXMucGFzc3dvcmQpO1xuICAgIH0gZWxzZSB7XG4gICAgICB4aHIub3Blbih0aGlzLm1ldGhvZCwgdGhpcy51cmwsIHRydWUpO1xuICAgIH1cbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgLy8gc2VlICMxMTQ5XG4gICAgcmV0dXJuIHRoaXMuY2FsbGJhY2soZXJyKTtcbiAgfVxuXG4gIC8vIENPUlNcbiAgaWYgKHRoaXMuX3dpdGhDcmVkZW50aWFscykgeGhyLndpdGhDcmVkZW50aWFscyA9IHRydWU7XG5cbiAgLy8gYm9keVxuICBpZiAoXG4gICAgIXRoaXMuX2Zvcm1EYXRhICYmXG4gICAgdGhpcy5tZXRob2QgIT09ICdHRVQnICYmXG4gICAgdGhpcy5tZXRob2QgIT09ICdIRUFEJyAmJlxuICAgIHR5cGVvZiBkYXRhICE9PSAnc3RyaW5nJyAmJlxuICAgICF0aGlzLl9pc0hvc3QoZGF0YSlcbiAgKSB7XG4gICAgLy8gc2VyaWFsaXplIHN0dWZmXG4gICAgY29uc3QgY29udGVudFR5cGUgPSB0aGlzLl9oZWFkZXJbJ2NvbnRlbnQtdHlwZSddO1xuICAgIGxldCBzZXJpYWxpemUgPVxuICAgICAgdGhpcy5fc2VyaWFsaXplciB8fFxuICAgICAgcmVxdWVzdC5zZXJpYWxpemVbY29udGVudFR5cGUgPyBjb250ZW50VHlwZS5zcGxpdCgnOycpWzBdIDogJyddO1xuICAgIGlmICghc2VyaWFsaXplICYmIGlzSlNPTihjb250ZW50VHlwZSkpIHtcbiAgICAgIHNlcmlhbGl6ZSA9IHJlcXVlc3Quc2VyaWFsaXplWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgfVxuXG4gICAgaWYgKHNlcmlhbGl6ZSkgZGF0YSA9IHNlcmlhbGl6ZShkYXRhKTtcbiAgfVxuXG4gIC8vIHNldCBoZWFkZXIgZmllbGRzXG4gIGZvciAoY29uc3QgZmllbGQgaW4gdGhpcy5oZWFkZXIpIHtcbiAgICBpZiAodGhpcy5oZWFkZXJbZmllbGRdID09PSBudWxsKSBjb250aW51ZTtcblxuICAgIGlmIChoYXNPd24odGhpcy5oZWFkZXIsIGZpZWxkKSlcbiAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKGZpZWxkLCB0aGlzLmhlYWRlcltmaWVsZF0pO1xuICB9XG5cbiAgaWYgKHRoaXMuX3Jlc3BvbnNlVHlwZSkge1xuICAgIHhoci5yZXNwb25zZVR5cGUgPSB0aGlzLl9yZXNwb25zZVR5cGU7XG4gIH1cblxuICAvLyBzZW5kIHN0dWZmXG4gIHRoaXMuZW1pdCgncmVxdWVzdCcsIHRoaXMpO1xuXG4gIC8vIElFMTEgeGhyLnNlbmQodW5kZWZpbmVkKSBzZW5kcyAndW5kZWZpbmVkJyBzdHJpbmcgYXMgUE9TVCBwYXlsb2FkIChpbnN0ZWFkIG9mIG5vdGhpbmcpXG4gIC8vIFdlIG5lZWQgbnVsbCBoZXJlIGlmIGRhdGEgaXMgdW5kZWZpbmVkXG4gIHhoci5zZW5kKHR5cGVvZiBkYXRhID09PSAndW5kZWZpbmVkJyA/IG51bGwgOiBkYXRhKTtcbn07XG5cbnJlcXVlc3QuYWdlbnQgPSAoKSA9PiBuZXcgQWdlbnQoKTtcblxuZm9yIChjb25zdCBtZXRob2Qgb2YgWydHRVQnLCAnUE9TVCcsICdPUFRJT05TJywgJ1BBVENIJywgJ1BVVCcsICdERUxFVEUnXSkge1xuICBBZ2VudC5wcm90b3R5cGVbbWV0aG9kLnRvTG93ZXJDYXNlKCldID0gZnVuY3Rpb24gKHVybCwgZm4pIHtcbiAgICBjb25zdCByZXF1ZXN0XyA9IG5ldyByZXF1ZXN0LlJlcXVlc3QobWV0aG9kLCB1cmwpO1xuICAgIHRoaXMuX3NldERlZmF1bHRzKHJlcXVlc3RfKTtcbiAgICBpZiAoZm4pIHtcbiAgICAgIHJlcXVlc3RfLmVuZChmbik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlcXVlc3RfO1xuICB9O1xufVxuXG5BZ2VudC5wcm90b3R5cGUuZGVsID0gQWdlbnQucHJvdG90eXBlLmRlbGV0ZTtcblxuLyoqXG4gKiBHRVQgYHVybGAgd2l0aCBvcHRpb25hbCBjYWxsYmFjayBgZm4ocmVzKWAuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHVybFxuICogQHBhcmFtIHtNaXhlZHxGdW5jdGlvbn0gW2RhdGFdIG9yIGZuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbZm5dXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5yZXF1ZXN0LmdldCA9ICh1cmwsIGRhdGEsIGZuKSA9PiB7XG4gIGNvbnN0IHJlcXVlc3RfID0gcmVxdWVzdCgnR0VUJywgdXJsKTtcbiAgaWYgKHR5cGVvZiBkYXRhID09PSAnZnVuY3Rpb24nKSB7XG4gICAgZm4gPSBkYXRhO1xuICAgIGRhdGEgPSBudWxsO1xuICB9XG5cbiAgaWYgKGRhdGEpIHJlcXVlc3RfLnF1ZXJ5KGRhdGEpO1xuICBpZiAoZm4pIHJlcXVlc3RfLmVuZChmbik7XG4gIHJldHVybiByZXF1ZXN0Xztcbn07XG5cbi8qKlxuICogSEVBRCBgdXJsYCB3aXRoIG9wdGlvbmFsIGNhbGxiYWNrIGBmbihyZXMpYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gdXJsXG4gKiBAcGFyYW0ge01peGVkfEZ1bmN0aW9ufSBbZGF0YV0gb3IgZm5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtmbl1cbiAqIEByZXR1cm4ge1JlcXVlc3R9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbnJlcXVlc3QuaGVhZCA9ICh1cmwsIGRhdGEsIGZuKSA9PiB7XG4gIGNvbnN0IHJlcXVlc3RfID0gcmVxdWVzdCgnSEVBRCcsIHVybCk7XG4gIGlmICh0eXBlb2YgZGF0YSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIGZuID0gZGF0YTtcbiAgICBkYXRhID0gbnVsbDtcbiAgfVxuXG4gIGlmIChkYXRhKSByZXF1ZXN0Xy5xdWVyeShkYXRhKTtcbiAgaWYgKGZuKSByZXF1ZXN0Xy5lbmQoZm4pO1xuICByZXR1cm4gcmVxdWVzdF87XG59O1xuXG4vKipcbiAqIE9QVElPTlMgcXVlcnkgdG8gYHVybGAgd2l0aCBvcHRpb25hbCBjYWxsYmFjayBgZm4ocmVzKWAuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHVybFxuICogQHBhcmFtIHtNaXhlZHxGdW5jdGlvbn0gW2RhdGFdIG9yIGZuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbZm5dXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5yZXF1ZXN0Lm9wdGlvbnMgPSAodXJsLCBkYXRhLCBmbikgPT4ge1xuICBjb25zdCByZXF1ZXN0XyA9IHJlcXVlc3QoJ09QVElPTlMnLCB1cmwpO1xuICBpZiAodHlwZW9mIGRhdGEgPT09ICdmdW5jdGlvbicpIHtcbiAgICBmbiA9IGRhdGE7XG4gICAgZGF0YSA9IG51bGw7XG4gIH1cblxuICBpZiAoZGF0YSkgcmVxdWVzdF8uc2VuZChkYXRhKTtcbiAgaWYgKGZuKSByZXF1ZXN0Xy5lbmQoZm4pO1xuICByZXR1cm4gcmVxdWVzdF87XG59O1xuXG4vKipcbiAqIERFTEVURSBgdXJsYCB3aXRoIG9wdGlvbmFsIGBkYXRhYCBhbmQgY2FsbGJhY2sgYGZuKHJlcylgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB1cmxcbiAqIEBwYXJhbSB7TWl4ZWR9IFtkYXRhXVxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2ZuXVxuICogQHJldHVybiB7UmVxdWVzdH1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gZGVsKHVybCwgZGF0YSwgZm4pIHtcbiAgY29uc3QgcmVxdWVzdF8gPSByZXF1ZXN0KCdERUxFVEUnLCB1cmwpO1xuICBpZiAodHlwZW9mIGRhdGEgPT09ICdmdW5jdGlvbicpIHtcbiAgICBmbiA9IGRhdGE7XG4gICAgZGF0YSA9IG51bGw7XG4gIH1cblxuICBpZiAoZGF0YSkgcmVxdWVzdF8uc2VuZChkYXRhKTtcbiAgaWYgKGZuKSByZXF1ZXN0Xy5lbmQoZm4pO1xuICByZXR1cm4gcmVxdWVzdF87XG59XG5cbnJlcXVlc3QuZGVsID0gZGVsO1xucmVxdWVzdC5kZWxldGUgPSBkZWw7XG5cbi8qKlxuICogUEFUQ0ggYHVybGAgd2l0aCBvcHRpb25hbCBgZGF0YWAgYW5kIGNhbGxiYWNrIGBmbihyZXMpYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gdXJsXG4gKiBAcGFyYW0ge01peGVkfSBbZGF0YV1cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtmbl1cbiAqIEByZXR1cm4ge1JlcXVlc3R9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbnJlcXVlc3QucGF0Y2ggPSAodXJsLCBkYXRhLCBmbikgPT4ge1xuICBjb25zdCByZXF1ZXN0XyA9IHJlcXVlc3QoJ1BBVENIJywgdXJsKTtcbiAgaWYgKHR5cGVvZiBkYXRhID09PSAnZnVuY3Rpb24nKSB7XG4gICAgZm4gPSBkYXRhO1xuICAgIGRhdGEgPSBudWxsO1xuICB9XG5cbiAgaWYgKGRhdGEpIHJlcXVlc3RfLnNlbmQoZGF0YSk7XG4gIGlmIChmbikgcmVxdWVzdF8uZW5kKGZuKTtcbiAgcmV0dXJuIHJlcXVlc3RfO1xufTtcblxuLyoqXG4gKiBQT1NUIGB1cmxgIHdpdGggb3B0aW9uYWwgYGRhdGFgIGFuZCBjYWxsYmFjayBgZm4ocmVzKWAuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHVybFxuICogQHBhcmFtIHtNaXhlZH0gW2RhdGFdXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbZm5dXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5yZXF1ZXN0LnBvc3QgPSAodXJsLCBkYXRhLCBmbikgPT4ge1xuICBjb25zdCByZXF1ZXN0XyA9IHJlcXVlc3QoJ1BPU1QnLCB1cmwpO1xuICBpZiAodHlwZW9mIGRhdGEgPT09ICdmdW5jdGlvbicpIHtcbiAgICBmbiA9IGRhdGE7XG4gICAgZGF0YSA9IG51bGw7XG4gIH1cblxuICBpZiAoZGF0YSkgcmVxdWVzdF8uc2VuZChkYXRhKTtcbiAgaWYgKGZuKSByZXF1ZXN0Xy5lbmQoZm4pO1xuICByZXR1cm4gcmVxdWVzdF87XG59O1xuXG4vKipcbiAqIFBVVCBgdXJsYCB3aXRoIG9wdGlvbmFsIGBkYXRhYCBhbmQgY2FsbGJhY2sgYGZuKHJlcylgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB1cmxcbiAqIEBwYXJhbSB7TWl4ZWR8RnVuY3Rpb259IFtkYXRhXSBvciBmblxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2ZuXVxuICogQHJldHVybiB7UmVxdWVzdH1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxucmVxdWVzdC5wdXQgPSAodXJsLCBkYXRhLCBmbikgPT4ge1xuICBjb25zdCByZXF1ZXN0XyA9IHJlcXVlc3QoJ1BVVCcsIHVybCk7XG4gIGlmICh0eXBlb2YgZGF0YSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIGZuID0gZGF0YTtcbiAgICBkYXRhID0gbnVsbDtcbiAgfVxuXG4gIGlmIChkYXRhKSByZXF1ZXN0Xy5zZW5kKGRhdGEpO1xuICBpZiAoZm4pIHJlcXVlc3RfLmVuZChmbik7XG4gIHJldHVybiByZXF1ZXN0Xztcbn07XG4iXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBOztBQUVBLElBQUlBLElBQUk7QUFDUixJQUFJLE9BQU9DLE1BQU0sS0FBSyxXQUFXLEVBQUU7RUFDakM7RUFDQUQsSUFBSSxHQUFHQyxNQUFNO0FBQ2YsQ0FBQyxNQUFNLElBQUksT0FBT0MsSUFBSSxLQUFLLFdBQVcsRUFBRTtFQUN0QztFQUNBQyxPQUFPLENBQUNDLElBQUksQ0FDVixxRUFDRixDQUFDO0VBQ0RKLElBQUksU0FBTztBQUNiLENBQUMsTUFBTTtFQUNMO0VBQ0FBLElBQUksR0FBR0UsSUFBSTtBQUNiO0FBRUEsTUFBTUcsT0FBTyxHQUFHQyxPQUFPLENBQUMsbUJBQW1CLENBQUM7QUFDNUMsTUFBTUMsYUFBYSxHQUFHRCxPQUFPLENBQUMscUJBQXFCLENBQUM7QUFDcEQsTUFBTUUsRUFBRSxHQUFHRixPQUFPLENBQUMsSUFBSSxDQUFDO0FBQ3hCLE1BQU1HLFdBQVcsR0FBR0gsT0FBTyxDQUFDLGdCQUFnQixDQUFDO0FBQzdDLE1BQU07RUFBRUksUUFBUTtFQUFFQyxLQUFLO0VBQUVDO0FBQU8sQ0FBQyxHQUFHTixPQUFPLENBQUMsU0FBUyxDQUFDO0FBQ3RELE1BQU1PLFlBQVksR0FB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