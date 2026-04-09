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

// create a Proxy that can instantiate a new Agent without using `new` keyword
// (for backward compatibility and chaining)
const proxyAgent = new Proxy(Agent, {
  apply(target, thisArg, argumentsList) {
    return new target(...argumentsList);
  }
});
request.agent = proxyAgent;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6WyJyb290Iiwid2luZG93Iiwic2VsZiIsImNvbnNvbGUiLCJ3YXJuIiwiRW1pdHRlciIsInJlcXVpcmUiLCJzYWZlU3RyaW5naWZ5IiwicXMiLCJSZXF1ZXN0QmFzZSIsImlzT2JqZWN0IiwibWl4aW4iLCJoYXNPd24iLCJSZXNwb25zZUJhc2UiLCJBZ2VudCIsIm5vb3AiLCJtb2R1bGUiLCJleHBvcnRzIiwibWV0aG9kIiwidXJsIiwiUmVxdWVzdCIsImVuZCIsImFyZ3VtZW50cyIsImxlbmd0aCIsInJlcXVlc3QiLCJnZXRYSFIiLCJYTUxIdHRwUmVxdWVzdCIsIkVycm9yIiwidHJpbSIsInMiLCJyZXBsYWNlIiwic2VyaWFsaXplIiwib2JqZWN0IiwicGFpcnMiLCJrZXkiLCJwdXNoRW5jb2RlZEtleVZhbHVlUGFpciIsImpvaW4iLCJ2YWx1ZSIsInVuZGVmaW5lZCIsInB1c2giLCJlbmNvZGVVUkkiLCJBcnJheSIsImlzQXJyYXkiLCJ2Iiwic3Via2V5IiwiZW5jb2RlVVJJQ29tcG9uZW50Iiwic2VyaWFsaXplT2JqZWN0IiwicGFyc2VTdHJpbmciLCJzdHJpbmdfIiwic3BsaXQiLCJwYWlyIiwicG9zIiwiaSIsImxlbmd0aF8iLCJpbmRleE9mIiwiZGVjb2RlVVJJQ29tcG9uZW50Iiwic2xpY2UiLCJ0eXBlcyIsImh0bWwiLCJqc29uIiwieG1sIiwidXJsZW5jb2RlZCIsImZvcm0iLCJvYmoiLCJzdHJpbmdpZnkiLCJpbmRpY2VzIiwic3RyaWN0TnVsbEhhbmRsaW5nIiwicGFyc2UiLCJKU09OIiwicGFyc2VIZWFkZXIiLCJsaW5lcyIsImZpZWxkcyIsImluZGV4IiwibGluZSIsImZpZWxkIiwidG9Mb3dlckNhc2UiLCJpc0pTT04iLCJtaW1lIiwidGVzdCIsIlJlc3BvbnNlIiwicmVxdWVzdF8iLCJyZXEiLCJ4aHIiLCJ0ZXh0IiwicmVzcG9uc2VUeXBlIiwicmVzcG9uc2VUZXh0Iiwic3RhdHVzVGV4dCIsInN0YXR1cyIsIl9zZXRTdGF0dXNQcm9wZXJ0aWVzIiwiaGVhZGVycyIsImdldEFsbFJlc3BvbnNlSGVhZGVycyIsImhlYWRlciIsImdldFJlc3BvbnNlSGVhZGVyIiwiX3NldEhlYWRlclByb3BlcnRpZXMiLCJfcmVzcG9uc2VUeXBlIiwiYm9keSIsInJlc3BvbnNlIiwiX3BhcnNlQm9keSIsInByb3RvdHlwZSIsInR5cGUiLCJfcGFyc2VyIiwiT2JqZWN0IiwidG9FcnJvciIsIm1lc3NhZ2UiLCJlcnJvciIsIl9xdWVyeSIsIl9oZWFkZXIiLCJvbiIsInJlcyIsImVyciIsIm9yaWdpbmFsIiwicmF3UmVzcG9uc2UiLCJzdGF0dXNDb2RlIiwiY2FsbGJhY2siLCJlbWl0IiwibmV3X2Vycm9yIiwiX2lzUmVzcG9uc2VPSyIsInNldCIsImFjY2VwdCIsImF1dGgiLCJ1c2VyIiwicGFzcyIsIm9wdGlvbnMiLCJidG9hIiwiZW5jb2RlciIsInN0cmluZyIsIl9hdXRoIiwicXVlcnkiLCJhdHRhY2giLCJmaWxlIiwiX2RhdGEiLCJfZ2V0Rm9ybURhdGEiLCJhcHBlbmQiLCJuYW1lIiwiX2Zvcm1EYXRhIiwiRm9ybURhdGEiLCJfc2hvdWxkUmV0cnkiLCJfcmV0cnkiLCJmbiIsIl9jYWxsYmFjayIsImNsZWFyVGltZW91dCIsIl9tYXhSZXRyaWVzIiwicmV0cmllcyIsIl9yZXRyaWVzIiwiY3Jvc3NEb21haW5FcnJvciIsImNyb3NzRG9tYWluIiwiYWdlbnQiLCJjYSIsImJ1ZmZlciIsIndyaXRlIiwicGlwZSIsIl9pc0hvc3QiLCJ0b1N0cmluZyIsImNhbGwiLCJfZW5kQ2FsbGVkIiwiX2ZpbmFsaXplUXVlcnlTdHJpbmciLCJfZW5kIiwiX3NldFVwbG9hZFRpbWVvdXQiLCJfdXBsb2FkVGltZW91dCIsIl91cGxvYWRUaW1lb3V0VGltZXIiLCJzZXRUaW1lb3V0IiwiX3RpbWVvdXRFcnJvciIsIl9hYm9ydGVkIiwiZGF0YSIsIl9zZXRUaW1lb3V0cyIsImFkZEV2ZW50TGlzdGVuZXIiLCJyZWFkeVN0YXRlIiwiX3Jlc3BvbnNlVGltZW91dFRpbWVyIiwidGltZWRvdXQiLCJoYW5kbGVQcm9ncmVzcyIsImRpcmVjdGlvbiIsImUiLCJ0b3RhbCIsInBlcmNlbnQiLCJsb2FkZWQiLCJoYXNMaXN0ZW5lcnMiLCJiaW5kIiwidXBsb2FkIiwidXNlcm5hbWUiLCJwYXNzd29yZCIsIm9wZW4iLCJfd2l0aENyZWRlbnRpYWxzIiwid2l0aENyZWRlbnRpYWxzIiwiY29udGVudFR5cGUiLCJfc2VyaWFsaXplciIsInNldFJlcXVlc3RIZWFkZXIiLCJzZW5kIiwicHJveHlBZ2VudCIsIlByb3h5IiwiYXBwbHkiLCJ0YXJnZXQiLCJ0aGlzQXJnIiwiYXJndW1lbnRzTGlzdCIsIl9zZXREZWZhdWx0cyIsImRlbCIsImRlbGV0ZSIsImdldCIsImhlYWQiLCJwYXRjaCIsInBvc3QiLCJwdXQiXSwic291cmNlcyI6WyIuLi9zcmMvY2xpZW50LmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogUm9vdCByZWZlcmVuY2UgZm9yIGlmcmFtZXMuXG4gKi9cblxubGV0IHJvb3Q7XG5pZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgLy8gQnJvd3NlciB3aW5kb3dcbiAgcm9vdCA9IHdpbmRvdztcbn0gZWxzZSBpZiAodHlwZW9mIHNlbGYgPT09ICd1bmRlZmluZWQnKSB7XG4gIC8vIE90aGVyIGVudmlyb25tZW50c1xuICBjb25zb2xlLndhcm4oXG4gICAgJ1VzaW5nIGJyb3dzZXItb25seSB2ZXJzaW9uIG9mIHN1cGVyYWdlbnQgaW4gbm9uLWJyb3dzZXIgZW52aXJvbm1lbnQnXG4gICk7XG4gIHJvb3QgPSB0aGlzO1xufSBlbHNlIHtcbiAgLy8gV2ViIFdvcmtlclxuICByb290ID0gc2VsZjtcbn1cblxuY29uc3QgRW1pdHRlciA9IHJlcXVpcmUoJ2NvbXBvbmVudC1lbWl0dGVyJyk7XG5jb25zdCBzYWZlU3RyaW5naWZ5ID0gcmVxdWlyZSgnZmFzdC1zYWZlLXN0cmluZ2lmeScpO1xuY29uc3QgcXMgPSByZXF1aXJlKCdxcycpO1xuY29uc3QgUmVxdWVzdEJhc2UgPSByZXF1aXJlKCcuL3JlcXVlc3QtYmFzZScpO1xuY29uc3QgeyBpc09iamVjdCwgbWl4aW4sIGhhc093biB9ID0gcmVxdWlyZSgnLi91dGlscycpO1xuY29uc3QgUmVzcG9uc2VCYXNlID0gcmVxdWlyZSgnLi9yZXNwb25zZS1iYXNlJyk7XG5jb25zdCBBZ2VudCA9IHJlcXVpcmUoJy4vYWdlbnQtYmFzZScpO1xuXG4vKipcbiAqIE5vb3AuXG4gKi9cblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbi8qKlxuICogRXhwb3NlIGByZXF1ZXN0YC5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChtZXRob2QsIHVybCkge1xuICAvLyBjYWxsYmFja1xuICBpZiAodHlwZW9mIHVybCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiBuZXcgZXhwb3J0cy5SZXF1ZXN0KCdHRVQnLCBtZXRob2QpLmVuZCh1cmwpO1xuICB9XG5cbiAgLy8gdXJsIGZpcnN0XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgcmV0dXJuIG5ldyBleHBvcnRzLlJlcXVlc3QoJ0dFVCcsIG1ldGhvZCk7XG4gIH1cblxuICByZXR1cm4gbmV3IGV4cG9ydHMuUmVxdWVzdChtZXRob2QsIHVybCk7XG59O1xuXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHM7XG5cbmNvbnN0IHJlcXVlc3QgPSBleHBvcnRzO1xuXG5leHBvcnRzLlJlcXVlc3QgPSBSZXF1ZXN0O1xuXG4vKipcbiAqIERldGVybWluZSBYSFIuXG4gKi9cblxucmVxdWVzdC5nZXRYSFIgPSAoKSA9PiB7XG4gIGlmIChyb290LlhNTEh0dHBSZXF1ZXN0KSB7XG4gICAgcmV0dXJuIG5ldyByb290LlhNTEh0dHBSZXF1ZXN0KCk7XG4gIH1cblxuICB0aHJvdyBuZXcgRXJyb3IoJ0Jyb3dzZXItb25seSB2ZXJzaW9uIG9mIHN1cGVyYWdlbnQgY291bGQgbm90IGZpbmQgWEhSJyk7XG59O1xuXG4vKipcbiAqIFJlbW92ZXMgbGVhZGluZyBhbmQgdHJhaWxpbmcgd2hpdGVzcGFjZSwgYWRkZWQgdG8gc3VwcG9ydCBJRS5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gc1xuICogQHJldHVybiB7U3RyaW5nfVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuY29uc3QgdHJpbSA9ICcnLnRyaW0gPyAocykgPT4gcy50cmltKCkgOiAocykgPT4gcy5yZXBsYWNlKC8oXlxccyp8XFxzKiQpL2csICcnKTtcblxuLyoqXG4gKiBTZXJpYWxpemUgdGhlIGdpdmVuIGBvYmpgLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmpcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIHNlcmlhbGl6ZShvYmplY3QpIHtcbiAgaWYgKCFpc09iamVjdChvYmplY3QpKSByZXR1cm4gb2JqZWN0O1xuICBjb25zdCBwYWlycyA9IFtdO1xuICBmb3IgKGNvbnN0IGtleSBpbiBvYmplY3QpIHtcbiAgICBpZiAoaGFzT3duKG9iamVjdCwga2V5KSkgcHVzaEVuY29kZWRLZXlWYWx1ZVBhaXIocGFpcnMsIGtleSwgb2JqZWN0W2tleV0pO1xuICB9XG5cbiAgcmV0dXJuIHBhaXJzLmpvaW4oJyYnKTtcbn1cblxuLyoqXG4gKiBIZWxwcyAnc2VyaWFsaXplJyB3aXRoIHNlcmlhbGl6aW5nIGFycmF5cy5cbiAqIE11dGF0ZXMgdGhlIHBhaXJzIGFycmF5LlxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IHBhaXJzXG4gKiBAcGFyYW0ge1N0cmluZ30ga2V5XG4gKiBAcGFyYW0ge01peGVkfSB2YWxcbiAqL1xuXG5mdW5jdGlvbiBwdXNoRW5jb2RlZEtleVZhbHVlUGFpcihwYWlycywga2V5LCB2YWx1ZSkge1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkgcmV0dXJuO1xuICBpZiAodmFsdWUgPT09IG51bGwpIHtcbiAgICBwYWlycy5wdXNoKGVuY29kZVVSSShrZXkpKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICBmb3IgKGNvbnN0IHYgb2YgdmFsdWUpIHtcbiAgICAgIHB1c2hFbmNvZGVkS2V5VmFsdWVQYWlyKHBhaXJzLCBrZXksIHYpO1xuICAgIH1cbiAgfSBlbHNlIGlmIChpc09iamVjdCh2YWx1ZSkpIHtcbiAgICBmb3IgKGNvbnN0IHN1YmtleSBpbiB2YWx1ZSkge1xuICAgICAgaWYgKGhhc093bih2YWx1ZSwgc3Via2V5KSlcbiAgICAgICAgcHVzaEVuY29kZWRLZXlWYWx1ZVBhaXIocGFpcnMsIGAke2tleX1bJHtzdWJrZXl9XWAsIHZhbHVlW3N1YmtleV0pO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBwYWlycy5wdXNoKGVuY29kZVVSSShrZXkpICsgJz0nICsgZW5jb2RlVVJJQ29tcG9uZW50KHZhbHVlKSk7XG4gIH1cbn1cblxuLyoqXG4gKiBFeHBvc2Ugc2VyaWFsaXphdGlvbiBtZXRob2QuXG4gKi9cblxucmVxdWVzdC5zZXJpYWxpemVPYmplY3QgPSBzZXJpYWxpemU7XG5cbi8qKlxuICogUGFyc2UgdGhlIGdpdmVuIHgtd3d3LWZvcm0tdXJsZW5jb2RlZCBgc3RyYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gc3RyXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBwYXJzZVN0cmluZyhzdHJpbmdfKSB7XG4gIGNvbnN0IG9iamVjdCA9IHt9O1xuICBjb25zdCBwYWlycyA9IHN0cmluZ18uc3BsaXQoJyYnKTtcbiAgbGV0IHBhaXI7XG4gIGxldCBwb3M7XG5cbiAgZm9yIChsZXQgaSA9IDAsIGxlbmd0aF8gPSBwYWlycy5sZW5ndGg7IGkgPCBsZW5ndGhfOyArK2kpIHtcbiAgICBwYWlyID0gcGFpcnNbaV07XG4gICAgcG9zID0gcGFpci5pbmRleE9mKCc9Jyk7XG4gICAgaWYgKHBvcyA9PT0gLTEpIHtcbiAgICAgIG9iamVjdFtkZWNvZGVVUklDb21wb25lbnQocGFpcildID0gJyc7XG4gICAgfSBlbHNlIHtcbiAgICAgIG9iamVjdFtkZWNvZGVVUklDb21wb25lbnQocGFpci5zbGljZSgwLCBwb3MpKV0gPSBkZWNvZGVVUklDb21wb25lbnQoXG4gICAgICAgIHBhaXIuc2xpY2UocG9zICsgMSlcbiAgICAgICk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG9iamVjdDtcbn1cblxuLyoqXG4gKiBFeHBvc2UgcGFyc2VyLlxuICovXG5cbnJlcXVlc3QucGFyc2VTdHJpbmcgPSBwYXJzZVN0cmluZztcblxuLyoqXG4gKiBEZWZhdWx0IE1JTUUgdHlwZSBtYXAuXG4gKlxuICogICAgIHN1cGVyYWdlbnQudHlwZXMueG1sID0gJ2FwcGxpY2F0aW9uL3htbCc7XG4gKlxuICovXG5cbnJlcXVlc3QudHlwZXMgPSB7XG4gIGh0bWw6ICd0ZXh0L2h0bWwnLFxuICBqc29uOiAnYXBwbGljYXRpb24vanNvbicsXG4gIHhtbDogJ3RleHQveG1sJyxcbiAgdXJsZW5jb2RlZDogJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZCcsXG4gIGZvcm06ICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnLFxuICAnZm9ybS1kYXRhJzogJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZCdcbn07XG5cbi8qKlxuICogRGVmYXVsdCBzZXJpYWxpemF0aW9uIG1hcC5cbiAqXG4gKiAgICAgc3VwZXJhZ2VudC5zZXJpYWxpemVbJ2FwcGxpY2F0aW9uL3htbCddID0gZnVuY3Rpb24ob2JqKXtcbiAqICAgICAgIHJldHVybiAnZ2VuZXJhdGVkIHhtbCBoZXJlJztcbiAqICAgICB9O1xuICpcbiAqL1xuXG5yZXF1ZXN0LnNlcmlhbGl6ZSA9IHtcbiAgJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZCc6IChvYmopID0+IHtcbiAgICByZXR1cm4gcXMuc3RyaW5naWZ5KG9iaiwgeyBpbmRpY2VzOiBmYWxzZSwgc3RyaWN0TnVsbEhhbmRsaW5nOiB0cnVlIH0pO1xuICB9LFxuICAnYXBwbGljYXRpb24vanNvbic6IHNhZmVTdHJpbmdpZnlcbn07XG5cbi8qKlxuICogRGVmYXVsdCBwYXJzZXJzLlxuICpcbiAqICAgICBzdXBlcmFnZW50LnBhcnNlWydhcHBsaWNhdGlvbi94bWwnXSA9IGZ1bmN0aW9uKHN0cil7XG4gKiAgICAgICByZXR1cm4geyBvYmplY3QgcGFyc2VkIGZyb20gc3RyIH07XG4gKiAgICAgfTtcbiAqXG4gKi9cblxucmVxdWVzdC5wYXJzZSA9IHtcbiAgJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZCc6IHBhcnNlU3RyaW5nLFxuICAnYXBwbGljYXRpb24vanNvbic6IEpTT04ucGFyc2Vcbn07XG5cbi8qKlxuICogUGFyc2UgdGhlIGdpdmVuIGhlYWRlciBgc3RyYCBpbnRvXG4gKiBhbiBvYmplY3QgY29udGFpbmluZyB0aGUgbWFwcGVkIGZpZWxkcy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gc3RyXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBwYXJzZUhlYWRlcihzdHJpbmdfKSB7XG4gIGNvbnN0IGxpbmVzID0gc3RyaW5nXy5zcGxpdCgvXFxyP1xcbi8pO1xuICBjb25zdCBmaWVsZHMgPSB7fTtcbiAgbGV0IGluZGV4O1xuICBsZXQgbGluZTtcbiAgbGV0IGZpZWxkO1xuICBsZXQgdmFsdWU7XG5cbiAgZm9yIChsZXQgaSA9IDAsIGxlbmd0aF8gPSBsaW5lcy5sZW5ndGg7IGkgPCBsZW5ndGhfOyArK2kpIHtcbiAgICBsaW5lID0gbGluZXNbaV07XG4gICAgaW5kZXggPSBsaW5lLmluZGV4T2YoJzonKTtcbiAgICBpZiAoaW5kZXggPT09IC0xKSB7XG4gICAgICAvLyBjb3VsZCBiZSBlbXB0eSBsaW5lLCBqdXN0IHNraXAgaXRcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGZpZWxkID0gbGluZS5zbGljZSgwLCBpbmRleCkudG9Mb3dlckNhc2UoKTtcbiAgICB2YWx1ZSA9IHRyaW0obGluZS5zbGljZShpbmRleCArIDEpKTtcbiAgICBmaWVsZHNbZmllbGRdID0gdmFsdWU7XG4gIH1cblxuICByZXR1cm4gZmllbGRzO1xufVxuXG4vKipcbiAqIENoZWNrIGlmIGBtaW1lYCBpcyBqc29uIG9yIGhhcyAranNvbiBzdHJ1Y3R1cmVkIHN5bnRheCBzdWZmaXguXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG1pbWVcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBpc0pTT04obWltZSkge1xuICAvLyBzaG91bGQgbWF0Y2ggL2pzb24gb3IgK2pzb25cbiAgLy8gYnV0IG5vdCAvanNvbi1zZXFcbiAgcmV0dXJuIC9bLytdanNvbigkfFteLVxcd10pL2kudGVzdChtaW1lKTtcbn1cblxuLyoqXG4gKiBJbml0aWFsaXplIGEgbmV3IGBSZXNwb25zZWAgd2l0aCB0aGUgZ2l2ZW4gYHhocmAuXG4gKlxuICogIC0gc2V0IGZsYWdzICgub2ssIC5lcnJvciwgZXRjKVxuICogIC0gcGFyc2UgaGVhZGVyXG4gKlxuICogRXhhbXBsZXM6XG4gKlxuICogIEFsaWFzaW5nIGBzdXBlcmFnZW50YCBhcyBgcmVxdWVzdGAgaXMgbmljZTpcbiAqXG4gKiAgICAgIHJlcXVlc3QgPSBzdXBlcmFnZW50O1xuICpcbiAqICBXZSBjYW4gdXNlIHRoZSBwcm9taXNlLWxpa2UgQVBJLCBvciBwYXNzIGNhbGxiYWNrczpcbiAqXG4gKiAgICAgIHJlcXVlc3QuZ2V0KCcvJykuZW5kKGZ1bmN0aW9uKHJlcyl7fSk7XG4gKiAgICAgIHJlcXVlc3QuZ2V0KCcvJywgZnVuY3Rpb24ocmVzKXt9KTtcbiAqXG4gKiAgU2VuZGluZyBkYXRhIGNhbiBiZSBjaGFpbmVkOlxuICpcbiAqICAgICAgcmVxdWVzdFxuICogICAgICAgIC5wb3N0KCcvdXNlcicpXG4gKiAgICAgICAgLnNlbmQoeyBuYW1lOiAndGonIH0pXG4gKiAgICAgICAgLmVuZChmdW5jdGlvbihyZXMpe30pO1xuICpcbiAqICBPciBwYXNzZWQgdG8gYC5zZW5kKClgOlxuICpcbiAqICAgICAgcmVxdWVzdFxuICogICAgICAgIC5wb3N0KCcvdXNlcicpXG4gKiAgICAgICAgLnNlbmQoeyBuYW1lOiAndGonIH0sIGZ1bmN0aW9uKHJlcyl7fSk7XG4gKlxuICogIE9yIHBhc3NlZCB0byBgLnBvc3QoKWA6XG4gKlxuICogICAgICByZXF1ZXN0XG4gKiAgICAgICAgLnBvc3QoJy91c2VyJywgeyBuYW1lOiAndGonIH0pXG4gKiAgICAgICAgLmVuZChmdW5jdGlvbihyZXMpe30pO1xuICpcbiAqIE9yIGZ1cnRoZXIgcmVkdWNlZCB0byBhIHNpbmdsZSBjYWxsIGZvciBzaW1wbGUgY2FzZXM6XG4gKlxuICogICAgICByZXF1ZXN0XG4gKiAgICAgICAgLnBvc3QoJy91c2VyJywgeyBuYW1lOiAndGonIH0sIGZ1bmN0aW9uKHJlcyl7fSk7XG4gKlxuICogQHBhcmFtIHtYTUxIVFRQUmVxdWVzdH0geGhyXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gUmVzcG9uc2UocmVxdWVzdF8pIHtcbiAgdGhpcy5yZXEgPSByZXF1ZXN0XztcbiAgdGhpcy54aHIgPSB0aGlzLnJlcS54aHI7XG4gIC8vIHJlc3BvbnNlVGV4dCBpcyBhY2Nlc3NpYmxlIG9ubHkgaWYgcmVzcG9uc2VUeXBlIGlzICcnIG9yICd0ZXh0JyBhbmQgb24gb2xkZXIgYnJvd3NlcnNcbiAgdGhpcy50ZXh0ID1cbiAgICAodGhpcy5yZXEubWV0aG9kICE9PSAnSEVBRCcgJiZcbiAgICAgICh0aGlzLnhoci5yZXNwb25zZVR5cGUgPT09ICcnIHx8IHRoaXMueGhyLnJlc3BvbnNlVHlwZSA9PT0gJ3RleHQnKSkgfHxcbiAgICB0eXBlb2YgdGhpcy54aHIucmVzcG9uc2VUeXBlID09PSAndW5kZWZpbmVkJ1xuICAgICAgPyB0aGlzLnhoci5yZXNwb25zZVRleHRcbiAgICAgIDogbnVsbDtcbiAgdGhpcy5zdGF0dXNUZXh0ID0gdGhpcy5yZXEueGhyLnN0YXR1c1RleHQ7XG4gIGxldCB7IHN0YXR1cyB9ID0gdGhpcy54aHI7XG4gIC8vIGhhbmRsZSBJRTkgYnVnOiBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzEwMDQ2OTcyL21zaWUtcmV0dXJucy1zdGF0dXMtY29kZS1vZi0xMjIzLWZvci1hamF4LXJlcXVlc3RcbiAgaWYgKHN0YXR1cyA9PT0gMTIyMykge1xuICAgIHN0YXR1cyA9IDIwNDtcbiAgfVxuXG4gIHRoaXMuX3NldFN0YXR1c1Byb3BlcnRpZXMoc3RhdHVzKTtcbiAgdGhpcy5oZWFkZXJzID0gcGFyc2VIZWFkZXIodGhpcy54aHIuZ2V0QWxsUmVzcG9uc2VIZWFkZXJzKCkpO1xuICB0aGlzLmhlYWRlciA9IHRoaXMuaGVhZGVycztcbiAgLy8gZ2V0QWxsUmVzcG9uc2VIZWFkZXJzIHNvbWV0aW1lcyBmYWxzZWx5IHJldHVybnMgXCJcIiBmb3IgQ09SUyByZXF1ZXN0cywgYnV0XG4gIC8vIGdldFJlc3BvbnNlSGVhZGVyIHN0aWxsIHdvcmtzLiBzbyB3ZSBnZXQgY29udGVudC10eXBlIGV2ZW4gaWYgZ2V0dGluZ1xuICAvLyBvdGhlciBoZWFkZXJzIGZhaWxzLlxuICB0aGlzLmhlYWRlclsnY29udGVudC10eXBlJ10gPSB0aGlzLnhoci5nZXRSZXNwb25zZUhlYWRlcignY29udGVudC10eXBlJyk7XG4gIHRoaXMuX3NldEhlYWRlclByb3BlcnRpZXModGhpcy5oZWFkZXIpO1xuXG4gIGlmICh0aGlzLnRleHQgPT09IG51bGwgJiYgcmVxdWVzdF8uX3Jlc3BvbnNlVHlwZSkge1xuICAgIHRoaXMuYm9keSA9IHRoaXMueGhyLnJlc3BvbnNlO1xuICB9IGVsc2Uge1xuICAgIHRoaXMuYm9keSA9XG4gICAgICB0aGlzLnJlcS5tZXRob2QgPT09ICdIRUFEJ1xuICAgICAgICA/IG51bGxcbiAgICAgICAgOiB0aGlzLl9wYXJzZUJvZHkodGhpcy50ZXh0ID8gdGhpcy50ZXh0IDogdGhpcy54aHIucmVzcG9uc2UpO1xuICB9XG59XG5cbm1peGluKFJlc3BvbnNlLnByb3RvdHlwZSwgUmVzcG9uc2VCYXNlLnByb3RvdHlwZSk7XG5cbi8qKlxuICogUGFyc2UgdGhlIGdpdmVuIGJvZHkgYHN0cmAuXG4gKlxuICogVXNlZCBmb3IgYXV0by1wYXJzaW5nIG9mIGJvZGllcy4gUGFyc2Vyc1xuICogYXJlIGRlZmluZWQgb24gdGhlIGBzdXBlcmFnZW50LnBhcnNlYCBvYmplY3QuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHN0clxuICogQHJldHVybiB7TWl4ZWR9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5SZXNwb25zZS5wcm90b3R5cGUuX3BhcnNlQm9keSA9IGZ1bmN0aW9uIChzdHJpbmdfKSB7XG4gIGxldCBwYXJzZSA9IHJlcXVlc3QucGFyc2VbdGhpcy50eXBlXTtcbiAgaWYgKHRoaXMucmVxLl9wYXJzZXIpIHtcbiAgICByZXR1cm4gdGhpcy5yZXEuX3BhcnNlcih0aGlzLCBzdHJpbmdfKTtcbiAgfVxuXG4gIGlmICghcGFyc2UgJiYgaXNKU09OKHRoaXMudHlwZSkpIHtcbiAgICBwYXJzZSA9IHJlcXVlc3QucGFyc2VbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgfVxuXG4gIHJldHVybiBwYXJzZSAmJiBzdHJpbmdfICYmIChzdHJpbmdfLmxlbmd0aCA+IDAgfHwgc3RyaW5nXyBpbnN0YW5jZW9mIE9iamVjdClcbiAgICA/IHBhcnNlKHN0cmluZ18pXG4gICAgOiBudWxsO1xufTtcblxuLyoqXG4gKiBSZXR1cm4gYW4gYEVycm9yYCByZXByZXNlbnRhdGl2ZSBvZiB0aGlzIHJlc3BvbnNlLlxuICpcbiAqIEByZXR1cm4ge0Vycm9yfVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXNwb25zZS5wcm90b3R5cGUudG9FcnJvciA9IGZ1bmN0aW9uICgpIHtcbiAgY29uc3QgeyByZXEgfSA9IHRoaXM7XG4gIGNvbnN0IHsgbWV0aG9kIH0gPSByZXE7XG4gIGNvbnN0IHsgdXJsIH0gPSByZXE7XG5cbiAgY29uc3QgbWVzc2FnZSA9IGBjYW5ub3QgJHttZXRob2R9ICR7dXJsfSAoJHt0aGlzLnN0YXR1c30pYDtcbiAgY29uc3QgZXJyb3IgPSBuZXcgRXJyb3IobWVzc2FnZSk7XG4gIGVycm9yLnN0YXR1cyA9IHRoaXMuc3RhdHVzO1xuICBlcnJvci5tZXRob2QgPSBtZXRob2Q7XG4gIGVycm9yLnVybCA9IHVybDtcblxuICByZXR1cm4gZXJyb3I7XG59O1xuXG4vKipcbiAqIEV4cG9zZSBgUmVzcG9uc2VgLlxuICovXG5cbnJlcXVlc3QuUmVzcG9uc2UgPSBSZXNwb25zZTtcblxuLyoqXG4gKiBJbml0aWFsaXplIGEgbmV3IGBSZXF1ZXN0YCB3aXRoIHRoZSBnaXZlbiBgbWV0aG9kYCBhbmQgYHVybGAuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG1ldGhvZFxuICogQHBhcmFtIHtTdHJpbmd9IHVybFxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5mdW5jdGlvbiBSZXF1ZXN0KG1ldGhvZCwgdXJsKSB7XG4gIGNvbnN0IHNlbGYgPSB0aGlzO1xuICB0aGlzLl9xdWVyeSA9IHRoaXMuX3F1ZXJ5IHx8IFtdO1xuICB0aGlzLm1ldGhvZCA9IG1ldGhvZDtcbiAgdGhpcy51cmwgPSB1cmw7XG4gIHRoaXMuaGVhZGVyID0ge307IC8vIHByZXNlcnZlcyBoZWFkZXIgbmFtZSBjYXNlXG4gIHRoaXMuX2hlYWRlciA9IHt9OyAvLyBjb2VyY2VzIGhlYWRlciBuYW1lcyB0byBsb3dlcmNhc2VcbiAgdGhpcy5vbignZW5kJywgKCkgPT4ge1xuICAgIGxldCBlcnJvciA9IG51bGw7XG4gICAgbGV0IHJlcyA9IG51bGw7XG5cbiAgICB0cnkge1xuICAgICAgcmVzID0gbmV3IFJlc3BvbnNlKHNlbGYpO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgZXJyb3IgPSBuZXcgRXJyb3IoJ1BhcnNlciBpcyB1bmFibGUgdG8gcGFyc2UgdGhlIHJlc3BvbnNlJyk7XG4gICAgICBlcnJvci5wYXJzZSA9IHRydWU7XG4gICAgICBlcnJvci5vcmlnaW5hbCA9IGVycjtcbiAgICAgIC8vIGlzc3VlICM2NzU6IHJldHVybiB0aGUgcmF3IHJlc3BvbnNlIGlmIHRoZSByZXNwb25zZSBwYXJzaW5nIGZhaWxzXG4gICAgICBpZiAoc2VsZi54aHIpIHtcbiAgICAgICAgLy8gaWU5IGRvZXNuJ3QgaGF2ZSAncmVzcG9uc2UnIHByb3BlcnR5XG4gICAgICAgIGVycm9yLnJhd1Jlc3BvbnNlID1cbiAgICAgICAgICB0eXBlb2Ygc2VsZi54aHIucmVzcG9uc2VUeXBlID09PSAndW5kZWZpbmVkJ1xuICAgICAgICAgICAgPyBzZWxmLnhoci5yZXNwb25zZVRleHRcbiAgICAgICAgICAgIDogc2VsZi54aHIucmVzcG9uc2U7XG4gICAgICAgIC8vIGlzc3VlICM4NzY6IHJldHVybiB0aGUgaHR0cCBzdGF0dXMgY29kZSBpZiB0aGUgcmVzcG9uc2UgcGFyc2luZyBmYWlsc1xuICAgICAgICBlcnJvci5zdGF0dXMgPSBzZWxmLnhoci5zdGF0dXMgPyBzZWxmLnhoci5zdGF0dXMgOiBudWxsO1xuICAgICAgICBlcnJvci5zdGF0dXNDb2RlID0gZXJyb3Iuc3RhdHVzOyAvLyBiYWNrd2FyZHMtY29tcGF0IG9ubHlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGVycm9yLnJhd1Jlc3BvbnNlID0gbnVsbDtcbiAgICAgICAgZXJyb3Iuc3RhdHVzID0gbnVsbDtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHNlbGYuY2FsbGJhY2soZXJyb3IpO1xuICAgIH1cblxuICAgIHNlbGYuZW1pdCgncmVzcG9uc2UnLCByZXMpO1xuXG4gICAgbGV0IG5ld19lcnJvcjtcbiAgICB0cnkge1xuICAgICAgaWYgKCFzZWxmLl9pc1Jlc3BvbnNlT0socmVzKSkge1xuICAgICAgICBuZXdfZXJyb3IgPSBuZXcgRXJyb3IoXG4gICAgICAgICAgcmVzLnN0YXR1c1RleHQgfHwgcmVzLnRleHQgfHwgJ1Vuc3VjY2Vzc2Z1bCBIVFRQIHJlc3BvbnNlJ1xuICAgICAgICApO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgbmV3X2Vycm9yID0gZXJyOyAvLyBvaygpIGNhbGxiYWNrIGNhbiB0aHJvd1xuICAgIH1cblxuICAgIC8vICMxMDAwIGRvbid0IGNhdGNoIGVycm9ycyBmcm9tIHRoZSBjYWxsYmFjayB0byBhdm9pZCBkb3VibGUgY2FsbGluZyBpdFxuICAgIGlmIChuZXdfZXJyb3IpIHtcbiAgICAgIG5ld19lcnJvci5vcmlnaW5hbCA9IGVycm9yO1xuICAgICAgbmV3X2Vycm9yLnJlc3BvbnNlID0gcmVzO1xuICAgICAgbmV3X2Vycm9yLnN0YXR1cyA9IG5ld19lcnJvci5zdGF0dXMgfHwgcmVzLnN0YXR1cztcbiAgICAgIHNlbGYuY2FsbGJhY2sobmV3X2Vycm9yLCByZXMpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzZWxmLmNhbGxiYWNrKG51bGwsIHJlcyk7XG4gICAgfVxuICB9KTtcbn1cblxuLyoqXG4gKiBNaXhpbiBgRW1pdHRlcmAgYW5kIGBSZXF1ZXN0QmFzZWAuXG4gKi9cblxuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5ldy1jYXBcbkVtaXR0ZXIoUmVxdWVzdC5wcm90b3R5cGUpO1xuXG5taXhpbihSZXF1ZXN0LnByb3RvdHlwZSwgUmVxdWVzdEJhc2UucHJvdG90eXBlKTtcblxuLyoqXG4gKiBTZXQgQ29udGVudC1UeXBlIHRvIGB0eXBlYCwgbWFwcGluZyB2YWx1ZXMgZnJvbSBgcmVxdWVzdC50eXBlc2AuXG4gKlxuICogRXhhbXBsZXM6XG4gKlxuICogICAgICBzdXBlcmFnZW50LnR5cGVzLnhtbCA9ICdhcHBsaWNhdGlvbi94bWwnO1xuICpcbiAqICAgICAgcmVxdWVzdC5wb3N0KCcvJylcbiAqICAgICAgICAudHlwZSgneG1sJylcbiAqICAgICAgICAuc2VuZCh4bWxzdHJpbmcpXG4gKiAgICAgICAgLmVuZChjYWxsYmFjayk7XG4gKlxuICogICAgICByZXF1ZXN0LnBvc3QoJy8nKVxuICogICAgICAgIC50eXBlKCdhcHBsaWNhdGlvbi94bWwnKVxuICogICAgICAgIC5zZW5kKHhtbHN0cmluZylcbiAqICAgICAgICAuZW5kKGNhbGxiYWNrKTtcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gdHlwZVxuICogQHJldHVybiB7UmVxdWVzdH0gZm9yIGNoYWluaW5nXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlcXVlc3QucHJvdG90eXBlLnR5cGUgPSBmdW5jdGlvbiAodHlwZSkge1xuICB0aGlzLnNldCgnQ29udGVudC1UeXBlJywgcmVxdWVzdC50eXBlc1t0eXBlXSB8fCB0eXBlKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFNldCBBY2NlcHQgdG8gYHR5cGVgLCBtYXBwaW5nIHZhbHVlcyBmcm9tIGByZXF1ZXN0LnR5cGVzYC5cbiAqXG4gKiBFeGFtcGxlczpcbiAqXG4gKiAgICAgIHN1cGVyYWdlbnQudHlwZXMuanNvbiA9ICdhcHBsaWNhdGlvbi9qc29uJztcbiAqXG4gKiAgICAgIHJlcXVlc3QuZ2V0KCcvYWdlbnQnKVxuICogICAgICAgIC5hY2NlcHQoJ2pzb24nKVxuICogICAgICAgIC5lbmQoY2FsbGJhY2spO1xuICpcbiAqICAgICAgcmVxdWVzdC5nZXQoJy9hZ2VudCcpXG4gKiAgICAgICAgLmFjY2VwdCgnYXBwbGljYXRpb24vanNvbicpXG4gKiAgICAgICAgLmVuZChjYWxsYmFjayk7XG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGFjY2VwdFxuICogQHJldHVybiB7UmVxdWVzdH0gZm9yIGNoYWluaW5nXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlcXVlc3QucHJvdG90eXBlLmFjY2VwdCA9IGZ1bmN0aW9uICh0eXBlKSB7XG4gIHRoaXMuc2V0KCdBY2NlcHQnLCByZXF1ZXN0LnR5cGVzW3R5cGVdIHx8IHR5cGUpO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogU2V0IEF1dGhvcml6YXRpb24gZmllbGQgdmFsdWUgd2l0aCBgdXNlcmAgYW5kIGBwYXNzYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gdXNlclxuICogQHBhcmFtIHtTdHJpbmd9IFtwYXNzXSBvcHRpb25hbCBpbiBjYXNlIG9mIHVzaW5nICdiZWFyZXInIGFzIHR5cGVcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIHdpdGggJ3R5cGUnIHByb3BlcnR5ICdhdXRvJywgJ2Jhc2ljJyBvciAnYmVhcmVyJyAoZGVmYXVsdCAnYmFzaWMnKVxuICogQHJldHVybiB7UmVxdWVzdH0gZm9yIGNoYWluaW5nXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlcXVlc3QucHJvdG90eXBlLmF1dGggPSBmdW5jdGlvbiAodXNlciwgcGFzcywgb3B0aW9ucykge1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSkgcGFzcyA9ICcnO1xuICBpZiAodHlwZW9mIHBhc3MgPT09ICdvYmplY3QnICYmIHBhc3MgIT09IG51bGwpIHtcbiAgICAvLyBwYXNzIGlzIG9wdGlvbmFsIGFuZCBjYW4gYmUgcmVwbGFjZWQgd2l0aCBvcHRpb25zXG4gICAgb3B0aW9ucyA9IHBhc3M7XG4gICAgcGFzcyA9ICcnO1xuICB9XG5cbiAgaWYgKCFvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IHtcbiAgICAgIHR5cGU6IHR5cGVvZiBidG9hID09PSAnZnVuY3Rpb24nID8gJ2Jhc2ljJyA6ICdhdXRvJ1xuICAgIH07XG4gIH1cblxuICBjb25zdCBlbmNvZGVyID0gb3B0aW9ucy5lbmNvZGVyXG4gICAgPyBvcHRpb25zLmVuY29kZXJcbiAgICA6IChzdHJpbmcpID0+IHtcbiAgICAgICAgaWYgKHR5cGVvZiBidG9hID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgcmV0dXJuIGJ0b2Eoc3RyaW5nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignQ2Fubm90IHVzZSBiYXNpYyBhdXRoLCBidG9hIGlzIG5vdCBhIGZ1bmN0aW9uJyk7XG4gICAgICB9O1xuXG4gIHJldHVybiB0aGlzLl9hdXRoKHVzZXIsIHBhc3MsIG9wdGlvbnMsIGVuY29kZXIpO1xufTtcblxuLyoqXG4gKiBBZGQgcXVlcnktc3RyaW5nIGB2YWxgLlxuICpcbiAqIEV4YW1wbGVzOlxuICpcbiAqICAgcmVxdWVzdC5nZXQoJy9zaG9lcycpXG4gKiAgICAgLnF1ZXJ5KCdzaXplPTEwJylcbiAqICAgICAucXVlcnkoeyBjb2xvcjogJ2JsdWUnIH0pXG4gKlxuICogQHBhcmFtIHtPYmplY3R8U3RyaW5nfSB2YWxcbiAqIEByZXR1cm4ge1JlcXVlc3R9IGZvciBjaGFpbmluZ1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0LnByb3RvdHlwZS5xdWVyeSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICBpZiAodHlwZW9mIHZhbHVlICE9PSAnc3RyaW5nJykgdmFsdWUgPSBzZXJpYWxpemUodmFsdWUpO1xuICBpZiAodmFsdWUpIHRoaXMuX3F1ZXJ5LnB1c2godmFsdWUpO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUXVldWUgdGhlIGdpdmVuIGBmaWxlYCBhcyBhbiBhdHRhY2htZW50IHRvIHRoZSBzcGVjaWZpZWQgYGZpZWxkYCxcbiAqIHdpdGggb3B0aW9uYWwgYG9wdGlvbnNgIChvciBmaWxlbmFtZSkuXG4gKlxuICogYGBgIGpzXG4gKiByZXF1ZXN0LnBvc3QoJy91cGxvYWQnKVxuICogICAuYXR0YWNoKCdjb250ZW50JywgbmV3IEJsb2IoWyc8YSBpZD1cImFcIj48YiBpZD1cImJcIj5oZXkhPC9iPjwvYT4nXSwgeyB0eXBlOiBcInRleHQvaHRtbFwifSkpXG4gKiAgIC5lbmQoY2FsbGJhY2spO1xuICogYGBgXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGZpZWxkXG4gKiBAcGFyYW0ge0Jsb2J8RmlsZX0gZmlsZVxuICogQHBhcmFtIHtTdHJpbmd8T2JqZWN0fSBvcHRpb25zXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdC5wcm90b3R5cGUuYXR0YWNoID0gZnVuY3Rpb24gKGZpZWxkLCBmaWxlLCBvcHRpb25zKSB7XG4gIGlmIChmaWxlKSB7XG4gICAgaWYgKHRoaXMuX2RhdGEpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcInN1cGVyYWdlbnQgY2FuJ3QgbWl4IC5zZW5kKCkgYW5kIC5hdHRhY2goKVwiKTtcbiAgICB9XG5cbiAgICB0aGlzLl9nZXRGb3JtRGF0YSgpLmFwcGVuZChmaWVsZCwgZmlsZSwgb3B0aW9ucyB8fCBmaWxlLm5hbWUpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5SZXF1ZXN0LnByb3RvdHlwZS5fZ2V0Rm9ybURhdGEgPSBmdW5jdGlvbiAoKSB7XG4gIGlmICghdGhpcy5fZm9ybURhdGEpIHtcbiAgICB0aGlzLl9mb3JtRGF0YSA9IG5ldyByb290LkZvcm1EYXRhKCk7XG4gIH1cblxuICByZXR1cm4gdGhpcy5fZm9ybURhdGE7XG59O1xuXG4vKipcbiAqIEludm9rZSB0aGUgY2FsbGJhY2sgd2l0aCBgZXJyYCBhbmQgYHJlc2BcbiAqIGFuZCBoYW5kbGUgYXJpdHkgY2hlY2suXG4gKlxuICogQHBhcmFtIHtFcnJvcn0gZXJyXG4gKiBAcGFyYW0ge1Jlc3BvbnNlfSByZXNcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cblJlcXVlc3QucHJvdG90eXBlLmNhbGxiYWNrID0gZnVuY3Rpb24gKGVycm9yLCByZXMpIHtcbiAgaWYgKHRoaXMuX3Nob3VsZFJldHJ5KGVycm9yLCByZXMpKSB7XG4gICAgcmV0dXJuIHRoaXMuX3JldHJ5KCk7XG4gIH1cblxuICBjb25zdCBmbiA9IHRoaXMuX2NhbGxiYWNrO1xuICB0aGlzLmNsZWFyVGltZW91dCgpO1xuXG4gIGlmIChlcnJvcikge1xuICAgIGlmICh0aGlzLl9tYXhSZXRyaWVzKSBlcnJvci5yZXRyaWVzID0gdGhpcy5fcmV0cmllcyAtIDE7XG4gICAgdGhpcy5lbWl0KCdlcnJvcicsIGVycm9yKTtcbiAgfVxuXG4gIGZuKGVycm9yLCByZXMpO1xufTtcblxuLyoqXG4gKiBJbnZva2UgY2FsbGJhY2sgd2l0aCB4LWRvbWFpbiBlcnJvci5cbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5SZXF1ZXN0LnByb3RvdHlwZS5jcm9zc0RvbWFpbkVycm9yID0gZnVuY3Rpb24gKCkge1xuICBjb25zdCBlcnJvciA9IG5ldyBFcnJvcihcbiAgICAnUmVxdWVzdCBoYXMgYmVlbiB0ZXJtaW5hdGVkXFxuUG9zc2libGUgY2F1c2VzOiB0aGUgbmV0d29yayBpcyBvZmZsaW5lLCBPcmlnaW4gaXMgbm90IGFsbG93ZWQgYnkgQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luLCB0aGUgcGFnZSBpcyBiZWluZyB1bmxvYWRlZCwgZXRjLidcbiAgKTtcbiAgZXJyb3IuY3Jvc3NEb21haW4gPSB0cnVlO1xuXG4gIGVycm9yLnN0YXR1cyA9IHRoaXMuc3RhdHVzO1xuICBlcnJvci5tZXRob2QgPSB0aGlzLm1ldGhvZDtcbiAgZXJyb3IudXJsID0gdGhpcy51cmw7XG5cbiAgdGhpcy5jYWxsYmFjayhlcnJvcik7XG59O1xuXG4vLyBUaGlzIG9ubHkgd2FybnMsIGJlY2F1c2UgdGhlIHJlcXVlc3QgaXMgc3RpbGwgbGlrZWx5IHRvIHdvcmtcblJlcXVlc3QucHJvdG90eXBlLmFnZW50ID0gZnVuY3Rpb24gKCkge1xuICBjb25zb2xlLndhcm4oJ1RoaXMgaXMgbm90IHN1cHBvcnRlZCBpbiBicm93c2VyIHZlcnNpb24gb2Ygc3VwZXJhZ2VudCcpO1xuICByZXR1cm4gdGhpcztcbn07XG5cblJlcXVlc3QucHJvdG90eXBlLmNhID0gUmVxdWVzdC5wcm90b3R5cGUuYWdlbnQ7XG5SZXF1ZXN0LnByb3RvdHlwZS5idWZmZXIgPSBSZXF1ZXN0LnByb3RvdHlwZS5jYTtcblxuLy8gVGhpcyB0aHJvd3MsIGJlY2F1c2UgaXQgY2FuJ3Qgc2VuZC9yZWNlaXZlIGRhdGEgYXMgZXhwZWN0ZWRcblJlcXVlc3QucHJvdG90eXBlLndyaXRlID0gKCkgPT4ge1xuICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgJ1N0cmVhbWluZyBpcyBub3Qgc3VwcG9ydGVkIGluIGJyb3dzZXIgdmVyc2lvbiBvZiBzdXBlcmFnZW50J1xuICApO1xufTtcblxuUmVxdWVzdC5wcm90b3R5cGUucGlwZSA9IFJlcXVlc3QucHJvdG90eXBlLndyaXRlO1xuXG4vKipcbiAqIENoZWNrIGlmIGBvYmpgIGlzIGEgaG9zdCBvYmplY3QsXG4gKiB3ZSBkb24ndCB3YW50IHRvIHNlcmlhbGl6ZSB0aGVzZSA6KVxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmogaG9zdCBvYmplY3RcbiAqIEByZXR1cm4ge0Jvb2xlYW59IGlzIGEgaG9zdCBvYmplY3RcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5SZXF1ZXN0LnByb3RvdHlwZS5faXNIb3N0ID0gZnVuY3Rpb24gKG9iamVjdCkge1xuICAvLyBOYXRpdmUgb2JqZWN0cyBzdHJpbmdpZnkgdG8gW29iamVjdCBGaWxlXSwgW29iamVjdCBCbG9iXSwgW29iamVjdCBGb3JtRGF0YV0sIGV0Yy5cbiAgcmV0dXJuIChcbiAgICBvYmplY3QgJiZcbiAgICB0eXBlb2Ygb2JqZWN0ID09PSAnb2JqZWN0JyAmJlxuICAgICFBcnJheS5pc0FycmF5KG9iamVjdCkgJiZcbiAgICBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqZWN0KSAhPT0gJ1tvYmplY3QgT2JqZWN0XSdcbiAgKTtcbn07XG5cbi8qKlxuICogSW5pdGlhdGUgcmVxdWVzdCwgaW52b2tpbmcgY2FsbGJhY2sgYGZuKHJlcylgXG4gKiB3aXRoIGFuIGluc3RhbmNlb2YgYFJlc3BvbnNlYC5cbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICogQHJldHVybiB7UmVxdWVzdH0gZm9yIGNoYWluaW5nXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlcXVlc3QucHJvdG90eXBlLmVuZCA9IGZ1bmN0aW9uIChmbikge1xuICBpZiAodGhpcy5fZW5kQ2FsbGVkKSB7XG4gICAgY29uc29sZS53YXJuKFxuICAgICAgJ1dhcm5pbmc6IC5lbmQoKSB3YXMgY2FsbGVkIHR3aWNlLiBUaGlzIGlzIG5vdCBzdXBwb3J0ZWQgaW4gc3VwZXJhZ2VudCdcbiAgICApO1xuICB9XG5cbiAgdGhpcy5fZW5kQ2FsbGVkID0gdHJ1ZTtcblxuICAvLyBzdG9yZSBjYWxsYmFja1xuICB0aGlzLl9jYWxsYmFjayA9IGZuIHx8IG5vb3A7XG5cbiAgLy8gcXVlcnlzdHJpbmdcbiAgdGhpcy5fZmluYWxpemVRdWVyeVN0cmluZygpO1xuXG4gIHRoaXMuX2VuZCgpO1xufTtcblxuUmVxdWVzdC5wcm90b3R5cGUuX3NldFVwbG9hZFRpbWVvdXQgPSBmdW5jdGlvbiAoKSB7XG4gIGNvbnN0IHNlbGYgPSB0aGlzO1xuXG4gIC8vIHVwbG9hZCB0aW1lb3V0IGl0J3Mgd29rcnMgb25seSBpZiBkZWFkbGluZSB0aW1lb3V0IGlzIG9mZlxuICBpZiAodGhpcy5fdXBsb2FkVGltZW91dCAmJiAhdGhpcy5fdXBsb2FkVGltZW91dFRpbWVyKSB7XG4gICAgdGhpcy5fdXBsb2FkVGltZW91dFRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICBzZWxmLl90aW1lb3V0RXJyb3IoXG4gICAgICAgICdVcGxvYWQgdGltZW91dCBvZiAnLFxuICAgICAgICBzZWxmLl91cGxvYWRUaW1lb3V0LFxuICAgICAgICAnRVRJTUVET1VUJ1xuICAgICAgKTtcbiAgICB9LCB0aGlzLl91cGxvYWRUaW1lb3V0KTtcbiAgfVxufTtcblxuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGNvbXBsZXhpdHlcblJlcXVlc3QucHJvdG90eXBlLl9lbmQgPSBmdW5jdGlvbiAoKSB7XG4gIGlmICh0aGlzLl9hYm9ydGVkKVxuICAgIHJldHVybiB0aGlzLmNhbGxiYWNrKFxuICAgICAgbmV3IEVycm9yKCdUaGUgcmVxdWVzdCBoYXMgYmVlbiBhYm9ydGVkIGV2ZW4gYmVmb3JlIC5lbmQoKSB3YXMgY2FsbGVkJylcbiAgICApO1xuXG4gIGNvbnN0IHNlbGYgPSB0aGlzO1xuICB0aGlzLnhociA9IHJlcXVlc3QuZ2V0WEhSKCk7XG4gIGNvbnN0IHsgeGhyIH0gPSB0aGlzO1xuICBsZXQgZGF0YSA9IHRoaXMuX2Zvcm1EYXRhIHx8IHRoaXMuX2RhdGE7XG5cbiAgdGhpcy5fc2V0VGltZW91dHMoKTtcblxuICAvLyBzdGF0ZSBjaGFuZ2VcbiAgeGhyLmFkZEV2ZW50TGlzdGVuZXIoJ3JlYWR5c3RhdGVjaGFuZ2UnLCAoKSA9PiB7XG4gICAgY29uc3QgeyByZWFkeVN0YXRlIH0gPSB4aHI7XG4gICAgaWYgKHJlYWR5U3RhdGUgPj0gMiAmJiBzZWxmLl9yZXNwb25zZVRpbWVvdXRUaW1lcikge1xuICAgICAgY2xlYXJUaW1lb3V0KHNlbGYuX3Jlc3BvbnNlVGltZW91dFRpbWVyKTtcbiAgICB9XG5cbiAgICBpZiAocmVhZHlTdGF0ZSAhPT0gNCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIEluIElFOSwgcmVhZHMgdG8gYW55IHByb3BlcnR5IChlLmcuIHN0YXR1cykgb2ZmIG9mIGFuIGFib3J0ZWQgWEhSIHdpbGxcbiAgICAvLyByZXN1bHQgaW4gdGhlIGVycm9yIFwiQ291bGQgbm90IGNvbXBsZXRlIHRoZSBvcGVyYXRpb24gZHVlIHRvIGVycm9yIGMwMGMwMjNmXCJcbiAgICBsZXQgc3RhdHVzO1xuICAgIHRyeSB7XG4gICAgICBzdGF0dXMgPSB4aHIuc3RhdHVzO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgc3RhdHVzID0gMDtcbiAgICB9XG5cbiAgICBpZiAoIXN0YXR1cykge1xuICAgICAgaWYgKHNlbGYudGltZWRvdXQgfHwgc2VsZi5fYWJvcnRlZCkgcmV0dXJuO1xuICAgICAgcmV0dXJuIHNlbGYuY3Jvc3NEb21haW5FcnJvcigpO1xuICAgIH1cblxuICAgIHNlbGYuZW1pdCgnZW5kJyk7XG4gIH0pO1xuXG4gIC8vIHByb2dyZXNzXG4gIGNvbnN0IGhhbmRsZVByb2dyZXNzID0gKGRpcmVjdGlvbiwgZSkgPT4ge1xuICAgIGlmIChlLnRvdGFsID4gMCkge1xuICAgICAgZS5wZXJjZW50ID0gKGUubG9hZGVkIC8gZS50b3RhbCkgKiAxMDA7XG5cbiAgICAgIGlmIChlLnBlcmNlbnQgPT09IDEwMCkge1xuICAgICAgICBjbGVhclRpbWVvdXQoc2VsZi5fdXBsb2FkVGltZW91dFRpbWVyKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBlLmRpcmVjdGlvbiA9IGRpcmVjdGlvbjtcbiAgICBzZWxmLmVtaXQoJ3Byb2dyZXNzJywgZSk7XG4gIH07XG5cbiAgaWYgKHRoaXMuaGFzTGlzdGVuZXJzKCdwcm9ncmVzcycpKSB7XG4gICAgdHJ5IHtcbiAgICAgIHhoci5hZGRFdmVudExpc3RlbmVyKCdwcm9ncmVzcycsIGhhbmRsZVByb2dyZXNzLmJpbmQobnVsbCwgJ2Rvd25sb2FkJykpO1xuICAgICAgaWYgKHhoci51cGxvYWQpIHtcbiAgICAgICAgeGhyLnVwbG9hZC5hZGRFdmVudExpc3RlbmVyKFxuICAgICAgICAgICdwcm9ncmVzcycsXG4gICAgICAgICAgaGFuZGxlUHJvZ3Jlc3MuYmluZChudWxsLCAndXBsb2FkJylcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIC8vIEFjY2Vzc2luZyB4aHIudXBsb2FkIGZhaWxzIGluIElFIGZyb20gYSB3ZWIgd29ya2VyLCBzbyBqdXN0IHByZXRlbmQgaXQgZG9lc24ndCBleGlzdC5cbiAgICAgIC8vIFJlcG9ydGVkIGhlcmU6XG4gICAgICAvLyBodHRwczovL2Nvbm5lY3QubWljcm9zb2Z0LmNvbS9JRS9mZWVkYmFjay9kZXRhaWxzLzgzNzI0NS94bWxodHRwcmVxdWVzdC11cGxvYWQtdGhyb3dzLWludmFsaWQtYXJndW1lbnQtd2hlbi11c2VkLWZyb20td2ViLXdvcmtlci1jb250ZXh0XG4gICAgfVxuICB9XG5cbiAgaWYgKHhoci51cGxvYWQpIHtcbiAgICB0aGlzLl9zZXRVcGxvYWRUaW1lb3V0KCk7XG4gIH1cblxuICAvLyBpbml0aWF0ZSByZXF1ZXN0XG4gIHRyeSB7XG4gICAgaWYgKHRoaXMudXNlcm5hbWUgJiYgdGhpcy5wYXNzd29yZCkge1xuICAgICAgeGhyLm9wZW4odGhpcy5tZXRob2QsIHRoaXMudXJsLCB0cnVlLCB0aGlzLnVzZXJuYW1lLCB0aGlzLnBhc3N3b3JkKTtcbiAgICB9IGVsc2Uge1xuICAgICAgeGhyLm9wZW4odGhpcy5tZXRob2QsIHRoaXMudXJsLCB0cnVlKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIC8vIHNlZSAjMTE0OVxuICAgIHJldHVybiB0aGlzLmNhbGxiYWNrKGVycik7XG4gIH1cblxuICAvLyBDT1JTXG4gIGlmICh0aGlzLl93aXRoQ3JlZGVudGlhbHMpIHhoci53aXRoQ3JlZGVudGlhbHMgPSB0cnVlO1xuXG4gIC8vIGJvZHlcbiAgaWYgKFxuICAgICF0aGlzLl9mb3JtRGF0YSAmJlxuICAgIHRoaXMubWV0aG9kICE9PSAnR0VUJyAmJlxuICAgIHRoaXMubWV0aG9kICE9PSAnSEVBRCcgJiZcbiAgICB0eXBlb2YgZGF0YSAhPT0gJ3N0cmluZycgJiZcbiAgICAhdGhpcy5faXNIb3N0KGRhdGEpXG4gICkge1xuICAgIC8vIHNlcmlhbGl6ZSBzdHVmZlxuICAgIGNvbnN0IGNvbnRlbnRUeXBlID0gdGhpcy5faGVhZGVyWydjb250ZW50LXR5cGUnXTtcbiAgICBsZXQgc2VyaWFsaXplID1cbiAgICAgIHRoaXMuX3NlcmlhbGl6ZXIgfHxcbiAgICAgIHJlcXVlc3Quc2VyaWFsaXplW2NvbnRlbnRUeXBlID8gY29udGVudFR5cGUuc3BsaXQoJzsnKVswXSA6ICcnXTtcbiAgICBpZiAoIXNlcmlhbGl6ZSAmJiBpc0pTT04oY29udGVudFR5cGUpKSB7XG4gICAgICBzZXJpYWxpemUgPSByZXF1ZXN0LnNlcmlhbGl6ZVsnYXBwbGljYXRpb24vanNvbiddO1xuICAgIH1cblxuICAgIGlmIChzZXJpYWxpemUpIGRhdGEgPSBzZXJpYWxpemUoZGF0YSk7XG4gIH1cblxuICAvLyBzZXQgaGVhZGVyIGZpZWxkc1xuICBmb3IgKGNvbnN0IGZpZWxkIGluIHRoaXMuaGVhZGVyKSB7XG4gICAgaWYgKHRoaXMuaGVhZGVyW2ZpZWxkXSA9PT0gbnVsbCkgY29udGludWU7XG5cbiAgICBpZiAoaGFzT3duKHRoaXMuaGVhZGVyLCBmaWVsZCkpXG4gICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcihmaWVsZCwgdGhpcy5oZWFkZXJbZmllbGRdKTtcbiAgfVxuXG4gIGlmICh0aGlzLl9yZXNwb25zZVR5cGUpIHtcbiAgICB4aHIucmVzcG9uc2VUeXBlID0gdGhpcy5fcmVzcG9uc2VUeXBlO1xuICB9XG5cbiAgLy8gc2VuZCBzdHVmZlxuICB0aGlzLmVtaXQoJ3JlcXVlc3QnLCB0aGlzKTtcblxuICAvLyBJRTExIHhoci5zZW5kKHVuZGVmaW5lZCkgc2VuZHMgJ3VuZGVmaW5lZCcgc3RyaW5nIGFzIFBPU1QgcGF5bG9hZCAoaW5zdGVhZCBvZiBub3RoaW5nKVxuICAvLyBXZSBuZWVkIG51bGwgaGVyZSBpZiBkYXRhIGlzIHVuZGVmaW5lZFxuICB4aHIuc2VuZCh0eXBlb2YgZGF0YSA9PT0gJ3VuZGVmaW5lZCcgPyBudWxsIDogZGF0YSk7XG59O1xuXG4vLyBjcmVhdGUgYSBQcm94eSB0aGF0IGNhbiBpbnN0YW50aWF0ZSBhIG5ldyBBZ2VudCB3aXRob3V0IHVzaW5nIGBuZXdgIGtleXdvcmRcbi8vIChmb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eSBhbmQgY2hhaW5pbmcpXG5jb25zdCBwcm94eUFnZW50ID0gbmV3IFByb3h5KEFnZW50LCB7XG4gIGFwcGx5KHRhcmdldCwgdGhpc0FyZywgYXJndW1lbnRzTGlzdCkge1xuICAgIHJldHVybiBuZXcgdGFyZ2V0KC4uLmFyZ3VtZW50c0xpc3QpO1xuICB9XG59KTtcbnJlcXVlc3QuYWdlbnQgPSBwcm94eUFnZW50O1xuXG5mb3IgKGNvbnN0IG1ldGhvZCBvZiBbJ0dFVCcsICdQT1NUJywgJ09QVElPTlMnLCAnUEFUQ0gnLCAnUFVUJywgJ0RFTEVURSddKSB7XG4gIEFnZW50LnByb3RvdHlwZVttZXRob2QudG9Mb3dlckNhc2UoKV0gPSBmdW5jdGlvbiAodXJsLCBmbikge1xuICAgIGNvbnN0IHJlcXVlc3RfID0gbmV3IHJlcXVlc3QuUmVxdWVzdChtZXRob2QsIHVybCk7XG4gICAgdGhpcy5fc2V0RGVmYXVsdHMocmVxdWVzdF8pO1xuICAgIGlmIChmbikge1xuICAgICAgcmVxdWVzdF8uZW5kKGZuKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVxdWVzdF87XG4gIH07XG59XG5cbkFnZW50LnByb3RvdHlwZS5kZWwgPSBBZ2VudC5wcm90b3R5cGUuZGVsZXRlO1xuXG4vKipcbiAqIEdFVCBgdXJsYCB3aXRoIG9wdGlvbmFsIGNhbGxiYWNrIGBmbihyZXMpYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gdXJsXG4gKiBAcGFyYW0ge01peGVkfEZ1bmN0aW9ufSBbZGF0YV0gb3IgZm5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtmbl1cbiAqIEByZXR1cm4ge1JlcXVlc3R9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbnJlcXVlc3QuZ2V0ID0gKHVybCwgZGF0YSwgZm4pID0+IHtcbiAgY29uc3QgcmVxdWVzdF8gPSByZXF1ZXN0KCdHRVQnLCB1cmwpO1xuICBpZiAodHlwZW9mIGRhdGEgPT09ICdmdW5jdGlvbicpIHtcbiAgICBmbiA9IGRhdGE7XG4gICAgZGF0YSA9IG51bGw7XG4gIH1cblxuICBpZiAoZGF0YSkgcmVxdWVzdF8ucXVlcnkoZGF0YSk7XG4gIGlmIChmbikgcmVxdWVzdF8uZW5kKGZuKTtcbiAgcmV0dXJuIHJlcXVlc3RfO1xufTtcblxuLyoqXG4gKiBIRUFEIGB1cmxgIHdpdGggb3B0aW9uYWwgY2FsbGJhY2sgYGZuKHJlcylgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB1cmxcbiAqIEBwYXJhbSB7TWl4ZWR8RnVuY3Rpb259IFtkYXRhXSBvciBmblxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2ZuXVxuICogQHJldHVybiB7UmVxdWVzdH1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxucmVxdWVzdC5oZWFkID0gKHVybCwgZGF0YSwgZm4pID0+IHtcbiAgY29uc3QgcmVxdWVzdF8gPSByZXF1ZXN0KCdIRUFEJywgdXJsKTtcbiAgaWYgKHR5cGVvZiBkYXRhID09PSAnZnVuY3Rpb24nKSB7XG4gICAgZm4gPSBkYXRhO1xuICAgIGRhdGEgPSBudWxsO1xuICB9XG5cbiAgaWYgKGRhdGEpIHJlcXVlc3RfLnF1ZXJ5KGRhdGEpO1xuICBpZiAoZm4pIHJlcXVlc3RfLmVuZChmbik7XG4gIHJldHVybiByZXF1ZXN0Xztcbn07XG5cbi8qKlxuICogT1BUSU9OUyBxdWVyeSB0byBgdXJsYCB3aXRoIG9wdGlvbmFsIGNhbGxiYWNrIGBmbihyZXMpYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gdXJsXG4gKiBAcGFyYW0ge01peGVkfEZ1bmN0aW9ufSBbZGF0YV0gb3IgZm5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtmbl1cbiAqIEByZXR1cm4ge1JlcXVlc3R9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbnJlcXVlc3Qub3B0aW9ucyA9ICh1cmwsIGRhdGEsIGZuKSA9PiB7XG4gIGNvbnN0IHJlcXVlc3RfID0gcmVxdWVzdCgnT1BUSU9OUycsIHVybCk7XG4gIGlmICh0eXBlb2YgZGF0YSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIGZuID0gZGF0YTtcbiAgICBkYXRhID0gbnVsbDtcbiAgfVxuXG4gIGlmIChkYXRhKSByZXF1ZXN0Xy5zZW5kKGRhdGEpO1xuICBpZiAoZm4pIHJlcXVlc3RfLmVuZChmbik7XG4gIHJldHVybiByZXF1ZXN0Xztcbn07XG5cbi8qKlxuICogREVMRVRFIGB1cmxgIHdpdGggb3B0aW9uYWwgYGRhdGFgIGFuZCBjYWxsYmFjayBgZm4ocmVzKWAuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHVybFxuICogQHBhcmFtIHtNaXhlZH0gW2RhdGFdXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbZm5dXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5mdW5jdGlvbiBkZWwodXJsLCBkYXRhLCBmbikge1xuICBjb25zdCByZXF1ZXN0XyA9IHJlcXVlc3QoJ0RFTEVURScsIHVybCk7XG4gIGlmICh0eXBlb2YgZGF0YSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIGZuID0gZGF0YTtcbiAgICBkYXRhID0gbnVsbDtcbiAgfVxuXG4gIGlmIChkYXRhKSByZXF1ZXN0Xy5zZW5kKGRhdGEpO1xuICBpZiAoZm4pIHJlcXVlc3RfLmVuZChmbik7XG4gIHJldHVybiByZXF1ZXN0Xztcbn1cblxucmVxdWVzdC5kZWwgPSBkZWw7XG5yZXF1ZXN0LmRlbGV0ZSA9IGRlbDtcblxuLyoqXG4gKiBQQVRDSCBgdXJsYCB3aXRoIG9wdGlvbmFsIGBkYXRhYCBhbmQgY2FsbGJhY2sgYGZuKHJlcylgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB1cmxcbiAqIEBwYXJhbSB7TWl4ZWR9IFtkYXRhXVxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2ZuXVxuICogQHJldHVybiB7UmVxdWVzdH1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxucmVxdWVzdC5wYXRjaCA9ICh1cmwsIGRhdGEsIGZuKSA9PiB7XG4gIGNvbnN0IHJlcXVlc3RfID0gcmVxdWVzdCgnUEFUQ0gnLCB1cmwpO1xuICBpZiAodHlwZW9mIGRhdGEgPT09ICdmdW5jdGlvbicpIHtcbiAgICBmbiA9IGRhdGE7XG4gICAgZGF0YSA9IG51bGw7XG4gIH1cblxuICBpZiAoZGF0YSkgcmVxdWVzdF8uc2VuZChkYXRhKTtcbiAgaWYgKGZuKSByZXF1ZXN0Xy5lbmQoZm4pO1xuICByZXR1cm4gcmVxdWVzdF87XG59O1xuXG4vKipcbiAqIFBPU1QgYHVybGAgd2l0aCBvcHRpb25hbCBgZGF0YWAgYW5kIGNhbGxiYWNrIGBmbihyZXMpYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gdXJsXG4gKiBAcGFyYW0ge01peGVkfSBbZGF0YV1cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtmbl1cbiAqIEByZXR1cm4ge1JlcXVlc3R9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbnJlcXVlc3QucG9zdCA9ICh1cmwsIGRhdGEsIGZuKSA9PiB7XG4gIGNvbnN0IHJlcXVlc3RfID0gcmVxdWVzdCgnUE9TVCcsIHVybCk7XG4gIGlmICh0eXBlb2YgZGF0YSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIGZuID0gZGF0YTtcbiAgICBkYXRhID0gbnVsbDtcbiAgfVxuXG4gIGlmIChkYXRhKSByZXF1ZXN0Xy5zZW5kKGRhdGEpO1xuICBpZiAoZm4pIHJlcXVlc3RfLmVuZChmbik7XG4gIHJldHVybiByZXF1ZXN0Xztcbn07XG5cbi8qKlxuICogUFVUIGB1cmxgIHdpdGggb3B0aW9uYWwgYGRhdGFgIGFuZCBjYWxsYmFjayBgZm4ocmVzKWAuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHVybFxuICogQHBhcmFtIHtNaXhlZHxGdW5jdGlvbn0gW2RhdGFdIG9yIGZuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbZm5dXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5yZXF1ZXN0LnB1dCA9ICh1cmwsIGRhdGEsIGZuKSA9PiB7XG4gIGNvbnN0IHJlcXVlc3RfID0gcmVxdWVzdCgnUFVUJywgdXJsKTtcbiAgaWYgKHR5cGVvZiBkYXRhID09PSAnZnVuY3Rpb24nKSB7XG4gICAgZm4gPSBkYXRhO1xuICAgIGRhdGEgPSBudWxsO1xuICB9XG5cbiAgaWYgKGRhdGEpIHJlcXVlc3RfLnNlbmQoZGF0YSk7XG4gIGlmIChmbikgcmVxdWVzdF8uZW5kKGZuKTtcbiAgcmV0dXJuIHJlcXVlc3RfO1xufTtcbiJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7O0FBRUEsSUFBSUEsSUFBSTtBQUNSLElBQUksT0FBT0MsTUFBTSxLQUFLLFdBQVcsRUFBRTtFQUNqQztFQUNBRCxJQUFJLEdBQUdDLE1BQU07QUFDZixDQUFDLE1BQU0sSUFBSSxPQUFPQyxJQUFJLEtBQUssV0FBVyxFQUFFO0VBQ3RDO0VBQ0FDLE9BQU8sQ0FBQ0MsSUFBSSxDQUNWLHFFQUNGLENBQUM7RUFDREosSUFBSSxTQUFPO0FB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