/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { isSpanContextValid, isValidSpanId, isValidTraceId, trace, TraceFlags, } from '@opentelemetry/api';
import { isTracingSuppressed } from '@opentelemetry/core';
import { B3_DEBUG_FLAG_KEY } from './common';
import { X_B3_FLAGS, X_B3_PARENT_SPAN_ID, X_B3_SAMPLED, X_B3_SPAN_ID, X_B3_TRACE_ID, } from './constants';
const VALID_SAMPLED_VALUES = new Set([true, 'true', 'True', '1', 1]);
const VALID_UNSAMPLED_VALUES = new Set([false, 'false', 'False', '0', 0]);
function isValidSampledValue(sampled) {
    return sampled === TraceFlags.SAMPLED || sampled === TraceFlags.NONE;
}
function parseHeader(header) {
    return Array.isArray(header) ? header[0] : header;
}
function getHeaderValue(carrier, getter, key) {
    const header = getter.get(carrier, key);
    return parseHeader(header);
}
function getTraceId(carrier, getter) {
    const traceId = getHeaderValue(carrier, getter, X_B3_TRACE_ID);
    if (typeof traceId === 'string') {
        return traceId.padStart(32, '0');
    }
    return '';
}
function getSpanId(carrier, getter) {
    const spanId = getHeaderValue(carrier, getter, X_B3_SPAN_ID);
    if (typeof spanId === 'string') {
        return spanId;
    }
    return '';
}
function getDebug(carrier, getter) {
    const debug = getHeaderValue(carrier, getter, X_B3_FLAGS);
    return debug === '1' ? '1' : undefined;
}
function getTraceFlags(carrier, getter) {
    const traceFlags = getHeaderValue(carrier, getter, X_B3_SAMPLED);
    const debug = getDebug(carrier, getter);
    if (debug === '1' || VALID_SAMPLED_VALUES.has(traceFlags)) {
        return TraceFlags.SAMPLED;
    }
    if (traceFlags === undefined || VALID_UNSAMPLED_VALUES.has(traceFlags)) {
        return TraceFlags.NONE;
    }
    // This indicates to isValidSampledValue that this is not valid
    return;
}
/**
 * Propagator for the B3 multiple-header HTTP format.
 * Based on: https://github.com/openzipkin/b3-propagation
 */
export class B3MultiPropagator {
    inject(context, carrier, setter) {
        const spanContext = trace.getSpanContext(context);
        if (!spanContext ||
            !isSpanContextValid(spanContext) ||
            isTracingSuppressed(context))
            return;
        const debug = context.getValue(B3_DEBUG_FLAG_KEY);
        setter.set(carrier, X_B3_TRACE_ID, spanContext.traceId);
        setter.set(carrier, X_B3_SPAN_ID, spanContext.spanId);
        // According to the B3 spec, if the debug flag is set,
        // the sampled flag shouldn't be propagated as well.
        if (debug === '1') {
            setter.set(carrier, X_B3_FLAGS, debug);
        }
        else if (spanContext.traceFlags !== undefined) {
            // We set the header only if there is an existing sampling decision.
            // Otherwise we will omit it => Absent.
            setter.set(carrier, X_B3_SAMPLED, (TraceFlags.SAMPLED & spanContext.traceFlags) === TraceFlags.SAMPLED
                ? '1'
                : '0');
        }
    }
    extract(context, carrier, getter) {
        const traceId = getTraceId(carrier, getter);
        const spanId = getSpanId(carrier, getter);
        const traceFlags = getTraceFlags(carrier, getter);
        const debug = getDebug(carrier, getter);
        if (isValidTraceId(traceId) &&
            isValidSpanId(spanId) &&
            isValidSampledValue(traceFlags)) {
            context = context.setValue(B3_DEBUG_FLAG_KEY, debug);
            return trace.setSpanContext(context, {
                traceId,
                spanId,
                isRemote: true,
                traceFlags,
            });
        }
        return context;
    }
    fields() {
        return [
            X_B3_TRACE_ID,
            X_B3_SPAN_ID,
            X_B3_FLAGS,
            X_B3_SAMPLED,
            X_B3_PARENT_SPAN_ID,
        ];
    }
}
//# sourceMappingURL=B3MultiPropagator.js.map