Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const randomSafeContext = require('./randomSafeContext.js');
const worldwide = require('./worldwide.js');

const ONE_SECOND_IN_MS = 1000;

/**
 * A partial definition of the [Performance Web API]{@link https://developer.mozilla.org/en-US/docs/Web/API/Performance}
 * for accessing a high-resolution monotonic clock.
 */

/**
 * Returns a timestamp in seconds since the UNIX epoch using the Date API.
 */
function dateTimestampInSeconds() {
  return randomSafeContext.safeDateNow() / ONE_SECOND_IN_MS;
}

/**
 * Returns a wrapper around the native Performance API browser implementation, or undefined for browsers that do not
 * support the API.
 *
 * Wrapping the native API works around differences in behavior from different browsers.
 */
function createUnixTimestampInSecondsFunc() {
  const { performance } = worldwide.GLOBAL_OBJ ;
  // Some browser and environments don't have a performance or timeOrigin, so we fallback to
  // using Date.now() to compute the starting time.
  if (!performance?.now || !performance.timeOrigin) {
    return dateTimestampInSeconds;
  }

  const timeOrigin = performance.timeOrigin;

  // performance.now() is a monotonic clock, which means it starts at 0 when the process begins. To get the current
  // wall clock time (actual UNIX timestamp), we need to add the starting time origin and the current time elapsed.
  //
  // TODO: This does not account for the case where the monotonic clock that powers performance.now() drifts from the
  // wall clock time, which causes the returned timestamp to be inaccurate. We should investigate how to detect and
  // correct for this.
  // See: https://github.com/getsentry/sentry-javascript/issues/2590
  // See: https://github.com/mdn/content/issues/4713
  // See: https://dev.to/noamr/when-a-millisecond-is-not-a-millisecond-3h6
  return () => {
    return (timeOrigin + randomSafeContext.withRandomSafeContext(() => performance.now())) / ONE_SECOND_IN_MS;
  };
}

let _cachedTimestampInSeconds;

/**
 * Returns a timestamp in seconds since the UNIX epoch using either the Performance or Date APIs, depending on the
 * availability of the Performance API.
 *
 * BUG: Note that because of how browsers implement the Performance API, the clock might stop when the computer is
 * asleep. This creates a skew between `dateTimestampInSeconds` and `timestampInSeconds`. The
 * skew can grow to arbitrary amounts like days, weeks or months.
 * See https://github.com/getsentry/sentry-javascript/issues/2590.
 */
function timestampInSeconds() {
  // We store this in a closure so that we don't have to create a new function every time this is called.
  const func = _cachedTimestampInSeconds ?? (_cachedTimestampInSeconds = createUnixTimestampInSecondsFunc());
  return func();
}

/**
 * Cached result of getBrowserTimeOrigin.
 */
let cachedTimeOrigin = null;

/**
 * Gets the time origin and the mode used to determine it.
 *
 * Unfortunately browsers may report an inaccurate time origin data, through either performance.timeOrigin or
 * performance.timing.navigationStart, which results in poor results in performance data. We only treat time origin
 * data as reliable if they are within a reasonable threshold of the current time.
 *
 * TODO: move to `@sentry/browser-utils` package.
 */
function getBrowserTimeOrigin() {
  const { performance } = worldwide.GLOBAL_OBJ ;
  if (!performance?.now) {
    return undefined;
  }

  const threshold = 300000; // 5 minutes in milliseconds
  const performanceNow = randomSafeContext.withRandomSafeContext(() => performance.now());
  const dateNow = randomSafeContext.safeDateNow();

  const timeOrigin = performance.timeOrigin;
  if (typeof timeOrigin === 'number') {
    const timeOriginDelta = Math.abs(timeOrigin + performanceNow - dateNow);
    if (timeOriginDelta < threshold) {
      return timeOrigin;
    }
  }

  // TODO: Remove all code related to `performance.timing.navigationStart` once we drop support for Safari 14.
  // `performance.timeSince` is available in Safari 15.
  // see: https://caniuse.com/mdn-api_performance_timeorigin

  // While performance.timing.navigationStart is deprecated in favor of performance.timeOrigin, performance.timeOrigin
  // is not as widely supported. Namely, performance.timeOrigin is undefined in Safari as of writing.
  // Also as of writing, performance.timing is not available in Web Workers in mainstream browsers, so it is not always
  // a valid fallback. In the absence of an initial time provided by the browser, fallback to the current time from the
  // Date API.
  // eslint-disable-next-line deprecation/deprecation
  const navigationStart = performance.timing?.navigationStart;
  if (typeof navigationStart === 'number') {
    const navigationStartDelta = Math.abs(navigationStart + performanceNow - dateNow);
    if (navigationStartDelta < threshold) {
      return navigationStart;
    }
  }

  // Either both timeOrigin and navigationStart are skewed or neither is available, fallback to subtracting
  // `performance.now()` from `Date.now()`.
  return dateNow - performanceNow;
}

/**
 * The number of milliseconds since the UNIX epoch. This value is only usable in a browser, and only when the
 * performance API is available.
 */
function browserPerformanceTimeOrigin() {
  if (cachedTimeOrigin === null) {
    cachedTimeOrigin = getBrowserTimeOrigin();
  }

  return cachedTimeOrigin;
}

exports.browserPerformanceTimeOrigin = browserPerformanceTimeOrigin;
exports.dateTimestampInSeconds = dateTimestampInSeconds;
exports.timestampInSeconds = timestampInSeconds;
//# sourceMappingURL=time.js.map
