Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');
const types = require('../types.js');

const SENTRY_XHR_DATA_KEY = '__sentry_xhr_v3__';

/**
 * Add an instrumentation handler for when an XHR request happens.
 * The handler function is called once when the request starts and once when it ends,
 * which can be identified by checking if it has an `endTimestamp`.
 *
 * Use at your own risk, this might break without changelog notice, only used internally.
 * @hidden
 */
function addXhrInstrumentationHandler(handler) {
  const type = 'xhr';
  core.addHandler(type, handler);
  core.maybeInstrument(type, instrumentXHR);
}

/** Exported only for tests. */
function instrumentXHR() {
  if (!(types.WINDOW ).XMLHttpRequest) {
    return;
  }

  const xhrproto = XMLHttpRequest.prototype;

  // eslint-disable-next-line @typescript-eslint/unbound-method
  xhrproto.open = new Proxy(xhrproto.open, {
    apply(
      originalOpen,
      xhrOpenThisArg,
      xhrOpenArgArray

,
    ) {
      // NOTE: If you are a Sentry user, and you are seeing this stack frame,
      //       it means the error, that was caused by your XHR call did not
      //       have a stack trace. If you are using HttpClient integration,
      //       this is the expected behavior, as we are using this virtual error to capture
      //       the location of your XHR call, and group your HttpClient events accordingly.
      const virtualError = new Error();

      const startTimestamp = core.timestampInSeconds() * 1000;

      // open() should always be called with two or more arguments
      // But to be on the safe side, we actually validate this and bail out if we don't have a method & url
      const method = core.isString(xhrOpenArgArray[0]) ? xhrOpenArgArray[0].toUpperCase() : undefined;
      const url = parseXhrUrlArg(xhrOpenArgArray[1]);

      if (!method || !url) {
        return originalOpen.apply(xhrOpenThisArg, xhrOpenArgArray);
      }

      xhrOpenThisArg[SENTRY_XHR_DATA_KEY] = {
        method,
        url,
        request_headers: {},
      };

      // if Sentry key appears in URL, don't capture it as a request
      if (method === 'POST' && url.match(/sentry_key/)) {
        xhrOpenThisArg.__sentry_own_request__ = true;
      }

      const onreadystatechangeHandler = () => {
        // For whatever reason, this is not the same instance here as from the outer method
        const xhrInfo = xhrOpenThisArg[SENTRY_XHR_DATA_KEY];

        if (!xhrInfo) {
          return;
        }

        if (xhrOpenThisArg.readyState === 4) {
          try {
            // touching statusCode in some platforms throws
            // an exception
            xhrInfo.status_code = xhrOpenThisArg.status;
          } catch {
            /* do nothing */
          }

          const handlerData = {
            endTimestamp: core.timestampInSeconds() * 1000,
            startTimestamp,
            xhr: xhrOpenThisArg,
            virtualError,
          };
          core.triggerHandlers('xhr', handlerData);
        }
      };

      if ('onreadystatechange' in xhrOpenThisArg && typeof xhrOpenThisArg.onreadystatechange === 'function') {
        xhrOpenThisArg.onreadystatechange = new Proxy(xhrOpenThisArg.onreadystatechange, {
          apply(originalOnreadystatechange, onreadystatechangeThisArg, onreadystatechangeArgArray) {
            onreadystatechangeHandler();
            return originalOnreadystatechange.apply(onreadystatechangeThisArg, onreadystatechangeArgArray);
          },
        });
      } else {
        xhrOpenThisArg.addEventListener('readystatechange', onreadystatechangeHandler);
      }

      // Intercepting `setRequestHeader` to access the request headers of XHR instance.
      // This will only work for user/library defined headers, not for the default/browser-assigned headers.
      // Request cookies are also unavailable for XHR, as `Cookie` header can't be defined by `setRequestHeader`.
      xhrOpenThisArg.setRequestHeader = new Proxy(xhrOpenThisArg.setRequestHeader, {
        apply(
          originalSetRequestHeader,
          setRequestHeaderThisArg,
          setRequestHeaderArgArray,
        ) {
          const [header, value] = setRequestHeaderArgArray;

          const xhrInfo = setRequestHeaderThisArg[SENTRY_XHR_DATA_KEY];

          if (xhrInfo && core.isString(header) && core.isString(value)) {
            xhrInfo.request_headers[header.toLowerCase()] = value;
          }

          return originalSetRequestHeader.apply(setRequestHeaderThisArg, setRequestHeaderArgArray);
        },
      });

      return originalOpen.apply(xhrOpenThisArg, xhrOpenArgArray);
    },
  });

  // eslint-disable-next-line @typescript-eslint/unbound-method
  xhrproto.send = new Proxy(xhrproto.send, {
    apply(originalSend, sendThisArg, sendArgArray) {
      const sentryXhrData = sendThisArg[SENTRY_XHR_DATA_KEY];

      if (!sentryXhrData) {
        return originalSend.apply(sendThisArg, sendArgArray);
      }

      if (sendArgArray[0] !== undefined) {
        sentryXhrData.body = sendArgArray[0];
      }

      const handlerData = {
        startTimestamp: core.timestampInSeconds() * 1000,
        xhr: sendThisArg,
      };
      core.triggerHandlers('xhr', handlerData);

      return originalSend.apply(sendThisArg, sendArgArray);
    },
  });
}

/**
 * Parses the URL argument of a XHR method to a string.
 *
 * See: https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/open#url
 * url: A string or any other object with a stringifier — including a URL object — that provides the URL of the resource to send the request to.
 *
 * @param url - The URL argument of an XHR method
 * @returns The parsed URL string or undefined if the URL is invalid
 */
function parseXhrUrlArg(url) {
  if (core.isString(url)) {
    return url;
  }

  try {
    // If the passed in argument is not a string, it should have a `toString` method as a stringifier.
    // If that fails, we just return undefined (like in IE11 where URL is not available)
    return (url ).toString();
  } catch {} // eslint-disable-line no-empty

  return undefined;
}

exports.SENTRY_XHR_DATA_KEY = SENTRY_XHR_DATA_KEY;
exports.addXhrInstrumentationHandler = addXhrInstrumentationHandler;
exports.instrumentXHR = instrumentXHR;
//# sourceMappingURL=xhr.js.map
