Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const currentScopes = require('../currentScopes.js');
const is = require('../utils/is.js');
const object = require('../utils/object.js');
const supports = require('../utils/supports.js');
const time = require('../utils/time.js');
const worldwide = require('../utils/worldwide.js');
const handlers = require('./handlers.js');

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Add an instrumentation handler for when a fetch request happens.
 * The handler function is called once when the request starts and once when it ends,
 * which can be identified by checking if it has an `endTimestamp`.
 *
 * Use at your own risk, this might break without changelog notice, only used internally.
 * @hidden
 */
function addFetchInstrumentationHandler(
  handler,
  skipNativeFetchCheck,
) {
  const type = 'fetch';
  handlers.addHandler(type, handler);
  handlers.maybeInstrument(type, () => instrumentFetch(undefined, skipNativeFetchCheck));
}

/**
 * Add an instrumentation handler for long-lived fetch requests, like consuming server-sent events (SSE) via fetch.
 * The handler will resolve the request body and emit the actual `endTimestamp`, so that the
 * span can be updated accordingly.
 *
 * Only used internally
 * @hidden
 */
function addFetchEndInstrumentationHandler(handler) {
  const type = 'fetch-body-resolved';
  handlers.addHandler(type, handler);
  handlers.maybeInstrument(type, () => instrumentFetch(streamHandler));
}

