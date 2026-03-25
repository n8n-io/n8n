'use strict';

const {PassThrough} = require('stream');
const extend = require('extend');

let debug = () => {};
if (
  typeof process !== 'undefined' &&
  'env' in process &&
  typeof process.env === 'object' &&
  process.env.DEBUG === 'retry-request'
) {
  debug = message => {
    console.log('retry-request:', message);
  };
}

const DEFAULTS = {
  objectMode: false,
  retries: 2,

  /*
    The maximum time to delay in seconds. If retryDelayMultiplier results in a
    delay greater than maxRetryDelay, retries should delay by maxRetryDelay
    seconds instead.
  */
  maxRetryDelay: 64,

  /*
    The multiplier by which to increase the delay time between the completion of
    failed requests, and the initiation of the subsequent retrying request.
  */
  retryDelayMultiplier: 2,

  /*
    The length of time to keep retrying in seconds. The last sleep period will
    be shortened as necessary, so that the last retry runs at deadline (and not
    considerably beyond it).  The total time starting from when the initial
    request is sent, after which an error will be returned, regardless of the
    retrying attempts made meanwhile.
   */
  totalTimeout: 600,

  noResponseRetries: 2,
  currentRetryAttempt: 0,
  shouldRetryFn: function (response) {
    const retryRanges = [
      // https://en.wikipedia.org/wiki/List_of_HTTP_status_codes
      // 1xx - Retry (Informational, request still processing)
      // 2xx - Do not retry (Success)
      // 3xx - Do not retry (Redirect)
      // 4xx - Do not retry (Client errors)
      // 429 - Retry ("Too Many Requests")
      // 5xx - Retry (Server errors)
      [100, 199],
      [429, 429],
      [500, 599],
    ];

    const statusCode = response.statusCode;
    debug(`Response status: ${statusCode}`);

    let range;
    while ((range = retryRanges.shift())) {
      if (statusCode >= range[0] && statusCode <= range[1]) {
        // Not a successful status or redirect.
        return true;
      }
    }
  },
};

