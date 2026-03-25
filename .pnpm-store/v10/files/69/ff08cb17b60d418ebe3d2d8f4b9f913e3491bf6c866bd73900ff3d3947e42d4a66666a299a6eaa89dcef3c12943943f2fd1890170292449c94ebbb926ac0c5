"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatsbeatFeatureType = exports.EU_ENDPOINTS = exports.EU_CONNECTION_STRING = exports.NON_EU_CONNECTION_STRING = exports.AIMS_FORMAT = exports.AIMS_API_VERSION = exports.AIMS_URI = exports.StatsbeatCounter = exports.AttachTypeName = exports.StatsbeatResourceProvider = exports.MAX_STATSBEAT_FAILURES = exports.AZURE_MONITOR_AUTO_ATTACH = exports.STATSBEAT_LANGUAGE = exports.NetworkStatsbeat = void 0;
exports.isStatsbeatShutdownStatus = isStatsbeatShutdownStatus;
class NetworkStatsbeat {
    constructor(endpoint, host) {
        this.endpoint = endpoint;
        this.host = host;
        this.totalRequestCount = 0;
        this.totalSuccessfulRequestCount = 0;
        this.totalReadFailureCount = 0;
        this.totalWriteFailureCount = 0;
        this.totalFailedRequestCount = [];
        this.retryCount = [];
        this.exceptionCount = [];
        this.throttleCount = [];
        this.intervalRequestExecutionTime = 0;
        this.lastIntervalRequestExecutionTime = 0;
        this.lastTime = +new Date();
        this.lastRequestCount = 0;
        this.averageRequestExecutionTime = 0;
    }
}
exports.NetworkStatsbeat = NetworkStatsbeat;
exports.STATSBEAT_LANGUAGE = "node";
exports.AZURE_MONITOR_AUTO_ATTACH = "AZURE_MONITOR_AUTO_ATTACH";
exports.MAX_STATSBEAT_FAILURES = 3;
exports.StatsbeatResourceProvider = {
    appsvc: "appsvc",
    aks: "aks",
    functions: "functions",
    vm: "vm",
    unknown: "unknown",
};
var AttachTypeName;
(function (AttachTypeName) {
    AttachTypeName["INTEGRATED_AUTO"] = "IntegratedAuto";
    AttachTypeName["MANUAL"] = "Manual";
})(AttachTypeName || (exports.AttachTypeName = AttachTypeName = {}));
var StatsbeatCounter;
(function (StatsbeatCounter) {
    StatsbeatCounter["SUCCESS_COUNT"] = "Request_Success_Count";
    StatsbeatCounter["FAILURE_COUNT"] = "Request_Failure_Count";
    StatsbeatCounter["RETRY_COUNT"] = "Retry_Count";
    StatsbeatCounter["THROTTLE_COUNT"] = "Throttle_Count";
    StatsbeatCounter["EXCEPTION_COUNT"] = "Exception_Count";
    StatsbeatCounter["AVERAGE_DURATION"] = "Request_Duration";
    StatsbeatCounter["READ_FAILURE_COUNT"] = "Read_Failure_Count";
    StatsbeatCounter["WRITE_FAILURE_COUNT"] = "Write_Failure_Count";
    StatsbeatCounter["ATTACH"] = "Attach";
    StatsbeatCounter["FEATURE"] = "Feature";
})(StatsbeatCounter || (exports.StatsbeatCounter = StatsbeatCounter = {}));
exports.AIMS_URI = "http://169.254.169.254/metadata/instance/compute";
exports.AIMS_API_VERSION = "api-version=2017-12-01";
exports.AIMS_FORMAT = "format=json";
exports.NON_EU_CONNECTION_STRING = "InstrumentationKey=c4a29126-a7cb-47e5-b348-11414998b11e;IngestionEndpoint=https://westus-0.in.applicationinsights.azure.com";
exports.EU_CONNECTION_STRING = "InstrumentationKey=7dc56bab-3c0c-4e9f-9ebb-d1acadee8d0f;IngestionEndpoint=https://westeurope-5.in.applicationinsights.azure.com";
exports.EU_ENDPOINTS = [
    "westeurope",
    "northeurope",
    "francecentral",
    "francesouth",
    "germanywestcentral",
    "norwayeast",
    "norwaywest",
    "swedencentral",
    "switzerlandnorth",
    "switzerlandwest",
    "uksouth",
    "ukwest",
];
var StatsbeatFeatureType;
(function (StatsbeatFeatureType) {
    StatsbeatFeatureType[StatsbeatFeatureType["FEATURE"] = 0] = "FEATURE";
    StatsbeatFeatureType[StatsbeatFeatureType["INSTRUMENTATION"] = 1] = "INSTRUMENTATION";
})(StatsbeatFeatureType || (exports.StatsbeatFeatureType = StatsbeatFeatureType = {}));
/**
 * Status codes indicating that we should shutdown statsbeat
 * @internal
 */
function isStatsbeatShutdownStatus(statusCode) {
    return (statusCode === 401 || // Unauthorized
        statusCode === 403 || // Forbidden
        statusCode === 503 // Server Unavailable
    );
}
//# sourceMappingURL=types.js.map