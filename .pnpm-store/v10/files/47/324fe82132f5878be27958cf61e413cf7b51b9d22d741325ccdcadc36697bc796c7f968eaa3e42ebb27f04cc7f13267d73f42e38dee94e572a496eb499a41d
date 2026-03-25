"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.internalMicrosoftAttributes = exports.httpSemanticValues = exports.experimentalOpenTelemetryValues = exports.legacySemanticValues = exports.MaxPropertyLengths = exports.BreezePerformanceCounterNames = exports.OTelPerformanceCounterNames = void 0;
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
/**
 * Performance Counter OpenTelemetry compliant names.
 * @internal
 */
var OTelPerformanceCounterNames;
(function (OTelPerformanceCounterNames) {
    OTelPerformanceCounterNames["PRIVATE_BYTES"] = "Private_Bytes";
    OTelPerformanceCounterNames["AVAILABLE_BYTES"] = "Available_Bytes";
    OTelPerformanceCounterNames["PROCESSOR_TIME"] = "Processor_Time";
    OTelPerformanceCounterNames["PROCESS_TIME_STANDARD"] = "Process_Time_Standard";
    OTelPerformanceCounterNames["REQUEST_RATE"] = "Request_Rate";
    OTelPerformanceCounterNames["REQUEST_DURATION"] = "Request_Execution_Time";
    OTelPerformanceCounterNames["PROCESS_TIME_NORMALIZED"] = "Process_Time_Normalized";
    OTelPerformanceCounterNames["EXCEPTION_RATE"] = "Exception_Rate";
})(OTelPerformanceCounterNames || (exports.OTelPerformanceCounterNames = OTelPerformanceCounterNames = {}));
/**
 * Breeze Performance Counter names.
 * @internal
 */
var BreezePerformanceCounterNames;
(function (BreezePerformanceCounterNames) {
    BreezePerformanceCounterNames["PRIVATE_BYTES"] = "\\Process(??APP_WIN32_PROC??)\\Private Bytes";
    BreezePerformanceCounterNames["AVAILABLE_BYTES"] = "\\Memory\\Available Bytes";
    BreezePerformanceCounterNames["PROCESSOR_TIME"] = "\\Processor(_Total)\\% Processor Time";
    BreezePerformanceCounterNames["PROCESS_TIME_STANDARD"] = "\\Process(??APP_WIN32_PROC??)\\% Processor Time";
    BreezePerformanceCounterNames["REQUEST_RATE"] = "\\ASP.NET Applications(??APP_W3SVC_PROC??)\\Requests/Sec";
    BreezePerformanceCounterNames["REQUEST_DURATION"] = "\\ASP.NET Applications(??APP_W3SVC_PROC??)\\Request Execution Time";
    BreezePerformanceCounterNames["PROCESS_TIME_NORMALIZED"] = "\\Process(??APP_WIN32_PROC??)\\% Processor Time Normalized";
    BreezePerformanceCounterNames["EXCEPTION_RATE"] = "\\.NET CLR Exceptions(??APP_CLR_PROC??)\\# of Exceps Thrown / sec";
})(BreezePerformanceCounterNames || (exports.BreezePerformanceCounterNames = BreezePerformanceCounterNames = {}));
/**
 * Property Max Lengths
 * @internal
 */
var MaxPropertyLengths;
(function (MaxPropertyLengths) {
    MaxPropertyLengths[MaxPropertyLengths["NINE_BIT"] = 512] = "NINE_BIT";
    MaxPropertyLengths[MaxPropertyLengths["TEN_BIT"] = 1024] = "TEN_BIT";
    MaxPropertyLengths[MaxPropertyLengths["THIRTEEN_BIT"] = 8192] = "THIRTEEN_BIT";
    MaxPropertyLengths[MaxPropertyLengths["FIFTEEN_BIT"] = 32768] = "FIFTEEN_BIT";
})(MaxPropertyLengths || (exports.MaxPropertyLengths = MaxPropertyLengths = {}));
/**
 * Legacy HTTP semantic convention values
 * @internal
 */
