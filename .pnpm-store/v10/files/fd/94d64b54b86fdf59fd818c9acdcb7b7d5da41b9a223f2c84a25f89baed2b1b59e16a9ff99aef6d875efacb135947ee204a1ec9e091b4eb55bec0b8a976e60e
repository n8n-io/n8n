Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');

const WINDOW = core.GLOBAL_OBJ ;

let ignoreOnError = 0;

/**
 * @hidden
 */
function shouldIgnoreOnError() {
  return ignoreOnError > 0;
}

/**
 * @hidden
 */
function ignoreNextOnError() {
  // onerror should trigger before setTimeout
  ignoreOnError++;
  setTimeout(() => {
    ignoreOnError--;
  });
}

// eslint-disable-next-line @typescript-eslint/ban-types

/**
 * Instruments the given function and sends an event to Sentry every time the
 * function throws an exception.
 *
 * @param fn A function to wrap. It is generally safe to pass an unbound function, because the returned wrapper always
 * has a correct `this` context.
 * @returns The wrapped function.
 * @hidden
 */
function wrap(
  fn,
  options

 = {},
) {
  // for future readers what this does is wrap a function and then create
  // a bi-directional wrapping between them.
  //
  // example: wrapped = wrap(original);
  //  original.__sentry_wrapped__ -> wrapped
  //  wrapped.__sentry_original__ -> original

  function isFunction(fn) {
    return typeof fn === 'function';
  }

  if (!isFunction(fn)) {
    return fn;
  }

  try {
    // if we're dealing with a function that was previously wrapped, return
    // the original wrapper.
    const wrapper = (fn ).__sentry_wrapped__;
    if (wrapper) {
      if (typeof wrapper === 'function') {
        return wrapper;
      } else {
        // If we find that the `__sentry_wrapped__` function is not a function at the time of accessing it, it means
        // that something messed with it. In that case we want to return the originally passed function.
        return fn;
      }
    }

    // We don't wanna wrap it twice
    if (core.getOriginalFunction(fn)) {
      return fn;
    }
  } catch {
    // Just accessing custom props in some Selenium environments
    // can cause a "Permission denied" exception (see raven-js#495).
    // Bail on wrapping and return the function as-is (defers to window.onerror).
    return fn;
  }

  // Wrap the function itself
  // It is important that `sentryWrapped` is not an arrow function to preserve the context of `this`
  const sentryWrapped = function ( ...args) {
    try {
      // Also wrap arguments that are themselves functions
      const wrappedArguments = args.map(arg => wrap(arg, options));

      // Attempt to invoke user-land function
      // NOTE: If you are a Sentry user, and you are seeing this stack frame, it
      //       means the sentry.javascript SDK caught an error invoking your application code. This
      //       is expected behavior and NOT indicative of a bug with sentry.javascript.
      return fn.apply(this, wrappedArguments);
    } catch (ex) {
      ignoreNextOnError();

      core.withScope(scope => {
        scope.addEventProcessor(event => {
          if (options.mechanism) {
            core.addExceptionTypeValue(event, undefined, undefined);
            core.addExceptionMechanism(event, options.mechanism);
          }

          event.extra = {
            ...event.extra,
            arguments: args,
          };

          return event;
        });

        // no need to add a mechanism here, we already add it via an event processor above
        core.captureException(ex);
      });

      throw ex;
    }
  } ;

  // Wrap the wrapped function in a proxy, to ensure any other properties of the original function remain available
  try {
    for (const property in fn) {
      if (Object.prototype.hasOwnProperty.call(fn, property)) {
        sentryWrapped[property ] = fn[property ];
      }
    }
  } catch {
    // Accessing some objects may throw
    // ref: https://github.com/getsentry/sentry-javascript/issues/1168
  }

  // Signal that this function has been wrapped/filled already
  // for both debugging and to prevent it to being wrapped/filled twice
  core.markFunctionWrapped(sentryWrapped, fn);

  core.addNonEnumerableProperty(fn, '__sentry_wrapped__', sentryWrapped);

  // Restore original function name (not all browsers allow that)
  try {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const descriptor = Object.getOwnPropertyDescriptor(sentryWrapped, 'name');
    if (descriptor.configurable) {
      Object.defineProperty(sentryWrapped, 'name', {
        get() {
          return fn.name;
        },
      });
    }
  } catch {
    // This may throw if e.g. the descriptor does not exist, or a browser does not allow redefining `name`.
    // to save some bytes we simply try-catch this
  }

  return sentryWrapped;
}

/**
 * Get HTTP request data from the current page.
 */
function getHttpRequestData() {
  // grab as much info as exists and add it to the event
  const url = core.getLocationHref();
  const { referrer } = WINDOW.document || {};
  const { userAgent } = WINDOW.navigator || {};

  const headers = {
    ...(referrer && { Referer: referrer }),
    ...(userAgent && { 'User-Agent': userAgent }),
  };
  const request = {
    url,
    headers,
  };

  return request;
}

exports.WINDOW = WINDOW;
exports.getHttpRequestData = getHttpRequestData;
exports.ignoreNextOnError = ignoreNextOnError;
exports.shouldIgnoreOnError = shouldIgnoreOnError;
exports.wrap = wrap;
//# sourceMappingURL=helpers.js.map
