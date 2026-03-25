import type { AccessToken, GetTokenOptions, TokenCredential } from "@azure/core-auth";
import type { AzurePipelinesCredentialOptions } from "./azurePipelinesCredentialOptions.js";
import type { PipelineResponse } from "@azure/core-rest-pipeline";
/**
 * This credential is designed to be used in Azure Pipelines with service connections
 * as a setup for workload identity federation.
 */
export declare class AzurePipelinesCredential implements TokenCredential {
    private clientAssertionCredential;
    private identityClient;
    /**
     * AzurePipelinesCredential supports Federated Identity on Azure Pipelines through Service Connections.
     * @param tenantId - tenantId associated with the service connection
     * @param clientId - clientId associated with the service connection
     * @param serviceConnectionId - Unique ID for the service connection, as found in the querystring's resourceId key
     * @param systemAccessToken - The pipeline's <see href="https://learn.microsoft.com/azure/devops/pipelines/build/variables?view=azure-devops%26tabs=yaml#systemaccesstoken">System.AccessToken</see> value.
     * @param options - The identity client options to use for authentication.
     */
    constructor(tenantId: string, clientId: string, serviceConnectionId: string, systemAccessToken: string, options?: AzurePipelinesCredentialOptions);
    /**
     * Authenticates with Microsoft Entra ID and returns an access token if successful.
     * If authentication fails, a {@link CredentialUnavailableError} or {@link AuthenticationError} will be thrown with the details of the failure.
     *
     * @param scopes - The list of scopes for which the token will have access.
     * @param options - The options used to configure any requests this
     *                TokenCredential implementation might make.
     */
    getToken(scopes: string | string[], options?: GetTokenOptions): Promise<AccessToken>;
    /**
     *
     * @param oidcRequestUrl - oidc request url
     * @param systemAccessToken - system access token
     * @returns OIDC token from Azure Pipelines
     */
    private requestOidcToken;
}
export declare function handleOidcResponse(response: PipelineResponse): string;
//# sourceMappingURL=azurePipelinesCredential.d.ts.map