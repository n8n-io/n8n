"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.logToEnvelope = logToEnvelope;
const index_js_1 = require("../generated/index.js");
const common_js_1 = require("./common.js");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const types_js_1 = require("../types.js");
const api_1 = require("@opentelemetry/api");
const applicationinsights_js_1 = require("./constants/applicationinsights.js");
const spanUtils_js_1 = require("./spanUtils.js");
/**
 * Log to Azure envelope parsing.
 * @internal
 */
function logToEnvelope(log, ikey) {
    const time = (0, common_js_1.hrTimeToDate)(log.hrTime);
    const sampleRate = 100;
    const instrumentationKey = ikey;
    const tags = createTagsFromLog(log);
    // eslint-disable-next-line prefer-const
    let [properties, measurements] = createPropertiesFromLog(log);
    let name;
    let baseType;
    let baseData;
    const exceptionStacktrace = log.attributes[semantic_conventions_1.ATTR_EXCEPTION_STACKTRACE];
    const exceptionType = log.attributes[semantic_conventions_1.ATTR_EXCEPTION_TYPE];
    const isExceptionType = !!(exceptionType && exceptionStacktrace) || false;
    const isMessageType = !log.attributes[applicationinsights_js_1.ApplicationInsightsBaseType] &&
        !log.attributes[applicationinsights_js_1.ApplicationInsightsCustomEventName] &&
        !exceptionType;
    if (isExceptionType) {
        const exceptionMessage = log.attributes[semantic_conventions_1.ATTR_EXCEPTION_MESSAGE];
        name = applicationinsights_js_1.ApplicationInsightsExceptionName;
        baseType = applicationinsights_js_1.ApplicationInsightsExceptionBaseType;
        const exceptionDetails = {
            typeName: String(exceptionType),
            message: String(exceptionMessage),
            hasFullStack: exceptionStacktrace ? true : false,
            stack: String(exceptionStacktrace),
        };
        const exceptionData = {
            exceptions: [exceptionDetails],
            severityLevel: String(getSeverity(log.severityNumber)),
            version: 2,
        };
        baseData = exceptionData;
    }
    else if (log.attributes[applicationinsights_js_1.ApplicationInsightsCustomEventName]) {
        name = applicationinsights_js_1.ApplicationInsightsEventName;
        baseType = applicationinsights_js_1.ApplicationInsightsEventBaseType;
        const eventData = {
            name: String(log.attributes[applicationinsights_js_1.ApplicationInsightsCustomEventName]),
            version: 2,
        };
        baseData = eventData;
        measurements = getLegacyApplicationInsightsMeasurements(log);
    }
    else if (isMessageType) {
        name = applicationinsights_js_1.ApplicationInsightsMessageName;
        baseType = applicationinsights_js_1.ApplicationInsightsMessageBaseType;
        const messageData = {
            message: String(log.body),
            severityLevel: String(getSeverity(log.severityNumber)),
            version: 2,
        };
        baseData = messageData;
    }
    else {
        // If Legacy Application Insights Log
        baseType = String(log.attributes[applicationinsights_js_1.ApplicationInsightsBaseType]);
        name = getLegacyApplicationInsightsName(log);
        baseData = getLegacyApplicationInsightsBaseData(log);
        measurements = getLegacyApplicationInsightsMeasurements(log);
        if (!baseData) {
            // Failed to parse log
            return;
        }
    }
    // Truncate properties
    if (baseData.message) {
        baseData.message = String(baseData.message).substring(0, types_js_1.MaxPropertyLengths.FIFTEEN_BIT);
    }
    if (properties) {
        for (const key of Object.keys(properties)) {
            properties[key] = String(properties[key]).substring(0, types_js_1.MaxPropertyLengths.THIRTEEN_BIT);
        }
    }
    return {
        name,
        sampleRate,
        time,
        instrumentationKey,
        tags,
        version: 1,
        data: {
            baseType,
            baseData: Object.assign(Object.assign({}, baseData), { properties,
                measurements }),
        },
    };
}
function createTagsFromLog(log) {
    var _a, _b;
    const tags = (0, common_js_1.createTagsFromResource)(log.resource);
    if ((_a = log.spanContext) === null || _a === void 0 ? void 0 : _a.traceId) {
        tags[index_js_1.KnownContextTagKeys.AiOperationId] = log.spanContext.traceId;
    }
    if ((_b = log.spanContext) === null || _b === void 0 ? void 0 : _b.spanId) {
        tags[index_js_1.KnownContextTagKeys.AiOperationParentId] = log.spanContext.spanId;
    }
    if (log.attributes[index_js_1.KnownContextTagKeys.AiOperationName]) {
        tags[index_js_1.KnownContextTagKeys.AiOperationName] = log.attributes[index_js_1.KnownContextTagKeys.AiOperationName];
    }
    if ((0, common_js_1.isSyntheticSource)(log.attributes)) {
        tags[index_js_1.KnownContextTagKeys.AiOperationSyntheticSource] = "True";
    }
    (0, spanUtils_js_1.getLocationIp)(tags, log.attributes);
    return tags;
}
function createPropertiesFromLog(log) {
    const measurements = {};
    const properties = {};
    if (log.attributes) {
        for (const key of Object.keys(log.attributes)) {
            // Avoid duplication ignoring fields already mapped.
            if (!(key.startsWith("_MS.") ||
                key.startsWith("microsoft") ||
                types_js_1.legacySemanticValues.includes(key) ||
                types_js_1.httpSemanticValues.includes(key) ||
                key === index_js_1.KnownContextTagKeys.AiOperationName)) {
                properties[key] = (0, common_js_1.serializeAttribute)(log.attributes[key]);
            }
        }
    }
    return [properties, measurements];
}
// https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/logs/data-model.md#field-severitynumber
function getSeverity(severityNumber) {
    if (severityNumber) {
        if (severityNumber > 0 && severityNumber < 9) {
            return index_js_1.KnownSeverityLevel.Verbose;
        }
        else if (severityNumber >= 9 && severityNumber < 13) {
            return index_js_1.KnownSeverityLevel.Information;
        }
        else if (severityNumber >= 13 && severityNumber < 17) {
            return index_js_1.KnownSeverityLevel.Warning;
        }
        else if (severityNumber >= 17 && severityNumber < 21) {
            return index_js_1.KnownSeverityLevel.Error;
        }
        else if (severityNumber >= 21 && severityNumber < 25) {
            return index_js_1.KnownSeverityLevel.Critical;
        }
    }
    return;
}
function getLegacyApplicationInsightsName(log) {
    let name = "";
    switch (log.attributes[applicationinsights_js_1.ApplicationInsightsBaseType]) {
        case applicationinsights_js_1.ApplicationInsightsAvailabilityBaseType:
            name = applicationinsights_js_1.ApplicationInsightsAvailabilityName;
            break;
        case applicationinsights_js_1.ApplicationInsightsExceptionBaseType:
            name = applicationinsights_js_1.ApplicationInsightsExceptionName;
            break;
        case applicationinsights_js_1.ApplicationInsightsMessageBaseType:
            name = applicationinsights_js_1.ApplicationInsightsMessageName;
            break;
        case applicationinsights_js_1.ApplicationInsightsPageViewBaseType:
            name = applicationinsights_js_1.ApplicationInsightsPageViewName;
            break;
        case applicationinsights_js_1.ApplicationInsightsEventBaseType:
            name = applicationinsights_js_1.ApplicationInsightsEventName;
            break;
    }
    return name;
}
function getLegacyApplicationInsightsMeasurements(log) {
    var _a;
    let measurements = {};
    if ((_a = log.body) === null || _a === void 0 ? void 0 : _a.measurements) {
        measurements = Object.assign({}, log.body.measurements);
    }
    return measurements;
}
function getLegacyApplicationInsightsBaseData(log) {
    let baseData = {
        version: 2,
    };
    if (log.body) {
        try {
            switch (log.attributes[applicationinsights_js_1.ApplicationInsightsBaseType]) {
                case applicationinsights_js_1.ApplicationInsightsAvailabilityBaseType:
                    baseData = log.body;
                    break;
                case applicationinsights_js_1.ApplicationInsightsExceptionBaseType:
                    baseData = log.body;
                    break;
                case applicationinsights_js_1.ApplicationInsightsMessageBaseType:
                    baseData = log.body;
                    break;
                case applicationinsights_js_1.ApplicationInsightsPageViewBaseType:
                    baseData = log.body;
                    break;
                case applicationinsights_js_1.ApplicationInsightsEventBaseType:
                    baseData = log.body;
                    break;
            }
            if (typeof (baseData === null || baseData === void 0 ? void 0 : baseData.message) === "object") {
                baseData.message = JSON.stringify(baseData.message);
            }
        }
        catch (err) {
            api_1.diag.error("AzureMonitorLogExporter failed to parse Application Insights Telemetry");
        }
    }
    return baseData;
}
//# sourceMappingURL=logUtils.js.map