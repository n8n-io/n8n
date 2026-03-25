// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { createTokenCycler } from "../util/tokenCycler.js";
import { logger as coreLogger } from "../log.js";
import { isRestError } from "../restError.js";
/**
 * The programmatic identifier of the bearerTokenAuthenticationPolicy.
 */
export const bearerTokenAuthenticationPolicyName = "bearerTokenAuthenticationPolicy";
/**
 * Try to send the given request.
 *
 * When a response is received, returns a tuple of the response received and, if the response was received
 * inside a thrown RestError, the RestError that was thrown.
 *
 * Otherwise, if an error was thrown while sending the request that did not provide an underlying response, it
 * will be rethrown.
 */
async function trySendRequest(request, next) {
    try {
        return [await next(request), undefined];
    }
    catch (e) {
        if (isRestError(e) && e.response) {
            return [e.response, e];
        }
        else {
            throw e;
        }
    }
}
/**
 * Default authorize request handler
 */
async function defaultAuthorizeRequest(options) {
    const { scopes, getAccessToken, request } = options;
    // Enable CAE true by default
    const getTokenOptions = {
        abortSignal: request.abortSignal,
        tracingOptions: request.tracingOptions,
        enableCae: true,
    };
    const accessToken = await getAccessToken(scopes, getTokenOptions);
    if (accessToken) {
        options.request.headers.set("Authorization", `Bearer ${accessToken.token}`);
    }
}
/**
 * We will retrieve the challenge only if the response status code was 401,
 * and if the response contained the header "WWW-Authenticate" with a non-empty value.
 */
function isChallengeResponse(response) {
    return response.status === 401 && response.headers.has("WWW-Authenticate");
}
/**
 * Re-authorize the request for CAE challenge.
 * The response containing the challenge is `options.response`.
 * If this method returns true, the underlying request will be sent once again.
 */
async function authorizeRequestOnCaeChallenge(onChallengeOptions, caeClaims) {
    var _a;
    const { scopes } = onChallengeOptions;
    const accessToken = await onChallengeOptions.getAccessToken(scopes, {
        enableCae: true,
        claims: caeClaims,
    });
    if (!accessToken) {
        return false;
    }
    onChallengeOptions.request.headers.set("Authorization", `${(_a = accessToken.tokenType) !== null && _a !== void 0 ? _a : "Bearer"} ${accessToken.token}`);
    return true;
}
/**
 * A policy that can request a token from a TokenCredential implementation and
 * then apply it to the Authorization header of a request as a Bearer token.
 */
