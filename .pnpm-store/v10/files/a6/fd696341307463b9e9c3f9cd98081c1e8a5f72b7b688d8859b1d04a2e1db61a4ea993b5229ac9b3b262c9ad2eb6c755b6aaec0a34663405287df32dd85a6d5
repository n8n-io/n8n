import { Aggregator, SumAggregator, DropAggregator, LastValueAggregator, HistogramAggregator, ExponentialHistogramAggregator } from '../aggregator';
import { Accumulation } from '../aggregator/types';
import { InstrumentDescriptor } from '../InstrumentDescriptor';
import { Maybe } from '../utils';
/**
 * Configures how measurements are combined into metrics for views.
 *
 * Aggregation provides a set of built-in aggregations via static methods.
 */
export interface Aggregation {
    createAggregator(instrument: InstrumentDescriptor): Aggregator<Maybe<Accumulation>>;
}
/**
 * The default drop aggregation.
 */
export declare class DropAggregation implements Aggregation {
    private static DEFAULT_INSTANCE;
    createAggregator(_instrument: InstrumentDescriptor): DropAggregator;
}
/**
 * The default sum aggregation.
 */
export declare class SumAggregation implements Aggregation {
    private static MONOTONIC_INSTANCE;
    private static NON_MONOTONIC_INSTANCE;
    createAggregator(instrument: InstrumentDescriptor): SumAggregator;
}
/**
 * The default last value aggregation.
 */
export declare class LastValueAggregation implements Aggregation {
    private static DEFAULT_INSTANCE;
    createAggregator(_instrument: InstrumentDescriptor): LastValueAggregator;
}
/**
 * The default histogram aggregation.

 */
export declare class HistogramAggregation implements Aggregation {
    private static DEFAULT_INSTANCE;
    createAggregator(_instrument: InstrumentDescriptor): HistogramAggregator;
}
/**
 * The explicit bucket histogram aggregation.
 */
export declare class ExplicitBucketHistogramAggregation implements Aggregation {
    private readonly _recordMinMax;
    private _boundaries;
    /**
     * @param boundaries the bucket boundaries of the histogram aggregation
     * @param _recordMinMax If set to true, min and max will be recorded. Otherwise, min and max will not be recorded.
     */
    constructor(boundaries: number[], _recordMinMax?: boolean);
    createAggregator(_instrument: InstrumentDescriptor): HistogramAggregator;
}
export declare class ExponentialHistogramAggregation implements Aggregation {
    private readonly _maxSize;
    private readonly _recordMinMax;
    constructor(_maxSize?: number, _recordMinMax?: boolean);
    createAggregator(_instrument: InstrumentDescriptor): ExponentialHistogramAggregator;
}
/**
 * The default aggregation.
 */
export declare class DefaultAggregation implements Aggregation {
    private _resolve;
    createAggregator(instrument: InstrumentDescriptor): Aggregator<Maybe<Accumulation>>;
}
export declare const DROP_AGGREGATION: DropAggregation;
export declare const SUM_AGGREGATION: SumAggregation;
export declare const LAST_VALUE_AGGREGATION: LastValueAggregation;
export declare const HISTOGRAM_AGGREGATION: HistogramAggregation;
export declare const EXPONENTIAL_HISTOGRAM_AGGREGATION: ExponentialHistogramAggregation;
export declare const DEFAULT_AGGREGATION: DefaultAggregation;
//# sourceMappingURL=Aggregation.d.ts.map