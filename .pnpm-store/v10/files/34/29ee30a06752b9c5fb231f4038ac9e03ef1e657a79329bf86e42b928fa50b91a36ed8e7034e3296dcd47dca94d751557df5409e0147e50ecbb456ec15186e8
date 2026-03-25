import type { ExportResult } from "@opentelemetry/core";
import type { ReadableSpan, SpanExporter } from "@opentelemetry/sdk-trace-base";
import { AzureMonitorBaseExporter } from "./base.js";
import type { AzureMonitorExporterOptions } from "../config.js";
/**
 * Azure Monitor OpenTelemetry Trace Exporter.
 */
export declare class AzureMonitorTraceExporter extends AzureMonitorBaseExporter implements SpanExporter {
    /**
     * Flag to determine if Exporter is shutdown.
     */
    private isShutdown;
    private readonly sender;
    private shouldCreateResourceMetric;
    /**
     * Initializes a new instance of the AzureMonitorTraceExporter class.
     * @param AzureExporterConfig - Exporter configuration.
     */
    constructor(options?: AzureMonitorExporterOptions);
    /**
     * Export OpenTelemetry spans.
     * @param spans - Spans to export.
     * @param resultCallback - Result callback.
     */
    export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): Promise<void>;
    /**
     * Shutdown AzureMonitorTraceExporter.
     */
    shutdown(): Promise<void>;
}
//# sourceMappingURL=trace.d.ts.map