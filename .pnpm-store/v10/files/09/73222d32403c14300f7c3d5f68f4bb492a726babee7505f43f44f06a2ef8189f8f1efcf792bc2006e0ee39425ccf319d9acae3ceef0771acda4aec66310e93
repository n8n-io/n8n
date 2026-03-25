"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeRequestOnTenantChallenge = void 0;
/**
 * A set of constants used internally when processing requests.
 */
const Constants = {
    DefaultScope: "/.default",
    /**
     * Defines constants for use with HTTP headers.
     */
    HeaderConstants: {
        /**
         * The Authorization header.
         */
        AUTHORIZATION: "authorization",
    },
};
function isUuid(text) {
    return /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/.test(text);
}
/**
 * Defines a callback to handle auth challenge for Storage APIs.
 * This implements the bearer challenge process described here: https://docs.microsoft.com/rest/api/storageservices/authorize-with-azure-active-directory#bearer-challenge
 * Handling has specific features for storage that departs to the general AAD challenge docs.
 **/
const authorizeRequestOnTenantChallenge = async (challengeOptions) => {
    const requestOptions = requestToOptions(challengeOptions.request);
    const challenge = getChallenge(challengeOptions.response);
    if (challenge) {
        const challengeInfo = parseChallenge(challenge);
        const challengeScopes = buildScopes(challengeOptions, challengeInfo);
        const tenantId = extractTenantId(challengeInfo);
        if (!tenantId) {
            return false;
        }
        const accessToken = await challengeOptions.getAccessToken(challengeScopes, Object.assign(Object.assign({}, requestOptions), { tenantId }));
        if (!accessToken) {
            return false;
        }
        challengeOptions.request.headers.set(Constants.HeaderConstants.AUTHORIZATION, `Bearer ${accessToken.token}`);
        return true;
    }
    return false;
};
exports.authorizeRequestOnTenantChallenge = authorizeRequestOnTenantChallenge;
/**
 * Extracts the tenant id from the challenge information
 * The tenant id is contained in the authorization_uri as the first
 * path part.
 */
function extractTenantId(challengeInfo) {
    const parsedAuthUri = new URL(challengeInfo.authorization_uri);
    const pathSegments = parsedAuthUri.pathname.split("/");
    const tenantId = pathSegments[1];
    if (tenantId && isUuid(tenantId)) {
        return tenantId;
    }
    return undefined;
}
/**
 * Builds the authentication scopes based on the information that comes in the
 * challenge information. Scopes url is present in the resource_id, if it is empty
 * we keep using the original scopes.
 */
function buildScopes(challengeOptions, challengeInfo) {
    if (!challengeInfo.resource_id) {
        return challengeOptions.scopes;
    }
    const challengeScopes = new URL(challengeInfo.resource_id);
    challengeScopes.pathname = Constants.DefaultScope;
    let scope = challengeScopes.toString();
    if (scope === "https://disk.azure.com/.default") {
        // the extra slash is required by the service
        scope = "https://disk.azure.com//.default";
    }
    return [scope];
}
/**
 * We will retrieve the challenge only if the response status code was 401,
 * and if the response contained the header "WWW-Authenticate" with a non-empty value.
 */
function getChallenge(response) {
    const challenge = response.headers.get("WWW-Authenticate");
    if (response.status === 401 && challenge) {
        return challenge;
    }
    return;
}
/**
 * Converts: `Bearer a="b" c="d"`.
 * Into: `[ { a: 'b', c: 'd' }]`.
 *
 * @internal
 */
function parseChallenge(challenge) {
    const bearerChallenge = challenge.slice("Bearer ".length);
    const challengeParts = `${bearerChallenge.trim()} `.split(" ").filter((x) => x);
    const keyValuePairs = challengeParts.map((keyValue) => (([key, value]) => ({ [key]: value }))(keyValue.trim().split("=")));
    // Key-value pairs to plain object:
    return keyValuePairs.reduce((a, b) => (Object.assign(Object.assign({}, a), b)), {});
}
/**
 * Extracts the options form a Pipeline Request for later re-use
 */
function requestToOptions(request) {
    return {
        abortSignal: request.abortSignal,
        requestOptions: {
            timeout: request.timeout,
        },
        tracingOptions: request.tracingOptions,
    };
}
//# sourceMappingURL=authorizeRequestOnTenantChallenge.js.map