import { WINDOW } from '../helpers.js';

/**
 * Checks if the baggage header has Sentry values.
 */
function baggageHeaderHasSentryValues(baggageHeader) {
  return baggageHeader.split(',').some(value => value.trim().startsWith('sentry-'));
}

/**
 * Gets the full URL from a given URL string.
 */
function getFullURL(url) {
  try {
    // By adding a base URL to new URL(), this will also work for relative urls
    // If `url` is a full URL, the base URL is ignored anyhow
    const parsed = new URL(url, WINDOW.location.origin);
    return parsed.href;
  } catch {
    return undefined;
  }
}

/**
 * Checks if the entry is a PerformanceResourceTiming.
 */
function isPerformanceResourceTiming(entry) {
  return (
    entry.entryType === 'resource' &&
    'initiatorType' in entry &&
    typeof (entry ).nextHopProtocol === 'string' &&
    (entry.initiatorType === 'fetch' || entry.initiatorType === 'xmlhttprequest')
  );
}

/**
 * Creates a Headers object from a record of string key-value pairs, and returns undefined if it fails.
 */
function createHeadersSafely(headers) {
  try {
    return new Headers(headers);
  } catch {
    // noop
    return undefined;
  }
}

export { baggageHeaderHasSentryValues, createHeadersSafely, getFullURL, isPerformanceResourceTiming };
//# sourceMappingURL=utils.js.map
