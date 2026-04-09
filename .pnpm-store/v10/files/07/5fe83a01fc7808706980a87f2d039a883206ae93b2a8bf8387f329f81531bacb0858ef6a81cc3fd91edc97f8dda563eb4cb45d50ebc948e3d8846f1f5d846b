import type { Sum, Aggregator, Accumulation, AccumulationRecord } from './types';
import { AggregatorKind } from './types';
import type { HrTime } from '@opentelemetry/api';
import type { SumMetricData } from '../export/MetricData';
import type { Maybe } from '../utils';
import type { AggregationTemporality } from '../export/AggregationTemporality';
import type { InstrumentDescriptor } from '../InstrumentDescriptor';
export declare class SumAccumulation implements Accumulation {
    startTime: HrTime;
    monotonic: boolean;
    private _current;
    reset: boolean;
    constructor(startTime: HrTime, monotonic: boolean, current?: number, reset?: boolean);
    record(value: number): void;
    setStartTime(startTime: HrTime): void;
    toPointValue(): Sum;
}
/** Basic aggregator which calculates a Sum from individual measurements. */
export declare class SumAggregator implements Aggregator<SumAccumulation> {
    kind: AggregatorKind.SUM;
    monotonic: boolean;
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
    toMetricData(descriptor: InstrumentDescriptor, aggregationTemporality: AggregationTemporality, accumulationByAttributes: AccumulationRecord<SumAccumulation>[], endTime: HrTime): Maybe<SumMetricData>;
}
//# sourceMappingURL=Sum.d.ts.map