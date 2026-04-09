import { Sum, AggregatorKind, Aggregator, Accumulation, AccumulationRecord } from './types';
import { HrTime } from '@opentelemetry/api';
import { MetricDescriptor, SumMetricData } from '../export/MetricData';
import { Maybe } from '../utils';
import { AggregationTemporality } from '../export/AggregationTemporality';
export declare class SumAccumulation implements Accumulation {
    startTime: HrTime;
    monotonic: boolean;
    private _current;
    reset: boolean;
    constructor(startTime: HrTime, monotonic: boolean, _current?: number, reset?: boolean);
    record(value: number): void;
    setStartTime(startTime: HrTime): void;
    toPointValue(): Sum;
}
/** Basic aggregator which calculates a Sum from individual measurements. */
export declare class SumAggregator implements Aggregator<SumAccumulation> {
    monotonic: boolean;
    kind: AggregatorKind.SUM;
    constructor(monotonic: boolean);
    createAccumulation(startTime: HrTime): SumAccumulation;
    /**
     * Returns the result of the merge of the given accumulations.
     */
    merge(previous: SumAccumulation, delta: SumAccumulation): SumAccumulation;
    /**
     * Returns a new DELTA aggregation by comparing two cumulative measurements.
     */
    diff(previous: SumAccumulation, current: SumAccumulation): SumAccumulation;
    toMetricData(descriptor: MetricDescriptor, aggregationTemporality: AggregationTemporality, accumulationByAttributes: AccumulationRecord<SumAccumulation>[], endTime: HrTime): Maybe<SumMetricData>;
}
//# sourceMappingURL=Sum.d.ts.map