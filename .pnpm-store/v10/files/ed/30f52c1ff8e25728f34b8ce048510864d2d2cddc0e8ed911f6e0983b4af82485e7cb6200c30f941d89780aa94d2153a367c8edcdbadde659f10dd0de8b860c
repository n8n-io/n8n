import type { Client, Span, SpanAttributes } from '@sentry/core';
interface StartTrackingWebVitalsOptions {
    recordClsStandaloneSpans: boolean;
    recordLcpStandaloneSpans: boolean;
    client: Client;
}
/**
 * Start tracking web vitals.
 * The callback returned by this function can be used to stop tracking & ensure all measurements are final & captured.
 *
 * @returns A function that forces web vitals collection
 */
export declare function startTrackingWebVitals({ recordClsStandaloneSpans, recordLcpStandaloneSpans, client, }: StartTrackingWebVitalsOptions): () => void;
/**
 * Start tracking long tasks.
 */
export declare function startTrackingLongTasks(): void;
/**
 * Start tracking long animation frames.
 */
export declare function startTrackingLongAnimationFrames(): void;
/**
 * Start tracking interaction events.
 */
export declare function startTrackingInteractions(): void;
export { registerInpInteractionListener, startTrackingINP } from './inp';
interface AddPerformanceEntriesOptions {
    /**
     * Flag to determine if CLS should be recorded as a measurement on the pageload span or
     * sent as a standalone span instead.
     * Sending it as a standalone span will yield more accurate LCP values.
     *
     * Default: `false` for backwards compatibility.
     */
    recordClsOnPageloadSpan: boolean;
    /**
     * Flag to determine if LCP should be recorded as a measurement on the pageload span or
     * sent as a standalone span instead.
     * Sending it as a standalone span will yield more accurate LCP values.
     *
     * Default: `false` for backwards compatibility.
     */
    recordLcpOnPageloadSpan: boolean;
    /**
     * Resource spans with `op`s matching strings in the array will not be emitted.
     *
     * Default: []
     */
    ignoreResourceSpans: Array<'resouce.script' | 'resource.css' | 'resource.img' | 'resource.other' | string>;
    /**
     * Performance spans created from browser Performance APIs,
     * `performance.mark(...)` nand `performance.measure(...)`
     * with `name`s matching strings in the array will not be emitted.
     *
     * Default: []
     */
    ignorePerformanceApiSpans: Array<string | RegExp>;
}
/** Add performance related spans to a transaction */
export declare function addPerformanceEntries(span: Span, options: AddPerformanceEntriesOptions): void;
/**
 * Create measure related spans.
 * Exported only for tests.
 */
export declare function _addMeasureSpans(span: Span, entry: PerformanceEntry, startTime: number, duration: number, timeOrigin: number, ignorePerformanceApiSpans: AddPerformanceEntriesOptions['ignorePerformanceApiSpans']): void;
/**
 * Instrument navigation entries
 * exported only for tests
 */
export declare function _addNavigationSpans(span: Span, entry: PerformanceNavigationTiming, timeOrigin: number): void;
/**
 * Create resource-related spans.
 * Exported only for tests.
 */
export declare function _addResourceSpans(span: Span, entry: PerformanceResourceTiming, resourceUrl: string, startTime: number, duration: number, timeOrigin: number, ignoredResourceSpanOps?: Array<string>): void;
type ExperimentalResourceTimingProperty = 'renderBlockingStatus' | 'deliveryType' | 'responseStatus';
/**
 * Use this to set any attributes we can take directly form the PerformanceResourceTiming entry.
 *
 * This is just a mapping function for entry->attribute to keep bundle-size minimal.
 * Experimental properties are also accepted (see {@link ExperimentalResourceTimingProperty}).
 * Assumes that all entry properties might be undefined for browser-specific differences.
 * Only accepts string and number values for now and also sets 0-values.
 */
export declare function _setResourceRequestAttributes(entry: Partial<PerformanceResourceTiming> & Partial<Record<ExperimentalResourceTimingProperty, number | string>>, attributes: SpanAttributes, properties: [keyof PerformanceResourceTiming | ExperimentalResourceTimingProperty, string][]): void;
//# sourceMappingURL=browserMetrics.d.ts.map