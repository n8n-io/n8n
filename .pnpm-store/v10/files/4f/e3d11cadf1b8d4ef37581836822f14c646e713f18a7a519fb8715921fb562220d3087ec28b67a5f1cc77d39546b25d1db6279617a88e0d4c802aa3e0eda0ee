import type { Client, PropagationContext, Span, SpanContextData } from '@sentry/core';
export interface PreviousTraceInfo {
    /**
     * Span context of the previous trace's local root span
     */
    spanContext: SpanContextData;
    /**
     * Timestamp in seconds when the previous trace was started
     */
    startTimestamp: number;
    /**
     * sample rate of the previous trace
     */
    sampleRate: number;
    /**
     * The sample rand of the previous trace
     */
    sampleRand: number;
}
export declare const PREVIOUS_TRACE_MAX_DURATION = 3600;
export declare const PREVIOUS_TRACE_KEY = "sentry_previous_trace";
export declare const PREVIOUS_TRACE_TMP_SPAN_ATTRIBUTE = "sentry.previous_trace";
/**
 * Takes care of linking traces and applying the (consistent) sampling behavoiour based on the passed options
 * @param options - options for linking traces and consistent trace sampling (@see BrowserTracingOptions)
 * @param client - Sentry client
 */
export declare function linkTraces(client: Client, { linkPreviousTrace, consistentTraceSampling, }: {
    linkPreviousTrace: 'session-storage' | 'in-memory';
    consistentTraceSampling: boolean;
}): void;
/**
 * Adds a previous_trace span link to the passed span if the passed
 * previousTraceInfo is still valid.
 *
 * @returns the updated previous trace info (based on the current span/trace) to
 * be used on the next call
 */
export declare function addPreviousTraceSpanLink(previousTraceInfo: PreviousTraceInfo | undefined, span: Span, oldPropagationContext: PropagationContext): PreviousTraceInfo;
/**
 * Stores @param previousTraceInfo in sessionStorage.
 */
export declare function storePreviousTraceInSessionStorage(previousTraceInfo: PreviousTraceInfo): void;
/**
 * Retrieves the previous trace from sessionStorage if available.
 */
export declare function getPreviousTraceFromSessionStorage(): PreviousTraceInfo | undefined;
/**
 * see {@link import('@sentry/core').spanIsSampled}
 */
export declare function spanContextSampled(ctx: SpanContextData): boolean;
//# sourceMappingURL=linkedTraces.d.ts.map