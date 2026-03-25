"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceToQuickPulseCounter = exports.PerformanceCounter = exports.QuickPulseCounter = exports.ENV_AZURE_MONITOR_DISTRO_VERSION = exports.ENV_AZURE_MONITOR_PREFIX = exports.ENV_APPLICATIONINSIGHTS_SHIM_VERSION = exports.RetriableRestErrorTypes = exports.ENV_APPLICATIONINSIGHTS_METRICS_TO_LOGANALYTICS_ENABLED = exports.ENV_AZURE_MONITOR_AUTO_ATTACH = exports.ENV_OTEL_METRICS_EXPORTER = exports.ENV_OTLP_METRICS_ENDPOINT = exports.ENV_OPENTELEMETRY_RESOURCE_METRIC_DISABLED = exports.LEGACY_ENV_DISABLE_STATSBEAT = exports.ENV_DISABLE_STATSBEAT = exports.ENV_INSTRUMENTATION_KEY = exports.ENV_CONNECTION_STRING = exports.DEFAULT_LIVEMETRICS_HOST = exports.DEFAULT_LIVEMETRICS_ENDPOINT = exports.DEFAULT_BREEZE_API_VERSION = exports.DEFAULT_BREEZE_ENDPOINT = exports.AI_OPERATION_NAME = exports.ServiceApiVersion = void 0;
/**
 * Azure service API version.
 */
var ServiceApiVersion;
(function (ServiceApiVersion) {
    /**
     * V2 Version
     */
    ServiceApiVersion["V2"] = "2020-09-15_Preview";
})(ServiceApiVersion || (exports.ServiceApiVersion = ServiceApiVersion = {}));
/**
 * Operation Name attribute name.
 */
exports.AI_OPERATION_NAME = "ai.operation.name";
/**
 * Default Breeze endpoint.
 * @internal
 */
exports.DEFAULT_BREEZE_ENDPOINT = "https://dc.services.visualstudio.com";
/**
 * Default Breeze API version.
 * @internal
 */
exports.DEFAULT_BREEZE_API_VERSION = ServiceApiVersion.V2;
/**
 * Default Live Metrics endpoint.
 * @internal
 */
exports.DEFAULT_LIVEMETRICS_ENDPOINT = "https://rt.services.visualstudio.com";
/**
 * Default Live Metrics host.
 * @internal
 */
exports.DEFAULT_LIVEMETRICS_HOST = "rt.services.visualstudio.com";
/**
 * Connection string environment variable name.
 * @internal
 */
exports.ENV_CONNECTION_STRING = "APPLICATIONINSIGHTS_CONNECTION_STRING";
/**
 * Instrumentation key environment variable name.
 * @internal
 */
exports.ENV_INSTRUMENTATION_KEY = "APPINSIGHTS_INSTRUMENTATIONKEY";
/**
 * Disable Statsbeat environment variable name.
 * @internal
 */
exports.ENV_DISABLE_STATSBEAT = "APPLICATIONINSIGHTS_STATSBEAT_DISABLED";
/**
 * Legacy disable Statsbeat environment variable name.
 * @internal
 */
exports.LEGACY_ENV_DISABLE_STATSBEAT = "APPLICATION_INSIGHTS_NO_STATSBEAT";
/**
 * Disable OpenTelemetry Resource Metric.
 * @internal
 */
exports.ENV_OPENTELEMETRY_RESOURCE_METRIC_DISABLED = "APPLICATIONINSIGHTS_OPENTELEMETRY_RESOURCE_METRIC_DISABLED";
/**
 * OTLP Metrics Endpoint.
 * @internal
 */
exports.ENV_OTLP_METRICS_ENDPOINT = "OTEL_EXPORTER_OTLP_METRICS_ENDPOINT";
/**
 * OTel Metrics Exporter.
 * @internal
 */
exports.ENV_OTEL_METRICS_EXPORTER = "OTEL_METRICS_EXPORTER";
/**
 * Determine if exporter was initialized in an auto-attach scenario.
 * @internal
 */
exports.ENV_AZURE_MONITOR_AUTO_ATTACH = "AZURE_MONITOR_AUTO_ATTACH";
/**
 * Determines if custom metrics should be sent to Breeze.
 * @internal
 */
exports.ENV_APPLICATIONINSIGHTS_METRICS_TO_LOGANALYTICS_ENABLED = "APPLICATIONINSIGHTS_METRICS_TO_LOGANALYTICS_ENABLED";
/**
 * REST error types for failed requests that can be retried.
 * @internal
 */
var RetriableRestErrorTypes;
(function (RetriableRestErrorTypes) {
    RetriableRestErrorTypes["REQUEST_SEND_ERROR"] = "REQUEST_SEND_ERROR";
    RetriableRestErrorTypes["DNS_LOOKUP_TIMEOUT"] = "EAI_AGAIN";
})(RetriableRestErrorTypes || (exports.RetriableRestErrorTypes = RetriableRestErrorTypes = {}));
/**
 * Application Insights shim version.
 * @internal
 */
