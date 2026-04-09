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
/**
 * In-memory Metrics Exporter is a Push Metric Exporter
 * which accumulates metrics data in the local memory and
 * allows to inspect it (useful for e.g. unit tests).
 */
var InMemoryMetricExporter = /** @class */ (function () {
    function InMemoryMetricExporter(aggregationTemporality) {
        this._shutdown = false;
        this._metrics = [];
        this._aggregationTemporality = aggregationTemporality;
    }
    /**
     * @inheritedDoc
     */
    InMemoryMetricExporter.prototype.export = function (metrics, resultCallback) {
        // Avoid storing metrics when exporter is shutdown
        if (this._shutdown) {
            setTimeout(function () { return resultCallback({ code: ExportResultCode.FAILED }); }, 0);
            return;
        }
        this._metrics.push(metrics);
        setTimeout(function () { return resultCallback({ code: ExportResultCode.SUCCESS }); }, 0);
    };
    /**
     * Returns all the collected resource metrics
     * @returns ResourceMetrics[]
     */
    InMemoryMetricExporter.prototype.getMetrics = function () {
        return this._metrics;
    };
    InMemoryMetricExporter.prototype.forceFlush = function () {
        return Promise.resolve();
    };
    InMemoryMetricExporter.prototype.reset = function () {
        this._metrics = [];
    };
    InMemoryMetricExporter.prototype.selectAggregationTemporality = function (_instrumentType) {
        return this._aggregationTemporality;
    };
    InMemoryMetricExporter.prototype.shutdown = function () {
        this._shutdown = true;
        return Promise.resolve();
    };
    return InMemoryMetricExporter;
}());
export { InMemoryMetricExporter };
//# sourceMappingURL=InMemoryMetricExporter.js.map