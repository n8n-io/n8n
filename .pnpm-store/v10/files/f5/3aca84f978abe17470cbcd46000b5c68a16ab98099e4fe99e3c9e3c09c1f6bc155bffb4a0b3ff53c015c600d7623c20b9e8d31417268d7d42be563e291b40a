export declare class NetworkStatsbeat {
    time: number | undefined;
    lastTime: number;
    endpoint: string;
    host: string;
    totalRequestCount: number;
    lastRequestCount: number;
    totalSuccessfulRequestCount: number;
    totalReadFailureCount: number;
    totalWriteFailureCount: number;
    totalFailedRequestCount: {
        statusCode: number;
        count: number;
    }[];
    retryCount: {
        statusCode: number;
        count: number;
    }[];
    exceptionCount: {
        exceptionType: string;
        count: number;
    }[];
    throttleCount: {
        statusCode: number;
        count: number;
    }[];
    intervalRequestExecutionTime: number;
    lastIntervalRequestExecutionTime: number;
    averageRequestExecutionTime: number;
    constructor(endpoint: string, host: string);
}
export declare const STATSBEAT_LANGUAGE = "node";
export declare const AZURE_MONITOR_AUTO_ATTACH = "AZURE_MONITOR_AUTO_ATTACH";
export declare const MAX_STATSBEAT_FAILURES = 3;
export declare const StatsbeatResourceProvider: {
    appsvc: string;
    aks: string;
    functions: string;
    vm: string;
    unknown: string;
};
export declare enum AttachTypeName {
    INTEGRATED_AUTO = "IntegratedAuto",
    MANUAL = "Manual"
}
export declare enum StatsbeatCounter {
    SUCCESS_COUNT = "Request_Success_Count",
    FAILURE_COUNT = "Request_Failure_Count",
    RETRY_COUNT = "Retry_Count",
    THROTTLE_COUNT = "Throttle_Count",
    EXCEPTION_COUNT = "Exception_Count",
    AVERAGE_DURATION = "Request_Duration",
    READ_FAILURE_COUNT = "Read_Failure_Count",
    WRITE_FAILURE_COUNT = "Write_Failure_Count",
    ATTACH = "Attach",
    FEATURE = "Feature"
}
export declare const AIMS_URI = "http://169.254.169.254/metadata/instance/compute";
export declare const AIMS_API_VERSION = "api-version=2017-12-01";
export declare const AIMS_FORMAT = "format=json";
export declare const NON_EU_CONNECTION_STRING = "InstrumentationKey=c4a29126-a7cb-47e5-b348-11414998b11e;IngestionEndpoint=https://westus-0.in.applicationinsights.azure.com";
export declare const EU_CONNECTION_STRING = "InstrumentationKey=7dc56bab-3c0c-4e9f-9ebb-d1acadee8d0f;IngestionEndpoint=https://westeurope-5.in.applicationinsights.azure.com";
export declare const EU_ENDPOINTS: string[];
export interface CommonStatsbeatProperties {
    os: string;
    rp: string;
    cikey: string;
    runtimeVersion: string;
    language: string;
    version: string;
    attach: string;
}
export interface AttachStatsbeatProperties {
    rpId: string;
}
export interface NetworkStatsbeatProperties {
    endpoint: string;
    host: string;
}
export interface StatsbeatOptions {
    instrumentationKey: string;
    endpointUrl: string;
    networkCollectionInterval?: number;
    longCollectionInterval?: number;
    disableOfflineStorage?: boolean;
}
export interface VirtualMachineInfo {
    isVM?: boolean;
    id?: string;
    subscriptionId?: string;
    osType?: string;
}
export declare enum StatsbeatFeatureType {
    FEATURE = 0,
    INSTRUMENTATION = 1
}
/**
 * Status codes indicating that we should shutdown statsbeat
 * @internal
 */
export declare function isStatsbeatShutdownStatus(statusCode: number): boolean;
//# sourceMappingURL=types.d.ts.map