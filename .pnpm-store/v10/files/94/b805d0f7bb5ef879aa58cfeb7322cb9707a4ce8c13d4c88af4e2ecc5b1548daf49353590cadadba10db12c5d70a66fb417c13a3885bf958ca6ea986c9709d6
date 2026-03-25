"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.hrTimeToDate = hrTimeToDate;
exports.createTagsFromResource = createTagsFromResource;
exports.isSqlDB = isSqlDB;
exports.getUrl = getUrl;
exports.getDependencyTarget = getDependencyTarget;
exports.createResourceMetricEnvelope = createResourceMetricEnvelope;
exports.serializeAttribute = serializeAttribute;
exports.shouldCreateResourceMetric = shouldCreateResourceMetric;
exports.isSyntheticSource = isSyntheticSource;
const tslib_1 = require("tslib");
const node_os_1 = tslib_1.__importDefault(require("node:os"));
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const types_js_1 = require("../types.js");
const index_js_1 = require("../platform/index.js");
const index_js_2 = require("../generated/index.js");
const core_1 = require("@opentelemetry/core");
const Constants_js_1 = require("../Declarations/Constants.js");
const spanUtils_js_1 = require("./spanUtils.js");
function hrTimeToDate(hrTime) {
    return new Date((0, core_1.hrTimeToNanoseconds)(hrTime) / 1000000);
}
function createTagsFromResource(resource) {
    const context = (0, index_js_1.getInstance)();
    const tags = Object.assign({}, context.tags);
    if (resource && resource.attributes) {
        tags[index_js_2.KnownContextTagKeys.AiCloudRole] = getCloudRole(resource);
        tags[index_js_2.KnownContextTagKeys.AiCloudRoleInstance] = getCloudRoleInstance(resource);
        if (resource.attributes[semantic_conventions_1.SEMRESATTRS_DEVICE_ID]) {
            tags[index_js_2.KnownContextTagKeys.AiDeviceId] = String(resource.attributes[semantic_conventions_1.SEMRESATTRS_DEVICE_ID]);
        }
        if (resource.attributes[semantic_conventions_1.SEMRESATTRS_DEVICE_MODEL_NAME]) {
            tags[index_js_2.KnownContextTagKeys.AiDeviceModel] = String(resource.attributes[semantic_conventions_1.SEMRESATTRS_DEVICE_MODEL_NAME]);
        }
        if (resource.attributes[semantic_conventions_1.SEMRESATTRS_SERVICE_VERSION]) {
            tags[index_js_2.KnownContextTagKeys.AiApplicationVer] = String(resource.attributes[semantic_conventions_1.SEMRESATTRS_SERVICE_VERSION]);
        }
    }
    return tags;
}
function getCloudRole(resource) {
    let cloudRole = "";
    // Service attributes
    const serviceName = resource.attributes[semantic_conventions_1.SEMRESATTRS_SERVICE_NAME];
    const serviceNamespace = resource.attributes[semantic_conventions_1.SEMRESATTRS_SERVICE_NAMESPACE];
    if (serviceName) {
        // Custom Service name provided by customer is highest precedence
        if (!String(serviceName).startsWith("unknown_service")) {
            if (serviceNamespace) {
                return `${serviceNamespace}.${serviceName}`;
            }
            else {
                return String(serviceName);
            }
        }
        else {
            // Service attributes will be only used if K8S attributes are not present
            if (serviceNamespace) {
                cloudRole = `${serviceNamespace}.${serviceName}`;
            }
            else {
                cloudRole = String(serviceName);
            }
        }
    }
    // Kubernetes attributes should take precedence
    const kubernetesDeploymentName = resource.attributes[semantic_conventions_1.SEMRESATTRS_K8S_DEPLOYMENT_NAME];
    if (kubernetesDeploymentName) {
        return String(kubernetesDeploymentName);
    }
    const kuberneteReplicasetName = resource.attributes[semantic_conventions_1.SEMRESATTRS_K8S_REPLICASET_NAME];
    if (kuberneteReplicasetName) {
        return String(kuberneteReplicasetName);
    }
    const kubernetesStatefulSetName = resource.attributes[semantic_conventions_1.SEMRESATTRS_K8S_STATEFULSET_NAME];
    if (kubernetesStatefulSetName) {
        return String(kubernetesStatefulSetName);
    }
    const kubernetesJobName = resource.attributes[semantic_conventions_1.SEMRESATTRS_K8S_JOB_NAME];
    if (kubernetesJobName) {
        return String(kubernetesJobName);
    }
    const kubernetesCronjobName = resource.attributes[semantic_conventions_1.SEMRESATTRS_K8S_CRONJOB_NAME];
    if (kubernetesCronjobName) {
        return String(kubernetesCronjobName);
    }
    const kubernetesDaemonsetName = resource.attributes[semantic_conventions_1.SEMRESATTRS_K8S_DAEMONSET_NAME];
    if (kubernetesDaemonsetName) {
        return String(kubernetesDaemonsetName);
    }
    return cloudRole;
}
function getCloudRoleInstance(resource) {
    // Kubernetes attributes should take precedence
    const kubernetesPodName = resource.attributes[semantic_conventions_1.SEMRESATTRS_K8S_POD_NAME];
    if (kubernetesPodName) {
        return String(kubernetesPodName);
    }
    // Service attributes
    const serviceInstanceId = resource.attributes[semantic_conventions_1.SEMRESATTRS_SERVICE_INSTANCE_ID];
    if (serviceInstanceId) {
        return String(serviceInstanceId);
    }
    // Default
    return node_os_1.default && node_os_1.default.hostname();
}
function isSqlDB(dbSystem) {
    return (dbSystem === semantic_conventions_1.DBSYSTEMVALUES_DB2 ||
        dbSystem === semantic_conventions_1.DBSYSTEMVALUES_DERBY ||
        dbSystem === semantic_conventions_1.DBSYSTEMVALUES_MARIADB ||
        dbSystem === semantic_conventions_1.DBSYSTEMVALUES_MSSQL ||
        dbSystem === semantic_conventions_1.DBSYSTEMVALUES_ORACLE ||
        dbSystem === semantic_conventions_1.DBSYSTEMVALUES_SQLITE ||
        dbSystem === semantic_conventions_1.DBSYSTEMVALUES_OTHER_SQL ||
        dbSystem === semantic_conventions_1.DBSYSTEMVALUES_HSQLDB ||
        dbSystem === semantic_conventions_1.DBSYSTEMVALUES_H2);
}
function getUrl(attributes) {
    if (!attributes) {
        return "";
    }
    const httpMethod = (0, spanUtils_js_1.getHttpMethod)(attributes);
    if (httpMethod) {
        const httpUrl = (0, spanUtils_js_1.getHttpUrl)(attributes);
        if (httpUrl) {
            return String(httpUrl);
        }
        else {
            const httpScheme = (0, spanUtils_js_1.getHttpScheme)(attributes);
            const httpTarget = (0, spanUtils_js_1.getHttpTarget)(attributes);
            if (httpScheme && httpTarget) {
                const httpHost = (0, spanUtils_js_1.getHttpHost)(attributes);
                if (httpHost) {
                    return `${httpScheme}://${httpHost}${httpTarget}`;
                }
                else {
                    const netPeerPort = (0, spanUtils_js_1.getNetPeerPort)(attributes);
                    if (netPeerPort) {
                        const netPeerName = (0, spanUtils_js_1.getNetPeerName)(attributes);
                        if (netPeerName) {
                            return `${httpScheme}://${netPeerName}:${netPeerPort}${httpTarget}`;
                        }
                        else {
                            const netPeerIp = (0, spanUtils_js_1.getPeerIp)(attributes);
                            if (netPeerIp) {
                                return `${httpScheme}://${netPeerIp}:${netPeerPort}${httpTarget}`;
                            }
                        }
                    }
                }
            }
        }
    }
    return "";
}
function getDependencyTarget(attributes) {
    if (!attributes) {
        return "";
    }
    const peerService = attributes[semantic_conventions_1.SEMATTRS_PEER_SERVICE];
    const httpHost = (0, spanUtils_js_1.getHttpHost)(attributes);
    const httpUrl = (0, spanUtils_js_1.getHttpUrl)(attributes);
    const netPeerName = (0, spanUtils_js_1.getNetPeerName)(attributes);
    const netPeerIp = (0, spanUtils_js_1.getPeerIp)(attributes);
    if (peerService) {
        return String(peerService);
    }
    else if (httpHost) {
        return String(httpHost);
    }
    else if (httpUrl) {
        return String(httpUrl);
    }
    else if (netPeerName) {
        return String(netPeerName);
    }
    else if (netPeerIp) {
        return String(netPeerIp);
    }
    return "";
}
function createResourceMetricEnvelope(resource, instrumentationKey) {
    if (resource && resource.attributes) {
        const tags = createTagsFromResource(resource);
        const resourceAttributes = {};
        for (const key of Object.keys(resource.attributes)) {
            // Avoid duplication ignoring fields already mapped.
            if (!(key.startsWith("_MS.") ||
                key === semantic_conventions_1.ATTR_TELEMETRY_SDK_VERSION ||
                key === semantic_conventions_1.ATTR_TELEMETRY_SDK_LANGUAGE ||
                key === semantic_conventions_1.ATTR_TELEMETRY_SDK_NAME)) {
                resourceAttributes[key] = resource.attributes[key];
            }
        }
        // Only send event when resource attributes are available
        if (Object.keys(resourceAttributes).length > 0) {
            const baseData = {
                version: 2,
                metrics: [{ name: "_OTELRESOURCE_", value: 1 }],
                properties: resourceAttributes,
            };
            const envelope = {
                name: "Microsoft.ApplicationInsights.Metric",
                time: new Date(),
                sampleRate: 100, // Metrics are never sampled
                instrumentationKey: instrumentationKey,
                version: 1,
                data: {
                    baseType: "MetricData",
                    baseData: baseData,
                },
                tags: tags,
            };
            return envelope;
        }
    }
    return;
}
function serializeAttribute(value) {
    if (typeof value === "object") {
        if (value instanceof Error) {
            try {
                return JSON.stringify(value, Object.getOwnPropertyNames(value));
            }
            catch (err) {
                // Failed to serialize, return string cast
                return String(value);
            }
        }
        else if (value instanceof Uint8Array) {
            return String(value);
        }
        else {
            try {
                return JSON.stringify(value);
            }
            catch (err) {
                // Failed to serialize, return string cast
                return String(value);
            }
        }
    }
    // Return scalar and undefined values
    return String(value);
}
function shouldCreateResourceMetric() {
    var _a;
    return !(((_a = process.env[Constants_js_1.ENV_OPENTELEMETRY_RESOURCE_METRIC_DISABLED]) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === "true");
}
function isSyntheticSource(attributes) {
    return !!attributes[types_js_1.experimentalOpenTelemetryValues.SYNTHETIC_TYPE];
}
//# sourceMappingURL=common.js.map