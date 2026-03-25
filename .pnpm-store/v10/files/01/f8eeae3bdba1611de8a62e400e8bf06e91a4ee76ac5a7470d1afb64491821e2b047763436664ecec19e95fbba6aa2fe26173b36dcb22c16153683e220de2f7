import type { Metric } from './base';
/**
 * A TTFB-specific version of the Metric object.
 */
export interface TTFBMetric extends Metric {
    name: 'TTFB';
    entries: PerformanceNavigationTiming[];
}
/**
 * An object containing potentially-helpful debugging information that
 * can be sent along with the TTFB value for the current page visit in order
 * to help identify issues happening to real-users in the field.
 *
 * NOTE: these values are primarily useful for page loads not handled via
 * service worker, as browsers differ in what they report when service worker
 * is involved, see: https://github.com/w3c/navigation-timing/issues/199
 */
export interface TTFBAttribution {
    /**
     * The total time from when the user initiates loading the page to when the
     * page starts to handle the request. Large values here are typically due
     * to HTTP redirects, though other browser processing contributes to this
     * duration as well (so even without redirect it's generally not zero).
     */
    waitingDuration: number;
    /**
     * The total time spent checking the HTTP cache for a match. For navigations
     * handled via service worker, this duration usually includes service worker
     * start-up time as well as time processing `fetch` event listeners, with
     * some exceptions, see: https://github.com/w3c/navigation-timing/issues/199
     */
    cacheDuration: number;
    /**
     * The total time to resolve the DNS for the requested domain.
     */
    dnsDuration: number;
    /**
     * The total time to create the connection to the requested domain.
     */
    connectionDuration: number;
    /**
     * The total time from when the request was sent until the first byte of the
     * response was received. This includes network time as well as server
     * processing time.
     */
    requestDuration: number;
    /**
     * The `navigation` entry of the current page, which is useful for diagnosing
     * general page load issues. This can be used to access `serverTiming` for
     * example: navigationEntry?.serverTiming
     */
    navigationEntry?: PerformanceNavigationTiming;
}
/**
 * A TTFB-specific version of the Metric object with attribution.
 */
export interface TTFBMetricWithAttribution extends TTFBMetric {
    attribution: TTFBAttribution;
}
//# sourceMappingURL=ttfb.d.ts.map