/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { CommonRefreshTokenRequest } from "@azure/msal-common/node";

/**
 * CommonRefreshTokenRequest
 * - scopes                  - Array of scopes the application is requesting access to.
 * - claims                  - A stringified claims request which will be added to all /authorize and /token calls
 * - authority               - URL of the authority, the security token service (STS) from which MSAL will acquire tokens.
 * - correlationId           - Unique GUID set per request to trace a request end-to-end for telemetry purposes.
 * - refreshToken            - A refresh token returned from a previous request to the Identity provider.
 * - tokenQueryParameters    - String to string map of custom query parameters added to the /token call
 * - forceCache              - Force MSAL to cache a refresh token flow response when there is no account in the cache. Used for migration scenarios.
 * @public
 */
export type RefreshTokenRequest = Partial<
    Omit<
        CommonRefreshTokenRequest,
        | "scopes"
        | "refreshToken"
        | "authenticationScheme"
        | "resourceRequestMethod"
        | "resourceRequestUri"
        | "requestedClaimsHash"
        | "storeInCache"
    >
> & {
    scopes: Array<string>;
    refreshToken: string;
    forceCache?: boolean;
};
