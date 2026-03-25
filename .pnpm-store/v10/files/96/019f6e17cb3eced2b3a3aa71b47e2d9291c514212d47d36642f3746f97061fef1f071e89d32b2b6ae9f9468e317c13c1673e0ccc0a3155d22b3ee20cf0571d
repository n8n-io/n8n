import { Client, Span, SpanAttributes, SpanTimeInput, StartSpanOptions } from '@sentry/core';
export type WebVitalReportEvent = 'pagehide' | 'navigation';
/**
 * Checks if a given value is a valid measurement value.
 */
export declare function isMeasurementValue(value: unknown): value is number;
/**
 * Helper function to start child on transactions. This function will make sure that the transaction will
 * use the start timestamp of the created child span if it is earlier than the transactions actual
 * start timestamp.
 */
export declare function startAndEndSpan(parentSpan: Span, startTimeInSeconds: number, endTime: SpanTimeInput, { ...ctx }: StartSpanOptions): Span | undefined;
interface StandaloneWebVitalSpanOptions {
    name: string;
    transaction?: string;
    attributes: SpanAttributes;
    startTime: number;
}
/**
 * Starts an inactive, standalone span used to send web vital values to Sentry.
 * DO NOT use this for arbitrary spans, as these spans require special handling
 * during ingestion to extract metrics.
 *
 * This function adds a bunch of attributes and data to the span that's shared
 * by all web vital standalone spans. However, you need to take care of adding
 * the actual web vital value as an event to the span. Also, you need to assign
 * a transaction name and some other values that are specific to the web vital.
 *
 * Ultimately, you also need to take care of ending the span to send it off.
 *
 * @param options
 *
 * @returns an inactive, standalone and NOT YET ended span
 */
export declare function startStandaloneWebVitalSpan(options: StandaloneWebVitalSpanOptions): Span | undefined;
/** Get the browser performance API. */
export declare function getBrowserPerformanceAPI(): Performance | undefined;
/**
 * Converts from milliseconds to seconds
 * @param time time in ms
 */
export declare function msToSec(time: number): number;
/**
 * Converts ALPN protocol ids to name and version.
 *
 * (https://www.iana.org/assignments/tls-extensiontype-values/tls-extensiontype-values.xhtml#alpn-protocol-ids)
 * @param nextHopProtocol PerformanceResourceTiming.nextHopProtocol
 */
export declare function extractNetworkProtocol(nextHopProtocol: string): {
    name: string;
    version: string;
};
/**
 * Generic support check for web vitals
 */
export declare function supportsWebVital(entryType: 'layout-shift' | 'largest-contentful-paint'): boolean;
/**
 * Listens for events on which we want to collect a previously accumulated web vital value.
 * Currently, this includes:
 *
 * - pagehide (i.e. user minimizes browser window, hides tab, etc)
 * - soft navigation (we only care about the vital of the initially loaded route)
 *
 * As a "side-effect", this function will also collect the span id of the pageload span.
 *
 * @param collectorCallback the callback to be called when the first of these events is triggered. Parameters:
 * - event: the event that triggered the reporting of the web vital value.
 * - pageloadSpanId: the span id of the pageload span. This is used to link the web vital span to the pageload span.
 */
export declare function listenForWebVitalReportEvents(client: Client, collectorCallback: (event: WebVitalReportEvent, pageloadSpanId: string) => void): void;
export {};
//# sourceMappingURL=utils.d.ts.map
