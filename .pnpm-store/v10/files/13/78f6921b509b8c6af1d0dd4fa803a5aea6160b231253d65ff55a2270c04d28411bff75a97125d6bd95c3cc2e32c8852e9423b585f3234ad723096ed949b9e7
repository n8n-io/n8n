/**
 * Interface for handling error
 */
export declare class OTLPExporterError extends Error {
    readonly code?: number;
    readonly name: string;
    readonly data?: string;
    constructor(message?: string, code?: number, data?: string);
}
/**
 * Interface for handling export service errors
 */
export interface ExportServiceError {
    name: string;
    code: number;
    details: string;
    metadata: {
        [key: string]: unknown;
    };
    message: string;
    stack: string;
}
/**
 * Collector Exporter base config
 */
export interface OTLPExporterConfigBase {
    headers?: Partial<Record<string, unknown>>;
    hostname?: string;
    url?: string;
    concurrencyLimit?: number;
    /** Maximum time the OTLP exporter will wait for each batch export.
     * The default value is 10000ms. */
    timeoutMillis?: number;
}
//# sourceMappingURL=types.d.ts.map