/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    ICrypto,
    INetworkModule,
    Logger,
    AccountInfo,
    UrlString,
    ServerTelemetryManager,
    ServerTelemetryRequest,
    createClientConfigurationError,
    ClientConfigurationErrorCodes,
    Authority,
    AuthorityOptions,
    AuthorityFactory,
    IPerformanceClient,
    PerformanceEvents,
    AzureCloudOptions,
    invokeAsync,
    StringDict,
} from "@azure/msal-common/browser";
import { BrowserConfiguration } from "../config/Configuration.js";
import { BrowserCacheManager } from "../cache/BrowserCacheManager.js";
import { EventHandler } from "../event/EventHandler.js";
import { EndSessionRequest } from "../request/EndSessionRequest.js";
import { RedirectRequest } from "../request/RedirectRequest.js";
import { PopupRequest } from "../request/PopupRequest.js";
import { SsoSilentRequest } from "../request/SsoSilentRequest.js";
import { version } from "../packageMetadata.js";
import { BrowserConstants } from "../utils/BrowserConstants.js";
import * as BrowserUtils from "../utils/BrowserUtils.js";
import { INavigationClient } from "../navigation/INavigationClient.js";
import { AuthenticationResult } from "../response/AuthenticationResult.js";
import { ClearCacheRequest } from "../request/ClearCacheRequest.js";
import { createNewGuid } from "../crypto/BrowserCrypto.js";
import { IPlatformAuthHandler } from "../broker/nativeBroker/IPlatformAuthHandler.js";

export abstract class BaseInteractionClient {
    protected config: BrowserConfiguration;
    protected browserStorage: BrowserCacheManager;
    protected browserCrypto: ICrypto;
    protected networkClient: INetworkModule;
    protected logger: Logger;
    protected eventHandler: EventHandler;
    protected navigationClient: INavigationClient;
    protected platformAuthProvider: IPlatformAuthHandler | undefined;
    protected correlationId: string;
    protected performanceClient: IPerformanceClient;

    constructor(
        config: BrowserConfiguration,
        storageImpl: BrowserCacheManager,
        browserCrypto: ICrypto,
        logger: Logger,
        eventHandler: EventHandler,
        navigationClient: INavigationClient,
        performanceClient: IPerformanceClient,
        platformAuthProvider?: IPlatformAuthHandler,
        correlationId?: string
    ) {
        this.config = config;
        this.browserStorage = storageImpl;
        this.browserCrypto = browserCrypto;
        this.networkClient = this.config.system.networkClient;
        this.eventHandler = eventHandler;
        this.navigationClient = navigationClient;
        this.platformAuthProvider = platformAuthProvider;
        this.correlationId = correlationId || createNewGuid();
        this.logger = logger.clone(
            BrowserConstants.MSAL_SKU,
            version,
            this.correlationId
        );
        this.performanceClient = performanceClient;
    }

    abstract acquireToken(
        request: RedirectRequest | PopupRequest | SsoSilentRequest
    ): Promise<AuthenticationResult | void>;

    abstract logout(
        request: EndSessionRequest | ClearCacheRequest | undefined
    ): Promise<void>;

    protected async clearCacheOnLogout(
        correlationId: string,
        account?: AccountInfo | null
    ): Promise<void> {
        if (account) {
            // Clear given account.
            try {
                this.browserStorage.removeAccount(account, correlationId);
                this.logger.verbose(
                    "Cleared cache items belonging to the account provided in the logout request."
                );
            } catch (error) {
                this.logger.error(
                    "Account provided in logout request was not found. Local cache unchanged."
                );
            }
        } else {
            try {
                this.logger.verbose(
                    "No account provided in logout request, clearing all cache items.",
                    this.correlationId
                );
                // Clear all accounts and tokens
                this.browserStorage.clear(correlationId);
                // Clear any stray keys from IndexedDB
                await this.browserCrypto.clearKeystore();
            } catch (e) {
                this.logger.error(
                    "Attempted to clear all MSAL cache items and failed. Local cache unchanged."
                );
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
    getRedirectUri(requestRedirectUri?: string): string {
        this.logger.verbose("getRedirectUri called");
        const redirectUri = requestRedirectUri || this.config.auth.redirectUri;
        return UrlString.getAbsoluteUrl(
            redirectUri,
            BrowserUtils.getCurrentUri()
        );
    }

    /**
     *
     * @param apiId
     * @param correlationId
     * @param forceRefresh
     */
    protected initializeServerTelemetryManager(
        apiId: number,
        forceRefresh?: boolean
    ): ServerTelemetryManager {
        this.logger.verbose("initializeServerTelemetryManager called");
        const telemetryPayload: ServerTelemetryRequest = {
            clientId: this.config.auth.clientId,
            correlationId: this.correlationId,
            apiId: apiId,
            forceRefresh: forceRefresh || false,
            wrapperSKU: this.browserStorage.getWrapperMetadata()[0],
            wrapperVer: this.browserStorage.getWrapperMetadata()[1],
        };

        return new ServerTelemetryManager(
            telemetryPayload,
            this.browserStorage
        );
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
    protected async getDiscoveredAuthority(params: {
        requestAuthority?: string;
        requestAzureCloudOptions?: AzureCloudOptions;
        requestExtraQueryParameters?: StringDict;
        account?: AccountInfo;
    }): Promise<Authority> {
        const { account } = params;
        const instanceAwareEQ =
            params.requestExtraQueryParameters &&
            params.requestExtraQueryParameters.hasOwnProperty("instance_aware")
                ? params.requestExtraQueryParameters["instance_aware"]
                : undefined;

        this.performanceClient.addQueueMeasurement(
            PerformanceEvents.StandardInteractionClientGetDiscoveredAuthority,
            this.correlationId
        );
        const authorityOptions: AuthorityOptions = {
            protocolMode: this.config.auth.protocolMode,
            OIDCOptions: this.config.auth.OIDCOptions,
            knownAuthorities: this.config.auth.knownAuthorities,
            cloudDiscoveryMetadata: this.config.auth.cloudDiscoveryMetadata,
            authorityMetadata: this.config.auth.authorityMetadata,
            skipAuthorityMetadataCache:
                this.config.auth.skipAuthorityMetadataCache,
        };

        // build authority string based on auth params, precedence - azureCloudInstance + tenant >> authority
        const resolvedAuthority =
            params.requestAuthority || this.config.auth.authority;
        const resolvedInstanceAware = instanceAwareEQ?.length
            ? instanceAwareEQ === "true"
            : this.config.auth.instanceAware;

        const userAuthority =
            account && resolvedInstanceAware
                ? this.config.auth.authority.replace(
                      UrlString.getDomainFromUrl(resolvedAuthority),
                      account.environment
                  )
                : resolvedAuthority;

        // fall back to the authority from config
        const builtAuthority = Authority.generateAuthority(
            userAuthority,
            params.requestAzureCloudOptions ||
                this.config.auth.azureCloudOptions
        );
        const discoveredAuthority = await invokeAsync(
            AuthorityFactory.createDiscoveredInstance,
            PerformanceEvents.AuthorityFactoryCreateDiscoveredInstance,
            this.logger,
            this.performanceClient,
            this.correlationId
        )(
            builtAuthority,
            this.config.system.networkClient,
            this.browserStorage,
            authorityOptions,
            this.logger,
            this.correlationId,
            this.performanceClient
        );

        if (account && !discoveredAuthority.isAlias(account.environment)) {
            throw createClientConfigurationError(
                ClientConfigurationErrorCodes.authorityMismatch
            );
        }

        return discoveredAuthority;
    }
}
