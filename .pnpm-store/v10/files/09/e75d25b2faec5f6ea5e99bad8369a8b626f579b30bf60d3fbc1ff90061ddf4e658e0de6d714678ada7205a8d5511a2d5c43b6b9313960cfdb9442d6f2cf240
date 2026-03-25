// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { context, diag } from "@opentelemetry/api";
import { ExportResultCode, suppressTracing } from "@opentelemetry/core";
import { AzureMonitorBaseExporter } from "./base.js";
import { logToEnvelope } from "../utils/logUtils.js";
import { HttpSender } from "../platform/index.js";
/**
 * Azure Monitor OpenTelemetry Log Exporter.
 */
export class AzureMonitorLogExporter extends AzureMonitorBaseExporter {
    /**
     * Initializes a new instance of the AzureMonitorLogExporter class.
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
        diag.debug("AzureMonitorLogExporter was successfully setup");
    }
    /**
     * Export OpenTelemetry logs.
     * @param logs - Logs to export.
     * @param resultCallback - Result callback.
     */
    async export(logs, resultCallback) {
        if (this._isShutdown) {
            diag.info("Exporter shut down. Failed to export spans.");
            setTimeout(() => resultCallback({ code: ExportResultCode.FAILED }), 0);
            return;
        }
        diag.info(`Exporting ${logs.length} logs(s). Converting to envelopes...`);
        const envelopes = [];
        logs.forEach((log) => {
            const envelope = logToEnvelope(log, this.instrumentationKey);
            if (envelope) {
                envelopes.push(envelope);
            }
        });
        // Supress tracing until OpenTelemetry Logs SDK support it
        await context.with(suppressTracing(context.active()), async () => {
            resultCallback(await this._sender.exportEnvelopes(envelopes));
        });
    }
    /**
     * Shutdown AzureMonitorLogExporter.
     */
    async shutdown() {
        this._isShutdown = true;
        diag.info("AzureMonitorLogExporter shutting down");
        return this._sender.shutdown();
    }
}
//# sourceMappingURL=log.js.map