/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

/**
 * @packageDocumentation
 * @module @azure/msal-node
 */

/**
 * Warning: This set of exports is purely intended to be used by other MSAL libraries, and should be considered potentially unstable. We strongly discourage using them directly, you do so at your own risk.
 * Breaking changes to these APIs will be shipped under a minor version, instead of a major version.
 */
import * as internals from "./internals.js";
export { internals };

// Interfaces
export { IPublicClientApplication } from "./client/IPublicClientApplication.js";
export { IConfidentialClientApplication } from "./client/IConfidentialClientApplication.js";
export { ITokenCache } from "./cache/ITokenCache.js";
export { ICacheClient } from "./cache/distributed/ICacheClient.js";
export { IPartitionManager } from "./cache/distributed/IPartitionManager.js";
export { ILoopbackClient } from "./network/ILoopbackClient.js";

// Clients and Configuration
export { PublicClientApplication } from "./client/PublicClientApplication.js";
export { ConfidentialClientApplication } from "./client/ConfidentialClientApplication.js";
export { ClientApplication } from "./client/ClientApplication.js";
export { ClientCredentialClient } from "./client/ClientCredentialClient.js";
export { DeviceCodeClient } from "./client/DeviceCodeClient.js";
export { OnBehalfOfClient } from "./client/OnBehalfOfClient.js";
export { ManagedIdentityApplication } from "./client/ManagedIdentityApplication.js";
export { UsernamePasswordClient } from "./client/UsernamePasswordClient.js";

export {
    Configuration,
    ManagedIdentityConfiguration,
    ManagedIdentityIdParams,
    NodeAuthOptions,
    NodeSystemOptions,
    BrokerOptions,
    NodeTelemetryOptions,
    CacheOptions,
} from "./config/Configuration.js";
export { ClientAssertion } from "./client/ClientAssertion.js";

// Cache and Storage
export { TokenCache } from "./cache/TokenCache.js";
export {
    CacheKVStore,
    JsonCache,
    InMemoryCache,
    SerializedAccountEntity,
    SerializedIdTokenEntity,
    SerializedAccessTokenEntity,
    SerializedAppMetadataEntity,
    SerializedRefreshTokenEntity,
} from "./cache/serializer/SerializerTypes.js";
export { DistributedCachePlugin } from "./cache/distributed/DistributedCachePlugin.js";

// Constants
export { ManagedIdentitySourceNames } from "./utils/Constants.js";

// Crypto
export { CryptoProvider } from "./crypto/CryptoProvider.js";

// Request objects
export type { AuthorizationCodeRequest } from "./request/AuthorizationCodeRequest.js";
export type { AuthorizationUrlRequest } from "./request/AuthorizationUrlRequest.js";
export type { ClientCredentialRequest } from "./request/ClientCredentialRequest.js";
export type { DeviceCodeRequest } from "./request/DeviceCodeRequest.js";
export type { OnBehalfOfRequest } from "./request/OnBehalfOfRequest.js";
export type { UsernamePasswordRequest } from "./request/UsernamePasswordRequest.js";
export type { RefreshTokenRequest } from "./request/RefreshTokenRequest.js";
export type { SilentFlowRequest } from "./request/SilentFlowRequest.js";
export type { InteractiveRequest } from "./request/InteractiveRequest.js";
export type { SignOutRequest } from "./request/SignOutRequest.js";
export type { ManagedIdentityRequestParams } from "./request/ManagedIdentityRequestParams.js";

// Common Object Formats
export {
    // Request
    PromptValue,
    ResponseMode,
    AuthorizationCodePayload,
    // Response
    AuthenticationResult,
    AuthorizeResponse,
    /**
     * @deprecated Use AuthorizeResponse instead
     */
    AuthorizeResponse as ServerAuthorizationCodeResponse,
    IdTokenClaims,
    // Cache
    AccountInfo,
    ValidCacheType,
    // Error
    AuthError,
    AuthErrorMessage,
    AuthErrorCodes,
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
    // Network Interface
    INetworkModule,
    NetworkRequestOptions,
    NetworkResponse,
    // Logger
    Logger,
    LogLevel,
    // ProtocolMode enum
    ProtocolMode,
    ICachePlugin,
    TokenCacheContext,
    ISerializableTokenCache,
    // AzureCloudInstance enum
    AzureCloudInstance,
    AzureCloudOptions,
    // IAppTokenProvider
    IAppTokenProvider,
    AppTokenProviderParameters,
    AppTokenProviderResult,
    INativeBrokerPlugin,
    ClientAssertionCallback,
} from "@azure/msal-common/node";

export { version } from "./packageMetadata.js";
