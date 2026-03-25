import { INetworkModule, Logger } from "@azure/msal-common/node";
import { ManagedIdentityId } from "../../config/ManagedIdentityId.js";
import { ManagedIdentityRequestParameters } from "../../config/ManagedIdentityRequestParameters.js";
import { BaseManagedIdentitySource } from "./BaseManagedIdentitySource.js";
import { CryptoProvider } from "../../crypto/CryptoProvider.js";
import { NodeStorage } from "../../cache/NodeStorage.js";
/**
 * Managed Identity source implementation for Azure Instance Metadata Service (IMDS).
 *
 * IMDS is available on Azure Virtual Machines and Virtual Machine Scale Sets and provides
 * a REST endpoint to obtain OAuth tokens for managed identities. This implementation
 * handles both system-assigned and user-assigned managed identities.
 *
 * Original source of code: https://github.com/Azure/azure-sdk-for-net/blob/main/sdk/identity/Azure.Identity/src/ImdsManagedIdentitySource.cs
 */
export declare class Imds extends BaseManagedIdentitySource {
    private identityEndpoint;
    /**
     * Constructs an Imds instance with the specified configuration.
     *
     * @param logger - Logger instance for recording debug information and errors
     * @param nodeStorage - NodeStorage instance used for token caching operations
     * @param networkClient - Network client implementation for making HTTP requests to IMDS
     * @param cryptoProvider - CryptoProvider for generating correlation IDs and other cryptographic operations
     * @param disableInternalRetries - When true, disables the built-in retry logic for IMDS requests
     * @param identityEndpoint - The complete IMDS endpoint URL including the token path
     */
    constructor(logger: Logger, nodeStorage: NodeStorage, networkClient: INetworkModule, cryptoProvider: CryptoProvider, disableInternalRetries: boolean, identityEndpoint: string);
    /**
     * Creates an Imds instance with the appropriate endpoint configuration.
     *
     * This method checks for the presence of the AZURE_POD_IDENTITY_AUTHORITY_HOST environment
     * variable, which is used in Azure Kubernetes Service (AKS) environments with Azure AD
     * Pod Identity. If found, it uses that endpoint; otherwise, it falls back to the standard
     * IMDS endpoint (169.254.169.254).
     *
     * @param logger - Logger instance for recording endpoint discovery and validation
     * @param nodeStorage - NodeStorage instance for token caching
     * @param networkClient - Network client for HTTP requests
     * @param cryptoProvider - CryptoProvider for cryptographic operations
     * @param disableInternalRetries - Whether to disable built-in retry logic
     *
     * @returns A configured Imds instance ready to make token requests
     */
    static tryCreate(logger: Logger, nodeStorage: NodeStorage, networkClient: INetworkModule, cryptoProvider: CryptoProvider, disableInternalRetries: boolean): Imds;
    /**
     * Creates a properly configured HTTP request for acquiring an access token from IMDS.
     *
     * This method builds a complete request object with all necessary headers, query parameters,
     * and retry policies required by the Azure Instance Metadata Service.
     *
     * Key request components:
     * - HTTP GET method to the IMDS token endpoint
     * - Metadata header set to "true" (required by IMDS)
     * - API version parameter (currently "2018-02-01")
     * - Resource parameter specifying the target audience
     * - Identity-specific parameters for user-assigned managed identities
     * - IMDS-specific retry policy
     *
     * @param resource - The target resource/scope for which to request an access token (e.g., "https://graph.microsoft.com/.default")
     * @param managedIdentityId - The managed identity configuration specifying whether to use system-assigned or user-assigned identity
     *
     * @returns A configured ManagedIdentityRequestParameters object ready for network execution
     */
    createRequest(resource: string, managedIdentityId: ManagedIdentityId): ManagedIdentityRequestParameters;
}
//# sourceMappingURL=Imds.d.ts.map