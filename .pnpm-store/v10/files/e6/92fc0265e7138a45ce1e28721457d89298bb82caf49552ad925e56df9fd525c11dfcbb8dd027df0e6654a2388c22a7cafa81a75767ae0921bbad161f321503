import { Aggregator, SumAggregator, DropAggregator, LastValueAggregator, HistogramAggregator, ExponentialHistogramAggregator } from '../aggregator';
import { Accumulation } from '../aggregator/types';
import { InstrumentDescriptor } from '../InstrumentDescriptor';
import { Maybe } from '../utils';
/**
 * Configures how measurements are combined into metrics for views.
 *
 * Aggregation provides a set of built-in aggregations via static methods.
 */
export declare abstract class Aggregation {
    abstract createAggregator(instrument: InstrumentDescriptor): Aggregator<Maybe<Accumulation>>;
    static Drop(): Aggregation;
    static Sum(): Aggregation;
    static LastValue(): Aggregation;
    static Histogram(): Aggregation;
    static ExponentialHistogram(): Aggregation;
    static Default(): Aggregation;
}
/**
 * The default drop aggregation.
 */
export declare class DropAggregation extends Aggregation {
    private static DEFAULT_INSTANCE;
    createAggregator(_instrument: InstrumentDescriptor): DropAggregator;
}
/**
 * The default sum aggregation.
 */
export declare class SumAggregation extends Aggregation {
    private static MONOTONIC_INSTANCE;
    private static NON_MONOTONIC_INSTANCE;
    createAggregator(instrument: InstrumentDescriptor): SumAggregator;
}
/**
 * The default last value aggregation.
 */
export declare class LastValueAggregation extends Aggregation {
    private static DEFAULT_INSTANCE;
    createAggregator(_instrument: InstrumentDescriptor): LastValueAggregator;
}
/**
 * The default histogram aggregation.
 */
export declare class HistogramAggregation extends Aggregation {
    private static DEFAULT_INSTANCE;
    createAggregator(_instrument: InstrumentDescriptor): HistogramAggregator;
}
/**
 * The explicit bucket histogram aggregation.
 */
export declare class ExplicitBucketHistogramAggregation extends Aggregation {
    private readonly _recordMinMax;
    private _boundaries;
    /**
     * @param boundaries the bucket boundaries of the histogram aggregation
     * @param _recordMinMax If set to true, min and max will be recorded. Otherwise, min and max will not be recorded.
     */
    constructor(boundaries: number[], _recordMinMax?: boolean);
    createAggregator(_instrument: InstrumentDescriptor): HistogramAggregator;
}
export declare class ExponentialHistogramAggregation extends Aggregation {
    private readonly _maxSize;
    private readonly _recordMinMax;
    constructor(_maxSize?: number, _recordMinMax?: boolean);
    createAggregator(_instrument: InstrumentDescriptor): ExponentialHistogramAggregator;
}
/**
 * The default aggregation.
 */
export declare class DefaultAggregation extends Aggregation {
    private _resolve;
    createAggregator(instrument: InstrumentDescriptor): Aggregator<Maybe<Accumulation>>;
}
//# sourceMappingURL=Aggregation.d.ts.map