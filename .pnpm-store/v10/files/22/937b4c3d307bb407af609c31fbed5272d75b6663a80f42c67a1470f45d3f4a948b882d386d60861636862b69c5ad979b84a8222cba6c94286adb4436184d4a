"use strict";
/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrometheusSerializer = void 0;
const api_1 = require("@opentelemetry/api");
const sdk_metrics_1 = require("@opentelemetry/sdk-metrics");
const core_1 = require("@opentelemetry/core");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
// This is currently listed as experimental.
const ATTR_OTEL_SCOPE_SCHEMA_URL = 'otel.scope.schema_url';
function escapeString(str) {
    return str.replace(/\\/g, '\\\\').replace(/\n/g, '\\n');
}
/**
 * String Attribute values are converted directly to Prometheus attribute values.
 * Non-string values are represented as JSON-encoded strings.
 *
 * `undefined` is converted to an empty string.
 */
function escapeAttributeValue(str = '') {
    if (typeof str !== 'string') {
        str = JSON.stringify(str);
    }
    return escapeString(str).replace(/"/g, '\\"');
}
const invalidCharacterRegex = /[^a-z0-9_]/gi;
const multipleUnderscoreRegex = /_{2,}/g;
/**
 * Ensures metric names are valid Prometheus metric names by removing
 * characters allowed by OpenTelemetry but disallowed by Prometheus.
 *
 * https://prometheus.io/docs/concepts/data_model/#metric-names-and-attributes
 *
 * 1. Names must match `[a-zA-Z_:][a-zA-Z0-9_:]*`
 *
 * 2. Colons are reserved for user defined recording rules.
 * They should not be used by exporters or direct instrumentation.
 *
 * OpenTelemetry metric names are already validated in the Meter when they are created,
 * and they match the format `[a-zA-Z][a-zA-Z0-9_.\-]*` which is very close to a valid
 * prometheus metric name, so we only need to strip characters valid in OpenTelemetry
 * but not valid in prometheus and replace them with '_'.
 *
 * @param name name to be sanitized
 */
function sanitizePrometheusMetricName(name) {
    // replace all invalid characters with '_'
    return name
        .replace(invalidCharacterRegex, '_')
        .replace(multipleUnderscoreRegex, '_');
}
/**
 * @private
 *
 * Helper method which assists in enforcing the naming conventions for metric
 * names in Prometheus
 * @param name the name of the metric
 * @param type the kind of metric
 * @returns string
 */
function enforcePrometheusNamingConvention(name, data) {
    // Prometheus requires that metrics of the Counter kind have "_total" suffix
    if (!name.endsWith('_total') &&
        data.dataPointType === sdk_metrics_1.DataPointType.SUM &&
        data.isMonotonic) {
        name = name + '_total';
    }
    return name;
}
function valueString(value) {
    if (value === Infinity) {
        return '+Inf';
    }
    else if (value === -Infinity) {
        return '-Inf';
    }
    else {
        // Handle finite numbers and NaN.
        return `${value}`;
    }
}
function toPrometheusType(metricData) {
    switch (metricData.dataPointType) {
        case sdk_metrics_1.DataPointType.SUM:
            if (metricData.isMonotonic) {
                return 'counter';
            }
            return 'gauge';
        case sdk_metrics_1.DataPointType.GAUGE:
            return 'gauge';
        case sdk_metrics_1.DataPointType.HISTOGRAM:
            return 'histogram';
        default:
            return 'untyped';
    }
}
function stringify(metricName, attributes, value, timestamp, additionalAttributes) {
    let hasAttribute = false;
    let attributesStr = '';
    for (const [key, val] of Object.entries(attributes)) {
        const sanitizedAttributeName = sanitizePrometheusMetricName(key);
        hasAttribute = true;
        attributesStr += `${attributesStr.length > 0 ? ',' : ''}${sanitizedAttributeName}="${escapeAttributeValue(val)}"`;
    }
    if (additionalAttributes) {
        for (const [key, val] of Object.entries(additionalAttributes)) {
            const sanitizedAttributeName = sanitizePrometheusMetricName(key);
            hasAttribute = true;
            attributesStr += `${attributesStr.length > 0 ? ',' : ''}${sanitizedAttributeName}="${escapeAttributeValue(val)}"`;
        }
    }
    if (hasAttribute) {
        metricName += `{${attributesStr}}`;
    }
    return `${metricName} ${valueString(value)}${timestamp !== undefined ? ' ' + String(timestamp) : ''}\n`;
}
const NO_REGISTERED_METRICS = '# no registered metrics';
class PrometheusSerializer {
    _prefix;
    _appendTimestamp;
    _additionalAttributes;
    _withResourceConstantLabels;
    _withoutScopeInfo;
    _withoutTargetInfo;
    constructor(prefix, appendTimestamp = false, withResourceConstantLabels, withoutTargetInfo, withoutScopeInfo) {
        if (prefix) {
            this._prefix = prefix + '_';
        }
        this._appendTimestamp = appendTimestamp;
        this._withResourceConstantLabels = withResourceConstantLabels;
        this._withoutScopeInfo = !!withoutScopeInfo;
        this._withoutTargetInfo = !!withoutTargetInfo;
    }
    serialize(resourceMetrics) {
        let str = '';
        this._additionalAttributes = this._filterResourceConstantLabels(resourceMetrics.resource.attributes, this._withResourceConstantLabels);
        for (const scopeMetrics of resourceMetrics.scopeMetrics) {
            str += this._serializeScopeMetrics(scopeMetrics);
        }
        if (str === '') {
            str += NO_REGISTERED_METRICS;
        }
        return this._serializeResource(resourceMetrics.resource) + str;
    }
    _filterResourceConstantLabels(attributes, pattern) {
        if (pattern) {
            const filteredAttributes = {};
            for (const [key, value] of Object.entries(attributes)) {
                if (key.match(pattern)) {
                    filteredAttributes[key] = value;
                }
            }
            return filteredAttributes;
        }
        return;
    }
    _serializeScopeMetrics(scopeMetrics) {
        let str = '';
        for (const metric of scopeMetrics.metrics) {
            str += this._serializeMetricData(metric, scopeMetrics.scope) + '\n';
        }
        return str;
    }
    _serializeMetricData(metricData, scope) {
        let name = sanitizePrometheusMetricName(escapeString(metricData.descriptor.name));
        if (this._prefix) {
            name = `${this._prefix}${name}`;
        }
        const dataPointType = metricData.dataPointType;
        name = enforcePrometheusNamingConvention(name, metricData);
        const help = `# HELP ${name} ${escapeString(metricData.descriptor.description || 'description missing')}`;
        const unit = metricData.descriptor.unit
            ? `\n# UNIT ${name} ${escapeString(metricData.descriptor.unit)}`
            : '';
        const type = `# TYPE ${name} ${toPrometheusType(metricData)}`;
        let additionalAttributes;
        if (this._withoutScopeInfo) {
            additionalAttributes = this._additionalAttributes;
        }
        else {
            const scopeInfo = { [semantic_conventions_1.ATTR_OTEL_SCOPE_NAME]: scope.name };
            if (scope.schemaUrl) {
                scopeInfo[ATTR_OTEL_SCOPE_SCHEMA_URL] = scope.schemaUrl;
            }
            if (scope.version) {
                scopeInfo[semantic_conventions_1.ATTR_OTEL_SCOPE_VERSION] = scope.version;
            }
            additionalAttributes = Object.assign(scopeInfo, this._additionalAttributes);
        }
        let results = '';
        switch (dataPointType) {
            case sdk_metrics_1.DataPointType.SUM:
            case sdk_metrics_1.DataPointType.GAUGE: {
                results = metricData.dataPoints
                    .map(it => this._serializeSingularDataPoint(name, metricData, it, additionalAttributes))
                    .join('');
                break;
            }
            case sdk_metrics_1.DataPointType.HISTOGRAM: {
                results = metricData.dataPoints
                    .map(it => this._serializeHistogramDataPoint(name, metricData, it, additionalAttributes))
                    .join('');
                break;
            }
            default: {
                api_1.diag.error(`Unrecognizable DataPointType: ${dataPointType} for metric "${name}"`);
            }
        }
        return `${help}${unit}\n${type}\n${results}`.trim();
    }
    _serializeSingularDataPoint(name, data, dataPoint, additionalAttributes) {
        let results = '';
        name = enforcePrometheusNamingConvention(name, data);
        const { value, attributes } = dataPoint;
        const timestamp = (0, core_1.hrTimeToMilliseconds)(dataPoint.endTime);
        results += stringify(name, attributes, value, this._appendTimestamp ? timestamp : undefined, additionalAttributes);
        return results;
    }
    _serializeHistogramDataPoint(name, data, dataPoint, additionalAttributes) {
        let results = '';
        name = enforcePrometheusNamingConvention(name, data);
        const attributes = dataPoint.attributes;
        const histogram = dataPoint.value;
        const timestamp = (0, core_1.hrTimeToMilliseconds)(dataPoint.endTime);
        /** Histogram["bucket"] is not typed with `number` */
        for (const key of ['count', 'sum']) {
            const value = histogram[key];
            if (value != null)
                results += stringify(name + '_' + key, attributes, value, this._appendTimestamp ? timestamp : undefined, additionalAttributes);
        }
        let cumulativeSum = 0;
        const countEntries = histogram.buckets.counts.entries();
        let infiniteBoundaryDefined = false;
        for (const [idx, val] of countEntries) {
            cumulativeSum += val;
            const upperBound = histogram.buckets.boundaries[idx];
            /** HistogramAggregator is producing different boundary output -
             * in one case not including infinity values, in other -
             * full, e.g. [0, 100] and [0, 100, Infinity]
             * we should consider that in export, if Infinity is defined, use it
             * as boundary
             */
            if (upperBound === undefined && infiniteBoundaryDefined) {
                break;
            }
            if (upperBound === Infinity) {
                infiniteBoundaryDefined = true;
            }
            results += stringify(name + '_bucket', attributes, cumulativeSum, this._appendTimestamp ? timestamp : undefined, Object.assign({}, additionalAttributes, {
                le: upperBound === undefined || upperBound === Infinity
                    ? '+Inf'
                    : String(upperBound),
            }));
        }
        return results;
    }
    _serializeResource(resource) {
        if (this._withoutTargetInfo === true) {
            return '';
        }
        const name = 'target_info';
        const help = `# HELP ${name} Target metadata`;
        const type = `# TYPE ${name} gauge`;
        const results = stringify(name, resource.attributes, 1).trim();
        return `${help}\n${type}\n${results}\n`;
    }
}
exports.PrometheusSerializer = PrometheusSerializer;
//# sourceMappingURL=PrometheusSerializer.js.map