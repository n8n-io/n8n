import type { PipelinePolicy } from "../pipeline.js";
/**
 * The programmatic identifier of the redirectPolicy.
 */
export declare const redirectPolicyName = "redirectPolicy";
/**
 * Options for how redirect responses are handled.
 */
export interface RedirectPolicyOptions {
    /**
     * The maximum number of times the redirect URL will be tried before
     * failing.  Defaults to 20.
     */
    maxRetries?: number;
    /**
     * Whether to follow redirects to a different origin (scheme + host + port).
     * When false (the default), cross-origin redirects are not followed and the
     * redirect response is returned directly to the caller.
     * Defaults to false.
     */
    allowCrossOriginRedirects?: boolean;
}
/**
 * A policy to follow Location headers from the server in order
 * to support server-side redirection.
 * In the browser, this policy is not used.
 * @param options - Options to control policy behavior.
 */
export declare function redirectPolicy(options?: RedirectPolicyOptions): PipelinePolicy;
//# sourceMappingURL=redirectPolicy.d.ts.map