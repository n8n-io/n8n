/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { INetworkModule, Logger } from "@azure/msal-common/node";
import { BaseManagedIdentitySource } from "./BaseManagedIdentitySource.js";
import {
    HttpMethod,
    ManagedIdentityEnvironmentVariableNames,
    ManagedIdentitySourceNames,
    ManagedIdentityIdType,
    ManagedIdentityQueryParameters,
    ManagedIdentityHeaders,
} from "../../utils/Constants.js";
import { CryptoProvider } from "../../crypto/CryptoProvider.js";
import { ManagedIdentityRequestParameters } from "../../config/ManagedIdentityRequestParameters.js";
import { ManagedIdentityId } from "../../config/ManagedIdentityId.js";
import { NodeStorage } from "../../cache/NodeStorage.js";

// MSI Constants. Docs for MSI are available here https://docs.microsoft.com/azure/app-service/overview-managed-identity
const APP_SERVICE_MSI_API_VERSION: string = "2019-08-01";

/**
 * Azure App Service Managed Identity Source implementation.
 *
 * This class provides managed identity authentication for applications running in Azure App Service.
 * It uses the local metadata service endpoint available within App Service environments to obtain
 * access tokens without requiring explicit credentials.
 *
 * Original source of code: https://github.com/Azure/azure-sdk-for-net/blob/main/sdk/identity/Azure.Identity/src/AppServiceManagedIdentitySource.cs
 */
export class AppService extends BaseManagedIdentitySource {
    private identityEndpoint: string;
    private identityHeader: string;

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
    constructor(
        logger: Logger,
        nodeStorage: NodeStorage,
        networkClient: INetworkModule,
        cryptoProvider: CryptoProvider,
        disableInternalRetries: boolean,
        identityEndpoint: string,
        identityHeader: string
    ) {
        super(
            logger,
            nodeStorage,
            networkClient,
            cryptoProvider,
            disableInternalRetries
        );

        this.identityEndpoint = identityEndpoint;
        this.identityHeader = identityHeader;
    }

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
    public static getEnvironmentVariables(): Array<string | undefined> {
        const identityEndpoint: string | undefined =
            process.env[
                ManagedIdentityEnvironmentVariableNames.IDENTITY_ENDPOINT
            ];
        const identityHeader: string | undefined =
            process.env[
                ManagedIdentityEnvironmentVariableNames.IDENTITY_HEADER
            ];

        return [identityEndpoint, identityHeader];
    }

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
    public static tryCreate(
        logger: Logger,
        nodeStorage: NodeStorage,
        networkClient: INetworkModule,
        cryptoProvider: CryptoProvider,
        disableInternalRetries: boolean
    ): AppService | null {
        const [identityEndpoint, identityHeader] =
            AppService.getEnvironmentVariables();

        // if either of the identity endpoint or identity header variables are undefined, this MSI provider is unavailable.
        if (!identityEndpoint || !identityHeader) {
            logger.info(
                `[Managed Identity] ${ManagedIdentitySourceNames.APP_SERVICE} managed identity is unavailable because one or both of the '${ManagedIdentityEnvironmentVariableNames.IDENTITY_HEADER}' and '${ManagedIdentityEnvironmentVariableNames.IDENTITY_ENDPOINT}' environment variables are not defined.`
            );
            return null;
        }

        const validatedIdentityEndpoint: string =
            AppService.getValidatedEnvVariableUrlString(
                ManagedIdentityEnvironmentVariableNames.IDENTITY_ENDPOINT,
                identityEndpoint,
                ManagedIdentitySourceNames.APP_SERVICE,
                logger
            );

        logger.info(
            `[Managed Identity] Environment variables validation passed for ${ManagedIdentitySourceNames.APP_SERVICE} managed identity. Endpoint URI: ${validatedIdentityEndpoint}. Creating ${ManagedIdentitySourceNames.APP_SERVICE} managed identity.`
        );

        return new AppService(
            logger,
            nodeStorage,
            networkClient,
            cryptoProvider,
            disableInternalRetries,
            identityEndpoint,
            identityHeader
        );
    }

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
    public createRequest(
        resource: string,
        managedIdentityId: ManagedIdentityId
    ): ManagedIdentityRequestParameters {
        const request: ManagedIdentityRequestParameters =
            new ManagedIdentityRequestParameters(
                HttpMethod.GET,
                this.identityEndpoint
            );

        request.headers[ManagedIdentityHeaders.APP_SERVICE_SECRET_HEADER_NAME] =
            this.identityHeader;

        request.queryParameters[ManagedIdentityQueryParameters.API_VERSION] =
            APP_SERVICE_MSI_API_VERSION;
        request.queryParameters[ManagedIdentityQueryParameters.RESOURCE] =
            resource;

        if (
            managedIdentityId.idType !== ManagedIdentityIdType.SYSTEM_ASSIGNED
        ) {
            request.queryParameters[
                this.getManagedIdentityUserAssignedIdQueryParameterKey(
                    managedIdentityId.idType
                )
            ] = managedIdentityId.id;
        }

        // bodyParameters calculated in BaseManagedIdentity.acquireTokenWithManagedIdentity

        return request;
    }
}
