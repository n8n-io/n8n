import type { ExportResult } from "@opentelemetry/core";
import { AzureMonitorBaseExporter } from "./base.js";
import type { AzureMonitorExporterOptions } from "../config.js";
import type { ReadableLogRecord, LogRecordExporter } from "@opentelemetry/sdk-logs";
/**
 * Azure Monitor OpenTelemetry Log Exporter.
 */
export declare class AzureMonitorLogExporter extends AzureMonitorBaseExporter implements LogRecordExporter {
    /**
     * Flag to determine if Exporter is shutdown.
     */
    private _isShutdown;
    private readonly _sender;
    /**
     * Initializes a new instance of the AzureMonitorLogExporter class.
     * @param AzureExporterConfig - Exporter configuration.
     */
    constructor(options?: AzureMonitorExporterOptions);
    /**
     * Export OpenTelemetry logs.
     * @param logs - Logs to export.
     * @param resultCallback - Result callback.
     */
    export(logs: ReadableLogRecord[], resultCallback: (result: ExportResult) => void): Promise<void>;
    /**
     * Shutdown AzureMonitorLogExporter.
     */
    shutdown(): Promise<void>;
}
//# sourceMappingURL=log.d.ts.map