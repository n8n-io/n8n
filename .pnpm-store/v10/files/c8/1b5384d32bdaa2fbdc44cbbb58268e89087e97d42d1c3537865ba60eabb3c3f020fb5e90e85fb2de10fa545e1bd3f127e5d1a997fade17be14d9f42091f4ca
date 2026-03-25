"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.AzureMonitorLogExporter = void 0;
const api_1 = require("@opentelemetry/api");
const core_1 = require("@opentelemetry/core");
const base_js_1 = require("./base.js");
const logUtils_js_1 = require("../utils/logUtils.js");
const index_js_1 = require("../platform/index.js");
/**
 * Azure Monitor OpenTelemetry Log Exporter.
 */
class AzureMonitorLogExporter extends base_js_1.AzureMonitorBaseExporter {
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
        this._sender = new index_js_1.HttpSender({
            endpointUrl: this.endpointUrl,
            instrumentationKey: this.instrumentationKey,
            trackStatsbeat: this.trackStatsbeat,
            exporterOptions: options,
            aadAudience: this.aadAudience,
        });
        api_1.diag.debug("AzureMonitorLogExporter was successfully setup");
    }
    /**
     * Export OpenTelemetry logs.
     * @param logs - Logs to export.
     * @param resultCallback - Result callback.
     */
    async export(logs, resultCallback) {
        if (this._isShutdown) {
            api_1.diag.info("Exporter shut down. Failed to export spans.");
            setTimeout(() => resultCallback({ code: core_1.ExportResultCode.FAILED }), 0);
            return;
        }
        api_1.diag.info(`Exporting ${logs.length} logs(s). Converting to envelopes...`);
        const envelopes = [];
        logs.forEach((log) => {
            const envelope = (0, logUtils_js_1.logToEnvelope)(log, this.instrumentationKey);
            if (envelope) {
                envelopes.push(envelope);
            }
        });
        // Supress tracing until OpenTelemetry Logs SDK support it
        await api_1.context.with((0, core_1.suppressTracing)(api_1.context.active()), async () => {
            resultCallback(await this._sender.exportEnvelopes(envelopes));
        });
    }
    /**
     * Shutdown AzureMonitorLogExporter.
     */
    async shutdown() {
        this._isShutdown = true;
        api_1.diag.info("AzureMonitorLogExporter shutting down");
        return this._sender.shutdown();
    }
}
exports.AzureMonitorLogExporter = AzureMonitorLogExporter;
//# sourceMappingURL=log.js.map