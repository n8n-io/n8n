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
exports.InMemoryMetricExporter = void 0;
const core_1 = require("@opentelemetry/core");
/**
 * In-memory Metrics Exporter is a Push Metric Exporter
 * which accumulates metrics data in the local memory and
 * allows to inspect it (useful for e.g. unit tests).
 */
class InMemoryMetricExporter {
    _shutdown = false;
    _aggregationTemporality;
    _metrics = [];
    constructor(aggregationTemporality) {
        this._aggregationTemporality = aggregationTemporality;
    }
    /**
     * @inheritedDoc
     */
    export(metrics, resultCallback) {
        // Avoid storing metrics when exporter is shutdown
        if (this._shutdown) {
            setTimeout(() => resultCallback({ code: core_1.ExportResultCode.FAILED }), 0);
            return;
        }
        this._metrics.push(metrics);
        setTimeout(() => resultCallback({ code: core_1.ExportResultCode.SUCCESS }), 0);
    }
    /**
     * Returns all the collected resource metrics
     * @returns ResourceMetrics[]
     */
    getMetrics() {
        return this._metrics;
    }
    forceFlush() {
        return Promise.resolve();
    }
    reset() {
        this._metrics = [];
    }
    selectAggregationTemporality(_instrumentType) {
        return this._aggregationTemporality;
    }
    shutdown() {
        this._shutdown = true;
        return Promise.resolve();
    }
}
exports.InMemoryMetricExporter = InMemoryMetricExporter;
//# sourceMappingURL=InMemoryMetricExporter.js.map