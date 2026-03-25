import { StatsbeatMetrics } from "./statsbeatMetrics.js";
import type { StatsbeatOptions } from "./types.js";
export declare class NetworkStatsbeatMetrics extends StatsbeatMetrics {
    private static instance;
    private disableNonEssentialStatsbeat;
    private commonProperties;
    private networkProperties;
    private isInitialized;
    private statsCollectionShortInterval;
    private networkStatsbeatCollection;
    private networkStatsbeatMeter;
    private networkStatsbeatMeterProvider;
    private networkAzureExporter;
    private cikey;
    private runtimeVersion;
    private language;
    private version;
    private attach;
    private successCountGauge;
    private failureCountGauge;
    private retryCountGauge;
    private throttleCountGauge;
    private exceptionCountGauge;
    private averageDurationGauge;
    private readFailureGauge;
    private writeFailureGauge;
    private connectionString;
    private endpointUrl;
    private host;
    constructor(options: StatsbeatOptions);
    shutdown(): Promise<void>;
    private initialize;
    private successCallback;
    private failureCallback;
    private retryCallback;
    private throttleCallback;
    private exceptionCallback;
    private durationCallback;
    private readFailureCallback;
    private writeFailureCallback;
    countSuccess(duration: number): void;
    countFailure(duration: number, statusCode: number): void;
    countRetry(statusCode: number): void;
    countThrottle(statusCode: number): void;
    countReadFailure(): void;
    countWriteFailure(): void;
    countException(exceptionType: Error): void;
    private getNetworkStatsbeatCounter;
    private getShortHost;
    /**
     * Singleton Network Statsbeat Metrics instance.
     * @internal
     */
    static getInstance(options: StatsbeatOptions): NetworkStatsbeatMetrics;
}
//# sourceMappingURL=networkStatsbeatMetrics.d.ts.map