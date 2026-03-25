"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.resourceMetricsToEnvelope = resourceMetricsToEnvelope;
exports.isAksAttach = isAksAttach;
exports.shouldSendToOtlp = shouldSendToOtlp;
exports.isStandardMetric = isStandardMetric;
exports.getAttachType = getAttachType;
const sdk_metrics_1 = require("@opentelemetry/sdk-metrics");
const common_js_1 = require("./common.js");
const types_js_1 = require("../types.js");
const Constants_js_1 = require("../Declarations/Constants.js");
const types_js_2 = require("../export/statsbeat/types.js");
const index_js_1 = require("../platform/index.js");
const breezePerformanceCountersMap = new Map([
    [types_js_1.OTelPerformanceCounterNames.PRIVATE_BYTES, types_js_1.BreezePerformanceCounterNames.PRIVATE_BYTES],
    [types_js_1.OTelPerformanceCounterNames.AVAILABLE_BYTES, types_js_1.BreezePerformanceCounterNames.AVAILABLE_BYTES],
    [types_js_1.OTelPerformanceCounterNames.PROCESSOR_TIME, types_js_1.BreezePerformanceCounterNames.PROCESSOR_TIME],
    [
        types_js_1.OTelPerformanceCounterNames.PROCESS_TIME_STANDARD,
        types_js_1.BreezePerformanceCounterNames.PROCESS_TIME_STANDARD,
    ],
    [
        types_js_1.OTelPerformanceCounterNames.PROCESS_TIME_NORMALIZED,
        types_js_1.BreezePerformanceCounterNames.PROCESS_TIME_NORMALIZED,
    ],
    [types_js_1.OTelPerformanceCounterNames.REQUEST_RATE, types_js_1.BreezePerformanceCounterNames.REQUEST_RATE],
    [types_js_1.OTelPerformanceCounterNames.REQUEST_DURATION, types_js_1.BreezePerformanceCounterNames.REQUEST_DURATION],
    [types_js_1.OTelPerformanceCounterNames.EXCEPTION_RATE, types_js_1.BreezePerformanceCounterNames.EXCEPTION_RATE],
]);
function createPropertiesFromMetricAttributes(attributes) {
    const properties = {};
    if (attributes) {
        for (const key of Object.keys(attributes)) {
            properties[key] = attributes[key];
        }
    }
    return properties;
}
/**
 * Metric to Azure envelope parsing.
 * @internal
 */
function resourceMetricsToEnvelope(metrics, ikey, isStatsbeat) {
    const envelopes = [];
    const time = new Date();
    const instrumentationKey = ikey;
    let tags;
    let envelopeName;
    if (isStatsbeat) {
        envelopeName = "Microsoft.ApplicationInsights.Statsbeat";
        const context = (0, index_js_1.getInstance)();
        tags = Object.assign({}, context.tags);
    }
    else {
        envelopeName = "Microsoft.ApplicationInsights.Metric";
        tags = (0, common_js_1.createTagsFromResource)(metrics.resource);
    }
    metrics.scopeMetrics.forEach((scopeMetric) => {
        scopeMetric.metrics.forEach((metric) => {
            metric.dataPoints.forEach((dataPoint) => {
                const baseData = {
                    metrics: [],
                    version: 2,
                    properties: {},
                };
                baseData.properties = createPropertiesFromMetricAttributes(dataPoint.attributes);
                // If we're not exporting statsbeat, the metric is *not* a standard metric and the env var is set to false, we should not send the metric.
                if (shouldSendToOtlp() &&
                    isAksAttach() &&
                    !isStandardMetric(dataPoint) &&
                    process.env[Constants_js_1.ENV_APPLICATIONINSIGHTS_METRICS_TO_LOGANALYTICS_ENABLED] === "false" &&
                    !isStatsbeat) {
                    return;
                }
                if (shouldSendToOtlp() && isAksAttach() && !isStatsbeat) {
                    baseData.properties["_MS.SentToAMW"] = "True";
                }
                else if (isAksAttach() && !isStatsbeat) {
                    baseData.properties["_MS.SentToAMW"] = "False";
                }
                let perfCounterName;
                if (breezePerformanceCountersMap.has(metric.descriptor.name)) {
                    perfCounterName = breezePerformanceCountersMap.get(metric.descriptor.name);
                }
                const metricDataPoint = {
                    name: perfCounterName ? perfCounterName : metric.descriptor.name,
                    value: 0,
                    dataPointType: "Aggregation",
                };
                if (metric.dataPointType === sdk_metrics_1.DataPointType.SUM ||
                    metric.dataPointType === sdk_metrics_1.DataPointType.GAUGE) {
                    metricDataPoint.value = dataPoint.value;
                    metricDataPoint.count = 1;
                }
                else {
                    metricDataPoint.value = dataPoint.value.sum || 0;
                    metricDataPoint.count = dataPoint.value.count;
                    metricDataPoint.max = dataPoint.value.max;
                    metricDataPoint.min = dataPoint.value.min;
                }
                baseData.metrics.push(metricDataPoint);
                const envelope = {
                    name: envelopeName,
                    time: time,
                    sampleRate: 100, // Metrics are never sampled
                    instrumentationKey: instrumentationKey,
                    tags: tags,
                    version: 1,
                    data: {
                        baseType: "MetricData",
                        baseData: Object.assign({}, baseData),
                    },
                };
                envelopes.push(envelope);
            });
        });
    });
    return envelopes;
}
function isAksAttach() {
    return !!(process.env[Constants_js_1.ENV_AZURE_MONITOR_AUTO_ATTACH] === "true" && process.env.AKS_ARM_NAMESPACE_ID);
}
function shouldSendToOtlp() {
    var _a;
    return !!(process.env[Constants_js_1.ENV_OTLP_METRICS_ENDPOINT] &&
        ((_a = process.env[Constants_js_1.ENV_OTEL_METRICS_EXPORTER]) === null || _a === void 0 ? void 0 : _a.includes("otlp")));
}
function isStandardMetric(dataPoint) {
    var _a;
    return ((_a = dataPoint.attributes) === null || _a === void 0 ? void 0 : _a["_MS.IsAutocollected"]) === "True";
}
function getAttachType() {
    if (process.env[types_js_2.AZURE_MONITOR_AUTO_ATTACH] === "true") {
        return types_js_2.AttachTypeName.INTEGRATED_AUTO;
    }
    return types_js_2.AttachTypeName.MANUAL;
}
//# sourceMappingURL=metricUtils.js.map