import { StatsbeatMetrics } from "./statsbeatMetrics.js";
import type { StatsbeatOptions } from "./types.js";
/**
 * Long Interval Statsbeat Metrics
 * @internal
 */
export declare class LongIntervalStatsbeatMetrics extends StatsbeatMetrics {
    private static instance;
    private statsCollectionLongInterval;
    private cikey;
    private runtimeVersion;
    private language;
    private version;
    private attach;
    private commonProperties;
    private attachProperties;
    private feature;
    private instrumentation;
    private longIntervalStatsbeatMeterProvider;
    private longIntervalAzureExporter;
    private longIntervalMetricReader;
    private longIntervalStatsbeatMeter;
    private connectionString;
    private featureStatsbeatGauge;
    private attachStatsbeatGauge;
    isInitialized: boolean;
    constructor(options: StatsbeatOptions);
    private initialize;
    private getEnvironmentStatus;
    private setFeatures;
    private attachCallback;
    shutdown(): Promise<void>;
    /**
     * Singleton LongIntervalStatsbeatMetrics instance.
     * @internal
     */
    static getInstance(options: StatsbeatOptions): LongIntervalStatsbeatMetrics;
}
//# sourceMappingURL=longIntervalStatsbeatMetrics.d.ts.map