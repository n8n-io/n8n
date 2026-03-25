/*! @azure/msal-node v3.8.4 2025-12-04 */
'use strict';
import { TimeUtils, Constants, HeaderNames, AuthError, createClientAuthError, ClientAuthErrorCodes, ResponseHandler, UrlString } from '@azure/msal-common/node';
import { ManagedIdentityQueryParameters, HttpMethod, ManagedIdentityIdType } from '../../utils/Constants.mjs';
import { createManagedIdentityError } from '../../error/ManagedIdentityError.mjs';
import { isIso8601 } from '../../utils/TimeUtils.mjs';
import { HttpClientWithRetries } from '../../network/HttpClientWithRetries.mjs';
import { invalidManagedIdentityIdType, MsiEnvironmentVariableUrlMalformedErrorCodes } from '../../error/ManagedIdentityErrorCodes.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Managed Identity User Assigned Id Query Parameter Names
 */
const ManagedIdentityUserAssignedIdQueryParameterNames = {
    MANAGED_IDENTITY_CLIENT_ID_2017: "clientid",
    MANAGED_IDENTITY_CLIENT_ID: "client_id",
    MANAGED_IDENTITY_OBJECT_ID: "object_id",
    MANAGED_IDENTITY_RESOURCE_ID_IMDS: "msi_res_id",
    MANAGED_IDENTITY_RESOURCE_ID_NON_IMDS: "mi_res_id",
};
/**
 * Base class for all Managed Identity sources. Provides common functionality for
 * authenticating with Azure Managed Identity endpoints across different Azure services
 * including IMDS, App Service, Azure Arc, Service Fabric, Cloud Shell, and Machine Learning.
 *
 * This abstract class handles token acquisition, response processing, and network communication
 * while allowing concrete implementations to define source-specific request creation logic.
 */
