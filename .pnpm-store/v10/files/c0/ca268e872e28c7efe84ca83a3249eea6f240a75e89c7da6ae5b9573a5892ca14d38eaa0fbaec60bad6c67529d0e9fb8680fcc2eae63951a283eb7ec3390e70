import { CommonUsernamePasswordRequest } from "@azure/msal-common/node";
/**
 * UsernamePassword parameters passed by the user to retrieve credentials
 * Note: The latest OAuth 2.0 Security Best Current Practice disallows the password grant entirely. This flow is added for internal testing.
 *
 * - scopes                 - Array of scopes the application is requesting access to.
 * - claims                 - A stringified claims request which will be added to all /authorize and /token calls. When included on a silent request, cache lookup will be skipped and token will be refreshed.
 * - authority              - Url of the authority which the application acquires tokens from.
 * - correlationId          - Unique GUID set per request to trace a request end-to-end for telemetry purposes.
 * - username               - username of the client
 * - password               - credentials
 * - tokenQueryParameters   - String to string map of custom query parameters added to the /token call
 * @public
 */
export type UsernamePasswordRequest = Partial<Omit<CommonUsernamePasswordRequest, "scopes" | "resourceRequestMethod" | "resourceRequestUri" | "username" | "password" | "requestedClaimsHash" | "storeInCache">> & {
    scopes: Array<string>;
    username: string;
    password: string;
};
//# sourceMappingURL=UsernamePasswordRequest.d.ts.map