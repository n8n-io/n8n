"use strict";

/**
 * Module of mixed-in functions shared between node and client code
 */
const {
  isObject,
  hasOwn
} = require('./utils');

/**
 * Expose `RequestBase`.
 */

module.exports = RequestBase;

/**
 * Initialize a new `RequestBase`.
 *
 * @api public
 */

function RequestBase() {}

/**
 * Clear previous timeout.
 *
 * @return {Request} for chaining
 * @api public
 */

RequestBase.prototype.clearTimeout = function () {
  clearTimeout(this._timer);
  clearTimeout(this._responseTimeoutTimer);
  clearTimeout(this._uploadTimeoutTimer);
  delete this._timer;
  delete this._responseTimeoutTimer;
  delete this._uploadTimeoutTimer;
  return this;
};

/**
 * Override default response body parser
 *
 * This function will be called to convert incoming data into request.body
 *
 * @param {Function}
 * @api public
 */

RequestBase.prototype.parse = function (fn) {
  this._parser = fn;
  return this;
};

/**
 * Set format of binary response body.
 * In browser valid formats are 'blob' and 'arraybuffer',
 * which return Blob and ArrayBuffer, respectively.
 *
 * In Node all values result in Buffer.
 *
 * Examples:
 *
 *      req.get('/')
 *        .responseType('blob')
 *        .end(callback);
 *
 * @param {String} val
 * @return {Request} for chaining
 * @api public
 */

RequestBase.prototype.responseType = function (value) {
  this._responseType = value;
  return this;
};

/**
 * Override default request body serializer
 *
 * This function will be called to convert data set via .send or .attach into payload to send
 *
 * @param {Function}
 * @api public
 */

RequestBase.prototype.serialize = function (fn) {
  this._serializer = fn;
  return this;
};

/**
 * Set timeouts.
 *
 * - response timeout is time between sending request and receiving the first byte of the response. Includes DNS and connection time.
 * - deadline is the time from start of the request to receiving response body in full. If the deadline is too short large files may not load at all on slow connections.
 * - upload is the time  since last bit of data was sent or received. This timeout works only if deadline timeout is off
 *
 * Value of 0 or false means no timeout.
 *
 * @param {Number|Object} ms or {response, deadline}
 * @return {Request} for chaining
 * @api public
 */

RequestBase.prototype.timeout = function (options) {
  if (!options || typeof options !== 'object') {
    this._timeout = options;
    this._responseTimeout = 0;
    this._uploadTimeout = 0;
    return this;
  }
  for (const option in options) {
    if (hasOwn(options, option)) {
      switch (option) {
        case 'deadline':
          this._timeout = options.deadline;
          break;
        case 'response':
          this._responseTimeout = options.response;
          break;
        case 'upload':
          this._uploadTimeout = options.upload;
          break;
        default:
          console.warn('Unknown timeout option', option);
      }
    }
  }
  return this;
};

/**
 * Set number of retry attempts on error.
 *
 * Failed requests will be retried 'count' times if timeout or err.code >= 500.
 *
 * @param {Number} count
 * @param {Function} [fn]
 * @return {Request} for chaining
 * @api public
 */

RequestBase.prototype.retry = function (count, fn) {
  // Default to 1 if no count passed or true
  if (arguments.length === 0 || count === true) count = 1;
  if (count <= 0) count = 0;
  this._maxRetries = count;
  this._retries = 0;
  this._retryCallback = fn;
  return this;
};

//
// NOTE: we do not include ESOCKETTIMEDOUT because that is from `request` package
//       <https://github.com/sindresorhus/got/pull/537>
//
// NOTE: we do not include EADDRINFO because it was removed from libuv in 2014
//       <https://github.com/libuv/libuv/commit/02e1ebd40b807be5af46343ea873331b2ee4e9c1>
//       <https://github.com/request/request/search?q=ESOCKETTIMEDOUT&unscoped_q=ESOCKETTIMEDOUT>
//
//
// TODO: expose these as configurable defaults
//
const ERROR_CODES = new Set(['ETIMEDOUT', 'ECONNRESET', 'EADDRINUSE', 'ECONNREFUSED', 'EPIPE', 'ENOTFOUND', 'ENETUNREACH', 'EAI_AGAIN']);
const STATUS_CODES = new Set([408, 413, 429, 500, 502, 503, 504, 521, 522, 524]);

// TODO: we would need to make this easily configurable before adding it in (e.g. some might want to add POST)
// const METHODS = new Set(['GET', 'PUT', 'HEAD', 'DELETE', 'OPTIONS', 'TRACE']);

/**
 * Determine if a request should be retried.
 * (Inspired by https://github.com/sindresorhus/got#retry)
 *
 * @param {Error} err an error
 * @param {Response} [res] response
 * @returns {Boolean} if segment should be retried
 */
RequestBase.prototype._shouldRetry = function (error, res) {
  if (!this._maxRetries || this._retries++ >= this._maxRetries) {
    return false;
  }
  if (this._retryCallback) {
    try {
      const override = this._retryCallback(error, res);
      if (override === true) return true;
      if (override === false) return false;
      // undefined falls back to defaults
    } catch (err) {
      console.error(err);
    }
  }

  // TODO: we would need to make this easily configurable before adding it in (e.g. some might want to add POST)
  /*
  if (
    this.req &&
    this.req.method &&
    !METHODS.has(this.req.method.toUpperCase())
  )
    return false;
  */
  if (res && res.status && STATUS_CODES.has(res.status)) return true;
  if (error) {
    if (error.code && ERROR_CODES.has(error.code)) return true;
    // Superagent timeout
    if (error.timeout && error.code === 'ECONNABORTED') return true;
    if (error.crossDomain) return true;
  }
  return false;
};

/**
 * Retry request
 *
 * @return {Request} for chaining
 * @api private
 */

RequestBase.prototype._retry = function () {
  this.clearTimeout();

  // node
  if (this.req) {
    this.req = null;
    this.req = this.request();
  }
  this._aborted = false;
  this.timedout = false;
  this.timedoutError = null;
  return this._end();
};

/**
 * Promise support
 *
 * @param {Function} resolve
 * @param {Function} [reject]
 * @return {Request}
 */

RequestBase.prototype.then = function (resolve, reject) {
  if (!this._fullfilledPromise) {
    const self = this;
    if (this._endCalled) {
      console.warn('Warning: superagent request was sent twice, because both .end() and .then() were called. Never call .end() if you use promises');
    }
    this._fullfilledPromise = new Promise((resolve, reject) => {
      self.on('abort', () => {
        if (this._maxRetries && this._maxRetries > this._retries) {
          return;
        }
        if (this.timedout && this.timedoutError) {
          reject(this.timedoutError);
          return;
        }
        const error = new Error('Aborted');
        error.code = 'ABORTED';
        error.status = this.status;
        error.method = this.method;
        error.url = this.url;
        reject(error);
      });
      self.end((error, res) => {
        if (error) reject(error);else resolve(res);
      });
    });
  }
  return this._fullfilledPromise.then(resolve, reject);
};
RequestBase.prototype.catch = function (callback) {
  return this.then(undefined, callback);
};

/**
 * Allow for extension
 */

RequestBase.prototype.use = function (fn) {
  fn(this);
  return this;
};
RequestBase.prototype.ok = function (callback) {
  if (typeof callback !== 'function') throw new Error('Callback required');
  this._okCallback = callback;
  return this;
};
RequestBase.prototype._isResponseOK = function (res) {
  if (!res) {
    return false;
  }
  if (this._okCallback) {
    return this._okCallback(res);
  }
  return res.status >= 200 && res.status < 300;
};

/**
 * Get request header `field`.
 * Case-insensitive.
 *
 * @param {String} field
 * @return {String}
 * @api public
 */

RequestBase.prototype.get = function (field) {
  return this._header[field.toLowerCase()];
};

/**
 * Get case-insensitive header `field` value.
 * This is a deprecated internal API. Use `.get(field)` instead.
 *
 * (getHeader is no longer used internally by the superagent code base)
 *
 * @param {String} field
 * @return {String}
 * @api private
 * @deprecated
 */

RequestBase.prototype.getHeader = RequestBase.prototype.get;

/**
 * Set header `field` to `val`, or multiple fields with one object.
 * Case-insensitive.
 *
 * Examples:
 *
 *      req.get('/')
 *        .set('Accept', 'application/json')
 *        .set('X-API-Key', 'foobar')
 *        .end(callback);
 *
 *      req.get('/')
 *        .set({ Accept: 'application/json', 'X-API-Key': 'foobar' })
 *        .end(callback);
 *
 * @param {String|Object} field
 * @param {String} val
 * @return {Request} for chaining
 * @api public
 */

RequestBase.prototype.set = function (field, value) {
  if (isObject(field)) {
    for (const key in field) {
      if (hasOwn(field, key)) this.set(key, field[key]);
    }
    return this;
  }
  this._header[field.toLowerCase()] = value;
  this.header[field] = value;
  return this;
};

/**
 * Remove header `field`.
 * Case-insensitive.
 *
 * Example:
 *
 *      req.get('/')
 *        .unset('User-Agent')
 *        .end(callback);
 *
 * @param {String} field field name
 */
