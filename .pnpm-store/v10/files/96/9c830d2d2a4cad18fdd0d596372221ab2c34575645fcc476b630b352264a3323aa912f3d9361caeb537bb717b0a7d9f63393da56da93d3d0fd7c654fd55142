const EventEmitter = require('events').EventEmitter;
const Util = require('../util');
const Errors = require('../errors');
const Logger = require('../logger');
const ErrorCodes = Errors.codes;

/**
 * Creates a new instance of an LargeResultSetService.
 *
 * @param {Object} connectionConfig
 * @param {Object} httpClient
 * @constructor
 */
function LargeResultSetService(connectionConfig, httpClient) {
  // validate input
  Errors.assertInternal(Util.isObject(connectionConfig));
  Errors.assertInternal(Util.isObject(httpClient));

  /**
   * Should HTTP client error be retried
   * @param err Client error or null/undefined
   * @return {boolean}
   */
  function isRetryableClientError(err) {
    return err && (
      err.code === 'ECONNRESET' ||
        err.code === 'ETIMEDOUT' ||
        // error code ECONNABORTED is thrown from axios on timeout
        (err.name === 'AxiosError' && err.code === 'ECONNABORTED')
    );
  }

  function isRetryableError(response, err) {
    // https://aws.amazon.com/articles/1904 (Handling Errors)
    // Note: 403's are retried because of a bug in S3/Blob
    return Util.isRetryableHttpError(response, true) || isRetryableClientError(err);
  }

  function isUnsuccessfulResponse(response) {
    // even for 200 OK S3 can return xml error (large files are normally binary)
    return response && (response.statusCode !== 200 || response.getResponseHeader('Content-Type') === 'application/xml');
  }

  /**
   * Issues a request to get an object from S3/Blob.
   *
   * @param {Object} options
   */
  this.getObject = function getObject(options) {
    let numRetries = 0, sleep = 1;

    // get the maximum number of retries
    let maxNumRetries = options.maxNumRetries;
    if (!Util.exists(maxNumRetries)) {
      maxNumRetries = connectionConfig.getRetryLargeResultSetMaxNumRetries();
    }
    Errors.assertInternal(Util.isNumber(maxNumRetries) && maxNumRetries >= 0);

    // invoked when the request completes
    const callback = function callback(err, response, body) {
      // err happens on timeouts and response is passed when server responded
      if (err || isUnsuccessfulResponse(response)) {
        // if we're running in DEBUG loglevel, probably we want to see the full error too
        const logErr = err ? JSON.stringify(err, Object.getOwnPropertyNames(err))
          : `status: ${JSON.stringify(response.status)} ${JSON.stringify(response.statusText)}`
            + ` headers: ${JSON.stringify(response.headers)}`;
        Logger.getInstance().debug('Encountered an error when getting data from cloud storage: ' + logErr);
        // if we haven't exceeded the maximum number of retries yet and the
        // server came back with a retryable error code.
        if (numRetries < maxNumRetries && isRetryableError(response, err)) {
          // increment the number of retries
          numRetries++;

          // use exponential backoff with decorrelated jitter to compute the
          // next sleep time:
          const cap = connectionConfig.getRetryLargeResultSetMaxSleepTime();
          sleep = Util.nextSleepTime(1, cap, sleep);

          // wait the appropriate amount of time before retrying the request
          const nextSendRequestWaitTimeMs = sleep * 1000;
          Logger.getInstance().trace('Request will be retried after %d milliseconds', Math.floor(nextSendRequestWaitTimeMs));
          setTimeout(sendRequest, nextSendRequestWaitTimeMs);
          return;
        } else {
          Logger.getInstance().trace('Request won\'t be retried');
          if (isUnsuccessfulResponse(response)) {
            err = Errors.createLargeResultSetError(ErrorCodes.ERR_LARGE_RESULT_SET_RESPONSE_FAILURE, response);
          } else {
            err = Errors.createNetworkError(ErrorCodes.ERR_LARGE_RESULT_SET_NETWORK_COULD_NOT_CONNECT, err);
          }
        }
      }
      if (response) {
        Logger.getInstance().trace(`Response headers are: ${JSON.stringify(response.headers)}`);
      }
      // if we have an error, clear the body
      if (err) {
        body = null;
      }

      // if a callback was specified, invoke it
      if (Util.isFunction(options.callback)) {
        try {
          options.callback(err, body);
        } catch (e) {
          Logger.getInstance().error(`Callback failed with ${e}`);
        }
      }
    };

    const sendRequest = function sendRequest() {
      // issue a request to get the object from S3/Blob
      httpClient.request(
        {
          method: 'GET',
          url: options.url,
          headers: options.headers,
          gzip: true, // gunzip the response
          appendRequestId: false,
          callback,
        });
    };

    sendRequest();
  };
}

Util.inherits(LargeResultSetService, EventEmitter);

module.exports = LargeResultSetService;
