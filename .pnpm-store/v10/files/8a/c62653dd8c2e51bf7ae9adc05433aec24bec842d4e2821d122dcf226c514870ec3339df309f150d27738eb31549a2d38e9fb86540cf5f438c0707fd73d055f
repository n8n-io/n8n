/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    SystemOptions,
    LoggerOptions,
    INetworkModule,
    DEFAULT_SYSTEM_OPTIONS,
    Constants,
    ProtocolMode,
    OIDCOptions,
    ServerResponseType,
    LogLevel,
    StubbedNetworkModule,
    AzureCloudInstance,
    AzureCloudOptions,
    ApplicationTelemetry,
    createClientConfigurationError,
    ClientConfigurationErrorCodes,
    IPerformanceClient,
    StubPerformanceClient,
    Logger,
} from "@azure/msal-common/browser";
import {
    BrowserCacheLocation,
    BrowserConstants,
} from "../utils/BrowserConstants.js";
import { INavigationClient } from "../navigation/INavigationClient.js";
import { NavigationClient } from "../navigation/NavigationClient.js";
import { FetchClient } from "../network/FetchClient.js";
import * as BrowserUtils from "../utils/BrowserUtils.js";

// Default timeout for popup windows and iframes in milliseconds
export const DEFAULT_POPUP_TIMEOUT_MS = 60000;
export const DEFAULT_IFRAME_TIMEOUT_MS = 10000;
export const DEFAULT_REDIRECT_TIMEOUT_MS = 30000;
export const DEFAULT_NATIVE_BROKER_HANDSHAKE_TIMEOUT_MS = 2000;

/**
 * Use this to configure the auth options in the Configuration object
 */
export type BrowserAuthOptions = {
    /**
     * Client ID of your app registered with our Application registration portal : https://portal.azure.com/#blade/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/RegisteredAppsPreview in Microsoft Identity Platform
     */
    clientId: string;
    /**
     * You can configure a specific authority, defaults to " " or "https://login.microsoftonline.com/common"
     */
    authority?: string;
    /**
     * An array of URIs that are known to be valid. Used in B2C scenarios.
     */
    knownAuthorities?: Array<string>;
    /**
     * A string containing the cloud discovery response. Used in AAD scenarios.
     */
    cloudDiscoveryMetadata?: string;
    /**
     * A string containing the .well-known/openid-configuration endpoint response
     */
    authorityMetadata?: string;
    /**
     * The redirect URI where authentication responses can be received by your application. It must exactly match one of the redirect URIs registered in the Azure portal.
     */
    redirectUri?: string;
    /**
     * The redirect URI where the window navigates after a successful logout.
     */
    postLogoutRedirectUri?: string | null;
    /**
     * Boolean indicating whether to navigate to the original request URL after the auth server navigates to the redirect URL.
     */
    navigateToLoginRequestUrl?: boolean;
    /**
     * Array of capabilities which will be added to the claims.access_token.xms_cc request property on every network request.
     */
    clientCapabilities?: Array<string>;
    /**
     * Enum that represents the protocol that msal follows. Used for configuring proper endpoints.
     */
    protocolMode?: ProtocolMode;
    /**
     * Enum that configures options for the OIDC protocol mode.
     */
    OIDCOptions?: OIDCOptions;
    /**
     * Enum that represents the Azure Cloud to use.
     */
    azureCloudOptions?: AzureCloudOptions;
    /**
     * Flag of whether to use the local metadata cache
     */
    skipAuthorityMetadataCache?: boolean;
    /**
     * App supports nested app auth or not; defaults to
     *
     * @deprecated This flag is deprecated and will be removed in the next major version. createNestablePublicClientApplication should be used instead.
     */
    supportsNestedAppAuth?: boolean;
    /**
     * Callback that will be passed the url that MSAL will navigate to in redirect flows. Returning false in the callback will stop navigation.
     */
    onRedirectNavigate?: (url: string) => boolean | void;
    /**
     * Flag of whether the STS will send back additional parameters to specify where the tokens should be retrieved from.
     */
    instanceAware?: boolean;
    /**
     * Flag of whether to encode query parameters
     * @deprecated This flag is deprecated and will be removed in the next major version where all extra query params will be encoded by default.
     */
    encodeExtraQueryParams?: boolean;
    /**
     * If set to true, MSAL will make a background SSO verification call after successful interactive authentication.
     * COGS intensive, recommendation is to *NOT* set this flag to true unless your application has a specific need for it.
     * This will trigger additional network calls after interactive authentication flows (acquireTokenPopup, handleRedirectPromise) calls.
     * This is a boolean flag and defaults to false if not specified.
     */
    verifySSO?: boolean;
};

/** @internal */
export type InternalAuthOptions = Omit<
    Required<BrowserAuthOptions>,
    "onRedirectNavigate"
> & {
    OIDCOptions: Required<OIDCOptions>;
    onRedirectNavigate?: (url: string) => boolean | void;
};

/**
 * Use this to configure the below cache configuration options:
 */
