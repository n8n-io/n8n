"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.B3MultiPropagator = void 0;
const api_1 = require("@opentelemetry/api");
const core_1 = require("@opentelemetry/core");
const common_1 = require("./common");
const constants_1 = require("./constants");
const VALID_SAMPLED_VALUES = new Set([true, 'true', 'True', '1', 1]);
const VALID_UNSAMPLED_VALUES = new Set([false, 'false', 'False', '0', 0]);
function isValidSampledValue(sampled) {
    return sampled === api_1.TraceFlags.SAMPLED || sampled === api_1.TraceFlags.NONE;
}
function parseHeader(header) {
    return Array.isArray(header) ? header[0] : header;
}
function getHeaderValue(carrier, getter, key) {
    const header = getter.get(carrier, key);
    return parseHeader(header);
}
function getTraceId(carrier, getter) {
    const traceId = getHeaderValue(carrier, getter, constants_1.X_B3_TRACE_ID);
    if (typeof traceId === 'string') {
        return traceId.padStart(32, '0');
    }
    return '';
}
function getSpanId(carrier, getter) {
    const spanId = getHeaderValue(carrier, getter, constants_1.X_B3_SPAN_ID);
    if (typeof spanId === 'string') {
        return spanId;
    }
    return '';
}
function getDebug(carrier, getter) {
    const debug = getHeaderValue(carrier, getter, constants_1.X_B3_FLAGS);
    return debug === '1' ? '1' : undefined;
}
function getTraceFlags(carrier, getter) {
    const traceFlags = getHeaderValue(carrier, getter, constants_1.X_B3_SAMPLED);
    const debug = getDebug(carrier, getter);
    if (debug === '1' || VALID_SAMPLED_VALUES.has(traceFlags)) {
        return api_1.TraceFlags.SAMPLED;
    }
    if (traceFlags === undefined || VALID_UNSAMPLED_VALUES.has(traceFlags)) {
        return api_1.TraceFlags.NONE;
    }
    // This indicates to isValidSampledValue that this is not valid
    return;
}
/**
 * Propagator for the B3 multiple-header HTTP format.
 * Based on: https://github.com/openzipkin/b3-propagation
 */
class B3MultiPropagator {
    inject(context, carrier, setter) {
        const spanContext = api_1.trace.getSpanContext(context);
        if (!spanContext ||
            !(0, api_1.isSpanContextValid)(spanContext) ||
            (0, core_1.isTracingSuppressed)(context))
            return;
        const debug = context.getValue(common_1.B3_DEBUG_FLAG_KEY);
        setter.set(carrier, constants_1.X_B3_TRACE_ID, spanContext.traceId);
        setter.set(carrier, constants_1.X_B3_SPAN_ID, spanContext.spanId);
        // According to the B3 spec, if the debug flag is set,
        // the sampled flag shouldn't be propagated as well.
        if (debug === '1') {
            setter.set(carrier, constants_1.X_B3_FLAGS, debug);
        }
        else if (spanContext.traceFlags !== undefined) {
            // We set the header only if there is an existing sampling decision.
            // Otherwise we will omit it => Absent.
            setter.set(carrier, constants_1.X_B3_SAMPLED, (api_1.TraceFlags.SAMPLED & spanContext.traceFlags) === api_1.TraceFlags.SAMPLED
                ? '1'
                : '0');
        }
    }
    extract(context, carrier, getter) {
        const traceId = getTraceId(carrier, getter);
        const spanId = getSpanId(carrier, getter);
        const traceFlags = getTraceFlags(carrier, getter);
        const debug = getDebug(carrier, getter);
        if ((0, api_1.isValidTraceId)(traceId) &&
            (0, api_1.isValidSpanId)(spanId) &&
            isValidSampledValue(traceFlags)) {
            context = context.setValue(common_1.B3_DEBUG_FLAG_KEY, debug);
            return api_1.trace.setSpanContext(context, {
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
            constants_1.X_B3_TRACE_ID,
            constants_1.X_B3_SPAN_ID,
            constants_1.X_B3_FLAGS,
            constants_1.X_B3_SAMPLED,
            constants_1.X_B3_PARENT_SPAN_ID,
        ];
    }
}
exports.B3MultiPropagator = B3MultiPropagator;
//# sourceMappingURL=B3MultiPropagator.js.map