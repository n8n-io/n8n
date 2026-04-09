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
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
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
import { propagation, trace, TraceFlags, } from '@opentelemetry/api';
import { isTracingSuppressed } from '@opentelemetry/core';
export var UBER_TRACE_ID_HEADER = 'uber-trace-id';
export var UBER_BAGGAGE_HEADER_PREFIX = 'uberctx';
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
var JaegerPropagator = /** @class */ (function () {
    function JaegerPropagator(config) {
        if (typeof config === 'string') {
            this._jaegerTraceHeader = config;
            this._jaegerBaggageHeaderPrefix = UBER_BAGGAGE_HEADER_PREFIX;
        }
        else {
            this._jaegerTraceHeader =
                (config === null || config === void 0 ? void 0 : config.customTraceHeader) || UBER_TRACE_ID_HEADER;
            this._jaegerBaggageHeaderPrefix =
                (config === null || config === void 0 ? void 0 : config.customBaggageHeaderPrefix) || UBER_BAGGAGE_HEADER_PREFIX;
        }
    }
    JaegerPropagator.prototype.inject = function (context, carrier, setter) {
        var e_1, _a;
        var spanContext = trace.getSpanContext(context);
        var baggage = propagation.getBaggage(context);
        if (spanContext && isTracingSuppressed(context) === false) {
            var traceFlags = "0" + (spanContext.traceFlags || TraceFlags.NONE).toString(16);
            setter.set(carrier, this._jaegerTraceHeader, spanContext.traceId + ":" + spanContext.spanId + ":0:" + traceFlags);
        }
        if (baggage) {
            try {
                for (var _b = __values(baggage.getAllEntries()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var _d = __read(_c.value, 2), key = _d[0], entry = _d[1];
                    setter.set(carrier, this._jaegerBaggageHeaderPrefix + "-" + key, encodeURIComponent(entry.value));
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
        }
    };
    JaegerPropagator.prototype.extract = function (context, carrier, getter) {
        var e_2, _a;
        var _this = this;
        var _b;
        var uberTraceIdHeader = getter.get(carrier, this._jaegerTraceHeader);
        var uberTraceId = Array.isArray(uberTraceIdHeader)
            ? uberTraceIdHeader[0]
            : uberTraceIdHeader;
        var baggageValues = getter
            .keys(carrier)
            .filter(function (key) { return key.startsWith(_this._jaegerBaggageHeaderPrefix + "-"); })
            .map(function (key) {
            var value = getter.get(carrier, key);
            return {
                key: key.substring(_this._jaegerBaggageHeaderPrefix.length + 1),
                value: Array.isArray(value) ? value[0] : value,
            };
        });
        var newContext = context;
        // if the trace id header is present and valid, inject it into the context
        if (typeof uberTraceId === 'string') {
            var spanContext = deserializeSpanContext(uberTraceId);
            if (spanContext) {
                newContext = trace.setSpanContext(newContext, spanContext);
            }
        }
        if (baggageValues.length === 0)
            return newContext;
        // if baggage values are present, inject it into the current baggage
        var currentBaggage = (_b = propagation.getBaggage(context)) !== null && _b !== void 0 ? _b : propagation.createBaggage();
        try {
            for (var baggageValues_1 = __values(baggageValues), baggageValues_1_1 = baggageValues_1.next(); !baggageValues_1_1.done; baggageValues_1_1 = baggageValues_1.next()) {
                var baggageEntry = baggageValues_1_1.value;
                if (baggageEntry.value === undefined)
                    continue;
                currentBaggage = currentBaggage.setEntry(baggageEntry.key, {
                    value: decodeURIComponent(baggageEntry.value),
                });
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (baggageValues_1_1 && !baggageValues_1_1.done && (_a = baggageValues_1.return)) _a.call(baggageValues_1);
            }
            finally { if (e_2) throw e_2.error; }
        }
        newContext = propagation.setBaggage(newContext, currentBaggage);
        return newContext;
    };
    JaegerPropagator.prototype.fields = function () {
        return [this._jaegerTraceHeader];
    };
    return JaegerPropagator;
}());
export { JaegerPropagator };
var VALID_HEX_RE = /^[0-9a-f]{1,2}$/i;
/**
 * @param {string} serializedString - a serialized span context.
 * @return {SpanContext} - returns a span context represented by the serializedString.
 **/
function deserializeSpanContext(serializedString) {
    var headers = decodeURIComponent(serializedString).split(':');
    if (headers.length !== 4) {
        return null;
    }
    var _a = __read(headers, 4), _traceId = _a[0], _spanId = _a[1], flags = _a[3];
    var traceId = _traceId.padStart(32, '0');
    var spanId = _spanId.padStart(16, '0');
    var traceFlags = VALID_HEX_RE.test(flags) ? parseInt(flags, 16) & 1 : 1;
    return { traceId: traceId, spanId: spanId, isRemote: true, traceFlags: traceFlags };
}
//# sourceMappingURL=JaegerPropagator.js.map