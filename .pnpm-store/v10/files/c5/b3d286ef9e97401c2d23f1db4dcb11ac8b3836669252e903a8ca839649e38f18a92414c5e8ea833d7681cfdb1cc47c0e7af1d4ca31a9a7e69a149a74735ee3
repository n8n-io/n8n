import { Accumulation, AccumulationRecord, Aggregator, AggregatorKind } from './types';
import { HistogramMetricData } from '../export/MetricData';
import { HrTime } from '@opentelemetry/api';
import { Maybe } from '../utils';
import { AggregationTemporality } from '../export/AggregationTemporality';
import { InstrumentDescriptor } from '../InstrumentDescriptor';
/**
 * Internal value type for HistogramAggregation.
 * Differs from the exported type as undefined sum/min/max complicate arithmetic
 * performed by this aggregation, but are required to be undefined in the exported types.
 */
interface InternalHistogram {
    buckets: {
        boundaries: number[];
        counts: number[];
    };
    sum: number;
    count: number;
    hasMinMax: boolean;
    min: number;
    max: number;
}
export declare class HistogramAccumulation implements Accumulation {
    startTime: HrTime;
    private readonly _boundaries;
    private _recordMinMax;
    private _current;
    constructor(startTime: HrTime, _boundaries: number[], _recordMinMax?: boolean, _current?: InternalHistogram);
    record(value: number): void;
    setStartTime(startTime: HrTime): void;
    toPointValue(): InternalHistogram;
}
/**
 * Basic aggregator which observes events and counts them in pre-defined buckets
 * and provides the total sum and count of all observations.
 */
export declare class HistogramAggregator implements Aggregator<HistogramAccumulation> {
    private readonly _boundaries;
    private readonly _recordMinMax;
    kind: AggregatorKind.HISTOGRAM;
    /**
     * @param _boundaries sorted upper bounds of recorded values.
     * @param _recordMinMax If set to true, min and max will be recorded. Otherwise, min and max will not be recorded.
     */
    constructor(_boundaries: number[], _recordMinMax: boolean);
    createAccumulation(startTime: HrTime): HistogramAccumulation;
    /**
     * Return the result of the merge of two histogram accumulations. As long as one Aggregator
     * instance produces all Accumulations with constant boundaries we don't need to worry about
     * merging accumulations with different boundaries.
     */
    merge(previous: HistogramAccumulation, delta: HistogramAccumulation): HistogramAccumulation;
    /**
     * Returns a new DELTA aggregation by comparing two cumulative measurements.
     */
    diff(previous: HistogramAccumulation, current: HistogramAccumulation): HistogramAccumulation;
    toMetricData(descriptor: InstrumentDescriptor, aggregationTemporality: AggregationTemporality, accumulationByAttributes: AccumulationRecord<HistogramAccumulation>[], endTime: HrTime): Maybe<HistogramMetricData>;
}
export {};
//# sourceMappingURL=Histogram.d.ts.map