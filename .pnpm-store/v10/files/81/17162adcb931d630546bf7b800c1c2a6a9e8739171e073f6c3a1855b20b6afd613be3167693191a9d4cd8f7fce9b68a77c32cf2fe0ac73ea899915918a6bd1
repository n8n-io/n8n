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
import { ExportResultCode } from '@opentelemetry/core';
import { DEFAULT_AGGREGATION_TEMPORALITY_SELECTOR, } from './AggregationSelector';
/**
 * This is an implementation of {@link PushMetricExporter} that prints metrics to the
 * console. This class can be used for diagnostic purposes.
 *
 * NOTE: This {@link PushMetricExporter} is intended for diagnostics use only, output rendered to the console may change at any time.
 */
/* eslint-disable no-console */
var ConsoleMetricExporter = /** @class */ (function () {
    function ConsoleMetricExporter(options) {
        var _a;
        this._shutdown = false;
        this._temporalitySelector =
            (_a = options === null || options === void 0 ? void 0 : options.temporalitySelector) !== null && _a !== void 0 ? _a : DEFAULT_AGGREGATION_TEMPORALITY_SELECTOR;
    }
    ConsoleMetricExporter.prototype.export = function (metrics, resultCallback) {
        if (this._shutdown) {
            // If the exporter is shutting down, by spec, we need to return FAILED as export result
            setImmediate(resultCallback, { code: ExportResultCode.FAILED });
            return;
        }
        return ConsoleMetricExporter._sendMetrics(metrics, resultCallback);
    };
    ConsoleMetricExporter.prototype.forceFlush = function () {
        return Promise.resolve();
    };
    ConsoleMetricExporter.prototype.selectAggregationTemporality = function (_instrumentType) {
        return this._temporalitySelector(_instrumentType);
    };
    ConsoleMetricExporter.prototype.shutdown = function () {
        this._shutdown = true;
        return Promise.resolve();
    };
    ConsoleMetricExporter._sendMetrics = function (metrics, done) {
        var e_1, _a, e_2, _b;
        try {
            for (var _c = __values(metrics.scopeMetrics), _d = _c.next(); !_d.done; _d = _c.next()) {
                var scopeMetrics = _d.value;
                try {
                    for (var _e = (e_2 = void 0, __values(scopeMetrics.metrics)), _f = _e.next(); !_f.done; _f = _e.next()) {
                        var metric = _f.value;
                        console.dir({
                            descriptor: metric.descriptor,
                            dataPointType: metric.dataPointType,
                            dataPoints: metric.dataPoints,
                        }, { depth: null });
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
            }
            finally { if (e_1) throw e_1.error; }
        }
        done({ code: ExportResultCode.SUCCESS });
    };
    return ConsoleMetricExporter;
}());
export { ConsoleMetricExporter };
//# sourceMappingURL=ConsoleMetricExporter.js.map