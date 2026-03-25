// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { KnownContextTagKeys, KnownSeverityLevel } from "../generated/index.js";
import { createTagsFromResource, hrTimeToDate, isSyntheticSource, serializeAttribute, } from "./common.js";
import { ATTR_EXCEPTION_MESSAGE, ATTR_EXCEPTION_STACKTRACE, ATTR_EXCEPTION_TYPE, } from "@opentelemetry/semantic-conventions";
import { httpSemanticValues, legacySemanticValues, MaxPropertyLengths } from "../types.js";
import { diag } from "@opentelemetry/api";
import { ApplicationInsightsAvailabilityBaseType, ApplicationInsightsAvailabilityName, ApplicationInsightsBaseType, ApplicationInsightsCustomEventName, ApplicationInsightsEventBaseType, ApplicationInsightsEventName, ApplicationInsightsExceptionBaseType, ApplicationInsightsExceptionName, ApplicationInsightsMessageBaseType, ApplicationInsightsMessageName, ApplicationInsightsPageViewBaseType, ApplicationInsightsPageViewName, } from "./constants/applicationinsights.js";
import { getLocationIp } from "./spanUtils.js";
/**
 * Log to Azure envelope parsing.
 * @internal
 */
export function logToEnvelope(log, ikey) {
    const time = hrTimeToDate(log.hrTime);
    const sampleRate = 100;
    const instrumentationKey = ikey;
    const tags = createTagsFromLog(log);
    // eslint-disable-next-line prefer-const
    let [properties, measurements] = createPropertiesFromLog(log);
    let name;
    let baseType;
    let baseData;
    const exceptionStacktrace = log.attributes[ATTR_EXCEPTION_STACKTRACE];
    const exceptionType = log.attributes[ATTR_EXCEPTION_TYPE];
    const isExceptionType = !!(exceptionType && exceptionStacktrace) || false;
    const isMessageType = !log.attributes[ApplicationInsightsBaseType] &&
        !log.attributes[ApplicationInsightsCustomEventName] &&
        !exceptionType;
    if (isExceptionType) {
        const exceptionMessage = log.attributes[ATTR_EXCEPTION_MESSAGE];
        name = ApplicationInsightsExceptionName;
        baseType = ApplicationInsightsExceptionBaseType;
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
    else if (log.attributes[ApplicationInsightsCustomEventName]) {
        name = ApplicationInsightsEventName;
        baseType = ApplicationInsightsEventBaseType;
        const eventData = {
            name: String(log.attributes[ApplicationInsightsCustomEventName]),
            version: 2,
        };
        baseData = eventData;
        measurements = getLegacyApplicationInsightsMeasurements(log);
    }
    else if (isMessageType) {
        name = ApplicationInsightsMessageName;
        baseType = ApplicationInsightsMessageBaseType;
        const messageData = {
            message: String(log.body),
            severityLevel: String(getSeverity(log.severityNumber)),
            version: 2,
        };
        baseData = messageData;
    }
    else {
        // If Legacy Application Insights Log
        baseType = String(log.attributes[ApplicationInsightsBaseType]);
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
        baseData.message = String(baseData.message).substring(0, MaxPropertyLengths.FIFTEEN_BIT);
    }
    if (properties) {
        for (const key of Object.keys(properties)) {
            properties[key] = String(properties[key]).substring(0, MaxPropertyLengths.THIRTEEN_BIT);
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
    const tags = createTagsFromResource(log.resource);
    if ((_a = log.spanContext) === null || _a === void 0 ? void 0 : _a.traceId) {
        tags[KnownContextTagKeys.AiOperationId] = log.spanContext.traceId;
    }
    if ((_b = log.spanContext) === null || _b === void 0 ? void 0 : _b.spanId) {
        tags[KnownContextTagKeys.AiOperationParentId] = log.spanContext.spanId;
    }
    if (log.attributes[KnownContextTagKeys.AiOperationName]) {
        tags[KnownContextTagKeys.AiOperationName] = log.attributes[KnownContextTagKeys.AiOperationName];
    }
    if (isSyntheticSource(log.attributes)) {
        tags[KnownContextTagKeys.AiOperationSyntheticSource] = "True";
    }
    getLocationIp(tags, log.attributes);
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
                legacySemanticValues.includes(key) ||
                httpSemanticValues.includes(key) ||
                key === KnownContextTagKeys.AiOperationName)) {
                properties[key] = serializeAttribute(log.attributes[key]);
            }
        }
    }
    return [properties, measurements];
}
// https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/logs/data-model.md#field-severitynumber
function getSeverity(severityNumber) {
    if (severityNumber) {
        if (severityNumber > 0 && severityNumber < 9) {
            return KnownSeverityLevel.Verbose;
        }
        else if (severityNumber >= 9 && severityNumber < 13) {
            return KnownSeverityLevel.Information;
        }
        else if (severityNumber >= 13 && severityNumber < 17) {
            return KnownSeverityLevel.Warning;
        }
        else if (severityNumber >= 17 && severityNumber < 21) {
            return KnownSeverityLevel.Error;
        }
        else if (severityNumber >= 21 && severityNumber < 25) {
            return KnownSeverityLevel.Critical;
        }
    }
    return;
}
function getLegacyApplicationInsightsName(log) {
    let name = "";
    switch (log.attributes[ApplicationInsightsBaseType]) {
        case ApplicationInsightsAvailabilityBaseType:
            name = ApplicationInsightsAvailabilityName;
            break;
        case ApplicationInsightsExceptionBaseType:
            name = ApplicationInsightsExceptionName;
            break;
        case ApplicationInsightsMessageBaseType:
            name = ApplicationInsightsMessageName;
            break;
        case ApplicationInsightsPageViewBaseType:
            name = ApplicationInsightsPageViewName;
            break;
        case ApplicationInsightsEventBaseType:
            name = ApplicationInsightsEventName;
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
            switch (log.attributes[ApplicationInsightsBaseType]) {
                case ApplicationInsightsAvailabilityBaseType:
                    baseData = log.body;
                    break;
                case ApplicationInsightsExceptionBaseType:
                    baseData = log.body;
                    break;
                case ApplicationInsightsMessageBaseType:
                    baseData = log.body;
                    break;
                case ApplicationInsightsPageViewBaseType:
                    baseData = log.body;
                    break;
                case ApplicationInsightsEventBaseType:
                    baseData = log.body;
                    break;
            }
            if (typeof (baseData === null || baseData === void 0 ? void 0 : baseData.message) === "object") {
                baseData.message = JSON.stringify(baseData.message);
            }
        }
        catch (err) {
            diag.error("AzureMonitorLogExporter failed to parse Application Insights Telemetry");
        }
    }
    return baseData;
}
//# sourceMappingURL=logUtils.js.map