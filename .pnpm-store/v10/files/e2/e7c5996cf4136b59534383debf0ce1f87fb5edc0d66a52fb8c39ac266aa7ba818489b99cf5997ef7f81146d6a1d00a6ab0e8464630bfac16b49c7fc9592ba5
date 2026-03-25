// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { hrTimeToMilliseconds } from "@opentelemetry/core";
import { diag, SpanKind, SpanStatusCode } from "@opentelemetry/api";
import { DBSYSTEMVALUES_MONGODB, DBSYSTEMVALUES_MYSQL, DBSYSTEMVALUES_POSTGRESQL, DBSYSTEMVALUES_REDIS, SEMATTRS_DB_NAME, SEMATTRS_DB_OPERATION, SEMATTRS_DB_STATEMENT, SEMATTRS_DB_SYSTEM, SEMATTRS_ENDUSER_ID, SEMATTRS_EXCEPTION_ESCAPED, SEMATTRS_EXCEPTION_MESSAGE, SEMATTRS_EXCEPTION_STACKTRACE, SEMATTRS_EXCEPTION_TYPE, SEMATTRS_HTTP_CLIENT_IP, SEMATTRS_HTTP_METHOD, SEMATTRS_HTTP_STATUS_CODE, SEMATTRS_HTTP_URL, SEMATTRS_HTTP_USER_AGENT, SEMATTRS_NET_PEER_IP, SEMATTRS_RPC_GRPC_STATUS_CODE, SEMATTRS_RPC_SYSTEM, ATTR_HTTP_REQUEST_METHOD, ATTR_CLIENT_ADDRESS, ATTR_NETWORK_PEER_ADDRESS, ATTR_USER_AGENT_ORIGINAL, ATTR_HTTP_ROUTE, ATTR_URL_FULL, ATTR_HTTP_RESPONSE_STATUS_CODE, SEMATTRS_HTTP_SCHEME, ATTR_URL_SCHEME, SEMATTRS_HTTP_TARGET, ATTR_URL_PATH, ATTR_URL_QUERY, ATTR_SERVER_ADDRESS, SEMATTRS_HTTP_HOST, SEMATTRS_NET_PEER_NAME, ATTR_CLIENT_PORT, ATTR_SERVER_PORT, SEMATTRS_NET_PEER_PORT, } from "@opentelemetry/semantic-conventions";
import { createTagsFromResource, getDependencyTarget, getUrl, hrTimeToDate, isSqlDB, isSyntheticSource, serializeAttribute, } from "./common.js";
import { httpSemanticValues, internalMicrosoftAttributes, legacySemanticValues, MaxPropertyLengths, } from "../types.js";
import { parseEventHubSpan } from "./eventhub.js";
import { AzureMonitorSampleRate, DependencyTypes, MS_LINKS, } from "./constants/applicationinsights.js";
import { AzNamespace, MicrosoftEventHub } from "./constants/span/azAttributes.js";
import { KnownContextTagKeys } from "../generated/index.js";
import { msToTimeSpan } from "./breezeUtils.js";
function createTagsFromSpan(span) {
    var _a;
    const tags = createTagsFromResource(span.resource);
    tags[KnownContextTagKeys.AiOperationId] = span.spanContext().traceId;
    if ((_a = span.parentSpanContext) === null || _a === void 0 ? void 0 : _a.spanId) {
        tags[KnownContextTagKeys.AiOperationParentId] = span.parentSpanContext.spanId;
    }
    const endUserId = span.attributes[SEMATTRS_ENDUSER_ID];
    if (endUserId) {
        tags[KnownContextTagKeys.AiUserId] = String(endUserId);
    }
    const httpUserAgent = getUserAgent(span.attributes);
    if (httpUserAgent) {
        // TODO: Not exposed in Swagger, need to update def
        tags["ai.user.userAgent"] = String(httpUserAgent);
    }
    if (isSyntheticSource(span.attributes)) {
        tags[KnownContextTagKeys.AiOperationSyntheticSource] = "True";
    }
    if (span.kind === SpanKind.SERVER) {
        const httpMethod = getHttpMethod(span.attributes);
        getLocationIp(tags, span.attributes);
        if (httpMethod) {
            const httpRoute = span.attributes[ATTR_HTTP_ROUTE];
            const httpUrl = getHttpUrl(span.attributes);
            tags[KnownContextTagKeys.AiOperationName] = span.name; // Default
            if (httpRoute) {
                // AiOperationName max length is 1024
                // https://github.com/MohanGsk/ApplicationInsights-Home/blob/master/EndpointSpecs/Schemas/Bond/ContextTagKeys.bond
                tags[KnownContextTagKeys.AiOperationName] = String(`${httpMethod} ${httpRoute}`).substring(0, MaxPropertyLengths.TEN_BIT);
            }
            else if (httpUrl) {
                try {
                    const url = new URL(String(httpUrl));
                    tags[KnownContextTagKeys.AiOperationName] = String(`${httpMethod} ${url.pathname}`).substring(0, MaxPropertyLengths.TEN_BIT);
                }
                catch (_b) {
                    /* no-op */
                }
            }
        }
        else {
            tags[KnownContextTagKeys.AiOperationName] = span.name;
        }
    }
    else {
        if (span.attributes[KnownContextTagKeys.AiOperationName]) {
            tags[KnownContextTagKeys.AiOperationName] = span.attributes[KnownContextTagKeys.AiOperationName];
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
            !((key.startsWith("_MS.") && !internalMicrosoftAttributes.includes(key)) ||
                key.startsWith("microsoft.") ||
                legacySemanticValues.includes(key) ||
                httpSemanticValues.includes(key) ||
                key === KnownContextTagKeys.AiOperationName)) {
                properties[key] = serializeAttribute(attributes[key]);
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
        properties[MS_LINKS] = JSON.stringify(links);
    }
    return [properties, measurements];
}
function createDependencyData(span) {
    var _a;
    const remoteDependencyData = {
        name: span.name, // Default
        id: `${span.spanContext().spanId}`,
        success: ((_a = span.status) === null || _a === void 0 ? void 0 : _a.code) !== SpanStatusCode.ERROR,
        resultCode: "0",
        type: "Dependency",
        duration: msToTimeSpan(hrTimeToMilliseconds(span.duration)),
        version: 2,
    };
    if (span.kind === SpanKind.PRODUCER) {
        remoteDependencyData.type = DependencyTypes.QueueMessage;
    }
    if (span.kind === SpanKind.INTERNAL && span.parentSpanContext) {
        remoteDependencyData.type = DependencyTypes.InProc;
    }
    const httpMethod = getHttpMethod(span.attributes);
    const dbSystem = span.attributes[SEMATTRS_DB_SYSTEM];
    const rpcSystem = span.attributes[SEMATTRS_RPC_SYSTEM];
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
        remoteDependencyData.type = DependencyTypes.Http;
        remoteDependencyData.data = getUrl(span.attributes);
        const httpStatusCode = getHttpStatusCode(span.attributes);
        if (httpStatusCode) {
            remoteDependencyData.resultCode = String(httpStatusCode);
        }
        let target = getDependencyTarget(span.attributes);
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
        if (String(dbSystem) === DBSYSTEMVALUES_MYSQL) {
            remoteDependencyData.type = "mysql";
        }
        else if (String(dbSystem) === DBSYSTEMVALUES_POSTGRESQL) {
            remoteDependencyData.type = "postgresql";
        }
        else if (String(dbSystem) === DBSYSTEMVALUES_MONGODB) {
            remoteDependencyData.type = "mongodb";
        }
        else if (String(dbSystem) === DBSYSTEMVALUES_REDIS) {
            remoteDependencyData.type = "redis";
        }
        else if (isSqlDB(String(dbSystem))) {
            remoteDependencyData.type = "SQL";
        }
        else {
            remoteDependencyData.type = String(dbSystem);
        }
        const dbStatement = span.attributes[SEMATTRS_DB_STATEMENT];
        const dbOperation = span.attributes[SEMATTRS_DB_OPERATION];
        if (dbStatement) {
            remoteDependencyData.data = String(dbStatement);
        }
        else if (dbOperation) {
            remoteDependencyData.data = String(dbOperation);
        }
        const target = getDependencyTarget(span.attributes);
        const dbName = span.attributes[SEMATTRS_DB_NAME];
        if (target) {
            remoteDependencyData.target = dbName ? `${target}|${dbName}` : `${target}`;
        }
        else {
            remoteDependencyData.target = dbName ? `${dbName}` : `${dbSystem}`;
        }
    }
    // grpc Dependency
    else if (rpcSystem) {
        if (rpcSystem === DependencyTypes.Wcf) {
            remoteDependencyData.type = DependencyTypes.Wcf;
        }
        else {
            remoteDependencyData.type = DependencyTypes.Grpc;
        }
        const grpcStatusCode = span.attributes[SEMATTRS_RPC_GRPC_STATUS_CODE];
        if (grpcStatusCode) {
            remoteDependencyData.resultCode = String(grpcStatusCode);
        }
        const target = getDependencyTarget(span.attributes);
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
        success: span.status.code !== SpanStatusCode.ERROR &&
            (Number(getHttpStatusCode(span.attributes)) || 0) < 400,
        responseCode: "0",
        duration: msToTimeSpan(hrTimeToMilliseconds(span.duration)),
        version: 2,
        source: undefined,
    };
    const httpMethod = getHttpMethod(span.attributes);
    const grpcStatusCode = span.attributes[SEMATTRS_RPC_GRPC_STATUS_CODE];
    if (httpMethod) {
        requestData.url = getUrl(span.attributes);
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
export function readableSpanToEnvelope(span, ikey) {
    let name;
    let baseType;
    let baseData;
    const time = hrTimeToDate(span.startTime);
    const instrumentationKey = ikey;
    const tags = createTagsFromSpan(span);
    const [properties, measurements] = createPropertiesFromSpan(span);
    switch (span.kind) {
        case SpanKind.CLIENT:
        case SpanKind.PRODUCER:
        case SpanKind.INTERNAL:
            name = "Microsoft.ApplicationInsights.RemoteDependency";
            baseType = "RemoteDependencyData";
            baseData = createDependencyData(span);
            break;
        case SpanKind.SERVER:
        case SpanKind.CONSUMER:
            name = "Microsoft.ApplicationInsights.Request";
            baseType = "RequestData";
            baseData = createRequestData(span);
            baseData.name = tags[KnownContextTagKeys.AiOperationName];
            break;
        default:
            // never
            diag.error(`Unsupported span kind ${span.kind}`);
            throw new Error(`Unsupported span kind ${span.kind}`);
    }
    let sampleRate = 100;
    if (span.attributes[AzureMonitorSampleRate]) {
        sampleRate = Number(span.attributes[AzureMonitorSampleRate]);
    }
    // Azure SDK
    if (span.attributes[AzNamespace]) {
        if (span.kind === SpanKind.INTERNAL) {
            baseData.type = `${DependencyTypes.InProc} | ${span.attributes[AzNamespace]}`;
        }
        if (span.attributes[AzNamespace] === MicrosoftEventHub) {
            parseEventHubSpan(span, baseData);
        }
    }
    // Truncate properties
    if (baseData.id) {
        baseData.id = baseData.id.substring(0, MaxPropertyLengths.NINE_BIT);
    }
    if (baseData.name) {
        baseData.name = baseData.name.substring(0, MaxPropertyLengths.TEN_BIT);
    }
    if (baseData.resultCode) {
        baseData.resultCode = String(baseData.resultCode).substring(0, MaxPropertyLengths.TEN_BIT);
    }
    if (baseData.data) {
        baseData.data = String(baseData.data).substring(0, MaxPropertyLengths.THIRTEEN_BIT);
    }
    if (baseData.type) {
        baseData.type = String(baseData.type).substring(0, MaxPropertyLengths.TEN_BIT);
    }
    if (baseData.target) {
        baseData.target = String(baseData.target).substring(0, MaxPropertyLengths.TEN_BIT);
    }
    if (baseData.properties) {
        for (const key of Object.keys(baseData.properties)) {
            baseData.properties[key] = baseData.properties[key].substring(0, MaxPropertyLengths.THIRTEEN_BIT);
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
export function spanEventsToEnvelopes(span, ikey) {
    const envelopes = [];
    if (span.events) {
        span.events.forEach((event) => {
            let baseType;
            const time = hrTimeToDate(event.time);
            let name = "";
            let baseData;
            const properties = createPropertiesFromSpanAttributes(event.attributes);
            const tags = createTagsFromResource(span.resource);
            tags[KnownContextTagKeys.AiOperationId] = span.spanContext().traceId;
            const spanId = span.spanContext().spanId;
            if (spanId) {
                tags[KnownContextTagKeys.AiOperationParentId] = spanId;
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
                    typeName = String(event.attributes[SEMATTRS_EXCEPTION_TYPE]);
                    stack = String(event.attributes[SEMATTRS_EXCEPTION_STACKTRACE]);
                    if (stack) {
                        hasFullStack = true;
                    }
                    const exceptionMsg = event.attributes[SEMATTRS_EXCEPTION_MESSAGE];
                    if (exceptionMsg) {
                        message = String(exceptionMsg);
                    }
                    const escaped = event.attributes[SEMATTRS_EXCEPTION_ESCAPED];
                    if (escaped !== undefined) {
                        properties[SEMATTRS_EXCEPTION_ESCAPED] = String(escaped);
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
            if (span.attributes[AzureMonitorSampleRate]) {
                sampleRate = Number(span.attributes[AzureMonitorSampleRate]);
            }
            // Truncate properties
            if (baseData.message) {
                baseData.message = String(baseData.message).substring(0, MaxPropertyLengths.FIFTEEN_BIT);
            }
            if (baseData.properties) {
                for (const key of Object.keys(baseData.properties)) {
                    baseData.properties[key] = baseData.properties[key].substring(0, MaxPropertyLengths.THIRTEEN_BIT);
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
export function getPeerIp(attributes) {
    if (attributes) {
        return attributes[ATTR_NETWORK_PEER_ADDRESS] || attributes[SEMATTRS_NET_PEER_IP];
    }
    return;
}
export function getLocationIp(tags, attributes) {
    if (attributes) {
        const httpClientIp = getHttpClientIp(attributes);
        const netPeerIp = getPeerIp(attributes);
        if (httpClientIp) {
            tags[KnownContextTagKeys.AiLocationIp] = String(httpClientIp);
        }
        else if (netPeerIp) {
            tags[KnownContextTagKeys.AiLocationIp] = String(netPeerIp);
        }
    }
}
export function getHttpClientIp(attributes) {
    if (attributes) {
        return attributes[ATTR_CLIENT_ADDRESS] || attributes[SEMATTRS_HTTP_CLIENT_IP];
    }
    return;
}
export function getUserAgent(attributes) {
    if (attributes) {
        return attributes[ATTR_USER_AGENT_ORIGINAL] || attributes[SEMATTRS_HTTP_USER_AGENT];
    }
    return;
}
export function getHttpUrl(attributes) {
    // Stable sem conv only supports populating url from `url.full`
    if (attributes) {
        return attributes[ATTR_URL_FULL] || attributes[SEMATTRS_HTTP_URL];
    }
    return;
}
export function getHttpMethod(attributes) {
    if (attributes) {
        return attributes[ATTR_HTTP_REQUEST_METHOD] || attributes[SEMATTRS_HTTP_METHOD];
    }
    return;
}
export function getHttpStatusCode(attributes) {
    if (attributes) {
        return attributes[ATTR_HTTP_RESPONSE_STATUS_CODE] || attributes[SEMATTRS_HTTP_STATUS_CODE];
    }
    return;
}
export function getHttpScheme(attributes) {
    if (attributes) {
        return attributes[ATTR_URL_SCHEME] || attributes[SEMATTRS_HTTP_SCHEME];
    }
    return;
}
export function getHttpTarget(attributes) {
    if (attributes) {
        if (attributes[ATTR_URL_PATH]) {
            return attributes[ATTR_URL_PATH];
        }
        if (attributes[ATTR_URL_QUERY]) {
            return attributes[ATTR_URL_QUERY];
        }
        return attributes[SEMATTRS_HTTP_TARGET];
    }
    return;
}
export function getHttpHost(attributes) {
    if (attributes) {
        return attributes[ATTR_SERVER_ADDRESS] || attributes[SEMATTRS_HTTP_HOST];
    }
    return;
}
export function getNetPeerName(attributes) {
    if (attributes) {
        return attributes[ATTR_CLIENT_ADDRESS] || attributes[SEMATTRS_NET_PEER_NAME];
    }
    return;
}
export function getNetPeerPort(attributes) {
    if (attributes) {
        return (attributes[ATTR_CLIENT_PORT] ||
            attributes[ATTR_SERVER_PORT] ||
            attributes[SEMATTRS_NET_PEER_PORT]);
    }
    return;
}
//# sourceMappingURL=spanUtils.js.map