import type { AccessToken, GetTokenOptions, TokenCredential } from "@azure/core-auth";
import type { UsernamePasswordCredentialOptions } from "./usernamePasswordCredentialOptions.js";
/**
 * Enables authentication to Microsoft Entra ID with a user's
 * username and password. This credential requires a high degree of
 * trust so you should only use it when other, more secure credential
 * types can't be used.
 * @deprecated UsernamePasswordCredential is deprecated. Use a more secure credential. See https://aka.ms/azsdk/identity/mfa for details.
 */
export declare class UsernamePasswordCredential implements TokenCredential {
    private tenantId;
    private additionallyAllowedTenantIds;
    private msalClient;
    private username;
    private password;
    /**
     * Creates an instance of the UsernamePasswordCredential with the details
     * needed to authenticate against Microsoft Entra ID with a username
     * and password.
     *
     * @param tenantId - The Microsoft Entra tenant (directory).
     * @param clientId - The client (application) ID of an App Registration in the tenant.
     * @param username - The user account's e-mail address (user name).
     * @param password - The user account's account password
     * @param options - Options for configuring the client which makes the authentication request.
     */
    constructor(tenantId: string, clientId: string, username: string, password: string, options?: UsernamePasswordCredentialOptions);
    /**
     * Authenticates with Microsoft Entra ID and returns an access token if successful.
     * If authentication fails, a {@link CredentialUnavailableError} will be thrown with the details of the failure.
     *
     * If the user provided the option `disableAutomaticAuthentication`,
     * once the token can't be retrieved silently,
     * this method won't attempt to request user interaction to retrieve the token.
     *
     * @param scopes - The list of scopes for which the token will have access.
     * @param options - The options used to configure any requests this
     *                TokenCredential implementation might make.
     */
    getToken(scopes: string | string[], options?: GetTokenOptions): Promise<AccessToken>;
}
//# sourceMappingURL=usernamePasswordCredential.d.ts.map