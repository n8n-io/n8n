/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    AccountInfo,
    CommonSilentFlowRequest,
    StringDict,
} from "@azure/msal-common/browser";
import { CacheLookupPolicy } from "../utils/BrowserConstants.js";

/**
 * SilentRequest: Request object passed by user to retrieve tokens from the
 * cache, renew an expired token with a refresh token, or retrieve a code (first leg of authorization code grant flow)
 * in a hidden iframe.
 *
 * - scopes                 - Array of scopes the application is requesting access to.
 * - authority              - Url of the authority which the application acquires tokens from.
 * - correlationId          - Unique GUID set per request to trace a request end-to-end for telemetry purposes.
 * - account                - Account entity to lookup the credentials.
 * - forceRefresh           - Forces silent requests to make network calls if true.
 * - extraQueryParameters   - String to string map of custom query parameters added to the /authorize call. Only used when renewing the refresh token.
 * - tokenBodyParameters    - String to string map of custom token request body parameters added to the /token call. Only used when renewing access tokens.
 * - tokenQueryParameters   - String to string map of custom query parameters added to the /token call. Only used when renewing access tokens.
 * - redirectUri            - The redirect URI where authentication responses can be received by your application. It must exactly match one of the redirect URIs registered in the Azure portal. Only used for cases where refresh token is expired.
 * - cacheLookupPolicy      - Enum of different ways the silent token can be retrieved.
 * - prompt                 - Indicates the type of user interaction that is required.
 *          none:  will ensure that the user isn't presented with any interactive prompt. if request can't be completed via single-sign on, the endpoint will return an interaction_required error
 *          no_session: will not read existing session token when authenticating the user. Upon user being successfully authenticated, EVO won’t create a new session for the user. FOR INTERNAL USE ONLY.
 */
export type SilentRequest = Omit<
    CommonSilentFlowRequest,
    | "authority"
    | "correlationId"
    | "forceRefresh"
    | "account"
    | "requestedClaimsHash"
> & {
    redirectUri?: string;
    extraQueryParameters?: StringDict;
    authority?: string;
    account?: AccountInfo;
    correlationId?: string;
    forceRefresh?: boolean;
    cacheLookupPolicy?: CacheLookupPolicy;
    prompt?: string;
    state?: string;
};
