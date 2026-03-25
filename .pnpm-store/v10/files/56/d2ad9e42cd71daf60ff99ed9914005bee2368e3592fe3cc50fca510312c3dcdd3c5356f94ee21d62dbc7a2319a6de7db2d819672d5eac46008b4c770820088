import { INetworkModule, Logger } from "@azure/msal-common/node";
import { ManagedIdentityId } from "../../config/ManagedIdentityId.js";
import { ManagedIdentityRequestParameters } from "../../config/ManagedIdentityRequestParameters.js";
import { BaseManagedIdentitySource } from "./BaseManagedIdentitySource.js";
import { NodeStorage } from "../../cache/NodeStorage.js";
import { CryptoProvider } from "../../crypto/CryptoProvider.js";
/**
 * Original source of code: https://github.com/Azure/azure-sdk-for-net/blob/main/sdk/identity/Azure.Identity/src/ServiceFabricManagedIdentitySource.cs
 */
export declare class ServiceFabric extends BaseManagedIdentitySource {
    private identityEndpoint;
    private identityHeader;
    /**
     * Constructs a new ServiceFabric managed identity source for acquiring tokens from Azure Service Fabric clusters.
     *
     * Service Fabric managed identity allows applications running in Service Fabric clusters to authenticate
     * without storing credentials in code. This source handles token acquisition using the Service Fabric
     * Managed Identity Token Service (MITS).
     *
     * @param logger - Logger instance for logging authentication events and debugging information
     * @param nodeStorage - NodeStorage instance for caching tokens and other authentication artifacts
     * @param networkClient - Network client for making HTTP requests to the Service Fabric identity endpoint
     * @param cryptoProvider - Crypto provider for cryptographic operations like token validation
     * @param disableInternalRetries - Whether to disable internal retry logic for failed requests
     * @param identityEndpoint - The Service Fabric managed identity endpoint URL
     * @param identityHeader - The Service Fabric managed identity secret header value
     */
    constructor(logger: Logger, nodeStorage: NodeStorage, networkClient: INetworkModule, cryptoProvider: CryptoProvider, disableInternalRetries: boolean, identityEndpoint: string, identityHeader: string);
    /**
     * Retrieves the environment variables required for Service Fabric managed identity authentication.
     *
     * Service Fabric managed identity requires three specific environment variables to be set by the
     * Service Fabric runtime:
     * - IDENTITY_ENDPOINT: The endpoint URL for the Managed Identity Token Service (MITS)
     * - IDENTITY_HEADER: A secret value used for authentication with the MITS
     * - IDENTITY_SERVER_THUMBPRINT: The thumbprint of the MITS server certificate for secure communication
     *
     * @returns An array containing the identity endpoint, identity header, and identity server thumbprint values.
     *          Elements will be undefined if the corresponding environment variables are not set.
     */
    static getEnvironmentVariables(): Array<string | undefined>;
    /**
     * Attempts to create a ServiceFabric managed identity source if the runtime environment supports it.
     *
     * Checks for the presence of all required Service Fabric environment variables
     * and validates the endpoint URL format. It will only create a ServiceFabric instance if the application
     * is running in a properly configured Service Fabric cluster with managed identity enabled.
     *
     * Note: User-assigned managed identities must be configured at the cluster level, not at runtime.
     * This method will log a warning if a user-assigned identity is requested.
     *
     * @param logger - Logger instance for logging creation events and validation results
     * @param nodeStorage - NodeStorage instance for caching tokens and authentication artifacts
     * @param networkClient - Network client for making HTTP requests to the identity endpoint
     * @param cryptoProvider - Crypto provider for cryptographic operations
     * @param disableInternalRetries - Whether to disable internal retry logic for failed requests
     * @param managedIdentityId - Managed identity identifier specifying system-assigned or user-assigned identity
     *
     * @returns A ServiceFabric instance if all environment variables are valid and present, otherwise null
     */
    static tryCreate(logger: Logger, nodeStorage: NodeStorage, networkClient: INetworkModule, cryptoProvider: CryptoProvider, disableInternalRetries: boolean, managedIdentityId: ManagedIdentityId): ServiceFabric | null;
    /**
     * Creates HTTP request parameters for acquiring an access token from the Service Fabric Managed Identity Token Service (MITS).
     *
     * This method constructs a properly formatted HTTP GET request that includes:
     * - The secret header for authentication with MITS
     * - API version parameter for the Service Fabric MSI endpoint
     * - Resource parameter specifying the target Azure service
     * - Optional identity parameters for user-assigned managed identities
     *
     * The request follows the Service Fabric managed identity protocol and uses the 2019-07-01-preview API version.
     * For user-assigned identities, the appropriate query parameter (client_id, object_id, or resource_id) is added
     * based on the identity type.
     *
     * @param resource - The Azure resource URI for which the access token is requested (e.g., "https://vault.azure.net/")
     * @param managedIdentityId - The managed identity configuration specifying system-assigned or user-assigned identity details
     *
     * @returns A configured ManagedIdentityRequestParameters object ready for network execution
     */
    createRequest(resource: string, managedIdentityId: ManagedIdentityId): ManagedIdentityRequestParameters;
}
//# sourceMappingURL=ServiceFabric.d.ts.map