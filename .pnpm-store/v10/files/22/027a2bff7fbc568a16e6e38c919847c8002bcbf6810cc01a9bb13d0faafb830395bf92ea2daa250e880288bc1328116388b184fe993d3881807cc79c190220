import { AccountInfo } from "../account/AccountInfo.js";
import { BaseAuthRequest } from "./BaseAuthRequest.js";
/**
 * SilentFlow parameters passed by the user to retrieve credentials silently
 * - scopes                 - Array of scopes the application is requesting access to.
 * - claims                 - A stringified claims request which will be added to all /authorize and /token calls. When included on a silent request, cache lookup will be skipped and token will be refreshed.
 * - authority              - Url of the authority which the application acquires tokens from.
 * - correlationId          - Unique GUID set per request to trace a request end-to-end for telemetry purposes.
 * - account                - Account entity to lookup the credentials.
 * - forceRefresh           - Forces silent requests to make network calls if true.
 * - resourceRequestMethod  - HTTP Request type used to request data from the resource (i.e. "GET", "POST", etc.).  Used for proof-of-possession flows.
 * - resourceRequestUri     - URI that token will be used for. Used for proof-of-possession flows.
 * - tokenQueryParameters   - String to string map of custom query parameters added to the /token call
 */
export type CommonSilentFlowRequest = BaseAuthRequest & {
    /** Account object to lookup the credentials */
    account: AccountInfo;
    /** Skip cache lookup and forces network call(s) to get fresh tokens */
    forceRefresh: boolean;
    /** RedirectUri registered on the app registration - only required in brokering scenarios */
    redirectUri?: string;
    /** If refresh token will expire within the configured value, consider it already expired. Used to pre-emptively invoke interaction when cached refresh token is close to expiry. */
    refreshTokenExpirationOffsetSeconds?: number;
};
//# sourceMappingURL=CommonSilentFlowRequest.d.ts.map