import { INetworkModule, Logger } from "@azure/msal-common/node";
import { ManagedIdentityRequestParameters } from "../../config/ManagedIdentityRequestParameters.js";
import { BaseManagedIdentitySource } from "./BaseManagedIdentitySource.js";
import { NodeStorage } from "../../cache/NodeStorage.js";
import { CryptoProvider } from "../../crypto/CryptoProvider.js";
import { ManagedIdentityId } from "../../config/ManagedIdentityId.js";
/**
 * Azure Cloud Shell managed identity source implementation.
 *
 * This class handles authentication for applications running in Azure Cloud Shell environment.
 * Cloud Shell provides a browser-accessible shell for managing Azure resources and includes
 * a pre-configured managed identity for authentication.
 *
 * Original source of code: https://github.com/Azure/azure-sdk-for-net/blob/main/sdk/identity/Azure.Identity/src/CloudShellManagedIdentitySource.cs
 */
export declare class CloudShell extends BaseManagedIdentitySource {
    private msiEndpoint;
    /**
     * Creates a new CloudShell managed identity source instance.
     *
     * @param logger - Logger instance for diagnostic logging
     * @param nodeStorage - Node.js storage implementation for caching
     * @param networkClient - HTTP client for making requests to the managed identity endpoint
     * @param cryptoProvider - Cryptographic operations provider
     * @param disableInternalRetries - Whether to disable automatic retry logic for failed requests
     * @param msiEndpoint - The MSI endpoint URL obtained from environment variables
     */
    constructor(logger: Logger, nodeStorage: NodeStorage, networkClient: INetworkModule, cryptoProvider: CryptoProvider, disableInternalRetries: boolean, msiEndpoint: string);
    /**
     * Retrieves the required environment variables for Cloud Shell managed identity.
     *
     * Cloud Shell requires the MSI_ENDPOINT environment variable to be set, which
     * contains the URL of the managed identity service endpoint.
     *
     * @returns An array containing the MSI_ENDPOINT environment variable value (or undefined if not set)
     */
    static getEnvironmentVariables(): Array<string | undefined>;
    /**
     * Attempts to create a CloudShell managed identity source instance.
     *
     * This method validates that the required environment variables are present and
     * creates a CloudShell instance if the environment is properly configured.
     * Cloud Shell only supports system-assigned managed identities.
     *
     * @param logger - Logger instance for diagnostic logging
     * @param nodeStorage - Node.js storage implementation for caching
     * @param networkClient - HTTP client for making requests
     * @param cryptoProvider - Cryptographic operations provider
     * @param disableInternalRetries - Whether to disable automatic retry logic
     * @param managedIdentityId - The managed identity configuration (must be system-assigned)
     *
     * @returns A CloudShell instance if the environment is valid, null otherwise
     *
     * @throws {ManagedIdentityError} When a user-assigned managed identity is requested,
     *         as Cloud Shell only supports system-assigned identities
     */
    static tryCreate(logger: Logger, nodeStorage: NodeStorage, networkClient: INetworkModule, cryptoProvider: CryptoProvider, disableInternalRetries: boolean, managedIdentityId: ManagedIdentityId): CloudShell | null;
    /**
     * Creates an HTTP request to acquire an access token from the Cloud Shell managed identity endpoint.
     *
     * This method constructs a POST request to the MSI endpoint with the required headers and
     * body parameters for Cloud Shell authentication. The request includes the target resource
     * for which the access token is being requested.
     *
     * @param resource - The target resource/scope for which to request an access token (e.g., "https://graph.microsoft.com/.default")
     *
     * @returns A configured ManagedIdentityRequestParameters object ready for network execution
     */
    createRequest(resource: string): ManagedIdentityRequestParameters;
}
//# sourceMappingURL=CloudShell.d.ts.map