import { PipelinePolicy } from "@azure/core-rest-pipeline";
import { TokenCredential } from "@azure/core-auth";
/**
 * Additional options for the challenge based authentication policy.
 */
export interface KeyVaultAuthenticationPolicyOptions {
    /**
     * Whether to disable verification that the challenge resource matches the Key Vault or Managed HSM domain.
     *
     * Defaults to false.
     */
    disableChallengeResourceVerification?: boolean;
}
/**
 * Name of the Key Vault authentication policy.
 */
export declare const keyVaultAuthenticationPolicyName = "keyVaultAuthenticationPolicy";
/**
 * A custom implementation of the bearer-token authentication policy that handles Key Vault and CAE challenges.
 *
 * Key Vault supports other authentication schemes, but we ensure challenge authentication
 * is used by first sending a copy of the request, without authorization or content.
 *
 * when the challenge is received, it will be authenticated and used to send the original
 * request with authorization.
 *
 * Following the first request of a client, follow-up requests will get the cached token
 * if possible.
 *
 */
export declare function keyVaultAuthenticationPolicy(credential: TokenCredential, options?: KeyVaultAuthenticationPolicyOptions): PipelinePolicy;
//# sourceMappingURL=keyVaultAuthenticationPolicy.d.ts.map