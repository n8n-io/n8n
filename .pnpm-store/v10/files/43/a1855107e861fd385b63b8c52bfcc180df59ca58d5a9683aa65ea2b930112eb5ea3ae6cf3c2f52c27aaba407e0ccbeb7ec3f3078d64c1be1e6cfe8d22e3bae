// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { DataPointType } from "@opentelemetry/sdk-metrics";
import { createTagsFromResource } from "./common.js";
import { BreezePerformanceCounterNames, OTelPerformanceCounterNames } from "../types.js";
import { ENV_OTEL_METRICS_EXPORTER, ENV_OTLP_METRICS_ENDPOINT, ENV_AZURE_MONITOR_AUTO_ATTACH, ENV_APPLICATIONINSIGHTS_METRICS_TO_LOGANALYTICS_ENABLED, } from "../Declarations/Constants.js";
import { AttachTypeName, AZURE_MONITOR_AUTO_ATTACH } from "../export/statsbeat/types.js";
import { getInstance } from "../platform/index.js";
const breezePerformanceCountersMap = new Map([
    [OTelPerformanceCounterNames.PRIVATE_BYTES, BreezePerformanceCounterNames.PRIVATE_BYTES],
    [OTelPerformanceCounterNames.AVAILABLE_BYTES, BreezePerformanceCounterNames.AVAILABLE_BYTES],
    [OTelPerformanceCounterNames.PROCESSOR_TIME, BreezePerformanceCounterNames.PROCESSOR_TIME],
    [
        OTelPerformanceCounterNames.PROCESS_TIME_STANDARD,
        BreezePerformanceCounterNames.PROCESS_TIME_STANDARD,
    ],
    [
        OTelPerformanceCounterNames.PROCESS_TIME_NORMALIZED,
        BreezePerformanceCounterNames.PROCESS_TIME_NORMALIZED,
    ],
    [OTelPerformanceCounterNames.REQUEST_RATE, BreezePerformanceCounterNames.REQUEST_RATE],
    [OTelPerformanceCounterNames.REQUEST_DURATION, BreezePerformanceCounterNames.REQUEST_DURATION],
    [OTelPerformanceCounterNames.EXCEPTION_RATE, BreezePerformanceCounterNames.EXCEPTION_RATE],
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
export function resourceMetricsToEnvelope(metrics, ikey, isStatsbeat) {
    const envelopes = [];
    const time = new Date();
    const instrumentationKey = ikey;
    let tags;
    let envelopeName;
    if (isStatsbeat) {
        envelopeName = "Microsoft.ApplicationInsights.Statsbeat";
        const context = getInstance();
        tags = Object.assign({}, context.tags);
    }
    else {
        envelopeName = "Microsoft.ApplicationInsights.Metric";
        tags = createTagsFromResource(metrics.resource);
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
                    process.env[ENV_APPLICATIONINSIGHTS_METRICS_TO_LOGANALYTICS_ENABLED] === "false" &&
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
                if (metric.dataPointType === DataPointType.SUM ||
                    metric.dataPointType === DataPointType.GAUGE) {
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
export function isAksAttach() {
    return !!(process.env[ENV_AZURE_MONITOR_AUTO_ATTACH] === "true" && process.env.AKS_ARM_NAMESPACE_ID);
}
export function shouldSendToOtlp() {
    var _a;
    return !!(process.env[ENV_OTLP_METRICS_ENDPOINT] &&
        ((_a = process.env[ENV_OTEL_METRICS_EXPORTER]) === null || _a === void 0 ? void 0 : _a.includes("otlp")));
}
export function isStandardMetric(dataPoint) {
    var _a;
    return ((_a = dataPoint.attributes) === null || _a === void 0 ? void 0 : _a["_MS.IsAutocollected"]) === "True";
}
export function getAttachType() {
    if (process.env[AZURE_MONITOR_AUTO_ATTACH] === "true") {
        return AttachTypeName.INTEGRATED_AUTO;
    }
    return AttachTypeName.MANUAL;
}
//# sourceMappingURL=metricUtils.js.map