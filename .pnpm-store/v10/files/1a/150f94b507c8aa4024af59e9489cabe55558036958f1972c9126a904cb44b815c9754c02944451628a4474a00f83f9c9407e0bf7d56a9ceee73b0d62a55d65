Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');
const utils = require('./utils.js');

function getAbsoluteTime(time) {
  // falsy values should be preserved so that we can later on drop undefined values and
  // preserve 0 vals for cross-origin resources without proper `Timing-Allow-Origin` header.
  return time ? ((core.browserPerformanceTimeOrigin() || performance.timeOrigin) + time) / 1000 : time;
}

/**
 * Converts a PerformanceResourceTiming entry to span data for the resource span. Most importantly,
 * it converts the timing values from timestamps relative to the `performance.timeOrigin` to absolute timestamps
 * in seconds.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming#timestamps
 *
 * @param resourceTiming
 * @returns An array where the first element is the attribute name and the second element is the attribute value.
 */
function resourceTimingToSpanAttributes(resourceTiming) {
  const timingSpanData = {};
  // Checking for only `undefined` and `null` is intentional because it's
  // valid for `nextHopProtocol` to be an empty string.
  if (resourceTiming.nextHopProtocol != undefined) {
    const { name, version } = utils.extractNetworkProtocol(resourceTiming.nextHopProtocol);
    timingSpanData['network.protocol.version'] = version;
    timingSpanData['network.protocol.name'] = name;
  }

  if (!(core.browserPerformanceTimeOrigin() || utils.getBrowserPerformanceAPI()?.timeOrigin)) {
    return timingSpanData;
  }

  return dropUndefinedKeysFromObject({
    ...timingSpanData,

    'http.request.redirect_start': getAbsoluteTime(resourceTiming.redirectStart),
    'http.request.redirect_end': getAbsoluteTime(resourceTiming.redirectEnd),

    'http.request.worker_start': getAbsoluteTime(resourceTiming.workerStart),

    'http.request.fetch_start': getAbsoluteTime(resourceTiming.fetchStart),

    'http.request.domain_lookup_start': getAbsoluteTime(resourceTiming.domainLookupStart),
    'http.request.domain_lookup_end': getAbsoluteTime(resourceTiming.domainLookupEnd),

    'http.request.connect_start': getAbsoluteTime(resourceTiming.connectStart),
    'http.request.secure_connection_start': getAbsoluteTime(resourceTiming.secureConnectionStart),
    'http.request.connection_end': getAbsoluteTime(resourceTiming.connectEnd),

    'http.request.request_start': getAbsoluteTime(resourceTiming.requestStart),

    'http.request.response_start': getAbsoluteTime(resourceTiming.responseStart),
    'http.request.response_end': getAbsoluteTime(resourceTiming.responseEnd),

    // For TTFB we actually want the relative time from timeOrigin to responseStart
    // This way, TTFB always measures the "first page load" experience.
    // see: https://web.dev/articles/ttfb#measure-resource-requests
    'http.request.time_to_first_byte':
      resourceTiming.responseStart != null ? resourceTiming.responseStart / 1000 : undefined,
  });
}

/**
 * Remove properties with `undefined` as value from an object.
 * In contrast to `dropUndefinedKeys` in core this funciton only works on first-level
 * key-value objects and does not recursively go into object properties or arrays.
 */
function dropUndefinedKeysFromObject(attrs) {
  return Object.fromEntries(Object.entries(attrs).filter(([, value]) => value != null)) ;
}

exports.resourceTimingToSpanAttributes = resourceTimingToSpanAttributes;
//# sourceMappingURL=resourceTiming.js.map
