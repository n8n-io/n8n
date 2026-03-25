/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    AuthError,
    ClientAuthErrorCodes,
    createClientAuthError,
    HttpStatus,
    INetworkModule,
    NetworkResponse,
    NetworkRequestOptions,
    Logger,
    ServerAuthorizationTokenResponse,
    EncodingTypes,
} from "@azure/msal-common/node";
import { ManagedIdentityRequestParameters } from "../../config/ManagedIdentityRequestParameters.js";
import { BaseManagedIdentitySource } from "./BaseManagedIdentitySource.js";
import { CryptoProvider } from "../../crypto/CryptoProvider.js";
import {
    ManagedIdentityErrorCodes,
    createManagedIdentityError,
} from "../../error/ManagedIdentityError.js";
import {
    AZURE_ARC_SECRET_FILE_MAX_SIZE_BYTES,
    HttpMethod,
    ManagedIdentityEnvironmentVariableNames,
    ManagedIdentityHeaders,
    ManagedIdentityIdType,
    ManagedIdentityQueryParameters,
    ManagedIdentitySourceNames,
} from "../../utils/Constants.js";
import { NodeStorage } from "../../cache/NodeStorage.js";
import {
    accessSync,
    constants as fsConstants,
    readFileSync,
    statSync,
} from "fs";
import { ManagedIdentityTokenResponse } from "../../response/ManagedIdentityTokenResponse.js";
import { ManagedIdentityId } from "../../config/ManagedIdentityId.js";
import path from "path";

export const ARC_API_VERSION: string = "2019-11-01";
export const DEFAULT_AZURE_ARC_IDENTITY_ENDPOINT: string =
    "http://127.0.0.1:40342/metadata/identity/oauth2/token";
const HIMDS_EXECUTABLE_HELPER_STRING = "N/A: himds executable exists";

type FilePathMap = {
    win32: string;
    linux: string;
};

export const SUPPORTED_AZURE_ARC_PLATFORMS: FilePathMap = {
    win32: `${process.env["ProgramData"]}\\AzureConnectedMachineAgent\\Tokens\\`,
    linux: "/var/opt/azcmagent/tokens/",
};

export const AZURE_ARC_FILE_DETECTION: FilePathMap = {
    win32: `${process.env["ProgramFiles"]}\\AzureConnectedMachineAgent\\himds.exe`,
    linux: "/opt/azcmagent/bin/himds",
};

/**
 * Azure Arc managed identity source implementation for acquiring tokens from Azure Arc-enabled servers.
 *
 * This class provides managed identity authentication for applications running on Azure Arc-enabled servers
 * by communicating with the local Hybrid Instance Metadata Service (HIMDS). It supports both environment
 * variable-based configuration and automatic detection through the HIMDS executable.
 *
 * Original source of code: https://github.com/Azure/azure-sdk-for-net/blob/main/sdk/identity/Azure.Identity/src/AzureArcManagedIdentitySource.cs
 */
