import type { AccessToken, GetTokenOptions, TokenCredential } from "@azure/core-auth";
import type { AuthorizationCodeCredentialOptions } from "./authorizationCodeCredentialOptions.js";
/**
 * Enables authentication to Microsoft Entra ID using an authorization code
 * that was obtained through the authorization code flow, described in more detail
 * in the Microsoft Entra ID documentation:
 *
 * https://learn.microsoft.com/entra/identity-platform/v2-oauth2-auth-code-flow
 */
export declare class AuthorizationCodeCredential implements TokenCredential {
    private msalClient;
    private disableAutomaticAuthentication?;
    private authorizationCode;
    private redirectUri;
    private tenantId?;
    private additionallyAllowedTenantIds;
    private clientSecret?;
    /**
     * Creates an instance of AuthorizationCodeCredential with the details needed
     * to request an access token using an authentication that was obtained
     * from Microsoft Entra ID.
     *
     * It is currently necessary for the user of this credential to initiate
     * the authorization code flow to obtain an authorization code to be used
     * with this credential.  A full example of this flow is provided here:
     *
     * https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/identity/identity/samples/v2/manual/authorizationCodeSample.ts
     *
     * @param tenantId - The Microsoft Entra tenant (directory) ID or name.
     *                 'common' may be used when dealing with multi-tenant scenarios.
     * @param clientId - The client (application) ID of an App Registration in the tenant.
     * @param clientSecret - A client secret that was generated for the App Registration
     * @param authorizationCode - An authorization code that was received from following the
                                authorization code flow.  This authorization code must not
                                have already been used to obtain an access token.
     * @param redirectUri - The redirect URI that was used to request the authorization code.
                          Must be the same URI that is configured for the App Registration.
     * @param options - Options for configuring the client which makes the access token request.
     */
    constructor(tenantId: string | "common", clientId: string, clientSecret: string, authorizationCode: string, redirectUri: string, options?: AuthorizationCodeCredentialOptions);
    /**
     * Creates an instance of AuthorizationCodeCredential with the details needed
     * to request an access token using an authentication that was obtained
     * from Microsoft Entra ID.
     *
     * It is currently necessary for the user of this credential to initiate
     * the authorization code flow to obtain an authorization code to be used
     * with this credential.  A full example of this flow is provided here:
     *
     * https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/identity/identity/samples/v2/manual/authorizationCodeSample.ts
     *
     * @param tenantId - The Microsoft Entra tenant (directory) ID or name.
     *                 'common' may be used when dealing with multi-tenant scenarios.
     * @param clientId - The client (application) ID of an App Registration in the tenant.
     * @param authorizationCode - An authorization code that was received from following the
                                authorization code flow.  This authorization code must not
                                have already been used to obtain an access token.
     * @param redirectUri - The redirect URI that was used to request the authorization code.
                          Must be the same URI that is configured for the App Registration.
     * @param options - Options for configuring the client which makes the access token request.
     */
    constructor(tenantId: string | "common", clientId: string, authorizationCode: string, redirectUri: string, options?: AuthorizationCodeCredentialOptions);
    /**
     * Authenticates with Microsoft Entra ID and returns an access token if successful.
     * If authentication fails, a {@link CredentialUnavailableError} will be thrown with the details of the failure.
     *
     * @param scopes - The list of scopes for which the token will have access.
     * @param options - The options used to configure any requests this
     *                TokenCredential implementation might make.
     */
    getToken(scopes: string | string[], options?: GetTokenOptions): Promise<AccessToken>;
}
//# sourceMappingURL=authorizationCodeCredential.d.ts.map