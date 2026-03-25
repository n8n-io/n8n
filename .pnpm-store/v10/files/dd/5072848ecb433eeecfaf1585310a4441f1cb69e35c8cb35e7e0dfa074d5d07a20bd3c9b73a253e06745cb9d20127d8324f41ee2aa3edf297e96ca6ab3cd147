// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/**
 * Azure service API version.
 */
export var ServiceApiVersion;
(function (ServiceApiVersion) {
    /**
     * V2 Version
     */
    ServiceApiVersion["V2"] = "2020-09-15_Preview";
})(ServiceApiVersion || (ServiceApiVersion = {}));
/**
 * Operation Name attribute name.
 */
export const AI_OPERATION_NAME = "ai.operation.name";
/**
 * Default Breeze endpoint.
 * @internal
 */
export const DEFAULT_BREEZE_ENDPOINT = "https://dc.services.visualstudio.com";
/**
 * Default Breeze API version.
 * @internal
 */
export const DEFAULT_BREEZE_API_VERSION = ServiceApiVersion.V2;
/**
 * Default Live Metrics endpoint.
 * @internal
 */
export const DEFAULT_LIVEMETRICS_ENDPOINT = "https://rt.services.visualstudio.com";
/**
 * Default Live Metrics host.
 * @internal
 */
export const DEFAULT_LIVEMETRICS_HOST = "rt.services.visualstudio.com";
/**
 * Connection string environment variable name.
 * @internal
 */
export const ENV_CONNECTION_STRING = "APPLICATIONINSIGHTS_CONNECTION_STRING";
/**
 * Instrumentation key environment variable name.
 * @internal
 */
export const ENV_INSTRUMENTATION_KEY = "APPINSIGHTS_INSTRUMENTATIONKEY";
/**
 * Disable Statsbeat environment variable name.
 * @internal
 */
export const ENV_DISABLE_STATSBEAT = "APPLICATIONINSIGHTS_STATSBEAT_DISABLED";
/**
 * Legacy disable Statsbeat environment variable name.
 * @internal
 */
export const LEGACY_ENV_DISABLE_STATSBEAT = "APPLICATION_INSIGHTS_NO_STATSBEAT";
/**
 * Disable OpenTelemetry Resource Metric.
 * @internal
 */
export const ENV_OPENTELEMETRY_RESOURCE_METRIC_DISABLED = "APPLICATIONINSIGHTS_OPENTELEMETRY_RESOURCE_METRIC_DISABLED";
/**
 * OTLP Metrics Endpoint.
 * @internal
 */
export const ENV_OTLP_METRICS_ENDPOINT = "OTEL_EXPORTER_OTLP_METRICS_ENDPOINT";
/**
 * OTel Metrics Exporter.
 * @internal
 */
export const ENV_OTEL_METRICS_EXPORTER = "OTEL_METRICS_EXPORTER";
/**
 * Determine if exporter was initialized in an auto-attach scenario.
 * @internal
 */
export const ENV_AZURE_MONITOR_AUTO_ATTACH = "AZURE_MONITOR_AUTO_ATTACH";
/**
 * Determines if custom metrics should be sent to Breeze.
 * @internal
 */
export const ENV_APPLICATIONINSIGHTS_METRICS_TO_LOGANALYTICS_ENABLED = "APPLICATIONINSIGHTS_METRICS_TO_LOGANALYTICS_ENABLED";
/**
 * REST error types for failed requests that can be retried.
 * @internal
 */
export var RetriableRestErrorTypes;
(function (RetriableRestErrorTypes) {
    RetriableRestErrorTypes["REQUEST_SEND_ERROR"] = "REQUEST_SEND_ERROR";
    RetriableRestErrorTypes["DNS_LOOKUP_TIMEOUT"] = "EAI_AGAIN";
})(RetriableRestErrorTypes || (RetriableRestErrorTypes = {}));
/**
 * Application Insights shim version.
 * @internal
 */
export const ENV_APPLICATIONINSIGHTS_SHIM_VERSION = "APPLICATION_INSIGHTS_SHIM_VERSION";
/**
 * Azure Monitor version prefix.
 * @internal
 */
export const ENV_AZURE_MONITOR_PREFIX = "AZURE_MONITOR_PREFIX";
/**
 * Azure Monitor Distro version.
 * @internal
 */
export const ENV_AZURE_MONITOR_DISTRO_VERSION = "AZURE_MONITOR_DISTRO_VERSION";
/**
 * QuickPulse metric counter names.
 * @internal
 */
export var QuickPulseCounter;
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
})(QuickPulseCounter || (QuickPulseCounter = {}));
/**
 * Performance metric counter names.
 * @internal
 */
export var PerformanceCounter;
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
})(PerformanceCounter || (PerformanceCounter = {}));
/**
 * Map a PerformanceCounter/QuickPulseCounter to a QuickPulseCounter. If no mapping exists, mapping is *undefined*
 * @internal
 */
export const PerformanceToQuickPulseCounter = {
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