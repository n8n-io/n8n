/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { StubPerformanceClient, ProtocolMode, Logger, LogLevel, createClientConfigurationError, ClientConfigurationErrorCodes, StubbedNetworkModule, DEFAULT_SYSTEM_OPTIONS, Constants, ServerResponseType, AzureCloudInstance } from '@azure/msal-common/browser';
import { BrowserConstants, BrowserCacheLocation } from '../utils/BrowserConstants.mjs';
import { NavigationClient } from '../navigation/NavigationClient.mjs';
import { FetchClient } from '../network/FetchClient.mjs';
import { getCurrentUri } from '../utils/BrowserUtils.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
// Default timeout for popup windows and iframes in milliseconds
const DEFAULT_POPUP_TIMEOUT_MS = 60000;
const DEFAULT_IFRAME_TIMEOUT_MS = 10000;
const DEFAULT_REDIRECT_TIMEOUT_MS = 30000;
const DEFAULT_NATIVE_BROKER_HANDSHAKE_TIMEOUT_MS = 2000;
/**
 * MSAL function that sets the default options when not explicitly configured from app developer
 *
 * @param auth
 * @param cache
 * @param system
 *
 * @returns Configuration object
 */
function buildConfiguration({ auth: userInputAuth, cache: userInputCache, system: userInputSystem, telemetry: userInputTelemetry, }, isBrowserEnvironment) {
    // Default auth options for browser
    const DEFAULT_AUTH_OPTIONS = {
        clientId: Constants.EMPTY_STRING,
        authority: `${Constants.DEFAULT_AUTHORITY}`,
        knownAuthorities: [],
        cloudDiscoveryMetadata: Constants.EMPTY_STRING,
        authorityMetadata: Constants.EMPTY_STRING,
        redirectUri: typeof window !== "undefined" ? getCurrentUri() : "",
        postLogoutRedirectUri: Constants.EMPTY_STRING,
        navigateToLoginRequestUrl: true,
        clientCapabilities: [],
        protocolMode: ProtocolMode.AAD,
        OIDCOptions: {
            serverResponseType: ServerResponseType.FRAGMENT,
            defaultScopes: [
                Constants.OPENID_SCOPE,
                Constants.PROFILE_SCOPE,
                Constants.OFFLINE_ACCESS_SCOPE,
            ],
        },
        azureCloudOptions: {
            azureCloudInstance: AzureCloudInstance.None,
            tenant: Constants.EMPTY_STRING,
        },
        skipAuthorityMetadataCache: false,
        supportsNestedAppAuth: false,
        instanceAware: false,
        encodeExtraQueryParams: false,
    };
    // Default cache options for browser
    const DEFAULT_CACHE_OPTIONS = {
        cacheLocation: BrowserCacheLocation.SessionStorage,
        cacheRetentionDays: 5,
        temporaryCacheLocation: BrowserCacheLocation.SessionStorage,
        storeAuthStateInCookie: false,
        secureCookies: false,
        // Default cache migration to true if cache location is localStorage since entries are preserved across tabs/windows. Migration has little to no benefit in sessionStorage and memoryStorage
        cacheMigrationEnabled: userInputCache &&
            userInputCache.cacheLocation === BrowserCacheLocation.LocalStorage
            ? true
            : false,
        claimsBasedCachingEnabled: false,
    };
    // Default logger options for browser
    const DEFAULT_LOGGER_OPTIONS = {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        loggerCallback: () => {
            // allow users to not set logger call back
        },
        logLevel: LogLevel.Info,
        piiLoggingEnabled: false,
    };
    // Default system options for browser
    const DEFAULT_BROWSER_SYSTEM_OPTIONS = {
        ...DEFAULT_SYSTEM_OPTIONS,
        loggerOptions: DEFAULT_LOGGER_OPTIONS,
        networkClient: isBrowserEnvironment
            ? new FetchClient()
            : StubbedNetworkModule,
        navigationClient: new NavigationClient(),
        loadFrameTimeout: 0,
        // If loadFrameTimeout is provided, use that as default.
        windowHashTimeout: userInputSystem?.loadFrameTimeout || DEFAULT_POPUP_TIMEOUT_MS,
        iframeHashTimeout: userInputSystem?.loadFrameTimeout || DEFAULT_IFRAME_TIMEOUT_MS,
        navigateFrameWait: 0,
        redirectNavigationTimeout: DEFAULT_REDIRECT_TIMEOUT_MS,
        asyncPopups: false,
        allowRedirectInIframe: false,
        allowPlatformBroker: false,
        allowPlatformBrokerWithDOM: false,
        nativeBrokerHandshakeTimeout: userInputSystem?.nativeBrokerHandshakeTimeout ||
            DEFAULT_NATIVE_BROKER_HANDSHAKE_TIMEOUT_MS,
        pollIntervalMilliseconds: BrowserConstants.DEFAULT_POLL_INTERVAL_MS,
    };
    const providedSystemOptions = {
        ...DEFAULT_BROWSER_SYSTEM_OPTIONS,
        ...userInputSystem,
        loggerOptions: userInputSystem?.loggerOptions || DEFAULT_LOGGER_OPTIONS,
    };
    const DEFAULT_TELEMETRY_OPTIONS = {
        application: {
            appName: Constants.EMPTY_STRING,
            appVersion: Constants.EMPTY_STRING,
        },
        client: new StubPerformanceClient(),
    };
    // Throw an error if user has set OIDCOptions without being in OIDC protocol mode
    if (userInputAuth?.protocolMode !== ProtocolMode.OIDC &&
        userInputAuth?.OIDCOptions) {
        const logger = new Logger(providedSystemOptions.loggerOptions);
        logger.warning(JSON.stringify(createClientConfigurationError(ClientConfigurationErrorCodes.cannotSetOIDCOptions)));
    }
    // Throw an error if user has set allowPlatformBroker to true with OIDC protocol mode
    if (userInputAuth?.protocolMode &&
        userInputAuth.protocolMode === ProtocolMode.OIDC &&
        providedSystemOptions?.allowPlatformBroker) {
        throw createClientConfigurationError(ClientConfigurationErrorCodes.cannotAllowPlatformBroker);
    }
    const overlayedConfig = {
        auth: {
            ...DEFAULT_AUTH_OPTIONS,
            ...userInputAuth,
            OIDCOptions: {
                ...DEFAULT_AUTH_OPTIONS.OIDCOptions,
                ...userInputAuth?.OIDCOptions,
            },
        },
        cache: { ...DEFAULT_CACHE_OPTIONS, ...userInputCache },
        system: providedSystemOptions,
        telemetry: { ...DEFAULT_TELEMETRY_OPTIONS, ...userInputTelemetry },
    };
    return overlayedConfig;
}

export { DEFAULT_IFRAME_TIMEOUT_MS, DEFAULT_NATIVE_BROKER_HANDSHAKE_TIMEOUT_MS, DEFAULT_POPUP_TIMEOUT_MS, DEFAULT_REDIRECT_TIMEOUT_MS, buildConfiguration };
//# sourceMappingURL=Configuration.mjs.map
