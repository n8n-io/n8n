import type { SenderResult } from "../../types.js";
import type { AzureMonitorExporterOptions } from "../../config.js";
import type { ExportResult } from "@opentelemetry/core";
import type { TelemetryItem as Envelope } from "../../generated/index.js";
/**
 * Base sender class
 * @internal
 */
export declare abstract class BaseSender {
    private readonly persister;
    private numConsecutiveRedirects;
    private retryTimer;
    private networkStatsbeatMetrics;
    private longIntervalStatsbeatMetrics;
    private statsbeatFailureCount;
    private batchSendRetryIntervalMs;
    private isStatsbeatSender;
    private disableOfflineStorage;
    constructor(options: {
        endpointUrl: string;
        instrumentationKey: string;
        trackStatsbeat: boolean;
        exporterOptions: AzureMonitorExporterOptions;
        aadAudience?: string;
        isStatsbeatSender?: boolean;
    });
    abstract send(payload: unknown[]): Promise<SenderResult>;
    abstract shutdown(): Promise<void>;
    abstract handlePermanentRedirect(location: string | undefined): void;
    /**
     * Export envelopes
     */
    exportEnvelopes(envelopes: Envelope[]): Promise<ExportResult>;
    /**
     * Persist envelopes to disk
     */
    private persist;
    /**
     * Disable collection of statsbeat metrics after max failures
     */
    private incrementStatsbeatFailure;
    /**
     * Shutdown statsbeat metrics
     */
    private shutdownStatsbeat;
    private sendFirstPersistedFile;
    private isRetriableRestError;
}
//# sourceMappingURL=baseSender.d.ts.map