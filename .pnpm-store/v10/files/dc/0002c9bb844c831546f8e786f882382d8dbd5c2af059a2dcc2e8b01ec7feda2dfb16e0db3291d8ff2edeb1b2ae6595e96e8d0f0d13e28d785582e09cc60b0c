import { AccountInfo } from "../account/AccountInfo.js";
import { StringDict } from "../utils/MsalTypes.js";
/**
 * CommonEndSessionRequest
 * - account                - Account object that will be logged out of. All tokens tied to this account will be cleared.
 * - postLogoutRedirectUri  - URI to navigate to after logout page.
 * - correlationId          - Unique GUID set per request to trace a request end-to-end for telemetry purposes.
 * - idTokenHint            - ID Token used by B2C to validate logout if required by the policy
 * - state                  - A value included in the request to the logout endpoint which will be returned in the query string upon post logout redirection
 * - logoutHint             - A string that specifies the account that is being logged out in order to skip the server account picker on logout
 * - extraQueryParameters   - String to string map of custom query parameters added to the /authorize call
 */
export type CommonEndSessionRequest = {
    correlationId: string;
    account?: AccountInfo | null;
    postLogoutRedirectUri?: string | null;
    idTokenHint?: string;
    state?: string;
    logoutHint?: string;
    extraQueryParameters?: StringDict;
};
//# sourceMappingURL=CommonEndSessionRequest.d.ts.map