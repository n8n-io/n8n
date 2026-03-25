import { defineIntegration, supportsNativeFetch, addFetchInstrumentationHandler, getClient, GLOBAL_OBJ, debug, captureEvent, isSentryRequestUrl, addExceptionMechanism } from '@sentry/core';
import { addXhrInstrumentationHandler, SENTRY_XHR_DATA_KEY } from '@sentry-internal/browser-utils';
import { DEBUG_BUILD } from '../debug-build.js';

const INTEGRATION_NAME = 'HttpClient';

const _httpClientIntegration = ((options = {}) => {
  const _options = {
    failedRequestStatusCodes: [[500, 599]],
    failedRequestTargets: [/.*/],
    ...options,
  };

  return {
    name: INTEGRATION_NAME,
    setup(client) {
      _wrapFetch(client, _options);
      _wrapXHR(client, _options);
    },
  };
}) ;

/**
 * Create events for failed client side HTTP requests.
 */
const httpClientIntegration = defineIntegration(_httpClientIntegration);

/**
 * Interceptor function for fetch requests
 *
 * @param requestInfo The Fetch API request info
 * @param response The Fetch API response
 * @param requestInit The request init object
 */
function _fetchResponseHandler(
  options,
  requestInfo,
  response,
  requestInit,
  error,
) {
  if (_shouldCaptureResponse(options, response.status, response.url)) {
    const request = _getRequest(requestInfo, requestInit);

    let requestHeaders, responseHeaders, requestCookies, responseCookies;

    if (_shouldSendDefaultPii()) {
      [requestHeaders, requestCookies] = _parseCookieHeaders('Cookie', request);
      [responseHeaders, responseCookies] = _parseCookieHeaders('Set-Cookie', response);
    }

    const event = _createEvent({
      url: request.url,
      method: request.method,
      status: response.status,
      requestHeaders,
      responseHeaders,
      requestCookies,
      responseCookies,
      error,
      type: 'fetch',
    });

    captureEvent(event);
  }
}

function _parseCookieHeaders(
  cookieHeader,
  obj,
) {
  const headers = _extractFetchHeaders(obj.headers);
  let cookies;

  try {
    const cookieString = headers[cookieHeader] || headers[cookieHeader.toLowerCase()] || undefined;

    if (cookieString) {
      cookies = _parseCookieString(cookieString);
    }
  } catch {
    // ignore it if parsing fails
  }

  return [headers, cookies];
}

/**
 * Interceptor function for XHR requests
 *
 * @param xhr The XHR request
 * @param method The HTTP method
 * @param headers The HTTP headers
 */
function _xhrResponseHandler(
  options,
  xhr,
  method,
  headers,
  error,
) {
  if (_shouldCaptureResponse(options, xhr.status, xhr.responseURL)) {
    let requestHeaders, responseCookies, responseHeaders;

    if (_shouldSendDefaultPii()) {
      try {
        const cookieString = xhr.getResponseHeader('Set-Cookie') || xhr.getResponseHeader('set-cookie') || undefined;

        if (cookieString) {
          responseCookies = _parseCookieString(cookieString);
        }
      } catch {
        // ignore it if parsing fails
      }

      try {
        responseHeaders = _getXHRResponseHeaders(xhr);
      } catch {
        // ignore it if parsing fails
      }

      requestHeaders = headers;
    }

    const event = _createEvent({
      url: xhr.responseURL,
      method,
      status: xhr.status,
      requestHeaders,
      // Can't access request cookies from XHR
      responseHeaders,
      responseCookies,
      error,
      type: 'xhr',
    });

    captureEvent(event);
  }
}

/**
 * Extracts response size from `Content-Length` header when possible
 *
 * @param headers
 * @returns The response size in bytes or undefined
 */
function _getResponseSizeFromHeaders(headers) {
  if (headers) {
    const contentLength = headers['Content-Length'] || headers['content-length'];

    if (contentLength) {
      return parseInt(contentLength, 10);
    }
  }

  return undefined;
}

/**
 * Creates an object containing cookies from the given cookie string
 *
 * @param cookieString The cookie string to parse
 * @returns The parsed cookies
 */
function _parseCookieString(cookieString) {
  return cookieString.split('; ').reduce((acc, cookie) => {
    const [key, value] = cookie.split('=');
    if (key && value) {
      acc[key] = value;
    }
    return acc;
  }, {});
}

/**
 * Extracts the headers as an object from the given Fetch API request or response object
 *
 * @param headers The headers to extract
 * @returns The extracted headers as an object
 */
function _extractFetchHeaders(headers) {
  const result = {};

  headers.forEach((value, key) => {
    result[key] = value;
  });

  return result;
}

/**
 * Extracts the response headers as an object from the given XHR object
 *
 * @param xhr The XHR object to extract the response headers from
 * @returns The response headers as an object
 */
