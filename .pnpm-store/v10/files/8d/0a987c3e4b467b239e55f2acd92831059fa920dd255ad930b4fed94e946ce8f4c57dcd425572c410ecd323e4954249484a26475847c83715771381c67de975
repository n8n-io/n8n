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
import { B3_CONTEXT_HEADER } from './constants';
const B3_CONTEXT_REGEX = /((?:[0-9a-f]{16}){1,2})-([0-9a-f]{16})(?:-([01d](?![0-9a-f])))?(?:-([0-9a-f]{16}))?/;
const PADDING = '0'.repeat(16);
const SAMPLED_VALUES = new Set(['d', '1']);
const DEBUG_STATE = 'd';
function convertToTraceId128(traceId) {
    return traceId.length === 32 ? traceId : `${PADDING}${traceId}`;
}
function convertToTraceFlags(samplingState) {
    if (samplingState && SAMPLED_VALUES.has(samplingState)) {
        return TraceFlags.SAMPLED;
    }
    return TraceFlags.NONE;
}
/**
 * Propagator for the B3 single-header HTTP format.
 * Based on: https://github.com/openzipkin/b3-propagation
 */
export class B3SinglePropagator {
    inject(context, carrier, setter) {
        const spanContext = trace.getSpanContext(context);
        if (!spanContext ||
            !isSpanContextValid(spanContext) ||
            isTracingSuppressed(context))
            return;
        const samplingState = context.getValue(B3_DEBUG_FLAG_KEY) || spanContext.traceFlags & 0x1;
        const value = `${spanContext.traceId}-${spanContext.spanId}-${samplingState}`;
        setter.set(carrier, B3_CONTEXT_HEADER, value);
    }
    extract(context, carrier, getter) {
        const header = getter.get(carrier, B3_CONTEXT_HEADER);
        const b3Context = Array.isArray(header) ? header[0] : header;
        if (typeof b3Context !== 'string')
            return context;
        const match = b3Context.match(B3_CONTEXT_REGEX);
        if (!match)
            return context;
        const [, extractedTraceId, spanId, samplingState] = match;
        const traceId = convertToTraceId128(extractedTraceId);
        if (!isValidTraceId(traceId) || !isValidSpanId(spanId))
            return context;
        const traceFlags = convertToTraceFlags(samplingState);
        if (samplingState === DEBUG_STATE) {
            context = context.setValue(B3_DEBUG_FLAG_KEY, samplingState);
        }
        return trace.setSpanContext(context, {
            traceId,
            spanId,
            isRemote: true,
            traceFlags,
        });
    }
    fields() {
        return [B3_CONTEXT_HEADER];
    }
}
//# sourceMappingURL=B3SinglePropagator.js.map