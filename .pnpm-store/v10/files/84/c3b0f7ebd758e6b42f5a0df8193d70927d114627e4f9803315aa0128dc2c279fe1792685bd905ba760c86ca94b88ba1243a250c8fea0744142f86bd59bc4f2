import type { AccessToken, GetTokenOptions, TokenCredential } from "@azure/core-auth";
import type { AzureLogger } from "@azure/logger";
import type { PipelineRequest, PipelineResponse } from "../interfaces.js";
import type { PipelinePolicy } from "../pipeline.js";
/**
 * The programmatic identifier of the bearerTokenAuthenticationPolicy.
 */
export declare const bearerTokenAuthenticationPolicyName = "bearerTokenAuthenticationPolicy";
/**
 * Options sent to the authorizeRequest callback
 */
export interface AuthorizeRequestOptions {
    /**
     * The scopes for which the bearer token applies.
     */
    scopes: string[];
    /**
     * Function that retrieves either a cached access token or a new access token.
     */
    getAccessToken: (scopes: string[], options: GetTokenOptions) => Promise<AccessToken | null>;
    /**
     * Request that the policy is trying to fulfill.
     */
    request: PipelineRequest;
    /**
     * A logger, if one was sent through the HTTP pipeline.
     */
    logger?: AzureLogger;
}
/**
 * Options sent to the authorizeRequestOnChallenge callback
 */
export interface AuthorizeRequestOnChallengeOptions {
    /**
     * The scopes for which the bearer token applies.
     */
    scopes: string[];
    /**
     * Function that retrieves either a cached access token or a new access token.
     */
    getAccessToken: (scopes: string[], options: GetTokenOptions) => Promise<AccessToken | null>;
    /**
     * Request that the policy is trying to fulfill.
     */
    request: PipelineRequest;
    /**
     * Response containing the challenge.
     */
    response: PipelineResponse;
    /**
     * A logger, if one was sent through the HTTP pipeline.
     */
    logger?: AzureLogger;
}
/**
 * Options to override the processing of [Continuous Access Evaluation](https://learn.microsoft.com/azure/active-directory/conditional-access/concept-continuous-access-evaluation) challenges.
 */
export interface ChallengeCallbacks {
    /**
     * Allows for the authorization of the main request of this policy before it's sent.
     */
    authorizeRequest?(options: AuthorizeRequestOptions): Promise<void>;
    /**
     * Allows to handle authentication challenges and to re-authorize the request.
     * The response containing the challenge is `options.response`.
     * If this method returns true, the underlying request will be sent once again.
     * The request may be modified before being sent.
     */
    authorizeRequestOnChallenge?(options: AuthorizeRequestOnChallengeOptions): Promise<boolean>;
}
/**
 * Options to configure the bearerTokenAuthenticationPolicy
 */
export interface BearerTokenAuthenticationPolicyOptions {
    /**
     * The TokenCredential implementation that can supply the bearer token.
     */
    credential?: TokenCredential;
    /**
     * The scopes for which the bearer token applies.
     */
    scopes: string | string[];
    /**
     * Allows for the processing of [Continuous Access Evaluation](https://learn.microsoft.com/azure/active-directory/conditional-access/concept-continuous-access-evaluation) challenges.
     * If provided, it must contain at least the `authorizeRequestOnChallenge` method.
     * If provided, after a request is sent, if it has a challenge, it can be processed to re-send the original request with the relevant challenge information.
     */
    challengeCallbacks?: ChallengeCallbacks;
    /**
     * A logger can be sent for debugging purposes.
     */
    logger?: AzureLogger;
}
/**
 * A policy that can request a token from a TokenCredential implementation and
 * then apply it to the Authorization header of a request as a Bearer token.
 */
export declare function bearerTokenAuthenticationPolicy(options: BearerTokenAuthenticationPolicyOptions): PipelinePolicy;
/**
 *
 * Interface to represent a parsed challenge.
 *
 * @internal
 */
interface AuthChallenge {
    scheme: string;
    params: Record<string, string>;
}
/**
 * Converts: `Bearer a="b", c="d", Pop e="f", g="h"`.
 * Into: `[ { scheme: 'Bearer', params: { a: 'b', c: 'd' } }, { scheme: 'Pop', params: { e: 'f', g: 'h' } } ]`.
 *
 * @internal
 */
export declare function parseChallenges(challenges: string): AuthChallenge[];
export {};
//# sourceMappingURL=bearerTokenAuthenticationPolicy.d.ts.map