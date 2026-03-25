import { HrTime, Attributes } from '@opentelemetry/api';
import { AggregationTemporality } from '../export/AggregationTemporality';
import { MetricData } from '../export/MetricData';
import { Maybe } from '../utils';
import { InstrumentDescriptor } from '../InstrumentDescriptor';
/** The kind of aggregator. */
export declare enum AggregatorKind {
    DROP = 0,
    SUM = 1,
    LAST_VALUE = 2,
    HISTOGRAM = 3,
    EXPONENTIAL_HISTOGRAM = 4
}
/** DataPoint value type for SumAggregation. */
export type Sum = number;
/** DataPoint value type for LastValueAggregation. */
export type LastValue = number;
/** DataPoint value type for HistogramAggregation. */
export interface Histogram {
    /**
     * Buckets are implemented using two different arrays:
     *  - boundaries: contains every finite bucket boundary, which are inclusive upper bounds
     *  - counts: contains event counts for each bucket
     *
     * Note that we'll always have n+1 buckets, where n is the number of boundaries.
     * This is because we need to count events that are higher than the upper boundary.
     *
     * Example: if we measure the values: [5, 30, 5, 40, 5, 15, 15, 15, 25]
     *  with the boundaries [ 10, 20, 30 ], we will have the following state:
     *
     * buckets: {
     *	boundaries: [10, 20, 30],
     *	counts: [3, 3, 2, 1],
     * }
     */
    buckets: {
        boundaries: number[];
        counts: number[];
    };
    sum?: number;
    count: number;
    min?: number;
    max?: number;
}
/** DataPoint value type for ExponentialHistogramAggregation. */
export interface ExponentialHistogram {
    count: number;
    sum?: number;
    scale: number;
    zeroCount: number;
    positive: {
        offset: number;
        bucketCounts: number[];
    };
    negative: {
        offset: number;
        bucketCounts: number[];
    };
    min?: number;
    max?: number;
}
/**
 * An Aggregator accumulation state.
 */
export interface Accumulation {
    setStartTime(startTime: HrTime): void;
    record(value: number): void;
}
export type AccumulationRecord<T> = [Attributes, T];
/**
 * Base interface for aggregators. Aggregators are responsible for holding
 * aggregated values and taking a snapshot of these values upon export.
 */
export interface Aggregator<T> {
    /** The kind of the aggregator. */
    kind: AggregatorKind;
    /**
     * Create a clean state of accumulation.
     */
    createAccumulation(startTime: HrTime): T;
    /**
     * Returns the result of the merge of the given accumulations.
     *
     * This should always assume that the accumulations do not overlap and merge together for a new
     * cumulative report.
     *
     * @param previous the previously captured accumulation
     * @param delta the newly captured (delta) accumulation
     * @returns the result of the merge of the given accumulations
     */
    merge(previous: T, delta: T): T;
    /**
     * Returns a new DELTA aggregation by comparing two cumulative measurements.
     *
     * @param previous the previously captured accumulation
     * @param current the newly captured (cumulative) accumulation
     * @returns The resulting delta accumulation
     */
    diff(previous: T, current: T): T;
    /**
     * Returns the {@link MetricData} that this {@link Aggregator} will produce.
     *
     * @param descriptor the metric descriptor.
     * @param aggregationTemporality the temporality of the resulting {@link MetricData}
     * @param accumulationByAttributes the array of attributes and accumulation pairs.
     * @param endTime the end time of the metric data.
     * @return the {@link MetricData} that this {@link Aggregator} will produce.
     */
    toMetricData(descriptor: InstrumentDescriptor, aggregationTemporality: AggregationTemporality, accumulationByAttributes: AccumulationRecord<T>[], endTime: HrTime): Maybe<MetricData>;
}
//# sourceMappingURL=types.d.ts.map