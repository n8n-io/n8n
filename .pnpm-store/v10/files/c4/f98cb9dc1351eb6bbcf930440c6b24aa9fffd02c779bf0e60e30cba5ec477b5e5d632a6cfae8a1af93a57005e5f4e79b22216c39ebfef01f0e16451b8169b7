import { AggregationTemporalitySelector } from '../export/AggregationSelector';
import { CollectionResult, InstrumentType } from '../export/MetricData';
import { MetricCollectOptions, MetricProducer } from '../export/MetricProducer';
import { IMetricReader } from '../export/MetricReader';
import { ForceFlushOptions, ShutdownOptions } from '../types';
import { MeterProviderSharedState } from './MeterProviderSharedState';
/**
 * An internal opaque interface that the MetricReader receives as
 * MetricProducer. It acts as the storage key to the internal metric stream
 * state for each MetricReader.
 */
export declare class MetricCollector implements MetricProducer {
    private _sharedState;
    private _metricReader;
    constructor(_sharedState: MeterProviderSharedState, _metricReader: IMetricReader);
    collect(options?: MetricCollectOptions): Promise<CollectionResult>;
    /**
     * Delegates for MetricReader.forceFlush.
     */
    forceFlush(options?: ForceFlushOptions): Promise<void>;
    /**
     * Delegates for MetricReader.shutdown.
     */
    shutdown(options?: ShutdownOptions): Promise<void>;
    selectAggregationTemporality(instrumentType: InstrumentType): import("..").AggregationTemporality;
    selectAggregation(instrumentType: InstrumentType): import("..").AggregationOption;
    /**
     * Select the cardinality limit for the given {@link InstrumentType} for this
     * collector.
     */
    selectCardinalityLimit(instrumentType: InstrumentType): number;
}
/**
 * An internal interface for MetricCollector. Exposes the necessary
 * information for metric collection.
 */
export interface MetricCollectorHandle {
    selectAggregationTemporality: AggregationTemporalitySelector;
    selectCardinalityLimit(instrumentType: InstrumentType): number;
}
//# sourceMappingURL=MetricCollector.d.ts.map