import type { AccessToken, GetTokenOptions, TokenCredential } from "@azure/core-auth";
import type { TokenCredentialOptions } from "../../tokenCredentialOptions.js";
import type { ManagedIdentityCredentialClientIdOptions, ManagedIdentityCredentialObjectIdOptions, ManagedIdentityCredentialResourceIdOptions } from "./options.js";
/**
 * Attempts authentication using a managed identity available at the deployment environment.
 * This authentication type works in Azure VMs, App Service instances, Azure Functions applications,
 * Azure Kubernetes Services, Azure Service Fabric instances and inside of the Azure Cloud Shell.
 *
 * More information about configuring managed identities can be found here:
 * https://learn.microsoft.com/azure/active-directory/managed-identities-azure-resources/overview
 */
export declare class ManagedIdentityCredential implements TokenCredential {
    private managedIdentityApp;
    private identityClient;
    private clientId?;
    private resourceId?;
    private objectId?;
    private msiRetryConfig;
    private isAvailableIdentityClient;
    private sendProbeRequest;
    /**
     * Creates an instance of ManagedIdentityCredential with the client ID of a
     * user-assigned identity, or app registration (when working with AKS pod-identity).
     *
     * @param clientId - The client ID of the user-assigned identity, or app registration (when working with AKS pod-identity).
     * @param options - Options for configuring the client which makes the access token request.
     */
    constructor(clientId: string, options?: TokenCredentialOptions);
    /**
     * Creates an instance of ManagedIdentityCredential with a client ID
     *
     * @param options - Options for configuring the client which makes the access token request.
     */
    constructor(options?: ManagedIdentityCredentialClientIdOptions);
    /**
     * Creates an instance of ManagedIdentityCredential with a resource ID
     *
     * @param options - Options for configuring the resource which makes the access token request.
     */
    constructor(options?: ManagedIdentityCredentialResourceIdOptions);
    /**
     * Creates an instance of ManagedIdentityCredential with an object ID
     *
     * @param options - Options for configuring the resource which makes the access token request.
     */
    constructor(options?: ManagedIdentityCredentialObjectIdOptions);
    /**
     * Authenticates with Microsoft Entra ID and returns an access token if successful.
     * If authentication fails, a {@link CredentialUnavailableError} will be thrown with the details of the failure.
     * If an unexpected error occurs, an {@link AuthenticationError} will be thrown with the details of the failure.
     *
     * @param scopes - The list of scopes for which the token will have access.
     * @param options - The options used to configure any requests this
     *                TokenCredential implementation might make.
     */
    getToken(scopes: string | string[], options?: GetTokenOptions): Promise<AccessToken>;
    /**
     * Ensures the validity of the MSAL token
     */
    private ensureValidMsalToken;
}
//# sourceMappingURL=index.d.ts.map