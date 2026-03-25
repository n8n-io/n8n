/*! @azure/msal-node v3.8.4 2025-12-04 */
'use strict';
import { Logger, DEFAULT_CRYPTO_IMPLEMENTATION, Constants, Authority, ProtocolMode, createClientConfigurationError, ClientConfigurationErrorCodes, EncodingTypes, CacheOutcome } from '@azure/msal-common/node';
import { buildManagedIdentityConfiguration } from '../config/Configuration.mjs';
import { name, version } from '../packageMetadata.mjs';
import { CryptoProvider } from '../crypto/CryptoProvider.mjs';
import { ClientCredentialClient } from './ClientCredentialClient.mjs';
import { ManagedIdentityClient } from './ManagedIdentityClient.mjs';
import { NodeStorage } from '../cache/NodeStorage.mjs';
import { DEFAULT_AUTHORITY_FOR_MANAGED_IDENTITY, ManagedIdentitySourceNames } from '../utils/Constants.mjs';
import { HashUtils } from '../crypto/HashUtils.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const SOURCES_THAT_SUPPORT_TOKEN_REVOCATION = [ManagedIdentitySourceNames.SERVICE_FABRIC];
/**
 * Class to initialize a managed identity and identify the service
 * @public
 */
class ManagedIdentityApplication {
    constructor(configuration) {
        // undefined config means the managed identity is system-assigned
        this.config = buildManagedIdentityConfiguration(configuration || {});
        this.logger = new Logger(this.config.system.loggerOptions, name, version);
        const fakeStatusAuthorityOptions = {
            canonicalAuthority: Constants.DEFAULT_AUTHORITY,
        };
        if (!ManagedIdentityApplication.nodeStorage) {
            ManagedIdentityApplication.nodeStorage = new NodeStorage(this.logger, this.config.managedIdentityId.id, DEFAULT_CRYPTO_IMPLEMENTATION, fakeStatusAuthorityOptions);
        }
        this.networkClient = this.config.system.networkClient;
        this.cryptoProvider = new CryptoProvider();
        const fakeAuthorityOptions = {
            protocolMode: ProtocolMode.AAD,
            knownAuthorities: [DEFAULT_AUTHORITY_FOR_MANAGED_IDENTITY],
            cloudDiscoveryMetadata: "",
            authorityMetadata: "",
        };
        this.fakeAuthority = new Authority(DEFAULT_AUTHORITY_FOR_MANAGED_IDENTITY, this.networkClient, ManagedIdentityApplication.nodeStorage, fakeAuthorityOptions, this.logger, this.cryptoProvider.createNewGuid(), // correlationID
        undefined, true);
        this.fakeClientCredentialClient = new ClientCredentialClient({
            authOptions: {
                clientId: this.config.managedIdentityId.id,
                authority: this.fakeAuthority,
            },
        });
        this.managedIdentityClient = new ManagedIdentityClient(this.logger, ManagedIdentityApplication.nodeStorage, this.networkClient, this.cryptoProvider, this.config.disableInternalRetries);
        this.hashUtils = new HashUtils();
    }
    /**
     * Acquire an access token from the cache or the managed identity
     * @param managedIdentityRequest - the ManagedIdentityRequestParams object passed in by the developer
     * @returns the access token
     */
    async acquireToken(managedIdentityRequestParams) {
        if (!managedIdentityRequestParams.resource) {
            throw createClientConfigurationError(ClientConfigurationErrorCodes.urlEmptyError);
        }
        const managedIdentityRequest = {
            forceRefresh: managedIdentityRequestParams.forceRefresh,
            resource: managedIdentityRequestParams.resource.replace("/.default", ""),
            scopes: [
                managedIdentityRequestParams.resource.replace("/.default", ""),
            ],
            authority: this.fakeAuthority.canonicalAuthority,
            correlationId: this.cryptoProvider.createNewGuid(),
            claims: managedIdentityRequestParams.claims,
            clientCapabilities: this.config.clientCapabilities,
        };
        if (managedIdentityRequest.forceRefresh) {
            return this.acquireTokenFromManagedIdentity(managedIdentityRequest, this.config.managedIdentityId, this.fakeAuthority);
        }
        const [cachedAuthenticationResult, lastCacheOutcome] = await this.fakeClientCredentialClient.getCachedAuthenticationResult(managedIdentityRequest, this.config, this.cryptoProvider, this.fakeAuthority, ManagedIdentityApplication.nodeStorage);
        /*
         * Check if claims are present in the managed identity request.
         * If so, the cached token will not be used.
         */
        if (managedIdentityRequest.claims) {
            const sourceName = this.managedIdentityClient.getManagedIdentitySource();
            /*
             * Check if there is a cached token and if the Managed Identity source supports token revocation.
             * If so, hash the cached access token and add it to the request.
             */
            if (cachedAuthenticationResult &&
                SOURCES_THAT_SUPPORT_TOKEN_REVOCATION.includes(sourceName)) {
                const revokedTokenSha256Hash = this.hashUtils
                    .sha256(cachedAuthenticationResult.accessToken)
                    .toString(EncodingTypes.HEX);
                managedIdentityRequest.revokedTokenSha256Hash =
                    revokedTokenSha256Hash;
            }
            return this.acquireTokenFromManagedIdentity(managedIdentityRequest, this.config.managedIdentityId, this.fakeAuthority);
        }
        if (cachedAuthenticationResult) {
            // if the token is not expired but must be refreshed; get a new one in the background
            if (lastCacheOutcome === CacheOutcome.PROACTIVELY_REFRESHED) {
                this.logger.info("ClientCredentialClient:getCachedAuthenticationResult - Cached access token's refreshOn property has been exceeded'. It's not expired, but must be refreshed.");
                // force refresh; will run in the background
                const refreshAccessToken = true;
                await this.acquireTokenFromManagedIdentity(managedIdentityRequest, this.config.managedIdentityId, this.fakeAuthority, refreshAccessToken);
            }
            return cachedAuthenticationResult;
        }
        else {
            return this.acquireTokenFromManagedIdentity(managedIdentityRequest, this.config.managedIdentityId, this.fakeAuthority);
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
    async acquireTokenFromManagedIdentity(managedIdentityRequest, managedIdentityId, fakeAuthority, refreshAccessToken) {
        // make a network call to the managed identity
        return this.managedIdentityClient.sendManagedIdentityTokenRequest(managedIdentityRequest, managedIdentityId, fakeAuthority, refreshAccessToken);
    }
    /**
     * Determine the Managed Identity Source based on available environment variables. This API is consumed by Azure Identity SDK.
     * @returns ManagedIdentitySourceNames - The Managed Identity source's name
     */
    getManagedIdentitySource() {
        return (ManagedIdentityClient.sourceName ||
            this.managedIdentityClient.getManagedIdentitySource());
    }
}

export { ManagedIdentityApplication };
//# sourceMappingURL=ManagedIdentityApplication.mjs.map
