/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { INetworkModule, Logger } from "@azure/msal-common/node";
import { ManagedIdentityId } from "../../config/ManagedIdentityId.js";
import { ManagedIdentityRequestParameters } from "../../config/ManagedIdentityRequestParameters.js";
import { BaseManagedIdentitySource } from "./BaseManagedIdentitySource.js";
import { CryptoProvider } from "../../crypto/CryptoProvider.js";
import {
    HttpMethod,
    ManagedIdentityEnvironmentVariableNames,
    ManagedIdentityHeaders,
    ManagedIdentityIdType,
    ManagedIdentityQueryParameters,
    ManagedIdentitySourceNames,
} from "../../utils/Constants.js";
import { NodeStorage } from "../../cache/NodeStorage.js";
import { ImdsRetryPolicy } from "../../retry/ImdsRetryPolicy.js";

// Documentation for IMDS is available at https://docs.microsoft.com/azure/active-directory/managed-identities-azure-resources/how-to-use-vm-token#get-a-token-using-http

const IMDS_TOKEN_PATH: string = "/metadata/identity/oauth2/token";
const DEFAULT_IMDS_ENDPOINT: string = `http://169.254.169.254${IMDS_TOKEN_PATH}`;
const IMDS_API_VERSION: string = "2018-02-01";

/**
 * Managed Identity source implementation for Azure Instance Metadata Service (IMDS).
 *
 * IMDS is available on Azure Virtual Machines and Virtual Machine Scale Sets and provides
 * a REST endpoint to obtain OAuth tokens for managed identities. This implementation
 * handles both system-assigned and user-assigned managed identities.
 *
 * Original source of code: https://github.com/Azure/azure-sdk-for-net/blob/main/sdk/identity/Azure.Identity/src/ImdsManagedIdentitySource.cs
 */
export class Imds extends BaseManagedIdentitySource {
    private identityEndpoint: string;

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
    constructor(
        logger: Logger,
        nodeStorage: NodeStorage,
        networkClient: INetworkModule,
        cryptoProvider: CryptoProvider,
        disableInternalRetries: boolean,
        identityEndpoint: string
    ) {
        super(
            logger,
            nodeStorage,
            networkClient,
            cryptoProvider,
            disableInternalRetries
        );

        this.identityEndpoint = identityEndpoint;
    }

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
    public static tryCreate(
        logger: Logger,
        nodeStorage: NodeStorage,
        networkClient: INetworkModule,
        cryptoProvider: CryptoProvider,
        disableInternalRetries: boolean
    ): Imds {
        let validatedIdentityEndpoint: string;

        if (
            process.env[
                ManagedIdentityEnvironmentVariableNames
                    .AZURE_POD_IDENTITY_AUTHORITY_HOST
            ]
        ) {
            logger.info(
                `[Managed Identity] Environment variable ${
                    ManagedIdentityEnvironmentVariableNames.AZURE_POD_IDENTITY_AUTHORITY_HOST
                } for ${ManagedIdentitySourceNames.IMDS} returned endpoint: ${
                    process.env[
                        ManagedIdentityEnvironmentVariableNames
                            .AZURE_POD_IDENTITY_AUTHORITY_HOST
                    ]
                }`
            );
            validatedIdentityEndpoint = Imds.getValidatedEnvVariableUrlString(
                ManagedIdentityEnvironmentVariableNames.AZURE_POD_IDENTITY_AUTHORITY_HOST,
                `${
                    process.env[
                        ManagedIdentityEnvironmentVariableNames
                            .AZURE_POD_IDENTITY_AUTHORITY_HOST
                    ]
                }${IMDS_TOKEN_PATH}`,
                ManagedIdentitySourceNames.IMDS,
                logger
            );
        } else {
            logger.info(
                `[Managed Identity] Unable to find ${ManagedIdentityEnvironmentVariableNames.AZURE_POD_IDENTITY_AUTHORITY_HOST} environment variable for ${ManagedIdentitySourceNames.IMDS}, using the default endpoint.`
            );
            validatedIdentityEndpoint = DEFAULT_IMDS_ENDPOINT;
        }

        return new Imds(
            logger,
            nodeStorage,
            networkClient,
            cryptoProvider,
            disableInternalRetries,
            validatedIdentityEndpoint
        );
    }

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
    public createRequest(
        resource: string,
        managedIdentityId: ManagedIdentityId
    ): ManagedIdentityRequestParameters {
        const request: ManagedIdentityRequestParameters =
            new ManagedIdentityRequestParameters(
                HttpMethod.GET,
                this.identityEndpoint
            );

        request.headers[ManagedIdentityHeaders.METADATA_HEADER_NAME] = "true";

        request.queryParameters[ManagedIdentityQueryParameters.API_VERSION] =
            IMDS_API_VERSION;
        request.queryParameters[ManagedIdentityQueryParameters.RESOURCE] =
            resource;

        if (
            managedIdentityId.idType !== ManagedIdentityIdType.SYSTEM_ASSIGNED
        ) {
            request.queryParameters[
                this.getManagedIdentityUserAssignedIdQueryParameterKey(
                    managedIdentityId.idType,
                    true // indicates source is IMDS
                )
            ] = managedIdentityId.id;
        }

        // The bodyParameters are calculated in BaseManagedIdentity.acquireTokenWithManagedIdentity.

        request.retryPolicy = new ImdsRetryPolicy();

        return request;
    }
}
