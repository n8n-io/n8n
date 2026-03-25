"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.AzureMonitorTraceExporter = void 0;
const api_1 = require("@opentelemetry/api");
const core_1 = require("@opentelemetry/core");
const base_js_1 = require("./base.js");
const spanUtils_js_1 = require("../utils/spanUtils.js");
const common_js_1 = require("../utils/common.js");
const index_js_1 = require("../platform/index.js");
/**
 * Azure Monitor OpenTelemetry Trace Exporter.
 */
class AzureMonitorTraceExporter extends base_js_1.AzureMonitorBaseExporter {
    /**
     * Initializes a new instance of the AzureMonitorTraceExporter class.
     * @param AzureExporterConfig - Exporter configuration.
     */
    constructor(options = {}) {
        super(options);
        /**
         * Flag to determine if Exporter is shutdown.
         */
        this.isShutdown = false;
        this.shouldCreateResourceMetric = (0, common_js_1.shouldCreateResourceMetric)();
        this.sender = new index_js_1.HttpSender({
            endpointUrl: this.endpointUrl,
            instrumentationKey: this.instrumentationKey,
            trackStatsbeat: this.trackStatsbeat,
            exporterOptions: options,
            aadAudience: this.aadAudience,
        });
        api_1.diag.debug("AzureMonitorTraceExporter was successfully setup");
    }
    /**
     * Export OpenTelemetry spans.
     * @param spans - Spans to export.
     * @param resultCallback - Result callback.
     */
    async export(spans, resultCallback) {
        if (this.isShutdown) {
            api_1.diag.info("Exporter shut down. Failed to export spans.");
            setTimeout(() => resultCallback({ code: core_1.ExportResultCode.FAILED }), 0);
            return;
        }
        api_1.diag.info(`Exporting ${spans.length} span(s). Converting to envelopes...`);
        if (spans.length > 0) {
            const envelopes = [];
            const resourceMetricEnvelope = (0, common_js_1.createResourceMetricEnvelope)(spans[0].resource, this.instrumentationKey);
            if (resourceMetricEnvelope && this.shouldCreateResourceMetric) {
                envelopes.push(resourceMetricEnvelope);
            }
            spans.forEach((span) => {
                envelopes.push((0, spanUtils_js_1.readableSpanToEnvelope)(span, this.instrumentationKey));
                const spanEventEnvelopes = (0, spanUtils_js_1.spanEventsToEnvelopes)(span, this.instrumentationKey);
                if (spanEventEnvelopes.length > 0) {
                    envelopes.push(...spanEventEnvelopes);
                }
            });
            resultCallback(await this.sender.exportEnvelopes(envelopes));
        }
        // No data to export
        resultCallback({ code: core_1.ExportResultCode.SUCCESS });
    }
    /**
     * Shutdown AzureMonitorTraceExporter.
     */
    async shutdown() {
        this.isShutdown = true;
        api_1.diag.info("AzureMonitorTraceExporter shutting down");
        return this.sender.shutdown();
    }
}
exports.AzureMonitorTraceExporter = AzureMonitorTraceExporter;
//# sourceMappingURL=trace.js.map