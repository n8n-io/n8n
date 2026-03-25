/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as AuthToken from "./account/AuthToken.js";
import * as AuthorityFactory from "./authority/AuthorityFactory.js";
import * as CacheHelpers from "./cache/utils/CacheHelpers.js";
import * as TimeUtils from "./utils/TimeUtils.js";
import * as UrlUtils from "./utils/UrlUtils.js";
import * as AADServerParamKeys from "./constants/AADServerParamKeys.js";

export { AuthToken };
export { AuthorityFactory };
export { CacheHelpers };
export { TimeUtils };
export { UrlUtils };
export { AADServerParamKeys };

export { AuthorizationCodeClient } from "./client/AuthorizationCodeClient.js";
export { RefreshTokenClient } from "./client/RefreshTokenClient.js";
export { SilentFlowClient } from "./client/SilentFlowClient.js";
export { BaseClient } from "./client/BaseClient.js";
export {
    AuthOptions,
    SystemOptions,
    LoggerOptions,
    CacheOptions,
    DEFAULT_SYSTEM_OPTIONS,
    AzureCloudOptions,
    ApplicationTelemetry,
} from "./config/ClientConfiguration.js";
export { ClientConfiguration } from "./config/ClientConfiguration.js";
export {
    AccountInfo,
    ActiveAccountFilters,
    TenantProfile,
    updateAccountTenantProfileData,
    tenantIdMatchesHomeTenant,
    buildTenantProfile,
} from "./account/AccountInfo.js";
export {
    TokenClaims,
    getTenantIdFromIdTokenClaims,
} from "./account/TokenClaims.js";
export { TokenClaims as IdTokenClaims } from "./account/TokenClaims.js";
export { CcsCredential, CcsCredentialType } from "./account/CcsCredential.js";
export {
    ClientInfo,
    buildClientInfo,
    buildClientInfoFromHomeAccountId,
} from "./account/ClientInfo.js";
export {
    Authority,
    formatAuthorityUri,
    buildStaticAuthorityOptions,
} from "./authority/Authority.js";
export {
    AuthorityOptions,
    AzureCloudInstance,
    StaticAuthorityOptions,
} from "./authority/AuthorityOptions.js";
export { AuthorityType } from "./authority/AuthorityType.js";
export { ProtocolMode } from "./authority/ProtocolMode.js";
export { OIDCOptions } from "./authority/OIDCOptions.js";
export { CacheManager, DefaultStorageClass } from "./cache/CacheManager.js";
export {
    AccountCache,
    AccountFilter,
    AccessTokenCache,
    IdTokenCache,
    RefreshTokenCache,
    AppMetadataCache,
    CredentialFilter,
    ValidCacheType,
    ValidCredentialType,
    TokenKeys,
} from "./cache/utils/CacheTypes.js";
export { CacheRecord } from "./cache/entities/CacheRecord.js";
export { CredentialEntity } from "./cache/entities/CredentialEntity.js";
export { AppMetadataEntity } from "./cache/entities/AppMetadataEntity.js";
export { AccountEntity } from "./cache/entities/AccountEntity.js";
export { IdTokenEntity } from "./cache/entities/IdTokenEntity.js";
export { AccessTokenEntity } from "./cache/entities/AccessTokenEntity.js";
export { RefreshTokenEntity } from "./cache/entities/RefreshTokenEntity.js";
export { ServerTelemetryEntity } from "./cache/entities/ServerTelemetryEntity.js";
export { AuthorityMetadataEntity } from "./cache/entities/AuthorityMetadataEntity.js";
export { ThrottlingEntity } from "./cache/entities/ThrottlingEntity.js";
export {
    INetworkModule,
    NetworkRequestOptions,
    StubbedNetworkModule,
} from "./network/INetworkModule.js";
export { NetworkResponse } from "./network/NetworkResponse.js";
export { ThrottlingUtils } from "./network/ThrottlingUtils.js";
export {
    RequestThumbprint,
    getRequestThumbprint,
} from "./network/RequestThumbprint.js";
export { IUri } from "./url/IUri.js";
export { UrlString } from "./url/UrlString.js";
export {
    ICrypto,
    PkceCodes,
    DEFAULT_CRYPTO_IMPLEMENTATION,
    SignedHttpRequestParameters,
} from "./crypto/ICrypto.js";

