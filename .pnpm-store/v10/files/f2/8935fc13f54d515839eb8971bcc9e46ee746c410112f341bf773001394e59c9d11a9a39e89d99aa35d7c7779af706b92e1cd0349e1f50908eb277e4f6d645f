const zlib = require('zlib');
const Util = require('../util');
const Logger = require('../logger');
const ExecutionTimer = require('../logger/execution_timer');
const axios = require('axios');
const URL = require('node:url').URL;
const requestUtil = require('./request_util');

const DEFAULT_REQUEST_TIMEOUT = 360000;

/**
 * Creates a new HTTP client.
 *
 * @param connectionConfig
 * @constructor
 */
function HttpClient(connectionConfig) {
  // save the connection config
  Logger.getInstance().trace('Initializing base HttpClient with Connection Config[%s]',
    connectionConfig.describeIdentityAttributes());
  this._connectionConfig = connectionConfig;
}

/**
 * Issues an HTTP request.
 *
 * @param {Object} options
 *
 * @returns {Object} an object representing the request that was issued.
 */
HttpClient.prototype.request = function (options) {
  Logger.getInstance().trace('Request%s - preparing for sending.', requestUtil.describeRequestFromOptions(options));

  const requestObject = {};
  const requestAbortController = new AbortController();
  const requestHandlers = { signal: requestAbortController.signal };
  const requestOptions = prepareRequestOptions.call(this, options, requestHandlers);

  let sendRequest = async function sendRequest() {
    Logger.getInstance().trace('Request%s - sending.', requestUtil.describeRequestFromOptions(requestOptions));
    const timer = new ExecutionTimer().start();
    requestObject.requestPromise = axios.request(requestOptions).then(response => {
      const httpResponseTime = timer.getDuration();
      Logger.getInstance().debug('Request%s - response received after %s milliseconds with status %s.', requestUtil.describeRequestFromOptions(requestOptions), httpResponseTime, response.status);
      sanitizeAxiosResponse(response);
      if (Util.isFunction(options.callback)) {
        Logger.getInstance().trace('Request%s - calling callback function.', requestUtil.describeRequestFromOptions(requestOptions));
        return options.callback(null, normalizeResponse(response), response.data);
      } else {
        Logger.getInstance().trace('Request%s - callback function was not provided.', requestUtil.describeRequestFromOptions(requestOptions));
        return null;
      }
    }).catch(err => {
      const httpResponseTime = timer.getDuration();
      Logger.getInstance().debug('Request%s - failed after %s milliseconds.', requestUtil.describeRequestFromOptions(requestOptions), httpResponseTime);
      sanitizeAxiosError(err);
      if (Util.isFunction(options.callback)) {
        if (err.response) { // axios returns error for not 2xx responses - let's unwrap it
          Logger.getInstance().trace('Request%s - calling callback function for error from response. Received code: ', requestUtil.describeRequestFromOptions(requestOptions), err.response.status);
          options.callback(null, normalizeResponse(err.response), err.response.data);
        } else {
          Logger.getInstance().trace('Request%s - calling callback function for error without response.', requestUtil.describeRequestFromOptions(requestOptions));
          options.callback(err, normalizeResponse(null), null);
        }
        return null;
      } else {
        Logger.getInstance().warn('Request%s - callback function was not provided. Error will be re-raised.', requestUtil.describeRequestFromOptions(requestOptions));
        throw err;
      }
    });
  };
  sendRequest = sendRequest.bind(this);

  Logger.getInstance().trace('Request%s - issued for the next tick.', requestUtil.describeRequestFromOptions(requestOptions));
  process.nextTick(sendRequest);

  // return an externalized request object that only contains
  // methods we're comfortable exposing to the outside world
  requestObject.abort = function () {
    if (requestAbortController) {
      Logger.getInstance().trace('Request%s - aborting.', requestUtil.describeRequestFromOptions(requestOptions));
      requestAbortController.abort();
      Logger.getInstance().debug('Request%s - aborted.', requestUtil.describeRequestFromOptions(requestOptions));
    }
  };

  return requestObject;
};

/**
 * Issues an HTTP request.
 *
 * @param {Object} options
 *
 * @returns {Object} an object representing the request that was issued.
 */
