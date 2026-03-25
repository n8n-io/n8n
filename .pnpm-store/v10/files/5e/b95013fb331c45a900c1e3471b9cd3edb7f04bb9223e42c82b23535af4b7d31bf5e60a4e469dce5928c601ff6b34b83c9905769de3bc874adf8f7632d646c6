"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AzureMonitorMetricExporter = void 0;
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
const api_1 = require("@opentelemetry/api");
const sdk_metrics_1 = require("@opentelemetry/sdk-metrics");
const core_1 = require("@opentelemetry/core");
const base_js_1 = require("./base.js");
const metricUtils_js_1 = require("../utils/metricUtils.js");
const index_js_1 = require("../platform/index.js");
/**
 * Azure Monitor OpenTelemetry Metric Exporter.
 */
class AzureMonitorMetricExporter extends base_js_1.AzureMonitorBaseExporter {
    /**
     * Initializes a new instance of the AzureMonitorMetricExporter class.
     * @param AzureExporterConfig - Exporter configuration.
     */
    constructor(options = {}) {
        super(options);
        /**
         * Flag to determine if Exporter is shutdown.
         */
        this._isShutdown = false;
        this._sender = new index_js_1.HttpSender({
            endpointUrl: this.endpointUrl,
            instrumentationKey: this.instrumentationKey,
            trackStatsbeat: this.trackStatsbeat,
            exporterOptions: options,
            aadAudience: this.aadAudience,
        });
        api_1.diag.debug("AzureMonitorMetricExporter was successfully setup");
    }
    /**
     * Export OpenTelemetry resource metrics.
     * @param metrics - Resource metrics to export.
     * @param resultCallback - Result callback.
     */
    async export(metrics, resultCallback) {
        if (this._isShutdown) {
            api_1.diag.info("Exporter shut down. Failed to export spans.");
            setTimeout(() => resultCallback({ code: core_1.ExportResultCode.FAILED }), 0);
            return;
        }
        api_1.diag.info(`Exporting ${metrics.scopeMetrics.length} metrics(s). Converting to envelopes...`);
        const envelopes = (0, metricUtils_js_1.resourceMetricsToEnvelope)(metrics, this.instrumentationKey);
        // Supress tracing until OpenTelemetry Metrics SDK support it
        await api_1.context.with((0, core_1.suppressTracing)(api_1.context.active()), async () => {
            resultCallback(await this._sender.exportEnvelopes(envelopes));
        });
    }
    /**
     * Shutdown AzureMonitorMetricExporter.
     */
    async shutdown() {
        this._isShutdown = true;
        api_1.diag.info("AzureMonitorMetricExporter shutting down");
        return this._sender.shutdown();
    }
    /**
     * Select aggregation temporality
     */
    selectAggregationTemporality(instrumentType) {
        if (instrumentType === sdk_metrics_1.InstrumentType.UP_DOWN_COUNTER ||
            instrumentType === sdk_metrics_1.InstrumentType.OBSERVABLE_UP_DOWN_COUNTER) {
            return sdk_metrics_1.AggregationTemporality.CUMULATIVE;
        }
        return sdk_metrics_1.AggregationTemporality.DELTA;
    }
    /**
     * Force flush
     */
    async forceFlush() {
        return Promise.resolve();
    }
}
exports.AzureMonitorMetricExporter = AzureMonitorMetricExporter;
//# sourceMappingURL=metric.js.map