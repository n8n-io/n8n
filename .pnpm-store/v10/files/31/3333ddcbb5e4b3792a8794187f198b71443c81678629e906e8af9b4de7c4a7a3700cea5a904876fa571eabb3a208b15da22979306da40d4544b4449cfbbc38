import { Accumulation, AccumulationRecord, Aggregator, AggregatorKind, ExponentialHistogram } from './types';
import { ExponentialHistogramMetricData, MetricDescriptor } from '../export/MetricData';
import { HrTime } from '@opentelemetry/api';
import { Maybe } from '../utils';
import { AggregationTemporality } from '../export/AggregationTemporality';
import { Buckets } from './exponential-histogram/Buckets';
import { Mapping } from './exponential-histogram/mapping/types';
/**
 * Internal value type for ExponentialHistogramAggregation.
 * Differs from the exported type as undefined sum/min/max complicate arithmetic
 * performed by this aggregation, but are required to be undefined in the exported types.
 */
interface InternalHistogram extends ExponentialHistogram {
    hasMinMax: boolean;
    min: number;
    max: number;
    sum: number;
}
export declare class ExponentialHistogramAccumulation implements Accumulation {
    startTime: HrTime;
    private _maxSize;
    private _recordMinMax;
    private _sum;
    private _count;
    private _zeroCount;
    private _min;
    private _max;
    private _positive;
    private _negative;
    private _mapping;
    constructor(startTime?: HrTime, _maxSize?: number, _recordMinMax?: boolean, _sum?: number, _count?: number, _zeroCount?: number, _min?: number, _max?: number, _positive?: Buckets, _negative?: Buckets, _mapping?: Mapping);
    /**
     * record updates a histogram with a single count
     * @param {Number} value
     */
    record(value: number): void;
    /**
     * Sets the start time for this accumulation
     * @param {HrTime} startTime
     */
    setStartTime(startTime: HrTime): void;
    /**
     * Returns the datapoint representation of this accumulation
     * @param {HrTime} startTime
     */
    toPointValue(): InternalHistogram;
    /**
     * @returns {Number} The sum of values recorded by this accumulation
     */
    get sum(): number;
    /**
     * @returns {Number} The minimum value recorded by this accumulation
     */
    get min(): number;
    /**
     * @returns {Number} The maximum value recorded by this accumulation
     */
    get max(): number;
    /**
     * @returns {Number} The count of values recorded by this accumulation
     */
    get count(): number;
    /**
     * @returns {Number} The number of 0 values recorded by this accumulation
     */
    get zeroCount(): number;
    /**
     * @returns {Number} The scale used by this accumulation
     */
    get scale(): number;
    /**
     * positive holds the positive values
     * @returns {Buckets}
     */
    get positive(): Buckets;
    /**
     * negative holds the negative values by their absolute value
     * @returns {Buckets}
     */
    get negative(): Buckets;
    /**
     * updateByIncr supports updating a histogram with a non-negative
     * increment.
     * @param value
     * @param increment
     */
    updateByIncrement(value: number, increment: number): void;
    /**
     * merge combines data from previous value into self
     * @param {ExponentialHistogramAccumulation} previous
     */
    merge(previous: ExponentialHistogramAccumulation): void;
    /**
     * diff subtracts other from self
     * @param {ExponentialHistogramAccumulation} other
     */
    diff(other: ExponentialHistogramAccumulation): void;
    /**
     * clone returns a deep copy of self
     * @returns {ExponentialHistogramAccumulation}
     */
    clone(): ExponentialHistogramAccumulation;
    /**
     * _updateBuckets maps the incoming value to a bucket index for the current
     * scale. If the bucket index is outside of the range of the backing array,
     * it will rescale the backing array and update the mapping for the new scale.
     */
    private _updateBuckets;
    /**
     * _incrementIndexBy increments the count of the bucket specified by `index`.
     * If the index is outside of the range [buckets.indexStart, buckets.indexEnd]
     * the boundaries of the backing array will be adjusted and more buckets will
     * be added if needed.
     */
    private _incrementIndexBy;
    /**
     * grow resizes the backing array by doubling in size up to maxSize.
     * This extends the array with a bunch of zeros and copies the
     * existing counts to the same position.
     */
    private _grow;
    /**
     * _changeScale computes how much downscaling is needed by shifting the
     * high and low values until they are separated by no more than size.
     */
    private _changeScale;
    /**
     * _downscale subtracts `change` from the current mapping scale.
     */
    private _downscale;
    /**
     * _minScale is used by diff and merge to compute an ideal combined scale
     */
    private _minScale;
    /**
     * _highLowAtScale is used by diff and merge to compute an ideal combined scale.
     */
    private _highLowAtScale;
    /**
     * _mergeBuckets translates index values from another histogram and
     * adds the values into the corresponding buckets of this histogram.
     */
    private _mergeBuckets;
    /**
     * _diffBuckets translates index values from another histogram and
     * subtracts the values in the corresponding buckets of this histogram.
     */
    private _diffBuckets;
}
/**
 * Aggregator for ExponentialHistogramAccumulations
 */
export declare class ExponentialHistogramAggregator implements Aggregator<ExponentialHistogramAccumulation> {
    readonly _maxSize: number;
    private readonly _recordMinMax;
    kind: AggregatorKind.EXPONENTIAL_HISTOGRAM;
    /**
     * @param _maxSize Maximum number of buckets for each of the positive
     *    and negative ranges, exclusive of the zero-bucket.
     * @param _recordMinMax If set to true, min and max will be recorded.
     *    Otherwise, min and max will not be recorded.
     */
    constructor(_maxSize: number, _recordMinMax: boolean);
    createAccumulation(startTime: HrTime): ExponentialHistogramAccumulation;
    /**
     * Return the result of the merge of two exponential histogram accumulations.
     */
    merge(previous: ExponentialHistogramAccumulation, delta: ExponentialHistogramAccumulation): ExponentialHistogramAccumulation;
    /**
     * Returns a new DELTA aggregation by comparing two cumulative measurements.
     */
    diff(previous: ExponentialHistogramAccumulation, current: ExponentialHistogramAccumulation): ExponentialHistogramAccumulation;
    toMetricData(descriptor: MetricDescriptor, aggregationTemporality: AggregationTemporality, accumulationByAttributes: AccumulationRecord<ExponentialHistogramAccumulation>[], endTime: HrTime): Maybe<ExponentialHistogramMetricData>;
}
export {};
//# sourceMappingURL=ExponentialHistogram.d.ts.map