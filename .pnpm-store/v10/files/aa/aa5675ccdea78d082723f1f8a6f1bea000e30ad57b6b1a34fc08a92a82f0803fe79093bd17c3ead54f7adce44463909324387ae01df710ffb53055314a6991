import { BaseAuthRequest } from "./BaseAuthRequest.js";
/**
 * - scopes                  - Array of scopes the application is requesting access to.
 * - authority               - URL of the authority, the security token service (STS) from which MSAL will acquire tokens.
 * - correlationId           - Unique GUID set per request to trace a request end-to-end for telemetry purposes.
 * - oboAssertion            - The access token that was sent to the middle-tier API. This token must have an audience of the app making this OBO request.
 * - skipCache               - Skip token cache lookup and force request to authority to get a a new token. Defaults to false.
 * - tokenQueryParameters    - String to string map of custom query parameters added to the /token call
 */
export type CommonOnBehalfOfRequest = BaseAuthRequest & {
    oboAssertion: string;
    skipCache?: boolean;
};
//# sourceMappingURL=CommonOnBehalfOfRequest.d.ts.map