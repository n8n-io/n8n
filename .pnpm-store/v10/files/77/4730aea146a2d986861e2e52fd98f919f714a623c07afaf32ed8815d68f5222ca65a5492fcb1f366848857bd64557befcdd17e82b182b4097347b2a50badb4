import type { ApiKeyCredential } from "../../auth/credentials.js";
import type { AuthScheme } from "../../auth/schemes.js";
import type { PipelinePolicy } from "../../pipeline.js";
/**
 * Name of the API Key Authentication Policy
 */
export declare const apiKeyAuthenticationPolicyName = "apiKeyAuthenticationPolicy";
/**
 * Options for configuring the API key authentication policy
 */
export interface ApiKeyAuthenticationPolicyOptions {
    /**
     * The credential used to authenticate requests
     */
    credential: ApiKeyCredential;
    /**
     * Optional authentication schemes to use. If `authSchemes` is provided in both request and policy options, the request options will take precedence.
     */
    authSchemes?: AuthScheme[];
    /**
     * Allows for connecting to HTTP endpoints instead of enforcing HTTPS.
     * CAUTION: Never use this option in production.
     */
    allowInsecureConnection?: boolean;
}
/**
 * Gets a pipeline policy that adds API key authentication to requests
 */
export declare function apiKeyAuthenticationPolicy(options: ApiKeyAuthenticationPolicyOptions): PipelinePolicy;
//# sourceMappingURL=apiKeyAuthenticationPolicy.d.ts.map