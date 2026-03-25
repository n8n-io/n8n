import type { ReplayNetworkRequestOrResponse } from './request';
export type AllPerformanceEntry = PerformancePaintTiming | PerformanceResourceTiming | PerformanceNavigationTiming;
export type PerformancePaintTiming = PerformanceEntry;
export type PerformanceNavigationTiming = PerformanceEntry & PerformanceResourceTiming & {
    type: string;
    transferSize: number;
    /**
     * A DOMHighResTimeStamp representing the time immediately before the user agent
     * sets the document's readyState to "interactive".
     */
    domInteractive: number;
    /**
     * A DOMHighResTimeStamp representing the time immediately before the current
     * document's DOMContentLoaded event handler starts.
     */
    domContentLoadedEventStart: number;
    /**
     * A DOMHighResTimeStamp representing the time immediately after the current
     * document's DOMContentLoaded event handler completes.
     */
    domContentLoadedEventEnd: number;
    /**
     * A DOMHighResTimeStamp representing the time immediately before the current
     * document's load event handler starts.
     */
    loadEventStart: number;
    /**
     * A DOMHighResTimeStamp representing the time immediately after the current
     * document's load event handler completes.
     */
    loadEventEnd: number;
    /**
     * A DOMHighResTimeStamp representing the time immediately before the user agent
     * sets the document's readyState to "complete".
     */
    domComplete: number;
    /**
     * A number representing the number of redirects since the last non-redirect
     * navigation in the current browsing context.
     */
    redirectCount: number;
};
export type ExperimentalPerformanceResourceTiming = PerformanceResourceTiming & {
    responseStatus?: number;
};
export type PaintData = undefined;
/**
 * See https://developer.mozilla.org/en-US/docs/Web/API/PerformanceNavigationTiming
 *
 * Note `navigation.push` will not have any data
 */
export type NavigationData = Partial<Pick<PerformanceNavigationTiming, 'decodedBodySize' | 'encodedBodySize' | 'duration' | 'domInteractive' | 'domContentLoadedEventEnd' | 'domContentLoadedEventStart' | 'loadEventStart' | 'loadEventEnd' | 'domComplete' | 'redirectCount'>> & {
    /**
     * Transfer size of resource
     */
    size?: number;
};
export type ResourceData = Pick<PerformanceResourceTiming, 'decodedBodySize' | 'encodedBodySize'> & {
    /**
     * Transfer size of resource
     */
    size: number;
    /**
     * HTTP status code. Note this is experimental and not available on all browsers.
     */
    statusCode?: number;
};
export interface WebVitalData {
    /**
     * Render time (in ms) of the LCP
     */
    value: number;
    size: number;
    /**
     * The rating as to whether the metric value is within the "good",
     * "needs improvement", or "poor" thresholds of the metric.
     */
    rating: 'good' | 'needs-improvement' | 'poor';
    /**
     * The recording id of the web vital nodes. -1 if not found
     */
    nodeIds?: number[];
    /**
     * The layout shifts of a CLS metric
     */
    attributions?: {
        value: number;
        nodeIds: number[] | undefined;
    }[];
}
/**
 * Entries that come from window.performance
 */
export type AllPerformanceEntryData = PaintData | NavigationData | ResourceData | WebVitalData;
export interface MemoryData {
    memory: {
        jsHeapSizeLimit: number;
        totalJSHeapSize: number;
        usedJSHeapSize: number;
    };
}
export interface NetworkRequestData {
    method?: string;
    statusCode?: number;
    requestBodySize?: number;
    responseBodySize?: number;
    request?: ReplayNetworkRequestOrResponse;
    response?: ReplayNetworkRequestOrResponse;
}
export interface HistoryData {
    previous: string | undefined;
}
export type AllEntryData = AllPerformanceEntryData | MemoryData | NetworkRequestData | HistoryData;
export interface ReplayPerformanceEntry<T> {
    /**
     * One of these types https://developer.mozilla.org/en-US/docs/Web/API/PerformanceEntry/entryType
     */
    type: string;
    /**
     * A more specific description of the performance entry
     */
    name: string;
    /**
     * The start timestamp in seconds
     */
    start: number;
    /**
     * The end timestamp in seconds
     */
    end: number;
    /**
     * Additional unstructured data to be included
     */
    data: T;
}
//# sourceMappingURL=performance.d.ts.map