export class AzureArc extends BaseManagedIdentitySource {
    private identityEndpoint: string;

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
    public static getEnvironmentVariables(): Array<string | undefined> {
        let identityEndpoint: string | undefined =
            process.env[
                ManagedIdentityEnvironmentVariableNames.IDENTITY_ENDPOINT
            ];
        let imdsEndpoint: string | undefined =
            process.env[ManagedIdentityEnvironmentVariableNames.IMDS_ENDPOINT];

        // if either of the identity or imds endpoints are undefined, check if the himds executable exists
        if (!identityEndpoint || !imdsEndpoint) {
            // get the expected Windows or Linux file path of the himds executable
            const fileDetectionPath: string =
                AZURE_ARC_FILE_DETECTION[process.platform as keyof FilePathMap];
            try {
                /*
                 * check if the himds executable exists and its permissions allow it to be read
                 * returns undefined if true, throws an error otherwise
                 */
                accessSync(
                    fileDetectionPath,
                    fsConstants.F_OK | fsConstants.R_OK
                );

                identityEndpoint = DEFAULT_AZURE_ARC_IDENTITY_ENDPOINT;
                imdsEndpoint = HIMDS_EXECUTABLE_HELPER_STRING;
            } catch (err) {
                /*
                 * do nothing
                 * accessSync returns undefined on success, and throws an error on failure
                 */
            }
        }

        return [identityEndpoint, imdsEndpoint];
    }

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
    public static tryCreate(
        logger: Logger,
        nodeStorage: NodeStorage,
        networkClient: INetworkModule,
        cryptoProvider: CryptoProvider,
        disableInternalRetries: boolean,
        managedIdentityId: ManagedIdentityId
    ): AzureArc | null {
        const [identityEndpoint, imdsEndpoint] =
            AzureArc.getEnvironmentVariables();

        // if either of the identity or imds endpoints are undefined (even after himds file detection)
        if (!identityEndpoint || !imdsEndpoint) {
            logger.info(
                `[Managed Identity] ${ManagedIdentitySourceNames.AZURE_ARC} managed identity is unavailable through environment variables because one or both of '${ManagedIdentityEnvironmentVariableNames.IDENTITY_ENDPOINT}' and '${ManagedIdentityEnvironmentVariableNames.IMDS_ENDPOINT}' are not defined. ${ManagedIdentitySourceNames.AZURE_ARC} managed identity is also unavailable through file detection.`
            );

            return null;
        }

        // check if the imds endpoint is set to the default for file detection
        if (imdsEndpoint === HIMDS_EXECUTABLE_HELPER_STRING) {
            logger.info(
                `[Managed Identity] ${ManagedIdentitySourceNames.AZURE_ARC} managed identity is available through file detection. Defaulting to known ${ManagedIdentitySourceNames.AZURE_ARC} endpoint: ${DEFAULT_AZURE_ARC_IDENTITY_ENDPOINT}. Creating ${ManagedIdentitySourceNames.AZURE_ARC} managed identity.`
            );
        } else {
            // otherwise, both the identity and imds endpoints are defined without file detection; validate them

            const validatedIdentityEndpoint: string =
                AzureArc.getValidatedEnvVariableUrlString(
                    ManagedIdentityEnvironmentVariableNames.IDENTITY_ENDPOINT,
                    identityEndpoint,
                    ManagedIdentitySourceNames.AZURE_ARC,
                    logger
                );
            // remove trailing slash
            validatedIdentityEndpoint.endsWith("/")
                ? validatedIdentityEndpoint.slice(0, -1)
                : validatedIdentityEndpoint;

            AzureArc.getValidatedEnvVariableUrlString(
                ManagedIdentityEnvironmentVariableNames.IMDS_ENDPOINT,
                imdsEndpoint,
                ManagedIdentitySourceNames.AZURE_ARC,
                logger
            );

            logger.info(
                `[Managed Identity] Environment variables validation passed for ${ManagedIdentitySourceNames.AZURE_ARC} managed identity. Endpoint URI: ${validatedIdentityEndpoint}. Creating ${ManagedIdentitySourceNames.AZURE_ARC} managed identity.`
            );
        }

        if (
            managedIdentityId.idType !== ManagedIdentityIdType.SYSTEM_ASSIGNED
        ) {
            throw createManagedIdentityError(
                ManagedIdentityErrorCodes.unableToCreateAzureArc
            );
        }

        return new AzureArc(
            logger,
            nodeStorage,
            networkClient,
            cryptoProvider,
            disableInternalRetries,
            identityEndpoint
        );
    }

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
    public createRequest(resource: string): ManagedIdentityRequestParameters {
        const request: ManagedIdentityRequestParameters =
            new ManagedIdentityRequestParameters(
                HttpMethod.GET,
                this.identityEndpoint.replace("localhost", "127.0.0.1")
            );

        request.headers[ManagedIdentityHeaders.METADATA_HEADER_NAME] = "true";

        request.queryParameters[ManagedIdentityQueryParameters.API_VERSION] =
            ARC_API_VERSION;
        request.queryParameters[ManagedIdentityQueryParameters.RESOURCE] =
            resource;

        // bodyParameters calculated in BaseManagedIdentity.acquireTokenWithManagedIdentity

        return request;
    }

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
    public async getServerTokenResponseAsync(
        originalResponse: NetworkResponse<ManagedIdentityTokenResponse>,
        networkClient: INetworkModule,
        networkRequest: ManagedIdentityRequestParameters,
        networkRequestOptions: NetworkRequestOptions
    ): Promise<ServerAuthorizationTokenResponse> {
        let retryResponse:
            | NetworkResponse<ManagedIdentityTokenResponse>
            | undefined;

        if (originalResponse.status === HttpStatus.UNAUTHORIZED) {
            const wwwAuthHeader: string =
                originalResponse.headers["www-authenticate"];
            if (!wwwAuthHeader) {
                throw createManagedIdentityError(
                    ManagedIdentityErrorCodes.wwwAuthenticateHeaderMissing
                );
            }
            if (!wwwAuthHeader.includes("Basic realm=")) {
                throw createManagedIdentityError(
                    ManagedIdentityErrorCodes.wwwAuthenticateHeaderUnsupportedFormat
                );
            }

            const secretFilePath = wwwAuthHeader.split("Basic realm=")[1];

            // throw an error if the managed identity application is not being run on Windows or Linux
            if (
                !SUPPORTED_AZURE_ARC_PLATFORMS.hasOwnProperty(process.platform)
            ) {
                throw createManagedIdentityError(
                    ManagedIdentityErrorCodes.platformNotSupported
                );
            }

            // get the expected Windows or Linux file path
            const expectedSecretFilePath: string =
                SUPPORTED_AZURE_ARC_PLATFORMS[
                    process.platform as keyof FilePathMap
                ];

            // throw an error if the file in the file path is not a .key file
            const fileName: string = path.basename(secretFilePath);
            if (!fileName.endsWith(".key")) {
                throw createManagedIdentityError(
                    ManagedIdentityErrorCodes.invalidFileExtension
                );
            }

            /*
             * throw an error if the file path from the www-authenticate header does not match the
             * expected file path for the platform (Windows or Linux) the managed identity application
             * is running on
             */
            if (expectedSecretFilePath + fileName !== secretFilePath) {
                throw createManagedIdentityError(
                    ManagedIdentityErrorCodes.invalidFilePath
                );
            }

            let secretFileSize;
            // attempt to get the secret file's size, in bytes
            try {
                secretFileSize = await statSync(secretFilePath).size;
            } catch (e) {
                throw createManagedIdentityError(
                    ManagedIdentityErrorCodes.unableToReadSecretFile
                );
            }
            // throw an error if the secret file's size is greater than 4096 bytes
            if (secretFileSize > AZURE_ARC_SECRET_FILE_MAX_SIZE_BYTES) {
                throw createManagedIdentityError(
                    ManagedIdentityErrorCodes.invalidSecret
                );
            }

            // attempt to read the contents of the secret file
            let secret;
            try {
                secret = readFileSync(secretFilePath, EncodingTypes.UTF8);
            } catch (e) {
                throw createManagedIdentityError(
                    ManagedIdentityErrorCodes.unableToReadSecretFile
                );
            }
            const authHeaderValue = `Basic ${secret}`;

            this.logger.info(
                `[Managed Identity] Adding authorization header to the request.`
            );
            networkRequest.headers[
                ManagedIdentityHeaders.AUTHORIZATION_HEADER_NAME
            ] = authHeaderValue;

            try {
                retryResponse =
                    await networkClient.sendGetRequestAsync<ManagedIdentityTokenResponse>(
                        networkRequest.computeUri(),
                        networkRequestOptions
                    );
            } catch (error) {
                if (error instanceof AuthError) {
                    throw error;
                } else {
                    throw createClientAuthError(
                        ClientAuthErrorCodes.networkError
                    );
                }
            }
        }

        return this.getServerTokenResponse(retryResponse || originalResponse);
    }
}
