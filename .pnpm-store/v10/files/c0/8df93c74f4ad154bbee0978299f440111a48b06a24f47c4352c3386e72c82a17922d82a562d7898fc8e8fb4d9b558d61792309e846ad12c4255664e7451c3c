import type { AzureMonitorExporterOptions } from "../config.js";
/**
 * Azure Monitor OpenTelemetry Trace Exporter.
 */
export declare abstract class AzureMonitorBaseExporter {
    /**
     * Instrumentation key to be used for exported envelopes
     */
    protected instrumentationKey: string;
    /**
     * Ingestion Endpoint URL
     */
    protected endpointUrl: string;
    /**
     *Flag to determine if exporter will generate Statsbeat data
     */
    protected trackStatsbeat: boolean;
    /**
     * Instrumentation key to be used for exported envelopes
     */
    protected aadAudience: string | undefined;
    /**
     * Flag to determine if the Exporter is a Statsbeat Exporter
     */
    private isStatsbeatExporter;
    /**
     * Exporter internal configuration
     */
    private readonly options;
    /**
     * Initializes a new instance of the AzureMonitorBaseExporter class.
     * @param AzureMonitorExporterOptions - Exporter configuration.
     */
    constructor(options?: AzureMonitorExporterOptions, isStatsbeatExporter?: boolean);
}
//# sourceMappingURL=base.d.ts.map