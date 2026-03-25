import type { PushMetricExporter, ResourceMetrics } from "@opentelemetry/sdk-metrics";
import type { ExportResult } from "@opentelemetry/core";
import type { AzureMonitorExporterOptions } from "../../config.js";
import { AzureMonitorBaseExporter } from "../base.js";
/**
 * Azure Monitor Statsbeat Exporter
 */
export declare class AzureMonitorStatsbeatExporter extends AzureMonitorBaseExporter implements PushMetricExporter {
    /**
     * Flag to determine if the Exporter is shutdown.
     */
    private _isShutdown;
    private _sender;
    /**
     * Initializes a new instance of the AzureMonitorStatsbeatExporter class.
     * @param options - Exporter configuration
     */
    constructor(options: AzureMonitorExporterOptions);
    /**
     * Export Statsbeat metrics.
     */
    export(metrics: ResourceMetrics, resultCallback: (result: ExportResult) => void): Promise<void>;
    /**
     * Shutdown AzureMonitorStatsbeatExporter.
     */
    shutdown(): Promise<void>;
    /**
     * Force flush.
     */
    forceFlush(): Promise<void>;
}
//# sourceMappingURL=statsbeatExporter.d.ts.map