import { Context, TextMapGetter, TextMapPropagator, TextMapSetter } from '@opentelemetry/api';
import { JaegerPropagatorConfig } from './types';
export declare const UBER_TRACE_ID_HEADER = "uber-trace-id";
export declare const UBER_BAGGAGE_HEADER_PREFIX = "uberctx";
/**
 * Propagates {@link SpanContext} through Trace Context format propagation.
 * {trace-id}:{span-id}:{parent-span-id}:{flags}
 * {trace-id}
 * 64-bit or 128-bit random number in base16 format.
 * Can be variable length, shorter values are 0-padded on the left.
 * Value of 0 is invalid.
 * {span-id}
 * 64-bit random number in base16 format.
 * {parent-span-id}
 * Set to 0 because this field is deprecated.
 * {flags}
 * One byte bitmap, as two hex digits.
 * Inspired by jaeger-client-node project.
 */
export declare class JaegerPropagator implements TextMapPropagator {
    private readonly _jaegerTraceHeader;
    private readonly _jaegerBaggageHeaderPrefix;
    constructor(customTraceHeader?: string);
    constructor(config?: JaegerPropagatorConfig);
    inject(context: Context, carrier: unknown, setter: TextMapSetter): void;
    extract(context: Context, carrier: unknown, getter: TextMapGetter): Context;
    fields(): string[];
}
//# sourceMappingURL=JaegerPropagator.d.ts.map