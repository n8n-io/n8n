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
import { globalErrorHandler } from '@opentelemetry/core';
/**
 * Implementation of the {@link SpanProcessor} that simply forwards all
 * received events to a list of {@link SpanProcessor}s.
 */
var MultiSpanProcessor = /** @class */ (function () {
    function MultiSpanProcessor(_spanProcessors) {
        this._spanProcessors = _spanProcessors;
    }
    MultiSpanProcessor.prototype.forceFlush = function () {
        var e_1, _a;
        var promises = [];
        try {
            for (var _b = __values(this._spanProcessors), _c = _b.next(); !_c.done; _c = _b.next()) {
                var spanProcessor = _c.value;
                promises.push(spanProcessor.forceFlush());
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return new Promise(function (resolve) {
            Promise.all(promises)
                .then(function () {
                resolve();
            })
                .catch(function (error) {
                globalErrorHandler(error || new Error('MultiSpanProcessor: forceFlush failed'));
                resolve();
            });
        });
    };
    MultiSpanProcessor.prototype.onStart = function (span, context) {
        var e_2, _a;
        try {
            for (var _b = __values(this._spanProcessors), _c = _b.next(); !_c.done; _c = _b.next()) {
                var spanProcessor = _c.value;
                spanProcessor.onStart(span, context);
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_2) throw e_2.error; }
        }
    };
    MultiSpanProcessor.prototype.onEnd = function (span) {
        var e_3, _a;
        try {
            for (var _b = __values(this._spanProcessors), _c = _b.next(); !_c.done; _c = _b.next()) {
                var spanProcessor = _c.value;
                spanProcessor.onEnd(span);
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_3) throw e_3.error; }
        }
    };
    MultiSpanProcessor.prototype.shutdown = function () {
        var e_4, _a;
        var promises = [];
        try {
            for (var _b = __values(this._spanProcessors), _c = _b.next(); !_c.done; _c = _b.next()) {
                var spanProcessor = _c.value;
                promises.push(spanProcessor.shutdown());
            }
        }
        catch (e_4_1) { e_4 = { error: e_4_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_4) throw e_4.error; }
        }
        return new Promise(function (resolve, reject) {
            Promise.all(promises).then(function () {
                resolve();
            }, reject);
        });
    };
    return MultiSpanProcessor;
}());
export { MultiSpanProcessor };
//# sourceMappingURL=MultiSpanProcessor.js.map