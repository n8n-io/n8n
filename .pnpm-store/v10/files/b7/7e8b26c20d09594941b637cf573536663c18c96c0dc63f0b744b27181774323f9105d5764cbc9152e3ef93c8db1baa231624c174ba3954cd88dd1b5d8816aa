import type { PipelinePolicy } from "../pipeline.js";
/**
 * The programmatic identifier of the tracingPolicy.
 */
export declare const tracingPolicyName = "tracingPolicy";
/**
 * Options to configure the tracing policy.
 */
export interface TracingPolicyOptions {
    /**
     * String prefix to add to the user agent logged as metadata
     * on the generated Span.
     * Defaults to an empty string.
     */
    userAgentPrefix?: string;
    /**
     * Query string names whose values will be logged when logging is enabled. By default no
     * query string values are logged.
     */
    additionalAllowedQueryParameters?: string[];
}
/**
 * A simple policy to create OpenTelemetry Spans for each request made by the pipeline
 * that has SpanOptions with a parent.
 * Requests made without a parent Span will not be recorded.
 * @param options - Options to configure the telemetry logged by the tracing policy.
 */
export declare function tracingPolicy(options?: TracingPolicyOptions): PipelinePolicy;
//# sourceMappingURL=tracingPolicy.d.ts.map