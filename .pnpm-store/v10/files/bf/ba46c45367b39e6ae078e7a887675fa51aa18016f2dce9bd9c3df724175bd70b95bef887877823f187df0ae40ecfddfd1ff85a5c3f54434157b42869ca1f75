import { Accumulation, AccumulationRecord, Aggregator, AggregatorKind, LastValue } from './types';
import { HrTime } from '@opentelemetry/api';
import { GaugeMetricData, MetricDescriptor } from '../export/MetricData';
import { Maybe } from '../utils';
import { AggregationTemporality } from '../export/AggregationTemporality';
export declare class LastValueAccumulation implements Accumulation {
    startTime: HrTime;
    private _current;
    sampleTime: HrTime;
    constructor(startTime: HrTime, _current?: number, sampleTime?: HrTime);
    record(value: number): void;
    setStartTime(startTime: HrTime): void;
    toPointValue(): LastValue;
}
/** Basic aggregator which calculates a LastValue from individual measurements. */
export declare class LastValueAggregator implements Aggregator<LastValueAccumulation> {
    kind: AggregatorKind.LAST_VALUE;
    createAccumulation(startTime: HrTime): LastValueAccumulation;
    /**
     * Returns the result of the merge of the given accumulations.
     *
     * Return the newly captured (delta) accumulation for LastValueAggregator.
     */
    merge(previous: LastValueAccumulation, delta: LastValueAccumulation): LastValueAccumulation;
    /**
     * Returns a new DELTA aggregation by comparing two cumulative measurements.
     *
     * A delta aggregation is not meaningful to LastValueAggregator, just return
     * the newly captured (delta) accumulation for LastValueAggregator.
     */
    diff(previous: LastValueAccumulation, current: LastValueAccumulation): LastValueAccumulation;
    toMetricData(descriptor: MetricDescriptor, aggregationTemporality: AggregationTemporality, accumulationByAttributes: AccumulationRecord<LastValueAccumulation>[], endTime: HrTime): Maybe<GaugeMetricData>;
}
//# sourceMappingURL=LastValue.d.ts.map