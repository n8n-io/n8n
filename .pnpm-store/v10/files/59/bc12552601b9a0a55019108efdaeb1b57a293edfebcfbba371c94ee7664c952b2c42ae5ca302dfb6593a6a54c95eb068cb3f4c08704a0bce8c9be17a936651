import { ClientAssertionCallback, CommonClientCredentialRequest } from "@azure/msal-common/node";
/**
 * CommonClientCredentialRequest
 * - scopes                  - Array of scopes the application is requesting access to. Typically contains only the .default scope for a single resource. See: https://learn.microsoft.com/azure/active-directory/develop/scopes-oidc#the-default-scope
 * - authority               - URL of the authority, the security token service (STS) from which MSAL will acquire tokens.
 * - correlationId           - Unique GUID set per request to trace a request end-to-end for telemetry purposes.
 * - skipCache               - Skip token cache lookup and force request to authority to get a a new token. Defaults to false.
 * - clientAssertion         - An assertion string or a callback function that returns an assertion string (both are Base64Url-encoded signed JWTs) used in the Client Credential flow
 * - tokenQueryParameters    - String to string map of custom query parameters added to the /token call
 * @public
 */
export type ClientCredentialRequest = Partial<Omit<CommonClientCredentialRequest, "resourceRequestMethod" | "resourceRequestUri" | "requestedClaimsHash" | "clientAssertion" | "storeInCache">> & {
    clientAssertion?: string | ClientAssertionCallback;
};
//# sourceMappingURL=ClientCredentialRequest.d.ts.map