/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { INetworkModule, Logger } from "@azure/msal-common/node";
import {
    BaseManagedIdentitySource,
    ManagedIdentityUserAssignedIdQueryParameterNames,
} from "./BaseManagedIdentitySource.js";
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

const MACHINE_LEARNING_MSI_API_VERSION: string = "2017-09-01";

export const MANAGED_IDENTITY_MACHINE_LEARNING_UNSUPPORTED_ID_TYPE_ERROR = `Only client id is supported for user-assigned managed identity in ${ManagedIdentitySourceNames.MACHINE_LEARNING}.`; // referenced in unit test

/**
 * Machine Learning Managed Identity Source implementation for Azure Machine Learning environments.
 *
 * This class handles managed identity authentication specifically for Azure Machine Learning services.
 * It supports both system-assigned and user-assigned managed identities, using the MSI_ENDPOINT
 * and MSI_SECRET environment variables that are automatically provided in Azure ML environments.
 */
export class MachineLearning extends BaseManagedIdentitySource {
    private msiEndpoint: string;
    private secret: string;

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
    constructor(
        logger: Logger,
        nodeStorage: NodeStorage,
        networkClient: INetworkModule,
        cryptoProvider: CryptoProvider,
        disableInternalRetries: boolean,
        msiEndpoint: string,
        secret: string
    ) {
        super(
            logger,
            nodeStorage,
            networkClient,
            cryptoProvider,
            disableInternalRetries
        );

        this.msiEndpoint = msiEndpoint;
        this.secret = secret;
    }

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
    public static getEnvironmentVariables(): Array<string | undefined> {
        const msiEndpoint: string | undefined =
            process.env[ManagedIdentityEnvironmentVariableNames.MSI_ENDPOINT];

        const secret: string | undefined =
            process.env[ManagedIdentityEnvironmentVariableNames.MSI_SECRET];

        return [msiEndpoint, secret];
    }

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
    public static tryCreate(
        logger: Logger,
        nodeStorage: NodeStorage,
        networkClient: INetworkModule,
        cryptoProvider: CryptoProvider,
        disableInternalRetries: boolean
    ): MachineLearning | null {
        const [msiEndpoint, secret] = MachineLearning.getEnvironmentVariables();

        // if either of the MSI endpoint or MSI secret variables are undefined, this MSI provider is unavailable.
        if (!msiEndpoint || !secret) {
            logger.info(
                `[Managed Identity] ${ManagedIdentitySourceNames.MACHINE_LEARNING} managed identity is unavailable because one or both of the '${ManagedIdentityEnvironmentVariableNames.MSI_ENDPOINT}' and '${ManagedIdentityEnvironmentVariableNames.MSI_SECRET}' environment variables are not defined.`
            );
            return null;
        }

        const validatedMsiEndpoint: string =
            MachineLearning.getValidatedEnvVariableUrlString(
                ManagedIdentityEnvironmentVariableNames.MSI_ENDPOINT,
                msiEndpoint,
                ManagedIdentitySourceNames.MACHINE_LEARNING,
                logger
            );

        logger.info(
            `[Managed Identity] Environment variables validation passed for ${ManagedIdentitySourceNames.MACHINE_LEARNING} managed identity. Endpoint URI: ${validatedMsiEndpoint}. Creating ${ManagedIdentitySourceNames.MACHINE_LEARNING} managed identity.`
        );

        return new MachineLearning(
            logger,
            nodeStorage,
            networkClient,
            cryptoProvider,
            disableInternalRetries,
            msiEndpoint,
            secret
        );
    }

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
    public createRequest(
        resource: string,
        managedIdentityId: ManagedIdentityId
    ): ManagedIdentityRequestParameters {
        const request: ManagedIdentityRequestParameters =
            new ManagedIdentityRequestParameters(
                HttpMethod.GET,
                this.msiEndpoint
            );

        request.headers[ManagedIdentityHeaders.METADATA_HEADER_NAME] = "true";
        request.headers[ManagedIdentityHeaders.ML_AND_SF_SECRET_HEADER_NAME] =
            this.secret;

        request.queryParameters[ManagedIdentityQueryParameters.API_VERSION] =
            MACHINE_LEARNING_MSI_API_VERSION;
        request.queryParameters[ManagedIdentityQueryParameters.RESOURCE] =
            resource;

        if (
            managedIdentityId.idType === ManagedIdentityIdType.SYSTEM_ASSIGNED
        ) {
            request.queryParameters[
                ManagedIdentityUserAssignedIdQueryParameterNames.MANAGED_IDENTITY_CLIENT_ID_2017
            ] = process.env[
                ManagedIdentityEnvironmentVariableNames
                    .DEFAULT_IDENTITY_CLIENT_ID
            ] as string; // this environment variable is always set in an Azure Machine Learning source
        } else if (
            managedIdentityId.idType ===
            ManagedIdentityIdType.USER_ASSIGNED_CLIENT_ID
        ) {
            request.queryParameters[
                this.getManagedIdentityUserAssignedIdQueryParameterKey(
                    managedIdentityId.idType,
                    false, // isIMDS
                    true // uses2017API
                )
            ] = managedIdentityId.id;
        } else {
            throw new Error(
                MANAGED_IDENTITY_MACHINE_LEARNING_UNSUPPORTED_ID_TYPE_ERROR
            );
        }

        // bodyParameters calculated in BaseManagedIdentity.acquireTokenWithManagedIdentity

        return request;
    }
}
