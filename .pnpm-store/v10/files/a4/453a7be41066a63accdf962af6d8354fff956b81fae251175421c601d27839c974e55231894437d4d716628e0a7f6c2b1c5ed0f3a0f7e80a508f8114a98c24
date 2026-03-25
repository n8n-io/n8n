import type { AccessToken, GetTokenOptions, TokenCredential } from "@azure/core-auth";
import type { ClientSecretCredentialOptions } from "./clientSecretCredentialOptions.js";
/**
 * Enables authentication to Microsoft Entra ID using a client secret
 * that was generated for an App Registration.  More information on how
 * to configure a client secret can be found here:
 *
 * https://learn.microsoft.com/en-us/azure/active-directory/develop/quickstart-configure-app-access-web-apis#add-credentials-to-your-web-application
 *
 */
export declare class ClientSecretCredential implements TokenCredential {
    private identityClient;
    private tenantId;
    private additionallyAllowedTenantIds;
    private clientId;
    private clientSecret;
    /**
     * Creates an instance of the ClientSecretCredential with the details
     * needed to authenticate against Microsoft Entra ID with a client
     * secret.
     *
     * @param tenantId - The Microsoft Entra tenant (directory) ID.
     * @param clientId - The client (application) ID of an App Registration in the tenant.
     * @param clientSecret - A client secret that was generated for the App Registration.
     * @param options - Options for configuring the client which makes the authentication request.
     */
    constructor(tenantId: string, clientId: string, clientSecret: string, options?: ClientSecretCredentialOptions);
    /**
     * Authenticates with Microsoft Entra ID and returns an access token if
     * successful.  If authentication cannot be performed at this time, this method may
     * return null.  If an error occurs during authentication, an {@link AuthenticationError}
     * containing failure details will be thrown.
     *
     * @param scopes - The list of scopes for which the token will have access.
     * @param options - The options used to configure any requests this
     *                TokenCredential implementation might make.
     */
    getToken(scopes: string | string[], options?: GetTokenOptions): Promise<AccessToken | null>;
}
//# sourceMappingURL=clientSecretCredential-browser.d.mts.map