import type { PushMetricExporter, ResourceMetrics } from "@opentelemetry/sdk-metrics";
import { AggregationTemporality, InstrumentType } from "@opentelemetry/sdk-metrics";
import type { ExportResult } from "@opentelemetry/core";
import { AzureMonitorBaseExporter } from "./base.js";
import type { AzureMonitorExporterOptions } from "../config.js";
/**
 * Azure Monitor OpenTelemetry Metric Exporter.
 */
export declare class AzureMonitorMetricExporter extends AzureMonitorBaseExporter implements PushMetricExporter {
    /**
     * Flag to determine if Exporter is shutdown.
     */
    private _isShutdown;
    private _sender;
    /**
     * Initializes a new instance of the AzureMonitorMetricExporter class.
     * @param AzureExporterConfig - Exporter configuration.
     */
    constructor(options?: AzureMonitorExporterOptions);
    /**
     * Export OpenTelemetry resource metrics.
     * @param metrics - Resource metrics to export.
     * @param resultCallback - Result callback.
     */
    export(metrics: ResourceMetrics, resultCallback: (result: ExportResult) => void): Promise<void>;
    /**
     * Shutdown AzureMonitorMetricExporter.
     */
    shutdown(): Promise<void>;
    /**
     * Select aggregation temporality
     */
    selectAggregationTemporality(instrumentType: InstrumentType): AggregationTemporality;
    /**
     * Force flush
     */
    forceFlush(): Promise<void>;
}
//# sourceMappingURL=metric.d.ts.map