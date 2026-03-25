import { type LogPolicyOptions } from "./policies/logPolicy.js";
import { type Pipeline } from "./pipeline.js";
import type { Agent, PipelineRetryOptions, ProxySettings, TlsSettings } from "./interfaces.js";
import { type RedirectPolicyOptions } from "./policies/redirectPolicy.js";
import { type UserAgentPolicyOptions } from "./policies/userAgentPolicy.js";
/**
 * Defines options that are used to configure the HTTP pipeline for
 * an SDK client.
 */
export interface PipelineOptions {
    /**
     * Options that control how to retry failed requests.
     */
    retryOptions?: PipelineRetryOptions;
    /**
     * Options to configure a proxy for outgoing requests.
     */
    proxyOptions?: ProxySettings;
    /** Options for configuring Agent instance for outgoing requests */
    agent?: Agent;
    /** Options for configuring TLS authentication */
    tlsOptions?: TlsSettings;
    /**
     * Options for how redirect responses are handled.
     */
    redirectOptions?: RedirectPolicyOptions;
    /**
     * Options for adding user agent details to outgoing requests.
     */
    userAgentOptions?: UserAgentPolicyOptions;
    /**
     * Options for setting common telemetry and tracing info to outgoing requests.
     */
    telemetryOptions?: TelemetryOptions;
}
/**
 * Defines options that are used to configure common telemetry and tracing info
 */
export interface TelemetryOptions {
    /**
     * The name of the header to pass the request ID to.
     */
    clientRequestIdHeaderName?: string;
}
/**
 * Defines options that are used to configure internal options of
 * the HTTP pipeline for an SDK client.
 */
export interface InternalPipelineOptions extends PipelineOptions {
    /**
     * Options to configure request/response logging.
     */
    loggingOptions?: LogPolicyOptions;
}
/**
 * Create a new pipeline with a default set of customizable policies.
 * @param options - Options to configure a custom pipeline.
 */
export declare function createPipelineFromOptions(options: InternalPipelineOptions): Pipeline;
//# sourceMappingURL=createPipelineFromOptions.d.ts.map