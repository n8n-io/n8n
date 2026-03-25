import type { OAuth2Flow } from "../../auth/oauth2Flows.js";
import type { OAuth2TokenCredential } from "../../auth/credentials.js";
import type { AuthScheme } from "../../auth/schemes.js";
import type { PipelinePolicy } from "../../pipeline.js";
/**
 * Name of the OAuth2 Authentication Policy
 */
export declare const oauth2AuthenticationPolicyName = "oauth2AuthenticationPolicy";
/**
 * Options for configuring the OAuth2 authentication policy
 */
export interface OAuth2AuthenticationPolicyOptions<TFlows extends OAuth2Flow> {
    /**
     * The OAuth2TokenCredential implementation that can supply the bearer token.
     */
    credential: OAuth2TokenCredential<TFlows>;
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
 * Gets a pipeline policy that adds authorization header from OAuth2 schemes
 */
export declare function oauth2AuthenticationPolicy<TFlows extends OAuth2Flow>(options: OAuth2AuthenticationPolicyOptions<TFlows>): PipelinePolicy;
//# sourceMappingURL=oauth2AuthenticationPolicy.d.ts.map