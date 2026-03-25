import { INetworkModule, Logger } from "@azure/msal-common/node";
import { BaseManagedIdentitySource } from "./BaseManagedIdentitySource.js";
import { CryptoProvider } from "../../crypto/CryptoProvider.js";
import { ManagedIdentityRequestParameters } from "../../config/ManagedIdentityRequestParameters.js";
import { ManagedIdentityId } from "../../config/ManagedIdentityId.js";
import { NodeStorage } from "../../cache/NodeStorage.js";
/**
 * Azure App Service Managed Identity Source implementation.
 *
 * This class provides managed identity authentication for applications running in Azure App Service.
 * It uses the local metadata service endpoint available within App Service environments to obtain
 * access tokens without requiring explicit credentials.
 *
 * Original source of code: https://github.com/Azure/azure-sdk-for-net/blob/main/sdk/identity/Azure.Identity/src/AppServiceManagedIdentitySource.cs
 */
export declare class AppService extends BaseManagedIdentitySource {
    private identityEndpoint;
    private identityHeader;
    /**
     * Creates a new instance of the AppService managed identity source.
     *
     * @param logger - Logger instance for diagnostic output
     * @param nodeStorage - Node.js storage implementation for caching
     * @param networkClient - Network client for making HTTP requests
     * @param cryptoProvider - Cryptographic operations provider
     * @param disableInternalRetries - Whether to disable internal retry logic
     * @param identityEndpoint - The App Service identity endpoint URL
     * @param identityHeader - The secret header value required for authentication
     */
    constructor(logger: Logger, nodeStorage: NodeStorage, networkClient: INetworkModule, cryptoProvider: CryptoProvider, disableInternalRetries: boolean, identityEndpoint: string, identityHeader: string);
    /**
     * Retrieves the required environment variables for App Service managed identity.
     *
     * App Service managed identity requires two environment variables:
     * - IDENTITY_ENDPOINT: The URL of the local metadata service
     * - IDENTITY_HEADER: A secret header value for authentication
     *
     * @returns An array containing [identityEndpoint, identityHeader] values from environment variables.
     *          Either value may be undefined if the environment variable is not set.
     */
    static getEnvironmentVariables(): Array<string | undefined>;
    /**
     * Attempts to create an AppService managed identity source if the environment supports it.
     *
     * This method checks for the presence of required environment variables and validates
     * the identity endpoint URL. If the environment is not suitable for App Service managed
     * identity (missing environment variables or invalid endpoint), it returns null.
     *
     * @param logger - Logger instance for diagnostic output
     * @param nodeStorage - Node.js storage implementation for caching
     * @param networkClient - Network client for making HTTP requests
     * @param cryptoProvider - Cryptographic operations provider
     * @param disableInternalRetries - Whether to disable internal retry logic
     *
     * @returns A new AppService instance if the environment is suitable, null otherwise
     */
    static tryCreate(logger: Logger, nodeStorage: NodeStorage, networkClient: INetworkModule, cryptoProvider: CryptoProvider, disableInternalRetries: boolean): AppService | null;
    /**
     * Creates a managed identity token request for the App Service environment.
     *
     * This method constructs an HTTP GET request to the App Service identity endpoint
     * with the required headers, query parameters, and managed identity configuration.
     * The request includes the secret header for authentication and appropriate API version.
     *
     * @param resource - The target resource/scope for which to request an access token (e.g., "https://graph.microsoft.com/.default")
     * @param managedIdentityId - The managed identity configuration specifying whether to use system-assigned or user-assigned identity
     *
     * @returns A configured ManagedIdentityRequestParameters object ready for network execution
     */
    createRequest(resource: string, managedIdentityId: ManagedIdentityId): ManagedIdentityRequestParameters;
}
//# sourceMappingURL=AppService.d.ts.map