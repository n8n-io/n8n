import type { Debugger } from "@azure/logger";
import type { PipelinePolicy } from "../pipeline.js";
/**
 * The programmatic identifier of the logPolicy.
 */
export declare const logPolicyName = "logPolicy";
/**
 * Options to configure the logPolicy.
 */
export interface LogPolicyOptions {
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
    /**
     * The log function to use for writing pipeline logs.
     * Defaults to core-http's built-in logger.
     * Compatible with the `debug` library.
     */
    logger?: Debugger;
}
/**
 * A policy that logs all requests and responses.
 * @param options - Options to configure logPolicy.
 */
export declare function logPolicy(options?: LogPolicyOptions): PipelinePolicy;
//# sourceMappingURL=logPolicy.d.ts.map