function instrumentFetch(onFetchResolved, skipNativeFetchCheck = false) {
  if (skipNativeFetchCheck && !supports.supportsNativeFetch()) {
    return;
  }

  object.fill(worldwide.GLOBAL_OBJ, 'fetch', function (originalFetch) {
    return function (...args) {
      // We capture the error right here and not in the Promise error callback because Safari (and probably other
      // browsers too) will wipe the stack trace up to this point, only leaving us with this file which is useless.

      // NOTE: If you are a Sentry user, and you are seeing this stack frame,
      //       it means the error, that was caused by your fetch call did not
      //       have a stack trace, so the SDK backfilled the stack trace so
      //       you can see which fetch call failed.
      const virtualError = new Error();

      const { method, url } = parseFetchArgs(args);
      const handlerData = {
        args,
        fetchData: {
          method,
          url,
        },
        startTimestamp: time.timestampInSeconds() * 1000,
        // // Adding the error to be able to fingerprint the failed fetch event in HttpClient instrumentation
        virtualError,
        headers: getHeadersFromFetchArgs(args),
      };

      // if there is no callback, fetch is instrumented directly
      if (!onFetchResolved) {
        handlers.triggerHandlers('fetch', {
          ...handlerData,
        });
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      return originalFetch.apply(worldwide.GLOBAL_OBJ, args).then(
        async (response) => {
          if (onFetchResolved) {
            onFetchResolved(response);
          } else {
            handlers.triggerHandlers('fetch', {
              ...handlerData,
              endTimestamp: time.timestampInSeconds() * 1000,
              response,
            });
          }

          return response;
        },
        (error) => {
          handlers.triggerHandlers('fetch', {
            ...handlerData,
            endTimestamp: time.timestampInSeconds() * 1000,
            error,
          });

          if (is.isError(error) && error.stack === undefined) {
            // NOTE: If you are a Sentry user, and you are seeing this stack frame,
            //       it means the error, that was caused by your fetch call did not
            //       have a stack trace, so the SDK backfilled the stack trace so
            //       you can see which fetch call failed.
            error.stack = virtualError.stack;
            object.addNonEnumerableProperty(error, 'framesToPop', 1);
          }

          // We enhance fetch error messages with hostname information based on the configuration.
          // Possible messages we handle here:
          // * "Failed to fetch" (chromium)
          // * "Load failed" (webkit)
          // * "NetworkError when attempting to fetch resource." (firefox)
          const client = currentScopes.getClient();
          const enhanceOption = client?.getOptions().enhanceFetchErrorMessages ?? 'always';
          const shouldEnhance = enhanceOption !== false;

          if (
            shouldEnhance &&
            error instanceof TypeError &&
            (error.message === 'Failed to fetch' ||
              error.message === 'Load failed' ||
              error.message === 'NetworkError when attempting to fetch resource.')
          ) {
            try {
              const url = new URL(handlerData.fetchData.url);
              const hostname = url.host;

              if (enhanceOption === 'always') {
                // Modify the error message directly
                error.message = `${error.message} (${hostname})`;
              } else {
                // Store hostname as non-enumerable property for Sentry-only enhancement
                // This preserves the original error message for third-party packages
                object.addNonEnumerableProperty(error, '__sentry_fetch_url_host__', hostname);
              }
            } catch {
              // ignore it if errors happen here
            }
          }

          // NOTE: If you are a Sentry user, and you are seeing this stack frame,
          //       it means the sentry.javascript SDK caught an error invoking your application code.
          //       This is expected behavior and NOT indicative of a bug with sentry.javascript.
          throw error;
        },
      );
    };
  });
}

async function resolveResponse(res, onFinishedResolving) {
  if (res?.body) {
    const body = res.body;
    const responseReader = body.getReader();

    // Define a maximum duration after which we just cancel
    const maxFetchDurationTimeout = setTimeout(
      () => {
        body.cancel().then(null, () => {
          // noop
        });
      },
      90 * 1000, // 90s
    );

    let readingActive = true;
    while (readingActive) {
      let chunkTimeout;
      try {
        // abort reading if read op takes more than 5s
        chunkTimeout = setTimeout(() => {
          body.cancel().then(null, () => {
            // noop on error
          });
        }, 5000);

        // This .read() call will reject/throw when we abort due to timeouts through `body.cancel()`
        const { done } = await responseReader.read();

        clearTimeout(chunkTimeout);

        if (done) {
          onFinishedResolving();
          readingActive = false;
        }
      } catch {
        readingActive = false;
      } finally {
        clearTimeout(chunkTimeout);
      }
    }

    clearTimeout(maxFetchDurationTimeout);

    responseReader.releaseLock();
    body.cancel().then(null, () => {
      // noop on error
    });
  }
}

function streamHandler(response) {
  // clone response for awaiting stream
  let clonedResponseForResolving;
  try {
    clonedResponseForResolving = response.clone();
  } catch {
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  resolveResponse(clonedResponseForResolving, () => {
    handlers.triggerHandlers('fetch-body-resolved', {
      endTimestamp: time.timestampInSeconds() * 1000,
      response,
    });
  });
}

function hasProp(obj, prop) {
  return !!obj && typeof obj === 'object' && !!(obj )[prop];
}

function getUrlFromResource(resource) {
  if (typeof resource === 'string') {
    return resource;
  }

  if (!resource) {
    return '';
  }

  if (hasProp(resource, 'url')) {
    return resource.url;
  }

  if (resource.toString) {
    return resource.toString();
  }

  return '';
}

/**
 * Parses the fetch arguments to find the used Http method and the url of the request.
 * Exported for tests only.
 */
function parseFetchArgs(fetchArgs) {
  if (fetchArgs.length === 0) {
    return { method: 'GET', url: '' };
  }

  if (fetchArgs.length === 2) {
    const [resource, options] = fetchArgs ;

    return {
      url: getUrlFromResource(resource),
      method: hasProp(options, 'method')
        ? String(options.method).toUpperCase()
        : // Request object as first argument
          is.isRequest(resource) && hasProp(resource, 'method')
          ? String(resource.method).toUpperCase()
          : 'GET',
    };
  }

  const arg = fetchArgs[0];
  return {
    url: getUrlFromResource(arg ),
    method: hasProp(arg, 'method') ? String(arg.method).toUpperCase() : 'GET',
  };
}

function getHeadersFromFetchArgs(fetchArgs) {
  const [requestArgument, optionsArgument] = fetchArgs;

  try {
    if (
      typeof optionsArgument === 'object' &&
      optionsArgument !== null &&
      'headers' in optionsArgument &&
      optionsArgument.headers
    ) {
      return new Headers(optionsArgument.headers );
    }

    if (is.isRequest(requestArgument)) {
      return new Headers(requestArgument.headers);
    }
  } catch {
    // noop
  }

  return;
}

exports.addFetchEndInstrumentationHandler = addFetchEndInstrumentationHandler;
exports.addFetchInstrumentationHandler = addFetchInstrumentationHandler;
exports.parseFetchArgs = parseFetchArgs;
//# sourceMappingURL=fetch.js.map