HttpClient.prototype.requestAsync = async function (options) {
  Logger.getInstance().trace('Request%s - preparing for async sending.', requestUtil.describeRequestFromOptions(options));
  const timer = new ExecutionTimer();
  try {
    const requestOptions = prepareRequestOptions.call(this, options);

    timer.start();
    const response = await axios.request(requestOptions);
    const httpResponseTime = timer.getDuration();
    Logger.getInstance().debug('Request%s - response received after %s milliseconds with status %s.', requestUtil.describeRequestFromOptions(requestOptions), httpResponseTime, response.status);
    parseResponseData(response);
    sanitizeAxiosResponse(response);
    return normalizeResponse(response);
  } catch (err) {
    const httpResponseTime = timer.getDuration();
    Logger.getInstance().debug('Request%s - failed after %s milliseconds. Error will be re-raised.', requestUtil.describeRequestFromOptions(options), httpResponseTime);
    sanitizeAxiosError(err);
    throw err;
  }
};

function parseResponseData(response) {
  Logger.getInstance().trace('Request%s - parsing response data.', requestUtil.describeRequestFromResponse(response));
  parseIfJSONData(response);
}

function parseIfJSONData(response) {
  if (Util.isString(response['data']) &&
      response['headers']['content-type'] === 'application/json') {
    response['json'] = response['data'];
    response['data'] = JSON.parse(response['data']);
  }
}

/**
 * Issues an HTTP POST request.
 *
 * @param {String} url
 * @param {String} body
 * @param {Object} options
 *
 * @returns {Object} an object representing the request that was issued.
 */
HttpClient.prototype.post = async function (url, body, options) {
  return this.requestAsync({
    url: url,
    method: 'POST',
    data: body,
    ...options
  });
};

/**
 * Issues an HTTP GET request.
 *
 * @param {String} url
 * @param {Object} params
 *
 * @returns {Object} an object representing the request that was issued.
 */
HttpClient.prototype.get = async function (url, params) {
  return this.requestAsync({
    url: url,
    method: 'GET',
    ...params,
  });
};

/**
 * Issues an HTTP HEAD request.
 *
 * @param {String} url
 * @param {Object} config
 *
 * @returns {Object} an object representing the request that was issued.
 */
HttpClient.prototype.head = async function (url, config) {
  return this.requestAsync({
    url: url,
    method: 'HEAD',
    ...config
  });
};

/**
 * Issues an HTTP PUT request.
 *
 * @param {String} url
 * @param {Object} data
 * @param {Object} config
 *
 * @returns {Object} an object representing the request that was issued.
 */
HttpClient.prototype.put = async function (url, data, config) {
  return this.requestAsync({
    url: url,
    method: 'PUT',
    data: data,
    ...config
  });
};

/**
 * @abstract
 * Returns the module to use when making HTTP requests. Subclasses must override
 * and provide their own implementations.
 *
 * @returns {*}
 */
HttpClient.prototype.getRequestModule = function () {
  return null;
};

/**
 * Returns the agent and proxy options.
 *
 * @returns {*}
 */
HttpClient.prototype.getAgent = function () {
  return null;
};

module.exports = HttpClient;

function sanitizeAxiosResponse(response) {
  Logger.getInstance().trace('Request%s - sanitizing response data.', requestUtil.describeRequestFromResponse(response));
  response.request = undefined;
  if (response.config) {
    response.config.data = undefined;
    response.config.headers = undefined;
  }
}

function sanitizeAxiosError(error) {
  error.request = undefined;
  error.config = undefined;
  if (error.response) {
    Logger.getInstance().trace('Request%s - sanitizing response error data.', requestUtil.describeRequestFromResponse(error.response));
    sanitizeAxiosResponse(error.response);
  }
}

