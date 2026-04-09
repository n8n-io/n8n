/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
import { propagation, trace, TraceFlags, } from '@opentelemetry/api';
import { isTracingSuppressed } from '@opentelemetry/core';
export const UBER_TRACE_ID_HEADER = 'uber-trace-id';
export const UBER_BAGGAGE_HEADER_PREFIX = 'uberctx';
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
export class JaegerPropagator {
    _jaegerTraceHeader;
    _jaegerBaggageHeaderPrefix;
    constructor(config) {
        if (typeof config === 'string') {
            this._jaegerTraceHeader = config;
            this._jaegerBaggageHeaderPrefix = UBER_BAGGAGE_HEADER_PREFIX;
        }
        else {
            this._jaegerTraceHeader =
                config?.customTraceHeader || UBER_TRACE_ID_HEADER;
            this._jaegerBaggageHeaderPrefix =
                config?.customBaggageHeaderPrefix || UBER_BAGGAGE_HEADER_PREFIX;
        }
    }
    inject(context, carrier, setter) {
        const spanContext = trace.getSpanContext(context);
        const baggage = propagation.getBaggage(context);
        if (spanContext && isTracingSuppressed(context) === false) {
            const traceFlags = `0${(spanContext.traceFlags || TraceFlags.NONE).toString(16)}`;
            setter.set(carrier, this._jaegerTraceHeader, `${spanContext.traceId}:${spanContext.spanId}:0:${traceFlags}`);
        }
        if (baggage) {
            for (const [key, entry] of baggage.getAllEntries()) {
                setter.set(carrier, `${this._jaegerBaggageHeaderPrefix}-${key}`, encodeURIComponent(entry.value));
            }
        }
    }
    extract(context, carrier, getter) {
        const uberTraceIdHeader = getter.get(carrier, this._jaegerTraceHeader);
        const uberTraceId = Array.isArray(uberTraceIdHeader)
            ? uberTraceIdHeader[0]
            : uberTraceIdHeader;
        const baggageValues = getter
            .keys(carrier)
            .filter(key => key.startsWith(`${this._jaegerBaggageHeaderPrefix}-`))
            .map(key => {
            const value = getter.get(carrier, key);
            return {
                key: key.substring(this._jaegerBaggageHeaderPrefix.length + 1),
                value: Array.isArray(value) ? value[0] : value,
            };
        });
        let newContext = context;
        // if the trace id header is present and valid, inject it into the context
        if (typeof uberTraceId === 'string') {
            const spanContext = deserializeSpanContext(uberTraceId);
            if (spanContext) {
                newContext = trace.setSpanContext(newContext, spanContext);
            }
        }
        if (baggageValues.length === 0)
            return newContext;
        // if baggage values are present, inject it into the current baggage
        let currentBaggage = propagation.getBaggage(context) ?? propagation.createBaggage();
        for (const baggageEntry of baggageValues) {
            if (baggageEntry.value === undefined)
                continue;
            currentBaggage = currentBaggage.setEntry(baggageEntry.key, {
                value: decodeURIComponent(baggageEntry.value),
            });
        }
        newContext = propagation.setBaggage(newContext, currentBaggage);
        return newContext;
    }
    fields() {
        return [this._jaegerTraceHeader];
    }
}
const VALID_HEX_RE = /^[0-9a-f]{1,2}$/i;
/**
 * @param {string} serializedString - a serialized span context.
 * @return {SpanContext} - returns a span context represented by the serializedString.
 **/
function deserializeSpanContext(serializedString) {
    const headers = decodeURIComponent(serializedString).split(':');
    if (headers.length !== 4) {
        return null;
    }
    const [_traceId, _spanId, , flags] = headers;
    const traceId = _traceId.padStart(32, '0');
    const spanId = _spanId.padStart(16, '0');
    const traceFlags = VALID_HEX_RE.test(flags) ? parseInt(flags, 16) & 1 : 1;
    return { traceId, spanId, isRemote: true, traceFlags };
}
//# sourceMappingURL=JaegerPropagator.js.map