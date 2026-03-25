"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AzureMonitorStatsbeatExporter = void 0;
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
const api_1 = require("@opentelemetry/api");
const core_1 = require("@opentelemetry/core");
const metricUtils_js_1 = require("../../utils/metricUtils.js");
const base_js_1 = require("../base.js");
const index_js_1 = require("../../platform/index.js");
/**
 * Azure Monitor Statsbeat Exporter
 */
class AzureMonitorStatsbeatExporter extends base_js_1.AzureMonitorBaseExporter {
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
        this._sender = new index_js_1.HttpSender({
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
            setTimeout(() => resultCallback({ code: core_1.ExportResultCode.FAILED }), 0);
            return;
        }
        const envelopes = (0, metricUtils_js_1.resourceMetricsToEnvelope)(metrics, this.instrumentationKey, true);
        // Supress tracing until OpenTelemetry Metrics SDK support it
        api_1.context.with((0, core_1.suppressTracing)(api_1.context.active()), async () => {
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
exports.AzureMonitorStatsbeatExporter = AzureMonitorStatsbeatExporter;
//# sourceMappingURL=statsbeatExporter.js.map