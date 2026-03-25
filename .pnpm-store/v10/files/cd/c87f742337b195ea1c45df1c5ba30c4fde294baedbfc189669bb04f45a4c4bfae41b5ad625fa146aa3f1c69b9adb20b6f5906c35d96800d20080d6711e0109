import { INetworkModule, Logger } from "@azure/msal-common/node";
import { BaseManagedIdentitySource } from "./BaseManagedIdentitySource.js";
import { CryptoProvider } from "../../crypto/CryptoProvider.js";
import { ManagedIdentityRequestParameters } from "../../config/ManagedIdentityRequestParameters.js";
import { ManagedIdentityId } from "../../config/ManagedIdentityId.js";
import { NodeStorage } from "../../cache/NodeStorage.js";
export declare const MANAGED_IDENTITY_MACHINE_LEARNING_UNSUPPORTED_ID_TYPE_ERROR: string;
/**
 * Machine Learning Managed Identity Source implementation for Azure Machine Learning environments.
 *
 * This class handles managed identity authentication specifically for Azure Machine Learning services.
 * It supports both system-assigned and user-assigned managed identities, using the MSI_ENDPOINT
 * and MSI_SECRET environment variables that are automatically provided in Azure ML environments.
 */
export declare class MachineLearning extends BaseManagedIdentitySource {
    private msiEndpoint;
    private secret;
    /**
     * Creates a new MachineLearning managed identity source instance.
     *
     * @param logger - Logger instance for diagnostic information
     * @param nodeStorage - Node storage implementation for caching
     * @param networkClient - Network client for making HTTP requests
     * @param cryptoProvider - Cryptographic operations provider
     * @param disableInternalRetries - Whether to disable automatic request retries
     * @param msiEndpoint - The MSI endpoint URL from environment variables
     * @param secret - The MSI secret from environment variables
     */
    constructor(logger: Logger, nodeStorage: NodeStorage, networkClient: INetworkModule, cryptoProvider: CryptoProvider, disableInternalRetries: boolean, msiEndpoint: string, secret: string);
    /**
     * Retrieves the required environment variables for Azure Machine Learning managed identity.
     *
     * This method checks for the presence of MSI_ENDPOINT and MSI_SECRET environment variables
     * that are automatically set by the Azure Machine Learning platform when managed identity
     * is enabled for the compute instance or cluster.
     *
     * @returns An array containing [msiEndpoint, secret] where either value may be undefined
     *          if the corresponding environment variable is not set
     */
    static getEnvironmentVariables(): Array<string | undefined>;
    /**
     * Attempts to create a MachineLearning managed identity source.
     *
     * This method validates the Azure Machine Learning environment by checking for the required
     * MSI_ENDPOINT and MSI_SECRET environment variables. If both are present and valid,
     * it creates and returns a MachineLearning instance. If either is missing or invalid,
     * it returns null, indicating that this managed identity source is not available
     * in the current environment.
     *
     * @param logger - Logger instance for diagnostic information
     * @param nodeStorage - Node storage implementation for caching
     * @param networkClient - Network client for making HTTP requests
     * @param cryptoProvider - Cryptographic operations provider
     * @param disableInternalRetries - Whether to disable automatic request retries
     *
     * @returns A new MachineLearning instance if the environment is valid, null otherwise
     */
    static tryCreate(logger: Logger, nodeStorage: NodeStorage, networkClient: INetworkModule, cryptoProvider: CryptoProvider, disableInternalRetries: boolean): MachineLearning | null;
    /**
     * Creates a managed identity token request for Azure Machine Learning environments.
     *
     * This method constructs the HTTP request parameters needed to acquire an access token
     * from the Azure Machine Learning managed identity endpoint. It handles both system-assigned
     * and user-assigned managed identities with specific logic for each type:
     *
     * - System-assigned: Uses the DEFAULT_IDENTITY_CLIENT_ID environment variable
     * - User-assigned: Only supports client ID-based identification (not object ID or resource ID)
     *
     * The request uses the 2017-09-01 API version and includes the required secret header
     * for authentication with the MSI endpoint.
     *
     * @param resource - The target resource/scope for which to request an access token (e.g., "https://graph.microsoft.com/.default")
     * @param managedIdentityId - The managed identity configuration specifying whether to use system-assigned or user-assigned identity
     *
     * @returns A configured ManagedIdentityRequestParameters object ready for network execution
     *
     * @throws Error if an unsupported managed identity ID type is specified (only client ID is supported for user-assigned)
     */
    createRequest(resource: string, managedIdentityId: ManagedIdentityId): ManagedIdentityRequestParameters;
}
//# sourceMappingURL=MachineLearning.d.ts.map