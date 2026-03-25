import { CommonEndSessionRequest } from "@azure/msal-common/browser";
/**
 * EndSessionRequest
 * - account                - Account object that will be logged out of. All tokens tied to this account will be cleared.
 * - postLogoutRedirectUri  - URI to navigate to after logout page.
 * - authority              - Authority to send logout request to.
 * - correlationId          - Unique GUID set per request to trace a request end-to-end for telemetry purposes.
 * - idTokenHint            - ID Token used by B2C to validate logout if required by the policy
 * - onRedirectNavigate     - Callback that will be passed the url that MSAL will navigate to. Returning false in the callback will stop navigation.
 * - logoutHint             - A string that specifies the account that is being logged out in order to skip the server account picker on logout
 */
export type EndSessionRequest = Partial<Omit<CommonEndSessionRequest, "tokenQueryParameters">> & {
    authority?: string;
    onRedirectNavigate?: (url: string) => boolean | void;
};
//# sourceMappingURL=EndSessionRequest.d.ts.map