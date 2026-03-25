Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

/**
 * The key used to store the local variables on the error object.
 */
const LOCAL_VARIABLES_KEY = '__SENTRY_ERROR_LOCAL_VARIABLES__';

/**
 * Creates a rate limiter that will call the disable callback when the rate limit is reached and the enable callback
 * when a timeout has occurred.
 * @param maxPerSecond Maximum number of calls per second
 * @param enable Callback to enable capture
 * @param disable Callback to disable capture
 * @returns A function to call to increment the rate limiter count
 */
function createRateLimiter(
  maxPerSecond,
  enable,
  disable,
) {
  let count = 0;
  let retrySeconds = 5;
  let disabledTimeout = 0;

  setInterval(() => {
    if (disabledTimeout === 0) {
      if (count > maxPerSecond) {
        retrySeconds *= 2;
        disable(retrySeconds);

        // Cap at one day
        if (retrySeconds > 86400) {
          retrySeconds = 86400;
        }
        disabledTimeout = retrySeconds;
      }
    } else {
      disabledTimeout -= 1;

      if (disabledTimeout === 0) {
        enable();
      }
    }

    count = 0;
  }, 1000).unref();

  return () => {
    count += 1;
  };
}

// Add types for the exception event data

/** Could this be an anonymous function? */
function isAnonymous(name) {
  return name !== undefined && (name.length === 0 || name === '?' || name === '<anonymous>');
}

/** Do the function names appear to match? */
function functionNamesMatch(a, b) {
  return a === b || `Object.${a}` === b || a === `Object.${b}` || (isAnonymous(a) && isAnonymous(b));
}

exports.LOCAL_VARIABLES_KEY = LOCAL_VARIABLES_KEY;
exports.createRateLimiter = createRateLimiter;
exports.functionNamesMatch = functionNamesMatch;
exports.isAnonymous = isAnonymous;
//# sourceMappingURL=common.js.map