exports.legacySemanticValues = [
    semantic_conventions_1.SEMATTRS_NET_PEER_IP,
    semantic_conventions_1.SEMATTRS_NET_PEER_NAME,
    semantic_conventions_1.SEMATTRS_NET_HOST_IP,
    semantic_conventions_1.SEMATTRS_PEER_SERVICE,
    semantic_conventions_1.SEMATTRS_HTTP_USER_AGENT,
    semantic_conventions_1.SEMATTRS_HTTP_METHOD,
    semantic_conventions_1.SEMATTRS_HTTP_URL,
    semantic_conventions_1.SEMATTRS_HTTP_STATUS_CODE,
    semantic_conventions_1.SEMATTRS_HTTP_ROUTE,
    semantic_conventions_1.SEMATTRS_HTTP_HOST,
    semantic_conventions_1.SEMATTRS_DB_SYSTEM,
    semantic_conventions_1.SEMATTRS_DB_STATEMENT,
    semantic_conventions_1.SEMATTRS_DB_OPERATION,
    semantic_conventions_1.SEMATTRS_DB_NAME,
    semantic_conventions_1.SEMATTRS_RPC_SYSTEM,
    semantic_conventions_1.SEMATTRS_RPC_GRPC_STATUS_CODE,
    semantic_conventions_1.SEMATTRS_EXCEPTION_TYPE,
    semantic_conventions_1.SEMATTRS_EXCEPTION_MESSAGE,
    semantic_conventions_1.SEMATTRS_EXCEPTION_STACKTRACE,
    semantic_conventions_1.SEMATTRS_HTTP_SCHEME,
    semantic_conventions_1.SEMATTRS_HTTP_TARGET,
    semantic_conventions_1.SEMATTRS_HTTP_FLAVOR,
    semantic_conventions_1.SEMATTRS_NET_TRANSPORT,
    semantic_conventions_1.SEMATTRS_NET_HOST_NAME,
    semantic_conventions_1.SEMATTRS_NET_HOST_PORT,
    semantic_conventions_1.SEMATTRS_NET_PEER_PORT,
    semantic_conventions_1.SEMATTRS_HTTP_CLIENT_IP,
    semantic_conventions_1.SEMATTRS_ENDUSER_ID,
    "http.status_text",
];
/**
 * Experimental OpenTelemetry semantic convention values
 * @internal
 */
var experimentalOpenTelemetryValues;
(function (experimentalOpenTelemetryValues) {
    experimentalOpenTelemetryValues["SYNTHETIC_TYPE"] = "user_agent.synthetic.type";
})(experimentalOpenTelemetryValues || (exports.experimentalOpenTelemetryValues = experimentalOpenTelemetryValues = {}));
/**
 * HTTP semantic convention values
 * @internal
 */
exports.httpSemanticValues = [
    semantic_conventions_1.ATTR_CLIENT_ADDRESS,
    semantic_conventions_1.ATTR_CLIENT_PORT,
    semantic_conventions_1.ATTR_SERVER_ADDRESS,
    semantic_conventions_1.ATTR_SERVER_PORT,
    semantic_conventions_1.ATTR_URL_FULL,
    semantic_conventions_1.ATTR_URL_PATH,
    semantic_conventions_1.ATTR_URL_QUERY,
    semantic_conventions_1.ATTR_URL_SCHEME,
    semantic_conventions_1.ATTR_ERROR_TYPE,
    semantic_conventions_1.ATTR_NETWORK_LOCAL_ADDRESS,
    semantic_conventions_1.ATTR_NETWORK_LOCAL_PORT,
    semantic_conventions_1.ATTR_NETWORK_PROTOCOL_NAME,
    semantic_conventions_1.ATTR_NETWORK_PEER_ADDRESS,
    semantic_conventions_1.ATTR_NETWORK_PEER_PORT,
    semantic_conventions_1.ATTR_NETWORK_PROTOCOL_VERSION,
    semantic_conventions_1.ATTR_NETWORK_TRANSPORT,
    semantic_conventions_1.ATTR_USER_AGENT_ORIGINAL,
    semantic_conventions_1.ATTR_HTTP_REQUEST_METHOD,
    semantic_conventions_1.ATTR_HTTP_RESPONSE_STATUS_CODE,
    semantic_conventions_1.ATTR_EXCEPTION_TYPE,
    semantic_conventions_1.ATTR_EXCEPTION_MESSAGE,
    semantic_conventions_1.ATTR_EXCEPTION_STACKTRACE,
    experimentalOpenTelemetryValues.SYNTHETIC_TYPE,
];
/**
 * Internal Microsoft attributes
 * @internal
 */
exports.internalMicrosoftAttributes = ["_MS.ProcessedByMetricExtractors"];
//# sourceMappingURL=types.js.map