function prepareRequestOptions(options, requestHandlers = {}) {
  Logger.getInstance().trace('Request%s - constructing options.', requestUtil.describeRequestFromOptions(options));
  const headers = normalizeHeaders(options.headers) || {};

  const timeout = options.timeout ||
    this._connectionConfig.getTimeout() ||
    DEFAULT_REQUEST_TIMEOUT;

  let data = options.data || options.json || options.body;

  if (data) {
    const bufferUncompressed = Buffer.from(JSON.stringify(data), 'utf8');
    zlib.gzip(bufferUncompressed, null, function (err, bufferCompressed) {
      // if the compression was successful
      if (!err) {
        data = bufferCompressed;
        headers['Content-Encoding'] = 'gzip';
        Logger.getInstance().debug('Request%s - original buffer length: %d bytes. Compressed buffer length: %d bytes.', requestUtil.describeRequestFromOptions(options), bufferUncompressed.buffer.byteLength, bufferCompressed.buffer.byteLength);
      } else {
        // Logging 'err' variable value should not be done, since it may contain compressed customer's data.
        // It can be added only for debugging purposes.
        Logger.getInstance().warn('Request%s - could not compress request data.', requestUtil.describeRequestFromOptions(options));
      }
    });
  }

  const params = options.params;

  let mock;
  if (this._connectionConfig.agentClass) {
    mock = {
      agentClass: this._connectionConfig.agentClass
    };
  }
  const backoffStrategy = this.constructExponentialBackoffStrategy();
  const requestOptions =  {
    method: options.method,
    url: options.url,
    headers: headers,
    data: data,
    params: params,
    timeout: timeout,
    requestOCSP: true,
    retryDelay: backoffStrategy,
    rejectUnauthorized: true,
    // we manually parse jsons or other structures from the server so they need to be text
    responseType: options.responseType || 'text',
    proxy: false,
    ...requestHandlers
  };

  const url = new URL(options.url);
  const isHttps = url.protocol === 'https:';
  const agent = this.getAgent(url, this._connectionConfig.getProxy(), mock);
  if (isHttps) {
    requestOptions.httpsAgent = agent;
  } else {
    requestOptions.httpAgent = agent;
  }

  Logger.getInstance().debug('Request%s - options - timeout: %s, retryDelay: %s, responseType: %s', requestUtil.describeRequestFromOptions(options), requestOptions.timeout, requestOptions.retryDelay, requestOptions.responseType);
  return requestOptions;
}

/**
 * Normalizes a request headers object so that we get the same behavior
 * regardless of whether we're using request.js or browser-request.js.
 *
 * @param {Object} headers
 *
 * @returns {Object}
 */
function normalizeHeaders(headers) {
  Logger.getInstance().trace('Normalizing headers');
  if (Util.isObject(headers)) {
    const normalizedHeaders = {
      'user-agent': Util.userAgent
    };

    // shallow copy the headers object and convert some headers like 'Accept'
    // and 'Content-Type' to lower case while copying; this is necessary
    // because the browser-request module, which we use to make http requests in
    // the browser, does not do case-insensitive checks when deciding whether to
    // insert default values for the 'accept' and 'content-type' headers; in
    // otherwise, if someone specifies an 'Accept': 'application/json' header,
    // browser-request will inject its own 'accept': 'application/json' header
    // and the browser XMLHttpRequest object will concatenate the two values and
    // send 'Accept': 'application/json, application/json' with the request
    let headerNameLowerCase;
    for (const headerName in headers) {
      if (Object.prototype.hasOwnProperty.call(headers, headerName)) {
        headerNameLowerCase = headerName.toLowerCase();
        if ((headerNameLowerCase === 'accept') ||
          (headerNameLowerCase === 'content-type')) {
          normalizedHeaders[headerNameLowerCase] = headers[headerName];
        } else {
          normalizedHeaders[headerName] = headers[headerName];
        }
      }
    }
    Logger.getInstance().trace('Headers were normalized');
    return normalizedHeaders;
  } else {
    Logger.getInstance().trace('Headers were not an object. Original value will be returned.');
    return headers;
  }

}

/**
 * Normalizes the response object so that we can extract response headers from
 * it in a uniform way regardless of whether we're using request.js or
 * browser-request.js.
 *
 * @param {Object} response
 *
 * @return {Object}
 */
function normalizeResponse(response) {
  // if the response doesn't already have a getResponseHeader() method, add one
  if (response && !response.getResponseHeader) {
    Logger.getInstance().trace('Request%s - normalizing.', requestUtil.describeRequestFromResponse(response));
    response.getResponseHeader = function (header) {
      return response.headers && response.headers[
        Util.isString(header) ? header.toLowerCase() : header];
    };
  }

  if (response) {
    response.body = response.data; // converting axios response body to old expected body attribute
    response.statusCode = response.status; // converting axios status to old expected statusCode
  }

  return response;
}
