import type { Client } from '../client';
import type { Scope } from '../scope';
import type { Span } from '../types-hoist/span';
import type { SerializedTraceData } from '../types-hoist/tracing';
/**
 * Extracts trace propagation data from the current span or from the client's scope (via transaction or propagation
 * context) and serializes it to `sentry-trace` and `baggage` values. These values can be used to propagate
 * a trace via our tracing Http headers or Html `<meta>` tags.
 *
 * This function also applies some validation to the generated sentry-trace and baggage values to ensure that
 * only valid strings are returned.
 *
 * If (@param options.propagateTraceparent) is `true`, the function will also generate a `traceparent` value,
 * following the W3C traceparent header format.
 *
 * @returns an object with the tracing data values. The object keys are the name of the tracing key to be used as header
 * or meta tag name.
 */
export declare function getTraceData(options?: {
    span?: Span;
    scope?: Scope;
    client?: Client;
    propagateTraceparent?: boolean;
}): SerializedTraceData;
//# sourceMappingURL=traceData.d.ts.map