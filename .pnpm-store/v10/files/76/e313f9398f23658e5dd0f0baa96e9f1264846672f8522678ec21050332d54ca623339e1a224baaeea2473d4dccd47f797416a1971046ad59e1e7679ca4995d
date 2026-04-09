import type { AuthorizeRequestOnChallengeOptions } from "@azure/core-rest-pipeline";
/**
 * Converts: `Bearer a="b", c="d", Bearer d="e", f="g"`.
 * Into: `[ { a: 'b', c: 'd' }, { d: 'e', f: 'g' } ]`.
 *
 * @internal
 */
export declare function parseCAEChallenge(challenges: string): any[];
/**
 * CAE Challenge structure
 */
export interface CAEChallenge {
    scope: string;
    claims: string;
}
/**
 * This function can be used as a callback for the `bearerTokenAuthenticationPolicy` of `@azure/core-rest-pipeline`, to support CAE challenges:
 * [Continuous Access Evaluation](https://learn.microsoft.com/azure/active-directory/conditional-access/concept-continuous-access-evaluation).
 *
 * Call the `bearerTokenAuthenticationPolicy` with the following options:
 *
 * ```ts snippet:AuthorizeRequestOnClaimChallenge
 * import { bearerTokenAuthenticationPolicy } from "@azure/core-rest-pipeline";
 * import { authorizeRequestOnClaimChallenge } from "@azure/core-client";
 *
 * const policy = bearerTokenAuthenticationPolicy({
 *   challengeCallbacks: {
 *     authorizeRequestOnChallenge: authorizeRequestOnClaimChallenge,
 *   },
 *   scopes: ["https://service/.default"],
 * });
 * ```
 *
 * Once provided, the `bearerTokenAuthenticationPolicy` policy will internally handle Continuous Access Evaluation (CAE) challenges.
 * When it can't complete a challenge it will return the 401 (unauthorized) response from ARM.
 *
 * Example challenge with claims:
 *
 * ```
 * Bearer authorization_uri="https://login.windows-ppe.net/", error="invalid_token",
 * error_description="User session has been revoked",
 * claims="eyJhY2Nlc3NfdG9rZW4iOnsibmJmIjp7ImVzc2VudGlhbCI6dHJ1ZSwgInZhbHVlIjoiMTYwMzc0MjgwMCJ9fX0="
 * ```
 */
export declare function authorizeRequestOnClaimChallenge(onChallengeOptions: AuthorizeRequestOnChallengeOptions): Promise<boolean>;
//# sourceMappingURL=authorizeRequestOnClaimChallenge.d.ts.map