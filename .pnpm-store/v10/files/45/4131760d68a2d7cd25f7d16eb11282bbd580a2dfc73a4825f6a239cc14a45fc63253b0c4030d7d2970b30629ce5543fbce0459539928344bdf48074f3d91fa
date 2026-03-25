/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { INetworkModule, Logger } from "@azure/msal-common/node";
import { ManagedIdentityId } from "../../config/ManagedIdentityId.js";
import { ManagedIdentityRequestParameters } from "../../config/ManagedIdentityRequestParameters.js";
import { BaseManagedIdentitySource } from "./BaseManagedIdentitySource.js";
import { NodeStorage } from "../../cache/NodeStorage.js";
import { CryptoProvider } from "../../crypto/CryptoProvider.js";
import {
    HttpMethod,
    ManagedIdentityEnvironmentVariableNames,
    ManagedIdentityIdType,
    ManagedIdentitySourceNames,
    ManagedIdentityQueryParameters,
    ManagedIdentityHeaders,
} from "../../utils/Constants.js";

const SERVICE_FABRIC_MSI_API_VERSION: string = "2019-07-01-preview";

/**
 * Original source of code: https://github.com/Azure/azure-sdk-for-net/blob/main/sdk/identity/Azure.Identity/src/ServiceFabricManagedIdentitySource.cs
 */
export class ServiceFabric extends BaseManagedIdentitySource {
    private identityEndpoint: string;
    private identityHeader: string;

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
    public static getEnvironmentVariables(): Array<string | undefined> {
        const identityEndpoint: string | undefined =
            process.env[
                ManagedIdentityEnvironmentVariableNames.IDENTITY_ENDPOINT
            ];
        const identityHeader: string | undefined =
            process.env[
                ManagedIdentityEnvironmentVariableNames.IDENTITY_HEADER
            ];
        const identityServerThumbprint: string | undefined =
            process.env[
                ManagedIdentityEnvironmentVariableNames
                    .IDENTITY_SERVER_THUMBPRINT
            ];

        return [identityEndpoint, identityHeader, identityServerThumbprint];
    }

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
    public static tryCreate(
        logger: Logger,
        nodeStorage: NodeStorage,
        networkClient: INetworkModule,
        cryptoProvider: CryptoProvider,
        disableInternalRetries: boolean,
        managedIdentityId: ManagedIdentityId
    ): ServiceFabric | null {
        const [identityEndpoint, identityHeader, identityServerThumbprint] =
            ServiceFabric.getEnvironmentVariables();

        if (!identityEndpoint || !identityHeader || !identityServerThumbprint) {
            logger.info(
                `[Managed Identity] ${ManagedIdentitySourceNames.SERVICE_FABRIC} managed identity is unavailable because one or all of the '${ManagedIdentityEnvironmentVariableNames.IDENTITY_HEADER}', '${ManagedIdentityEnvironmentVariableNames.IDENTITY_ENDPOINT}' or '${ManagedIdentityEnvironmentVariableNames.IDENTITY_SERVER_THUMBPRINT}' environment variables are not defined.`
            );
            return null;
        }

        const validatedIdentityEndpoint: string =
            ServiceFabric.getValidatedEnvVariableUrlString(
                ManagedIdentityEnvironmentVariableNames.IDENTITY_ENDPOINT,
                identityEndpoint,
                ManagedIdentitySourceNames.SERVICE_FABRIC,
                logger
            );

        logger.info(
            `[Managed Identity] Environment variables validation passed for ${ManagedIdentitySourceNames.SERVICE_FABRIC} managed identity. Endpoint URI: ${validatedIdentityEndpoint}. Creating ${ManagedIdentitySourceNames.SERVICE_FABRIC} managed identity.`
        );

        if (
            managedIdentityId.idType !== ManagedIdentityIdType.SYSTEM_ASSIGNED
        ) {
            logger.warning(
                `[Managed Identity] ${ManagedIdentitySourceNames.SERVICE_FABRIC} user assigned managed identity is configured in the cluster, not during runtime. See also: https://learn.microsoft.com/en-us/azure/service-fabric/configure-existing-cluster-enable-managed-identity-token-service.`
            );
        }

        return new ServiceFabric(
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
    public createRequest(
        resource: string,
        managedIdentityId: ManagedIdentityId
    ): ManagedIdentityRequestParameters {
        const request: ManagedIdentityRequestParameters =
            new ManagedIdentityRequestParameters(
                HttpMethod.GET,
                this.identityEndpoint
            );

        request.headers[ManagedIdentityHeaders.ML_AND_SF_SECRET_HEADER_NAME] =
            this.identityHeader;

        request.queryParameters[ManagedIdentityQueryParameters.API_VERSION] =
            SERVICE_FABRIC_MSI_API_VERSION;
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
