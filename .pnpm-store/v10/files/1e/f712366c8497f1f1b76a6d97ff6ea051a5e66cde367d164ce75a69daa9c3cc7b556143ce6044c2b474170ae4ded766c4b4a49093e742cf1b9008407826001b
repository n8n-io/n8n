/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
import { ExportResultCode } from '@opentelemetry/core';
/**
 * In-memory Metrics Exporter is a Push Metric Exporter
 * which accumulates metrics data in the local memory and
 * allows to inspect it (useful for e.g. unit tests).
 */
export class InMemoryMetricExporter {
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
            setTimeout(() => resultCallback({ code: ExportResultCode.FAILED }), 0);
            return;
        }
        this._metrics.push(metrics);
        setTimeout(() => resultCallback({ code: ExportResultCode.SUCCESS }), 0);
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
//# sourceMappingURL=InMemoryMetricExporter.js.map