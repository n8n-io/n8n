import { HrTime, MetricAttributes, ValueType } from '@opentelemetry/api';
import { InstrumentationScope } from '@opentelemetry/core';
import { IResource } from '@opentelemetry/resources';
import { InstrumentType } from '../InstrumentDescriptor';
import { AggregationTemporality } from './AggregationTemporality';
import { Histogram, ExponentialHistogram } from '../aggregator/types';
export interface MetricDescriptor {
    readonly name: string;
    readonly description: string;
    readonly unit: string;
    /**
     * @deprecated exporter should avoid depending on the type of the instrument
     * as their resulting aggregator can be re-mapped with views.
     */
    readonly type: InstrumentType;
    readonly valueType: ValueType;
}
/**
 * Basic metric data fields.
 */
interface BaseMetricData {
    readonly descriptor: MetricDescriptor;
    readonly aggregationTemporality: AggregationTemporality;
    /**
     * DataPointType of the metric instrument.
     */
    readonly dataPointType: DataPointType;
}
/**
 * Represents a metric data aggregated by either a LastValueAggregation or
 * SumAggregation.
 */
export interface SumMetricData extends BaseMetricData {
    readonly dataPointType: DataPointType.SUM;
    readonly dataPoints: DataPoint<number>[];
    readonly isMonotonic: boolean;
}
export interface GaugeMetricData extends BaseMetricData {
    readonly dataPointType: DataPointType.GAUGE;
    readonly dataPoints: DataPoint<number>[];
}
/**
 * Represents a metric data aggregated by a HistogramAggregation.
 */
export interface HistogramMetricData extends BaseMetricData {
    readonly dataPointType: DataPointType.HISTOGRAM;
    readonly dataPoints: DataPoint<Histogram>[];
}
/**
 * Represents a metric data aggregated by a ExponentialHistogramAggregation.
 */
export interface ExponentialHistogramMetricData extends BaseMetricData {
    readonly dataPointType: DataPointType.EXPONENTIAL_HISTOGRAM;
    readonly dataPoints: DataPoint<ExponentialHistogram>[];
}
/**
 * Represents an aggregated metric data.
 */
export declare type MetricData = SumMetricData | GaugeMetricData | HistogramMetricData | ExponentialHistogramMetricData;
export interface ScopeMetrics {
    scope: InstrumentationScope;
    metrics: MetricData[];
}
export interface ResourceMetrics {
    resource: IResource;
    scopeMetrics: ScopeMetrics[];
}
/**
 * Represents the collection result of the metrics. If there are any
 * non-critical errors in the collection, like throwing in a single observable
 * callback, these errors are aggregated in the {@link CollectionResult.errors}
 * array and other successfully collected metrics are returned.
 */
export interface CollectionResult {
    /**
     * Collected metrics.
     */
    resourceMetrics: ResourceMetrics;
    /**
     * Arbitrary JavaScript exception values.
     */
    errors: unknown[];
}
/**
 * The aggregated point data type.
 */
export declare enum DataPointType {
    /**
     * A histogram data point contains a histogram statistics of collected
     * values with a list of explicit bucket boundaries and statistics such
     * as min, max, count, and sum of all collected values.
     */
    HISTOGRAM = 0,
    /**
     * An exponential histogram data point contains a histogram statistics of
     * collected values where bucket boundaries are automatically calculated
     * using an exponential function, and statistics such as min, max, count,
     * and sum of all collected values.
     */
    EXPONENTIAL_HISTOGRAM = 1,
    /**
     * A gauge metric data point has only a single numeric value.
     */
    GAUGE = 2,
    /**
     * A sum metric data point has a single numeric value and a
     * monotonicity-indicator.
     */
    SUM = 3
}
/**
 * Represents an aggregated point data with start time, end time and their
 * associated attributes and points.
 */
export interface DataPoint<T> {
    /**
     * The start epoch timestamp of the DataPoint, usually the time when
     * the metric was created when the preferred AggregationTemporality is
     * CUMULATIVE, or last collection time otherwise.
     */
    readonly startTime: HrTime;
    /**
     * The end epoch timestamp when data were collected, usually it represents
     * the moment when `MetricReader.collect` was called.
     */
    readonly endTime: HrTime;
    /**
     * The attributes associated with this DataPoint.
     */
    readonly attributes: MetricAttributes;
    /**
     * The value for this DataPoint. The type of the value is indicated by the
     * {@link DataPointType}.
     */
    readonly value: T;
}
export {};
//# sourceMappingURL=MetricData.d.ts.map