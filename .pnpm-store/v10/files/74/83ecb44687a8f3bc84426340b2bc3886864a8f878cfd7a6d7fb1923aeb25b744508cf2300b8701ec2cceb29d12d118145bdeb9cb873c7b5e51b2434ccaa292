import { HandlerDataFetch } from './types-hoist/instrument';
import { ResponseHookInfo } from './types-hoist/request';
import { Span, SpanOrigin } from './types-hoist/span';
type PolymorphicRequestHeaders = Record<string, string | undefined> | Array<[
    string,
    string
]> | {
    append: (key: string, value: string) => void;
    get: (key: string) => string | null | undefined;
};
interface InstrumentFetchRequestOptions {
    spanOrigin?: SpanOrigin;
    propagateTraceparent?: boolean;
    onRequestSpanEnd?: (span: Span, responseInformation: ResponseHookInfo) => void;
}
/**
 * Create and track fetch request spans for usage in combination with `addFetchInstrumentationHandler`.
 *
 * @deprecated pass an options object instead of the spanOrigin parameter
 *
 * @returns Span if a span was created, otherwise void.
 */
export declare function instrumentFetchRequest(handlerData: HandlerDataFetch, shouldCreateSpan: (url: string) => boolean, shouldAttachHeaders: (url: string) => boolean, spans: Record<string, Span>, spanOrigin: SpanOrigin): Span | undefined;
/**
 * Create and track fetch request spans for usage in combination with `addFetchInstrumentationHandler`.
 *
 * @returns Span if a span was created, otherwise void.
 */
export declare function instrumentFetchRequest(handlerData: HandlerDataFetch, shouldCreateSpan: (url: string) => boolean, shouldAttachHeaders: (url: string) => boolean, spans: Record<string, Span>, instrumentFetchRequestOptions: InstrumentFetchRequestOptions): Span | undefined;
/**
 * Calls the onRequestSpanEnd callback if it is defined.
 */
export declare function _callOnRequestSpanEnd(span: Span, handlerData: HandlerDataFetch, spanOriginOrOptions?: SpanOrigin | InstrumentFetchRequestOptions): void;
/**
 * Adds sentry-trace and baggage headers to the various forms of fetch headers.
 * exported only for testing purposes
 *
 * When we determine if we should add a baggage header, there are 3 cases:
 * 1. No previous baggage header -> add baggage
 * 2. Previous baggage header has no sentry baggage values -> add our baggage
 * 3. Previous baggage header has sentry baggage values -> do nothing (might have been added manually by users)
 */
export declare function _addTracingHeadersToFetchRequest(request: string | Request, fetchOptionsObj: {
    headers?: {
        [key: string]: string[] | string | undefined;
    } | PolymorphicRequestHeaders;
}, span?: Span, propagateTraceparent?: boolean): PolymorphicRequestHeaders | undefined;
export {};
//# sourceMappingURL=fetch.d.ts.map