function _getXHRResponseHeaders(xhr) {
  const headers = xhr.getAllResponseHeaders();

  if (!headers) {
    return {};
  }

  return headers.split('\r\n').reduce((acc, line) => {
    const [key, value] = line.split(': ');
    if (key && value) {
      acc[key] = value;
    }
    return acc;
  }, {});
}

/**
 * Checks if the given target url is in the given list of targets
 *
 * @param target The target url to check
 * @returns true if the target url is in the given list of targets, false otherwise
 */
function _isInGivenRequestTargets(
  failedRequestTargets,
  target,
) {
  return failedRequestTargets.some((givenRequestTarget) => {
    if (typeof givenRequestTarget === 'string') {
      return target.includes(givenRequestTarget);
    }

    return givenRequestTarget.test(target);
  });
}

/**
 * Checks if the given status code is in the given range
 *
 * @param status The status code to check
 * @returns true if the status code is in the given range, false otherwise
 */
function _isInGivenStatusRanges(
  failedRequestStatusCodes,
  status,
) {
  return failedRequestStatusCodes.some((range) => {
    if (typeof range === 'number') {
      return range === status;
    }

    return status >= range[0] && status <= range[1];
  });
}

/**
 * Wraps `fetch` function to capture request and response data
 */
function _wrapFetch(client, options) {
  if (!supportsNativeFetch()) {
    return;
  }

  addFetchInstrumentationHandler(handlerData => {
    if (getClient() !== client) {
      return;
    }

    const { response, args, error, virtualError } = handlerData;
    const [requestInfo, requestInit] = args ;

    if (!response) {
      return;
    }

    _fetchResponseHandler(options, requestInfo, response , requestInit, error || virtualError);
  }, false);
}

/**
 * Wraps XMLHttpRequest to capture request and response data
 */
function _wrapXHR(client, options) {
  if (!('XMLHttpRequest' in GLOBAL_OBJ)) {
    return;
  }

  addXhrInstrumentationHandler(handlerData => {
    if (getClient() !== client) {
      return;
    }

    const { error, virtualError } = handlerData;

    const xhr = handlerData.xhr ;

    const sentryXhrData = xhr[SENTRY_XHR_DATA_KEY];

    if (!sentryXhrData) {
      return;
    }

    const { method, request_headers: headers } = sentryXhrData;

    try {
      _xhrResponseHandler(options, xhr, method, headers, error || virtualError);
    } catch (e) {
      DEBUG_BUILD && debug.warn('Error while extracting response event form XHR response', e);
    }
  });
}

/**
 * Checks whether to capture given response as an event
 *
 * @param status response status code
 * @param url response url
 */
function _shouldCaptureResponse(options, status, url) {
  return (
    _isInGivenStatusRanges(options.failedRequestStatusCodes, status) &&
    _isInGivenRequestTargets(options.failedRequestTargets, url) &&
    !isSentryRequestUrl(url, getClient())
  );
}

/**
 * Creates a synthetic Sentry event from given response data
 *
 * @param data response data
 * @returns event
 */
function _createEvent(data

) {
  const client = getClient();
  const virtualStackTrace = client && data.error && data.error instanceof Error ? data.error.stack : undefined;
  // Remove the first frame from the stack as it's the HttpClient call
  const stack = virtualStackTrace && client ? client.getOptions().stackParser(virtualStackTrace, 0, 1) : undefined;
  const message = `HTTP Client Error with status code: ${data.status}`;

  const event = {
    message,
    exception: {
      values: [
        {
          type: 'Error',
          value: message,
          stacktrace: stack ? { frames: stack } : undefined,
        },
      ],
    },
    request: {
      url: data.url,
      method: data.method,
      headers: data.requestHeaders,
      cookies: data.requestCookies,
    },
    contexts: {
      response: {
        status_code: data.status,
        headers: data.responseHeaders,
        cookies: data.responseCookies,
        body_size: _getResponseSizeFromHeaders(data.responseHeaders),
      },
    },
  };

  addExceptionMechanism(event, {
    type: `auto.http.client.${data.type}`,
    handled: false,
  });

  return event;
}

function _getRequest(requestInfo, requestInit) {
  if (!requestInit && requestInfo instanceof Request) {
    return requestInfo;
  }

  // If both are set, we try to construct a new Request with the given arguments
  // However, if e.g. the original request has a `body`, this will throw an error because it was already accessed
  // In this case, as a fallback, we just use the original request - using both is rather an edge case
  if (requestInfo instanceof Request && requestInfo.bodyUsed) {
    return requestInfo;
  }

  return new Request(requestInfo, requestInit);
}

function _shouldSendDefaultPii() {
  const client = getClient();
  return client ? Boolean(client.getOptions().sendDefaultPii) : false;
}

export { httpClientIntegration };
//# sourceMappingURL=httpclient.js.map
