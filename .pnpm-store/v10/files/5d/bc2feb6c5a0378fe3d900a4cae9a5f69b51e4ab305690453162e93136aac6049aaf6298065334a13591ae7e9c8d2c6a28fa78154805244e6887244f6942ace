import * as coreClient from "@azure/core-client";
/** System variables for a telemetry item. */
export interface TelemetryItem {
    /** Envelope version. For internal use only. By assigning this the default, it will not be serialized within the payload unless changed to a value other than #1. */
    version?: number;
    /** Type name of telemetry data item. */
    name: string;
    /** Event date time when telemetry item was created. This is the wall clock time on the client when the event was generated. There is no guarantee that the client's time is accurate. This field must be formatted in UTC ISO 8601 format, with a trailing 'Z' character, as described publicly on https://en.wikipedia.org/wiki/ISO_8601#UTC. Note: the number of decimal seconds digits provided are variable (and unspecified). Consumers should handle this, i.e. managed code consumers should not use format 'O' for parsing as it specifies a fixed length. Example: 2009-06-15T13:45:30.0000000Z. */
    time: Date;
    /** Sampling rate used in application. This telemetry item represents 100 / sampleRate actual telemetry items. */
    sampleRate?: number;
    /** Sequence field used to track absolute order of uploaded events. */
    sequence?: string;
    /** The instrumentation key of the Application Insights resource. */
    instrumentationKey?: string;
    /** Key/value collection of context properties. See ContextTagKeys for information on available properties. */
    tags?: {
        [propertyName: string]: string;
    };
    /** Telemetry data item. */
    data?: MonitorBase;
}
/** Data struct to contain only C section with custom fields. */
export interface MonitorBase {
    /** Name of item (B section) if any. If telemetry data is derived straight from this, this should be null. */
    baseType?: string;
    /** The data payload for the telemetry request */
    baseData?: MonitorDomain;
}
/** The abstract common base of all domains. */
export interface MonitorDomain {
    /** Describes unknown properties. The value of an unknown property can be of "any" type. */
    [property: string]: any;
    /** Schema version */
    version: number;
}
/** Response containing the status of each telemetry item. */
export interface TrackResponse {
    /** The number of items received. */
    itemsReceived?: number;
    /** The number of items accepted. */
    itemsAccepted?: number;
    /** An array of error detail objects. */
    errors?: TelemetryErrorDetails[];
}
/** The error details */
export interface TelemetryErrorDetails {
    /** The index in the original payload of the item. */
    index?: number;
    /** The item specific [HTTP Response status code](#Response Status Codes). */
    statusCode?: number;
    /** The error message. */
    message?: string;
}
/** Metric data single measurement. */
export interface MetricDataPoint {
    /** Namespace of the metric. */
    namespace?: string;
    /** Name of the metric. */
    name: string;
    /** Metric type. Single measurement or the aggregated value. */
    dataPointType?: DataPointType;
    /** Single value for measurement. Sum of individual measurements for the aggregation. */
    value: number;
    /** Metric weight of the aggregated metric. Should not be set for a measurement. */
    count?: number;
    /** Minimum value of the aggregated metric. Should not be set for a measurement. */
    min?: number;
    /** Maximum value of the aggregated metric. Should not be set for a measurement. */
    max?: number;
    /** Standard deviation of the aggregated metric. Should not be set for a measurement. */
    stdDev?: number;
}
/** Exception details of the exception in a chain. */
export interface TelemetryExceptionDetails {
    /** In case exception is nested (outer exception contains inner one), the id and outerId properties are used to represent the nesting. */
    id?: number;
    /** The value of outerId is a reference to an element in ExceptionDetails that represents the outer exception */
    outerId?: number;
    /** Exception type name. */
    typeName?: string;
    /** Exception message. */
    message: string;
    /** Indicates if full exception stack is provided in the exception. The stack may be trimmed, such as in the case of a StackOverflow exception. */
    hasFullStack?: boolean;
    /** Text describing the stack. Either stack or parsedStack should have a value. */
    stack?: string;
    /** List of stack frames. Either stack or parsedStack should have a value. */
    parsedStack?: StackFrame[];
}
/** Stack frame information. */
export interface StackFrame {
    level: number;
    /** Method name. */
    method: string;
    /** Name of the assembly (dll, jar, etc.) containing this function. */
    assembly?: string;
    /** File name or URL of the method implementation. */
    fileName?: string;
    /** Line number of the code implementation. */
    line?: number;
}
/** Instances of AvailabilityData represent the result of executing an availability test. */
export interface AvailabilityData extends MonitorDomain {
    /** Identifier of a test run. Use it to correlate steps of test run and telemetry generated by the service. */
    id: string;
    /** Name of the test that these availability results represent. */
    name: string;
    /** Duration in format: DD.HH:MM:SS.MMMMMM. Must be less than 1000 days. */
    duration: string;
    /** Success flag. */
    success: boolean;
    /** Name of the location where the test was run from. */
    runLocation?: string;
    /** Diagnostic message for the result. */
    message?: string;
    /** Collection of custom properties. */
    properties?: {
        [propertyName: string]: string;
    };
    /** Collection of custom measurements. */
    measurements?: {
        [propertyName: string]: number;
    };
}
/** Instances of Event represent structured event records that can be grouped and searched by their properties. Event data item also creates a metric of event count by name. */
export interface TelemetryEventData extends MonitorDomain {
    /** Event name. Keep it low cardinality to allow proper grouping and useful metrics. */
    name: string;
    /** Collection of custom properties. */
    properties?: {
        [propertyName: string]: string;
    };
    /** Collection of custom measurements. */
    measurements?: {
        [propertyName: string]: number;
    };
}
/** An instance of Exception represents a handled or unhandled exception that occurred during execution of the monitored application. */
export interface TelemetryExceptionData extends MonitorDomain {
    /** Exception chain - list of inner exceptions. */
    exceptions: TelemetryExceptionDetails[];
    /** Severity level. Mostly used to indicate exception severity level when it is reported by logging library. */
    severityLevel?: SeverityLevel;
    /** Identifier of where the exception was thrown in code. Used for exceptions grouping. Typically a combination of exception type and a function from the call stack. */
    problemId?: string;
    /** Collection of custom properties. */
    properties?: {
        [propertyName: string]: string;
    };
    /** Collection of custom measurements. */
    measurements?: {
        [propertyName: string]: number;
    };
}
/** Instances of Message represent printf-like trace statements that are text-searched. Log4Net, NLog and other text-based log file entries are translated into instances of this type. The message does not have measurements. */
export interface MessageData extends MonitorDomain {
    /** Trace message */
    message: string;
    /** Trace severity level. */
    severityLevel?: SeverityLevel;
    /** Collection of custom properties. */
    properties?: {
        [propertyName: string]: string;
    };
    /** Collection of custom measurements. */
    measurements?: {
        [propertyName: string]: number;
    };
}
/** An instance of the Metric item is a list of measurements (single data points) and/or aggregations. */
export interface MetricsData extends MonitorDomain {
    /** List of metrics. Only one metric in the list is currently supported by Application Insights storage. If multiple data points were sent only the first one will be used. */
    metrics: MetricDataPoint[];
    /** Collection of custom properties. */
    properties?: {
        [propertyName: string]: string;
    };
}
/** An instance of PageView represents a generic action on a page like a button click. It is also the base type for PageView. */
export interface PageViewData extends MonitorDomain {
    /** Identifier of a page view instance. Used for correlation between page view and other telemetry items. */
    id: string;
    /** Event name. Keep it low cardinality to allow proper grouping and useful metrics. */
    name: string;
    /** Request URL with all query string parameters */
    url?: string;
    /** Request duration in format: DD.HH:MM:SS.MMMMMM. For a page view (PageViewData), this is the duration. For a page view with performance information (PageViewPerfData), this is the page load time. Must be less than 1000 days. */
    duration?: string;
    /** Fully qualified page URI or URL of the referring page; if unknown, leave blank */
    referredUri?: string;
    /** Collection of custom properties. */
    properties?: {
        [propertyName: string]: string;
    };
    /** Collection of custom measurements. */
    measurements?: {
        [propertyName: string]: number;
    };
}
/** An instance of PageViewPerf represents: a page view with no performance data, a page view with performance data, or just the performance data of an earlier page request. */
export interface PageViewPerfData extends MonitorDomain {
    /** Identifier of a page view instance. Used for correlation between page view and other telemetry items. */
    id: string;
    /** Event name. Keep it low cardinality to allow proper grouping and useful metrics. */
    name: string;
    /** Request URL with all query string parameters */
    url?: string;
    /** Request duration in format: DD.HH:MM:SS.MMMMMM. For a page view (PageViewData), this is the duration. For a page view with performance information (PageViewPerfData), this is the page load time. Must be less than 1000 days. */
    duration?: string;
    /** Performance total in TimeSpan 'G' (general long) format: d:hh:mm:ss.fffffff */
    perfTotal?: string;
    /** Network connection time in TimeSpan 'G' (general long) format: d:hh:mm:ss.fffffff */
    networkConnect?: string;
    /** Sent request time in TimeSpan 'G' (general long) format: d:hh:mm:ss.fffffff */
    sentRequest?: string;
    /** Received response time in TimeSpan 'G' (general long) format: d:hh:mm:ss.fffffff */
    receivedResponse?: string;
    /** DOM processing time in TimeSpan 'G' (general long) format: d:hh:mm:ss.fffffff */
    domProcessing?: string;
    /** Collection of custom properties. */
    properties?: {
        [propertyName: string]: string;
    };
    /** Collection of custom measurements. */
    measurements?: {
        [propertyName: string]: number;
    };
}
/** An instance of Remote Dependency represents an interaction of the monitored component with a remote component/service like SQL or an HTTP endpoint. */
export interface RemoteDependencyData extends MonitorDomain {
    /** Identifier of a dependency call instance. Used for correlation with the request telemetry item corresponding to this dependency call. */
    id?: string;
    /** Name of the command initiated with this dependency call. Low cardinality value. Examples are stored procedure name and URL path template. */
    name: string;
    /** Result code of a dependency call. Examples are SQL error code and HTTP status code. */
    resultCode?: string;
    /** Command initiated by this dependency call. Examples are SQL statement and HTTP URL with all query parameters. */
    data?: string;
    /** Dependency type name. Very low cardinality value for logical grouping of dependencies and interpretation of other fields like commandName and resultCode. Examples are SQL, Azure table, and HTTP. */
    type?: string;
    /** Target site of a dependency call. Examples are server name, host address. */
    target?: string;
    /** Request duration in format: DD.HH:MM:SS.MMMMMM. Must be less than 1000 days. */
    duration: string;
    /** Indication of successful or unsuccessful call. */
    success?: boolean;
    /** Collection of custom properties. */
    properties?: {
        [propertyName: string]: string;
    };
    /** Collection of custom measurements. */
    measurements?: {
        [propertyName: string]: number;
    };
}
/** An instance of Request represents completion of an external request to the application to do work and contains a summary of that request execution and the results. */
export interface RequestData extends MonitorDomain {
    /** Identifier of a request call instance. Used for correlation between request and other telemetry items. */
    id: string;
    /** Name of the request. Represents code path taken to process request. Low cardinality value to allow better grouping of requests. For HTTP requests it represents the HTTP method and URL path template like 'GET /values/{id}'. */
    name?: string;
    /** Request duration in format: DD.HH:MM:SS.MMMMMM. Must be less than 1000 days. */
    duration: string;
    /** Indication of successful or unsuccessful call. */
    success: boolean;
    /** Result of a request execution. HTTP status code for HTTP requests. */
    responseCode: string;
    /** Source of the request. Examples are the instrumentation key of the caller or the ip address of the caller. */
    source?: string;
    /** Request URL with all query string parameters. */
    url?: string;
    /** Collection of custom properties. */
    properties?: {
        [propertyName: string]: string;
    };
    /** Collection of custom measurements. */
    measurements?: {
        [propertyName: string]: number;
    };
}
/** Known values of {@link DataPointType} that the service accepts. */
export declare enum KnownDataPointType {
    /** Measurement */
    Measurement = "Measurement",
    /** Aggregation */
    Aggregation = "Aggregation"
}
/**
 * Defines values for DataPointType. \
 * {@link KnownDataPointType} can be used interchangeably with DataPointType,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **Measurement** \
 * **Aggregation**
 */
