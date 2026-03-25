/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { AccountInfo, CommonSilentFlowRequest } from "@azure/msal-common/node";

/**
 * SilentFlow parameters passed by the user to retrieve credentials silently
 * - scopes                 - Array of scopes the application is requesting access to.
 * - claims                 - A stringified claims request which will be added to all /authorize and /token calls. When included on a silent request, cache lookup will be skipped and token will be refreshed.
 * - authority              - Url of the authority which the application acquires tokens from.
 * - correlationId          - Unique GUID set per request to trace a request end-to-end for telemetry purposes.
 * - tokenQueryParameters   - String to string map of custom query parameters added to the /token call
 * - account                - Account entity to lookup the credentials.
 * - forceRefresh           - Forces silent requests to make network calls if true.
 * @public
 */
export type SilentFlowRequest = Partial<
    Omit<
        CommonSilentFlowRequest,
        "account" | "scopes" | "requestedClaimsHash" | "storeInCache"
    >
> & {
    account: AccountInfo;
    scopes: Array<string>;
};
