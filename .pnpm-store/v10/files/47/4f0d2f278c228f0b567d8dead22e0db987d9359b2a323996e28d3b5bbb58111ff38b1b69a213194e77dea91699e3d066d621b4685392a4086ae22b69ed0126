"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsoleMetricExporter = void 0;
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
const core_1 = require("@opentelemetry/core");
const AggregationSelector_1 = require("./AggregationSelector");
/**
 * This is an implementation of {@link PushMetricExporter} that prints metrics to the
 * console. This class can be used for diagnostic purposes.
 *
 * NOTE: This {@link PushMetricExporter} is intended for diagnostics use only, output rendered to the console may change at any time.
 */
/* eslint-disable no-console */
class ConsoleMetricExporter {
    constructor(options) {
        var _a;
        this._shutdown = false;
        this._temporalitySelector =
            (_a = options === null || options === void 0 ? void 0 : options.temporalitySelector) !== null && _a !== void 0 ? _a : AggregationSelector_1.DEFAULT_AGGREGATION_TEMPORALITY_SELECTOR;
    }
    export(metrics, resultCallback) {
        if (this._shutdown) {
            // If the exporter is shutting down, by spec, we need to return FAILED as export result
            setImmediate(resultCallback, { code: core_1.ExportResultCode.FAILED });
            return;
        }
        return ConsoleMetricExporter._sendMetrics(metrics, resultCallback);
    }
    forceFlush() {
        return Promise.resolve();
    }
    selectAggregationTemporality(_instrumentType) {
        return this._temporalitySelector(_instrumentType);
    }
    shutdown() {
        this._shutdown = true;
        return Promise.resolve();
    }
    static _sendMetrics(metrics, done) {
        for (const scopeMetrics of metrics.scopeMetrics) {
            for (const metric of scopeMetrics.metrics) {
                console.dir({
                    descriptor: metric.descriptor,
                    dataPointType: metric.dataPointType,
                    dataPoints: metric.dataPoints,
                }, { depth: null });
            }
        }
        done({ code: core_1.ExportResultCode.SUCCESS });
    }
}
exports.ConsoleMetricExporter = ConsoleMetricExporter;
//# sourceMappingURL=ConsoleMetricExporter.js.map