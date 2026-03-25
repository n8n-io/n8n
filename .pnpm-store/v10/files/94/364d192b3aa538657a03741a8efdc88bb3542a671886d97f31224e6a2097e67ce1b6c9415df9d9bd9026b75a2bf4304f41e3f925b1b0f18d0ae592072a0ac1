import { MetricAttributes, Observable } from './Metric';
/**
 * Interface that is being used in callback function for Observable Metric.
 */
export interface ObservableResult<AttributesTypes extends MetricAttributes = MetricAttributes> {
    /**
     * Observe a measurement of the value associated with the given attributes.
     *
     * @param value The value to be observed.
     * @param attributes The attributes associated with the value. If more than
     * one values associated with the same attributes values, SDK may pick the
     * last one or simply drop the entire observable result.
     */
    observe(this: ObservableResult<AttributesTypes>, value: number, attributes?: AttributesTypes): void;
}
/**
 * Interface that is being used in batch observable callback function.
 */
export interface BatchObservableResult<AttributesTypes extends MetricAttributes = MetricAttributes> {
    /**
     * Observe a measurement of the value associated with the given attributes.
     *
     * @param metric The observable metric to be observed.
     * @param value The value to be observed.
     * @param attributes The attributes associated with the value. If more than
     * one values associated with the same attributes values, SDK may pick the
     * last one or simply drop the entire observable result.
     */
    observe(this: BatchObservableResult<AttributesTypes>, metric: Observable<AttributesTypes>, value: number, attributes?: AttributesTypes): void;
}
//# sourceMappingURL=ObservableResult.d.ts.map