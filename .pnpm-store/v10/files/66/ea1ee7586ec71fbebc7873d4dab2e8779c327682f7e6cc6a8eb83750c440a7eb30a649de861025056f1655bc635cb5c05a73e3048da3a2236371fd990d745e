import { AggregationTemporality } from './AggregationTemporality';
import { MetricProducer } from './MetricProducer';
import { CollectionResult, InstrumentType } from './MetricData';
import { CollectionOptions, ForceFlushOptions, ShutdownOptions } from '../types';
import { AggregationSelector, AggregationTemporalitySelector } from './AggregationSelector';
import { AggregationOption } from '../view/AggregationOption';
import { CardinalitySelector } from './CardinalitySelector';
export interface MetricReaderOptions {
    /**
     * Aggregation selector based on metric instrument types. If no views are
     * configured for a metric instrument, a per-metric-reader aggregation is
     * selected with this selector.
     *
     * <p> NOTE: the provided function MUST be pure
     */
    aggregationSelector?: AggregationSelector;
    /**
     * Aggregation temporality selector based on metric instrument types. If
     * not configured, cumulative is used for all instruments.
     *
     * <p> NOTE: the provided function MUST be pure
     */
    aggregationTemporalitySelector?: AggregationTemporalitySelector;
    /**
     * Cardinality selector based on metric instrument types. If not configured,
     * a default value is used.
     *
     * <p> NOTE: the provided function MUST be pure
     */
    cardinalitySelector?: CardinalitySelector;
    /**
     * **Note, this option is experimental**. Additional MetricProducers to use as a source of
     * aggregated metric data in addition to the SDK's metric data. The resource returned by
     * these MetricProducers is ignored; the SDK's resource will be used instead.
     * @experimental
     */
    metricProducers?: MetricProducer[];
}
/**
 * Reads metrics from the SDK. Implementations MUST follow the Metric Reader Specification as well as the requirements
 * listed in this interface. Consider extending {@link MetricReader} to get a specification-compliant base implementation
 * of this interface
 */
export interface IMetricReader {
    /**
     * Set the {@link MetricProducer} used by this instance. **This should only be called once by the
     * SDK and should be considered internal.**
     *
     * <p> NOTE: implementations MUST throw when called more than once
     *
     * @param metricProducer
     */
    setMetricProducer(metricProducer: MetricProducer): void;
    /**
     * Select the {@link AggregationOption} for the given {@link InstrumentType} for this
     * reader.
     *
     * <p> NOTE: implementations MUST be pure
     */
    selectAggregation(instrumentType: InstrumentType): AggregationOption;
    /**
     * Select the {@link AggregationTemporality} for the given
     * {@link InstrumentType} for this reader.
     *
     * <p> NOTE: implementations MUST be pure
     */
    selectAggregationTemporality(instrumentType: InstrumentType): AggregationTemporality;
    /**
     * Select the cardinality limit for the given {@link InstrumentType} for this
     * reader.
     *
     * <p> NOTE: implementations MUST be pure
     */
    selectCardinalityLimit(instrumentType: InstrumentType): number;
    /**
     * Collect all metrics from the associated {@link MetricProducer}
     */
    collect(options?: CollectionOptions): Promise<CollectionResult>;
    /**
     * Shuts down the metric reader, the promise will reject after the optional timeout or resolve after completion.
     *
     * <p> NOTE: this operation MAY continue even after the promise rejects due to a timeout.
     * @param options options with timeout.
     */
    shutdown(options?: ShutdownOptions): Promise<void>;
    /**
     * Flushes metrics read by this reader, the promise will reject after the optional timeout or resolve after completion.
     *
     * <p> NOTE: this operation MAY continue even after the promise rejects due to a timeout.
     * @param options options with timeout.
     */
    forceFlush(options?: ForceFlushOptions): Promise<void>;
}
/**
 * A registered reader of metrics that, when linked to a {@link MetricProducer}, offers global
 * control over metrics.
 */
export declare abstract class MetricReader implements IMetricReader {
    private _shutdown;
    private _metricProducers;
    private _sdkMetricProducer?;
    private readonly _aggregationTemporalitySelector;
    private readonly _aggregationSelector;
    private readonly _cardinalitySelector?;
    constructor(options?: MetricReaderOptions);
    setMetricProducer(metricProducer: MetricProducer): void;
    selectAggregation(instrumentType: InstrumentType): AggregationOption;
    selectAggregationTemporality(instrumentType: InstrumentType): AggregationTemporality;
    selectCardinalityLimit(instrumentType: InstrumentType): number;
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
    collect(options?: CollectionOptions): Promise<CollectionResult>;
    shutdown(options?: ShutdownOptions): Promise<void>;
    forceFlush(options?: ForceFlushOptions): Promise<void>;
}
//# sourceMappingURL=MetricReader.d.ts.map