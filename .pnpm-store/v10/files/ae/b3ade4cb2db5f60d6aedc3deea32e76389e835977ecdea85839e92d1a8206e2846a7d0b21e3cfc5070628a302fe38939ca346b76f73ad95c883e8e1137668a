import { INetworkModule, NetworkResponse, NetworkRequestOptions, Logger, ServerAuthorizationTokenResponse } from "@azure/msal-common/node";
import { ManagedIdentityRequestParameters } from "../../config/ManagedIdentityRequestParameters.js";
import { BaseManagedIdentitySource } from "./BaseManagedIdentitySource.js";
import { CryptoProvider } from "../../crypto/CryptoProvider.js";
import { NodeStorage } from "../../cache/NodeStorage.js";
import { ManagedIdentityTokenResponse } from "../../response/ManagedIdentityTokenResponse.js";
import { ManagedIdentityId } from "../../config/ManagedIdentityId.js";
export declare const ARC_API_VERSION: string;
export declare const DEFAULT_AZURE_ARC_IDENTITY_ENDPOINT: string;
type FilePathMap = {
    win32: string;
    linux: string;
};
export declare const SUPPORTED_AZURE_ARC_PLATFORMS: FilePathMap;
export declare const AZURE_ARC_FILE_DETECTION: FilePathMap;
/**
 * Azure Arc managed identity source implementation for acquiring tokens from Azure Arc-enabled servers.
 *
 * This class provides managed identity authentication for applications running on Azure Arc-enabled servers
 * by communicating with the local Hybrid Instance Metadata Service (HIMDS). It supports both environment
 * variable-based configuration and automatic detection through the HIMDS executable.
 *
 * Original source of code: https://github.com/Azure/azure-sdk-for-net/blob/main/sdk/identity/Azure.Identity/src/AzureArcManagedIdentitySource.cs
 */
export declare class AzureArc extends BaseManagedIdentitySource {
    private identityEndpoint;
    /**
     * Creates a new instance of the AzureArc managed identity source.
     *
     * @param logger - Logger instance for capturing telemetry and diagnostic information
     * @param nodeStorage - Storage implementation for caching tokens and metadata
     * @param networkClient - Network client for making HTTP requests to the identity endpoint
     * @param cryptoProvider - Cryptographic operations provider for token validation and encryption
     * @param disableInternalRetries - Flag to disable automatic retry logic for failed requests
     * @param identityEndpoint - The Azure Arc identity endpoint URL for token requests
     */
    constructor(logger: Logger, nodeStorage: NodeStorage, networkClient: INetworkModule, cryptoProvider: CryptoProvider, disableInternalRetries: boolean, identityEndpoint: string);
    /**
     * Retrieves and validates Azure Arc environment variables for managed identity configuration.
     *
     * This method checks for IDENTITY_ENDPOINT and IMDS_ENDPOINT environment variables.
     * If either is missing, it attempts to detect the Azure Arc environment by checking for
     * the HIMDS executable at platform-specific paths. On successful detection, it returns
     * the default identity endpoint and a helper string indicating file-based detection.
     *
     * @returns An array containing [identityEndpoint, imdsEndpoint] where both values are
     *          strings if Azure Arc is available, or undefined if not available.
     */
    static getEnvironmentVariables(): Array<string | undefined>;
    /**
     * Attempts to create an AzureArc managed identity source instance.
     *
     * Validates the Azure Arc environment by checking environment variables
     * and performing file-based detection. It ensures that only system-assigned managed identities
     * are supported for Azure Arc scenarios. The method performs comprehensive validation of
     * endpoint URLs and logs detailed information about the detection process.
     *
     * @param logger - Logger instance for capturing creation and validation steps
     * @param nodeStorage - Storage implementation for the managed identity source
     * @param networkClient - Network client for HTTP communication
     * @param cryptoProvider - Cryptographic operations provider
     * @param disableInternalRetries - Whether to disable automatic retry mechanisms
     * @param managedIdentityId - The managed identity configuration, must be system-assigned
     *
     * @returns AzureArc instance if the environment supports Azure Arc managed identity, null otherwise
     *
     * @throws {ManagedIdentityError} When a user-assigned managed identity is specified (not supported for Azure Arc)
     */
    static tryCreate(logger: Logger, nodeStorage: NodeStorage, networkClient: INetworkModule, cryptoProvider: CryptoProvider, disableInternalRetries: boolean, managedIdentityId: ManagedIdentityId): AzureArc | null;
    /**
     * Creates a properly formatted HTTP request for acquiring tokens from the Azure Arc identity endpoint.
     *
     * This method constructs a GET request to the Azure Arc HIMDS endpoint with the required metadata header
     * and query parameters. The endpoint URL is normalized to use 127.0.0.1 instead of localhost for
     * consistency. Additional body parameters are calculated by the base class during token acquisition.
     *
     * @param resource - The target resource/scope for which to request an access token (e.g., "https://graph.microsoft.com/.default")
     *
     * @returns A configured ManagedIdentityRequestParameters object ready for network execution
     */
    createRequest(resource: string): ManagedIdentityRequestParameters;
    /**
     * Processes the server response and handles Azure Arc-specific authentication challenges.
     *
     * This method implements the Azure Arc authentication flow which may require reading a secret file
     * for authorization. When the initial request returns HTTP 401 Unauthorized, it extracts the file
     * path from the WWW-Authenticate header, validates the file location and size, reads the secret,
     * and retries the request with Basic authentication. The method includes comprehensive security
     * validations to prevent path traversal and ensure file integrity.
     *
     * @param originalResponse - The initial HTTP response from the identity endpoint
     * @param networkClient - Network client for making the retry request if needed
     * @param networkRequest - The original request parameters (modified with auth header for retry)
     * @param networkRequestOptions - Additional options for network requests
     *
     * @returns A promise that resolves to the server token response with access token and metadata
     *
     * @throws {ManagedIdentityError} When:
     *   - WWW-Authenticate header is missing or has unsupported format
     *   - Platform is not supported (not Windows or Linux)
     *   - Secret file has invalid extension (not .key)
     *   - Secret file path doesn't match expected platform path
     *   - Secret file cannot be read or is too large (>4096 bytes)
     * @throws {ClientAuthError} When network errors occur during retry request
     */
    getServerTokenResponseAsync(originalResponse: NetworkResponse<ManagedIdentityTokenResponse>, networkClient: INetworkModule, networkRequest: ManagedIdentityRequestParameters, networkRequestOptions: NetworkRequestOptions): Promise<ServerAuthorizationTokenResponse>;
}
export {};
//# sourceMappingURL=AzureArc.d.ts.map