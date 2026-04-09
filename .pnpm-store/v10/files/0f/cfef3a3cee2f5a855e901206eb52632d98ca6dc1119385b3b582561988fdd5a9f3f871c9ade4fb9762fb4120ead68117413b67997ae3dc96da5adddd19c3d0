import { Context, HrTime, MetricAttributes } from '@opentelemetry/api';
import { FixedSizeExemplarReservoirBase } from './ExemplarReservoir';
/**
 * AlignedHistogramBucketExemplarReservoir takes the same boundaries
 * configuration of a Histogram. This algorithm keeps the last seen measurement
 * that falls within a histogram bucket.
 */
export declare class AlignedHistogramBucketExemplarReservoir extends FixedSizeExemplarReservoirBase {
    private _boundaries;
    constructor(boundaries: number[]);
    private _findBucketIndex;
    offer(value: number, timestamp: HrTime, attributes: MetricAttributes, ctx: Context): void;
}
//# sourceMappingURL=AlignedHistogramBucketExemplarReservoir.d.ts.map