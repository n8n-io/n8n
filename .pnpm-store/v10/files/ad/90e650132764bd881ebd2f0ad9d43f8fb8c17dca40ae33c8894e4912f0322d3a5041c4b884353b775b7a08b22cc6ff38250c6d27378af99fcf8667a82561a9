// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { parseWWWAuthenticate } from "./parseWWWAuthenticate";
function verifyChallengeResource(scope, request) {
    let scopeAsUrl;
    try {
        scopeAsUrl = new URL(scope);
    }
    catch (e) {
        throw new Error(`The challenge contains invalid scope '${scope}'`);
    }
    const requestUrl = new URL(request.url);
    if (!requestUrl.hostname.endsWith(`.${scopeAsUrl.hostname}`)) {
        throw new Error(`The challenge resource '${scopeAsUrl.hostname}' does not match the requested domain. Set disableChallengeResourceVerification to true in your client options to disable. See https://aka.ms/azsdk/blog/vault-uri for more information.`);
    }
}
/**
 * @internal
 *
 * Creates challenge callback handlers to manage CAE lifecycle in Azure Key Vault.
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
export function createChallengeCallbacks({ disableChallengeResourceVerification, } = {}) {
    let challengeState = { status: "none" };
    function requestToOptions(request) {
        return {
            abortSignal: request.abortSignal,
            requestOptions: {
                timeout: request.timeout,
            },
            tracingOptions: request.tracingOptions,
        };
    }
    async function authorizeRequest(options) {
        const { request } = options;
        const requestOptions = requestToOptions(request);
        switch (challengeState.status) {
            case "none":
                challengeState = {
                    status: "started",
                    originalBody: request.body,
                };
                request.body = null;
                break;
            case "started":
                break; // Retry, we should not overwrite the original body
            case "complete": {
                const token = await options.getAccessToken(challengeState.scopes, requestOptions);
                if (token) {
                    request.headers.set("authorization", `Bearer ${token.token}`);
                }
                break;
            }
        }
        return Promise.resolve();
    }
    async function authorizeRequestOnChallenge(options) {
        const { request, response } = options;
        if (request.body === null && challengeState.status === "started") {
            // Reset the original body before doing anything else.
            // Note: If successful status will be "complete", otherwise "none" will
            // restart the process.
            request.body = challengeState.originalBody;
        }
        const getTokenOptions = requestToOptions(request);
        const challenge = response.headers.get("WWW-Authenticate");
        if (!challenge) {
            throw new Error("Missing challenge.");
        }
        const parsedChallenge = parseWWWAuthenticate(challenge) || {};
        const scope = parsedChallenge.resource
            ? parsedChallenge.resource + "/.default"
            : parsedChallenge.scope;
        if (!scope) {
            throw new Error("Missing scope.");
        }
        if (!disableChallengeResourceVerification) {
            verifyChallengeResource(scope, request);
        }
        const accessToken = await options.getAccessToken([scope], Object.assign(Object.assign({}, getTokenOptions), { tenantId: parsedChallenge.tenantId }));
        if (!accessToken) {
            return false;
        }
        options.request.headers.set("Authorization", `Bearer ${accessToken.token}`);
        challengeState = {
            status: "complete",
            scopes: [scope],
        };
        return true;
    }
    return {
        authorizeRequest,
        authorizeRequestOnChallenge,
    };
}
//# sourceMappingURL=challengeBasedAuthenticationPolicy.js.map