export function bearerTokenAuthenticationPolicy(options) {
    var _a, _b, _c;
    const { credential, scopes, challengeCallbacks } = options;
    const logger = options.logger || coreLogger;
    const callbacks = {
        authorizeRequest: (_b = (_a = challengeCallbacks === null || challengeCallbacks === void 0 ? void 0 : challengeCallbacks.authorizeRequest) === null || _a === void 0 ? void 0 : _a.bind(challengeCallbacks)) !== null && _b !== void 0 ? _b : defaultAuthorizeRequest,
        authorizeRequestOnChallenge: (_c = challengeCallbacks === null || challengeCallbacks === void 0 ? void 0 : challengeCallbacks.authorizeRequestOnChallenge) === null || _c === void 0 ? void 0 : _c.bind(challengeCallbacks),
    };
    // This function encapsulates the entire process of reliably retrieving the token
    // The options are left out of the public API until there's demand to configure this.
    // Remember to extend `BearerTokenAuthenticationPolicyOptions` with `TokenCyclerOptions`
    // in order to pass through the `options` object.
    const getAccessToken = credential
        ? createTokenCycler(credential /* , options */)
        : () => Promise.resolve(null);
    return {
        name: bearerTokenAuthenticationPolicyName,
        /**
         * If there's no challenge parameter:
         * - It will try to retrieve the token using the cache, or the credential's getToken.
         * - Then it will try the next policy with or without the retrieved token.
         *
         * It uses the challenge parameters to:
         * - Skip a first attempt to get the token from the credential if there's no cached token,
         *   since it expects the token to be retrievable only after the challenge.
         * - Prepare the outgoing request if the `prepareRequest` method has been provided.
         * - Send an initial request to receive the challenge if it fails.
         * - Process a challenge if the response contains it.
         * - Retrieve a token with the challenge information, then re-send the request.
         */
        async sendRequest(request, next) {
            if (!request.url.toLowerCase().startsWith("https://")) {
                throw new Error("Bearer token authentication is not permitted for non-TLS protected (non-https) URLs.");
            }
            await callbacks.authorizeRequest({
                scopes: Array.isArray(scopes) ? scopes : [scopes],
                request,
                getAccessToken,
                logger,
            });
            let response;
            let error;
            let shouldSendRequest;
            [response, error] = await trySendRequest(request, next);
            if (isChallengeResponse(response)) {
                let claims = getCaeChallengeClaims(response.headers.get("WWW-Authenticate"));
                // Handle CAE by default when receive CAE claim
                if (claims) {
                    let parsedClaim;
                    // Return the response immediately if claims is not a valid base64 encoded string
                    try {
                        parsedClaim = atob(claims);
                    }
                    catch (e) {
                        logger.warning(`The WWW-Authenticate header contains "claims" that cannot be parsed. Unable to perform the Continuous Access Evaluation authentication flow. Unparsable claims: ${claims}`);
                        return response;
                    }
                    shouldSendRequest = await authorizeRequestOnCaeChallenge({
                        scopes: Array.isArray(scopes) ? scopes : [scopes],
                        response,
                        request,
                        getAccessToken,
                        logger,
                    }, parsedClaim);
                    // Send updated request and handle response for RestError
                    if (shouldSendRequest) {
                        [response, error] = await trySendRequest(request, next);
                    }
                }
                else if (callbacks.authorizeRequestOnChallenge) {
                    // Handle custom challenges when client provides custom callback
                    shouldSendRequest = await callbacks.authorizeRequestOnChallenge({
                        scopes: Array.isArray(scopes) ? scopes : [scopes],
                        request,
                        response,
                        getAccessToken,
                        logger,
                    });
                    // Send updated request and handle response for RestError
                    if (shouldSendRequest) {
                        [response, error] = await trySendRequest(request, next);
                    }
                    // If we get another CAE Claim, we will handle it by default and return whatever value we receive for this
                    if (isChallengeResponse(response)) {
                        claims = getCaeChallengeClaims(response.headers.get("WWW-Authenticate"));
                        if (claims) {
                            let parsedClaim;
                            try {
                                parsedClaim = atob(claims);
                            }
                            catch (e) {
                                logger.warning(`The WWW-Authenticate header contains "claims" that cannot be parsed. Unable to perform the Continuous Access Evaluation authentication flow. Unparsable claims: ${claims}`);
                                return response;
                            }
                            shouldSendRequest = await authorizeRequestOnCaeChallenge({
                                scopes: Array.isArray(scopes) ? scopes : [scopes],
                                response,
                                request,
                                getAccessToken,
                                logger,
                            }, parsedClaim);
                            // Send updated request and handle response for RestError
                            if (shouldSendRequest) {
                                [response, error] = await trySendRequest(request, next);
                            }
                        }
                    }
                }
            }
            if (error) {
                throw error;
            }
            else {
                return response;
            }
        },
    };
}
/**
 * Converts: `Bearer a="b", c="d", Pop e="f", g="h"`.
 * Into: `[ { scheme: 'Bearer', params: { a: 'b', c: 'd' } }, { scheme: 'Pop', params: { e: 'f', g: 'h' } } ]`.
 *
 * @internal
 */
export function parseChallenges(challenges) {
    // Challenge regex seperates the string to individual challenges with different schemes in the format `Scheme a="b", c=d`
    // The challenge regex captures parameteres with either quotes values or unquoted values
    const challengeRegex = /(\w+)\s+((?:\w+=(?:"[^"]*"|[^,]*),?\s*)+)/g;
    // Parameter regex captures the claims group removed from the scheme in the format `a="b"` and `c="d"`
    // CAE challenge always have quoted parameters. For more reference, https://learn.microsoft.com/entra/identity-platform/claims-challenge
    const paramRegex = /(\w+)="([^"]*)"/g;
    const parsedChallenges = [];
    let match;
    // Iterate over each challenge match
    while ((match = challengeRegex.exec(challenges)) !== null) {
        const scheme = match[1];
        const paramsString = match[2];
        const params = {};
        let paramMatch;
        // Iterate over each parameter match
        while ((paramMatch = paramRegex.exec(paramsString)) !== null) {
            params[paramMatch[1]] = paramMatch[2];
        }
        parsedChallenges.push({ scheme, params });
    }
    return parsedChallenges;
}
/**
 * Parse a pipeline response and look for a CAE challenge with "Bearer" scheme
 * Return the value in the header without parsing the challenge
 * @internal
 */
function getCaeChallengeClaims(challenges) {
    var _a;
    if (!challenges) {
        return;
    }
    // Find all challenges present in the header
    const parsedChallenges = parseChallenges(challenges);
    return (_a = parsedChallenges.find((x) => x.scheme === "Bearer" && x.params.claims && x.params.error === "insufficient_claims")) === null || _a === void 0 ? void 0 : _a.params.claims;
}
//# sourceMappingURL=bearerTokenAuthenticationPolicy.js.map