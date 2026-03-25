/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { UrlString, ServerTelemetryManager, PerformanceEvents, Authority, invokeAsync, AuthorityFactory, createClientConfigurationError, ClientConfigurationErrorCodes } from '@azure/msal-common/browser';
import { version } from '../packageMetadata.mjs';
import { BrowserConstants } from '../utils/BrowserConstants.mjs';
import { getCurrentUri } from '../utils/BrowserUtils.mjs';
import { createNewGuid } from '../crypto/BrowserCrypto.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
class BaseInteractionClient {
    constructor(config, storageImpl, browserCrypto, logger, eventHandler, navigationClient, performanceClient, platformAuthProvider, correlationId) {
        this.config = config;
        this.browserStorage = storageImpl;
        this.browserCrypto = browserCrypto;
        this.networkClient = this.config.system.networkClient;
        this.eventHandler = eventHandler;
        this.navigationClient = navigationClient;
        this.platformAuthProvider = platformAuthProvider;
        this.correlationId = correlationId || createNewGuid();
        this.logger = logger.clone(BrowserConstants.MSAL_SKU, version, this.correlationId);
        this.performanceClient = performanceClient;
    }
    async clearCacheOnLogout(correlationId, account) {
        if (account) {
            // Clear given account.
            try {
                this.browserStorage.removeAccount(account, correlationId);
                this.logger.verbose("Cleared cache items belonging to the account provided in the logout request.");
            }
            catch (error) {
                this.logger.error("Account provided in logout request was not found. Local cache unchanged.");
            }
        }
        else {
            try {
                this.logger.verbose("No account provided in logout request, clearing all cache items.", this.correlationId);
                // Clear all accounts and tokens
                this.browserStorage.clear(correlationId);
                // Clear any stray keys from IndexedDB
                await this.browserCrypto.clearKeystore();
            }
            catch (e) {
                this.logger.error("Attempted to clear all MSAL cache items and failed. Local cache unchanged.");
            }
        }
    }
    /**
     *
     * Use to get the redirect uri configured in MSAL or null.
     * @param requestRedirectUri
     * @returns Redirect URL
     *
     */
    getRedirectUri(requestRedirectUri) {
        this.logger.verbose("getRedirectUri called");
        const redirectUri = requestRedirectUri || this.config.auth.redirectUri;
        return UrlString.getAbsoluteUrl(redirectUri, getCurrentUri());
    }
    /**
     *
     * @param apiId
     * @param correlationId
     * @param forceRefresh
     */
    initializeServerTelemetryManager(apiId, forceRefresh) {
        this.logger.verbose("initializeServerTelemetryManager called");
        const telemetryPayload = {
            clientId: this.config.auth.clientId,
            correlationId: this.correlationId,
            apiId: apiId,
            forceRefresh: forceRefresh || false,
            wrapperSKU: this.browserStorage.getWrapperMetadata()[0],
            wrapperVer: this.browserStorage.getWrapperMetadata()[1],
        };
        return new ServerTelemetryManager(telemetryPayload, this.browserStorage);
    }
    /**
     * Used to get a discovered version of the default authority.
     * @param params {
     *         requestAuthority?: string;
     *         requestAzureCloudOptions?: AzureCloudOptions;
     *         requestExtraQueryParameters?: StringDict;
     *         account?: AccountInfo;
     *        }
     */
    async getDiscoveredAuthority(params) {
        const { account } = params;
        const instanceAwareEQ = params.requestExtraQueryParameters &&
            params.requestExtraQueryParameters.hasOwnProperty("instance_aware")
            ? params.requestExtraQueryParameters["instance_aware"]
            : undefined;
        this.performanceClient.addQueueMeasurement(PerformanceEvents.StandardInteractionClientGetDiscoveredAuthority, this.correlationId);
        const authorityOptions = {
            protocolMode: this.config.auth.protocolMode,
            OIDCOptions: this.config.auth.OIDCOptions,
            knownAuthorities: this.config.auth.knownAuthorities,
            cloudDiscoveryMetadata: this.config.auth.cloudDiscoveryMetadata,
            authorityMetadata: this.config.auth.authorityMetadata,
            skipAuthorityMetadataCache: this.config.auth.skipAuthorityMetadataCache,
        };
        // build authority string based on auth params, precedence - azureCloudInstance + tenant >> authority
        const resolvedAuthority = params.requestAuthority || this.config.auth.authority;
        const resolvedInstanceAware = instanceAwareEQ?.length
            ? instanceAwareEQ === "true"
            : this.config.auth.instanceAware;
        const userAuthority = account && resolvedInstanceAware
            ? this.config.auth.authority.replace(UrlString.getDomainFromUrl(resolvedAuthority), account.environment)
            : resolvedAuthority;
        // fall back to the authority from config
        const builtAuthority = Authority.generateAuthority(userAuthority, params.requestAzureCloudOptions ||
            this.config.auth.azureCloudOptions);
        const discoveredAuthority = await invokeAsync(AuthorityFactory.createDiscoveredInstance, PerformanceEvents.AuthorityFactoryCreateDiscoveredInstance, this.logger, this.performanceClient, this.correlationId)(builtAuthority, this.config.system.networkClient, this.browserStorage, authorityOptions, this.logger, this.correlationId, this.performanceClient);
        if (account && !discoveredAuthority.isAlias(account.environment)) {
            throw createClientConfigurationError(ClientConfigurationErrorCodes.authorityMismatch);
        }
        return discoveredAuthority;
    }
}

export { BaseInteractionClient };
//# sourceMappingURL=BaseInteractionClient.mjs.map