export * as AuthorizeProtocol from "./protocol/Authorize.js";
export { BaseAuthRequest } from "./request/BaseAuthRequest.js";
export { CommonAuthorizationUrlRequest } from "./request/CommonAuthorizationUrlRequest.js";
export { CommonAuthorizationCodeRequest } from "./request/CommonAuthorizationCodeRequest.js";
export { CommonRefreshTokenRequest } from "./request/CommonRefreshTokenRequest.js";
export { CommonSilentFlowRequest } from "./request/CommonSilentFlowRequest.js";
export { CommonEndSessionRequest } from "./request/CommonEndSessionRequest.js";
export * as RequestParameterBuilder from "./request/RequestParameterBuilder.js";
export { StoreInCache } from "./request/StoreInCache.js";
export { AzureRegion } from "./authority/AzureRegion.js";
export { AzureRegionConfiguration } from "./authority/AzureRegionConfiguration.js";
export { AuthenticationResult } from "./response/AuthenticationResult.js";
export { AuthorizationCodePayload } from "./response/AuthorizationCodePayload.js";
export { AuthorizeResponse } from "./response/AuthorizeResponse.js";
export { ServerAuthorizationTokenResponse } from "./response/ServerAuthorizationTokenResponse.js";
export {
    ResponseHandler,
    buildAccountToCache,
} from "./response/ResponseHandler.js";
export { ScopeSet } from "./request/ScopeSet.js";
export { AuthenticationHeaderParser } from "./request/AuthenticationHeaderParser.js";
export { ILoggerCallback, LogLevel, Logger } from "./logger/Logger.js";
export {
    InteractionRequiredAuthError,
    InteractionRequiredAuthErrorCodes,
    InteractionRequiredAuthErrorMessage,
    createInteractionRequiredAuthError,
} from "./error/InteractionRequiredAuthError.js";
export {
    AuthError,
    AuthErrorMessage,
    AuthErrorCodes,
    createAuthError,
} from "./error/AuthError.js";
export { PlatformBrokerError } from "./error/PlatformBrokerError.js";
export { ServerError } from "./error/ServerError.js";
export { NetworkError, createNetworkError } from "./error/NetworkError.js";
export {
    CacheError,
    CacheErrorCodes,
    createCacheError,
} from "./error/CacheError.js";
export {
    ClientAuthError,
    ClientAuthErrorMessage,
    ClientAuthErrorCodes,
    createClientAuthError,
} from "./error/ClientAuthError.js";
export {
    ClientConfigurationError,
    ClientConfigurationErrorMessage,
    ClientConfigurationErrorCodes,
    createClientConfigurationError,
} from "./error/ClientConfigurationError.js";
export {
    Constants,
    OIDC_DEFAULT_SCOPES,
    PromptValue,
    PersistentCacheKeys,
    OAuthResponseType,
    ServerResponseType,
    ResponseMode,
    CacheOutcome,
    CredentialType,
    CacheType,
    CacheAccountType,
    AuthenticationScheme,
    CodeChallengeMethodValues,
    PasswordGrantConstants,
    ThrottlingConstants,
    ClaimsRequestKeys,
    HeaderNames,
    Errors,
    THE_FAMILY_ID,
    ONE_DAY_IN_MS,
    GrantType,
    AADAuthorityConstants,
    HttpStatus,
    HttpMethod,
    DEFAULT_TOKEN_RENEWAL_OFFSET_SEC,
    JsonWebTokenTypes,
    EncodingTypes,
} from "./utils/Constants.js";
export { StringUtils } from "./utils/StringUtils.js";
export { StringDict } from "./utils/MsalTypes.js";
export {
    ProtocolUtils,
    RequestStateObject,
    LibraryStateObject,
} from "./utils/ProtocolUtils.js";
export * from "./utils/FunctionWrappers.js";
export { ServerTelemetryManager } from "./telemetry/server/ServerTelemetryManager.js";
export { ServerTelemetryRequest } from "./telemetry/server/ServerTelemetryRequest.js";
export { version } from "./packageMetadata.js";
