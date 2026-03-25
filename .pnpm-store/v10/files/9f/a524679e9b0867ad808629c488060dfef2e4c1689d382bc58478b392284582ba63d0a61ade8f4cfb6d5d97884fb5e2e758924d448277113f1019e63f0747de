import { ServerAuthorizationTokenResponse } from "./ServerAuthorizationTokenResponse.js";
/**
 * Response object used for loading external tokens to cache.
 * - token_type: Indicates the token type value. The only type that Azure AD supports is Bearer.
 * - scope: The scopes that the access_token is valid for.
 * - expires_in: How long the access token is valid (in seconds).
 * - id_token: A JSON Web Token (JWT). The app can decode the segments of this token to request information about the user who signed in.
 * - refresh_token: An OAuth 2.0 refresh token. The app can use this token acquire additional access tokens after the current access token expires.
 * - access_token: The requested access token. The app can use this token to authenticate to the secured resource, such as a web API.
 * - client_info: Client info object
 */
export type ExternalTokenResponse = Pick<ServerAuthorizationTokenResponse, "token_type" | "scope" | "expires_in" | "ext_expires_in" | "id_token" | "refresh_token" | "refresh_token_expires_in" | "foci"> & {
    access_token?: string;
    client_info?: string;
};
//# sourceMappingURL=ExternalTokenResponse.d.ts.map