exports.ENV_APPLICATIONINSIGHTS_SHIM_VERSION = "APPLICATION_INSIGHTS_SHIM_VERSION";
/**
 * Azure Monitor version prefix.
 * @internal
 */
exports.ENV_AZURE_MONITOR_PREFIX = "AZURE_MONITOR_PREFIX";
/**
 * Azure Monitor Distro version.
 * @internal
 */
exports.ENV_AZURE_MONITOR_DISTRO_VERSION = "AZURE_MONITOR_DISTRO_VERSION";
/**
 * QuickPulse metric counter names.
 * @internal
 */
var QuickPulseCounter;
(function (QuickPulseCounter) {
    // Memory
    QuickPulseCounter["COMMITTED_BYTES"] = "\\Memory\\Committed Bytes";
    // CPU
    QuickPulseCounter["PROCESSOR_TIME"] = "\\Processor(_Total)\\% Processor Time";
    // Request
    QuickPulseCounter["REQUEST_RATE"] = "\\ApplicationInsights\\Requests/Sec";
    QuickPulseCounter["REQUEST_FAILURE_RATE"] = "\\ApplicationInsights\\Requests Failed/Sec";
    QuickPulseCounter["REQUEST_DURATION"] = "\\ApplicationInsights\\Request Duration";
    // Dependency
    QuickPulseCounter["DEPENDENCY_RATE"] = "\\ApplicationInsights\\Dependency Calls/Sec";
    QuickPulseCounter["DEPENDENCY_FAILURE_RATE"] = "\\ApplicationInsights\\Dependency Calls Failed/Sec";
    QuickPulseCounter["DEPENDENCY_DURATION"] = "\\ApplicationInsights\\Dependency Call Duration";
    // Exception
    QuickPulseCounter["EXCEPTION_RATE"] = "\\ApplicationInsights\\Exceptions/Sec";
})(QuickPulseCounter || (exports.QuickPulseCounter = QuickPulseCounter = {}));
/**
 * Performance metric counter names.
 * @internal
 */
var PerformanceCounter;
(function (PerformanceCounter) {
    // Memory
    PerformanceCounter["PRIVATE_BYTES"] = "\\Process(??APP_WIN32_PROC??)\\Private Bytes";
    PerformanceCounter["AVAILABLE_BYTES"] = "\\Memory\\Available Bytes";
    // CPU
    PerformanceCounter["PROCESSOR_TIME"] = "\\Processor(_Total)\\% Processor Time";
    PerformanceCounter["PROCESS_TIME_STANDARD"] = "\\Process(??APP_WIN32_PROC??)\\% Processor Time";
    PerformanceCounter["PROCESS_TIME_NORMALIZED"] = "\\Process(??APP_WIN32_PROC??)\\% Processor Time Normalized";
    // Requests
    PerformanceCounter["REQUEST_RATE"] = "\\ASP.NET Applications(??APP_W3SVC_PROC??)\\Requests/Sec";
    PerformanceCounter["REQUEST_DURATION"] = "\\ASP.NET Applications(??APP_W3SVC_PROC??)\\Request Execution Time";
    // Exception
    PerformanceCounter["EXCEPTION_RATE"] = "\\.NET CLR Exceptions(??APP_CLR_PROC??)\\# of Exceps Thrown / sec";
    // I/O
    PerformanceCounter["IO_RATE"] = "\\Process(??APP_WIN32_PROC??)\\IO Data Bytes/sec";
})(PerformanceCounter || (exports.PerformanceCounter = PerformanceCounter = {}));
/**
 * Map a PerformanceCounter/QuickPulseCounter to a QuickPulseCounter. If no mapping exists, mapping is *undefined*
 * @internal
 */
exports.PerformanceToQuickPulseCounter = {
    [PerformanceCounter.PROCESSOR_TIME]: QuickPulseCounter.PROCESSOR_TIME,
    [PerformanceCounter.REQUEST_RATE]: QuickPulseCounter.REQUEST_RATE,
    [PerformanceCounter.REQUEST_DURATION]: QuickPulseCounter.REQUEST_DURATION,
    // Remap quick pulse only counters
    [QuickPulseCounter.COMMITTED_BYTES]: QuickPulseCounter.COMMITTED_BYTES,
    [QuickPulseCounter.REQUEST_FAILURE_RATE]: QuickPulseCounter.REQUEST_FAILURE_RATE,
    [QuickPulseCounter.DEPENDENCY_RATE]: QuickPulseCounter.DEPENDENCY_RATE,
    [QuickPulseCounter.DEPENDENCY_FAILURE_RATE]: QuickPulseCounter.DEPENDENCY_FAILURE_RATE,
    [QuickPulseCounter.DEPENDENCY_DURATION]: QuickPulseCounter.DEPENDENCY_DURATION,
    [QuickPulseCounter.EXCEPTION_RATE]: QuickPulseCounter.EXCEPTION_RATE,
};
//# sourceMappingURL=Constants.js.map