"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toMetric = exports.toScopeMetrics = exports.toResourceMetrics = void 0;
const api_1 = require("@opentelemetry/api");
const sdk_metrics_1 = require("@opentelemetry/sdk-metrics");
const common_1 = require("../common");
const internal_1 = require("../common/internal");
const internal_2 = require("../resource/internal");
function toResourceMetrics(resourceMetrics, options) {
    const encoder = (0, common_1.getOtlpEncoder)(options);
    return {
        resource: (0, internal_2.createResource)(resourceMetrics.resource),
        schemaUrl: undefined,
        scopeMetrics: toScopeMetrics(resourceMetrics.scopeMetrics, encoder),
    };
}
exports.toResourceMetrics = toResourceMetrics;
function toScopeMetrics(scopeMetrics, encoder) {
    return Array.from(scopeMetrics.map(metrics => ({
        scope: (0, internal_1.createInstrumentationScope)(metrics.scope),
        metrics: metrics.metrics.map(metricData => toMetric(metricData, encoder)),
        schemaUrl: metrics.scope.schemaUrl,
    })));
}
exports.toScopeMetrics = toScopeMetrics;
function toMetric(metricData, encoder) {
    const out = {
        name: metricData.descriptor.name,
        description: metricData.descriptor.description,
        unit: metricData.descriptor.unit,
    };
    const aggregationTemporality = toAggregationTemporality(metricData.aggregationTemporality);
    switch (metricData.dataPointType) {
        case sdk_metrics_1.DataPointType.SUM:
            out.sum = {
                aggregationTemporality,
                isMonotonic: metricData.isMonotonic,
                dataPoints: toSingularDataPoints(metricData, encoder),
            };
            break;
        case sdk_metrics_1.DataPointType.GAUGE:
            out.gauge = {
                dataPoints: toSingularDataPoints(metricData, encoder),
            };
            break;
        case sdk_metrics_1.DataPointType.HISTOGRAM:
            out.histogram = {
                aggregationTemporality,
                dataPoints: toHistogramDataPoints(metricData, encoder),
            };
            break;
        case sdk_metrics_1.DataPointType.EXPONENTIAL_HISTOGRAM:
            out.exponentialHistogram = {
                aggregationTemporality,
                dataPoints: toExponentialHistogramDataPoints(metricData, encoder),
            };
            break;
    }
    return out;
}
exports.toMetric = toMetric;
function toSingularDataPoint(dataPoint, valueType, encoder) {
    const out = {
        attributes: (0, internal_1.toAttributes)(dataPoint.attributes),
        startTimeUnixNano: encoder.encodeHrTime(dataPoint.startTime),
        timeUnixNano: encoder.encodeHrTime(dataPoint.endTime),
    };
    switch (valueType) {
        case api_1.ValueType.INT:
            out.asInt = dataPoint.value;
            break;
        case api_1.ValueType.DOUBLE:
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
            attributes: (0, internal_1.toAttributes)(dataPoint.attributes),
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
            attributes: (0, internal_1.toAttributes)(dataPoint.attributes),
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
        case sdk_metrics_1.AggregationTemporality.DELTA:
            return 1 /* AGGREGATION_TEMPORALITY_DELTA */;
        case sdk_metrics_1.AggregationTemporality.CUMULATIVE:
            return 2 /* AGGREGATION_TEMPORALITY_CUMULATIVE */;
    }
}
//# sourceMappingURL=internal.js.map