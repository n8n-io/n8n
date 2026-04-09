import type { Fixed64, IAnyValue, IInstrumentationScope, IKeyValue } from '../common/types';
import type { IResource } from '../resource/types';
/** Properties of an ExportLogsServiceRequest. */
export interface IExportLogsServiceRequest {
    /** ExportLogsServiceRequest resourceLogs */
    resourceLogs?: IResourceLogs[];
}
export interface IExportLogsServiceResponse {
    /** ExportLogsServiceResponse partialSuccess */
    partialSuccess?: IExportLogsPartialSuccess;
}
export interface IExportLogsPartialSuccess {
    /** ExportLogsPartialSuccess rejectedLogRecords */
    rejectedLogRecords?: number;
    /** ExportLogsPartialSuccess errorMessage */
    errorMessage?: string;
}
/** Properties of a ResourceLogs. */
export interface IResourceLogs {
    /** ResourceLogs resource */
    resource?: IResource;
    /** ResourceLogs scopeLogs */
    scopeLogs: IScopeLogs[];
    /** ResourceLogs schemaUrl */
    schemaUrl?: string;
}
/** Properties of an ScopeLogs. */
export interface IScopeLogs {
    /** IScopeLogs scope */
    scope?: IInstrumentationScope;
    /** IScopeLogs logRecords */
    logRecords?: ILogRecord[];
    /** IScopeLogs schemaUrl */
    schemaUrl?: string | null;
}
/** Properties of a LogRecord. */
export interface ILogRecord {
    /** LogRecord timeUnixNano */
    timeUnixNano: Fixed64;
    /** LogRecord observedTimeUnixNano */
    observedTimeUnixNano: Fixed64;
    /** LogRecord severityNumber */
    severityNumber?: ESeverityNumber;
    /** LogRecord severityText */
    severityText?: string;
    /** LogRecord body */
    body?: IAnyValue;
    /** LogRecord attributes */
    attributes: IKeyValue[];
    /** LogRecord droppedAttributesCount */
    droppedAttributesCount: number;
    /** LogRecord flags */
    flags?: number;
    /** LogRecord traceId */
    traceId?: string | Uint8Array;
    /** LogRecord spanId */
    spanId?: string | Uint8Array;
}
/**
 * Numerical value of the severity, normalized to values described in Log Data Model.
 */
export declare const enum ESeverityNumber {
    /** Unspecified. Do NOT use as default */
    SEVERITY_NUMBER_UNSPECIFIED = 0,
    SEVERITY_NUMBER_TRACE = 1,
    SEVERITY_NUMBER_TRACE2 = 2,
    SEVERITY_NUMBER_TRACE3 = 3,
    SEVERITY_NUMBER_TRACE4 = 4,
    SEVERITY_NUMBER_DEBUG = 5,
    SEVERITY_NUMBER_DEBUG2 = 6,
    SEVERITY_NUMBER_DEBUG3 = 7,
    SEVERITY_NUMBER_DEBUG4 = 8,
    SEVERITY_NUMBER_INFO = 9,
    SEVERITY_NUMBER_INFO2 = 10,
    SEVERITY_NUMBER_INFO3 = 11,
    SEVERITY_NUMBER_INFO4 = 12,
    SEVERITY_NUMBER_WARN = 13,
    SEVERITY_NUMBER_WARN2 = 14,
    SEVERITY_NUMBER_WARN3 = 15,
    SEVERITY_NUMBER_WARN4 = 16,
    SEVERITY_NUMBER_ERROR = 17,
    SEVERITY_NUMBER_ERROR2 = 18,
    SEVERITY_NUMBER_ERROR3 = 19,
    SEVERITY_NUMBER_ERROR4 = 20,
    SEVERITY_NUMBER_FATAL = 21,
    SEVERITY_NUMBER_FATAL2 = 22,
    SEVERITY_NUMBER_FATAL3 = 23,
    SEVERITY_NUMBER_FATAL4 = 24
}
//# sourceMappingURL=types.d.ts.map