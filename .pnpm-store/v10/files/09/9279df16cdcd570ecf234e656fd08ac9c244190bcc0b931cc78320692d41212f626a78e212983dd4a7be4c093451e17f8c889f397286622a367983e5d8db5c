// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { context } from "@opentelemetry/api";
import { ExportResultCode, suppressTracing } from "@opentelemetry/core";
import { resourceMetricsToEnvelope } from "../../utils/metricUtils.js";
import { AzureMonitorBaseExporter } from "../base.js";
import { HttpSender } from "../../platform/index.js";
/**
 * Azure Monitor Statsbeat Exporter
 */
export class AzureMonitorStatsbeatExporter extends AzureMonitorBaseExporter {
    /**
     * Initializes a new instance of the AzureMonitorStatsbeatExporter class.
     * @param options - Exporter configuration
     */
    constructor(options) {
        super(options, true);
        /**
         * Flag to determine if the Exporter is shutdown.
         */
        this._isShutdown = false;
        this._sender = new HttpSender({
            endpointUrl: this.endpointUrl,
            instrumentationKey: this.instrumentationKey,
            trackStatsbeat: this.trackStatsbeat,
            exporterOptions: options,
            isStatsbeatSender: true,
        });
    }
    /**
     * Export Statsbeat metrics.
     */
    async export(metrics, resultCallback) {
        if (this._isShutdown) {
            setTimeout(() => resultCallback({ code: ExportResultCode.FAILED }), 0);
            return;
        }
        const envelopes = resourceMetricsToEnvelope(metrics, this.instrumentationKey, true);
        // Supress tracing until OpenTelemetry Metrics SDK support it
        context.with(suppressTracing(context.active()), async () => {
            resultCallback(await this._sender.exportEnvelopes(envelopes));
        });
    }
    /**
     * Shutdown AzureMonitorStatsbeatExporter.
     */
    async shutdown() {
        this._isShutdown = true;
        return this._sender.shutdown();
    }
    /**
     * Force flush.
     */
    async forceFlush() {
        return Promise.resolve();
    }
}
//# sourceMappingURL=statsbeatExporter.js.map