/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

/**
 * @packageDocumentation
 * @module @azure/msal-browser
 */

import * as BrowserUtils from "./utils/BrowserUtils.js";
export { BrowserUtils };

export {
    PublicClientApplication,
    createNestablePublicClientApplication,
    createStandardPublicClientApplication,
} from "./app/PublicClientApplication.js";
export { PublicClientNext } from "./app/PublicClientNext.js";
export { IController } from "./controllers/IController.js";
export {
    Configuration,
    BrowserAuthOptions,
    CacheOptions,
    BrowserSystemOptions,
    BrowserTelemetryOptions,
    BrowserConfiguration,
    DEFAULT_IFRAME_TIMEOUT_MS,
} from "./config/Configuration.js";
export {
    InteractionType,
    InteractionStatus,
    BrowserCacheLocation,
    WrapperSKU,
    ApiId,
    CacheLookupPolicy,
} from "./utils/BrowserConstants.js";

// Browser Errors
export {
    BrowserAuthError,
    BrowserAuthErrorMessage,
    BrowserAuthErrorCodes,
} from "./error/BrowserAuthError.js";
export {
    BrowserConfigurationAuthError,
    BrowserConfigurationAuthErrorCodes,
    BrowserConfigurationAuthErrorMessage,
} from "./error/BrowserConfigurationAuthError.js";

// Interfaces
export {
    IPublicClientApplication,
    stubbedPublicClientApplication,
} from "./app/IPublicClientApplication.js";
export { INavigationClient } from "./navigation/INavigationClient.js";
export { NavigationClient } from "./navigation/NavigationClient.js";
export { NavigationOptions } from "./navigation/NavigationOptions.js";
export { PopupRequest } from "./request/PopupRequest.js";
export { RedirectRequest } from "./request/RedirectRequest.js";
export { SilentRequest } from "./request/SilentRequest.js";
export { SsoSilentRequest } from "./request/SsoSilentRequest.js";
export { EndSessionRequest } from "./request/EndSessionRequest.js";
export { EndSessionPopupRequest } from "./request/EndSessionPopupRequest.js";
export { AuthorizationUrlRequest } from "./request/AuthorizationUrlRequest.js";
export { AuthorizationCodeRequest } from "./request/AuthorizationCodeRequest.js";
export { AuthenticationResult } from "./response/AuthenticationResult.js";
export { ClearCacheRequest } from "./request/ClearCacheRequest.js";
export { InitializeApplicationRequest } from "./request/InitializeApplicationRequest.js";

// Cache
export { LoadTokenOptions } from "./cache/TokenCache.js";
export { ITokenCache } from "./cache/ITokenCache.js";

// Storage
export { MemoryStorage } from "./cache/MemoryStorage.js";
export { LocalStorage } from "./cache/LocalStorage.js";
export { SessionStorage } from "./cache/SessionStorage.js";
export { IWindowStorage } from "./cache/IWindowStorage.js";

// Events
export {
    EventMessage,
    EventPayload,
    EventError,
    EventCallbackFunction,
    EventMessageUtils,
    PopupEvent,
    BrokerConnectionEvent,
} from "./event/EventMessage.js";
export { EventType } from "./event/EventType.js";
export { EventHandler } from "./event/EventHandler.js";

export {
    SignedHttpRequest,
    SignedHttpRequestOptions,
} from "./crypto/SignedHttpRequest.js";

export {
    PopupWindowAttributes,
    PopupSize,
    PopupPosition,
} from "./request/PopupWindowAttributes.js";

// Telemetry
export { BrowserPerformanceClient } from "./telemetry/BrowserPerformanceClient.js";
export { BrowserPerformanceMeasurement } from "./telemetry/BrowserPerformanceMeasurement.js";

// Common Object Formats
export {
    AuthenticationScheme,
    // Account
    AccountInfo,
    AccountEntity,
    IdTokenClaims,
    // Error
    AuthError,
    AuthErrorCodes,
    AuthErrorMessage,
    ClientAuthError,
    ClientAuthErrorCodes,
    ClientAuthErrorMessage,
    ClientConfigurationError,
    ClientConfigurationErrorCodes,
    ClientConfigurationErrorMessage,
    InteractionRequiredAuthError,
    InteractionRequiredAuthErrorCodes,
    InteractionRequiredAuthErrorMessage,
    ServerError,
    // Network
    INetworkModule,
    NetworkResponse,
    NetworkRequestOptions,
    // Logger Object
    ILoggerCallback,
    Logger,
    LogLevel,
    // Protocol Mode
    ProtocolMode,
    ServerResponseType,
    PromptValue,
    // Server Response
    ExternalTokenResponse,
    // Utils
    StringUtils,
    UrlString,
    JsonWebTokenTypes,
    // AzureCloudInstance enum
    AzureCloudInstance,
    AzureCloudOptions,
    AuthenticationHeaderParser,
    OIDC_DEFAULT_SCOPES,
    PerformanceCallbackFunction,
    PerformanceEvent,
    PerformanceEvents,
    // Telemetry
    InProgressPerformanceEvent,
    TenantProfile,
    IPerformanceClient,
    StubPerformanceClient,
} from "@azure/msal-common/browser";

export { version } from "./packageMetadata.js";

export { isPlatformBrokerAvailable } from "./broker/nativeBroker/PlatformAuthProvider.js";
