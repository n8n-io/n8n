import { ResponseMode } from "../utils/Constants.js";
import { StringDict } from "../utils/MsalTypes.js";
import { BaseAuthRequest } from "./BaseAuthRequest.js";
import { AccountInfo } from "../account/AccountInfo.js";
/**
 * Request object passed by user to retrieve a Code from the server (first leg of authorization code grant flow)
 *
 * - scopes                     - Array of scopes the application is requesting access to.
 * - claims                     - A stringified claims request which will be added to all /authorize and /token calls
 * - authority                  - Url of the authority which the application acquires tokens from.
 * - correlationId              - Unique GUID set per request to trace a request end-to-end for telemetry purposes.
 * - redirectUri                - The redirect URI where authentication responses can be received by your application. It must exactly match one of the redirect URIs registered in the Azure portal.
 * - extraScopesToConsent       - Scopes for a different resource when the user needs consent upfront.
 * - responseMode               - Specifies the method that should be used to send the authentication result to your app. Can be query, form_post, or fragment. If no value is passed in, it defaults to query.
 * - codeChallenge              - Used to secure authorization code grant via Proof of Key for Code Exchange (PKCE). For more information, see the PKCE RCF:https://tools.ietf.org/html/rfc7636
 * - codeChallengeMethod        - The method used to encode the code verifier for the code challenge parameter. Can be "plain" or "S256". If excluded, code challenge is assumed to be plaintext. For more information, see the PKCE RCF: https://tools.ietf.org/html/rfc7636
 * - state                      - A value included in the request that is also returned in the token response. A randomly generated unique value is typically used for preventing cross site request forgery attacks. The state is also used to encode information about the user's state in the app before the authentication request occurred.
 * - prompt                     - Indicates the type of user interaction that is required.
 *          login: will force the user to enter their credentials on that request, negating single-sign on
 *          none:  will ensure that the user isn't presented with any interactive prompt. if request can't be completed via single-sign on, the endpoint will return an interaction_required error
 *          consent: will the trigger the OAuth consent dialog after the user signs in, asking the user to grant permissions to the app
 *          select_account: will interrupt single sign-=on providing account selection experience listing all the accounts in session or any remembered accounts or an option to choose to use a different account
 *          create: will direct the user to the account creation experience instead of the log in experience
 *          no_session: will not read existing session token when authenticating the user. Upon user being successfully authenticated, EVO won’t create a new session for the user. FOR INTERNAL USE ONLY.
 * - account                    - AccountInfo obtained from a getAccount API. Will be used in certain scenarios to generate login_hint if both loginHint and sid params are not provided.
 * - loginHint                  - Can be used to pre-fill the username/email address field of the sign-in page for the user, if you know the username/email address ahead of time. Often apps use this parameter during re-authentication, having already extracted the username from a previous sign-in using the preferred_username claim.
 * - sid                        - Session ID, unique identifier for the session. Available as an optional claim on ID tokens.
 * - domainHint                 - Provides a hint about the tenant or domain that the user should use to sign in. The value of the domain hint is a registered domain for the tenant.
 * - extraQueryParameters       - String to string map of custom query parameters added to the /authorize call
 * - tokenQueryParameters       - String to string map of custom query parameters added to the /token call
 * - nonce                      - A value included in the request that is returned in the id token. A randomly generated unique value is typically used to mitigate replay attacks.
 * - resourceRequestMethod      - HTTP Request type used to request data from the resource (i.e. "GET", "POST", etc.).  Used for proof-of-possession flows.
 * - resourceRequestUri         - URI that token will be used for. Used for proof-of-possession flows.
 */
export type CommonAuthorizationUrlRequest = BaseAuthRequest & {
    redirectUri: string;
    responseMode: ResponseMode;
    account?: AccountInfo;
    earJwk?: string;
    codeChallenge?: string;
    codeChallengeMethod?: string;
    domainHint?: string;
    extraQueryParameters?: StringDict;
    extraScopesToConsent?: Array<string>;
    loginHint?: string;
    nonce: string;
    prompt?: string;
    sid?: string;
    state: string;
    platformBroker?: boolean;
};
//# sourceMappingURL=CommonAuthorizationUrlRequest.d.ts.map