RequestBase.prototype.unset = function (field) {
  delete this._header[field.toLowerCase()];
  delete this.header[field];
  return this;
};

/**
 * Write the field `name` and `val`, or multiple fields with one object
 * for "multipart/form-data" request bodies.
 *
 * ``` js
 * request.post('/upload')
 *   .field('foo', 'bar')
 *   .end(callback);
 *
 * request.post('/upload')
 *   .field({ foo: 'bar', baz: 'qux' })
 *   .end(callback);
 * ```
 *
 * @param {String|Object} name name of field
 * @param {String|Blob|File|Buffer|fs.ReadStream} val value of field
 * @param {String} options extra options, e.g. 'blob'
 * @return {Request} for chaining
 * @api public
 */
RequestBase.prototype.field = function (name, value, options) {
  // name should be either a string or an object.
  if (name === null || undefined === name) {
    throw new Error('.field(name, val) name can not be empty');
  }
  if (this._data) {
    throw new Error(".field() can't be used if .send() is used. Please use only .send() or only .field() & .attach()");
  }
  if (isObject(name)) {
    for (const key in name) {
      if (hasOwn(name, key)) this.field(key, name[key]);
    }
    return this;
  }
  if (Array.isArray(value)) {
    for (const i in value) {
      if (hasOwn(value, i)) this.field(name, value[i]);
    }
    return this;
  }

  // val should be defined now
  if (value === null || undefined === value) {
    throw new Error('.field(name, val) val can not be empty');
  }
  if (typeof value === 'boolean') {
    value = String(value);
  }

  // fix https://github.com/ladjs/superagent/issues/1680
  if (options) this._getFormData().append(name, value, options);else this._getFormData().append(name, value);
  return this;
};

/**
 * Abort the request, and clear potential timeout.
 *
 * @return {Request} request
 * @api public
 */
RequestBase.prototype.abort = function () {
  if (this._aborted) {
    return this;
  }
  this._aborted = true;
  if (this.xhr) this.xhr.abort(); // browser
  if (this.req) {
    this.req.abort(); // node
  }
  this.clearTimeout();
  this.emit('abort');
  return this;
};
RequestBase.prototype._auth = function (user, pass, options, base64Encoder) {
  switch (options.type) {
    case 'basic':
      this.set('Authorization', `Basic ${base64Encoder(`${user}:${pass}`)}`);
      break;
    case 'auto':
      this.username = user;
      this.password = pass;
      break;
    case 'bearer':
      // usage would be .auth(accessToken, { type: 'bearer' })
      this.set('Authorization', `Bearer ${user}`);
      break;
    default:
      break;
  }
  return this;
};

/**
 * Enable transmission of cookies with x-domain requests.
 *
 * Note that for this to work the origin must not be
 * using "Access-Control-Allow-Origin" with a wildcard,
 * and also must set "Access-Control-Allow-Credentials"
 * to "true".
 * @param {Boolean} [on=true] - Set 'withCredentials' state
 * @return {Request} for chaining
 * @api public
 */

RequestBase.prototype.withCredentials = function (on) {
  // This is browser-only functionality. Node side is no-op.
  if (on === undefined) on = true;
  this._withCredentials = on;
  return this;
};

/**
 * Set the max redirects to `n`. Does nothing in browser XHR implementation.
 *
 * @param {Number} n
 * @return {Request} for chaining
 * @api public
 */

RequestBase.prototype.redirects = function (n) {
  this._maxRedirects = n;
  return this;
};

/**
 * Maximum size of buffered response body, in bytes. Counts uncompressed size.
 * Default 200MB.
 *
 * @param {Number} n number of bytes
 * @return {Request} for chaining
 */
RequestBase.prototype.maxResponseSize = function (n) {
  if (typeof n !== 'number') {
    throw new TypeError('Invalid argument');
  }
  this._maxResponseSize = n;
  return this;
};

/**
 * Convert to a plain javascript object (not JSON string) of scalar properties.
 * Note as this method is designed to return a useful non-this value,
 * it cannot be chained.
 *
 * @return {Object} describing method, url, and data of this request
 * @api public
 */

RequestBase.prototype.toJSON = function () {
  return {
    method: this.method,
    url: this.url,
    data: this._data,
    headers: this._header
  };
};

/**
 * Send `data` as the request body, defaulting the `.type()` to "json" when
 * an object is given.
 *
 * Examples:
 *
 *       // manual json
 *       request.post('/user')
 *         .type('json')
 *         .send('{"name":"tj"}')
 *         .end(callback)
 *
 *       // auto json
 *       request.post('/user')
 *         .send({ name: 'tj' })
 *         .end(callback)
 *
 *       // manual x-www-form-urlencoded
 *       request.post('/user')
 *         .type('form')
 *         .send('name=tj')
 *         .end(callback)
 *
 *       // auto x-www-form-urlencoded
 *       request.post('/user')
 *         .type('form')
 *         .send({ name: 'tj' })
 *         .end(callback)
 *
 *       // defaults to x-www-form-urlencoded
 *      request.post('/user')
 *        .send('name=tobi')
 *        .send('species=ferret')
 *        .end(callback)
 *
 * @param {String|Object} data
 * @return {Request} for chaining
 * @api public
 */

// eslint-disable-next-line complexity
RequestBase.prototype.send = function (data) {
  const isObject_ = isObject(data);
  let type = this._header['content-type'];
  if (this._formData) {
    throw new Error(".send() can't be used if .attach() or .field() is used. Please use only .send() or only .field() & .attach()");
  }
  if (isObject_ && !this._data) {
    if (Array.isArray(data)) {
      this._data = [];
    } else if (!this._isHost(data)) {
      this._data = {};
    }
  } else if (data && this._data && this._isHost(this._data)) {
    throw new Error("Can't merge these send calls");
  }

  // merge
  if (isObject_ && isObject(this._data)) {
    for (const key in data) {
      if (typeof data[key] == 'bigint' && !data[key].toJSON) throw new Error('Cannot serialize BigInt value to json');
      if (hasOwn(data, key)) this._data[key] = data[key];
    }
  } else if (typeof data === 'bigint') throw new Error("Cannot send value of type BigInt");else if (typeof data === 'string') {
    // default to x-www-form-urlencoded
    if (!type) this.type('form');
    type = this._header['content-type'];
    if (type) type = type.toLowerCase().trim();
    if (type === 'application/x-www-form-urlencoded') {
      this._data = this._data ? `${this._data}&${data}` : data;
    } else {
      this._data = (this._data || '') + data;
    }
  } else {
    this._data = data;
  }
  if (!isObject_ || this._isHost(data)) {
    return this;
  }

  // default to json
  if (!type) this.type('json');
  return this;
};

/**
 * Sort `querystring` by the sort function
 *
 *
 * Examples:
 *
 *       // default order
 *       request.get('/user')
 *         .query('name=Nick')
 *         .query('search=Manny')
 *         .sortQuery()
 *         .end(callback)
 *
 *       // customized sort function
 *       request.get('/user')
 *         .query('name=Nick')
 *         .query('search=Manny')
 *         .sortQuery(function(a, b){
 *           return a.length - b.length;
 *         })
 *         .end(callback)
 *
 *
 * @param {Function} sort
 * @return {Request} for chaining
 * @api public
 */

RequestBase.prototype.sortQuery = function (sort) {
  // _sort default to true but otherwise can be a function or boolean
  this._sort = typeof sort === 'undefined' ? true : sort;
  return this;
};

/**
 * Compose querystring to append to req.url
 *
 * @api private
 */
RequestBase.prototype._finalizeQueryString = function () {
  const query = this._query.join('&');
  if (query) {
    this.url += (this.url.includes('?') ? '&' : '?') + query;
  }
  this._query.length = 0; // Makes the call idempotent

  if (this._sort) {
    const index = this.url.indexOf('?');
    if (index >= 0) {
      const queryArray = this.url.slice(index + 1).split('&');
      if (typeof this._sort === 'function') {
        queryArray.sort(this._sort);
      } else {
        queryArray.sort();
      }
      this.url = this.url.slice(0, index) + '?' + queryArray.join('&');
    }
  }
};

// For backwards compat only
RequestBase.prototype._appendQueryString = () => {
  console.warn('Unsupported');
};

/**
 * Invoke callback with timeout error.
 *
 * @api private
 */

