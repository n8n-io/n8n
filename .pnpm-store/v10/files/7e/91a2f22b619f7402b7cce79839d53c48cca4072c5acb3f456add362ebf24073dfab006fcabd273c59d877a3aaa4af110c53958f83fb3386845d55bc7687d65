// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { context, diag } from "@opentelemetry/api";
import { AggregationTemporality, InstrumentType } from "@opentelemetry/sdk-metrics";
import { ExportResultCode, suppressTracing } from "@opentelemetry/core";
import { AzureMonitorBaseExporter } from "./base.js";
import { resourceMetricsToEnvelope } from "../utils/metricUtils.js";
import { HttpSender } from "../platform/index.js";
/**
 * Azure Monitor OpenTelemetry Metric Exporter.
 */
export class AzureMonitorMetricExporter extends AzureMonitorBaseExporter {
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
        this._sender = new HttpSender({
            endpointUrl: this.endpointUrl,
            instrumentationKey: this.instrumentationKey,
            trackStatsbeat: this.trackStatsbeat,
            exporterOptions: options,
            aadAudience: this.aadAudience,
        });
        diag.debug("AzureMonitorMetricExporter was successfully setup");
    }
    /**
     * Export OpenTelemetry resource metrics.
     * @param metrics - Resource metrics to export.
     * @param resultCallback - Result callback.
     */
    async export(metrics, resultCallback) {
        if (this._isShutdown) {
            diag.info("Exporter shut down. Failed to export spans.");
            setTimeout(() => resultCallback({ code: ExportResultCode.FAILED }), 0);
            return;
        }
        diag.info(`Exporting ${metrics.scopeMetrics.length} metrics(s). Converting to envelopes...`);
        const envelopes = resourceMetricsToEnvelope(metrics, this.instrumentationKey);
        // Supress tracing until OpenTelemetry Metrics SDK support it
        await context.with(suppressTracing(context.active()), async () => {
            resultCallback(await this._sender.exportEnvelopes(envelopes));
        });
    }
    /**
     * Shutdown AzureMonitorMetricExporter.
     */
    async shutdown() {
        this._isShutdown = true;
        diag.info("AzureMonitorMetricExporter shutting down");
        return this._sender.shutdown();
    }
    /**
     * Select aggregation temporality
     */
    selectAggregationTemporality(instrumentType) {
        if (instrumentType === InstrumentType.UP_DOWN_COUNTER ||
            instrumentType === InstrumentType.OBSERVABLE_UP_DOWN_COUNTER) {
            return AggregationTemporality.CUMULATIVE;
        }
        return AggregationTemporality.DELTA;
    }
    /**
     * Force flush
     */
    async forceFlush() {
        return Promise.resolve();
    }
}
//# sourceMappingURL=metric.js.map