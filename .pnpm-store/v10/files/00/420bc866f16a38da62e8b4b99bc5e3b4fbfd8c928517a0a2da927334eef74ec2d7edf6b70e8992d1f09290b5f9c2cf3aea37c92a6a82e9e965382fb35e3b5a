import { Context, HrTime, MetricAttributes } from '@opentelemetry/api';
/**
 * This interface represents a ExemplarFilter. Exemplar filters are
 * used to filter measurements before attempting to store them in a
 * reservoir.
 */
export interface ExemplarFilter {
    /**
     * Returns whether or not a reservoir should attempt to filter a measurement.
     *
     * @param value The value of the measurement
     * @param timestamp A timestamp that best represents when the measurement was taken
     * @param attributes The complete set of MetricAttributes of the measurement
     * @param ctx The Context of the measurement
     */
    shouldSample(value: number, timestamp: HrTime, attributes: MetricAttributes, ctx: Context): boolean;
}
//# sourceMappingURL=ExemplarFilter.d.ts.map