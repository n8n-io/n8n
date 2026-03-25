import type { ContextTagKeys } from "./generated/index.js";
/**
 * Azure Monitor envelope tags.
 * @internal
 */
export type Tags = {
    [key in ContextTagKeys]: string;
};
/**
 * Azure Monitor envelope property type.
 * @internal
 */
export type PropertyType = string | number | boolean | object | Array<PropertyType>;
/**
 * Azure Monitor envelope properties.
 * @internal
 */
export type Properties = {
    [key: string]: Properties | PropertyType;
};
/**
 * Azure Monitor envelope links.
 * @internal
 */
export interface MSLink {
    operation_Id: string;
    id: string;
}
/**
 * Azure Monitor envelope measurements.
 * @internal
 */
export type Measurements = {
    [key: string]: number;
};
/**
 * Exporter sender result.
 * @internal
 */
export type SenderResult = {
    statusCode: number | undefined;
    result: string;
};
/**
 * Exporter persistent storage.
 * @internal
 */
export interface PersistentStorage {
    shift(): Promise<unknown>;
    push(value: unknown[]): Promise<boolean>;
}
/**
 * Performance Counter OpenTelemetry compliant names.
 * @internal
 */
export declare enum OTelPerformanceCounterNames {
    PRIVATE_BYTES = "Private_Bytes",
    AVAILABLE_BYTES = "Available_Bytes",
    PROCESSOR_TIME = "Processor_Time",
    PROCESS_TIME_STANDARD = "Process_Time_Standard",
    REQUEST_RATE = "Request_Rate",
    REQUEST_DURATION = "Request_Execution_Time",
    PROCESS_TIME_NORMALIZED = "Process_Time_Normalized",
    EXCEPTION_RATE = "Exception_Rate"
}
/**
 * Breeze Performance Counter names.
 * @internal
 */
export declare enum BreezePerformanceCounterNames {
    PRIVATE_BYTES = "\\Process(??APP_WIN32_PROC??)\\Private Bytes",
    AVAILABLE_BYTES = "\\Memory\\Available Bytes",
    PROCESSOR_TIME = "\\Processor(_Total)\\% Processor Time",
    PROCESS_TIME_STANDARD = "\\Process(??APP_WIN32_PROC??)\\% Processor Time",
    REQUEST_RATE = "\\ASP.NET Applications(??APP_W3SVC_PROC??)\\Requests/Sec",
    REQUEST_DURATION = "\\ASP.NET Applications(??APP_W3SVC_PROC??)\\Request Execution Time",
    PROCESS_TIME_NORMALIZED = "\\Process(??APP_WIN32_PROC??)\\% Processor Time Normalized",
    EXCEPTION_RATE = "\\.NET CLR Exceptions(??APP_CLR_PROC??)\\# of Exceps Thrown / sec"
}
/**
 * Property Max Lengths
 * @internal
 */
export declare enum MaxPropertyLengths {
    NINE_BIT = 512,
    TEN_BIT = 1024,
    THIRTEEN_BIT = 8192,
    FIFTEEN_BIT = 32768
}
/**
 * Legacy HTTP semantic convention values
 * @internal
 */
export declare const legacySemanticValues: string[];
/**
 * Experimental OpenTelemetry semantic convention values
 * @internal
 */
export declare enum experimentalOpenTelemetryValues {
    SYNTHETIC_TYPE = "user_agent.synthetic.type"
}
/**
 * HTTP semantic convention values
 * @internal
 */
export declare const httpSemanticValues: ("exception.type" | "exception.message" | "exception.stacktrace" | "client.address" | "client.port" | "error.type" | "http.request.method" | "http.response.status_code" | "network.local.address" | "network.local.port" | "network.peer.address" | "network.peer.port" | "network.protocol.name" | "network.protocol.version" | "network.transport" | "server.address" | "server.port" | "url.full" | "url.path" | "url.query" | "url.scheme" | "user_agent.original" | experimentalOpenTelemetryValues)[];
/**
 * Internal Microsoft attributes
 * @internal
 */
export declare const internalMicrosoftAttributes: string[];
//# sourceMappingURL=types.d.ts.map