export type CacheOptions = {
    /**
     * Used to specify the cacheLocation user wants to set. Valid values are "localStorage", "sessionStorage" and "memoryStorage".
     */
    cacheLocation?: BrowserCacheLocation | string;
    /**
     * Used to specify the number of days cache entries written by previous versions of MSAL.js should be retained in the browser. Defaults to 5 days.
     */
    cacheRetentionDays?: number;
    /**
     * Used to specify the temporaryCacheLocation user wants to set. Valid values are "localStorage", "sessionStorage" and "memoryStorage".
     * @deprecated This option is deprecated and will be removed in the next major version.
     */
    temporaryCacheLocation?: BrowserCacheLocation | string;
    /**
     * If set, MSAL stores the auth request state required for validation of the auth flows in the browser cookies. By default this flag is set to false.
     * @deprecated This option is deprecated and will be removed in the next major version.
     */
    storeAuthStateInCookie?: boolean;
    /**
     * If set, MSAL sets the "Secure" flag on cookies so they can only be sent over HTTPS. By default this flag is set to true.
     * @deprecated This option will be removed in the next major version and all cookies set will include the Secure attribute.
     */
    secureCookies?: boolean;
    /**
     * If set, MSAL will attempt to migrate cache entries from older versions on initialization. By default this flag is set to true if cacheLocation is localStorage, otherwise false.
     * @deprecated This option is deprecated and will be removed in the next major version.
     */
    cacheMigrationEnabled?: boolean;
    /**
     * Flag that determines whether access tokens are stored based on requested claims
     * @deprecated This option is deprecated and will be removed in the next major version.
     */
    claimsBasedCachingEnabled?: boolean;
};

export type BrowserSystemOptions = SystemOptions & {
    /**
     * Used to initialize the Logger object (See ClientConfiguration.ts)
     */
    loggerOptions?: LoggerOptions;
    /**
     * Network interface implementation
     */
    networkClient?: INetworkModule;
    /**
     * Override the methods used to navigate to other webpages. Particularly useful if you are using a client-side router
     */
    navigationClient?: INavigationClient;
    /**
     * Sets the timeout for waiting for a response hash in a popup. Will take precedence over loadFrameTimeout if both are set.
     */
    windowHashTimeout?: number;
    /**
     * Sets the timeout for waiting for a response hash in an iframe. Will take precedence over loadFrameTimeout if both are set.
     */
    iframeHashTimeout?: number;
    /**
     * Sets the timeout for waiting for a response hash in an iframe or popup
     */
    loadFrameTimeout?: number;
    /**
     * Maximum time the library should wait for a frame to load
     * @deprecated This was previously needed for older browsers which are no longer supported by MSAL.js. This option will be removed in the next major version
     */
    navigateFrameWait?: number;
    /**
     * Time to wait for redirection to occur before resolving promise
     */
    redirectNavigationTimeout?: number;
    /**
     * Sets whether popups are opened asynchronously. By default, this flag is set to false. When set to false, blank popups are opened before anything else happens. When set to true, popups are opened when making the network request.
     */
    asyncPopups?: boolean;
    /**
     * Flag to enable redirect opertaions when the app is rendered in an iframe (to support scenarios such as embedded B2C login).
     */
    allowRedirectInIframe?: boolean;
    /**
     * Flag to enable native broker support (e.g. acquiring tokens from WAM on Windows, MacBroker on Mac)
     */
    allowPlatformBroker?: boolean;
    /**
     * Flag to enable native broker support through DOM APIs in Edge
     */
    allowPlatformBrokerWithDOM?: boolean;
    /**
     * Sets the timeout for waiting for the native broker handshake to resolve
     */
    nativeBrokerHandshakeTimeout?: number;
    /**
     * Sets the interval length in milliseconds for polling the location attribute in popup windows (default is 30ms)
     */
    pollIntervalMilliseconds?: number;
};

/**
 * Telemetry Options
 */
export type BrowserTelemetryOptions = {
    /**
     * Telemetry information sent on request
     * - appName: Unique string name of an application
     * - appVersion: Version of the application using MSAL
     */
    application?: ApplicationTelemetry;

    client?: IPerformanceClient;
};

/**
 * This object allows you to configure important elements of MSAL functionality and is passed into the constructor of PublicClientApplication
 */
export type Configuration = {
    /**
     * This is where you configure auth elements like clientID, authority used for authenticating against the Microsoft Identity Platform
     */
    auth: BrowserAuthOptions;
    /**
     * This is where you configure cache location and whether to store cache in cookies
     */
    cache?: CacheOptions;
    /**
     * This is where you can configure the network client, logger, token renewal offset
     */
    system?: BrowserSystemOptions;
    /**
     * This is where you can configure telemetry data and options
     */
    telemetry?: BrowserTelemetryOptions;
};

/** @internal */
export type BrowserConfiguration = {
    auth: InternalAuthOptions;
    cache: Required<CacheOptions>;
    system: Required<BrowserSystemOptions>;
    telemetry: Required<BrowserTelemetryOptions>;
};

