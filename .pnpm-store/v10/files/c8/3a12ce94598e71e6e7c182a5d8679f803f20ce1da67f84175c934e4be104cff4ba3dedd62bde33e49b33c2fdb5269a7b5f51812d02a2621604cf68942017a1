/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { CommonOnBehalfOfRequest } from "@azure/msal-common/node";

/**
 * - scopes                  - Array of scopes the application is requesting access to.
 * - authority               - URL of the authority, the security token service (STS) from which MSAL will acquire tokens.
 * - correlationId           - Unique GUID set per request to trace a request end-to-end for telemetry purposes.
 * - oboAssertion            - The access token that was sent to the middle-tier API. This token must have an audience of the app making this OBO request.
 * - skipCache               - Skip token cache lookup and force request to authority to get a a new token. Defaults to false.
 * - tokenQueryParameters    - String to string map of custom query parameters added to the /token call
 * @public
 */
export type OnBehalfOfRequest = Partial<
    Omit<
        CommonOnBehalfOfRequest,
        | "oboAssertion"
        | "scopes"
        | "resourceRequestMethod"
        | "resourceRequestUri"
        | "requestedClaimsHash"
        | "storeInCache"
    >
> & {
    oboAssertion: string;
    scopes: Array<string>;
};
