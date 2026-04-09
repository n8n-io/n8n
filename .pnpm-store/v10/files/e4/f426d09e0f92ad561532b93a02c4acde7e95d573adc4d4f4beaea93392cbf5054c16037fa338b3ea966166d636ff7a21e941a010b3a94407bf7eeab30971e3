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
import { isSpanContextValid, trace, TraceFlags, } from '@opentelemetry/api';
import { isTracingSuppressed } from './suppress-tracing';
import { TraceState } from './TraceState';
export var TRACE_PARENT_HEADER = 'traceparent';
export var TRACE_STATE_HEADER = 'tracestate';
var VERSION = '00';
var VERSION_PART = '(?!ff)[\\da-f]{2}';
var TRACE_ID_PART = '(?![0]{32})[\\da-f]{32}';
var PARENT_ID_PART = '(?![0]{16})[\\da-f]{16}';
var FLAGS_PART = '[\\da-f]{2}';
var TRACE_PARENT_REGEX = new RegExp("^\\s?(" + VERSION_PART + ")-(" + TRACE_ID_PART + ")-(" + PARENT_ID_PART + ")-(" + FLAGS_PART + ")(-.*)?\\s?$");
/**
 * Parses information from the [traceparent] span tag and converts it into {@link SpanContext}
 * @param traceParent - A meta property that comes from server.
 *     It should be dynamically generated server side to have the server's request trace Id,
 *     a parent span Id that was set on the server's request span,
 *     and the trace flags to indicate the server's sampling decision
 *     (01 = sampled, 00 = not sampled).
 *     for example: '{version}-{traceId}-{spanId}-{sampleDecision}'
 *     For more information see {@link https://www.w3.org/TR/trace-context/}
 */
export function parseTraceParent(traceParent) {
    var match = TRACE_PARENT_REGEX.exec(traceParent);
    if (!match)
        return null;
    // According to the specification the implementation should be compatible
    // with future versions. If there are more parts, we only reject it if it's using version 00
    // See https://www.w3.org/TR/trace-context/#versioning-of-traceparent
    if (match[1] === '00' && match[5])
        return null;
    return {
        traceId: match[2],
        spanId: match[3],
        traceFlags: parseInt(match[4], 16),
    };
}
/**
 * Propagates {@link SpanContext} through Trace Context format propagation.
 *
 * Based on the Trace Context specification:
 * https://www.w3.org/TR/trace-context/
 */
var W3CTraceContextPropagator = /** @class */ (function () {
    function W3CTraceContextPropagator() {
    }
    W3CTraceContextPropagator.prototype.inject = function (context, carrier, setter) {
        var spanContext = trace.getSpanContext(context);
        if (!spanContext ||
            isTracingSuppressed(context) ||
            !isSpanContextValid(spanContext))
            return;
        var traceParent = VERSION + "-" + spanContext.traceId + "-" + spanContext.spanId + "-0" + Number(spanContext.traceFlags || TraceFlags.NONE).toString(16);
        setter.set(carrier, TRACE_PARENT_HEADER, traceParent);
        if (spanContext.traceState) {
            setter.set(carrier, TRACE_STATE_HEADER, spanContext.traceState.serialize());
        }
    };
    W3CTraceContextPropagator.prototype.extract = function (context, carrier, getter) {
        var traceParentHeader = getter.get(carrier, TRACE_PARENT_HEADER);
        if (!traceParentHeader)
            return context;
        var traceParent = Array.isArray(traceParentHeader)
            ? traceParentHeader[0]
            : traceParentHeader;
        if (typeof traceParent !== 'string')
            return context;
        var spanContext = parseTraceParent(traceParent);
        if (!spanContext)
            return context;
        spanContext.isRemote = true;
        var traceStateHeader = getter.get(carrier, TRACE_STATE_HEADER);
        if (traceStateHeader) {
            // If more than one `tracestate` header is found, we merge them into a
            // single header.
            var state = Array.isArray(traceStateHeader)
                ? traceStateHeader.join(',')
                : traceStateHeader;
            spanContext.traceState = new TraceState(typeof state === 'string' ? state : undefined);
        }
        return trace.setSpanContext(context, spanContext);
    };
    W3CTraceContextPropagator.prototype.fields = function () {
        return [TRACE_PARENT_HEADER, TRACE_STATE_HEADER];
    };
    return W3CTraceContextPropagator;
}());
export { W3CTraceContextPropagator };
//# sourceMappingURL=W3CTraceContextPropagator.js.map