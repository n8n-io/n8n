import { Authority, INetworkModule, Logger, NetworkRequestOptions, NetworkResponse, ServerAuthorizationTokenResponse, AuthenticationResult } from "@azure/msal-common/node";
import { ManagedIdentityId } from "../../config/ManagedIdentityId.js";
import { ManagedIdentityRequestParameters } from "../../config/ManagedIdentityRequestParameters.js";
import { CryptoProvider } from "../../crypto/CryptoProvider.js";
import { ManagedIdentityRequest } from "../../request/ManagedIdentityRequest.js";
import { ManagedIdentityIdType } from "../../utils/Constants.js";
import { ManagedIdentityTokenResponse } from "../../response/ManagedIdentityTokenResponse.js";
import { NodeStorage } from "../../cache/NodeStorage.js";
import { ManagedIdentityErrorCodes } from "../../error/ManagedIdentityError.js";
/**
 * Managed Identity User Assigned Id Query Parameter Names
 */
export declare const ManagedIdentityUserAssignedIdQueryParameterNames: {
    readonly MANAGED_IDENTITY_CLIENT_ID_2017: "clientid";
    readonly MANAGED_IDENTITY_CLIENT_ID: "client_id";
    readonly MANAGED_IDENTITY_OBJECT_ID: "object_id";
    readonly MANAGED_IDENTITY_RESOURCE_ID_IMDS: "msi_res_id";
    readonly MANAGED_IDENTITY_RESOURCE_ID_NON_IMDS: "mi_res_id";
};
export type ManagedIdentityUserAssignedIdQueryParameterNames = (typeof ManagedIdentityUserAssignedIdQueryParameterNames)[keyof typeof ManagedIdentityUserAssignedIdQueryParameterNames];
/**
 * Base class for all Managed Identity sources. Provides common functionality for
 * authenticating with Azure Managed Identity endpoints across different Azure services
 * including IMDS, App Service, Azure Arc, Service Fabric, Cloud Shell, and Machine Learning.
 *
 * This abstract class handles token acquisition, response processing, and network communication
 * while allowing concrete implementations to define source-specific request creation logic.
 */
export declare abstract class BaseManagedIdentitySource {
    protected logger: Logger;
    private nodeStorage;
    private networkClient;
    private cryptoProvider;
    private disableInternalRetries;
    /**
     * Creates an instance of BaseManagedIdentitySource.
     *
     * @param logger - Logger instance for diagnostic information
     * @param nodeStorage - Storage interface for caching tokens
     * @param networkClient - Network client for making HTTP requests
     * @param cryptoProvider - Cryptographic provider for token operations
     * @param disableInternalRetries - Whether to disable automatic retry logic
     */
    constructor(logger: Logger, nodeStorage: NodeStorage, networkClient: INetworkModule, cryptoProvider: CryptoProvider, disableInternalRetries: boolean);
    /**
     * Creates a managed identity request with source-specific parameters.
     * This method must be implemented by concrete managed identity sources to define
     * how requests are constructed for their specific endpoint requirements.
     *
     * @param resource - The Azure resource URI for which the access token is requested (e.g., "https://vault.azure.net/")
     * @param managedIdentityId - The managed identity configuration specifying system-assigned or user-assigned identity details
     *
     * @returns Request parameters configured for the specific managed identity source
     */
    abstract createRequest(resource: string, managedIdentityId: ManagedIdentityId): ManagedIdentityRequestParameters;
    /**
     * Processes the network response and converts it to a standardized server token response.
     * This async version allows for source-specific response processing logic while maintaining
     * backward compatibility with the synchronous version.
     *
     * @param response - The network response containing the managed identity token
     * @param _networkClient - Network client used for the request (unused in base implementation)
     * @param _networkRequest - The original network request parameters (unused in base implementation)
     * @param _networkRequestOptions - The network request options (unused in base implementation)
     *
     * @returns Promise resolving to a standardized server authorization token response
     */
    getServerTokenResponseAsync(response: NetworkResponse<ManagedIdentityTokenResponse>, _networkClient: INetworkModule, _networkRequest: ManagedIdentityRequestParameters, _networkRequestOptions: NetworkRequestOptions): Promise<ServerAuthorizationTokenResponse>;
    /**
     * Converts a managed identity token response to a standardized server authorization token response.
     * Handles time format conversion, expiration calculation, and error mapping to ensure
     * compatibility with the MSAL response handling pipeline.
     *
     * @param response - The network response containing the managed identity token
     *
     * @returns Standardized server authorization token response with normalized fields
     */
    getServerTokenResponse(response: NetworkResponse<ManagedIdentityTokenResponse>): ServerAuthorizationTokenResponse;
    /**
     * Acquires an access token using the managed identity endpoint for the specified resource.
     * This is the primary method for token acquisition, handling the complete flow from
     * request creation through response processing and token caching.
     *
     * @param managedIdentityRequest - The managed identity request containing resource and optional parameters
     * @param managedIdentityId - The managed identity configuration (system or user-assigned)
     * @param fakeAuthority - Authority instance used for token caching (managed identity uses a placeholder authority)
     * @param refreshAccessToken - Whether this is a token refresh operation
     *
     * @returns Promise resolving to an authentication result containing the access token and metadata
     *
     * @throws {AuthError} When network requests fail or token validation fails
     * @throws {ClientAuthError} When network errors occur during the request
     */
    acquireTokenWithManagedIdentity(managedIdentityRequest: ManagedIdentityRequest, managedIdentityId: ManagedIdentityId, fakeAuthority: Authority, refreshAccessToken?: boolean): Promise<AuthenticationResult>;
    /**
     * Determines the appropriate query parameter name for user-assigned managed identity
     * based on the identity type, API version, and endpoint characteristics.
     * Different Azure services and API versions use different parameter names for the same identity types.
     *
     * @param managedIdentityIdType - The type of user-assigned managed identity (client ID, object ID, or resource ID)
     * @param isImds - Whether the request is being made to the IMDS (Instance Metadata Service) endpoint
     * @param usesApi2017 - Whether the endpoint uses the 2017-09-01 API version (affects client ID parameter name)
     *
     * @returns The correct query parameter name for the specified identity type and endpoint
     *
     * @throws {ManagedIdentityError} When an invalid managed identity ID type is provided
     */
    getManagedIdentityUserAssignedIdQueryParameterKey(managedIdentityIdType: ManagedIdentityIdType, isImds?: boolean, usesApi2017?: boolean): string;
    /**
     * Validates and normalizes an environment variable containing a URL string.
     * This static utility method ensures that environment variables used for managed identity
     * endpoints contain properly formatted URLs and provides informative error messages when validation fails.
     *
     * @param envVariableStringName - The name of the environment variable being validated (for error reporting)
     * @param envVariable - The environment variable value containing the URL string
     * @param sourceName - The name of the managed identity source (for error reporting)
     * @param logger - Logger instance for diagnostic information
     *
     * @returns The validated and normalized URL string
     *
     * @throws {ManagedIdentityError} When the environment variable contains a malformed URL
     */
    static getValidatedEnvVariableUrlString: (envVariableStringName: keyof typeof ManagedIdentityErrorCodes.MsiEnvironmentVariableUrlMalformedErrorCodes, envVariable: string, sourceName: string, logger: Logger) => string;
}
//# sourceMappingURL=BaseManagedIdentitySource.d.ts.map