/**
 * MSAL function that sets the default options when not explicitly configured from app developer
 *
 * @param auth
 * @param cache
 * @param system
 *
 * @returns Configuration object
 */
export function buildConfiguration(
    {
        auth: userInputAuth,
        cache: userInputCache,
        system: userInputSystem,
        telemetry: userInputTelemetry,
    }: Configuration,
    isBrowserEnvironment: boolean
): BrowserConfiguration {
    // Default auth options for browser
    const DEFAULT_AUTH_OPTIONS: InternalAuthOptions = {
        clientId: Constants.EMPTY_STRING,
        authority: `${Constants.DEFAULT_AUTHORITY}`,
        knownAuthorities: [],
        cloudDiscoveryMetadata: Constants.EMPTY_STRING,
        authorityMetadata: Constants.EMPTY_STRING,
        redirectUri:
            typeof window !== "undefined" ? BrowserUtils.getCurrentUri() : "",
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
        verifySSO: false,
    };

    // Default cache options for browser
    const DEFAULT_CACHE_OPTIONS: Required<CacheOptions> = {
        cacheLocation: BrowserCacheLocation.SessionStorage,
        cacheRetentionDays: 5,
        temporaryCacheLocation: BrowserCacheLocation.SessionStorage,
        storeAuthStateInCookie: false,
        secureCookies: false,
        // Default cache migration to true if cache location is localStorage since entries are preserved across tabs/windows. Migration has little to no benefit in sessionStorage and memoryStorage
        cacheMigrationEnabled:
            userInputCache &&
            userInputCache.cacheLocation === BrowserCacheLocation.LocalStorage
                ? true
                : false,
        claimsBasedCachingEnabled: false,
    };

    // Default logger options for browser
    const DEFAULT_LOGGER_OPTIONS: LoggerOptions = {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        loggerCallback: (): void => {
            // allow users to not set logger call back
        },
        logLevel: LogLevel.Info,
        piiLoggingEnabled: false,
    };

    // Default system options for browser
    const DEFAULT_BROWSER_SYSTEM_OPTIONS: Required<BrowserSystemOptions> = {
        ...DEFAULT_SYSTEM_OPTIONS,
        loggerOptions: DEFAULT_LOGGER_OPTIONS,
        networkClient: isBrowserEnvironment
            ? new FetchClient()
            : StubbedNetworkModule,
        navigationClient: new NavigationClient(),
        loadFrameTimeout: 0,
        // If loadFrameTimeout is provided, use that as default.
        windowHashTimeout:
            userInputSystem?.loadFrameTimeout || DEFAULT_POPUP_TIMEOUT_MS,
        iframeHashTimeout:
            userInputSystem?.loadFrameTimeout || DEFAULT_IFRAME_TIMEOUT_MS,
        navigateFrameWait: 0,
        redirectNavigationTimeout: DEFAULT_REDIRECT_TIMEOUT_MS,
        asyncPopups: false,
        allowRedirectInIframe: false,
        allowPlatformBroker: false,
        allowPlatformBrokerWithDOM: false,
        nativeBrokerHandshakeTimeout:
            userInputSystem?.nativeBrokerHandshakeTimeout ||
            DEFAULT_NATIVE_BROKER_HANDSHAKE_TIMEOUT_MS,
        pollIntervalMilliseconds: BrowserConstants.DEFAULT_POLL_INTERVAL_MS,
    };

    const providedSystemOptions: Required<BrowserSystemOptions> = {
        ...DEFAULT_BROWSER_SYSTEM_OPTIONS,
        ...userInputSystem,
        loggerOptions: userInputSystem?.loggerOptions || DEFAULT_LOGGER_OPTIONS,
    };

    const DEFAULT_TELEMETRY_OPTIONS: Required<BrowserTelemetryOptions> = {
        application: {
            appName: Constants.EMPTY_STRING,
            appVersion: Constants.EMPTY_STRING,
        },
        client: new StubPerformanceClient(),
    };

    // Throw an error if user has set OIDCOptions without being in OIDC protocol mode
    if (
        userInputAuth?.protocolMode !== ProtocolMode.OIDC &&
        userInputAuth?.OIDCOptions
    ) {
        const logger = new Logger(providedSystemOptions.loggerOptions);
        logger.warning(
            JSON.stringify(
                createClientConfigurationError(
                    ClientConfigurationErrorCodes.cannotSetOIDCOptions
                )
            )
        );
    }

    // Throw an error if user has set allowPlatformBroker to true with OIDC protocol mode
    if (
        userInputAuth?.protocolMode &&
        userInputAuth.protocolMode === ProtocolMode.OIDC &&
        providedSystemOptions?.allowPlatformBroker
    ) {
        throw createClientConfigurationError(
            ClientConfigurationErrorCodes.cannotAllowPlatformBroker
        );
    }

    const overlayedConfig: BrowserConfiguration = {
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
