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
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
import { isSpanContextValid, isValidSpanId, isValidTraceId, trace, TraceFlags, } from '@opentelemetry/api';
import { isTracingSuppressed } from '@opentelemetry/core';
import { B3_DEBUG_FLAG_KEY } from './common';
import { B3_CONTEXT_HEADER } from './constants';
var B3_CONTEXT_REGEX = /((?:[0-9a-f]{16}){1,2})-([0-9a-f]{16})(?:-([01d](?![0-9a-f])))?(?:-([0-9a-f]{16}))?/;
var PADDING = '0'.repeat(16);
var SAMPLED_VALUES = new Set(['d', '1']);
var DEBUG_STATE = 'd';
function convertToTraceId128(traceId) {
    return traceId.length === 32 ? traceId : "" + PADDING + traceId;
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
var B3SinglePropagator = /** @class */ (function () {
    function B3SinglePropagator() {
    }
    B3SinglePropagator.prototype.inject = function (context, carrier, setter) {
        var spanContext = trace.getSpanContext(context);
        if (!spanContext ||
            !isSpanContextValid(spanContext) ||
            isTracingSuppressed(context))
            return;
        var samplingState = context.getValue(B3_DEBUG_FLAG_KEY) || spanContext.traceFlags & 0x1;
        var value = spanContext.traceId + "-" + spanContext.spanId + "-" + samplingState;
        setter.set(carrier, B3_CONTEXT_HEADER, value);
    };
    B3SinglePropagator.prototype.extract = function (context, carrier, getter) {
        var header = getter.get(carrier, B3_CONTEXT_HEADER);
        var b3Context = Array.isArray(header) ? header[0] : header;
        if (typeof b3Context !== 'string')
            return context;
        var match = b3Context.match(B3_CONTEXT_REGEX);
        if (!match)
            return context;
        var _a = __read(match, 4), extractedTraceId = _a[1], spanId = _a[2], samplingState = _a[3];
        var traceId = convertToTraceId128(extractedTraceId);
        if (!isValidTraceId(traceId) || !isValidSpanId(spanId))
            return context;
        var traceFlags = convertToTraceFlags(samplingState);
        if (samplingState === DEBUG_STATE) {
            context = context.setValue(B3_DEBUG_FLAG_KEY, samplingState);
        }
        return trace.setSpanContext(context, {
            traceId: traceId,
            spanId: spanId,
            isRemote: true,
            traceFlags: traceFlags,
        });
    };
    B3SinglePropagator.prototype.fields = function () {
        return [B3_CONTEXT_HEADER];
    };
    return B3SinglePropagator;
}());
export { B3SinglePropagator };
//# sourceMappingURL=B3SinglePropagator.js.map