class BaseManagedIdentitySource {
    /**
     * Creates an instance of BaseManagedIdentitySource.
     *
     * @param logger - Logger instance for diagnostic information
     * @param nodeStorage - Storage interface for caching tokens
     * @param networkClient - Network client for making HTTP requests
     * @param cryptoProvider - Cryptographic provider for token operations
     * @param disableInternalRetries - Whether to disable automatic retry logic
     */
    constructor(logger, nodeStorage, networkClient, cryptoProvider, disableInternalRetries) {
        this.logger = logger;
        this.nodeStorage = nodeStorage;
        this.networkClient = networkClient;
        this.cryptoProvider = cryptoProvider;
        this.disableInternalRetries = disableInternalRetries;
    }
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
    async getServerTokenResponseAsync(response, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _networkClient, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _networkRequest, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _networkRequestOptions) {
        return this.getServerTokenResponse(response);
    }
    /**
     * Converts a managed identity token response to a standardized server authorization token response.
     * Handles time format conversion, expiration calculation, and error mapping to ensure
     * compatibility with the MSAL response handling pipeline.
     *
     * @param response - The network response containing the managed identity token
     *
     * @returns Standardized server authorization token response with normalized fields
     */
    getServerTokenResponse(response) {
        let refreshIn, expiresIn;
        if (response.body.expires_on) {
            // if the expires_on field in the response body is a string and in ISO 8601 format, convert it to a Unix timestamp (seconds since epoch)
            if (isIso8601(response.body.expires_on)) {
                response.body.expires_on =
                    new Date(response.body.expires_on).getTime() / 1000;
            }
            expiresIn = response.body.expires_on - TimeUtils.nowSeconds();
            // compute refresh_in as 1/2 of expires_in, but only if expires_in > 2h
            if (expiresIn > 2 * 3600) {
                refreshIn = expiresIn / 2;
            }
        }
        const serverTokenResponse = {
            status: response.status,
            // success
            access_token: response.body.access_token,
            expires_in: expiresIn,
            scope: response.body.resource,
            token_type: response.body.token_type,
            refresh_in: refreshIn,
            // error
            correlation_id: response.body.correlation_id || response.body.correlationId,
            error: typeof response.body.error === "string"
                ? response.body.error
                : response.body.error?.code,
            error_description: response.body.message ||
                (typeof response.body.error === "string"
                    ? response.body.error_description
                    : response.body.error?.message),
            error_codes: response.body.error_codes,
            timestamp: response.body.timestamp,
            trace_id: response.body.trace_id,
        };
        return serverTokenResponse;
    }
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
    async acquireTokenWithManagedIdentity(managedIdentityRequest, managedIdentityId, fakeAuthority, refreshAccessToken) {
        const networkRequest = this.createRequest(managedIdentityRequest.resource, managedIdentityId);
        if (managedIdentityRequest.revokedTokenSha256Hash) {
            this.logger.info(`[Managed Identity] The following claims are present in the request: ${managedIdentityRequest.claims}`);
            networkRequest.queryParameters[ManagedIdentityQueryParameters.SHA256_TOKEN_TO_REFRESH] = managedIdentityRequest.revokedTokenSha256Hash;
        }
        if (managedIdentityRequest.clientCapabilities?.length) {
            const clientCapabilities = managedIdentityRequest.clientCapabilities.toString();
            this.logger.info(`[Managed Identity] The following client capabilities are present in the request: ${clientCapabilities}`);
            networkRequest.queryParameters[ManagedIdentityQueryParameters.XMS_CC] = clientCapabilities;
        }
        const headers = networkRequest.headers;
        headers[HeaderNames.CONTENT_TYPE] = Constants.URL_FORM_CONTENT_TYPE;
        const networkRequestOptions = { headers };
        if (Object.keys(networkRequest.bodyParameters).length) {
            networkRequestOptions.body =
                networkRequest.computeParametersBodyString();
        }
        /**
         * Initializes the network client helper based on the retry policy configuration.
         * If internal retries are disabled, it uses the provided network client directly.
         * Otherwise, it wraps the network client with an HTTP client that supports retries.
         */
        const networkClientHelper = this.disableInternalRetries
            ? this.networkClient
            : new HttpClientWithRetries(this.networkClient, networkRequest.retryPolicy, this.logger);
        const reqTimestamp = TimeUtils.nowSeconds();
        let response;
        try {
            // Sources that send POST requests: Cloud Shell
            if (networkRequest.httpMethod === HttpMethod.POST) {
                response =
                    await networkClientHelper.sendPostRequestAsync(networkRequest.computeUri(), networkRequestOptions);
                // Sources that send GET requests: App Service, Azure Arc, IMDS, Service Fabric
            }
            else {
                response =
                    await networkClientHelper.sendGetRequestAsync(networkRequest.computeUri(), networkRequestOptions);
            }
        }
        catch (error) {
            if (error instanceof AuthError) {
                throw error;
            }
            else {
                throw createClientAuthError(ClientAuthErrorCodes.networkError);
            }
        }
        const responseHandler = new ResponseHandler(managedIdentityId.id, this.nodeStorage, this.cryptoProvider, this.logger, null, null);
        const serverTokenResponse = await this.getServerTokenResponseAsync(response, networkClientHelper, networkRequest, networkRequestOptions);
        responseHandler.validateTokenResponse(serverTokenResponse, refreshAccessToken);
        // caches the token
        return responseHandler.handleServerTokenResponse(serverTokenResponse, fakeAuthority, reqTimestamp, managedIdentityRequest);
    }
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
    getManagedIdentityUserAssignedIdQueryParameterKey(managedIdentityIdType, isImds, usesApi2017) {
        switch (managedIdentityIdType) {
            case ManagedIdentityIdType.USER_ASSIGNED_CLIENT_ID:
                this.logger.info(`[Managed Identity] [API version ${usesApi2017 ? "2017+" : "2019+"}] Adding user assigned client id to the request.`);
                // The Machine Learning source uses the 2017-09-01 API version, which uses "clientid" instead of "client_id"
                return usesApi2017
                    ? ManagedIdentityUserAssignedIdQueryParameterNames.MANAGED_IDENTITY_CLIENT_ID_2017
                    : ManagedIdentityUserAssignedIdQueryParameterNames.MANAGED_IDENTITY_CLIENT_ID;
            case ManagedIdentityIdType.USER_ASSIGNED_RESOURCE_ID:
                this.logger.info("[Managed Identity] Adding user assigned resource id to the request.");
                return isImds
                    ? ManagedIdentityUserAssignedIdQueryParameterNames.MANAGED_IDENTITY_RESOURCE_ID_IMDS
                    : ManagedIdentityUserAssignedIdQueryParameterNames.MANAGED_IDENTITY_RESOURCE_ID_NON_IMDS;
            case ManagedIdentityIdType.USER_ASSIGNED_OBJECT_ID:
                this.logger.info("[Managed Identity] Adding user assigned object id to the request.");
                return ManagedIdentityUserAssignedIdQueryParameterNames.MANAGED_IDENTITY_OBJECT_ID;
            default:
                throw createManagedIdentityError(invalidManagedIdentityIdType);
        }
    }
}
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
BaseManagedIdentitySource.getValidatedEnvVariableUrlString = (envVariableStringName, envVariable, sourceName, logger) => {
    try {
        return new UrlString(envVariable).urlString;
    }
    catch (error) {
        logger.info(`[Managed Identity] ${sourceName} managed identity is unavailable because the '${envVariableStringName}' environment variable is malformed.`);
        throw createManagedIdentityError(MsiEnvironmentVariableUrlMalformedErrorCodes[envVariableStringName]);
    }
};

export { BaseManagedIdentitySource, ManagedIdentityUserAssignedIdQueryParameterNames };
//# sourceMappingURL=BaseManagedIdentitySource.mjs.map
