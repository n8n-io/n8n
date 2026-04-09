"use strict";
/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
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