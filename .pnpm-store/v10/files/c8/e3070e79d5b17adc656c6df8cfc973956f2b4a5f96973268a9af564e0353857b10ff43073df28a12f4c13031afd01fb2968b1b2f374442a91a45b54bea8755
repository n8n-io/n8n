"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.readableSpanToEnvelope = readableSpanToEnvelope;
exports.spanEventsToEnvelopes = spanEventsToEnvelopes;
exports.getPeerIp = getPeerIp;
exports.getLocationIp = getLocationIp;
exports.getHttpClientIp = getHttpClientIp;
exports.getUserAgent = getUserAgent;
exports.getHttpUrl = getHttpUrl;
exports.getHttpMethod = getHttpMethod;
exports.getHttpStatusCode = getHttpStatusCode;
exports.getHttpScheme = getHttpScheme;
exports.getHttpTarget = getHttpTarget;
exports.getHttpHost = getHttpHost;
exports.getNetPeerName = getNetPeerName;
exports.getNetPeerPort = getNetPeerPort;
const core_1 = require("@opentelemetry/core");
const api_1 = require("@opentelemetry/api");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const common_js_1 = require("./common.js");
const types_js_1 = require("../types.js");
const eventhub_js_1 = require("./eventhub.js");
const applicationinsights_js_1 = require("./constants/applicationinsights.js");
const azAttributes_js_1 = require("./constants/span/azAttributes.js");
const index_js_1 = require("../generated/index.js");
const breezeUtils_js_1 = require("./breezeUtils.js");
function createTagsFromSpan(span) {
    var _a;
    const tags = (0, common_js_1.createTagsFromResource)(span.resource);
    tags[index_js_1.KnownContextTagKeys.AiOperationId] = span.spanContext().traceId;
    if ((_a = span.parentSpanContext) === null || _a === void 0 ? void 0 : _a.spanId) {
        tags[index_js_1.KnownContextTagKeys.AiOperationParentId] = span.parentSpanContext.spanId;
    }
    const endUserId = span.attributes[semantic_conventions_1.SEMATTRS_ENDUSER_ID];
    if (endUserId) {
        tags[index_js_1.KnownContextTagKeys.AiUserId] = String(endUserId);
    }
    const httpUserAgent = getUserAgent(span.attributes);
    if (httpUserAgent) {
        // TODO: Not exposed in Swagger, need to update def
        tags["ai.user.userAgent"] = String(httpUserAgent);
    }
    if ((0, common_js_1.isSyntheticSource)(span.attributes)) {
        tags[index_js_1.KnownContextTagKeys.AiOperationSyntheticSource] = "True";
    }
    if (span.kind === api_1.SpanKind.SERVER) {
        const httpMethod = getHttpMethod(span.attributes);
        getLocationIp(tags, span.attributes);
        if (httpMethod) {
            const httpRoute = span.attributes[semantic_conventions_1.ATTR_HTTP_ROUTE];
            const httpUrl = getHttpUrl(span.attributes);
            tags[index_js_1.KnownContextTagKeys.AiOperationName] = span.name; // Default
            if (httpRoute) {
                // AiOperationName max length is 1024
                // https://github.com/MohanGsk/ApplicationInsights-Home/blob/master/EndpointSpecs/Schemas/Bond/ContextTagKeys.bond
                tags[index_js_1.KnownContextTagKeys.AiOperationName] = String(`${httpMethod} ${httpRoute}`).substring(0, types_js_1.MaxPropertyLengths.TEN_BIT);
            }
            else if (httpUrl) {
                try {
                    const url = new URL(String(httpUrl));
                    tags[index_js_1.KnownContextTagKeys.AiOperationName] = String(`${httpMethod} ${url.pathname}`).substring(0, types_js_1.MaxPropertyLengths.TEN_BIT);
                }
                catch (_b) {
                    /* no-op */
                }
            }
        }
        else {
            tags[index_js_1.KnownContextTagKeys.AiOperationName] = span.name;
        }
    }
    else {
        if (span.attributes[index_js_1.KnownContextTagKeys.AiOperationName]) {
            tags[index_js_1.KnownContextTagKeys.AiOperationName] = span.attributes[index_js_1.KnownContextTagKeys.AiOperationName];
        }
    }
    // TODO: Location IP TBD for non server spans
    return tags;
}
function createPropertiesFromSpanAttributes(attributes) {
    const properties = {};
    if (attributes) {
        for (const key of Object.keys(attributes)) {
            // Avoid duplication ignoring fields already mapped.
            if (
            // We need to not ignore the _MS.ProcessedByMetricExtractors key as it's used to identify standard metrics
            !((key.startsWith("_MS.") && !types_js_1.internalMicrosoftAttributes.includes(key)) ||
                key.startsWith("microsoft.") ||
                types_js_1.legacySemanticValues.includes(key) ||
                types_js_1.httpSemanticValues.includes(key) ||
                key === index_js_1.KnownContextTagKeys.AiOperationName)) {
                properties[key] = (0, common_js_1.serializeAttribute)(attributes[key]);
            }
        }
    }
    return properties;
}
function createPropertiesFromSpan(span) {
    const properties = createPropertiesFromSpanAttributes(span.attributes);
    const measurements = {};
    const links = span.links.map((link) => ({
        operation_Id: link.context.traceId,
        id: link.context.spanId,
    }));
    if (links.length > 0) {
        properties[applicationinsights_js_1.MS_LINKS] = JSON.stringify(links);
    }
    return [properties, measurements];
}
function createDependencyData(span) {
    var _a;
    const remoteDependencyData = {
        name: span.name, // Default
        id: `${span.spanContext().spanId}`,
        success: ((_a = span.status) === null || _a === void 0 ? void 0 : _a.code) !== api_1.SpanStatusCode.ERROR,
        resultCode: "0",
        type: "Dependency",
        duration: (0, breezeUtils_js_1.msToTimeSpan)((0, core_1.hrTimeToMilliseconds)(span.duration)),
        version: 2,
    };
    if (span.kind === api_1.SpanKind.PRODUCER) {
        remoteDependencyData.type = applicationinsights_js_1.DependencyTypes.QueueMessage;
    }
    if (span.kind === api_1.SpanKind.INTERNAL && span.parentSpanContext) {
        remoteDependencyData.type = applicationinsights_js_1.DependencyTypes.InProc;
    }
    const httpMethod = getHttpMethod(span.attributes);
    const dbSystem = span.attributes[semantic_conventions_1.SEMATTRS_DB_SYSTEM];
    const rpcSystem = span.attributes[semantic_conventions_1.SEMATTRS_RPC_SYSTEM];
    // HTTP Dependency
    if (httpMethod) {
        const httpUrl = getHttpUrl(span.attributes);
        if (httpUrl) {
            try {
                const dependencyUrl = new URL(String(httpUrl));
                remoteDependencyData.name = `${httpMethod} ${dependencyUrl.pathname}`;
            }
            catch (_b) {
                /* no-op */
            }
        }
        remoteDependencyData.type = applicationinsights_js_1.DependencyTypes.Http;
        remoteDependencyData.data = (0, common_js_1.getUrl)(span.attributes);
        const httpStatusCode = getHttpStatusCode(span.attributes);
        if (httpStatusCode) {
            remoteDependencyData.resultCode = String(httpStatusCode);
        }
        let target = (0, common_js_1.getDependencyTarget)(span.attributes);
        if (target) {
            try {
                // Remove default port
                const portRegex = new RegExp(/(https?)(:\/\/.*)(:\d+)(\S*)/);
                const res = portRegex.exec(target);
                if (res !== null) {
                    const protocol = res[1];
                    const port = res[3];
                    if ((protocol === "https" && port === ":443") ||
                        (protocol === "http" && port === ":80")) {
                        // Drop port
                        target = res[1] + res[2] + res[4];
                    }
                }
            }
            catch (_c) {
                /* no-op */
            }
            remoteDependencyData.target = `${target}`;
        }
    }
    // DB Dependency
    else if (dbSystem) {
        // TODO: Remove special logic when Azure UX supports OpenTelemetry dbSystem
        if (String(dbSystem) === semantic_conventions_1.DBSYSTEMVALUES_MYSQL) {
            remoteDependencyData.type = "mysql";
        }
        else if (String(dbSystem) === semantic_conventions_1.DBSYSTEMVALUES_POSTGRESQL) {
            remoteDependencyData.type = "postgresql";
        }
        else if (String(dbSystem) === semantic_conventions_1.DBSYSTEMVALUES_MONGODB) {
            remoteDependencyData.type = "mongodb";
        }
        else if (String(dbSystem) === semantic_conventions_1.DBSYSTEMVALUES_REDIS) {
            remoteDependencyData.type = "redis";
        }
        else if ((0, common_js_1.isSqlDB)(String(dbSystem))) {
            remoteDependencyData.type = "SQL";
        }
        else {
            remoteDependencyData.type = String(dbSystem);
        }
        const dbStatement = span.attributes[semantic_conventions_1.SEMATTRS_DB_STATEMENT];
        const dbOperation = span.attributes[semantic_conventions_1.SEMATTRS_DB_OPERATION];
        if (dbStatement) {
            remoteDependencyData.data = String(dbStatement);
        }
        else if (dbOperation) {
            remoteDependencyData.data = String(dbOperation);
        }
        const target = (0, common_js_1.getDependencyTarget)(span.attributes);
        const dbName = span.attributes[semantic_conventions_1.SEMATTRS_DB_NAME];
        if (target) {
            remoteDependencyData.target = dbName ? `${target}|${dbName}` : `${target}`;
        }
        else {
            remoteDependencyData.target = dbName ? `${dbName}` : `${dbSystem}`;
        }
    }
    // grpc Dependency
    else if (rpcSystem) {
        if (rpcSystem === applicationinsights_js_1.DependencyTypes.Wcf) {
            remoteDependencyData.type = applicationinsights_js_1.DependencyTypes.Wcf;
        }
        else {
            remoteDependencyData.type = applicationinsights_js_1.DependencyTypes.Grpc;
        }
        const grpcStatusCode = span.attributes[semantic_conventions_1.SEMATTRS_RPC_GRPC_STATUS_CODE];
        if (grpcStatusCode) {
            remoteDependencyData.resultCode = String(grpcStatusCode);
        }
        const target = (0, common_js_1.getDependencyTarget)(span.attributes);
        if (target) {
            remoteDependencyData.target = `${target}`;
        }
        else if (rpcSystem) {
            remoteDependencyData.target = String(rpcSystem);
        }
    }
    return remoteDependencyData;
}
function createRequestData(span) {
    const requestData = {
        id: `${span.spanContext().spanId}`,
        success: span.status.code !== api_1.SpanStatusCode.ERROR &&
            (Number(getHttpStatusCode(span.attributes)) || 0) < 400,
        responseCode: "0",
        duration: (0, breezeUtils_js_1.msToTimeSpan)((0, core_1.hrTimeToMilliseconds)(span.duration)),
        version: 2,
        source: undefined,
    };
    const httpMethod = getHttpMethod(span.attributes);
    const grpcStatusCode = span.attributes[semantic_conventions_1.SEMATTRS_RPC_GRPC_STATUS_CODE];
    if (httpMethod) {
        requestData.url = (0, common_js_1.getUrl)(span.attributes);
        const httpStatusCode = getHttpStatusCode(span.attributes);
        if (httpStatusCode) {
            requestData.responseCode = String(httpStatusCode);
        }
    }
    else if (grpcStatusCode) {
        requestData.responseCode = String(grpcStatusCode);
    }
    return requestData;
}
/**
 * Span to Azure envelope parsing.
 * @internal
 */