function retryRequest(requestOpts, opts, callback) {
  if (typeof requestOpts === 'string') {
    requestOpts = {url: requestOpts};
  }

  const streamMode = typeof arguments[arguments.length - 1] !== 'function';

  if (typeof opts === 'function') {
    callback = opts;
  }

  const manualCurrentRetryAttemptWasSet =
    opts && typeof opts.currentRetryAttempt === 'number';
  opts = extend({}, DEFAULTS, opts);

  if (typeof opts.request === 'undefined') {
    throw new Error('A request library must be provided to retry-request.');
  }

  let currentRetryAttempt = opts.currentRetryAttempt;

  let numNoResponseAttempts = 0;
  let streamResponseHandled = false;

  let retryStream;
  let requestStream;
  let delayStream;

  let activeRequest;
  const retryRequest = {
    abort: function () {
      if (activeRequest && activeRequest.abort) {
        activeRequest.abort();
      }
    },
  };

  if (streamMode) {
    retryStream = new PassThrough({objectMode: opts.objectMode});
    retryStream.abort = resetStreams;
  }

  const timeOfFirstRequest = Date.now();
  if (currentRetryAttempt > 0) {
    retryAfterDelay(currentRetryAttempt);
  } else {
    makeRequest();
  }

  if (streamMode) {
    return retryStream;
  } else {
    return retryRequest;
  }

  function resetStreams() {
    delayStream = null;

    if (requestStream) {
      requestStream.abort && requestStream.abort();
      requestStream.cancel && requestStream.cancel();

      if (requestStream.destroy) {
        requestStream.destroy();
      } else if (requestStream.end) {
        requestStream.end();
      }
    }
  }

  function makeRequest() {
    let finishHandled = false;
    currentRetryAttempt++;
    debug(`Current retry attempt: ${currentRetryAttempt}`);

    function handleFinish(args = []) {
      if (!finishHandled) {
        finishHandled = true;
        retryStream.emit('complete', ...args);
      }
    }

    if (streamMode) {
      streamResponseHandled = false;

      delayStream = new PassThrough({objectMode: opts.objectMode});
      requestStream = opts.request(requestOpts);

      setImmediate(() => {
        retryStream.emit('request');
      });

      requestStream
        // gRPC via google-cloud-node can emit an `error` as well as a `response`
        // Whichever it emits, we run with-- we can't run with both. That's what
        // is up with the `streamResponseHandled` tracking.
        .on('error', err => {
          if (streamResponseHandled) {
            return;
          }

          streamResponseHandled = true;
          onResponse(err);
        })
        .on('response', (resp, body) => {
          if (streamResponseHandled) {
            return;
          }

          streamResponseHandled = true;
          onResponse(null, resp, body);
        })
        .on('complete', (...params) => handleFinish(params))
        .on('finish', (...params) => handleFinish(params));

      requestStream.pipe(delayStream);
    } else {
      activeRequest = opts.request(requestOpts, onResponse);
    }
  }

  function retryAfterDelay(currentRetryAttempt) {
    if (streamMode) {
      resetStreams();
    }

    const nextRetryDelay = getNextRetryDelay({
      maxRetryDelay: opts.maxRetryDelay,
      retryDelayMultiplier: opts.retryDelayMultiplier,
      retryNumber: currentRetryAttempt,
      timeOfFirstRequest,
      totalTimeout: opts.totalTimeout,
    });
    debug(`Next retry delay: ${nextRetryDelay}`);

    if (nextRetryDelay <= 0) {
      numNoResponseAttempts = opts.noResponseRetries + 1;
      return;
    }

    setTimeout(makeRequest, nextRetryDelay);
  }

  function onResponse(err, response, body) {
    // An error such as DNS resolution.
    if (err) {
      numNoResponseAttempts++;

      if (numNoResponseAttempts <= opts.noResponseRetries) {
        retryAfterDelay(numNoResponseAttempts);
      } else {
        if (streamMode) {
          retryStream.emit('error', err);
          retryStream.end();
        } else {
          callback(err, response, body);
        }
      }

      return;
    }

    // Send the response to see if we should try again.
    // NOTE: "currentRetryAttempt" isn't accurate by default, as it counts
    // the very first request sent as the first "retry". It is only accurate
    // when a user provides their own "currentRetryAttempt" option at
    // instantiation.
    const adjustedCurrentRetryAttempt = manualCurrentRetryAttemptWasSet
      ? currentRetryAttempt
      : currentRetryAttempt - 1;
    if (
      adjustedCurrentRetryAttempt < opts.retries &&
      opts.shouldRetryFn(response)
    ) {
      retryAfterDelay(currentRetryAttempt);
      return;
    }

    // No more attempts need to be made, just continue on.
    if (streamMode) {
      retryStream.emit('response', response);
      delayStream.pipe(retryStream);
      requestStream.on('error', err => {
        retryStream.destroy(err);
      });
    } else {
      callback(err, response, body);
    }
  }
}

module.exports = retryRequest;

function getNextRetryDelay(config) {
  const {
    maxRetryDelay,
    retryDelayMultiplier,
    retryNumber,
    timeOfFirstRequest,
    totalTimeout,
  } = config;

  const maxRetryDelayMs = maxRetryDelay * 1000;
  const totalTimeoutMs = totalTimeout * 1000;

  const jitter = Math.floor(Math.random() * 1000);
  const calculatedNextRetryDelay =
    Math.pow(retryDelayMultiplier, retryNumber) * 1000 + jitter;

  const maxAllowableDelayMs =
    totalTimeoutMs - (Date.now() - timeOfFirstRequest);

  return Math.min(
    calculatedNextRetryDelay,
    maxAllowableDelayMs,
    maxRetryDelayMs
  );
}

module.exports.defaults = DEFAULTS;
module.exports.getNextRetryDelay = getNextRetryDelay;
