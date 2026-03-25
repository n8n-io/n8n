import { Aggregation } from './Aggregation';
export declare enum AggregationType {
    DEFAULT = 0,
    DROP = 1,
    SUM = 2,
    LAST_VALUE = 3,
    EXPLICIT_BUCKET_HISTOGRAM = 4,
    EXPONENTIAL_HISTOGRAM = 5
}
export type SumAggregationOption = {
    type: AggregationType.SUM;
};
export type LastValueAggregationOption = {
    type: AggregationType.LAST_VALUE;
};
export type DropAggregationOption = {
    type: AggregationType.DROP;
};
export type DefaultAggregationOption = {
    type: AggregationType.DEFAULT;
};
export type HistogramAggregationOption = {
    type: AggregationType.EXPLICIT_BUCKET_HISTOGRAM;
    options?: {
        recordMinMax?: boolean;
        boundaries: number[];
    };
};
export type ExponentialHistogramAggregationOption = {
    type: AggregationType.EXPONENTIAL_HISTOGRAM;
    options?: {
        recordMinMax?: boolean;
        maxSize?: number;
    };
};
export type AggregationOption = ExponentialHistogramAggregationOption | HistogramAggregationOption | SumAggregationOption | DropAggregationOption | DefaultAggregationOption | LastValueAggregationOption;
export declare function toAggregation(option: AggregationOption): Aggregation;
//# sourceMappingURL=AggregationOption.d.ts.map