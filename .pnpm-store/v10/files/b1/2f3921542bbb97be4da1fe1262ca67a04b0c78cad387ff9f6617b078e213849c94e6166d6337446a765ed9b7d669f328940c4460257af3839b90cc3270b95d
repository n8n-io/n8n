/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    AuthOptions,
    Authority,
    AuthorityOptions,
    CacheOutcome,
    ClientConfiguration,
    Constants,
    DEFAULT_CRYPTO_IMPLEMENTATION,
    INetworkModule,
    Logger,
    ProtocolMode,
    StaticAuthorityOptions,
    AuthenticationResult,
    createClientConfigurationError,
    ClientConfigurationErrorCodes,
    EncodingTypes,
} from "@azure/msal-common/node";
import {
    ManagedIdentityConfiguration,
    ManagedIdentityNodeConfiguration,
    buildManagedIdentityConfiguration,
} from "../config/Configuration.js";
import { version, name } from "../packageMetadata.js";
import { ManagedIdentityRequest } from "../request/ManagedIdentityRequest.js";
import { CryptoProvider } from "../crypto/CryptoProvider.js";
import { ClientCredentialClient } from "./ClientCredentialClient.js";
import { ManagedIdentityClient } from "./ManagedIdentityClient.js";
import { ManagedIdentityRequestParams } from "../request/ManagedIdentityRequestParams.js";
import { NodeStorage } from "../cache/NodeStorage.js";
import {
    DEFAULT_AUTHORITY_FOR_MANAGED_IDENTITY,
    ManagedIdentitySourceNames,
} from "../utils/Constants.js";
import { ManagedIdentityId } from "../config/ManagedIdentityId.js";
import { HashUtils } from "../crypto/HashUtils.js";

const SOURCES_THAT_SUPPORT_TOKEN_REVOCATION: Array<ManagedIdentitySourceNames> =
    [ManagedIdentitySourceNames.SERVICE_FABRIC];

/**
 * Class to initialize a managed identity and identify the service
 * @public
 */
export class ManagedIdentityApplication {
    private config: ManagedIdentityNodeConfiguration;

    private logger: Logger;
    private static nodeStorage?: NodeStorage;
    private networkClient: INetworkModule;
    private cryptoProvider: CryptoProvider;

    // authority needs to be faked to re-use existing functionality in msal-common: caching in responseHandler, etc.
    private fakeAuthority: Authority;

    // the ClientCredentialClient class needs to be faked to call it's getCachedAuthenticationResult method
    private fakeClientCredentialClient: ClientCredentialClient;

    private managedIdentityClient: ManagedIdentityClient;

    private hashUtils: HashUtils;

    constructor(configuration?: ManagedIdentityConfiguration) {
        // undefined config means the managed identity is system-assigned
        this.config = buildManagedIdentityConfiguration(configuration || {});

        this.logger = new Logger(
            this.config.system.loggerOptions,
            name,
            version
        );

        const fakeStatusAuthorityOptions: StaticAuthorityOptions = {
            canonicalAuthority: Constants.DEFAULT_AUTHORITY,
        };

        if (!ManagedIdentityApplication.nodeStorage) {
            ManagedIdentityApplication.nodeStorage = new NodeStorage(
                this.logger,
                this.config.managedIdentityId.id,
                DEFAULT_CRYPTO_IMPLEMENTATION,
                fakeStatusAuthorityOptions
            );
        }

        this.networkClient = this.config.system.networkClient;

        this.cryptoProvider = new CryptoProvider();

        const fakeAuthorityOptions: AuthorityOptions = {
            protocolMode: ProtocolMode.AAD,
            knownAuthorities: [DEFAULT_AUTHORITY_FOR_MANAGED_IDENTITY],
            cloudDiscoveryMetadata: "",
            authorityMetadata: "",
        };
        this.fakeAuthority = new Authority(
            DEFAULT_AUTHORITY_FOR_MANAGED_IDENTITY,
            this.networkClient,
            ManagedIdentityApplication.nodeStorage as NodeStorage,
            fakeAuthorityOptions,
            this.logger,
            this.cryptoProvider.createNewGuid(), // correlationID
            undefined,
            true
        );

        this.fakeClientCredentialClient = new ClientCredentialClient({
            authOptions: {
                clientId: this.config.managedIdentityId.id,
                authority: this.fakeAuthority,
            } as AuthOptions,
        } as ClientConfiguration);

        this.managedIdentityClient = new ManagedIdentityClient(
            this.logger,
            ManagedIdentityApplication.nodeStorage as NodeStorage,
            this.networkClient,
            this.cryptoProvider,
            this.config.disableInternalRetries
        );

        this.hashUtils = new HashUtils();
    }

