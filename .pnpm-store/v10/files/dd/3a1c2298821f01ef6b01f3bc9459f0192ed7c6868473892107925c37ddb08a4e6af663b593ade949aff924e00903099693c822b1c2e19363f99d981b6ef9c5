/**
 * Sanitizer options
 */
export interface SanitizerOptions {
    /**
     * Header names whose values will be logged when logging is enabled.
     * Defaults include a list of well-known safe headers. Any headers
     * specified in this field will be added to that list.  Any other values will
     * be written to logs as "REDACTED".
     */
    additionalAllowedHeaderNames?: string[];
    /**
     * Query string names whose values will be logged when logging is enabled. By default no
     * query string values are logged.
     */
    additionalAllowedQueryParameters?: string[];
}
/**
 * A utility class to sanitize objects for logging.
 */
export declare class Sanitizer {
    private allowedHeaderNames;
    private allowedQueryParameters;
    constructor({ additionalAllowedHeaderNames: allowedHeaderNames, additionalAllowedQueryParameters: allowedQueryParameters, }?: SanitizerOptions);
    /**
     * Sanitizes an object for logging.
     * @param obj - The object to sanitize
     * @returns - The sanitized object as a string
     */
    sanitize(obj: unknown): string;
    /**
     * Sanitizes a URL for logging.
     * @param value - The URL to sanitize
     * @returns - The sanitized URL as a string
     */
    sanitizeUrl(value: string): string;
    private sanitizeHeaders;
    private sanitizeQuery;
}
//# sourceMappingURL=sanitizer.d.ts.map