RequestBase.prototype._timeoutError = function (reason, timeout, errno) {
  if (this._aborted) {
    return;
  }
  const error = new Error(`${reason + timeout}ms exceeded`);
  error.timeout = timeout;
  error.code = 'ECONNABORTED';
  error.errno = errno;
  this.timedout = true;
  this.timedoutError = error;
  this.abort();
  this.callback(error);
};
RequestBase.prototype._setTimeouts = function () {
  const self = this;

  // deadline
  if (this._timeout && !this._timer) {
    this._timer = setTimeout(() => {
      self._timeoutError('Timeout of ', self._timeout, 'ETIME');
    }, this._timeout);
  }

  // response timeout
  if (this._responseTimeout && !this._responseTimeoutTimer) {
    this._responseTimeoutTimer = setTimeout(() => {
      self._timeoutError('Response timeout of ', self._responseTimeout, 'ETIMEDOUT');
    }, this._responseTimeout);
  }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6WyJpc09iamVjdCIsImhhc093biIsInJlcXVpcmUiLCJtb2R1bGUiLCJleHBvcnRzIiwiUmVxdWVzdEJhc2UiLCJwcm90b3R5cGUiLCJjbGVhclRpbWVvdXQiLCJfdGltZXIiLCJfcmVzcG9uc2VUaW1lb3V0VGltZXIiLCJfdXBsb2FkVGltZW91dFRpbWVyIiwicGFyc2UiLCJmbiIsIl9wYXJzZXIiLCJyZXNwb25zZVR5cGUiLCJ2YWx1ZSIsIl9yZXNwb25zZVR5cGUiLCJzZXJpYWxpemUiLCJfc2VyaWFsaXplciIsInRpbWVvdXQiLCJvcHRpb25zIiwiX3RpbWVvdXQiLCJfcmVzcG9uc2VUaW1lb3V0IiwiX3VwbG9hZFRpbWVvdXQiLCJvcHRpb24iLCJkZWFkbGluZSIsInJlc3BvbnNlIiwidXBsb2FkIiwiY29uc29sZSIsIndhcm4iLCJyZXRyeSIsImNvdW50IiwiYXJndW1lbnRzIiwibGVuZ3RoIiwiX21heFJldHJpZXMiLCJfcmV0cmllcyIsIl9yZXRyeUNhbGxiYWNrIiwiRVJST1JfQ09ERVMiLCJTZXQiLCJTVEFUVVNfQ09ERVMiLCJfc2hvdWxkUmV0cnkiLCJlcnJvciIsInJlcyIsIm92ZXJyaWRlIiwiZXJyIiwic3RhdHVzIiwiaGFzIiwiY29kZSIsImNyb3NzRG9tYWluIiwiX3JldHJ5IiwicmVxIiwicmVxdWVzdCIsIl9hYm9ydGVkIiwidGltZWRvdXQiLCJ0aW1lZG91dEVycm9yIiwiX2VuZCIsInRoZW4iLCJyZXNvbHZlIiwicmVqZWN0IiwiX2Z1bGxmaWxsZWRQcm9taXNlIiwic2VsZiIsIl9lbmRDYWxsZWQiLCJQcm9taXNlIiwib24iLCJFcnJvciIsIm1ldGhvZCIsInVybCIsImVuZCIsImNhdGNoIiwiY2FsbGJhY2siLCJ1bmRlZmluZWQiLCJ1c2UiLCJvayIsIl9va0NhbGxiYWNrIiwiX2lzUmVzcG9uc2VPSyIsImdldCIsImZpZWxkIiwiX2hlYWRlciIsInRvTG93ZXJDYXNlIiwiZ2V0SGVhZGVyIiwic2V0Iiwia2V5IiwiaGVhZGVyIiwidW5zZXQiLCJuYW1lIiwiX2RhdGEiLCJBcnJheSIsImlzQXJyYXkiLCJpIiwiU3RyaW5nIiwiX2dldEZvcm1EYXRhIiwiYXBwZW5kIiwiYWJvcnQiLCJ4aHIiLCJlbWl0IiwiX2F1dGgiLCJ1c2VyIiwicGFzcyIsImJhc2U2NEVuY29kZXIiLCJ0eXBlIiwidXNlcm5hbWUiLCJwYXNzd29yZCIsIndpdGhDcmVkZW50aWFscyIsIl93aXRoQ3JlZGVudGlhbHMiLCJyZWRpcmVjdHMiLCJuIiwiX21heFJlZGlyZWN0cyIsIm1heFJlc3BvbnNlU2l6ZSIsIlR5cGVFcnJvciIsIl9tYXhSZXNwb25zZVNpemUiLCJ0b0pTT04iLCJkYXRhIiwiaGVhZGVycyIsInNlbmQiLCJpc09iamVjdF8iLCJfZm9ybURhdGEiLCJfaXNIb3N0IiwidHJpbSIsInNvcnRRdWVyeSIsInNvcnQiLCJfc29ydCIsIl9maW5hbGl6ZVF1ZXJ5U3RyaW5nIiwicXVlcnkiLCJfcXVlcnkiLCJqb2luIiwiaW5jbHVkZXMiLCJpbmRleCIsImluZGV4T2YiLCJxdWVyeUFycmF5Iiwic2xpY2UiLCJzcGxpdCIsIl9hcHBlbmRRdWVyeVN0cmluZyIsIl90aW1lb3V0RXJyb3IiLCJyZWFzb24iLCJlcnJubyIsIl9zZXRUaW1lb3V0cyIsInNldFRpbWVvdXQiXSwic291cmNlcyI6WyIuLi9zcmMvcmVxdWVzdC1iYXNlLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogTW9kdWxlIG9mIG1peGVkLWluIGZ1bmN0aW9ucyBzaGFyZWQgYmV0d2VlbiBub2RlIGFuZCBjbGllbnQgY29kZVxuICovXG5jb25zdCB7IGlzT2JqZWN0LCBoYXNPd24gfSA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcblxuLyoqXG4gKiBFeHBvc2UgYFJlcXVlc3RCYXNlYC5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlcXVlc3RCYXNlO1xuXG4vKipcbiAqIEluaXRpYWxpemUgYSBuZXcgYFJlcXVlc3RCYXNlYC5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmZ1bmN0aW9uIFJlcXVlc3RCYXNlKCkge31cblxuLyoqXG4gKiBDbGVhciBwcmV2aW91cyB0aW1lb3V0LlxuICpcbiAqIEByZXR1cm4ge1JlcXVlc3R9IGZvciBjaGFpbmluZ1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUuY2xlYXJUaW1lb3V0ID0gZnVuY3Rpb24gKCkge1xuICBjbGVhclRpbWVvdXQodGhpcy5fdGltZXIpO1xuICBjbGVhclRpbWVvdXQodGhpcy5fcmVzcG9uc2VUaW1lb3V0VGltZXIpO1xuICBjbGVhclRpbWVvdXQodGhpcy5fdXBsb2FkVGltZW91dFRpbWVyKTtcbiAgZGVsZXRlIHRoaXMuX3RpbWVyO1xuICBkZWxldGUgdGhpcy5fcmVzcG9uc2VUaW1lb3V0VGltZXI7XG4gIGRlbGV0ZSB0aGlzLl91cGxvYWRUaW1lb3V0VGltZXI7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBPdmVycmlkZSBkZWZhdWx0IHJlc3BvbnNlIGJvZHkgcGFyc2VyXG4gKlxuICogVGhpcyBmdW5jdGlvbiB3aWxsIGJlIGNhbGxlZCB0byBjb252ZXJ0IGluY29taW5nIGRhdGEgaW50byByZXF1ZXN0LmJvZHlcbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUucGFyc2UgPSBmdW5jdGlvbiAoZm4pIHtcbiAgdGhpcy5fcGFyc2VyID0gZm47XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBTZXQgZm9ybWF0IG9mIGJpbmFyeSByZXNwb25zZSBib2R5LlxuICogSW4gYnJvd3NlciB2YWxpZCBmb3JtYXRzIGFyZSAnYmxvYicgYW5kICdhcnJheWJ1ZmZlcicsXG4gKiB3aGljaCByZXR1cm4gQmxvYiBhbmQgQXJyYXlCdWZmZXIsIHJlc3BlY3RpdmVseS5cbiAqXG4gKiBJbiBOb2RlIGFsbCB2YWx1ZXMgcmVzdWx0IGluIEJ1ZmZlci5cbiAqXG4gKiBFeGFtcGxlczpcbiAqXG4gKiAgICAgIHJlcS5nZXQoJy8nKVxuICogICAgICAgIC5yZXNwb25zZVR5cGUoJ2Jsb2InKVxuICogICAgICAgIC5lbmQoY2FsbGJhY2spO1xuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB2YWxcbiAqIEByZXR1cm4ge1JlcXVlc3R9IGZvciBjaGFpbmluZ1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUucmVzcG9uc2VUeXBlID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gIHRoaXMuX3Jlc3BvbnNlVHlwZSA9IHZhbHVlO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogT3ZlcnJpZGUgZGVmYXVsdCByZXF1ZXN0IGJvZHkgc2VyaWFsaXplclxuICpcbiAqIFRoaXMgZnVuY3Rpb24gd2lsbCBiZSBjYWxsZWQgdG8gY29udmVydCBkYXRhIHNldCB2aWEgLnNlbmQgb3IgLmF0dGFjaCBpbnRvIHBheWxvYWQgdG8gc2VuZFxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlcXVlc3RCYXNlLnByb3RvdHlwZS5zZXJpYWxpemUgPSBmdW5jdGlvbiAoZm4pIHtcbiAgdGhpcy5fc2VyaWFsaXplciA9IGZuO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogU2V0IHRpbWVvdXRzLlxuICpcbiAqIC0gcmVzcG9uc2UgdGltZW91dCBpcyB0aW1lIGJldHdlZW4gc2VuZGluZyByZXF1ZXN0IGFuZCByZWNlaXZpbmcgdGhlIGZpcnN0IGJ5dGUgb2YgdGhlIHJlc3BvbnNlLiBJbmNsdWRlcyBETlMgYW5kIGNvbm5lY3Rpb24gdGltZS5cbiAqIC0gZGVhZGxpbmUgaXMgdGhlIHRpbWUgZnJvbSBzdGFydCBvZiB0aGUgcmVxdWVzdCB0byByZWNlaXZpbmcgcmVzcG9uc2UgYm9keSBpbiBmdWxsLiBJZiB0aGUgZGVhZGxpbmUgaXMgdG9vIHNob3J0IGxhcmdlIGZpbGVzIG1heSBub3QgbG9hZCBhdCBhbGwgb24gc2xvdyBjb25uZWN0aW9ucy5cbiAqIC0gdXBsb2FkIGlzIHRoZSB0aW1lICBzaW5jZSBsYXN0IGJpdCBvZiBkYXRhIHdhcyBzZW50IG9yIHJlY2VpdmVkLiBUaGlzIHRpbWVvdXQgd29ya3Mgb25seSBpZiBkZWFkbGluZSB0aW1lb3V0IGlzIG9mZlxuICpcbiAqIFZhbHVlIG9mIDAgb3IgZmFsc2UgbWVhbnMgbm8gdGltZW91dC5cbiAqXG4gKiBAcGFyYW0ge051bWJlcnxPYmplY3R9IG1zIG9yIHtyZXNwb25zZSwgZGVhZGxpbmV9XG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdEJhc2UucHJvdG90eXBlLnRpbWVvdXQgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICBpZiAoIW9wdGlvbnMgfHwgdHlwZW9mIG9wdGlvbnMgIT09ICdvYmplY3QnKSB7XG4gICAgdGhpcy5fdGltZW91dCA9IG9wdGlvbnM7XG4gICAgdGhpcy5fcmVzcG9uc2VUaW1lb3V0ID0gMDtcbiAgICB0aGlzLl91cGxvYWRUaW1lb3V0ID0gMDtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGZvciAoY29uc3Qgb3B0aW9uIGluIG9wdGlvbnMpIHtcbiAgICBpZiAoaGFzT3duKG9wdGlvbnMsIG9wdGlvbikpIHtcbiAgICAgIHN3aXRjaCAob3B0aW9uKSB7XG4gICAgICAgIGNhc2UgJ2RlYWRsaW5lJzpcbiAgICAgICAgICB0aGlzLl90aW1lb3V0ID0gb3B0aW9ucy5kZWFkbGluZTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAncmVzcG9uc2UnOlxuICAgICAgICAgIHRoaXMuX3Jlc3BvbnNlVGltZW91dCA9IG9wdGlvbnMucmVzcG9uc2U7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ3VwbG9hZCc6XG4gICAgICAgICAgdGhpcy5fdXBsb2FkVGltZW91dCA9IG9wdGlvbnMudXBsb2FkO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIGNvbnNvbGUud2FybignVW5rbm93biB0aW1lb3V0IG9wdGlvbicsIG9wdGlvbik7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFNldCBudW1iZXIgb2YgcmV0cnkgYXR0ZW1wdHMgb24gZXJyb3IuXG4gKlxuICogRmFpbGVkIHJlcXVlc3RzIHdpbGwgYmUgcmV0cmllZCAnY291bnQnIHRpbWVzIGlmIHRpbWVvdXQgb3IgZXJyLmNvZGUgPj0gNTAwLlxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSBjb3VudFxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2ZuXVxuICogQHJldHVybiB7UmVxdWVzdH0gZm9yIGNoYWluaW5nXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlcXVlc3RCYXNlLnByb3RvdHlwZS5yZXRyeSA9IGZ1bmN0aW9uIChjb3VudCwgZm4pIHtcbiAgLy8gRGVmYXVsdCB0byAxIGlmIG5vIGNvdW50IHBhc3NlZCBvciB0cnVlXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwIHx8IGNvdW50ID09PSB0cnVlKSBjb3VudCA9IDE7XG4gIGlmIChjb3VudCA8PSAwKSBjb3VudCA9IDA7XG4gIHRoaXMuX21heFJldHJpZXMgPSBjb3VudDtcbiAgdGhpcy5fcmV0cmllcyA9IDA7XG4gIHRoaXMuX3JldHJ5Q2FsbGJhY2sgPSBmbjtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vL1xuLy8gTk9URTogd2UgZG8gbm90IGluY2x1ZGUgRVNPQ0tFVFRJTUVET1VUIGJlY2F1c2UgdGhhdCBpcyBmcm9tIGByZXF1ZXN0YCBwYWNrYWdlXG4vLyAgICAgICA8aHR0cHM6Ly9naXRodWIuY29tL3NpbmRyZXNvcmh1cy9nb3QvcHVsbC81Mzc+XG4vL1xuLy8gTk9URTogd2UgZG8gbm90IGluY2x1ZGUgRUFERFJJTkZPIGJlY2F1c2UgaXQgd2FzIHJlbW92ZWQgZnJvbSBsaWJ1diBpbiAyMDE0XG4vLyAgICAgICA8aHR0cHM6Ly9naXRodWIuY29tL2xpYnV2L2xpYnV2L2NvbW1pdC8wMmUxZWJkNDBiODA3YmU1YWY0NjM0M2VhODczMzMxYjJlZTRlOWMxPlxuLy8gICAgICAgPGh0dHBzOi8vZ2l0aHViLmNvbS9yZXF1ZXN0L3JlcXVlc3Qvc2VhcmNoP3E9RVNPQ0tFVFRJTUVET1VUJnVuc2NvcGVkX3E9RVNPQ0tFVFRJTUVET1VUPlxuLy9cbi8vXG4vLyBUT0RPOiBleHBvc2UgdGhlc2UgYXMgY29uZmlndXJhYmxlIGRlZmF1bHRzXG4vL1xuY29uc3QgRVJST1JfQ09ERVMgPSBuZXcgU2V0KFtcbiAgJ0VUSU1FRE9VVCcsXG4gICdFQ09OTlJFU0VUJyxcbiAgJ0VBRERSSU5VU0UnLFxuICAnRUNPTk5SRUZVU0VEJyxcbiAgJ0VQSVBFJyxcbiAgJ0VOT1RGT1VORCcsXG4gICdFTkVUVU5SRUFDSCcsXG4gICdFQUlfQUdBSU4nXG5dKTtcblxuY29uc3QgU1RBVFVTX0NPREVTID0gbmV3IFNldChbXG4gIDQwOCwgNDEzLCA0MjksIDUwMCwgNTAyLCA1MDMsIDUwNCwgNTIxLCA1MjIsIDUyNFxuXSk7XG5cbi8vIFRPRE86IHdlIHdvdWxkIG5lZWQgdG8gbWFrZSB0aGlzIGVhc2lseSBjb25maWd1cmFibGUgYmVmb3JlIGFkZGluZyBpdCBpbiAoZS5nLiBzb21lIG1pZ2h0IHdhbnQgdG8gYWRkIFBPU1QpXG4vLyBjb25zdCBNRVRIT0RTID0gbmV3IFNldChbJ0dFVCcsICdQVVQnLCAnSEVBRCcsICdERUxFVEUnLCAnT1BUSU9OUycsICdUUkFDRSddKTtcblxuLyoqXG4gKiBEZXRlcm1pbmUgaWYgYSByZXF1ZXN0IHNob3VsZCBiZSByZXRyaWVkLlxuICogKEluc3BpcmVkIGJ5IGh0dHBzOi8vZ2l0aHViLmNvbS9zaW5kcmVzb3JodXMvZ290I3JldHJ5KVxuICpcbiAqIEBwYXJhbSB7RXJyb3J9IGVyciBhbiBlcnJvclxuICogQHBhcmFtIHtSZXNwb25zZX0gW3Jlc10gcmVzcG9uc2VcbiAqIEByZXR1cm5zIHtCb29sZWFufSBpZiBzZWdtZW50IHNob3VsZCBiZSByZXRyaWVkXG4gKi9cblJlcXVlc3RCYXNlLnByb3RvdHlwZS5fc2hvdWxkUmV0cnkgPSBmdW5jdGlvbiAoZXJyb3IsIHJlcykge1xuICBpZiAoIXRoaXMuX21heFJldHJpZXMgfHwgdGhpcy5fcmV0cmllcysrID49IHRoaXMuX21heFJldHJpZXMpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBpZiAodGhpcy5fcmV0cnlDYWxsYmFjaykge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBvdmVycmlkZSA9IHRoaXMuX3JldHJ5Q2FsbGJhY2soZXJyb3IsIHJlcyk7XG4gICAgICBpZiAob3ZlcnJpZGUgPT09IHRydWUpIHJldHVybiB0cnVlO1xuICAgICAgaWYgKG92ZXJyaWRlID09PSBmYWxzZSkgcmV0dXJuIGZhbHNlO1xuICAgICAgLy8gdW5kZWZpbmVkIGZhbGxzIGJhY2sgdG8gZGVmYXVsdHNcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcbiAgICB9XG4gIH1cblxuICAvLyBUT0RPOiB3ZSB3b3VsZCBuZWVkIHRvIG1ha2UgdGhpcyBlYXNpbHkgY29uZmlndXJhYmxlIGJlZm9yZSBhZGRpbmcgaXQgaW4gKGUuZy4gc29tZSBtaWdodCB3YW50IHRvIGFkZCBQT1NUKVxuICAvKlxuICBpZiAoXG4gICAgdGhpcy5yZXEgJiZcbiAgICB0aGlzLnJlcS5tZXRob2QgJiZcbiAgICAhTUVUSE9EUy5oYXModGhpcy5yZXEubWV0aG9kLnRvVXBwZXJDYXNlKCkpXG4gIClcbiAgICByZXR1cm4gZmFsc2U7XG4gICovXG4gIGlmIChyZXMgJiYgcmVzLnN0YXR1cyAmJiBTVEFUVVNfQ09ERVMuaGFzKHJlcy5zdGF0dXMpKSByZXR1cm4gdHJ1ZTtcbiAgaWYgKGVycm9yKSB7XG4gICAgaWYgKGVycm9yLmNvZGUgJiYgRVJST1JfQ09ERVMuaGFzKGVycm9yLmNvZGUpKSByZXR1cm4gdHJ1ZTtcbiAgICAvLyBTdXBlcmFnZW50IHRpbWVvdXRcbiAgICBpZiAoZXJyb3IudGltZW91dCAmJiBlcnJvci5jb2RlID09PSAnRUNPTk5BQk9SVEVEJykgcmV0dXJuIHRydWU7XG4gICAgaWYgKGVycm9yLmNyb3NzRG9tYWluKSByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHJldHVybiBmYWxzZTtcbn07XG5cbi8qKlxuICogUmV0cnkgcmVxdWVzdFxuICpcbiAqIEByZXR1cm4ge1JlcXVlc3R9IGZvciBjaGFpbmluZ1xuICogQGFwaSBwcml2YXRlXG4gKi9cblxuUmVxdWVzdEJhc2UucHJvdG90eXBlLl9yZXRyeSA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5jbGVhclRpbWVvdXQoKTtcblxuICAvLyBub2RlXG4gIGlmICh0aGlzLnJlcSkge1xuICAgIHRoaXMucmVxID0gbnVsbDtcbiAgICB0aGlzLnJlcSA9IHRoaXMucmVxdWVzdCgpO1xuICB9XG5cbiAgdGhpcy5fYWJvcnRlZCA9IGZhbHNlO1xuICB0aGlzLnRpbWVkb3V0ID0gZmFsc2U7XG4gIHRoaXMudGltZWRvdXRFcnJvciA9IG51bGw7XG5cbiAgcmV0dXJuIHRoaXMuX2VuZCgpO1xufTtcblxuLyoqXG4gKiBQcm9taXNlIHN1cHBvcnRcbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSByZXNvbHZlXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbcmVqZWN0XVxuICogQHJldHVybiB7UmVxdWVzdH1cbiAqL1xuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUudGhlbiA9IGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgaWYgKCF0aGlzLl9mdWxsZmlsbGVkUHJvbWlzZSkge1xuICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgIGlmICh0aGlzLl9lbmRDYWxsZWQpIHtcbiAgICAgIGNvbnNvbGUud2FybihcbiAgICAgICAgJ1dhcm5pbmc6IHN1cGVyYWdlbnQgcmVxdWVzdCB3YXMgc2VudCB0d2ljZSwgYmVjYXVzZSBib3RoIC5lbmQoKSBhbmQgLnRoZW4oKSB3ZXJlIGNhbGxlZC4gTmV2ZXIgY2FsbCAuZW5kKCkgaWYgeW91IHVzZSBwcm9taXNlcydcbiAgICAgICk7XG4gICAgfVxuXG4gICAgdGhpcy5fZnVsbGZpbGxlZFByb21pc2UgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBzZWxmLm9uKCdhYm9ydCcsICgpID0+IHtcbiAgICAgICAgaWYgKHRoaXMuX21heFJldHJpZXMgJiYgdGhpcy5fbWF4UmV0cmllcyA+IHRoaXMuX3JldHJpZXMpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy50aW1lZG91dCAmJiB0aGlzLnRpbWVkb3V0RXJyb3IpIHtcbiAgICAgICAgICByZWplY3QodGhpcy50aW1lZG91dEVycm9yKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBlcnJvciA9IG5ldyBFcnJvcignQWJvcnRlZCcpO1xuICAgICAgICBlcnJvci5jb2RlID0gJ0FCT1JURUQnO1xuICAgICAgICBlcnJvci5zdGF0dXMgPSB0aGlzLnN0YXR1cztcbiAgICAgICAgZXJyb3IubWV0aG9kID0gdGhpcy5tZXRob2Q7XG4gICAgICAgIGVycm9yLnVybCA9IHRoaXMudXJsO1xuICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgfSk7XG4gICAgICBzZWxmLmVuZCgoZXJyb3IsIHJlcykgPT4ge1xuICAgICAgICBpZiAoZXJyb3IpIHJlamVjdChlcnJvcik7XG4gICAgICAgIGVsc2UgcmVzb2x2ZShyZXMpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4gdGhpcy5fZnVsbGZpbGxlZFByb21pc2UudGhlbihyZXNvbHZlLCByZWplY3QpO1xufTtcblxuUmVxdWVzdEJhc2UucHJvdG90eXBlLmNhdGNoID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gIHJldHVybiB0aGlzLnRoZW4odW5kZWZpbmVkLCBjYWxsYmFjayk7XG59O1xuXG4vKipcbiAqIEFsbG93IGZvciBleHRlbnNpb25cbiAqL1xuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUudXNlID0gZnVuY3Rpb24gKGZuKSB7XG4gIGZuKHRoaXMpO1xuICByZXR1cm4gdGhpcztcbn07XG5cblJlcXVlc3RCYXNlLnByb3RvdHlwZS5vayA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICBpZiAodHlwZW9mIGNhbGxiYWNrICE9PSAnZnVuY3Rpb24nKSB0aHJvdyBuZXcgRXJyb3IoJ0NhbGxiYWNrIHJlcXVpcmVkJyk7XG4gIHRoaXMuX29rQ2FsbGJhY2sgPSBjYWxsYmFjaztcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUuX2lzUmVzcG9uc2VPSyA9IGZ1bmN0aW9uIChyZXMpIHtcbiAgaWYgKCFyZXMpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBpZiAodGhpcy5fb2tDYWxsYmFjaykge1xuICAgIHJldHVybiB0aGlzLl9va0NhbGxiYWNrKHJlcyk7XG4gIH1cblxuICByZXR1cm4gcmVzLnN0YXR1cyA+PSAyMDAgJiYgcmVzLnN0YXR1cyA8IDMwMDtcbn07XG5cbi8qKlxuICogR2V0IHJlcXVlc3QgaGVhZGVyIGBmaWVsZGAuXG4gKiBDYXNlLWluc2Vuc2l0aXZlLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBmaWVsZFxuICogQHJldHVybiB7U3RyaW5nfVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gKGZpZWxkKSB7XG4gIHJldHVybiB0aGlzLl9oZWFkZXJbZmllbGQudG9Mb3dlckNhc2UoKV07XG59O1xuXG4vKipcbiAqIEdldCBjYXNlLWluc2Vuc2l0aXZlIGhlYWRlciBgZmllbGRgIHZhbHVlLlxuICogVGhpcyBpcyBhIGRlcHJlY2F0ZWQgaW50ZXJuYWwgQVBJLiBVc2UgYC5nZXQoZmllbGQpYCBpbnN0ZWFkLlxuICpcbiAqIChnZXRIZWFkZXIgaXMgbm8gbG9uZ2VyIHVzZWQgaW50ZXJuYWxseSBieSB0aGUgc3VwZXJhZ2VudCBjb2RlIGJhc2UpXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGZpZWxkXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKiBAYXBpIHByaXZhdGVcbiAqIEBkZXByZWNhdGVkXG4gKi9cblxuUmVxdWVzdEJhc2UucHJvdG90eXBlLmdldEhlYWRlciA9IFJlcXVlc3RCYXNlLnByb3RvdHlwZS5nZXQ7XG5cbi8qKlxuICogU2V0IGhlYWRlciBgZmllbGRgIHRvIGB2YWxgLCBvciBtdWx0aXBsZSBmaWVsZHMgd2l0aCBvbmUgb2JqZWN0LlxuICogQ2FzZS1pbnNlbnNpdGl2ZS5cbiAqXG4gKiBFeGFtcGxlczpcbiAqXG4gKiAgICAgIHJlcS5nZXQoJy8nKVxuICogICAgICAgIC5zZXQoJ0FjY2VwdCcsICdhcHBsaWNhdGlvbi9qc29uJylcbiAqICAgICAgICAuc2V0KCdYLUFQSS1LZXknLCAnZm9vYmFyJylcbiAqICAgICAgICAuZW5kKGNhbGxiYWNrKTtcbiAqXG4gKiAgICAgIHJlcS5nZXQoJy8nKVxuICogICAgICAgIC5zZXQoeyBBY2NlcHQ6ICdhcHBsaWNhdGlvbi9qc29uJywgJ1gtQVBJLUtleSc6ICdmb29iYXInIH0pXG4gKiAgICAgICAgLmVuZChjYWxsYmFjayk7XG4gKlxuICogQHBhcmFtIHtTdHJpbmd8T2JqZWN0fSBmaWVsZFxuICogQHBhcmFtIHtTdHJpbmd9IHZhbFxuICogQHJldHVybiB7UmVxdWVzdH0gZm9yIGNoYWluaW5nXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlcXVlc3RCYXNlLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbiAoZmllbGQsIHZhbHVlKSB7XG4gIGlmIChpc09iamVjdChmaWVsZCkpIHtcbiAgICBmb3IgKGNvbnN0IGtleSBpbiBmaWVsZCkge1xuICAgICAgaWYgKGhhc093bihmaWVsZCwga2V5KSkgdGhpcy5zZXQoa2V5LCBmaWVsZFtrZXldKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIHRoaXMuX2hlYWRlcltmaWVsZC50b0xvd2VyQ2FzZSgpXSA9IHZhbHVlO1xuICB0aGlzLmhlYWRlcltmaWVsZF0gPSB2YWx1ZTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJlbW92ZSBoZWFkZXIgYGZpZWxkYC5cbiAqIENhc2UtaW5zZW5zaXRpdmUuXG4gKlxuICogRXhhbXBsZTpcbiAqXG4gKiAgICAgIHJlcS5nZXQoJy8nKVxuICogICAgICAgIC51bnNldCgnVXNlci1BZ2VudCcpXG4gKiAgICAgICAgLmVuZChjYWxsYmFjayk7XG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGZpZWxkIGZpZWxkIG5hbWVcbiAqL1xuUmVxdWVzdEJhc2UucHJvdG90eXBlLnVuc2V0ID0gZnVuY3Rpb24gKGZpZWxkKSB7XG4gIGRlbGV0ZSB0aGlzLl9oZWFkZXJbZmllbGQudG9Mb3dlckNhc2UoKV07XG4gIGRlbGV0ZSB0aGlzLmhlYWRlcltmaWVsZF07XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBXcml0ZSB0aGUgZmllbGQgYG5hbWVgIGFuZCBgdmFsYCwgb3IgbXVsdGlwbGUgZmllbGRzIHdpdGggb25lIG9iamVjdFxuICogZm9yIFwibXVsdGlwYXJ0L2Zvcm0tZGF0YVwiIHJlcXVlc3QgYm9kaWVzLlxuICpcbiAqIGBgYCBqc1xuICogcmVxdWVzdC5wb3N0KCcvdXBsb2FkJylcbiAqICAgLmZpZWxkKCdmb28nLCAnYmFyJylcbiAqICAgLmVuZChjYWxsYmFjayk7XG4gKlxuICogcmVxdWVzdC5wb3N0KCcvdXBsb2FkJylcbiAqICAgLmZpZWxkKHsgZm9vOiAnYmFyJywgYmF6OiAncXV4JyB9KVxuICogICAuZW5kKGNhbGxiYWNrKTtcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfE9iamVjdH0gbmFtZSBuYW1lIG9mIGZpZWxkXG4gKiBAcGFyYW0ge1N0cmluZ3xCbG9ifEZpbGV8QnVmZmVyfGZzLlJlYWRTdHJlYW19IHZhbCB2YWx1ZSBvZiBmaWVsZFxuICogQHBhcmFtIHtTdHJpbmd9IG9wdGlvbnMgZXh0cmEgb3B0aW9ucywgZS5nLiAnYmxvYidcbiAqIEByZXR1cm4ge1JlcXVlc3R9IGZvciBjaGFpbmluZ1xuICogQGFwaSBwdWJsaWNcbiAqL1xuUmVxdWVzdEJhc2UucHJvdG90eXBlLmZpZWxkID0gZnVuY3Rpb24gKG5hbWUsIHZhbHVlLCBvcHRpb25zKSB7XG4gIC8vIG5hbWUgc2hvdWxkIGJlIGVpdGhlciBhIHN0cmluZyBvciBhbiBvYmplY3QuXG4gIGlmIChuYW1lID09PSBudWxsIHx8IHVuZGVmaW5lZCA9PT0gbmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcignLmZpZWxkKG5hbWUsIHZhbCkgbmFtZSBjYW4gbm90IGJlIGVtcHR5Jyk7XG4gIH1cblxuICBpZiAodGhpcy5fZGF0YSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgIFwiLmZpZWxkKCkgY2FuJ3QgYmUgdXNlZCBpZiAuc2VuZCgpIGlzIHVzZWQuIFBsZWFzZSB1c2Ugb25seSAuc2VuZCgpIG9yIG9ubHkgLmZpZWxkKCkgJiAuYXR0YWNoKClcIlxuICAgICk7XG4gIH1cblxuICBpZiAoaXNPYmplY3QobmFtZSkpIHtcbiAgICBmb3IgKGNvbnN0IGtleSBpbiBuYW1lKSB7XG4gICAgICBpZiAoaGFzT3duKG5hbWUsIGtleSkpIHRoaXMuZmllbGQoa2V5LCBuYW1lW2tleV0pO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgZm9yIChjb25zdCBpIGluIHZhbHVlKSB7XG4gICAgICBpZiAoaGFzT3duKHZhbHVlLCBpKSkgdGhpcy5maWVsZChuYW1lLCB2YWx1ZVtpXSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyB2YWwgc2hvdWxkIGJlIGRlZmluZWQgbm93XG4gIGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB1bmRlZmluZWQgPT09IHZhbHVlKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCcuZmllbGQobmFtZSwgdmFsKSB2YWwgY2FuIG5vdCBiZSBlbXB0eScpO1xuICB9XG5cbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ2Jvb2xlYW4nKSB7XG4gICAgdmFsdWUgPSBTdHJpbmcodmFsdWUpO1xuICB9XG5cbiAgLy8gZml4IGh0dHBzOi8vZ2l0aHViLmNvbS9sYWRqcy9zdXBlcmFnZW50L2lzc3Vlcy8xNjgwXG4gIGlmIChvcHRpb25zKSB0aGlzLl9nZXRGb3JtRGF0YSgpLmFwcGVuZChuYW1lLCB2YWx1ZSwgb3B0aW9ucyk7XG4gIGVsc2UgdGhpcy5fZ2V0Rm9ybURhdGEoKS5hcHBlbmQobmFtZSwgdmFsdWUpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBBYm9ydCB0aGUgcmVxdWVzdCwgYW5kIGNsZWFyIHBvdGVudGlhbCB0aW1lb3V0LlxuICpcbiAqIEByZXR1cm4ge1JlcXVlc3R9IHJlcXVlc3RcbiAqIEBhcGkgcHVibGljXG4gKi9cblJlcXVlc3RCYXNlLnByb3RvdHlwZS5hYm9ydCA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKHRoaXMuX2Fib3J0ZWQpIHtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIHRoaXMuX2Fib3J0ZWQgPSB0cnVlO1xuICBpZiAodGhpcy54aHIpIHRoaXMueGhyLmFib3J0KCk7IC8vIGJyb3dzZXJcbiAgaWYgKHRoaXMucmVxKSB7XG4gICAgdGhpcy5yZXEuYWJvcnQoKTsgLy8gbm9kZVxuICB9XG5cbiAgdGhpcy5jbGVhclRpbWVvdXQoKTtcbiAgdGhpcy5lbWl0KCdhYm9ydCcpO1xuICByZXR1cm4gdGhpcztcbn07XG5cblJlcXVlc3RCYXNlLnByb3RvdHlwZS5fYXV0aCA9IGZ1bmN0aW9uICh1c2VyLCBwYXNzLCBvcHRpb25zLCBiYXNlNjRFbmNvZGVyKSB7XG4gIHN3aXRjaCAob3B0aW9ucy50eXBlKSB7XG4gICAgY2FzZSAnYmFzaWMnOlxuICAgICAgdGhpcy5zZXQoJ0F1dGhvcml6YXRpb24nLCBgQmFzaWMgJHtiYXNlNjRFbmNvZGVyKGAke3VzZXJ9OiR7cGFzc31gKX1gKTtcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSAnYXV0byc6XG4gICAgICB0aGlzLnVzZXJuYW1lID0gdXNlcjtcbiAgICAgIHRoaXMucGFzc3dvcmQgPSBwYXNzO1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlICdiZWFyZXInOiAvLyB1c2FnZSB3b3VsZCBiZSAuYXV0aChhY2Nlc3NUb2tlbiwgeyB0eXBlOiAnYmVhcmVyJyB9KVxuICAgICAgdGhpcy5zZXQoJ0F1dGhvcml6YXRpb24nLCBgQmVhcmVyICR7dXNlcn1gKTtcbiAgICAgIGJyZWFrO1xuICAgIGRlZmF1bHQ6XG4gICAgICBicmVhaztcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBFbmFibGUgdHJhbnNtaXNzaW9uIG9mIGNvb2tpZXMgd2l0aCB4LWRvbWFpbiByZXF1ZXN0cy5cbiAqXG4gKiBOb3RlIHRoYXQgZm9yIHRoaXMgdG8gd29yayB0aGUgb3JpZ2luIG11c3Qgbm90IGJlXG4gKiB1c2luZyBcIkFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpblwiIHdpdGggYSB3aWxkY2FyZCxcbiAqIGFuZCBhbHNvIG11c3Qgc2V0IFwiQWNjZXNzLUNvbnRyb2wtQWxsb3ctQ3JlZGVudGlhbHNcIlxuICogdG8gXCJ0cnVlXCIuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtvbj10cnVlXSAtIFNldCAnd2l0aENyZWRlbnRpYWxzJyBzdGF0ZVxuICogQHJldHVybiB7UmVxdWVzdH0gZm9yIGNoYWluaW5nXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlcXVlc3RCYXNlLnByb3RvdHlwZS53aXRoQ3JlZGVudGlhbHMgPSBmdW5jdGlvbiAob24pIHtcbiAgLy8gVGhpcyBpcyBicm93c2VyLW9ubHkgZnVuY3Rpb25hbGl0eS4gTm9kZSBzaWRlIGlzIG5vLW9wLlxuICBpZiAob24gPT09IHVuZGVmaW5lZCkgb24gPSB0cnVlO1xuICB0aGlzLl93aXRoQ3JlZGVudGlhbHMgPSBvbjtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFNldCB0aGUgbWF4IHJlZGlyZWN0cyB0byBgbmAuIERvZXMgbm90aGluZyBpbiBicm93c2VyIFhIUiBpbXBsZW1lbnRhdGlvbi5cbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gblxuICogQHJldHVybiB7UmVxdWVzdH0gZm9yIGNoYWluaW5nXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlcXVlc3RCYXNlLnByb3RvdHlwZS5yZWRpcmVjdHMgPSBmdW5jdGlvbiAobikge1xuICB0aGlzLl9tYXhSZWRpcmVjdHMgPSBuO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogTWF4aW11bSBzaXplIG9mIGJ1ZmZlcmVkIHJlc3BvbnNlIGJvZHksIGluIGJ5dGVzLiBDb3VudHMgdW5jb21wcmVzc2VkIHNpemUuXG4gKiBEZWZhdWx0IDIwME1CLlxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSBuIG51bWJlciBvZiBieXRlc1xuICogQHJldHVybiB7UmVxdWVzdH0gZm9yIGNoYWluaW5nXG4gKi9cblJlcXVlc3RCYXNlLnByb3RvdHlwZS5tYXhSZXNwb25zZVNpemUgPSBmdW5jdGlvbiAobikge1xuICBpZiAodHlwZW9mIG4gIT09ICdudW1iZXInKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignSW52YWxpZCBhcmd1bWVudCcpO1xuICB9XG5cbiAgdGhpcy5fbWF4UmVzcG9uc2VTaXplID0gbjtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIENvbnZlcnQgdG8gYSBwbGFpbiBqYXZhc2NyaXB0IG9iamVjdCAobm90IEpTT04gc3RyaW5nKSBvZiBzY2FsYXIgcHJvcGVydGllcy5cbiAqIE5vdGUgYXMgdGhpcyBtZXRob2QgaXMgZGVzaWduZWQgdG8gcmV0dXJuIGEgdXNlZnVsIG5vbi10aGlzIHZhbHVlLFxuICogaXQgY2Fubm90IGJlIGNoYWluZWQuXG4gKlxuICogQHJldHVybiB7T2JqZWN0fSBkZXNjcmliaW5nIG1ldGhvZCwgdXJsLCBhbmQgZGF0YSBvZiB0aGlzIHJlcXVlc3RcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdEJhc2UucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHtcbiAgICBtZXRob2Q6IHRoaXMubWV0aG9kLFxuICAgIHVybDogdGhpcy51cmwsXG4gICAgZGF0YTogdGhpcy5fZGF0YSxcbiAgICBoZWFkZXJzOiB0aGlzLl9oZWFkZXJcbiAgfTtcbn07XG5cbi8qKlxuICogU2VuZCBgZGF0YWAgYXMgdGhlIHJlcXVlc3QgYm9keSwgZGVmYXVsdGluZyB0aGUgYC50eXBlKClgIHRvIFwianNvblwiIHdoZW5cbiAqIGFuIG9iamVjdCBpcyBnaXZlbi5cbiAqXG4gKiBFeGFtcGxlczpcbiAqXG4gKiAgICAgICAvLyBtYW51YWwganNvblxuICogICAgICAgcmVxdWVzdC5wb3N0KCcvdXNlcicpXG4gKiAgICAgICAgIC50eXBlKCdqc29uJylcbiAqICAgICAgICAgLnNlbmQoJ3tcIm5hbWVcIjpcInRqXCJ9JylcbiAqICAgICAgICAgLmVuZChjYWxsYmFjaylcbiAqXG4gKiAgICAgICAvLyBhdXRvIGpzb25cbiAqICAgICAgIHJlcXVlc3QucG9zdCgnL3VzZXInKVxuICogICAgICAgICAuc2VuZCh7IG5hbWU6ICd0aicgfSlcbiAqICAgICAgICAgLmVuZChjYWxsYmFjaylcbiAqXG4gKiAgICAgICAvLyBtYW51YWwgeC13d3ctZm9ybS11cmxlbmNvZGVkXG4gKiAgICAgICByZXF1ZXN0LnBvc3QoJy91c2VyJylcbiAqICAgICAgICAgLnR5cGUoJ2Zvcm0nKVxuICogICAgICAgICAuc2VuZCgnbmFtZT10aicpXG4gKiAgICAgICAgIC5lbmQoY2FsbGJhY2spXG4gKlxuICogICAgICAgLy8gYXV0byB4LXd3dy1mb3JtLXVybGVuY29kZWRcbiAqICAgICAgIHJlcXVlc3QucG9zdCgnL3VzZXInKVxuICogICAgICAgICAudHlwZSgnZm9ybScpXG4gKiAgICAgICAgIC5zZW5kKHsgbmFtZTogJ3RqJyB9KVxuICogICAgICAgICAuZW5kKGNhbGxiYWNrKVxuICpcbiAqICAgICAgIC8vIGRlZmF1bHRzIHRvIHgtd3d3LWZvcm0tdXJsZW5jb2RlZFxuICogICAgICByZXF1ZXN0LnBvc3QoJy91c2VyJylcbiAqICAgICAgICAuc2VuZCgnbmFtZT10b2JpJylcbiAqICAgICAgICAuc2VuZCgnc3BlY2llcz1mZXJyZXQnKVxuICogICAgICAgIC5lbmQoY2FsbGJhY2spXG4gKlxuICogQHBhcmFtIHtTdHJpbmd8T2JqZWN0fSBkYXRhXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGNvbXBsZXhpdHlcblJlcXVlc3RCYXNlLnByb3RvdHlwZS5zZW5kID0gZnVuY3Rpb24gKGRhdGEpIHtcbiAgY29uc3QgaXNPYmplY3RfID0gaXNPYmplY3QoZGF0YSk7XG4gIGxldCB0eXBlID0gdGhpcy5faGVhZGVyWydjb250ZW50LXR5cGUnXTtcblxuICBpZiAodGhpcy5fZm9ybURhdGEpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICBcIi5zZW5kKCkgY2FuJ3QgYmUgdXNlZCBpZiAuYXR0YWNoKCkgb3IgLmZpZWxkKCkgaXMgdXNlZC4gUGxlYXNlIHVzZSBvbmx5IC5zZW5kKCkgb3Igb25seSAuZmllbGQoKSAmIC5hdHRhY2goKVwiXG4gICAgKTtcbiAgfVxuXG4gIGlmIChpc09iamVjdF8gJiYgIXRoaXMuX2RhdGEpIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShkYXRhKSkge1xuICAgICAgdGhpcy5fZGF0YSA9IFtdO1xuICAgIH0gZWxzZSBpZiAoIXRoaXMuX2lzSG9zdChkYXRhKSkge1xuICAgICAgdGhpcy5fZGF0YSA9IHt9O1xuICAgIH1cbiAgfSBlbHNlIGlmIChkYXRhICYmIHRoaXMuX2RhdGEgJiYgdGhpcy5faXNIb3N0KHRoaXMuX2RhdGEpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FuJ3QgbWVyZ2UgdGhlc2Ugc2VuZCBjYWxsc1wiKTtcbiAgfVxuXG4gIC8vIG1lcmdlXG4gIGlmIChpc09iamVjdF8gJiYgaXNPYmplY3QodGhpcy5fZGF0YSkpIHtcbiAgICBmb3IgKGNvbnN0IGtleSBpbiBkYXRhKSB7XG4gICAgICBpZiAodHlwZW9mIGRhdGFba2V5XSA9PSAnYmlnaW50JyAmJiAhZGF0YVtrZXldLnRvSlNPTilcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYW5ub3Qgc2VyaWFsaXplIEJpZ0ludCB2YWx1ZSB0byBqc29uJyk7XG4gICAgICBpZiAoaGFzT3duKGRhdGEsIGtleSkpIHRoaXMuX2RhdGFba2V5XSA9IGRhdGFba2V5XTtcbiAgICB9XG4gIH1cbiAgZWxzZSBpZiAodHlwZW9mIGRhdGEgPT09ICdiaWdpbnQnKSB0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3Qgc2VuZCB2YWx1ZSBvZiB0eXBlIEJpZ0ludFwiKTtcbiAgZWxzZSBpZiAodHlwZW9mIGRhdGEgPT09ICdzdHJpbmcnKSB7XG4gICAgLy8gZGVmYXVsdCB0byB4LXd3dy1mb3JtLXVybGVuY29kZWRcbiAgICBpZiAoIXR5cGUpIHRoaXMudHlwZSgnZm9ybScpO1xuICAgIHR5cGUgPSB0aGlzLl9oZWFkZXJbJ2NvbnRlbnQtdHlwZSddO1xuICAgIGlmICh0eXBlKSB0eXBlID0gdHlwZS50b0xvd2VyQ2FzZSgpLnRyaW0oKTtcbiAgICBpZiAodHlwZSA9PT0gJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZCcpIHtcbiAgICAgIHRoaXMuX2RhdGEgPSB0aGlzLl9kYXRhID8gYCR7dGhpcy5fZGF0YX0mJHtkYXRhfWAgOiBkYXRhO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9kYXRhID0gKHRoaXMuX2RhdGEgfHwgJycpICsgZGF0YTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5fZGF0YSA9IGRhdGE7XG4gIH1cblxuICBpZiAoIWlzT2JqZWN0XyB8fCB0aGlzLl9pc0hvc3QoZGF0YSkpIHtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIGRlZmF1bHQgdG8ganNvblxuICBpZiAoIXR5cGUpIHRoaXMudHlwZSgnanNvbicpO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogU29ydCBgcXVlcnlzdHJpbmdgIGJ5IHRoZSBzb3J0IGZ1bmN0aW9uXG4gKlxuICpcbiAqIEV4YW1wbGVzOlxuICpcbiAqICAgICAgIC8vIGRlZmF1bHQgb3JkZXJcbiAqICAgICAgIHJlcXVlc3QuZ2V0KCcvdXNlcicpXG4gKiAgICAgICAgIC5xdWVyeSgnbmFtZT1OaWNrJylcbiAqICAgICAgICAgLnF1ZXJ5KCdzZWFyY2g9TWFubnknKVxuICogICAgICAgICAuc29ydFF1ZXJ5KClcbiAqICAgICAgICAgLmVuZChjYWxsYmFjaylcbiAqXG4gKiAgICAgICAvLyBjdXN0b21pemVkIHNvcnQgZnVuY3Rpb25cbiAqICAgICAgIHJlcXVlc3QuZ2V0KCcvdXNlcicpXG4gKiAgICAgICAgIC5xdWVyeSgnbmFtZT1OaWNrJylcbiAqICAgICAgICAgLnF1ZXJ5KCdzZWFyY2g9TWFubnknKVxuICogICAgICAgICAuc29ydFF1ZXJ5KGZ1bmN0aW9uKGEsIGIpe1xuICogICAgICAgICAgIHJldHVybiBhLmxlbmd0aCAtIGIubGVuZ3RoO1xuICogICAgICAgICB9KVxuICogICAgICAgICAuZW5kKGNhbGxiYWNrKVxuICpcbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBzb3J0XG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdEJhc2UucHJvdG90eXBlLnNvcnRRdWVyeSA9IGZ1bmN0aW9uIChzb3J0KSB7XG4gIC8vIF9zb3J0IGRlZmF1bHQgdG8gdHJ1ZSBidXQgb3RoZXJ3aXNlIGNhbiBiZSBhIGZ1bmN0aW9uIG9yIGJvb2xlYW5cbiAgdGhpcy5fc29ydCA9IHR5cGVvZiBzb3J0ID09PSAndW5kZWZpbmVkJyA/IHRydWUgOiBzb3J0O1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQ29tcG9zZSBxdWVyeXN0cmluZyB0byBhcHBlbmQgdG8gcmVxLnVybFxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUuX2ZpbmFsaXplUXVlcnlTdHJpbmcgPSBmdW5jdGlvbiAoKSB7XG4gIGNvbnN0IHF1ZXJ5ID0gdGhpcy5fcXVlcnkuam9pbignJicpO1xuICBpZiAocXVlcnkpIHtcbiAgICB0aGlzLnVybCArPSAodGhpcy51cmwuaW5jbHVkZXMoJz8nKSA/ICcmJyA6ICc/JykgKyBxdWVyeTtcbiAgfVxuXG4gIHRoaXMuX3F1ZXJ5Lmxlbmd0aCA9IDA7IC8vIE1ha2VzIHRoZSBjYWxsIGlkZW1wb3RlbnRcblxuICBpZiAodGhpcy5fc29ydCkge1xuICAgIGNvbnN0IGluZGV4ID0gdGhpcy51cmwuaW5kZXhPZignPycpO1xuICAgIGlmIChpbmRleCA+PSAwKSB7XG4gICAgICBjb25zdCBxdWVyeUFycmF5ID0gdGhpcy51cmwuc2xpY2UoaW5kZXggKyAxKS5zcGxpdCgnJicpO1xuICAgICAgaWYgKHR5cGVvZiB0aGlzLl9zb3J0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHF1ZXJ5QXJyYXkuc29ydCh0aGlzLl9zb3J0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHF1ZXJ5QXJyYXkuc29ydCgpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLnVybCA9IHRoaXMudXJsLnNsaWNlKDAsIGluZGV4KSArICc/JyArIHF1ZXJ5QXJyYXkuam9pbignJicpO1xuICAgIH1cbiAgfVxufTtcblxuLy8gRm9yIGJhY2t3YXJkcyBjb21wYXQgb25seVxuUmVxdWVzdEJhc2UucHJvdG90eXBlLl9hcHBlbmRRdWVyeVN0cmluZyA9ICgpID0+IHtcbiAgY29uc29sZS53YXJuKCdVbnN1cHBvcnRlZCcpO1xufTtcblxuLyoqXG4gKiBJbnZva2UgY2FsbGJhY2sgd2l0aCB0aW1lb3V0IGVycm9yLlxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cblJlcXVlc3RCYXNlLnByb3RvdHlwZS5fdGltZW91dEVycm9yID0gZnVuY3Rpb24gKHJlYXNvbiwgdGltZW91dCwgZXJybm8pIHtcbiAgaWYgKHRoaXMuX2Fib3J0ZWQpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCBlcnJvciA9IG5ldyBFcnJvcihgJHtyZWFzb24gKyB0aW1lb3V0fW1zIGV4Y2VlZGVkYCk7XG4gIGVycm9yLnRpbWVvdXQgPSB0aW1lb3V0O1xuICBlcnJvci5jb2RlID0gJ0VDT05OQUJPUlRFRCc7XG4gIGVycm9yLmVycm5vID0gZXJybm87XG4gIHRoaXMudGltZWRvdXQgPSB0cnVlO1xuICB0aGlzLnRpbWVkb3V0RXJyb3IgPSBlcnJvcjtcbiAgdGhpcy5hYm9ydCgpO1xuICB0aGlzLmNhbGxiYWNrKGVycm9yKTtcbn07XG5cblJlcXVlc3RCYXNlLnByb3RvdHlwZS5fc2V0VGltZW91dHMgPSBmdW5jdGlvbiAoKSB7XG4gIGNvbnN0IHNlbGYgPSB0aGlzO1xuXG4gIC8vIGRlYWRsaW5lXG4gIGlmICh0aGlzLl90aW1lb3V0ICYmICF0aGlzLl90aW1lcikge1xuICAgIHRoaXMuX3RpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICBzZWxmLl90aW1lb3V0RXJyb3IoJ1RpbWVvdXQgb2YgJywgc2VsZi5fdGltZW91dCwgJ0VUSU1FJyk7XG4gICAgfSwgdGhpcy5fdGltZW91dCk7XG4gIH1cblxuICAvLyByZXNwb25zZSB0aW1lb3V0XG4gIGlmICh0aGlzLl9yZXNwb25zZVRpbWVvdXQgJiYgIXRoaXMuX3Jlc3BvbnNlVGltZW91dFRpbWVyKSB7XG4gICAgdGhpcy5fcmVzcG9uc2VUaW1lb3V0VGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIHNlbGYuX3RpbWVvdXRFcnJvcihcbiAgICAgICAgJ1Jlc3BvbnNlIHRpbWVvdXQgb2YgJyxcbiAgICAgICAgc2VsZi5fcmVzcG9uc2VUaW1lb3V0LFxuICAgICAgICAnRVRJTUVET1VUJ1xuICAgICAgKTtcbiAgICB9LCB0aGlzLl9yZXNwb25z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