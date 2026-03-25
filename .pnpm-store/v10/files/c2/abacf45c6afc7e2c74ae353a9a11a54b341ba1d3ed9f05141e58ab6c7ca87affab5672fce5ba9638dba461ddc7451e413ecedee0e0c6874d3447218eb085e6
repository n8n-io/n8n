import type { BearerTokenCredential } from "../../auth/credentials.js";
import type { AuthScheme } from "../../auth/schemes.js";
import type { PipelinePolicy } from "../../pipeline.js";
/**
 * Name of the Bearer Authentication Policy
 */
export declare const bearerAuthenticationPolicyName = "bearerAuthenticationPolicy";
/**
 * Options for configuring the bearer authentication policy
 */
export interface BearerAuthenticationPolicyOptions {
    /**
     * The BearerTokenCredential implementation that can supply the bearer token.
     */
    credential: BearerTokenCredential;
    /**
     * Optional authentication schemes to use. If not provided, schemes from the request will be used.
     */
    authSchemes?: AuthScheme[];
    /**
     * Allows for connecting to HTTP endpoints instead of enforcing HTTPS.
     * CAUTION: Never use this option in production.
     */
    allowInsecureConnection?: boolean;
}
/**
 * Gets a pipeline policy that adds bearer token authentication to requests
 */
export declare function bearerAuthenticationPolicy(options: BearerAuthenticationPolicyOptions): PipelinePolicy;
//# sourceMappingURL=bearerAuthenticationPolicy.d.ts.map