function readableSpanToEnvelope(span, ikey) {
    let name;
    let baseType;
    let baseData;
    const time = (0, common_js_1.hrTimeToDate)(span.startTime);
    const instrumentationKey = ikey;
    const tags = createTagsFromSpan(span);
    const [properties, measurements] = createPropertiesFromSpan(span);
    switch (span.kind) {
        case api_1.SpanKind.CLIENT:
        case api_1.SpanKind.PRODUCER:
        case api_1.SpanKind.INTERNAL:
            name = "Microsoft.ApplicationInsights.RemoteDependency";
            baseType = "RemoteDependencyData";
            baseData = createDependencyData(span);
            break;
        case api_1.SpanKind.SERVER:
        case api_1.SpanKind.CONSUMER:
            name = "Microsoft.ApplicationInsights.Request";
            baseType = "RequestData";
            baseData = createRequestData(span);
            baseData.name = tags[index_js_1.KnownContextTagKeys.AiOperationName];
            break;
        default:
            // never
            api_1.diag.error(`Unsupported span kind ${span.kind}`);
            throw new Error(`Unsupported span kind ${span.kind}`);
    }
    let sampleRate = 100;
    if (span.attributes[applicationinsights_js_1.AzureMonitorSampleRate]) {
        sampleRate = Number(span.attributes[applicationinsights_js_1.AzureMonitorSampleRate]);
    }
    // Azure SDK
    if (span.attributes[azAttributes_js_1.AzNamespace]) {
        if (span.kind === api_1.SpanKind.INTERNAL) {
            baseData.type = `${applicationinsights_js_1.DependencyTypes.InProc} | ${span.attributes[azAttributes_js_1.AzNamespace]}`;
        }
        if (span.attributes[azAttributes_js_1.AzNamespace] === azAttributes_js_1.MicrosoftEventHub) {
            (0, eventhub_js_1.parseEventHubSpan)(span, baseData);
        }
    }
    // Truncate properties
    if (baseData.id) {
        baseData.id = baseData.id.substring(0, types_js_1.MaxPropertyLengths.NINE_BIT);
    }
    if (baseData.name) {
        baseData.name = baseData.name.substring(0, types_js_1.MaxPropertyLengths.TEN_BIT);
    }
    if (baseData.resultCode) {
        baseData.resultCode = String(baseData.resultCode).substring(0, types_js_1.MaxPropertyLengths.TEN_BIT);
    }
    if (baseData.data) {
        baseData.data = String(baseData.data).substring(0, types_js_1.MaxPropertyLengths.THIRTEEN_BIT);
    }
    if (baseData.type) {
        baseData.type = String(baseData.type).substring(0, types_js_1.MaxPropertyLengths.TEN_BIT);
    }
    if (baseData.target) {
        baseData.target = String(baseData.target).substring(0, types_js_1.MaxPropertyLengths.TEN_BIT);
    }
    if (baseData.properties) {
        for (const key of Object.keys(baseData.properties)) {
            baseData.properties[key] = baseData.properties[key].substring(0, types_js_1.MaxPropertyLengths.THIRTEEN_BIT);
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
/**
 * Span Events to Azure envelopes parsing.
 * @internal
 */
function spanEventsToEnvelopes(span, ikey) {
    const envelopes = [];
    if (span.events) {
        span.events.forEach((event) => {
            let baseType;
            const time = (0, common_js_1.hrTimeToDate)(event.time);
            let name = "";
            let baseData;
            const properties = createPropertiesFromSpanAttributes(event.attributes);
            const tags = (0, common_js_1.createTagsFromResource)(span.resource);
            tags[index_js_1.KnownContextTagKeys.AiOperationId] = span.spanContext().traceId;
            const spanId = span.spanContext().spanId;
            if (spanId) {
                tags[index_js_1.KnownContextTagKeys.AiOperationParentId] = spanId;
            }
            // Only generate exception telemetry for incoming requests
            if (event.name === "exception") {
                name = "Microsoft.ApplicationInsights.Exception";
                baseType = "ExceptionData";
                let typeName = "";
                let message = "Exception";
                let stack = "";
                let hasFullStack = false;
                if (event.attributes) {
                    typeName = String(event.attributes[semantic_conventions_1.SEMATTRS_EXCEPTION_TYPE]);
                    stack = String(event.attributes[semantic_conventions_1.SEMATTRS_EXCEPTION_STACKTRACE]);
                    if (stack) {
                        hasFullStack = true;
                    }
                    const exceptionMsg = event.attributes[semantic_conventions_1.SEMATTRS_EXCEPTION_MESSAGE];
                    if (exceptionMsg) {
                        message = String(exceptionMsg);
                    }
                    const escaped = event.attributes[semantic_conventions_1.SEMATTRS_EXCEPTION_ESCAPED];
                    if (escaped !== undefined) {
                        properties[semantic_conventions_1.SEMATTRS_EXCEPTION_ESCAPED] = String(escaped);
                    }
                }
                const exceptionDetails = {
                    typeName: typeName,
                    message: message,
                    stack: stack,
                    hasFullStack: hasFullStack,
                };
                const exceptionData = {
                    exceptions: [exceptionDetails],
                    version: 2,
                    properties: properties,
                };
                baseData = exceptionData;
            }
            else {
                name = "Microsoft.ApplicationInsights.Message";
                baseType = "MessageData";
                const messageData = {
                    message: event.name,
                    version: 2,
                    properties: properties,
                };
                baseData = messageData;
            }
            let sampleRate = 100;
            if (span.attributes[applicationinsights_js_1.AzureMonitorSampleRate]) {
                sampleRate = Number(span.attributes[applicationinsights_js_1.AzureMonitorSampleRate]);
            }
            // Truncate properties
            if (baseData.message) {
                baseData.message = String(baseData.message).substring(0, types_js_1.MaxPropertyLengths.FIFTEEN_BIT);
            }
            if (baseData.properties) {
                for (const key of Object.keys(baseData.properties)) {
                    baseData.properties[key] = baseData.properties[key].substring(0, types_js_1.MaxPropertyLengths.THIRTEEN_BIT);
                }
            }
            const env = {
                name: name,
                time: time,
                instrumentationKey: ikey,
                version: 1,
                sampleRate: sampleRate,
                data: {
                    baseType: baseType,
                    baseData: baseData,
                },
                tags: tags,
            };
            envelopes.push(env);
        });
    }
    return envelopes;
}
function getPeerIp(attributes) {
    if (attributes) {
        return attributes[semantic_conventions_1.ATTR_NETWORK_PEER_ADDRESS] || attributes[semantic_conventions_1.SEMATTRS_NET_PEER_IP];
    }
    return;
}
function getLocationIp(tags, attributes) {
    if (attributes) {
        const httpClientIp = getHttpClientIp(attributes);
        const netPeerIp = getPeerIp(attributes);
        if (httpClientIp) {
            tags[index_js_1.KnownContextTagKeys.AiLocationIp] = String(httpClientIp);
        }
        else if (netPeerIp) {
            tags[index_js_1.KnownContextTagKeys.AiLocationIp] = String(netPeerIp);
        }
    }
}
function getHttpClientIp(attributes) {
    if (attributes) {
        return attributes[semantic_conventions_1.ATTR_CLIENT_ADDRESS] || attributes[semantic_conventions_1.SEMATTRS_HTTP_CLIENT_IP];
    }
    return;
}
function getUserAgent(attributes) {
    if (attributes) {
        return attributes[semantic_conventions_1.ATTR_USER_AGENT_ORIGINAL] || attributes[semantic_conventions_1.SEMATTRS_HTTP_USER_AGENT];
    }
    return;
}
function getHttpUrl(attributes) {
    // Stable sem conv only supports populating url from `url.full`
    if (attributes) {
        return attributes[semantic_conventions_1.ATTR_URL_FULL] || attributes[semantic_conventions_1.SEMATTRS_HTTP_URL];
    }
    return;
}
function getHttpMethod(attributes) {
    if (attributes) {
        return attributes[semantic_conventions_1.ATTR_HTTP_REQUEST_METHOD] || attributes[semantic_conventions_1.SEMATTRS_HTTP_METHOD];
    }
    return;
}
function getHttpStatusCode(attributes) {
    if (attributes) {
        return attributes[semantic_conventions_1.ATTR_HTTP_RESPONSE_STATUS_CODE] || attributes[semantic_conventions_1.SEMATTRS_HTTP_STATUS_CODE];
    }
    return;
}
function getHttpScheme(attributes) {
    if (attributes) {
        return attributes[semantic_conventions_1.ATTR_URL_SCHEME] || attributes[semantic_conventions_1.SEMATTRS_HTTP_SCHEME];
    }
    return;
}
function getHttpTarget(attributes) {
    if (attributes) {
        if (attributes[semantic_conventions_1.ATTR_URL_PATH]) {
            return attributes[semantic_conventions_1.ATTR_URL_PATH];
        }
        if (attributes[semantic_conventions_1.ATTR_URL_QUERY]) {
            return attributes[semantic_conventions_1.ATTR_URL_QUERY];
        }
        return attributes[semantic_conventions_1.SEMATTRS_HTTP_TARGET];
    }
    return;
}
function getHttpHost(attributes) {
    if (attributes) {
        return attributes[semantic_conventions_1.ATTR_SERVER_ADDRESS] || attributes[semantic_conventions_1.SEMATTRS_HTTP_HOST];
    }
    return;
}
function getNetPeerName(attributes) {
    if (attributes) {
        return attributes[semantic_conventions_1.ATTR_CLIENT_ADDRESS] || attributes[semantic_conventions_1.SEMATTRS_NET_PEER_NAME];
    }
    return;
}
function getNetPeerPort(attributes) {
    if (attributes) {
        return (attributes[semantic_conventions_1.ATTR_CLIENT_PORT] ||
            attributes[semantic_conventions_1.ATTR_SERVER_PORT] ||
            attributes[semantic_conventions_1.SEMATTRS_NET_PEER_PORT]);
    }
    return;
}
//# sourceMappingURL=spanUtils.js.map