/**
 * Azure service API version.
 */
export declare enum ServiceApiVersion {
    /**
     * V2 Version
     */
    V2 = "2020-09-15_Preview"
}
/**
 * Operation Name attribute name.
 */
export declare const AI_OPERATION_NAME = "ai.operation.name";
/**
 * Default Breeze endpoint.
 * @internal
 */
export declare const DEFAULT_BREEZE_ENDPOINT = "https://dc.services.visualstudio.com";
/**
 * Default Breeze API version.
 * @internal
 */
export declare const DEFAULT_BREEZE_API_VERSION = ServiceApiVersion.V2;
/**
 * Default Live Metrics endpoint.
 * @internal
 */
export declare const DEFAULT_LIVEMETRICS_ENDPOINT = "https://rt.services.visualstudio.com";
/**
 * Default Live Metrics host.
 * @internal
 */
export declare const DEFAULT_LIVEMETRICS_HOST = "rt.services.visualstudio.com";
/**
 * Connection string environment variable name.
 * @internal
 */
export declare const ENV_CONNECTION_STRING = "APPLICATIONINSIGHTS_CONNECTION_STRING";
/**
 * Instrumentation key environment variable name.
 * @internal
 */
export declare const ENV_INSTRUMENTATION_KEY = "APPINSIGHTS_INSTRUMENTATIONKEY";
/**
 * Disable Statsbeat environment variable name.
 * @internal
 */
export declare const ENV_DISABLE_STATSBEAT = "APPLICATIONINSIGHTS_STATSBEAT_DISABLED";
/**
 * Legacy disable Statsbeat environment variable name.
 * @internal
 */
export declare const LEGACY_ENV_DISABLE_STATSBEAT = "APPLICATION_INSIGHTS_NO_STATSBEAT";
/**
 * Disable OpenTelemetry Resource Metric.
 * @internal
 */
export declare const ENV_OPENTELEMETRY_RESOURCE_METRIC_DISABLED = "APPLICATIONINSIGHTS_OPENTELEMETRY_RESOURCE_METRIC_DISABLED";
/**
 * OTLP Metrics Endpoint.
 * @internal
 */
export declare const ENV_OTLP_METRICS_ENDPOINT = "OTEL_EXPORTER_OTLP_METRICS_ENDPOINT";
/**
 * OTel Metrics Exporter.
 * @internal
 */
export declare const ENV_OTEL_METRICS_EXPORTER = "OTEL_METRICS_EXPORTER";
/**
 * Determine if exporter was initialized in an auto-attach scenario.
 * @internal
 */
export declare const ENV_AZURE_MONITOR_AUTO_ATTACH = "AZURE_MONITOR_AUTO_ATTACH";
/**
 * Determines if custom metrics should be sent to Breeze.
 * @internal
 */
export declare const ENV_APPLICATIONINSIGHTS_METRICS_TO_LOGANALYTICS_ENABLED = "APPLICATIONINSIGHTS_METRICS_TO_LOGANALYTICS_ENABLED";
/**
 * REST error types for failed requests that can be retried.
 * @internal
 */
export declare enum RetriableRestErrorTypes {
    REQUEST_SEND_ERROR = "REQUEST_SEND_ERROR",
    DNS_LOOKUP_TIMEOUT = "EAI_AGAIN"
}
/**
 * Application Insights shim version.
 * @internal
 */
export declare const ENV_APPLICATIONINSIGHTS_SHIM_VERSION = "APPLICATION_INSIGHTS_SHIM_VERSION";
/**
 * Azure Monitor version prefix.
 * @internal
 */
export declare const ENV_AZURE_MONITOR_PREFIX = "AZURE_MONITOR_PREFIX";
/**
 * Azure Monitor Distro version.
 * @internal
 */
export declare const ENV_AZURE_MONITOR_DISTRO_VERSION = "AZURE_MONITOR_DISTRO_VERSION";
/**
 * QuickPulse metric counter names.
 * @internal
 */
export declare enum QuickPulseCounter {
    COMMITTED_BYTES = "\\Memory\\Committed Bytes",
    PROCESSOR_TIME = "\\Processor(_Total)\\% Processor Time",
    REQUEST_RATE = "\\ApplicationInsights\\Requests/Sec",
    REQUEST_FAILURE_RATE = "\\ApplicationInsights\\Requests Failed/Sec",
    REQUEST_DURATION = "\\ApplicationInsights\\Request Duration",
    DEPENDENCY_RATE = "\\ApplicationInsights\\Dependency Calls/Sec",
    DEPENDENCY_FAILURE_RATE = "\\ApplicationInsights\\Dependency Calls Failed/Sec",
    DEPENDENCY_DURATION = "\\ApplicationInsights\\Dependency Call Duration",
    EXCEPTION_RATE = "\\ApplicationInsights\\Exceptions/Sec"
}
/**
 * Performance metric counter names.
 * @internal
 */
export declare enum PerformanceCounter {
    PRIVATE_BYTES = "\\Process(??APP_WIN32_PROC??)\\Private Bytes",
    AVAILABLE_BYTES = "\\Memory\\Available Bytes",
    PROCESSOR_TIME = "\\Processor(_Total)\\% Processor Time",
    PROCESS_TIME_STANDARD = "\\Process(??APP_WIN32_PROC??)\\% Processor Time",
    PROCESS_TIME_NORMALIZED = "\\Process(??APP_WIN32_PROC??)\\% Processor Time Normalized",
    REQUEST_RATE = "\\ASP.NET Applications(??APP_W3SVC_PROC??)\\Requests/Sec",
    REQUEST_DURATION = "\\ASP.NET Applications(??APP_W3SVC_PROC??)\\Request Execution Time",
    EXCEPTION_RATE = "\\.NET CLR Exceptions(??APP_CLR_PROC??)\\# of Exceps Thrown / sec",
    IO_RATE = "\\Process(??APP_WIN32_PROC??)\\IO Data Bytes/sec"
}
/**
 * Map a PerformanceCounter/QuickPulseCounter to a QuickPulseCounter. If no mapping exists, mapping is *undefined*
 * @internal
 */
export declare const PerformanceToQuickPulseCounter: {
    [key: string]: QuickPulseCounter;
};
/**
 * QuickPulse document types.
 * @internal
 */
export type QuickPulseDocumentType = "Event" | "Exception" | "Trace" | "Metric" | "Request" | "RemoteDependency" | "Availability";
/**
 * QuickPulse telemetry types.
 * @internal
 */
export type QuickPulseType = "EventTelemetryDocument" | "ExceptionTelemetryDocument" | "TraceTelemetryDocument" | "MetricTelemetryDocument" | "RequestTelemetryDocument" | "DependencyTelemetryDocument" | "AvailabilityTelemetryDocument";
//# sourceMappingURL=Constants.d.ts.map