export type DataPointType = string;
/** Known values of {@link SeverityLevel} that the service accepts. */
export declare enum KnownSeverityLevel {
    /** Verbose */
    Verbose = "Verbose",
    /** Information */
    Information = "Information",
    /** Warning */
    Warning = "Warning",
    /** Error */
    Error = "Error",
    /** Critical */
    Critical = "Critical"
}
/**
 * Defines values for SeverityLevel. \
 * {@link KnownSeverityLevel} can be used interchangeably with SeverityLevel,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **Verbose** \
 * **Information** \
 * **Warning** \
 * **Error** \
 * **Critical**
 */
export type SeverityLevel = string;
/** Known values of {@link ContextTagKeys} that the service accepts. */
export declare enum KnownContextTagKeys {
    /** AiApplicationVer */
    AiApplicationVer = "ai.application.ver",
    /** AiDeviceId */
    AiDeviceId = "ai.device.id",
    /** AiDeviceLocale */
    AiDeviceLocale = "ai.device.locale",
    /** AiDeviceModel */
    AiDeviceModel = "ai.device.model",
    /** AiDeviceOemName */
    AiDeviceOemName = "ai.device.oemName",
    /** AiDeviceOsVersion */
    AiDeviceOsVersion = "ai.device.osVersion",
    /** AiDeviceType */
    AiDeviceType = "ai.device.type",
    /** AiLocationIp */
    AiLocationIp = "ai.location.ip",
    /** AiLocationCountry */
    AiLocationCountry = "ai.location.country",
    /** AiLocationProvince */
    AiLocationProvince = "ai.location.province",
    /** AiLocationCity */
    AiLocationCity = "ai.location.city",
    /** AiOperationId */
    AiOperationId = "ai.operation.id",
    /** AiOperationName */
    AiOperationName = "ai.operation.name",
    /** AiOperationParentId */
    AiOperationParentId = "ai.operation.parentId",
    /** AiOperationSyntheticSource */
    AiOperationSyntheticSource = "ai.operation.syntheticSource",
    /** AiOperationCorrelationVector */
    AiOperationCorrelationVector = "ai.operation.correlationVector",
    /** AiSessionId */
    AiSessionId = "ai.session.id",
    /** AiSessionIsFirst */
    AiSessionIsFirst = "ai.session.isFirst",
    /** AiUserAccountId */
    AiUserAccountId = "ai.user.accountId",
    /** AiUserId */
    AiUserId = "ai.user.id",
    /** AiUserAuthUserId */
    AiUserAuthUserId = "ai.user.authUserId",
    /** AiCloudRole */
    AiCloudRole = "ai.cloud.role",
    /** AiCloudRoleVer */
    AiCloudRoleVer = "ai.cloud.roleVer",
    /** AiCloudRoleInstance */
    AiCloudRoleInstance = "ai.cloud.roleInstance",
    /** AiCloudLocation */
    AiCloudLocation = "ai.cloud.location",
    /** AiInternalSdkVersion */
    AiInternalSdkVersion = "ai.internal.sdkVersion",
    /** AiInternalAgentVersion */
    AiInternalAgentVersion = "ai.internal.agentVersion",
    /** AiInternalNodeName */
    AiInternalNodeName = "ai.internal.nodeName"
}
/**
 * Defines values for ContextTagKeys. \
 * {@link KnownContextTagKeys} can be used interchangeably with ContextTagKeys,
 *  this enum contains the known values that the service supports.
 * ### Known values supported by the service
 * **ai.application.ver** \
 * **ai.device.id** \
 * **ai.device.locale** \
 * **ai.device.model** \
 * **ai.device.oemName** \
 * **ai.device.osVersion** \
 * **ai.device.type** \
 * **ai.location.ip** \
 * **ai.location.country** \
 * **ai.location.province** \
 * **ai.location.city** \
 * **ai.operation.id** \
 * **ai.operation.name** \
 * **ai.operation.parentId** \
 * **ai.operation.syntheticSource** \
 * **ai.operation.correlationVector** \
 * **ai.session.id** \
 * **ai.session.isFirst** \
 * **ai.user.accountId** \
 * **ai.user.id** \
 * **ai.user.authUserId** \
 * **ai.cloud.role** \
 * **ai.cloud.roleVer** \
 * **ai.cloud.roleInstance** \
 * **ai.cloud.location** \
 * **ai.internal.sdkVersion** \
 * **ai.internal.agentVersion** \
 * **ai.internal.nodeName**
 */
export type ContextTagKeys = string;
/** Optional parameters. */
export interface TrackOptionalParams extends coreClient.OperationOptions {
}
/** Contains response data for the track operation. */
export type TrackOperationResponse = TrackResponse;
/** Optional parameters. */
export interface ApplicationInsightsClientOptionalParams extends coreClient.ServiceClientOptions {
    /** Breeze endpoint: https://dc.services.visualstudio.com */
    host?: string;
    /** Overrides client endpoint. */
    endpoint?: string;
}
//# sourceMappingURL=index.d.ts.map