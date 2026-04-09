import { AggregationTemporality } from './AggregationTemporality';
import { MetricProducer } from './MetricProducer';
import { CollectionResult } from './MetricData';
import { InstrumentType } from '../InstrumentDescriptor';
import { CollectionOptions, ForceFlushOptions, ShutdownOptions } from '../types';
import { Aggregation } from '../view/Aggregation';
import { AggregationSelector, AggregationTemporalitySelector } from './AggregationSelector';
export interface MetricReaderOptions {
    /**
     * Aggregation selector based on metric instrument types. If no views are
     * configured for a metric instrument, a per-metric-reader aggregation is
     * selected with this selector.
     */
    aggregationSelector?: AggregationSelector;
    /**
     * Aggregation temporality selector based on metric instrument types. If
     * not configured, cumulative is used for all instruments.
     */
    aggregationTemporalitySelector?: AggregationTemporalitySelector;
    /**
     * **Note, this option is experimental**. Additional MetricProducers to use as a source of
     * aggregated metric data in addition to the SDK's metric data. The resource returned by
     * these MetricProducers is ignored; the SDK's resource will be used instead.
     * @experimental
     */
    metricProducers?: MetricProducer[];
}
/**
 * A registered reader of metrics that, when linked to a {@link MetricProducer}, offers global
 * control over metrics.
 */
export declare abstract class MetricReader {
    private _shutdown;
    private _metricProducers;
    private _sdkMetricProducer?;
    private readonly _aggregationTemporalitySelector;
    private readonly _aggregationSelector;
    constructor(options?: MetricReaderOptions);
    /**
     * Set the {@link MetricProducer} used by this instance. **This should only be called by the
     * SDK and should be considered internal.**
     *
     * To add additional {@link MetricProducer}s to a {@link MetricReader}, pass them to the
     * constructor as {@link MetricReaderOptions.metricProducers}.
     *
     * @internal
     * @param metricProducer
     */
    setMetricProducer(metricProducer: MetricProducer): void;
    /**
     * Select the {@link Aggregation} for the given {@link InstrumentType} for this
     * reader.
     */
    selectAggregation(instrumentType: InstrumentType): Aggregation;
    /**
     * Select the {@link AggregationTemporality} for the given
     * {@link InstrumentType} for this reader.
     */
    selectAggregationTemporality(instrumentType: InstrumentType): AggregationTemporality;
    /**
     * Handle once the SDK has initialized this {@link MetricReader}
     * Overriding this method is optional.
     */
    protected onInitialized(): void;
    /**
     * Handle a shutdown signal by the SDK.
     *
     * <p> For push exporters, this should shut down any intervals and close any open connections.
     * @protected
     */
    protected abstract onShutdown(): Promise<void>;
    /**
     * Handle a force flush signal by the SDK.
     *
     * <p> In all scenarios metrics should be collected via {@link collect()}.
     * <p> For push exporters, this should collect and report metrics.
     * @protected
     */
    protected abstract onForceFlush(): Promise<void>;
    /**
     * Collect all metrics from the associated {@link MetricProducer}
     */
    collect(options?: CollectionOptions): Promise<CollectionResult>;
    /**
     * Shuts down the metric reader, the promise will reject after the optional timeout or resolve after completion.
     *
     * <p> NOTE: this operation will continue even after the promise rejects due to a timeout.
     * @param options options with timeout.
     */
    shutdown(options?: ShutdownOptions): Promise<void>;
    /**
     * Flushes metrics read by this reader, the promise will reject after the optional timeout or resolve after completion.
     *
     * <p> NOTE: this operation will continue even after the promise rejects due to a timeout.
     * @param options options with timeout.
     */
    forceFlush(options?: ForceFlushOptions): Promise<void>;
}
//# sourceMappingURL=MetricReader.d.ts.map