import { MetricReader } from './MetricReader';
import { PushMetricExporter } from './MetricExporter';
import { MetricProducer } from './MetricProducer';
export type PeriodicExportingMetricReaderOptions = {
    /**
     * The backing exporter for the metric reader.
     */
    exporter: PushMetricExporter;
    /**
     * An internal milliseconds for the metric reader to initiate metric
     * collection.
     */
    exportIntervalMillis?: number;
    /**
     * Milliseconds for the async observable callback to timeout.
     */
    exportTimeoutMillis?: number;
    /**
     * **Note, this option is experimental**. Additional MetricProducers to use as a source of
     * aggregated metric data in addition to the SDK's metric data. The resource returned by
     * these MetricProducers is ignored; the SDK's resource will be used instead.
     * @experimental
     */
    metricProducers?: MetricProducer[];
};
/**
 * {@link MetricReader} which collects metrics based on a user-configurable time interval, and passes the metrics to
 * the configured {@link PushMetricExporter}
 */
export declare class PeriodicExportingMetricReader extends MetricReader {
    private _interval?;
    private _exporter;
    private readonly _exportInterval;
    private readonly _exportTimeout;
    constructor(options: PeriodicExportingMetricReaderOptions);
    private _runOnce;
    private _doRun;
    protected onInitialized(): void;
    protected onForceFlush(): Promise<void>;
    protected onShutdown(): Promise<void>;
}
//# sourceMappingURL=PeriodicExportingMetricReader.d.ts.map