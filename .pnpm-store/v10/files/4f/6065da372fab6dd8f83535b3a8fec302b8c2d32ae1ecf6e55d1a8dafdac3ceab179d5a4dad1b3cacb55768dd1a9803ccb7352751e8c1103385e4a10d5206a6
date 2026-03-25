/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { BaseAuthRequest } from "./BaseAuthRequest.js";
import { CcsCredential } from "../account/CcsCredential.js";

/**
 * Request object passed by user to acquire a token from the server exchanging a valid authorization code (second leg of OAuth2.0 Authorization Code flow)
 *
 * - scopes                  - Array of scopes the application is requesting access to.
 * - claims                  - A stringified claims request which will be added to all /authorize and /token calls
 * - authority:              - URL of the authority, the security token service (STS) from which MSAL will acquire tokens. If authority is set on client application object, this will override that value. Overriding the value will cause for authority validation to happen each time. If the same authority will be used for all request, set on the application object instead of the requests.
 * - correlationId           - Unique GUID set per request to trace a request end-to-end for telemetry purposes.
 * - redirectUri             - The redirect URI of your app, where the authority will redirect to after the user inputs credentials and consents. It must exactly match one of the redirect URIs you registered in the portal
 * - code                    - The authorization_code that the user acquired in the first leg of the flow.
 * - codeVerifier            - The same code_verifier that was used to obtain the authorization_code. Required if PKCE was used in the authorization code grant request.For more information, see the PKCE RFC: https://tools.ietf.org/html/rfc7636
 * - resourceRequestMethod   - HTTP Request type used to request data from the resource (i.e. "GET", "POST", etc.).  Used for proof-of-possession flows.
 * - resourceRequestUri      - URI that token will be used for. Used for proof-of-possession flows.
 * - enableSpaAuthCode       - Enables the acqusition of a spa authorization code (confidential clients only)
 * - tokenQueryParameters    - String to string map of custom query parameters added to the /token call
 */
export type CommonAuthorizationCodeRequest = BaseAuthRequest & {
    code: string;
    redirectUri: string;
    codeVerifier?: string;
    enableSpaAuthorizationCode?: boolean;
    clientInfo?: string;
    ccsCredential?: CcsCredential;
};
