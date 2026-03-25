import type { BasicCredential } from "../../auth/credentials.js";
import type { AuthScheme } from "../../auth/schemes.js";
import type { PipelinePolicy } from "../../pipeline.js";
/**
 * Name of the Basic Authentication Policy
 */
export declare const basicAuthenticationPolicyName = "bearerAuthenticationPolicy";
/**
 * Options for configuring the basic authentication policy
 */
export interface BasicAuthenticationPolicyOptions {
    /**
     * The credential used to authenticate requests
     */
    credential: BasicCredential;
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
 * Gets a pipeline policy that adds basic authentication to requests
 */
export declare function basicAuthenticationPolicy(options: BasicAuthenticationPolicyOptions): PipelinePolicy;
//# sourceMappingURL=basicAuthenticationPolicy.d.ts.map