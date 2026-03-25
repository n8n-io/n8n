// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { diag } from "@opentelemetry/api";
import { ExportResultCode } from "@opentelemetry/core";
import { AzureMonitorBaseExporter } from "./base.js";
import { readableSpanToEnvelope, spanEventsToEnvelopes } from "../utils/spanUtils.js";
import { createResourceMetricEnvelope, shouldCreateResourceMetric } from "../utils/common.js";
import { HttpSender } from "../platform/index.js";
/**
 * Azure Monitor OpenTelemetry Trace Exporter.
 */
export class AzureMonitorTraceExporter extends AzureMonitorBaseExporter {
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
        this.shouldCreateResourceMetric = shouldCreateResourceMetric();
        this.sender = new HttpSender({
            endpointUrl: this.endpointUrl,
            instrumentationKey: this.instrumentationKey,
            trackStatsbeat: this.trackStatsbeat,
            exporterOptions: options,
            aadAudience: this.aadAudience,
        });
        diag.debug("AzureMonitorTraceExporter was successfully setup");
    }
    /**
     * Export OpenTelemetry spans.
     * @param spans - Spans to export.
     * @param resultCallback - Result callback.
     */
    async export(spans, resultCallback) {
        if (this.isShutdown) {
            diag.info("Exporter shut down. Failed to export spans.");
            setTimeout(() => resultCallback({ code: ExportResultCode.FAILED }), 0);
            return;
        }
        diag.info(`Exporting ${spans.length} span(s). Converting to envelopes...`);
        if (spans.length > 0) {
            const envelopes = [];
            const resourceMetricEnvelope = createResourceMetricEnvelope(spans[0].resource, this.instrumentationKey);
            if (resourceMetricEnvelope && this.shouldCreateResourceMetric) {
                envelopes.push(resourceMetricEnvelope);
            }
            spans.forEach((span) => {
                envelopes.push(readableSpanToEnvelope(span, this.instrumentationKey));
                const spanEventEnvelopes = spanEventsToEnvelopes(span, this.instrumentationKey);
                if (spanEventEnvelopes.length > 0) {
                    envelopes.push(...spanEventEnvelopes);
                }
            });
            resultCallback(await this.sender.exportEnvelopes(envelopes));
        }
        // No data to export
        resultCallback({ code: ExportResultCode.SUCCESS });
    }
    /**
     * Shutdown AzureMonitorTraceExporter.
     */
    async shutdown() {
        this.isShutdown = true;
        diag.info("AzureMonitorTraceExporter shutting down");
        return this.sender.shutdown();
    }
}
//# sourceMappingURL=trace.js.map