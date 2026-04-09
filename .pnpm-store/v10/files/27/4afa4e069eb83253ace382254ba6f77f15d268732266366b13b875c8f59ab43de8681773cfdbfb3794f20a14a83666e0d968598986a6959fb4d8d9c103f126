import { ValueType } from '@opentelemetry/api';
import { AggregationTemporality, DataPointType, } from '@opentelemetry/sdk-metrics';
import { getOtlpEncoder } from '../common';
import { createInstrumentationScope, toAttributes } from '../common/internal';
import { createResource } from '../resource/internal';
export function toResourceMetrics(resourceMetrics, options) {
    const encoder = getOtlpEncoder(options);
    return {
        resource: createResource(resourceMetrics.resource),
        schemaUrl: undefined,
        scopeMetrics: toScopeMetrics(resourceMetrics.scopeMetrics, encoder),
    };
}
export function toScopeMetrics(scopeMetrics, encoder) {
    return Array.from(scopeMetrics.map(metrics => ({
        scope: createInstrumentationScope(metrics.scope),
        metrics: metrics.metrics.map(metricData => toMetric(metricData, encoder)),
        schemaUrl: metrics.scope.schemaUrl,
    })));
}
export function toMetric(metricData, encoder) {
    const out = {
        name: metricData.descriptor.name,
        description: metricData.descriptor.description,
        unit: metricData.descriptor.unit,
    };
    const aggregationTemporality = toAggregationTemporality(metricData.aggregationTemporality);
    switch (metricData.dataPointType) {
        case DataPointType.SUM:
            out.sum = {
                aggregationTemporality,
                isMonotonic: metricData.isMonotonic,
                dataPoints: toSingularDataPoints(metricData, encoder),
            };
            break;
        case DataPointType.GAUGE:
            out.gauge = {
                dataPoints: toSingularDataPoints(metricData, encoder),
            };
            break;
        case DataPointType.HISTOGRAM:
            out.histogram = {
                aggregationTemporality,
                dataPoints: toHistogramDataPoints(metricData, encoder),
            };
            break;
        case DataPointType.EXPONENTIAL_HISTOGRAM:
            out.exponentialHistogram = {
                aggregationTemporality,
                dataPoints: toExponentialHistogramDataPoints(metricData, encoder),
            };
            break;
    }
    return out;
}
function toSingularDataPoint(dataPoint, valueType, encoder) {
    const out = {
        attributes: toAttributes(dataPoint.attributes),
        startTimeUnixNano: encoder.encodeHrTime(dataPoint.startTime),
        timeUnixNano: encoder.encodeHrTime(dataPoint.endTime),
    };
    switch (valueType) {
        case ValueType.INT:
            out.asInt = dataPoint.value;
            break;
        case ValueType.DOUBLE:
            out.asDouble = dataPoint.value;
            break;
    }
    return out;
}
function toSingularDataPoints(metricData, encoder) {
    return metricData.dataPoints.map(dataPoint => {
        return toSingularDataPoint(dataPoint, metricData.descriptor.valueType, encoder);
    });
}
function toHistogramDataPoints(metricData, encoder) {
    return metricData.dataPoints.map(dataPoint => {
        const histogram = dataPoint.value;
        return {
            attributes: toAttributes(dataPoint.attributes),
            bucketCounts: histogram.buckets.counts,
            explicitBounds: histogram.buckets.boundaries,
            count: histogram.count,
            sum: histogram.sum,
            min: histogram.min,
            max: histogram.max,
            startTimeUnixNano: encoder.encodeHrTime(dataPoint.startTime),
            timeUnixNano: encoder.encodeHrTime(dataPoint.endTime),
        };
    });
}
function toExponentialHistogramDataPoints(metricData, encoder) {
    return metricData.dataPoints.map(dataPoint => {
        const histogram = dataPoint.value;
        return {
            attributes: toAttributes(dataPoint.attributes),
            count: histogram.count,
            min: histogram.min,
            max: histogram.max,
            sum: histogram.sum,
            positive: {
                offset: histogram.positive.offset,
                bucketCounts: histogram.positive.bucketCounts,
            },
            negative: {
                offset: histogram.negative.offset,
                bucketCounts: histogram.negative.bucketCounts,
            },
            scale: histogram.scale,
            zeroCount: histogram.zeroCount,
            startTimeUnixNano: encoder.encodeHrTime(dataPoint.startTime),
            timeUnixNano: encoder.encodeHrTime(dataPoint.endTime),
        };
    });
}
function toAggregationTemporality(temporality) {
    switch (temporality) {
        case AggregationTemporality.DELTA:
            return 1 /* AGGREGATION_TEMPORALITY_DELTA */;
        case AggregationTemporality.CUMULATIVE:
            return 2 /* AGGREGATION_TEMPORALITY_CUMULATIVE */;
    }
}
//# sourceMappingURL=internal.js.map