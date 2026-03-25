// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import os from "node:os";
import { SEMRESATTRS_DEVICE_ID, SEMRESATTRS_DEVICE_MODEL_NAME, SEMRESATTRS_SERVICE_VERSION, SEMRESATTRS_K8S_POD_NAME, SEMRESATTRS_SERVICE_INSTANCE_ID, DBSYSTEMVALUES_DB2, DBSYSTEMVALUES_DERBY, DBSYSTEMVALUES_MARIADB, DBSYSTEMVALUES_MSSQL, DBSYSTEMVALUES_ORACLE, DBSYSTEMVALUES_SQLITE, DBSYSTEMVALUES_OTHER_SQL, DBSYSTEMVALUES_HSQLDB, SEMATTRS_PEER_SERVICE, SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_NAMESPACE, SEMRESATTRS_K8S_DEPLOYMENT_NAME, SEMRESATTRS_K8S_REPLICASET_NAME, SEMRESATTRS_K8S_STATEFULSET_NAME, SEMRESATTRS_K8S_JOB_NAME, SEMRESATTRS_K8S_CRONJOB_NAME, SEMRESATTRS_K8S_DAEMONSET_NAME, ATTR_TELEMETRY_SDK_VERSION, ATTR_TELEMETRY_SDK_LANGUAGE, ATTR_TELEMETRY_SDK_NAME, DBSYSTEMVALUES_H2, } from "@opentelemetry/semantic-conventions";
import { experimentalOpenTelemetryValues } from "../types.js";
import { getInstance } from "../platform/index.js";
import { KnownContextTagKeys } from "../generated/index.js";
import { hrTimeToNanoseconds } from "@opentelemetry/core";
import { ENV_OPENTELEMETRY_RESOURCE_METRIC_DISABLED } from "../Declarations/Constants.js";
import { getHttpHost, getHttpMethod, getHttpScheme, getHttpTarget, getHttpUrl, getNetPeerName, getNetPeerPort, getPeerIp, } from "./spanUtils.js";
export function hrTimeToDate(hrTime) {
    return new Date(hrTimeToNanoseconds(hrTime) / 1000000);
}
export function createTagsFromResource(resource) {
    const context = getInstance();
    const tags = Object.assign({}, context.tags);
    if (resource && resource.attributes) {
        tags[KnownContextTagKeys.AiCloudRole] = getCloudRole(resource);
        tags[KnownContextTagKeys.AiCloudRoleInstance] = getCloudRoleInstance(resource);
        if (resource.attributes[SEMRESATTRS_DEVICE_ID]) {
            tags[KnownContextTagKeys.AiDeviceId] = String(resource.attributes[SEMRESATTRS_DEVICE_ID]);
        }
        if (resource.attributes[SEMRESATTRS_DEVICE_MODEL_NAME]) {
            tags[KnownContextTagKeys.AiDeviceModel] = String(resource.attributes[SEMRESATTRS_DEVICE_MODEL_NAME]);
        }
        if (resource.attributes[SEMRESATTRS_SERVICE_VERSION]) {
            tags[KnownContextTagKeys.AiApplicationVer] = String(resource.attributes[SEMRESATTRS_SERVICE_VERSION]);
        }
    }
    return tags;
}
function getCloudRole(resource) {
    let cloudRole = "";
    // Service attributes
    const serviceName = resource.attributes[SEMRESATTRS_SERVICE_NAME];
    const serviceNamespace = resource.attributes[SEMRESATTRS_SERVICE_NAMESPACE];
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
    const kubernetesDeploymentName = resource.attributes[SEMRESATTRS_K8S_DEPLOYMENT_NAME];
    if (kubernetesDeploymentName) {
        return String(kubernetesDeploymentName);
    }
    const kuberneteReplicasetName = resource.attributes[SEMRESATTRS_K8S_REPLICASET_NAME];
    if (kuberneteReplicasetName) {
        return String(kuberneteReplicasetName);
    }
    const kubernetesStatefulSetName = resource.attributes[SEMRESATTRS_K8S_STATEFULSET_NAME];
    if (kubernetesStatefulSetName) {
        return String(kubernetesStatefulSetName);
    }
    const kubernetesJobName = resource.attributes[SEMRESATTRS_K8S_JOB_NAME];
    if (kubernetesJobName) {
        return String(kubernetesJobName);
    }
    const kubernetesCronjobName = resource.attributes[SEMRESATTRS_K8S_CRONJOB_NAME];
    if (kubernetesCronjobName) {
        return String(kubernetesCronjobName);
    }
    const kubernetesDaemonsetName = resource.attributes[SEMRESATTRS_K8S_DAEMONSET_NAME];
    if (kubernetesDaemonsetName) {
        return String(kubernetesDaemonsetName);
    }
    return cloudRole;
}
function getCloudRoleInstance(resource) {
    // Kubernetes attributes should take precedence
    const kubernetesPodName = resource.attributes[SEMRESATTRS_K8S_POD_NAME];
    if (kubernetesPodName) {
        return String(kubernetesPodName);
    }
    // Service attributes
    const serviceInstanceId = resource.attributes[SEMRESATTRS_SERVICE_INSTANCE_ID];
    if (serviceInstanceId) {
        return String(serviceInstanceId);
    }
    // Default
    return os && os.hostname();
}
export function isSqlDB(dbSystem) {
    return (dbSystem === DBSYSTEMVALUES_DB2 ||
        dbSystem === DBSYSTEMVALUES_DERBY ||
        dbSystem === DBSYSTEMVALUES_MARIADB ||
        dbSystem === DBSYSTEMVALUES_MSSQL ||
        dbSystem === DBSYSTEMVALUES_ORACLE ||
        dbSystem === DBSYSTEMVALUES_SQLITE ||
        dbSystem === DBSYSTEMVALUES_OTHER_SQL ||
        dbSystem === DBSYSTEMVALUES_HSQLDB ||
        dbSystem === DBSYSTEMVALUES_H2);
}
export function getUrl(attributes) {
    if (!attributes) {
        return "";
    }
    const httpMethod = getHttpMethod(attributes);
    if (httpMethod) {
        const httpUrl = getHttpUrl(attributes);
        if (httpUrl) {
            return String(httpUrl);
        }
        else {
            const httpScheme = getHttpScheme(attributes);
            const httpTarget = getHttpTarget(attributes);
            if (httpScheme && httpTarget) {
                const httpHost = getHttpHost(attributes);
                if (httpHost) {
                    return `${httpScheme}://${httpHost}${httpTarget}`;
                }
                else {
                    const netPeerPort = getNetPeerPort(attributes);
                    if (netPeerPort) {
                        const netPeerName = getNetPeerName(attributes);
                        if (netPeerName) {
                            return `${httpScheme}://${netPeerName}:${netPeerPort}${httpTarget}`;
                        }
                        else {
                            const netPeerIp = getPeerIp(attributes);
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
export function getDependencyTarget(attributes) {
    if (!attributes) {
        return "";
    }
    const peerService = attributes[SEMATTRS_PEER_SERVICE];
    const httpHost = getHttpHost(attributes);
    const httpUrl = getHttpUrl(attributes);
    const netPeerName = getNetPeerName(attributes);
    const netPeerIp = getPeerIp(attributes);
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
export function createResourceMetricEnvelope(resource, instrumentationKey) {
    if (resource && resource.attributes) {
        const tags = createTagsFromResource(resource);
        const resourceAttributes = {};
        for (const key of Object.keys(resource.attributes)) {
            // Avoid duplication ignoring fields already mapped.
            if (!(key.startsWith("_MS.") ||
                key === ATTR_TELEMETRY_SDK_VERSION ||
                key === ATTR_TELEMETRY_SDK_LANGUAGE ||
                key === ATTR_TELEMETRY_SDK_NAME)) {
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
export function serializeAttribute(value) {
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
export function shouldCreateResourceMetric() {
    var _a;
    return !(((_a = process.env[ENV_OPENTELEMETRY_RESOURCE_METRIC_DISABLED]) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === "true");
}
export function isSyntheticSource(attributes) {
    return !!attributes[experimentalOpenTelemetryValues.SYNTHETIC_TYPE];
}
//# sourceMappingURL=common.js.map