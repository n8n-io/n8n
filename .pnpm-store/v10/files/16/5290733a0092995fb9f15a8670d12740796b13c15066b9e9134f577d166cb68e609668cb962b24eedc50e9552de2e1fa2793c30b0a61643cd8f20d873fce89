import { Attributes, AttributeValue } from '../common/Attributes';
import { Context } from '../context/types';
import { BatchObservableResult, ObservableResult } from './ObservableResult';
/**
 * Advisory options influencing aggregation configuration parameters.
 * @experimental
 */
export interface MetricAdvice {
    /**
     * Hint the explicit bucket boundaries for SDK if the metric is been
     * aggregated with a HistogramAggregator.
     */
    explicitBucketBoundaries?: number[];
}
/**
 * Options needed for metric creation
 */
export interface MetricOptions {
    /**
     * The description of the Metric.
     * @default ''
     */
    description?: string;
    /**
     * The unit of the Metric values.
     * @default ''
     */
    unit?: string;
    /**
     * Indicates the type of the recorded value.
     * @default {@link ValueType.DOUBLE}
     */
    valueType?: ValueType;
    /**
     * The advice influencing aggregation configuration parameters.
     * @experimental
     */
    advice?: MetricAdvice;
}
/** The Type of value. It describes how the data is reported. */
export declare enum ValueType {
    INT = 0,
    DOUBLE = 1
}
/**
 * Counter is the most common synchronous instrument. This instrument supports
 * an `Add(increment)` function for reporting a sum, and is restricted to
 * non-negative increments. The default aggregation is Sum, as for any additive
 * instrument.
 *
 * Example uses for Counter:
 * <ol>
 *   <li> count the number of bytes received. </li>
 *   <li> count the number of requests completed. </li>
 *   <li> count the number of accounts created. </li>
 *   <li> count the number of checkpoints run. </li>
 *   <li> count the number of 5xx errors. </li>
 * <ol>
 */
export interface Counter<AttributesTypes extends MetricAttributes = MetricAttributes> {
    /**
     * Increment value of counter by the input. Inputs must not be negative.
     */
    add(value: number, attributes?: AttributesTypes, context?: Context): void;
}
export interface UpDownCounter<AttributesTypes extends MetricAttributes = MetricAttributes> {
    /**
     * Increment value of counter by the input. Inputs may be negative.
     */
    add(value: number, attributes?: AttributesTypes, context?: Context): void;
}
export interface Gauge<AttributesTypes extends MetricAttributes = MetricAttributes> {
    /**
     * Records a measurement.
     */
    record(value: number, attributes?: AttributesTypes, context?: Context): void;
}
export interface Histogram<AttributesTypes extends MetricAttributes = MetricAttributes> {
    /**
     * Records a measurement. Value of the measurement must not be negative.
     */
    record(value: number, attributes?: AttributesTypes, context?: Context): void;
}
/**
 * @deprecated please use {@link Attributes}
 */
export declare type MetricAttributes = Attributes;
/**
 * @deprecated please use {@link AttributeValue}
 */
export declare type MetricAttributeValue = AttributeValue;
/**
 * The observable callback for Observable instruments.
 */
export declare type ObservableCallback<AttributesTypes extends MetricAttributes = MetricAttributes> = (observableResult: ObservableResult<AttributesTypes>) => void | Promise<void>;
/**
 * The observable callback for a batch of Observable instruments.
 */
export declare type BatchObservableCallback<AttributesTypes extends MetricAttributes = MetricAttributes> = (observableResult: BatchObservableResult<AttributesTypes>) => void | Promise<void>;
export interface Observable<AttributesTypes extends MetricAttributes = MetricAttributes> {
    /**
     * Sets up a function that will be called whenever a metric collection is initiated.
     *
     * If the function is already in the list of callbacks for this Observable, the function is not added a second time.
     */
    addCallback(callback: ObservableCallback<AttributesTypes>): void;
    /**
     * Removes a callback previously registered with {@link Observable.addCallback}.
     */
    removeCallback(callback: ObservableCallback<AttributesTypes>): void;
}
export declare type ObservableCounter<AttributesTypes extends MetricAttributes = MetricAttributes> = Observable<AttributesTypes>;
export declare type ObservableUpDownCounter<AttributesTypes extends MetricAttributes = MetricAttributes> = Observable<AttributesTypes>;
export declare type ObservableGauge<AttributesTypes extends MetricAttributes = MetricAttributes> = Observable<AttributesTypes>;
//# sourceMappingURL=Metric.d.ts.map