    /**
     * Acquire an access token from the cache or the managed identity
     * @param managedIdentityRequest - the ManagedIdentityRequestParams object passed in by the developer
     * @returns the access token
     */
    public async acquireToken(
        managedIdentityRequestParams: ManagedIdentityRequestParams
    ): Promise<AuthenticationResult> {
        if (!managedIdentityRequestParams.resource) {
            throw createClientConfigurationError(
                ClientConfigurationErrorCodes.urlEmptyError
            );
        }

        const managedIdentityRequest: ManagedIdentityRequest = {
            forceRefresh: managedIdentityRequestParams.forceRefresh,
            resource: managedIdentityRequestParams.resource.replace(
                "/.default",
                ""
            ),
            scopes: [
                managedIdentityRequestParams.resource.replace("/.default", ""),
            ],
            authority: this.fakeAuthority.canonicalAuthority,
            correlationId: this.cryptoProvider.createNewGuid(),
            claims: managedIdentityRequestParams.claims,
            clientCapabilities: this.config.clientCapabilities,
        };

        if (managedIdentityRequest.forceRefresh) {
            return this.acquireTokenFromManagedIdentity(
                managedIdentityRequest,
                this.config.managedIdentityId,
                this.fakeAuthority
            );
        }

        const [cachedAuthenticationResult, lastCacheOutcome] =
            await this.fakeClientCredentialClient.getCachedAuthenticationResult(
                managedIdentityRequest,
                this.config,
                this.cryptoProvider,
                this.fakeAuthority,
                ManagedIdentityApplication.nodeStorage as NodeStorage
            );

        /*
         * Check if claims are present in the managed identity request.
         * If so, the cached token will not be used.
         */
        if (managedIdentityRequest.claims) {
            const sourceName: ManagedIdentitySourceNames =
                this.managedIdentityClient.getManagedIdentitySource();

            /*
             * Check if there is a cached token and if the Managed Identity source supports token revocation.
             * If so, hash the cached access token and add it to the request.
             */
            if (
                cachedAuthenticationResult &&
                SOURCES_THAT_SUPPORT_TOKEN_REVOCATION.includes(sourceName)
            ) {
                const revokedTokenSha256Hash: string = this.hashUtils
                    .sha256(cachedAuthenticationResult.accessToken)
                    .toString(EncodingTypes.HEX);
                managedIdentityRequest.revokedTokenSha256Hash =
                    revokedTokenSha256Hash;
            }

            return this.acquireTokenFromManagedIdentity(
                managedIdentityRequest,
                this.config.managedIdentityId,
                this.fakeAuthority
            );
        }

        if (cachedAuthenticationResult) {
            // if the token is not expired but must be refreshed; get a new one in the background
            if (lastCacheOutcome === CacheOutcome.PROACTIVELY_REFRESHED) {
                this.logger.info(
                    "ClientCredentialClient:getCachedAuthenticationResult - Cached access token's refreshOn property has been exceeded'. It's not expired, but must be refreshed."
                );

                // force refresh; will run in the background
                const refreshAccessToken = true;
                await this.acquireTokenFromManagedIdentity(
                    managedIdentityRequest,
                    this.config.managedIdentityId,
                    this.fakeAuthority,
                    refreshAccessToken
                );
            }

            return cachedAuthenticationResult;
        } else {
            return this.acquireTokenFromManagedIdentity(
                managedIdentityRequest,
                this.config.managedIdentityId,
                this.fakeAuthority
            );
        }
    }

    /**
     * Acquires a token from a managed identity endpoint.
     *
     * @param managedIdentityRequest - The request object containing parameters for the managed identity token request.
     * @param managedIdentityId - The identifier for the managed identity (e.g., client ID or resource ID).
     * @param fakeAuthority - A placeholder authority used for the token request.
     * @param refreshAccessToken - Optional flag indicating whether to force a refresh of the access token.
     * @returns A promise that resolves to an AuthenticationResult containing the acquired token and related information.
     */
    private async acquireTokenFromManagedIdentity(
        managedIdentityRequest: ManagedIdentityRequest,
        managedIdentityId: ManagedIdentityId,
        fakeAuthority: Authority,
        refreshAccessToken?: boolean
    ): Promise<AuthenticationResult> {
        // make a network call to the managed identity
        return this.managedIdentityClient.sendManagedIdentityTokenRequest(
            managedIdentityRequest,
            managedIdentityId,
            fakeAuthority,
            refreshAccessToken
        );
    }

    /**
     * Determine the Managed Identity Source based on available environment variables. This API is consumed by Azure Identity SDK.
     * @returns ManagedIdentitySourceNames - The Managed Identity source's name
     */
    public getManagedIdentitySource(): ManagedIdentitySourceNames {
        return (
            ManagedIdentityClient.sourceName ||
            this.managedIdentityClient.getManagedIdentitySource()
        );
    }
}
