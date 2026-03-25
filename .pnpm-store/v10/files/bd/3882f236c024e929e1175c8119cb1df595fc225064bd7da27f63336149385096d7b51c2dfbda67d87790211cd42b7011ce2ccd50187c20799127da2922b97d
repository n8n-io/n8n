/*! @azure/msal-common v15.13.3 2025-12-04 */
'use strict';
'use strict';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const Constants = {
    LIBRARY_NAME: "MSAL.JS",
    SKU: "msal.js.common",
    // default authority
    DEFAULT_AUTHORITY: "https://login.microsoftonline.com/common/",
    DEFAULT_AUTHORITY_HOST: "login.microsoftonline.com",
    DEFAULT_COMMON_TENANT: "common",
    // ADFS String
    ADFS: "adfs",
    DSTS: "dstsv2",
    // Default AAD Instance Discovery Endpoint
    AAD_INSTANCE_DISCOVERY_ENDPT: "https://login.microsoftonline.com/common/discovery/instance?api-version=1.1&authorization_endpoint=",
    // CIAM URL
    CIAM_AUTH_URL: ".ciamlogin.com",
    AAD_TENANT_DOMAIN_SUFFIX: ".onmicrosoft.com",
    // Resource delimiter - used for certain cache entries
    RESOURCE_DELIM: "|",
    // Placeholder for non-existent account ids/objects
    NO_ACCOUNT: "NO_ACCOUNT",
    // Claims
    CLAIMS: "claims",
    // Consumer UTID
    CONSUMER_UTID: "9188040d-6c67-4c5b-b112-36a304b66dad",
    // Default scopes
    OPENID_SCOPE: "openid",
    PROFILE_SCOPE: "profile",
    OFFLINE_ACCESS_SCOPE: "offline_access",
    EMAIL_SCOPE: "email",
    CODE_GRANT_TYPE: "authorization_code",
    RT_GRANT_TYPE: "refresh_token",
    S256_CODE_CHALLENGE_METHOD: "S256",
    URL_FORM_CONTENT_TYPE: "application/x-www-form-urlencoded;charset=utf-8",
    AUTHORIZATION_PENDING: "authorization_pending",
    NOT_DEFINED: "not_defined",
    EMPTY_STRING: "",
    NOT_APPLICABLE: "N/A",
    NOT_AVAILABLE: "Not Available",
    FORWARD_SLASH: "/",
    IMDS_ENDPOINT: "http://169.254.169.254/metadata/instance/compute/location",
    IMDS_VERSION: "2020-06-01",
    IMDS_TIMEOUT: 2000,
    AZURE_REGION_AUTO_DISCOVER_FLAG: "TryAutoDetect",
    REGIONAL_AUTH_PUBLIC_CLOUD_SUFFIX: "login.microsoft.com",
    KNOWN_PUBLIC_CLOUDS: [
        "login.microsoftonline.com",
        "login.windows.net",
        "login.microsoft.com",
        "sts.windows.net",
    ],
    SHR_NONCE_VALIDITY: 240,
    INVALID_INSTANCE: "invalid_instance",
};
const HttpStatus = {
    SUCCESS: 200,
    SUCCESS_RANGE_START: 200,
    SUCCESS_RANGE_END: 299,
    REDIRECT: 302,
    CLIENT_ERROR: 400,
    CLIENT_ERROR_RANGE_START: 400,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    NOT_FOUND: 404,
    REQUEST_TIMEOUT: 408,
    GONE: 410,
    TOO_MANY_REQUESTS: 429,
    CLIENT_ERROR_RANGE_END: 499,
    SERVER_ERROR: 500,
    SERVER_ERROR_RANGE_START: 500,
    SERVICE_UNAVAILABLE: 503,
    GATEWAY_TIMEOUT: 504,
    SERVER_ERROR_RANGE_END: 599,
    MULTI_SIDED_ERROR: 600,
};
const HttpMethod = {
    GET: "GET",
    POST: "POST",
};
const OIDC_DEFAULT_SCOPES = [
    Constants.OPENID_SCOPE,
    Constants.PROFILE_SCOPE,
    Constants.OFFLINE_ACCESS_SCOPE,
];
const OIDC_SCOPES = [...OIDC_DEFAULT_SCOPES, Constants.EMAIL_SCOPE];
/**
 * Request header names
 */
const HeaderNames = {
    CONTENT_TYPE: "Content-Type",
    CONTENT_LENGTH: "Content-Length",
    RETRY_AFTER: "Retry-After",
    CCS_HEADER: "X-AnchorMailbox",
    WWWAuthenticate: "WWW-Authenticate",
    AuthenticationInfo: "Authentication-Info",
    X_MS_REQUEST_ID: "x-ms-request-id",
    X_MS_HTTP_VERSION: "x-ms-httpver",
};
/**
 * Persistent cache keys MSAL which stay while user is logged in.
 */
const PersistentCacheKeys = {
    ACTIVE_ACCOUNT_FILTERS: "active-account-filters", // new cache entry for active_account for a more robust version for browser
};
/**
 * String constants related to AAD Authority
 */
const AADAuthorityConstants = {
    COMMON: "common",
    ORGANIZATIONS: "organizations",
    CONSUMERS: "consumers",
};
/**
 * Claims request keys
 */
const ClaimsRequestKeys = {
    ACCESS_TOKEN: "access_token",
    XMS_CC: "xms_cc",
};
/**
 * we considered making this "enum" in the request instead of string, however it looks like the allowed list of
 * prompt values kept changing over past couple of years. There are some undocumented prompt values for some
 * internal partners too, hence the choice of generic "string" type instead of the "enum"
 */
const PromptValue = {
    LOGIN: "login",
    SELECT_ACCOUNT: "select_account",
    CONSENT: "consent",
    NONE: "none",
    CREATE: "create",
    NO_SESSION: "no_session",
};
/**
 * allowed values for codeVerifier
 */
const CodeChallengeMethodValues = {
    PLAIN: "plain",
    S256: "S256",
};
/**
 * Allowed values for response_type
 */
const OAuthResponseType = {
    CODE: "code",
    IDTOKEN_TOKEN: "id_token token",
    IDTOKEN_TOKEN_REFRESHTOKEN: "id_token token refresh_token",
};
/**
 * allowed values for server response type
 * @deprecated Use ResponseMode instead
 */
const ServerResponseType = {
    QUERY: "query",
    FRAGMENT: "fragment",
};
/**
 * allowed values for response_mode
 */
const ResponseMode = {
    QUERY: "query",
    FRAGMENT: "fragment",
    FORM_POST: "form_post",
};
/**
 * allowed grant_type
 */
const GrantType = {
    IMPLICIT_GRANT: "implicit",
    AUTHORIZATION_CODE_GRANT: "authorization_code",
    CLIENT_CREDENTIALS_GRANT: "client_credentials",
    RESOURCE_OWNER_PASSWORD_GRANT: "password",
    REFRESH_TOKEN_GRANT: "refresh_token",
    DEVICE_CODE_GRANT: "device_code",
    JWT_BEARER: "urn:ietf:params:oauth:grant-type:jwt-bearer",
};
/**
 * Account types in Cache
 */
const CacheAccountType = {
    MSSTS_ACCOUNT_TYPE: "MSSTS",
    ADFS_ACCOUNT_TYPE: "ADFS",
    MSAV1_ACCOUNT_TYPE: "MSA",
    GENERIC_ACCOUNT_TYPE: "Generic", // NTLM, Kerberos, FBA, Basic etc
};
/**
 * Separators used in cache
 */
const Separators = {
    CACHE_KEY_SEPARATOR: "-",
    CLIENT_INFO_SEPARATOR: ".",
};
/**
 * Credential Type stored in the cache
 */
const CredentialType = {
    ID_TOKEN: "IdToken",
    ACCESS_TOKEN: "AccessToken",
    ACCESS_TOKEN_WITH_AUTH_SCHEME: "AccessToken_With_AuthScheme",
    REFRESH_TOKEN: "RefreshToken",
};
/**
 * Combine all cache types
 */
const CacheType = {
    ADFS: 1001,
    MSA: 1002,
    MSSTS: 1003,
    GENERIC: 1004,
    ACCESS_TOKEN: 2001,
    REFRESH_TOKEN: 2002,
    ID_TOKEN: 2003,
    APP_METADATA: 3001,
    UNDEFINED: 9999,
};
/**
 * More Cache related constants
 */
const APP_METADATA = "appmetadata";
const CLIENT_INFO$1 = "client_info";
const THE_FAMILY_ID = "1";
const AUTHORITY_METADATA_CONSTANTS = {
    CACHE_KEY: "authority-metadata",
    REFRESH_TIME_SECONDS: 3600 * 24, // 24 Hours
};
const AuthorityMetadataSource = {
    CONFIG: "config",
    CACHE: "cache",
    NETWORK: "network",
    HARDCODED_VALUES: "hardcoded_values",
};
const SERVER_TELEM_CONSTANTS = {
    SCHEMA_VERSION: 5,
    MAX_LAST_HEADER_BYTES: 330,
    MAX_CACHED_ERRORS: 50,
    CACHE_KEY: "server-telemetry",
    CATEGORY_SEPARATOR: "|",
    VALUE_SEPARATOR: ",",
    OVERFLOW_TRUE: "1",
    OVERFLOW_FALSE: "0",
    UNKNOWN_ERROR: "unknown_error",
};
/**
 * Type of the authentication request
 */
const AuthenticationScheme = {
    BEARER: "Bearer",
    POP: "pop",
    SSH: "ssh-cert",
};
/**
 * Constants related to throttling
 */
const ThrottlingConstants = {
    // Default time to throttle RequestThumbprint in seconds
    DEFAULT_THROTTLE_TIME_SECONDS: 60,
    // Default maximum time to throttle in seconds, overrides what the server sends back
    DEFAULT_MAX_THROTTLE_TIME_SECONDS: 3600,
    // Prefix for storing throttling entries
    THROTTLING_PREFIX: "throttling",
    // Value assigned to the x-ms-lib-capability header to indicate to the server the library supports throttling
    X_MS_LIB_CAPABILITY_VALUE: "retry-after, h429",
};
const Errors = {
    INVALID_GRANT_ERROR: "invalid_grant",
    CLIENT_MISMATCH_ERROR: "client_mismatch",
};
/**
 * Password grant parameters
 */
const PasswordGrantConstants = {
    username: "username",
    password: "password",
};
/**
 * Region Discovery Sources
 */
const RegionDiscoverySources = {
    FAILED_AUTO_DETECTION: "1",
    INTERNAL_CACHE: "2",
    ENVIRONMENT_VARIABLE: "3",
    IMDS: "4",
};
/**
 * Region Discovery Outcomes
 */
const RegionDiscoveryOutcomes = {
    CONFIGURED_NO_AUTO_DETECTION: "2",
    AUTO_DETECTION_REQUESTED_SUCCESSFUL: "4",
    AUTO_DETECTION_REQUESTED_FAILED: "5",
};
/**
 * Specifies the reason for fetching the access token from the identity provider
 */
const CacheOutcome = {
    // When a token is found in the cache or the cache is not supposed to be hit when making the request
    NOT_APPLICABLE: "0",
    // When the token request goes to the identity provider because force_refresh was set to true. Also occurs if claims were requested
    FORCE_REFRESH_OR_CLAIMS: "1",
    // When the token request goes to the identity provider because no cached access token exists
    NO_CACHED_ACCESS_TOKEN: "2",
    // When the token request goes to the identity provider because cached access token expired
    CACHED_ACCESS_TOKEN_EXPIRED: "3",
    // When the token request goes to the identity provider because refresh_in was used and the existing token needs to be refreshed
    PROACTIVELY_REFRESHED: "4",
};
const JsonWebTokenTypes = {
    Jwt: "JWT",
    Jwk: "JWK",
    Pop: "pop",
};
const ONE_DAY_IN_MS = 86400000;
// Token renewal offset default in seconds
const DEFAULT_TOKEN_RENEWAL_OFFSET_SEC = 300;
const EncodingTypes = {
    BASE64: "base64",
    HEX: "hex",
    UTF8: "utf-8",
};

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * AuthErrorMessage class containing string constants used by error codes and messages.
 */
const unexpectedError = "unexpected_error";
const postRequestFailed = "post_request_failed";

var AuthErrorCodes = /*#__PURE__*/Object.freeze({
    __proto__: null,
    postRequestFailed: postRequestFailed,
    unexpectedError: unexpectedError
});

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const AuthErrorMessages = {
    [unexpectedError]: "Unexpected error in authentication.",
    [postRequestFailed]: "Post request failed from the network, could be a 4xx/5xx or a network unavailability. Please check the exact error code for details.",
};
/**
 * AuthErrorMessage class containing string constants used by error codes and messages.
 * @deprecated Use AuthErrorCodes instead
 */
const AuthErrorMessage = {
    unexpectedError: {
        code: unexpectedError,
        desc: AuthErrorMessages[unexpectedError],
    },
    postRequestFailed: {
        code: postRequestFailed,
        desc: AuthErrorMessages[postRequestFailed],
    },
};
/**
 * General error class thrown by the MSAL.js library.
 */
class AuthError extends Error {
    constructor(errorCode, errorMessage, suberror) {
        const errorString = errorMessage
            ? `${errorCode}: ${errorMessage}`
            : errorCode;
        super(errorString);
        Object.setPrototypeOf(this, AuthError.prototype);
        this.errorCode = errorCode || Constants.EMPTY_STRING;
        this.errorMessage = errorMessage || Constants.EMPTY_STRING;
        this.subError = suberror || Constants.EMPTY_STRING;
        this.name = "AuthError";
    }
    setCorrelationId(correlationId) {
        this.correlationId = correlationId;
    }
}
function createAuthError(code, additionalMessage) {
    return new AuthError(code, additionalMessage
        ? `${AuthErrorMessages[code]} ${additionalMessage}`
        : AuthErrorMessages[code]);
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const clientInfoDecodingError = "client_info_decoding_error";
const clientInfoEmptyError = "client_info_empty_error";
const tokenParsingError = "token_parsing_error";
const nullOrEmptyToken = "null_or_empty_token";
const endpointResolutionError = "endpoints_resolution_error";
const networkError = "network_error";
const openIdConfigError = "openid_config_error";
const hashNotDeserialized = "hash_not_deserialized";
const invalidState = "invalid_state";
const stateMismatch = "state_mismatch";
const stateNotFound = "state_not_found";
const nonceMismatch = "nonce_mismatch";
const authTimeNotFound = "auth_time_not_found";
const maxAgeTranspired = "max_age_transpired";
const multipleMatchingTokens = "multiple_matching_tokens";
const multipleMatchingAccounts = "multiple_matching_accounts";
const multipleMatchingAppMetadata = "multiple_matching_appMetadata";
const requestCannotBeMade = "request_cannot_be_made";
const cannotRemoveEmptyScope = "cannot_remove_empty_scope";
const cannotAppendScopeSet = "cannot_append_scopeset";
const emptyInputScopeSet = "empty_input_scopeset";
const deviceCodePollingCancelled = "device_code_polling_cancelled";
const deviceCodeExpired = "device_code_expired";
const deviceCodeUnknownError = "device_code_unknown_error";
const noAccountInSilentRequest = "no_account_in_silent_request";
const invalidCacheRecord = "invalid_cache_record";
const invalidCacheEnvironment = "invalid_cache_environment";
const noAccountFound = "no_account_found";
const noCryptoObject = "no_crypto_object";
const unexpectedCredentialType = "unexpected_credential_type";
const invalidAssertion = "invalid_assertion";
const invalidClientCredential = "invalid_client_credential";
const tokenRefreshRequired = "token_refresh_required";
const userTimeoutReached = "user_timeout_reached";
const tokenClaimsCnfRequiredForSignedJwt = "token_claims_cnf_required_for_signedjwt";
const authorizationCodeMissingFromServerResponse = "authorization_code_missing_from_server_response";
const bindingKeyNotRemoved = "binding_key_not_removed";
const endSessionEndpointNotSupported = "end_session_endpoint_not_supported";
const keyIdMissing = "key_id_missing";
const noNetworkConnectivity = "no_network_connectivity";
const userCanceled = "user_canceled";
const missingTenantIdError = "missing_tenant_id_error";
const methodNotImplemented = "method_not_implemented";
const nestedAppAuthBridgeDisabled = "nested_app_auth_bridge_disabled";
const platformBrokerError = "platform_broker_error";

var ClientAuthErrorCodes = /*#__PURE__*/Object.freeze({
    __proto__: null,
    authTimeNotFound: authTimeNotFound,
    authorizationCodeMissingFromServerResponse: authorizationCodeMissingFromServerResponse,
    bindingKeyNotRemoved: bindingKeyNotRemoved,
    cannotAppendScopeSet: cannotAppendScopeSet,
    cannotRemoveEmptyScope: cannotRemoveEmptyScope,
    clientInfoDecodingError: clientInfoDecodingError,
    clientInfoEmptyError: clientInfoEmptyError,
    deviceCodeExpired: deviceCodeExpired,
    deviceCodePollingCancelled: deviceCodePollingCancelled,
    deviceCodeUnknownError: deviceCodeUnknownError,
    emptyInputScopeSet: emptyInputScopeSet,
    endSessionEndpointNotSupported: endSessionEndpointNotSupported,
    endpointResolutionError: endpointResolutionError,
    hashNotDeserialized: hashNotDeserialized,
    invalidAssertion: invalidAssertion,
    invalidCacheEnvironment: invalidCacheEnvironment,
    invalidCacheRecord: invalidCacheRecord,
    invalidClientCredential: invalidClientCredential,
    invalidState: invalidState,
    keyIdMissing: keyIdMissing,
    maxAgeTranspired: maxAgeTranspired,
    methodNotImplemented: methodNotImplemented,
    missingTenantIdError: missingTenantIdError,
    multipleMatchingAccounts: multipleMatchingAccounts,
    multipleMatchingAppMetadata: multipleMatchingAppMetadata,
    multipleMatchingTokens: multipleMatchingTokens,
    nestedAppAuthBridgeDisabled: nestedAppAuthBridgeDisabled,
    networkError: networkError,
    noAccountFound: noAccountFound,
    noAccountInSilentRequest: noAccountInSilentRequest,
    noCryptoObject: noCryptoObject,
    noNetworkConnectivity: noNetworkConnectivity,
    nonceMismatch: nonceMismatch,
    nullOrEmptyToken: nullOrEmptyToken,
    openIdConfigError: openIdConfigError,
    platformBrokerError: platformBrokerError,
    requestCannotBeMade: requestCannotBeMade,
    stateMismatch: stateMismatch,
    stateNotFound: stateNotFound,
    tokenClaimsCnfRequiredForSignedJwt: tokenClaimsCnfRequiredForSignedJwt,
    tokenParsingError: tokenParsingError,
    tokenRefreshRequired: tokenRefreshRequired,
    unexpectedCredentialType: unexpectedCredentialType,
    userCanceled: userCanceled,
    userTimeoutReached: userTimeoutReached
});

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * ClientAuthErrorMessage class containing string constants used by error codes and messages.
 */
const ClientAuthErrorMessages = {
    [clientInfoDecodingError]: "The client info could not be parsed/decoded correctly",
    [clientInfoEmptyError]: "The client info was empty",
    [tokenParsingError]: "Token cannot be parsed",
    [nullOrEmptyToken]: "The token is null or empty",
    [endpointResolutionError]: "Endpoints cannot be resolved",
    [networkError]: "Network request failed",
    [openIdConfigError]: "Could not retrieve endpoints. Check your authority and verify the .well-known/openid-configuration endpoint returns the required endpoints.",
    [hashNotDeserialized]: "The hash parameters could not be deserialized",
    [invalidState]: "State was not the expected format",
    [stateMismatch]: "State mismatch error",
    [stateNotFound]: "State not found",
    [nonceMismatch]: "Nonce mismatch error",
    [authTimeNotFound]: "Max Age was requested and the ID token is missing the auth_time variable." +
        " auth_time is an optional claim and is not enabled by default - it must be enabled." +
        " See https://aka.ms/msaljs/optional-claims for more information.",
    [maxAgeTranspired]: "Max Age is set to 0, or too much time has elapsed since the last end-user authentication.",
    [multipleMatchingTokens]: "The cache contains multiple tokens satisfying the requirements. " +
        "Call AcquireToken again providing more requirements such as authority or account.",
    [multipleMatchingAccounts]: "The cache contains multiple accounts satisfying the given parameters. Please pass more info to obtain the correct account",
    [multipleMatchingAppMetadata]: "The cache contains multiple appMetadata satisfying the given parameters. Please pass more info to obtain the correct appMetadata",
    [requestCannotBeMade]: "Token request cannot be made without authorization code or refresh token.",
    [cannotRemoveEmptyScope]: "Cannot remove null or empty scope from ScopeSet",
    [cannotAppendScopeSet]: "Cannot append ScopeSet",
    [emptyInputScopeSet]: "Empty input ScopeSet cannot be processed",
    [deviceCodePollingCancelled]: "Caller has cancelled token endpoint polling during device code flow by setting DeviceCodeRequest.cancel = true.",
    [deviceCodeExpired]: "Device code is expired.",
    [deviceCodeUnknownError]: "Device code stopped polling for unknown reasons.",
    [noAccountInSilentRequest]: "Please pass an account object, silent flow is not supported without account information",
    [invalidCacheRecord]: "Cache record object was null or undefined.",
    [invalidCacheEnvironment]: "Invalid environment when attempting to create cache entry",
    [noAccountFound]: "No account found in cache for given key.",
    [noCryptoObject]: "No crypto object detected.",
    [unexpectedCredentialType]: "Unexpected credential type.",
    [invalidAssertion]: "Client assertion must meet requirements described in https://tools.ietf.org/html/rfc7515",
    [invalidClientCredential]: "Client credential (secret, certificate, or assertion) must not be empty when creating a confidential client. An application should at most have one credential",
    [tokenRefreshRequired]: "Cannot return token from cache because it must be refreshed. This may be due to one of the following reasons: forceRefresh parameter is set to true, claims have been requested, there is no cached access token or it is expired.",
    [userTimeoutReached]: "User defined timeout for device code polling reached",
    [tokenClaimsCnfRequiredForSignedJwt]: "Cannot generate a POP jwt if the token_claims are not populated",
    [authorizationCodeMissingFromServerResponse]: "Server response does not contain an authorization code to proceed",
    [bindingKeyNotRemoved]: "Could not remove the credential's binding key from storage.",
    [endSessionEndpointNotSupported]: "The provided authority does not support logout",
    [keyIdMissing]: "A keyId value is missing from the requested bound token's cache record and is required to match the token to it's stored binding key.",
    [noNetworkConnectivity]: "No network connectivity. Check your internet connection.",
    [userCanceled]: "User cancelled the flow.",
    [missingTenantIdError]: "A tenant id - not common, organizations, or consumers - must be specified when using the client_credentials flow.",
    [methodNotImplemented]: "This method has not been implemented",
    [nestedAppAuthBridgeDisabled]: "The nested app auth bridge is disabled",
    [platformBrokerError]: "An error occurred in the native broker. See the platformBrokerError property for details.",
};
/**
 * String constants used by error codes and messages.
 * @deprecated Use ClientAuthErrorCodes instead
 */
const ClientAuthErrorMessage = {
    clientInfoDecodingError: {
        code: clientInfoDecodingError,
        desc: ClientAuthErrorMessages[clientInfoDecodingError],
    },
    clientInfoEmptyError: {
        code: clientInfoEmptyError,
        desc: ClientAuthErrorMessages[clientInfoEmptyError],
    },
    tokenParsingError: {
        code: tokenParsingError,
        desc: ClientAuthErrorMessages[tokenParsingError],
    },
    nullOrEmptyToken: {
        code: nullOrEmptyToken,
        desc: ClientAuthErrorMessages[nullOrEmptyToken],
    },
    endpointResolutionError: {
        code: endpointResolutionError,
        desc: ClientAuthErrorMessages[endpointResolutionError],
    },
    networkError: {
        code: networkError,
        desc: ClientAuthErrorMessages[networkError],
    },
    unableToGetOpenidConfigError: {
        code: openIdConfigError,
        desc: ClientAuthErrorMessages[openIdConfigError],
    },
    hashNotDeserialized: {
        code: hashNotDeserialized,
        desc: ClientAuthErrorMessages[hashNotDeserialized],
    },
    invalidStateError: {
        code: invalidState,
        desc: ClientAuthErrorMessages[invalidState],
    },
    stateMismatchError: {
        code: stateMismatch,
        desc: ClientAuthErrorMessages[stateMismatch],
    },
    stateNotFoundError: {
        code: stateNotFound,
        desc: ClientAuthErrorMessages[stateNotFound],
    },
    nonceMismatchError: {
        code: nonceMismatch,
        desc: ClientAuthErrorMessages[nonceMismatch],
    },
    authTimeNotFoundError: {
        code: authTimeNotFound,
        desc: ClientAuthErrorMessages[authTimeNotFound],
    },
    maxAgeTranspired: {
        code: maxAgeTranspired,
        desc: ClientAuthErrorMessages[maxAgeTranspired],
    },
    multipleMatchingTokens: {
        code: multipleMatchingTokens,
        desc: ClientAuthErrorMessages[multipleMatchingTokens],
    },
    multipleMatchingAccounts: {
        code: multipleMatchingAccounts,
        desc: ClientAuthErrorMessages[multipleMatchingAccounts],
    },
    multipleMatchingAppMetadata: {
        code: multipleMatchingAppMetadata,
        desc: ClientAuthErrorMessages[multipleMatchingAppMetadata],
    },
    tokenRequestCannotBeMade: {
        code: requestCannotBeMade,
        desc: ClientAuthErrorMessages[requestCannotBeMade],
    },
    removeEmptyScopeError: {
        code: cannotRemoveEmptyScope,
        desc: ClientAuthErrorMessages[cannotRemoveEmptyScope],
    },
    appendScopeSetError: {
        code: cannotAppendScopeSet,
        desc: ClientAuthErrorMessages[cannotAppendScopeSet],
    },
    emptyInputScopeSetError: {
        code: emptyInputScopeSet,
        desc: ClientAuthErrorMessages[emptyInputScopeSet],
    },
    DeviceCodePollingCancelled: {
        code: deviceCodePollingCancelled,
        desc: ClientAuthErrorMessages[deviceCodePollingCancelled],
    },
    DeviceCodeExpired: {
        code: deviceCodeExpired,
        desc: ClientAuthErrorMessages[deviceCodeExpired],
    },
    DeviceCodeUnknownError: {
        code: deviceCodeUnknownError,
        desc: ClientAuthErrorMessages[deviceCodeUnknownError],
    },
    NoAccountInSilentRequest: {
        code: noAccountInSilentRequest,
        desc: ClientAuthErrorMessages[noAccountInSilentRequest],
    },
    invalidCacheRecord: {
        code: invalidCacheRecord,
        desc: ClientAuthErrorMessages[invalidCacheRecord],
    },
    invalidCacheEnvironment: {
        code: invalidCacheEnvironment,
        desc: ClientAuthErrorMessages[invalidCacheEnvironment],
    },
    noAccountFound: {
        code: noAccountFound,
        desc: ClientAuthErrorMessages[noAccountFound],
    },
    noCryptoObj: {
        code: noCryptoObject,
        desc: ClientAuthErrorMessages[noCryptoObject],
    },
    unexpectedCredentialType: {
        code: unexpectedCredentialType,
        desc: ClientAuthErrorMessages[unexpectedCredentialType],
    },
    invalidAssertion: {
        code: invalidAssertion,
        desc: ClientAuthErrorMessages[invalidAssertion],
    },
    invalidClientCredential: {
        code: invalidClientCredential,
        desc: ClientAuthErrorMessages[invalidClientCredential],
    },
    tokenRefreshRequired: {
        code: tokenRefreshRequired,
        desc: ClientAuthErrorMessages[tokenRefreshRequired],
    },
    userTimeoutReached: {
        code: userTimeoutReached,
        desc: ClientAuthErrorMessages[userTimeoutReached],
    },
    tokenClaimsRequired: {
        code: tokenClaimsCnfRequiredForSignedJwt,
        desc: ClientAuthErrorMessages[tokenClaimsCnfRequiredForSignedJwt],
    },
    noAuthorizationCodeFromServer: {
        code: authorizationCodeMissingFromServerResponse,
        desc: ClientAuthErrorMessages[authorizationCodeMissingFromServerResponse],
    },
    bindingKeyNotRemovedError: {
        code: bindingKeyNotRemoved,
        desc: ClientAuthErrorMessages[bindingKeyNotRemoved],
    },
    logoutNotSupported: {
        code: endSessionEndpointNotSupported,
        desc: ClientAuthErrorMessages[endSessionEndpointNotSupported],
    },
    keyIdMissing: {
        code: keyIdMissing,
        desc: ClientAuthErrorMessages[keyIdMissing],
    },
    noNetworkConnectivity: {
        code: noNetworkConnectivity,
        desc: ClientAuthErrorMessages[noNetworkConnectivity],
    },
    userCanceledError: {
        code: userCanceled,
        desc: ClientAuthErrorMessages[userCanceled],
    },
    missingTenantIdError: {
        code: missingTenantIdError,
        desc: ClientAuthErrorMessages[missingTenantIdError],
    },
    nestedAppAuthBridgeDisabled: {
        code: nestedAppAuthBridgeDisabled,
        desc: ClientAuthErrorMessages[nestedAppAuthBridgeDisabled],
    },
    platformBrokerError: {
        code: platformBrokerError,
        desc: ClientAuthErrorMessages[platformBrokerError],
    },
};
/**
 * Error thrown when there is an error in the client code running on the browser.
 */
class ClientAuthError extends AuthError {
    constructor(errorCode, additionalMessage) {
        super(errorCode, additionalMessage
            ? `${ClientAuthErrorMessages[errorCode]}: ${additionalMessage}`
            : ClientAuthErrorMessages[errorCode]);
        this.name = "ClientAuthError";
        Object.setPrototypeOf(this, ClientAuthError.prototype);
    }
}
function createClientAuthError(errorCode, additionalMessage) {
    return new ClientAuthError(errorCode, additionalMessage);
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Extract token by decoding the rawToken
 *
 * @param encodedToken
 */
function extractTokenClaims(encodedToken, base64Decode) {
    const jswPayload = getJWSPayload(encodedToken);
    // token will be decoded to get the username
    try {
        // base64Decode() should throw an error if there is an issue
        const base64Decoded = base64Decode(jswPayload);
        return JSON.parse(base64Decoded);
    }
    catch (err) {
        throw createClientAuthError(tokenParsingError);
    }
}
/**
 * Check if the signin_state claim contains "kmsi"
 * @param idTokenClaims
 * @returns
 */
function isKmsi(idTokenClaims) {
    if (!idTokenClaims.signin_state) {
        return false;
    }
    /**
     * Signin_state claim known values:
     * dvc_mngd - device is managed
     * dvc_dmjd - device is domain joined
     * kmsi - user opted to "keep me signed in"
     * inknownntwk - Request made inside a known network. Don't use this, use CAE instead.
     */
    const kmsiClaims = ["kmsi", "dvc_dmjd"]; // There are some cases where kmsi may not be returned but persistent storage is still OK - allow dvc_dmjd as well
    const kmsi = idTokenClaims.signin_state.some((value) => kmsiClaims.includes(value.trim().toLowerCase()));
    return kmsi;
}
/**
 * decode a JWT
 *
 * @param authToken
 */
function getJWSPayload(authToken) {
    if (!authToken) {
        throw createClientAuthError(nullOrEmptyToken);
    }
    const tokenPartsRegex = /^([^\.\s]*)\.([^\.\s]+)\.([^\.\s]*)$/;
    const matches = tokenPartsRegex.exec(authToken);
    if (!matches || matches.length < 4) {
        throw createClientAuthError(tokenParsingError);
    }
    /**
     * const crackedToken = {
     *  header: matches[1],
     *  JWSPayload: matches[2],
     *  JWSSig: matches[3],
     * };
     */
    return matches[2];
}
/**
 * Determine if the token's max_age has transpired
 */
function checkMaxAge(authTime, maxAge) {
    /*
     * per https://openid.net/specs/openid-connect-core-1_0.html#AuthRequest
     * To force an immediate re-authentication: If an app requires that a user re-authenticate prior to access,
     * provide a value of 0 for the max_age parameter and the AS will force a fresh login.
     */
    const fiveMinuteSkew = 300000; // five minutes in milliseconds
    if (maxAge === 0 || Date.now() - fiveMinuteSkew > authTime + maxAge) {
        throw createClientAuthError(maxAgeTranspired);
    }
}

var AuthToken = /*#__PURE__*/Object.freeze({
    __proto__: null,
    checkMaxAge: checkMaxAge,
    extractTokenClaims: extractTokenClaims,
    getJWSPayload: getJWSPayload,
    isKmsi: isKmsi
});

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Authority types supported by MSAL.
 */
const AuthorityType = {
    Default: 0,
    Adfs: 1,
    Dsts: 2,
    Ciam: 3,
};

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
function isOpenIdConfigResponse(response) {
    return (response.hasOwnProperty("authorization_endpoint") &&
        response.hasOwnProperty("token_endpoint") &&
        response.hasOwnProperty("issuer") &&
        response.hasOwnProperty("jwks_uri"));
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const redirectUriEmpty = "redirect_uri_empty";
const claimsRequestParsingError = "claims_request_parsing_error";
const authorityUriInsecure = "authority_uri_insecure";
const urlParseError = "url_parse_error";
const urlEmptyError = "empty_url_error";
const emptyInputScopesError = "empty_input_scopes_error";
const invalidClaims = "invalid_claims";
const tokenRequestEmpty = "token_request_empty";
const logoutRequestEmpty = "logout_request_empty";
const invalidCodeChallengeMethod = "invalid_code_challenge_method";
const pkceParamsMissing = "pkce_params_missing";
const invalidCloudDiscoveryMetadata = "invalid_cloud_discovery_metadata";
const invalidAuthorityMetadata = "invalid_authority_metadata";
const untrustedAuthority = "untrusted_authority";
const missingSshJwk = "missing_ssh_jwk";
const missingSshKid = "missing_ssh_kid";
const missingNonceAuthenticationHeader = "missing_nonce_authentication_header";
const invalidAuthenticationHeader = "invalid_authentication_header";
const cannotSetOIDCOptions = "cannot_set_OIDCOptions";
const cannotAllowPlatformBroker = "cannot_allow_platform_broker";
const authorityMismatch = "authority_mismatch";
const invalidRequestMethodForEAR = "invalid_request_method_for_EAR";
const invalidAuthorizePostBodyParameters = "invalid_authorize_post_body_parameters";
const invalidPlatformBrokerConfiguration = "invalid_platform_broker_configuration";

var ClientConfigurationErrorCodes = /*#__PURE__*/Object.freeze({
    __proto__: null,
    authorityMismatch: authorityMismatch,
    authorityUriInsecure: authorityUriInsecure,
    cannotAllowPlatformBroker: cannotAllowPlatformBroker,
    cannotSetOIDCOptions: cannotSetOIDCOptions,
    claimsRequestParsingError: claimsRequestParsingError,
    emptyInputScopesError: emptyInputScopesError,
    invalidAuthenticationHeader: invalidAuthenticationHeader,
    invalidAuthorityMetadata: invalidAuthorityMetadata,
    invalidAuthorizePostBodyParameters: invalidAuthorizePostBodyParameters,
    invalidClaims: invalidClaims,
    invalidCloudDiscoveryMetadata: invalidCloudDiscoveryMetadata,
    invalidCodeChallengeMethod: invalidCodeChallengeMethod,
    invalidPlatformBrokerConfiguration: invalidPlatformBrokerConfiguration,
    invalidRequestMethodForEAR: invalidRequestMethodForEAR,
    logoutRequestEmpty: logoutRequestEmpty,
    missingNonceAuthenticationHeader: missingNonceAuthenticationHeader,
    missingSshJwk: missingSshJwk,
    missingSshKid: missingSshKid,
    pkceParamsMissing: pkceParamsMissing,
    redirectUriEmpty: redirectUriEmpty,
    tokenRequestEmpty: tokenRequestEmpty,
    untrustedAuthority: untrustedAuthority,
    urlEmptyError: urlEmptyError,
    urlParseError: urlParseError
});

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const ClientConfigurationErrorMessages = {
    [redirectUriEmpty]: "A redirect URI is required for all calls, and none has been set.",
    [claimsRequestParsingError]: "Could not parse the given claims request object.",
    [authorityUriInsecure]: "Authority URIs must use https.  Please see here for valid authority configuration options: https://docs.microsoft.com/en-us/azure/active-directory/develop/msal-js-initializing-client-applications#configuration-options",
    [urlParseError]: "URL could not be parsed into appropriate segments.",
    [urlEmptyError]: "URL was empty or null.",
    [emptyInputScopesError]: "Scopes cannot be passed as null, undefined or empty array because they are required to obtain an access token.",
    [invalidClaims]: "Given claims parameter must be a stringified JSON object.",
    [tokenRequestEmpty]: "Token request was empty and not found in cache.",
    [logoutRequestEmpty]: "The logout request was null or undefined.",
    [invalidCodeChallengeMethod]: 'code_challenge_method passed is invalid. Valid values are "plain" and "S256".',
    [pkceParamsMissing]: "Both params: code_challenge and code_challenge_method are to be passed if to be sent in the request",
    [invalidCloudDiscoveryMetadata]: "Invalid cloudDiscoveryMetadata provided. Must be a stringified JSON object containing tenant_discovery_endpoint and metadata fields",
    [invalidAuthorityMetadata]: "Invalid authorityMetadata provided. Must by a stringified JSON object containing authorization_endpoint, token_endpoint, issuer fields.",
    [untrustedAuthority]: "The provided authority is not a trusted authority. Please include this authority in the knownAuthorities config parameter.",
    [missingSshJwk]: "Missing sshJwk in SSH certificate request. A stringified JSON Web Key is required when using the SSH authentication scheme.",
    [missingSshKid]: "Missing sshKid in SSH certificate request. A string that uniquely identifies the public SSH key is required when using the SSH authentication scheme.",
    [missingNonceAuthenticationHeader]: "Unable to find an authentication header containing server nonce. Either the Authentication-Info or WWW-Authenticate headers must be present in order to obtain a server nonce.",
    [invalidAuthenticationHeader]: "Invalid authentication header provided",
    [cannotSetOIDCOptions]: "Cannot set OIDCOptions parameter. Please change the protocol mode to OIDC or use a non-Microsoft authority.",
    [cannotAllowPlatformBroker]: "Cannot set allowPlatformBroker parameter to true when not in AAD protocol mode.",
    [authorityMismatch]: "Authority mismatch error. Authority provided in login request or PublicClientApplication config does not match the environment of the provided account. Please use a matching account or make an interactive request to login to this authority.",
    [invalidAuthorizePostBodyParameters]: "Invalid authorize post body parameters provided. If you are using authorizePostBodyParameters, the request method must be POST. Please check the request method and parameters.",
    [invalidRequestMethodForEAR]: "Invalid request method for EAR protocol mode. The request method cannot be GET when using EAR protocol mode. Please change the request method to POST.",
    [invalidPlatformBrokerConfiguration]: "Invalid platform broker configuration. `allowPlatformBrokerWithDOM` can only be enabled when `allowPlatformBroker` is enabled.",
};
/**
 * ClientConfigurationErrorMessage class containing string constants used by error codes and messages.
 * @deprecated Use ClientConfigurationErrorCodes instead
 */
const ClientConfigurationErrorMessage = {
    redirectUriNotSet: {
        code: redirectUriEmpty,
        desc: ClientConfigurationErrorMessages[redirectUriEmpty],
    },
    claimsRequestParsingError: {
        code: claimsRequestParsingError,
        desc: ClientConfigurationErrorMessages[claimsRequestParsingError],
    },
    authorityUriInsecure: {
        code: authorityUriInsecure,
        desc: ClientConfigurationErrorMessages[authorityUriInsecure],
    },
    urlParseError: {
        code: urlParseError,
        desc: ClientConfigurationErrorMessages[urlParseError],
    },
    urlEmptyError: {
        code: urlEmptyError,
        desc: ClientConfigurationErrorMessages[urlEmptyError],
    },
    emptyScopesError: {
        code: emptyInputScopesError,
        desc: ClientConfigurationErrorMessages[emptyInputScopesError],
    },
    invalidClaimsRequest: {
        code: invalidClaims,
        desc: ClientConfigurationErrorMessages[invalidClaims],
    },
    tokenRequestEmptyError: {
        code: tokenRequestEmpty,
        desc: ClientConfigurationErrorMessages[tokenRequestEmpty],
    },
    logoutRequestEmptyError: {
        code: logoutRequestEmpty,
        desc: ClientConfigurationErrorMessages[logoutRequestEmpty],
    },
    invalidCodeChallengeMethod: {
        code: invalidCodeChallengeMethod,
        desc: ClientConfigurationErrorMessages[invalidCodeChallengeMethod],
    },
    invalidCodeChallengeParams: {
        code: pkceParamsMissing,
        desc: ClientConfigurationErrorMessages[pkceParamsMissing],
    },
    invalidCloudDiscoveryMetadata: {
        code: invalidCloudDiscoveryMetadata,
        desc: ClientConfigurationErrorMessages[invalidCloudDiscoveryMetadata],
    },
    invalidAuthorityMetadata: {
        code: invalidAuthorityMetadata,
        desc: ClientConfigurationErrorMessages[invalidAuthorityMetadata],
    },
    untrustedAuthority: {
        code: untrustedAuthority,
        desc: ClientConfigurationErrorMessages[untrustedAuthority],
    },
    missingSshJwk: {
        code: missingSshJwk,
        desc: ClientConfigurationErrorMessages[missingSshJwk],
    },
    missingSshKid: {
        code: missingSshKid,
        desc: ClientConfigurationErrorMessages[missingSshKid],
    },
    missingNonceAuthenticationHeader: {
        code: missingNonceAuthenticationHeader,
        desc: ClientConfigurationErrorMessages[missingNonceAuthenticationHeader],
    },
    invalidAuthenticationHeader: {
        code: invalidAuthenticationHeader,
        desc: ClientConfigurationErrorMessages[invalidAuthenticationHeader],
    },
    cannotSetOIDCOptions: {
        code: cannotSetOIDCOptions,
        desc: ClientConfigurationErrorMessages[cannotSetOIDCOptions],
    },
    cannotAllowPlatformBroker: {
        code: cannotAllowPlatformBroker,
        desc: ClientConfigurationErrorMessages[cannotAllowPlatformBroker],
    },
    authorityMismatch: {
        code: authorityMismatch,
        desc: ClientConfigurationErrorMessages[authorityMismatch],
    },
    invalidAuthorizePostBodyParameters: {
        code: invalidAuthorizePostBodyParameters,
        desc: ClientConfigurationErrorMessages[invalidAuthorizePostBodyParameters],
    },
    invalidRequestMethodForEAR: {
        code: invalidRequestMethodForEAR,
        desc: ClientConfigurationErrorMessages[invalidRequestMethodForEAR],
    },
    invalidPlatformBrokerConfiguration: {
        code: invalidPlatformBrokerConfiguration,
        desc: ClientConfigurationErrorMessages[invalidPlatformBrokerConfiguration],
    },
};
/**
 * Error thrown when there is an error in configuration of the MSAL.js library.
 */
class ClientConfigurationError extends AuthError {
    constructor(errorCode) {
        super(errorCode, ClientConfigurationErrorMessages[errorCode]);
        this.name = "ClientConfigurationError";
        Object.setPrototypeOf(this, ClientConfigurationError.prototype);
    }
}
function createClientConfigurationError(errorCode) {
    return new ClientConfigurationError(errorCode);
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * @hidden
 */
class StringUtils {
    /**
     * Check if stringified object is empty
     * @param strObj
     */
    static isEmptyObj(strObj) {
        if (strObj) {
            try {
                const obj = JSON.parse(strObj);
                return Object.keys(obj).length === 0;
            }
            catch (e) { }
        }
        return true;
    }
    static startsWith(str, search) {
        return str.indexOf(search) === 0;
    }
    static endsWith(str, search) {
        return (str.length >= search.length &&
            str.lastIndexOf(search) === str.length - search.length);
    }
    /**
     * Parses string into an object.
     *
     * @param query
     */
    static queryStringToObject(query) {
        const obj = {};
        const params = query.split("&");
        const decode = (s) => decodeURIComponent(s.replace(/\+/g, " "));
        params.forEach((pair) => {
            if (pair.trim()) {
                const [key, value] = pair.split(/=(.+)/g, 2); // Split on the first occurence of the '=' character
                if (key && value) {
                    obj[decode(key)] = decode(value);
                }
            }
        });
        return obj;
    }
    /**
     * Trims entries in an array.
     *
     * @param arr
     */
    static trimArrayEntries(arr) {
        return arr.map((entry) => entry.trim());
    }
    /**
     * Removes empty strings from array
     * @param arr
     */
    static removeEmptyStringsFromArray(arr) {
        return arr.filter((entry) => {
            return !!entry;
        });
    }
    /**
     * Attempts to parse a string into JSON
     * @param str
     */
    static jsonParseHelper(str) {
        try {
            return JSON.parse(str);
        }
        catch (e) {
            return null;
        }
    }
    /**
     * Tests if a given string matches a given pattern, with support for wildcards and queries.
     * @param pattern Wildcard pattern to string match. Supports "*" for wildcards and "?" for queries
     * @param input String to match against
     */
    static matchPattern(pattern, input) {
        /**
         * Wildcard support: https://stackoverflow.com/a/3117248/4888559
         * Queries: replaces "?" in string with escaped "\?" for regex test
         */
        // eslint-disable-next-line security/detect-non-literal-regexp
        const regex = new RegExp(pattern
            .replace(/\\/g, "\\\\")
            .replace(/\*/g, "[^ ]*")
            .replace(/\?/g, "\\?"));
        return regex.test(input);
    }
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Canonicalizes a URL by making it lowercase and ensuring it ends with /
 * Inlined version of UrlString.canonicalizeUri to avoid circular dependency
 * @param url - URL to canonicalize
 * @returns Canonicalized URL
 */
function canonicalizeUrl(url) {
    if (!url) {
        return url;
    }
    let lowerCaseUrl = url.toLowerCase();
    if (StringUtils.endsWith(lowerCaseUrl, "?")) {
        lowerCaseUrl = lowerCaseUrl.slice(0, -1);
    }
    else if (StringUtils.endsWith(lowerCaseUrl, "?/")) {
        lowerCaseUrl = lowerCaseUrl.slice(0, -2);
    }
    if (!StringUtils.endsWith(lowerCaseUrl, "/")) {
        lowerCaseUrl += "/";
    }
    return lowerCaseUrl;
}
/**
 * Parses hash string from given string. Returns empty string if no hash symbol is found.
 * @param hashString
 */
function stripLeadingHashOrQuery(responseString) {
    if (responseString.startsWith("#/")) {
        return responseString.substring(2);
    }
    else if (responseString.startsWith("#") ||
        responseString.startsWith("?")) {
        return responseString.substring(1);
    }
    return responseString;
}
/**
 * Returns URL hash as server auth code response object.
 */
function getDeserializedResponse(responseString) {
    // Check if given hash is empty
    if (!responseString || responseString.indexOf("=") < 0) {
        return null;
    }
    try {
        // Strip the # or ? symbol if present
        const normalizedResponse = stripLeadingHashOrQuery(responseString);
        // If # symbol was not present, above will return empty string, so give original hash value
        const deserializedHash = Object.fromEntries(new URLSearchParams(normalizedResponse));
        // Check for known response properties
        if (deserializedHash.code ||
            deserializedHash.ear_jwe ||
            deserializedHash.error ||
            deserializedHash.error_description ||
            deserializedHash.state) {
            return deserializedHash;
        }
    }
    catch (e) {
        throw createClientAuthError(hashNotDeserialized);
    }
    return null;
}
/**
 * Utility to create a URL from the params map
 */
function mapToQueryString(parameters, encodeExtraParams = true, extraQueryParameters) {
    const queryParameterArray = new Array();
    parameters.forEach((value, key) => {
        if (!encodeExtraParams &&
            extraQueryParameters &&
            key in extraQueryParameters) {
            queryParameterArray.push(`${key}=${value}`);
        }
        else {
            queryParameterArray.push(`${key}=${encodeURIComponent(value)}`);
        }
    });
    return queryParameterArray.join("&");
}
/**
 * Normalizes URLs for comparison by removing hash, canonicalizing,
 * and ensuring consistent URL encoding in query parameters.
 * This fixes redirect loops when URLs contain encoded characters like apostrophes (%27).
 * @param url - URL to normalize
 * @returns Normalized URL string for comparison
 */
function normalizeUrlForComparison(url) {
    if (!url) {
        return url;
    }
    // Remove hash first
    const urlWithoutHash = url.split("#")[0];
    try {
        // Parse the URL to handle encoding consistently
        const urlObj = new URL(urlWithoutHash);
        /*
         * Reconstruct the URL with properly decoded query parameters
         * This ensures that %27 and ' are treated as equivalent
         */
        const normalizedUrl = urlObj.origin + urlObj.pathname + urlObj.search;
        // Apply canonicalization logic inline to avoid circular dependency
        return canonicalizeUrl(normalizedUrl);
    }
    catch (e) {
        // Fallback to original logic if URL parsing fails
        return canonicalizeUrl(urlWithoutHash);
    }
}

var UrlUtils = /*#__PURE__*/Object.freeze({
    __proto__: null,
    getDeserializedResponse: getDeserializedResponse,
    mapToQueryString: mapToQueryString,
    normalizeUrlForComparison: normalizeUrlForComparison,
    stripLeadingHashOrQuery: stripLeadingHashOrQuery
});

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Url object class which can perform various transformations on url strings.
 */
class UrlString {
    get urlString() {
        return this._urlString;
    }
    constructor(url) {
        this._urlString = url;
        if (!this._urlString) {
            // Throws error if url is empty
            throw createClientConfigurationError(urlEmptyError);
        }
        if (!url.includes("#")) {
            this._urlString = UrlString.canonicalizeUri(url);
        }
    }
    /**
     * Ensure urls are lower case and end with a / character.
     * @param url
     */
    static canonicalizeUri(url) {
        if (url) {
            let lowerCaseUrl = url.toLowerCase();
            if (StringUtils.endsWith(lowerCaseUrl, "?")) {
                lowerCaseUrl = lowerCaseUrl.slice(0, -1);
            }
            else if (StringUtils.endsWith(lowerCaseUrl, "?/")) {
                lowerCaseUrl = lowerCaseUrl.slice(0, -2);
            }
            if (!StringUtils.endsWith(lowerCaseUrl, "/")) {
                lowerCaseUrl += "/";
            }
            return lowerCaseUrl;
        }
        return url;
    }
    /**
     * Throws if urlString passed is not a valid authority URI string.
     */
    validateAsUri() {
        // Attempts to parse url for uri components
        let components;
        try {
            components = this.getUrlComponents();
        }
        catch (e) {
            throw createClientConfigurationError(urlParseError);
        }
        // Throw error if URI or path segments are not parseable.
        if (!components.HostNameAndPort || !components.PathSegments) {
            throw createClientConfigurationError(urlParseError);
        }
        // Throw error if uri is insecure.
        if (!components.Protocol ||
            components.Protocol.toLowerCase() !== "https:") {
            throw createClientConfigurationError(authorityUriInsecure);
        }
    }
    /**
     * Given a url and a query string return the url with provided query string appended
     * @param url
     * @param queryString
     */
    static appendQueryString(url, queryString) {
        if (!queryString) {
            return url;
        }
        return url.indexOf("?") < 0
            ? `${url}?${queryString}`
            : `${url}&${queryString}`;
    }
    /**
     * Returns a url with the hash removed
     * @param url
     */
    static removeHashFromUrl(url) {
        return UrlString.canonicalizeUri(url.split("#")[0]);
    }
    /**
     * Given a url like https://a:b/common/d?e=f#g, and a tenantId, returns https://a:b/tenantId/d
     * @param href The url
     * @param tenantId The tenant id to replace
     */
    replaceTenantPath(tenantId) {
        const urlObject = this.getUrlComponents();
        const pathArray = urlObject.PathSegments;
        if (tenantId &&
            pathArray.length !== 0 &&
            (pathArray[0] === AADAuthorityConstants.COMMON ||
                pathArray[0] === AADAuthorityConstants.ORGANIZATIONS)) {
            pathArray[0] = tenantId;
        }
        return UrlString.constructAuthorityUriFromObject(urlObject);
    }
    /**
     * Parses out the components from a url string.
     * @returns An object with the various components. Please cache this value insted of calling this multiple times on the same url.
     */
    getUrlComponents() {
        // https://gist.github.com/curtisz/11139b2cfcaef4a261e0
        const regEx = RegExp("^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?");
        // If url string does not match regEx, we throw an error
        const match = this.urlString.match(regEx);
        if (!match) {
            throw createClientConfigurationError(urlParseError);
        }
        // Url component object
        const urlComponents = {
            Protocol: match[1],
            HostNameAndPort: match[4],
            AbsolutePath: match[5],
            QueryString: match[7],
        };
        let pathSegments = urlComponents.AbsolutePath.split("/");
        pathSegments = pathSegments.filter((val) => val && val.length > 0); // remove empty elements
        urlComponents.PathSegments = pathSegments;
        if (urlComponents.QueryString &&
            urlComponents.QueryString.endsWith("/")) {
            urlComponents.QueryString = urlComponents.QueryString.substring(0, urlComponents.QueryString.length - 1);
        }
        return urlComponents;
    }
    static getDomainFromUrl(url) {
        const regEx = RegExp("^([^:/?#]+://)?([^/?#]*)");
        const match = url.match(regEx);
        if (!match) {
            throw createClientConfigurationError(urlParseError);
        }
        return match[2];
    }
    static getAbsoluteUrl(relativeUrl, baseUrl) {
        if (relativeUrl[0] === Constants.FORWARD_SLASH) {
            const url = new UrlString(baseUrl);
            const baseComponents = url.getUrlComponents();
            return (baseComponents.Protocol +
                "//" +
                baseComponents.HostNameAndPort +
                relativeUrl);
        }
        return relativeUrl;
    }
    static constructAuthorityUriFromObject(urlObject) {
        return new UrlString(urlObject.Protocol +
            "//" +
            urlObject.HostNameAndPort +
            "/" +
            urlObject.PathSegments.join("/"));
    }
    /**
     * Check if the hash of the URL string contains known properties
     * @deprecated This API will be removed in a future version
     */
    static hashContainsKnownProperties(response) {
        return !!getDeserializedResponse(response);
    }
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const rawMetdataJSON = {
    endpointMetadata: {
        "login.microsoftonline.com": {
            token_endpoint: "https://login.microsoftonline.com/{tenantid}/oauth2/v2.0/token",
            jwks_uri: "https://login.microsoftonline.com/{tenantid}/discovery/v2.0/keys",
            issuer: "https://login.microsoftonline.com/{tenantid}/v2.0",
            authorization_endpoint: "https://login.microsoftonline.com/{tenantid}/oauth2/v2.0/authorize",
            end_session_endpoint: "https://login.microsoftonline.com/{tenantid}/oauth2/v2.0/logout",
        },
        "login.chinacloudapi.cn": {
            token_endpoint: "https://login.chinacloudapi.cn/{tenantid}/oauth2/v2.0/token",
            jwks_uri: "https://login.chinacloudapi.cn/{tenantid}/discovery/v2.0/keys",
            issuer: "https://login.partner.microsoftonline.cn/{tenantid}/v2.0",
            authorization_endpoint: "https://login.chinacloudapi.cn/{tenantid}/oauth2/v2.0/authorize",
            end_session_endpoint: "https://login.chinacloudapi.cn/{tenantid}/oauth2/v2.0/logout",
        },
        "login.microsoftonline.us": {
            token_endpoint: "https://login.microsoftonline.us/{tenantid}/oauth2/v2.0/token",
            jwks_uri: "https://login.microsoftonline.us/{tenantid}/discovery/v2.0/keys",
            issuer: "https://login.microsoftonline.us/{tenantid}/v2.0",
            authorization_endpoint: "https://login.microsoftonline.us/{tenantid}/oauth2/v2.0/authorize",
            end_session_endpoint: "https://login.microsoftonline.us/{tenantid}/oauth2/v2.0/logout",
        },
    },
    instanceDiscoveryMetadata: {
        metadata: [
            {
                preferred_network: "login.microsoftonline.com",
                preferred_cache: "login.windows.net",
                aliases: [
                    "login.microsoftonline.com",
                    "login.windows.net",
                    "login.microsoft.com",
                    "sts.windows.net",
                ],
            },
            {
                preferred_network: "login.partner.microsoftonline.cn",
                preferred_cache: "login.partner.microsoftonline.cn",
                aliases: [
                    "login.partner.microsoftonline.cn",
                    "login.chinacloudapi.cn",
                ],
            },
            {
                preferred_network: "login.microsoftonline.de",
                preferred_cache: "login.microsoftonline.de",
                aliases: ["login.microsoftonline.de"],
            },
            {
                preferred_network: "login.microsoftonline.us",
                preferred_cache: "login.microsoftonline.us",
                aliases: [
                    "login.microsoftonline.us",
                    "login.usgovcloudapi.net",
                ],
            },
            {
                preferred_network: "login-us.microsoftonline.com",
                preferred_cache: "login-us.microsoftonline.com",
                aliases: ["login-us.microsoftonline.com"],
            },
        ],
    },
};
const EndpointMetadata = rawMetdataJSON.endpointMetadata;
const InstanceDiscoveryMetadata = rawMetdataJSON.instanceDiscoveryMetadata;
const InstanceDiscoveryMetadataAliases = new Set();
InstanceDiscoveryMetadata.metadata.forEach((metadataEntry) => {
    metadataEntry.aliases.forEach((alias) => {
        InstanceDiscoveryMetadataAliases.add(alias);
    });
});
/**
 * Attempts to get an aliases array from the static authority metadata sources based on the canonical authority host
 * @param staticAuthorityOptions
 * @param logger
 * @returns
 */
function getAliasesFromStaticSources(staticAuthorityOptions, logger) {
    let staticAliases;
    const canonicalAuthority = staticAuthorityOptions.canonicalAuthority;
    if (canonicalAuthority) {
        const authorityHost = new UrlString(canonicalAuthority).getUrlComponents().HostNameAndPort;
        staticAliases =
            getAliasesFromMetadata(authorityHost, staticAuthorityOptions.cloudDiscoveryMetadata?.metadata, AuthorityMetadataSource.CONFIG, logger) ||
                getAliasesFromMetadata(authorityHost, InstanceDiscoveryMetadata.metadata, AuthorityMetadataSource.HARDCODED_VALUES, logger) ||
                staticAuthorityOptions.knownAuthorities;
    }
    return staticAliases || [];
}
/**
 * Returns aliases for from the raw cloud discovery metadata passed in
 * @param authorityHost
 * @param rawCloudDiscoveryMetadata
 * @returns
 */
function getAliasesFromMetadata(authorityHost, cloudDiscoveryMetadata, source, logger) {
    logger?.trace(`getAliasesFromMetadata called with source: ${source}`);
    if (authorityHost && cloudDiscoveryMetadata) {
        const metadata = getCloudDiscoveryMetadataFromNetworkResponse(cloudDiscoveryMetadata, authorityHost);
        if (metadata) {
            logger?.trace(`getAliasesFromMetadata: found cloud discovery metadata in ${source}, returning aliases`);
            return metadata.aliases;
        }
        else {
            logger?.trace(`getAliasesFromMetadata: did not find cloud discovery metadata in ${source}`);
        }
    }
    return null;
}
/**
 * Get cloud discovery metadata for common authorities
 */
function getCloudDiscoveryMetadataFromHardcodedValues(authorityHost) {
    const metadata = getCloudDiscoveryMetadataFromNetworkResponse(InstanceDiscoveryMetadata.metadata, authorityHost);
    return metadata;
}
/**
 * Searches instance discovery network response for the entry that contains the host in the aliases list
 * @param response
 * @param authority
 */
function getCloudDiscoveryMetadataFromNetworkResponse(response, authorityHost) {
    for (let i = 0; i < response.length; i++) {
        const metadata = response[i];
        if (metadata.aliases.includes(authorityHost)) {
            return metadata;
        }
    }
    return null;
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Protocol modes supported by MSAL.
 */
const ProtocolMode = {
    /**
     * Auth Code + PKCE with Entra ID (formerly AAD) specific optimizations and features
     */
    AAD: "AAD",
    /**
     * Auth Code + PKCE without Entra ID specific optimizations and features. For use only with non-Microsoft owned authorities.
     * Support is limited for this mode.
     */
    OIDC: "OIDC",
    /**
     * Encrypted Authorize Response (EAR) with Entra ID specific optimizations and features
     */
    EAR: "EAR",
};

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const AzureCloudInstance = {
    // AzureCloudInstance is not specified.
    None: "none",
    // Microsoft Azure public cloud
    AzurePublic: "https://login.microsoftonline.com",
    // Microsoft PPE
    AzurePpe: "https://login.windows-ppe.net",
    // Microsoft Chinese national/regional cloud
    AzureChina: "https://login.chinacloudapi.cn",
    // Microsoft German national/regional cloud ("Black Forest")
    AzureGermany: "https://login.microsoftonline.de",
    // US Government cloud
    AzureUsGovernment: "https://login.microsoftonline.us",
};

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
function isCloudInstanceDiscoveryResponse(response) {
    return (response.hasOwnProperty("tenant_discovery_endpoint") &&
        response.hasOwnProperty("metadata"));
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
function isCloudInstanceDiscoveryErrorResponse(response) {
    return (response.hasOwnProperty("error") &&
        response.hasOwnProperty("error_description"));
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Enumeration of operations that are instrumented by have their performance measured by the PerformanceClient.
 *
 * @export
 * @enum {number}
 */
const PerformanceEvents = {
    /**
     * acquireTokenByCode API (msal-browser and msal-node).
     * Used to acquire tokens by trading an authorization code against the token endpoint.
     */
    AcquireTokenByCode: "acquireTokenByCode",
    /**
     * acquireTokenByRefreshToken API (msal-browser and msal-node).
     * Used to renew an access token using a refresh token against the token endpoint.
     */
    AcquireTokenByRefreshToken: "acquireTokenByRefreshToken",
    /**
     * acquireTokenSilent API (msal-browser and msal-node).
     * Used to silently acquire a new access token (from the cache or the network).
     */
    AcquireTokenSilent: "acquireTokenSilent",
    /**
     * acquireTokenSilentAsync (msal-browser).
     * Internal API for acquireTokenSilent.
     */
    AcquireTokenSilentAsync: "acquireTokenSilentAsync",
    /**
     * acquireTokenPopup (msal-browser).
     * Used to acquire a new access token interactively through pop ups
     */
    AcquireTokenPopup: "acquireTokenPopup",
    /**
     * acquireTokenPreRedirect (msal-browser).
     * First part of the redirect flow.
     * Used to acquire a new access token interactively through redirects.
     */
    AcquireTokenPreRedirect: "acquireTokenPreRedirect",
    /**
     * acquireTokenRedirect (msal-browser).
     * Second part of the redirect flow.
     * Used to acquire a new access token interactively through redirects.
     */
    AcquireTokenRedirect: "acquireTokenRedirect",
    /**
     * getPublicKeyThumbprint API in CryptoOpts class (msal-browser).
     * Used to generate a public/private keypair and generate a public key thumbprint for pop requests.
     */
    CryptoOptsGetPublicKeyThumbprint: "cryptoOptsGetPublicKeyThumbprint",
    /**
     * signJwt API in CryptoOpts class (msal-browser).
     * Used to signed a pop token.
     */
    CryptoOptsSignJwt: "cryptoOptsSignJwt",
    /**
     * acquireToken API in the SilentCacheClient class (msal-browser).
     * Used to read access tokens from the cache.
     */
    SilentCacheClientAcquireToken: "silentCacheClientAcquireToken",
    /**
     * acquireToken API in the SilentIframeClient class (msal-browser).
     * Used to acquire a new set of tokens from the authorize endpoint in a hidden iframe.
     */
    SilentIframeClientAcquireToken: "silentIframeClientAcquireToken",
    AwaitConcurrentIframe: "awaitConcurrentIframe",
    /**
     * acquireToken API in SilentRereshClient (msal-browser).
     * Used to acquire a new set of tokens from the token endpoint using a refresh token.
     */
    SilentRefreshClientAcquireToken: "silentRefreshClientAcquireToken",
    /**
     * ssoSilent API (msal-browser).
     * Used to silently acquire an authorization code and set of tokens using a hidden iframe.
     */
    SsoSilent: "ssoSilent",
    /**
     * getDiscoveredAuthority API in StandardInteractionClient class (msal-browser).
     * Used to load authority metadata for a request.
     */
    StandardInteractionClientGetDiscoveredAuthority: "standardInteractionClientGetDiscoveredAuthority",
    /**
     * acquireToken APIs in msal-browser.
     * Used to make an /authorize endpoint call with native brokering enabled.
     */
    FetchAccountIdWithNativeBroker: "fetchAccountIdWithNativeBroker",
    /**
     * acquireToken API in NativeInteractionClient class (msal-browser).
     * Used to acquire a token from Native component when native brokering is enabled.
     */
    NativeInteractionClientAcquireToken: "nativeInteractionClientAcquireToken",
    /**
     * Time spent creating default headers for requests to token endpoint
     */
    BaseClientCreateTokenRequestHeaders: "baseClientCreateTokenRequestHeaders",
    /**
     * Time spent sending/waiting for the response of a request to the token endpoint
     */
    NetworkClientSendPostRequestAsync: "networkClientSendPostRequestAsync",
    RefreshTokenClientExecutePostToTokenEndpoint: "refreshTokenClientExecutePostToTokenEndpoint",
    AuthorizationCodeClientExecutePostToTokenEndpoint: "authorizationCodeClientExecutePostToTokenEndpoint",
    /**
     * Used to measure the time taken for completing embedded-broker handshake (PW-Broker).
     */
    BrokerHandhshake: "brokerHandshake",
    /**
     * acquireTokenByRefreshToken API in BrokerClientApplication (PW-Broker) .
     */
    AcquireTokenByRefreshTokenInBroker: "acquireTokenByRefreshTokenInBroker",
    /**
     * Time taken for token acquisition by broker
     */
    AcquireTokenByBroker: "acquireTokenByBroker",
    /**
     * Time spent on the network for refresh token acquisition
     */
    RefreshTokenClientExecuteTokenRequest: "refreshTokenClientExecuteTokenRequest",
    /**
     * Time taken for acquiring refresh token , records RT size
     */
    RefreshTokenClientAcquireToken: "refreshTokenClientAcquireToken",
    /**
     * Time taken for acquiring cached refresh token
     */
    RefreshTokenClientAcquireTokenWithCachedRefreshToken: "refreshTokenClientAcquireTokenWithCachedRefreshToken",
    /**
     * acquireTokenByRefreshToken API in RefreshTokenClient (msal-common).
     */
    RefreshTokenClientAcquireTokenByRefreshToken: "refreshTokenClientAcquireTokenByRefreshToken",
    /**
     * Helper function to create token request body in RefreshTokenClient (msal-common).
     */
    RefreshTokenClientCreateTokenRequestBody: "refreshTokenClientCreateTokenRequestBody",
    /**
     * acquireTokenFromCache (msal-browser).
     * Internal API for acquiring token from cache
     */
    AcquireTokenFromCache: "acquireTokenFromCache",
    SilentFlowClientAcquireCachedToken: "silentFlowClientAcquireCachedToken",
    SilentFlowClientGenerateResultFromCacheRecord: "silentFlowClientGenerateResultFromCacheRecord",
    /**
     * acquireTokenBySilentIframe (msal-browser).
     * Internal API for acquiring token by silent Iframe
     */
    AcquireTokenBySilentIframe: "acquireTokenBySilentIframe",
    /**
     * Internal API for initializing base request in BaseInteractionClient (msal-browser)
     */
    InitializeBaseRequest: "initializeBaseRequest",
    /**
     * Internal API for initializing silent request in SilentCacheClient (msal-browser)
     */
    InitializeSilentRequest: "initializeSilentRequest",
    InitializeClientApplication: "initializeClientApplication",
    InitializeCache: "initializeCache",
    /**
     * Helper function in SilentIframeClient class (msal-browser).
     */
    SilentIframeClientTokenHelper: "silentIframeClientTokenHelper",
    /**
     * SilentHandler
     */
    SilentHandlerInitiateAuthRequest: "silentHandlerInitiateAuthRequest",
    SilentHandlerMonitorIframeForHash: "silentHandlerMonitorIframeForHash",
    SilentHandlerLoadFrame: "silentHandlerLoadFrame",
    SilentHandlerLoadFrameSync: "silentHandlerLoadFrameSync",
    /**
     * Helper functions in StandardInteractionClient class (msal-browser)
     */
    StandardInteractionClientCreateAuthCodeClient: "standardInteractionClientCreateAuthCodeClient",
    StandardInteractionClientGetClientConfiguration: "standardInteractionClientGetClientConfiguration",
    StandardInteractionClientInitializeAuthorizationRequest: "standardInteractionClientInitializeAuthorizationRequest",
    /**
     * getAuthCodeUrl API (msal-browser and msal-node).
     */
    GetAuthCodeUrl: "getAuthCodeUrl",
    GetStandardParams: "getStandardParams",
    /**
     * Functions from InteractionHandler (msal-browser)
     */
    HandleCodeResponseFromServer: "handleCodeResponseFromServer",
    HandleCodeResponse: "handleCodeResponse",
    HandleResponseEar: "handleResponseEar",
    HandleResponsePlatformBroker: "handleResponsePlatformBroker",
    HandleResponseCode: "handleResponseCode",
    UpdateTokenEndpointAuthority: "updateTokenEndpointAuthority",
    /**
     * APIs in Authorization Code Client (msal-common)
     */
    AuthClientAcquireToken: "authClientAcquireToken",
    AuthClientExecuteTokenRequest: "authClientExecuteTokenRequest",
    AuthClientCreateTokenRequestBody: "authClientCreateTokenRequestBody",
    /**
     * Generate functions in PopTokenGenerator (msal-common)
     */
    PopTokenGenerateCnf: "popTokenGenerateCnf",
    PopTokenGenerateKid: "popTokenGenerateKid",
    /**
     * handleServerTokenResponse API in ResponseHandler (msal-common)
     */
    HandleServerTokenResponse: "handleServerTokenResponse",
    DeserializeResponse: "deserializeResponse",
    /**
     * Authority functions
     */
    AuthorityFactoryCreateDiscoveredInstance: "authorityFactoryCreateDiscoveredInstance",
    AuthorityResolveEndpointsAsync: "authorityResolveEndpointsAsync",
    AuthorityResolveEndpointsFromLocalSources: "authorityResolveEndpointsFromLocalSources",
    AuthorityGetCloudDiscoveryMetadataFromNetwork: "authorityGetCloudDiscoveryMetadataFromNetwork",
    AuthorityUpdateCloudDiscoveryMetadata: "authorityUpdateCloudDiscoveryMetadata",
    AuthorityGetEndpointMetadataFromNetwork: "authorityGetEndpointMetadataFromNetwork",
    AuthorityUpdateEndpointMetadata: "authorityUpdateEndpointMetadata",
    AuthorityUpdateMetadataWithRegionalInformation: "authorityUpdateMetadataWithRegionalInformation",
    /**
     * Region Discovery functions
     */
    RegionDiscoveryDetectRegion: "regionDiscoveryDetectRegion",
    RegionDiscoveryGetRegionFromIMDS: "regionDiscoveryGetRegionFromIMDS",
    RegionDiscoveryGetCurrentVersion: "regionDiscoveryGetCurrentVersion",
    AcquireTokenByCodeAsync: "acquireTokenByCodeAsync",
    GetEndpointMetadataFromNetwork: "getEndpointMetadataFromNetwork",
    GetCloudDiscoveryMetadataFromNetworkMeasurement: "getCloudDiscoveryMetadataFromNetworkMeasurement",
    HandleRedirectPromiseMeasurement: "handleRedirectPromise",
    HandleNativeRedirectPromiseMeasurement: "handleNativeRedirectPromise",
    UpdateCloudDiscoveryMetadataMeasurement: "updateCloudDiscoveryMetadataMeasurement",
    UsernamePasswordClientAcquireToken: "usernamePasswordClientAcquireToken",
    NativeMessageHandlerHandshake: "nativeMessageHandlerHandshake",
    NativeGenerateAuthResult: "nativeGenerateAuthResult",
    RemoveHiddenIframe: "removeHiddenIframe",
    /**
     * Cache operations
     */
    ClearTokensAndKeysWithClaims: "clearTokensAndKeysWithClaims",
    CacheManagerGetRefreshToken: "cacheManagerGetRefreshToken",
    ImportExistingCache: "importExistingCache",
    SetUserData: "setUserData",
    LocalStorageUpdated: "localStorageUpdated",
    /**
     * Crypto Operations
     */
    GeneratePkceCodes: "generatePkceCodes",
    GenerateCodeVerifier: "generateCodeVerifier",
    GenerateCodeChallengeFromVerifier: "generateCodeChallengeFromVerifier",
    Sha256Digest: "sha256Digest",
    GetRandomValues: "getRandomValues",
    GenerateHKDF: "generateHKDF",
    GenerateBaseKey: "generateBaseKey",
    Base64Decode: "base64Decode",
    UrlEncodeArr: "urlEncodeArr",
    Encrypt: "encrypt",
    Decrypt: "decrypt",
    GenerateEarKey: "generateEarKey",
    DecryptEarResponse: "decryptEarResponse",
};
const PerformanceEventAbbreviations = new Map([
    [PerformanceEvents.AcquireTokenByCode, "ATByCode"],
    [PerformanceEvents.AcquireTokenByRefreshToken, "ATByRT"],
    [PerformanceEvents.AcquireTokenSilent, "ATS"],
    [PerformanceEvents.AcquireTokenSilentAsync, "ATSAsync"],
    [PerformanceEvents.AcquireTokenPopup, "ATPopup"],
    [PerformanceEvents.AcquireTokenRedirect, "ATRedirect"],
    [
        PerformanceEvents.CryptoOptsGetPublicKeyThumbprint,
        "CryptoGetPKThumb",
    ],
    [PerformanceEvents.CryptoOptsSignJwt, "CryptoSignJwt"],
    [PerformanceEvents.SilentCacheClientAcquireToken, "SltCacheClientAT"],
    [PerformanceEvents.SilentIframeClientAcquireToken, "SltIframeClientAT"],
    [PerformanceEvents.SilentRefreshClientAcquireToken, "SltRClientAT"],
    [PerformanceEvents.SsoSilent, "SsoSlt"],
    [
        PerformanceEvents.StandardInteractionClientGetDiscoveredAuthority,
        "StdIntClientGetDiscAuth",
    ],
    [
        PerformanceEvents.FetchAccountIdWithNativeBroker,
        "FetchAccIdWithNtvBroker",
    ],
    [
        PerformanceEvents.NativeInteractionClientAcquireToken,
        "NtvIntClientAT",
    ],
    [
        PerformanceEvents.BaseClientCreateTokenRequestHeaders,
        "BaseClientCreateTReqHead",
    ],
    [
        PerformanceEvents.NetworkClientSendPostRequestAsync,
        "NetClientSendPost",
    ],
    [
        PerformanceEvents.RefreshTokenClientExecutePostToTokenEndpoint,
        "RTClientExecPost",
    ],
    [
        PerformanceEvents.AuthorizationCodeClientExecutePostToTokenEndpoint,
        "AuthCodeClientExecPost",
    ],
    [PerformanceEvents.BrokerHandhshake, "BrokerHandshake"],
    [
        PerformanceEvents.AcquireTokenByRefreshTokenInBroker,
        "ATByRTInBroker",
    ],
    [PerformanceEvents.AcquireTokenByBroker, "ATByBroker"],
    [
        PerformanceEvents.RefreshTokenClientExecuteTokenRequest,
        "RTClientExecTReq",
    ],
    [PerformanceEvents.RefreshTokenClientAcquireToken, "RTClientAT"],
    [
        PerformanceEvents.RefreshTokenClientAcquireTokenWithCachedRefreshToken,
        "RTClientATWithCachedRT",
    ],
    [
        PerformanceEvents.RefreshTokenClientAcquireTokenByRefreshToken,
        "RTClientATByRT",
    ],
    [
        PerformanceEvents.RefreshTokenClientCreateTokenRequestBody,
        "RTClientCreateTReqBody",
    ],
    [PerformanceEvents.AcquireTokenFromCache, "ATFromCache"],
    [
        PerformanceEvents.SilentFlowClientAcquireCachedToken,
        "SltFlowClientATCached",
    ],
    [
        PerformanceEvents.SilentFlowClientGenerateResultFromCacheRecord,
        "SltFlowClientGenResFromCache",
    ],
    [PerformanceEvents.AcquireTokenBySilentIframe, "ATBySltIframe"],
    [PerformanceEvents.InitializeBaseRequest, "InitBaseReq"],
    [PerformanceEvents.InitializeSilentRequest, "InitSltReq"],
    [
        PerformanceEvents.InitializeClientApplication,
        "InitClientApplication",
    ],
    [PerformanceEvents.InitializeCache, "InitCache"],
    [PerformanceEvents.ImportExistingCache, "importCache"],
    [PerformanceEvents.SetUserData, "setUserData"],
    [PerformanceEvents.LocalStorageUpdated, "localStorageUpdated"],
    [PerformanceEvents.SilentIframeClientTokenHelper, "SIClientTHelper"],
    [
        PerformanceEvents.SilentHandlerInitiateAuthRequest,
        "SHandlerInitAuthReq",
    ],
    [
        PerformanceEvents.SilentHandlerMonitorIframeForHash,
        "SltHandlerMonitorIframeForHash",
    ],
    [PerformanceEvents.SilentHandlerLoadFrame, "SHandlerLoadFrame"],
    [PerformanceEvents.SilentHandlerLoadFrameSync, "SHandlerLoadFrameSync"],
    [
        PerformanceEvents.StandardInteractionClientCreateAuthCodeClient,
        "StdIntClientCreateAuthCodeClient",
    ],
    [
        PerformanceEvents.StandardInteractionClientGetClientConfiguration,
        "StdIntClientGetClientConf",
    ],
    [
        PerformanceEvents.StandardInteractionClientInitializeAuthorizationRequest,
        "StdIntClientInitAuthReq",
    ],
    [PerformanceEvents.GetAuthCodeUrl, "GetAuthCodeUrl"],
    [
        PerformanceEvents.HandleCodeResponseFromServer,
        "HandleCodeResFromServer",
    ],
    [PerformanceEvents.HandleCodeResponse, "HandleCodeResp"],
    [PerformanceEvents.HandleResponseEar, "HandleRespEar"],
    [PerformanceEvents.HandleResponseCode, "HandleRespCode"],
    [
        PerformanceEvents.HandleResponsePlatformBroker,
        "HandleRespPlatBroker",
    ],
    [PerformanceEvents.UpdateTokenEndpointAuthority, "UpdTEndpointAuth"],
    [PerformanceEvents.AuthClientAcquireToken, "AuthClientAT"],
    [PerformanceEvents.AuthClientExecuteTokenRequest, "AuthClientExecTReq"],
    [
        PerformanceEvents.AuthClientCreateTokenRequestBody,
        "AuthClientCreateTReqBody",
    ],
    [PerformanceEvents.PopTokenGenerateCnf, "PopTGenCnf"],
    [PerformanceEvents.PopTokenGenerateKid, "PopTGenKid"],
    [PerformanceEvents.HandleServerTokenResponse, "HandleServerTRes"],
    [PerformanceEvents.DeserializeResponse, "DeserializeRes"],
    [
        PerformanceEvents.AuthorityFactoryCreateDiscoveredInstance,
        "AuthFactCreateDiscInst",
    ],
    [
        PerformanceEvents.AuthorityResolveEndpointsAsync,
        "AuthResolveEndpointsAsync",
    ],
    [
        PerformanceEvents.AuthorityResolveEndpointsFromLocalSources,
        "AuthResolveEndpointsFromLocal",
    ],
    [
        PerformanceEvents.AuthorityGetCloudDiscoveryMetadataFromNetwork,
        "AuthGetCDMetaFromNet",
    ],
    [
        PerformanceEvents.AuthorityUpdateCloudDiscoveryMetadata,
        "AuthUpdCDMeta",
    ],
    [
        PerformanceEvents.AuthorityGetEndpointMetadataFromNetwork,
        "AuthUpdCDMetaFromNet",
    ],
    [
        PerformanceEvents.AuthorityUpdateEndpointMetadata,
        "AuthUpdEndpointMeta",
    ],
    [
        PerformanceEvents.AuthorityUpdateMetadataWithRegionalInformation,
        "AuthUpdMetaWithRegInfo",
    ],
    [PerformanceEvents.RegionDiscoveryDetectRegion, "RegDiscDetectReg"],
    [
        PerformanceEvents.RegionDiscoveryGetRegionFromIMDS,
        "RegDiscGetRegFromIMDS",
    ],
    [
        PerformanceEvents.RegionDiscoveryGetCurrentVersion,
        "RegDiscGetCurrentVer",
    ],
    [PerformanceEvents.AcquireTokenByCodeAsync, "ATByCodeAsync"],
    [
        PerformanceEvents.GetEndpointMetadataFromNetwork,
        "GetEndpointMetaFromNet",
    ],
    [
        PerformanceEvents.GetCloudDiscoveryMetadataFromNetworkMeasurement,
        "GetCDMetaFromNet",
    ],
    [
        PerformanceEvents.HandleRedirectPromiseMeasurement,
        "HandleRedirectPromise",
    ],
    [
        PerformanceEvents.HandleNativeRedirectPromiseMeasurement,
        "HandleNtvRedirectPromise",
    ],
    [
        PerformanceEvents.UpdateCloudDiscoveryMetadataMeasurement,
        "UpdateCDMeta",
    ],
    [
        PerformanceEvents.UsernamePasswordClientAcquireToken,
        "UserPassClientAT",
    ],
    [
        PerformanceEvents.NativeMessageHandlerHandshake,
        "NtvMsgHandlerHandshake",
    ],
    [PerformanceEvents.NativeGenerateAuthResult, "NtvGenAuthRes"],
    [PerformanceEvents.RemoveHiddenIframe, "RemoveHiddenIframe"],
    [
        PerformanceEvents.ClearTokensAndKeysWithClaims,
        "ClearTAndKeysWithClaims",
    ],
    [PerformanceEvents.CacheManagerGetRefreshToken, "CacheManagerGetRT"],
    [PerformanceEvents.GeneratePkceCodes, "GenPkceCodes"],
    [PerformanceEvents.GenerateCodeVerifier, "GenCodeVerifier"],
    [
        PerformanceEvents.GenerateCodeChallengeFromVerifier,
        "GenCodeChallengeFromVerifier",
    ],
    [PerformanceEvents.Sha256Digest, "Sha256Digest"],
    [PerformanceEvents.GetRandomValues, "GetRandomValues"],
    [PerformanceEvents.GenerateHKDF, "genHKDF"],
    [PerformanceEvents.GenerateBaseKey, "genBaseKey"],
    [PerformanceEvents.Base64Decode, "b64Decode"],
    [PerformanceEvents.UrlEncodeArr, "urlEncArr"],
    [PerformanceEvents.Encrypt, "encrypt"],
    [PerformanceEvents.Decrypt, "decrypt"],
    [PerformanceEvents.GenerateEarKey, "genEarKey"],
    [PerformanceEvents.DecryptEarResponse, "decryptEarResp"],
]);
/**
 * State of the performance event.
 *
 * @export
 * @enum {number}
 */
const PerformanceEventStatus = {
    NotStarted: 0,
    InProgress: 1,
    Completed: 2,
};
const IntFields = new Set([
    "accessTokenSize",
    "durationMs",
    "idTokenSize",
    "matsSilentStatus",
    "matsHttpStatus",
    "refreshTokenSize",
    "queuedTimeMs",
    "startTimeMs",
    "status",
    "multiMatchedAT",
    "multiMatchedID",
    "multiMatchedRT",
    "unencryptedCacheCount",
    "encryptedCacheExpiredCount",
    "oldAccountCount",
    "oldAccessCount",
    "oldIdCount",
    "oldRefreshCount",
    "currAccountCount",
    "currAccessCount",
    "currIdCount",
    "currRefreshCount",
    "expiredCacheRemovedCount",
    "upgradedCacheCount",
]);

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Wraps a function with a performance measurement.
 * Usage: invoke(functionToCall, performanceClient, "EventName", "correlationId")(...argsToPassToFunction)
 * @param callback
 * @param eventName
 * @param logger
 * @param telemetryClient
 * @param correlationId
 * @returns
 * @internal
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const invoke = (callback, eventName, logger, telemetryClient, correlationId) => {
    return (...args) => {
        logger.trace(`Executing function ${eventName}`);
        const inProgressEvent = telemetryClient?.startMeasurement(eventName, correlationId);
        if (correlationId) {
            // Track number of times this API is called in a single request
            const eventCount = eventName + "CallCount";
            telemetryClient?.incrementFields({ [eventCount]: 1 }, correlationId);
        }
        try {
            const result = callback(...args);
            inProgressEvent?.end({
                success: true,
            });
            logger.trace(`Returning result from ${eventName}`);
            return result;
        }
        catch (e) {
            logger.trace(`Error occurred in ${eventName}`);
            try {
                logger.trace(JSON.stringify(e));
            }
            catch (e) {
                logger.trace("Unable to print error message.");
            }
            inProgressEvent?.end({
                success: false,
            }, e);
            throw e;
        }
    };
};
/**
 * Wraps an async function with a performance measurement.
 * Usage: invokeAsync(functionToCall, performanceClient, "EventName", "correlationId")(...argsToPassToFunction)
 * @param callback
 * @param eventName
 * @param logger
 * @param telemetryClient
 * @param correlationId
 * @returns
 * @internal
 *
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const invokeAsync = (callback, eventName, logger, telemetryClient, correlationId) => {
    return (...args) => {
        logger.trace(`Executing function ${eventName}`);
        const inProgressEvent = telemetryClient?.startMeasurement(eventName, correlationId);
        if (correlationId) {
            // Track number of times this API is called in a single request
            const eventCount = eventName + "CallCount";
            telemetryClient?.incrementFields({ [eventCount]: 1 }, correlationId);
        }
        telemetryClient?.setPreQueueTime(eventName, correlationId);
        return callback(...args)
            .then((response) => {
            logger.trace(`Returning result from ${eventName}`);
            inProgressEvent?.end({
                success: true,
            });
            return response;
        })
            .catch((e) => {
            logger.trace(`Error occurred in ${eventName}`);
            try {
                logger.trace(JSON.stringify(e));
            }
            catch (e) {
                logger.trace("Unable to print error message.");
            }
            inProgressEvent?.end({
                success: false,
            }, e);
            throw e;
        });
    };
};

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
class RegionDiscovery {
    constructor(networkInterface, logger, performanceClient, correlationId) {
        this.networkInterface = networkInterface;
        this.logger = logger;
        this.performanceClient = performanceClient;
        this.correlationId = correlationId;
    }
    /**
     * Detect the region from the application's environment.
     *
     * @returns Promise<string | null>
     */
    async detectRegion(environmentRegion, regionDiscoveryMetadata) {
        this.performanceClient?.addQueueMeasurement(PerformanceEvents.RegionDiscoveryDetectRegion, this.correlationId);
        // Initialize auto detected region with the region from the envrionment
        let autodetectedRegionName = environmentRegion;
        // Check if a region was detected from the environment, if not, attempt to get the region from IMDS
        if (!autodetectedRegionName) {
            const options = RegionDiscovery.IMDS_OPTIONS;
            try {
                const localIMDSVersionResponse = await invokeAsync(this.getRegionFromIMDS.bind(this), PerformanceEvents.RegionDiscoveryGetRegionFromIMDS, this.logger, this.performanceClient, this.correlationId)(Constants.IMDS_VERSION, options);
                if (localIMDSVersionResponse.status === HttpStatus.SUCCESS) {
                    autodetectedRegionName = localIMDSVersionResponse.body;
                    regionDiscoveryMetadata.region_source =
                        RegionDiscoverySources.IMDS;
                }
                // If the response using the local IMDS version failed, try to fetch the current version of IMDS and retry.
                if (localIMDSVersionResponse.status === HttpStatus.BAD_REQUEST) {
                    const currentIMDSVersion = await invokeAsync(this.getCurrentVersion.bind(this), PerformanceEvents.RegionDiscoveryGetCurrentVersion, this.logger, this.performanceClient, this.correlationId)(options);
                    if (!currentIMDSVersion) {
                        regionDiscoveryMetadata.region_source =
                            RegionDiscoverySources.FAILED_AUTO_DETECTION;
                        return null;
                    }
                    const currentIMDSVersionResponse = await invokeAsync(this.getRegionFromIMDS.bind(this), PerformanceEvents.RegionDiscoveryGetRegionFromIMDS, this.logger, this.performanceClient, this.correlationId)(currentIMDSVersion, options);
                    if (currentIMDSVersionResponse.status === HttpStatus.SUCCESS) {
                        autodetectedRegionName =
                            currentIMDSVersionResponse.body;
                        regionDiscoveryMetadata.region_source =
                            RegionDiscoverySources.IMDS;
                    }
                }
            }
            catch (e) {
                regionDiscoveryMetadata.region_source =
                    RegionDiscoverySources.FAILED_AUTO_DETECTION;
                return null;
            }
        }
        else {
            regionDiscoveryMetadata.region_source =
                RegionDiscoverySources.ENVIRONMENT_VARIABLE;
        }
        // If no region was auto detected from the environment or from the IMDS endpoint, mark the attempt as a FAILED_AUTO_DETECTION
        if (!autodetectedRegionName) {
            regionDiscoveryMetadata.region_source =
                RegionDiscoverySources.FAILED_AUTO_DETECTION;
        }
        return autodetectedRegionName || null;
    }
    /**
     * Make the call to the IMDS endpoint
     *
     * @param imdsEndpointUrl
     * @returns Promise<NetworkResponse<string>>
     */
    async getRegionFromIMDS(version, options) {
        this.performanceClient?.addQueueMeasurement(PerformanceEvents.RegionDiscoveryGetRegionFromIMDS, this.correlationId);
        return this.networkInterface.sendGetRequestAsync(`${Constants.IMDS_ENDPOINT}?api-version=${version}&format=text`, options, Constants.IMDS_TIMEOUT);
    }
    /**
     * Get the most recent version of the IMDS endpoint available
     *
     * @returns Promise<string | null>
     */
    async getCurrentVersion(options) {
        this.performanceClient?.addQueueMeasurement(PerformanceEvents.RegionDiscoveryGetCurrentVersion, this.correlationId);
        try {
            const response = await this.networkInterface.sendGetRequestAsync(`${Constants.IMDS_ENDPOINT}?format=json`, options);
            // When IMDS endpoint is called without the api version query param, bad request response comes back with latest version.
            if (response.status === HttpStatus.BAD_REQUEST &&
                response.body &&
                response.body["newest-versions"] &&
                response.body["newest-versions"].length > 0) {
                return response.body["newest-versions"][0];
            }
            return null;
        }
        catch (e) {
            return null;
        }
    }
}
// Options for the IMDS endpoint request
RegionDiscovery.IMDS_OPTIONS = {
    headers: {
        Metadata: "true",
    },
};

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Utility functions for managing date and time operations.
 */
/**
 * return the current time in Unix time (seconds).
 */
function nowSeconds() {
    // Date.getTime() returns in milliseconds.
    return Math.round(new Date().getTime() / 1000.0);
}
/**
 * Converts JS Date object to seconds
 * @param date Date
 */
function toSecondsFromDate(date) {
    // Convert date to seconds
    return date.getTime() / 1000;
}
/**
 * Convert seconds to JS Date object. Seconds can be in a number or string format or undefined (will still return a date).
 * @param seconds
 */
function toDateFromSeconds(seconds) {
    if (seconds) {
        return new Date(Number(seconds) * 1000);
    }
    return new Date();
}
/**
 * check if a token is expired based on given UTC time in seconds.
 * @param expiresOn
 */
function isTokenExpired(expiresOn, offset) {
    // check for access token expiry
    const expirationSec = Number(expiresOn) || 0;
    const offsetCurrentTimeSec = nowSeconds() + offset;
    // If current time + offset is greater than token expiration time, then token is expired.
    return offsetCurrentTimeSec > expirationSec;
}
/**
 * Checks if a cache entry is expired based on the last updated time and cache retention days.
 * @param lastUpdatedAt
 * @param cacheRetentionDays
 * @returns
 */
function isCacheExpired(lastUpdatedAt, cacheRetentionDays) {
    const cacheExpirationTimestamp = Number(lastUpdatedAt) + cacheRetentionDays * 24 * 60 * 60 * 1000;
    return Date.now() > cacheExpirationTimestamp;
}
/**
 * If the current time is earlier than the time that a token was cached at, we must discard the token
 * i.e. The system clock was turned back after acquiring the cached token
 * @param cachedAt
 * @param offset
 */
function wasClockTurnedBack(cachedAt) {
    const cachedAtSec = Number(cachedAt);
    return cachedAtSec > nowSeconds();
}
/**
 * Waits for t number of milliseconds
 * @param t number
 * @param value T
 */
function delay(t, value) {
    return new Promise((resolve) => setTimeout(() => resolve(value), t));
}

var TimeUtils = /*#__PURE__*/Object.freeze({
    __proto__: null,
    delay: delay,
    isCacheExpired: isCacheExpired,
    isTokenExpired: isTokenExpired,
    nowSeconds: nowSeconds,
    toDateFromSeconds: toDateFromSeconds,
    toSecondsFromDate: toSecondsFromDate,
    wasClockTurnedBack: wasClockTurnedBack
});

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Create IdTokenEntity
 * @param homeAccountId
 * @param authenticationResult
 * @param clientId
 * @param authority
 */
function createIdTokenEntity(homeAccountId, environment, idToken, clientId, tenantId) {
    const idTokenEntity = {
        credentialType: CredentialType.ID_TOKEN,
        homeAccountId: homeAccountId,
        environment: environment,
        clientId: clientId,
        secret: idToken,
        realm: tenantId,
        lastUpdatedAt: Date.now().toString(), // Set the last updated time to now
    };
    return idTokenEntity;
}
/**
 * Create AccessTokenEntity
 * @param homeAccountId
 * @param environment
 * @param accessToken
 * @param clientId
 * @param tenantId
 * @param scopes
 * @param expiresOn
 * @param extExpiresOn
 */
function createAccessTokenEntity(homeAccountId, environment, accessToken, clientId, tenantId, scopes, expiresOn, extExpiresOn, base64Decode, refreshOn, tokenType, userAssertionHash, keyId, requestedClaims, requestedClaimsHash) {
    const atEntity = {
        homeAccountId: homeAccountId,
        credentialType: CredentialType.ACCESS_TOKEN,
        secret: accessToken,
        cachedAt: nowSeconds().toString(),
        expiresOn: expiresOn.toString(),
        extendedExpiresOn: extExpiresOn.toString(),
        environment: environment,
        clientId: clientId,
        realm: tenantId,
        target: scopes,
        tokenType: tokenType || AuthenticationScheme.BEARER,
        lastUpdatedAt: Date.now().toString(), // Set the last updated time to now
    };
    if (userAssertionHash) {
        atEntity.userAssertionHash = userAssertionHash;
    }
    if (refreshOn) {
        atEntity.refreshOn = refreshOn.toString();
    }
    if (requestedClaims) {
        atEntity.requestedClaims = requestedClaims;
        atEntity.requestedClaimsHash = requestedClaimsHash;
    }
    /*
     * Create Access Token With Auth Scheme instead of regular access token
     * Cast to lower to handle "bearer" from ADFS
     */
    if (atEntity.tokenType?.toLowerCase() !==
        AuthenticationScheme.BEARER.toLowerCase()) {
        atEntity.credentialType = CredentialType.ACCESS_TOKEN_WITH_AUTH_SCHEME;
        switch (atEntity.tokenType) {
            case AuthenticationScheme.POP:
                // Make sure keyId is present and add it to credential
                const tokenClaims = extractTokenClaims(accessToken, base64Decode);
                if (!tokenClaims?.cnf?.kid) {
                    throw createClientAuthError(tokenClaimsCnfRequiredForSignedJwt);
                }
                atEntity.keyId = tokenClaims.cnf.kid;
                break;
            case AuthenticationScheme.SSH:
                atEntity.keyId = keyId;
        }
    }
    return atEntity;
}
/**
 * Create RefreshTokenEntity
 * @param homeAccountId
 * @param authenticationResult
 * @param clientId
 * @param authority
 */
function createRefreshTokenEntity(homeAccountId, environment, refreshToken, clientId, familyId, userAssertionHash, expiresOn) {
    const rtEntity = {
        credentialType: CredentialType.REFRESH_TOKEN,
        homeAccountId: homeAccountId,
        environment: environment,
        clientId: clientId,
        secret: refreshToken,
        lastUpdatedAt: Date.now().toString(),
    };
    if (userAssertionHash) {
        rtEntity.userAssertionHash = userAssertionHash;
    }
    if (familyId) {
        rtEntity.familyId = familyId;
    }
    if (expiresOn) {
        rtEntity.expiresOn = expiresOn.toString();
    }
    return rtEntity;
}
function isCredentialEntity(entity) {
    return (entity.hasOwnProperty("homeAccountId") &&
        entity.hasOwnProperty("environment") &&
        entity.hasOwnProperty("credentialType") &&
        entity.hasOwnProperty("clientId") &&
        entity.hasOwnProperty("secret"));
}
/**
 * Validates an entity: checks for all expected params
 * @param entity
 */
function isAccessTokenEntity(entity) {
    if (!entity) {
        return false;
    }
    return (isCredentialEntity(entity) &&
        entity.hasOwnProperty("realm") &&
        entity.hasOwnProperty("target") &&
        (entity["credentialType"] === CredentialType.ACCESS_TOKEN ||
            entity["credentialType"] ===
                CredentialType.ACCESS_TOKEN_WITH_AUTH_SCHEME));
}
/**
 * Validates an entity: checks for all expected params
 * @param entity
 */
function isIdTokenEntity(entity) {
    if (!entity) {
        return false;
    }
    return (isCredentialEntity(entity) &&
        entity.hasOwnProperty("realm") &&
        entity["credentialType"] === CredentialType.ID_TOKEN);
}
/**
 * Validates an entity: checks for all expected params
 * @param entity
 */
function isRefreshTokenEntity(entity) {
    if (!entity) {
        return false;
    }
    return (isCredentialEntity(entity) &&
        entity["credentialType"] === CredentialType.REFRESH_TOKEN);
}
/**
 * validates if a given cache entry is "Telemetry", parses <key,value>
 * @param key
 * @param entity
 */
function isServerTelemetryEntity(key, entity) {
    const validateKey = key.indexOf(SERVER_TELEM_CONSTANTS.CACHE_KEY) === 0;
    let validateEntity = true;
    if (entity) {
        validateEntity =
            entity.hasOwnProperty("failedRequests") &&
                entity.hasOwnProperty("errors") &&
                entity.hasOwnProperty("cacheHits");
    }
    return validateKey && validateEntity;
}
/**
 * validates if a given cache entry is "Throttling", parses <key,value>
 * @param key
 * @param entity
 */
function isThrottlingEntity(key, entity) {
    let validateKey = false;
    if (key) {
        validateKey = key.indexOf(ThrottlingConstants.THROTTLING_PREFIX) === 0;
    }
    let validateEntity = true;
    if (entity) {
        validateEntity = entity.hasOwnProperty("throttleTime");
    }
    return validateKey && validateEntity;
}
/**
 * Generate AppMetadata Cache Key as per the schema: appmetadata-<environment>-<client_id>
 */
function generateAppMetadataKey({ environment, clientId, }) {
    const appMetaDataKeyArray = [
        APP_METADATA,
        environment,
        clientId,
    ];
    return appMetaDataKeyArray
        .join(Separators.CACHE_KEY_SEPARATOR)
        .toLowerCase();
}
/*
 * Validates an entity: checks for all expected params
 * @param entity
 */
function isAppMetadataEntity(key, entity) {
    if (!entity) {
        return false;
    }
    return (key.indexOf(APP_METADATA) === 0 &&
        entity.hasOwnProperty("clientId") &&
        entity.hasOwnProperty("environment"));
}
/**
 * Validates an entity: checks for all expected params
 * @param entity
 */
function isAuthorityMetadataEntity(key, entity) {
    if (!entity) {
        return false;
    }
    return (key.indexOf(AUTHORITY_METADATA_CONSTANTS.CACHE_KEY) === 0 &&
        entity.hasOwnProperty("aliases") &&
        entity.hasOwnProperty("preferred_cache") &&
        entity.hasOwnProperty("preferred_network") &&
        entity.hasOwnProperty("canonical_authority") &&
        entity.hasOwnProperty("authorization_endpoint") &&
        entity.hasOwnProperty("token_endpoint") &&
        entity.hasOwnProperty("issuer") &&
        entity.hasOwnProperty("aliasesFromNetwork") &&
        entity.hasOwnProperty("endpointsFromNetwork") &&
        entity.hasOwnProperty("expiresAt") &&
        entity.hasOwnProperty("jwks_uri"));
}
/**
 * Reset the exiresAt value
 */
function generateAuthorityMetadataExpiresAt() {
    return (nowSeconds() +
        AUTHORITY_METADATA_CONSTANTS.REFRESH_TIME_SECONDS);
}
function updateAuthorityEndpointMetadata(authorityMetadata, updatedValues, fromNetwork) {
    authorityMetadata.authorization_endpoint =
        updatedValues.authorization_endpoint;
    authorityMetadata.token_endpoint = updatedValues.token_endpoint;
    authorityMetadata.end_session_endpoint = updatedValues.end_session_endpoint;
    authorityMetadata.issuer = updatedValues.issuer;
    authorityMetadata.endpointsFromNetwork = fromNetwork;
    authorityMetadata.jwks_uri = updatedValues.jwks_uri;
}
function updateCloudDiscoveryMetadata(authorityMetadata, updatedValues, fromNetwork) {
    authorityMetadata.aliases = updatedValues.aliases;
    authorityMetadata.preferred_cache = updatedValues.preferred_cache;
    authorityMetadata.preferred_network = updatedValues.preferred_network;
    authorityMetadata.aliasesFromNetwork = fromNetwork;
}
/**
 * Returns whether or not the data needs to be refreshed
 */
function isAuthorityMetadataExpired(metadata) {
    return metadata.expiresAt <= nowSeconds();
}

var CacheHelpers = /*#__PURE__*/Object.freeze({
    __proto__: null,
    createAccessTokenEntity: createAccessTokenEntity,
    createIdTokenEntity: createIdTokenEntity,
    createRefreshTokenEntity: createRefreshTokenEntity,
    generateAppMetadataKey: generateAppMetadataKey,
    generateAuthorityMetadataExpiresAt: generateAuthorityMetadataExpiresAt,
    isAccessTokenEntity: isAccessTokenEntity,
    isAppMetadataEntity: isAppMetadataEntity,
    isAuthorityMetadataEntity: isAuthorityMetadataEntity,
    isAuthorityMetadataExpired: isAuthorityMetadataExpired,
    isCredentialEntity: isCredentialEntity,
    isIdTokenEntity: isIdTokenEntity,
    isRefreshTokenEntity: isRefreshTokenEntity,
    isServerTelemetryEntity: isServerTelemetryEntity,
    isThrottlingEntity: isThrottlingEntity,
    updateAuthorityEndpointMetadata: updateAuthorityEndpointMetadata,
    updateCloudDiscoveryMetadata: updateCloudDiscoveryMetadata
});

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * The authority class validates the authority URIs used by the user, and retrieves the OpenID Configuration Data from the
 * endpoint. It will store the pertinent config data in this object for use during token calls.
 * @internal
 */
class Authority {
    constructor(authority, networkInterface, cacheManager, authorityOptions, logger, correlationId, performanceClient, managedIdentity) {
        this.canonicalAuthority = authority;
        this._canonicalAuthority.validateAsUri();
        this.networkInterface = networkInterface;
        this.cacheManager = cacheManager;
        this.authorityOptions = authorityOptions;
        this.regionDiscoveryMetadata = {
            region_used: undefined,
            region_source: undefined,
            region_outcome: undefined,
        };
        this.logger = logger;
        this.performanceClient = performanceClient;
        this.correlationId = correlationId;
        this.managedIdentity = managedIdentity || false;
        this.regionDiscovery = new RegionDiscovery(networkInterface, this.logger, this.performanceClient, this.correlationId);
    }
    /**
     * Get {@link AuthorityType}
     * @param authorityUri {@link IUri}
     * @private
     */
    getAuthorityType(authorityUri) {
        // CIAM auth url pattern is being standardized as: <tenant>.ciamlogin.com
        if (authorityUri.HostNameAndPort.endsWith(Constants.CIAM_AUTH_URL)) {
            return AuthorityType.Ciam;
        }
        const pathSegments = authorityUri.PathSegments;
        if (pathSegments.length) {
            switch (pathSegments[0].toLowerCase()) {
                case Constants.ADFS:
                    return AuthorityType.Adfs;
                case Constants.DSTS:
                    return AuthorityType.Dsts;
            }
        }
        return AuthorityType.Default;
    }
    // See above for AuthorityType
    get authorityType() {
        return this.getAuthorityType(this.canonicalAuthorityUrlComponents);
    }
    /**
     * ProtocolMode enum representing the way endpoints are constructed.
     */
    get protocolMode() {
        return this.authorityOptions.protocolMode;
    }
    /**
     * Returns authorityOptions which can be used to reinstantiate a new authority instance
     */
    get options() {
        return this.authorityOptions;
    }
    /**
     * A URL that is the authority set by the developer
     */
    get canonicalAuthority() {
        return this._canonicalAuthority.urlString;
    }
    /**
     * Sets canonical authority.
     */
    set canonicalAuthority(url) {
        this._canonicalAuthority = new UrlString(url);
        this._canonicalAuthority.validateAsUri();
        this._canonicalAuthorityUrlComponents = null;
    }
    /**
     * Get authority components.
     */
    get canonicalAuthorityUrlComponents() {
        if (!this._canonicalAuthorityUrlComponents) {
            this._canonicalAuthorityUrlComponents =
                this._canonicalAuthority.getUrlComponents();
        }
        return this._canonicalAuthorityUrlComponents;
    }
    /**
     * Get hostname and port i.e. login.microsoftonline.com
     */
    get hostnameAndPort() {
        return this.canonicalAuthorityUrlComponents.HostNameAndPort.toLowerCase();
    }
    /**
     * Get tenant for authority.
     */
    get tenant() {
        return this.canonicalAuthorityUrlComponents.PathSegments[0];
    }
    /**
     * OAuth /authorize endpoint for requests
     */
    get authorizationEndpoint() {
        if (this.discoveryComplete()) {
            return this.replacePath(this.metadata.authorization_endpoint);
        }
        else {
            throw createClientAuthError(endpointResolutionError);
        }
    }
    /**
     * OAuth /token endpoint for requests
     */
    get tokenEndpoint() {
        if (this.discoveryComplete()) {
            return this.replacePath(this.metadata.token_endpoint);
        }
        else {
            throw createClientAuthError(endpointResolutionError);
        }
    }
    get deviceCodeEndpoint() {
        if (this.discoveryComplete()) {
            return this.replacePath(this.metadata.token_endpoint.replace("/token", "/devicecode"));
        }
        else {
            throw createClientAuthError(endpointResolutionError);
        }
    }
    /**
     * OAuth logout endpoint for requests
     */
    get endSessionEndpoint() {
        if (this.discoveryComplete()) {
            // ROPC policies may not have end_session_endpoint set
            if (!this.metadata.end_session_endpoint) {
                throw createClientAuthError(endSessionEndpointNotSupported);
            }
            return this.replacePath(this.metadata.end_session_endpoint);
        }
        else {
            throw createClientAuthError(endpointResolutionError);
        }
    }
    /**
     * OAuth issuer for requests
     */
    get selfSignedJwtAudience() {
        if (this.discoveryComplete()) {
            return this.replacePath(this.metadata.issuer);
        }
        else {
            throw createClientAuthError(endpointResolutionError);
        }
    }
    /**
     * Jwks_uri for token signing keys
     */
    get jwksUri() {
        if (this.discoveryComplete()) {
            return this.replacePath(this.metadata.jwks_uri);
        }
        else {
            throw createClientAuthError(endpointResolutionError);
        }
    }
    /**
     * Returns a flag indicating that tenant name can be replaced in authority {@link IUri}
     * @param authorityUri {@link IUri}
     * @private
     */
    canReplaceTenant(authorityUri) {
        return (authorityUri.PathSegments.length === 1 &&
            !Authority.reservedTenantDomains.has(authorityUri.PathSegments[0]) &&
            this.getAuthorityType(authorityUri) === AuthorityType.Default &&
            this.protocolMode !== ProtocolMode.OIDC);
    }
    /**
     * Replaces tenant in url path with current tenant. Defaults to common.
     * @param urlString
     */
    replaceTenant(urlString) {
        return urlString.replace(/{tenant}|{tenantid}/g, this.tenant);
    }
    /**
     * Replaces path such as tenant or policy with the current tenant or policy.
     * @param urlString
     */
    replacePath(urlString) {
        let endpoint = urlString;
        const cachedAuthorityUrl = new UrlString(this.metadata.canonical_authority);
        const cachedAuthorityUrlComponents = cachedAuthorityUrl.getUrlComponents();
        const cachedAuthorityParts = cachedAuthorityUrlComponents.PathSegments;
        const currentAuthorityParts = this.canonicalAuthorityUrlComponents.PathSegments;
        currentAuthorityParts.forEach((currentPart, index) => {
            let cachedPart = cachedAuthorityParts[index];
            if (index === 0 &&
                this.canReplaceTenant(cachedAuthorityUrlComponents)) {
                const tenantId = new UrlString(this.metadata.authorization_endpoint).getUrlComponents().PathSegments[0];
                /**
                 * Check if AAD canonical authority contains tenant domain name, for example "testdomain.onmicrosoft.com",
                 * by comparing its first path segment to the corresponding authorization endpoint path segment, which is
                 * always resolved with tenant id by OIDC.
                 */
                if (cachedPart !== tenantId) {
                    this.logger.verbose(`Replacing tenant domain name ${cachedPart} with id ${tenantId}`);
                    cachedPart = tenantId;
                }
            }
            if (currentPart !== cachedPart) {
                endpoint = endpoint.replace(`/${cachedPart}/`, `/${currentPart}/`);
            }
        });
        return this.replaceTenant(endpoint);
    }
    /**
     * The default open id configuration endpoint for any canonical authority.
     */
    get defaultOpenIdConfigurationEndpoint() {
        const canonicalAuthorityHost = this.hostnameAndPort;
        if (this.canonicalAuthority.endsWith("v2.0/") ||
            this.authorityType === AuthorityType.Adfs ||
            (this.protocolMode === ProtocolMode.OIDC &&
                !this.isAliasOfKnownMicrosoftAuthority(canonicalAuthorityHost))) {
            return `${this.canonicalAuthority}.well-known/openid-configuration`;
        }
        return `${this.canonicalAuthority}v2.0/.well-known/openid-configuration`;
    }
    /**
     * Boolean that returns whether or not tenant discovery has been completed.
     */
    discoveryComplete() {
        return !!this.metadata;
    }
    /**
     * Perform endpoint discovery to discover aliases, preferred_cache, preferred_network
     * and the /authorize, /token and logout endpoints.
     */
    async resolveEndpointsAsync() {
        this.performanceClient?.addQueueMeasurement(PerformanceEvents.AuthorityResolveEndpointsAsync, this.correlationId);
        const metadataEntity = this.getCurrentMetadataEntity();
        const cloudDiscoverySource = await invokeAsync(this.updateCloudDiscoveryMetadata.bind(this), PerformanceEvents.AuthorityUpdateCloudDiscoveryMetadata, this.logger, this.performanceClient, this.correlationId)(metadataEntity);
        this.canonicalAuthority = this.canonicalAuthority.replace(this.hostnameAndPort, metadataEntity.preferred_network);
        const endpointSource = await invokeAsync(this.updateEndpointMetadata.bind(this), PerformanceEvents.AuthorityUpdateEndpointMetadata, this.logger, this.performanceClient, this.correlationId)(metadataEntity);
        this.updateCachedMetadata(metadataEntity, cloudDiscoverySource, {
            source: endpointSource,
        });
        this.performanceClient?.addFields({
            cloudDiscoverySource: cloudDiscoverySource,
            authorityEndpointSource: endpointSource,
        }, this.correlationId);
    }
    /**
     * Returns metadata entity from cache if it exists, otherwiser returns a new metadata entity built
     * from the configured canonical authority
     * @returns
     */
    getCurrentMetadataEntity() {
        let metadataEntity = this.cacheManager.getAuthorityMetadataByAlias(this.hostnameAndPort);
        if (!metadataEntity) {
            metadataEntity = {
                aliases: [],
                preferred_cache: this.hostnameAndPort,
                preferred_network: this.hostnameAndPort,
                canonical_authority: this.canonicalAuthority,
                authorization_endpoint: "",
                token_endpoint: "",
                end_session_endpoint: "",
                issuer: "",
                aliasesFromNetwork: false,
                endpointsFromNetwork: false,
                expiresAt: generateAuthorityMetadataExpiresAt(),
                jwks_uri: "",
            };
        }
        return metadataEntity;
    }
    /**
     * Updates cached metadata based on metadata source and sets the instance's metadata
     * property to the same value
     * @param metadataEntity
     * @param cloudDiscoverySource
     * @param endpointMetadataResult
     */
    updateCachedMetadata(metadataEntity, cloudDiscoverySource, endpointMetadataResult) {
        if (cloudDiscoverySource !== AuthorityMetadataSource.CACHE &&
            endpointMetadataResult?.source !== AuthorityMetadataSource.CACHE) {
            // Reset the expiration time unless both values came from a successful cache lookup
            metadataEntity.expiresAt =
                generateAuthorityMetadataExpiresAt();
            metadataEntity.canonical_authority = this.canonicalAuthority;
        }
        const cacheKey = this.cacheManager.generateAuthorityMetadataCacheKey(metadataEntity.preferred_cache);
        this.cacheManager.setAuthorityMetadata(cacheKey, metadataEntity);
        this.metadata = metadataEntity;
    }
    /**
     * Update AuthorityMetadataEntity with new endpoints and return where the information came from
     * @param metadataEntity
     */
    async updateEndpointMetadata(metadataEntity) {
        this.performanceClient?.addQueueMeasurement(PerformanceEvents.AuthorityUpdateEndpointMetadata, this.correlationId);
        const localMetadata = this.updateEndpointMetadataFromLocalSources(metadataEntity);
        // Further update may be required for hardcoded metadata if regional metadata is preferred
        if (localMetadata) {
            if (localMetadata.source ===
                AuthorityMetadataSource.HARDCODED_VALUES) {
                // If the user prefers to use an azure region replace the global endpoints with regional information.
                if (this.authorityOptions.azureRegionConfiguration?.azureRegion) {
                    if (localMetadata.metadata) {
                        const hardcodedMetadata = await invokeAsync(this.updateMetadataWithRegionalInformation.bind(this), PerformanceEvents.AuthorityUpdateMetadataWithRegionalInformation, this.logger, this.performanceClient, this.correlationId)(localMetadata.metadata);
                        updateAuthorityEndpointMetadata(metadataEntity, hardcodedMetadata, false);
                        metadataEntity.canonical_authority =
                            this.canonicalAuthority;
                    }
                }
            }
            return localMetadata.source;
        }
        // Get metadata from network if local sources aren't available
        let metadata = await invokeAsync(this.getEndpointMetadataFromNetwork.bind(this), PerformanceEvents.AuthorityGetEndpointMetadataFromNetwork, this.logger, this.performanceClient, this.correlationId)();
        if (metadata) {
            // If the user prefers to use an azure region replace the global endpoints with regional information.
            if (this.authorityOptions.azureRegionConfiguration?.azureRegion) {
                metadata = await invokeAsync(this.updateMetadataWithRegionalInformation.bind(this), PerformanceEvents.AuthorityUpdateMetadataWithRegionalInformation, this.logger, this.performanceClient, this.correlationId)(metadata);
            }
            updateAuthorityEndpointMetadata(metadataEntity, metadata, true);
            return AuthorityMetadataSource.NETWORK;
        }
        else {
            // Metadata could not be obtained from the config, cache, network or hardcoded values
            throw createClientAuthError(openIdConfigError, this.defaultOpenIdConfigurationEndpoint);
        }
    }
    /**
     * Updates endpoint metadata from local sources and returns where the information was retrieved from and the metadata config
     * response if the source is hardcoded metadata
     * @param metadataEntity
     * @returns
     */
    updateEndpointMetadataFromLocalSources(metadataEntity) {
        this.logger.verbose("Attempting to get endpoint metadata from authority configuration");
        const configMetadata = this.getEndpointMetadataFromConfig();
        if (configMetadata) {
            this.logger.verbose("Found endpoint metadata in authority configuration");
            updateAuthorityEndpointMetadata(metadataEntity, configMetadata, false);
            return {
                source: AuthorityMetadataSource.CONFIG,
            };
        }
        this.logger.verbose("Did not find endpoint metadata in the config... Attempting to get endpoint metadata from the hardcoded values.");
        // skipAuthorityMetadataCache is used to bypass hardcoded authority metadata and force a network metadata cache lookup and network metadata request if no cached response is available.
        if (this.authorityOptions.skipAuthorityMetadataCache) {
            this.logger.verbose("Skipping hardcoded metadata cache since skipAuthorityMetadataCache is set to true. Attempting to get endpoint metadata from the network metadata cache.");
        }
        else {
            const hardcodedMetadata = this.getEndpointMetadataFromHardcodedValues();
            if (hardcodedMetadata) {
                updateAuthorityEndpointMetadata(metadataEntity, hardcodedMetadata, false);
                return {
                    source: AuthorityMetadataSource.HARDCODED_VALUES,
                    metadata: hardcodedMetadata,
                };
            }
            else {
                this.logger.verbose("Did not find endpoint metadata in hardcoded values... Attempting to get endpoint metadata from the network metadata cache.");
            }
        }
        // Check cached metadata entity expiration status
        const metadataEntityExpired = isAuthorityMetadataExpired(metadataEntity);
        if (this.isAuthoritySameType(metadataEntity) &&
            metadataEntity.endpointsFromNetwork &&
            !metadataEntityExpired) {
            // No need to update
            this.logger.verbose("Found endpoint metadata in the cache.");
            return { source: AuthorityMetadataSource.CACHE };
        }
        else if (metadataEntityExpired) {
            this.logger.verbose("The metadata entity is expired.");
        }
        return null;
    }
    /**
     * Compares the number of url components after the domain to determine if the cached
     * authority metadata can be used for the requested authority. Protects against same domain different
     * authority such as login.microsoftonline.com/tenant and login.microsoftonline.com/tfp/tenant/policy
     * @param metadataEntity
     */
    isAuthoritySameType(metadataEntity) {
        const cachedAuthorityUrl = new UrlString(metadataEntity.canonical_authority);
        const cachedParts = cachedAuthorityUrl.getUrlComponents().PathSegments;
        return (cachedParts.length ===
            this.canonicalAuthorityUrlComponents.PathSegments.length);
    }
    /**
     * Parse authorityMetadata config option
     */
    getEndpointMetadataFromConfig() {
        if (this.authorityOptions.authorityMetadata) {
            try {
                return JSON.parse(this.authorityOptions.authorityMetadata);
            }
            catch (e) {
                throw createClientConfigurationError(invalidAuthorityMetadata);
            }
        }
        return null;
    }
    /**
     * Gets OAuth endpoints from the given OpenID configuration endpoint.
     *
     * @param hasHardcodedMetadata boolean
     */
    async getEndpointMetadataFromNetwork() {
        this.performanceClient?.addQueueMeasurement(PerformanceEvents.AuthorityGetEndpointMetadataFromNetwork, this.correlationId);
        const options = {};
        /*
         * TODO: Add a timeout if the authority exists in our library's
         * hardcoded list of metadata
         */
        const openIdConfigurationEndpoint = this.defaultOpenIdConfigurationEndpoint;
        this.logger.verbose(`Authority.getEndpointMetadataFromNetwork: attempting to retrieve OAuth endpoints from ${openIdConfigurationEndpoint}`);
        try {
            const response = await this.networkInterface.sendGetRequestAsync(openIdConfigurationEndpoint, options);
            const isValidResponse = isOpenIdConfigResponse(response.body);
            if (isValidResponse) {
                return response.body;
            }
            else {
                this.logger.verbose(`Authority.getEndpointMetadataFromNetwork: could not parse response as OpenID configuration`);
                return null;
            }
        }
        catch (e) {
            this.logger.verbose(`Authority.getEndpointMetadataFromNetwork: ${e}`);
            return null;
        }
    }
    /**
     * Get OAuth endpoints for common authorities.
     */
    getEndpointMetadataFromHardcodedValues() {
        if (this.hostnameAndPort in EndpointMetadata) {
            return EndpointMetadata[this.hostnameAndPort];
        }
        return null;
    }
    /**
     * Update the retrieved metadata with regional information.
     * User selected Azure region will be used if configured.
     */
    async updateMetadataWithRegionalInformation(metadata) {
        this.performanceClient?.addQueueMeasurement(PerformanceEvents.AuthorityUpdateMetadataWithRegionalInformation, this.correlationId);
        const userConfiguredAzureRegion = this.authorityOptions.azureRegionConfiguration?.azureRegion;
        if (userConfiguredAzureRegion) {
            if (userConfiguredAzureRegion !==
                Constants.AZURE_REGION_AUTO_DISCOVER_FLAG) {
                this.regionDiscoveryMetadata.region_outcome =
                    RegionDiscoveryOutcomes.CONFIGURED_NO_AUTO_DETECTION;
                this.regionDiscoveryMetadata.region_used =
                    userConfiguredAzureRegion;
                return Authority.replaceWithRegionalInformation(metadata, userConfiguredAzureRegion);
            }
            const autodetectedRegionName = await invokeAsync(this.regionDiscovery.detectRegion.bind(this.regionDiscovery), PerformanceEvents.RegionDiscoveryDetectRegion, this.logger, this.performanceClient, this.correlationId)(this.authorityOptions.azureRegionConfiguration
                ?.environmentRegion, this.regionDiscoveryMetadata);
            if (autodetectedRegionName) {
                this.regionDiscoveryMetadata.region_outcome =
                    RegionDiscoveryOutcomes.AUTO_DETECTION_REQUESTED_SUCCESSFUL;
                this.regionDiscoveryMetadata.region_used =
                    autodetectedRegionName;
                return Authority.replaceWithRegionalInformation(metadata, autodetectedRegionName);
            }
            this.regionDiscoveryMetadata.region_outcome =
                RegionDiscoveryOutcomes.AUTO_DETECTION_REQUESTED_FAILED;
        }
        return metadata;
    }
    /**
     * Updates the AuthorityMetadataEntity with new aliases, preferred_network and preferred_cache
     * and returns where the information was retrieved from
     * @param metadataEntity
     * @returns AuthorityMetadataSource
     */
    async updateCloudDiscoveryMetadata(metadataEntity) {
        this.performanceClient?.addQueueMeasurement(PerformanceEvents.AuthorityUpdateCloudDiscoveryMetadata, this.correlationId);
        const localMetadataSource = this.updateCloudDiscoveryMetadataFromLocalSources(metadataEntity);
        if (localMetadataSource) {
            return localMetadataSource;
        }
        // Fallback to network as metadata source
        const metadata = await invokeAsync(this.getCloudDiscoveryMetadataFromNetwork.bind(this), PerformanceEvents.AuthorityGetCloudDiscoveryMetadataFromNetwork, this.logger, this.performanceClient, this.correlationId)();
        if (metadata) {
            updateCloudDiscoveryMetadata(metadataEntity, metadata, true);
            return AuthorityMetadataSource.NETWORK;
        }
        // Metadata could not be obtained from the config, cache, network or hardcoded values
        throw createClientConfigurationError(untrustedAuthority);
    }
    updateCloudDiscoveryMetadataFromLocalSources(metadataEntity) {
        this.logger.verbose("Attempting to get cloud discovery metadata  from authority configuration");
        this.logger.verbosePii(`Known Authorities: ${this.authorityOptions.knownAuthorities ||
            Constants.NOT_APPLICABLE}`);
        this.logger.verbosePii(`Authority Metadata: ${this.authorityOptions.authorityMetadata ||
            Constants.NOT_APPLICABLE}`);
        this.logger.verbosePii(`Canonical Authority: ${metadataEntity.canonical_authority || Constants.NOT_APPLICABLE}`);
        const metadata = this.getCloudDiscoveryMetadataFromConfig();
        if (metadata) {
            this.logger.verbose("Found cloud discovery metadata in authority configuration");
            updateCloudDiscoveryMetadata(metadataEntity, metadata, false);
            return AuthorityMetadataSource.CONFIG;
        }
        // If the cached metadata came from config but that config was not passed to this instance, we must go to hardcoded values
        this.logger.verbose("Did not find cloud discovery metadata in the config... Attempting to get cloud discovery metadata from the hardcoded values.");
        if (this.options.skipAuthorityMetadataCache) {
            this.logger.verbose("Skipping hardcoded cloud discovery metadata cache since skipAuthorityMetadataCache is set to true. Attempting to get cloud discovery metadata from the network metadata cache.");
        }
        else {
            const hardcodedMetadata = getCloudDiscoveryMetadataFromHardcodedValues(this.hostnameAndPort);
            if (hardcodedMetadata) {
                this.logger.verbose("Found cloud discovery metadata from hardcoded values.");
                updateCloudDiscoveryMetadata(metadataEntity, hardcodedMetadata, false);
                return AuthorityMetadataSource.HARDCODED_VALUES;
            }
            this.logger.verbose("Did not find cloud discovery metadata in hardcoded values... Attempting to get cloud discovery metadata from the network metadata cache.");
        }
        const metadataEntityExpired = isAuthorityMetadataExpired(metadataEntity);
        if (this.isAuthoritySameType(metadataEntity) &&
            metadataEntity.aliasesFromNetwork &&
            !metadataEntityExpired) {
            this.logger.verbose("Found cloud discovery metadata in the cache.");
            // No need to update
            return AuthorityMetadataSource.CACHE;
        }
        else if (metadataEntityExpired) {
            this.logger.verbose("The metadata entity is expired.");
        }
        return null;
    }
    /**
     * Parse cloudDiscoveryMetadata config or check knownAuthorities
     */
    getCloudDiscoveryMetadataFromConfig() {
        // CIAM does not support cloud discovery metadata
        if (this.authorityType === AuthorityType.Ciam) {
            this.logger.verbose("CIAM authorities do not support cloud discovery metadata, generate the aliases from authority host.");
            return Authority.createCloudDiscoveryMetadataFromHost(this.hostnameAndPort);
        }
        // Check if network response was provided in config
        if (this.authorityOptions.cloudDiscoveryMetadata) {
            this.logger.verbose("The cloud discovery metadata has been provided as a network response, in the config.");
            try {
                this.logger.verbose("Attempting to parse the cloud discovery metadata.");
                const parsedResponse = JSON.parse(this.authorityOptions.cloudDiscoveryMetadata);
                const metadata = getCloudDiscoveryMetadataFromNetworkResponse(parsedResponse.metadata, this.hostnameAndPort);
                this.logger.verbose("Parsed the cloud discovery metadata.");
                if (metadata) {
                    this.logger.verbose("There is returnable metadata attached to the parsed cloud discovery metadata.");
                    return metadata;
                }
                else {
                    this.logger.verbose("There is no metadata attached to the parsed cloud discovery metadata.");
                }
            }
            catch (e) {
                this.logger.verbose("Unable to parse the cloud discovery metadata. Throwing Invalid Cloud Discovery Metadata Error.");
                throw createClientConfigurationError(invalidCloudDiscoveryMetadata);
            }
        }
        // If cloudDiscoveryMetadata is empty or does not contain the host, check knownAuthorities
        if (this.isInKnownAuthorities()) {
            this.logger.verbose("The host is included in knownAuthorities. Creating new cloud discovery metadata from the host.");
            return Authority.createCloudDiscoveryMetadataFromHost(this.hostnameAndPort);
        }
        return null;
    }
    /**
     * Called to get metadata from network if CloudDiscoveryMetadata was not populated by config
     *
     * @param hasHardcodedMetadata boolean
     */
    async getCloudDiscoveryMetadataFromNetwork() {
        this.performanceClient?.addQueueMeasurement(PerformanceEvents.AuthorityGetCloudDiscoveryMetadataFromNetwork, this.correlationId);
        const instanceDiscoveryEndpoint = `${Constants.AAD_INSTANCE_DISCOVERY_ENDPT}${this.canonicalAuthority}oauth2/v2.0/authorize`;
        const options = {};
        /*
         * TODO: Add a timeout if the authority exists in our library's
         * hardcoded list of metadata
         */
        let match = null;
        try {
            const response = await this.networkInterface.sendGetRequestAsync(instanceDiscoveryEndpoint, options);
            let typedResponseBody;
            let metadata;
            if (isCloudInstanceDiscoveryResponse(response.body)) {
                typedResponseBody =
                    response.body;
                metadata = typedResponseBody.metadata;
                this.logger.verbosePii(`tenant_discovery_endpoint is: ${typedResponseBody.tenant_discovery_endpoint}`);
            }
            else if (isCloudInstanceDiscoveryErrorResponse(response.body)) {
                this.logger.warning(`A CloudInstanceDiscoveryErrorResponse was returned. The cloud instance discovery network request's status code is: ${response.status}`);
                typedResponseBody =
                    response.body;
                if (typedResponseBody.error === Constants.INVALID_INSTANCE) {
                    this.logger.error("The CloudInstanceDiscoveryErrorResponse error is invalid_instance.");
                    return null;
                }
                this.logger.warning(`The CloudInstanceDiscoveryErrorResponse error is ${typedResponseBody.error}`);
                this.logger.warning(`The CloudInstanceDiscoveryErrorResponse error description is ${typedResponseBody.error_description}`);
                this.logger.warning("Setting the value of the CloudInstanceDiscoveryMetadata (returned from the network) to []");
                metadata = [];
            }
            else {
                this.logger.error("AAD did not return a CloudInstanceDiscoveryResponse or CloudInstanceDiscoveryErrorResponse");
                return null;
            }
            this.logger.verbose("Attempting to find a match between the developer's authority and the CloudInstanceDiscoveryMetadata returned from the network request.");
            match = getCloudDiscoveryMetadataFromNetworkResponse(metadata, this.hostnameAndPort);
        }
        catch (error) {
            if (error instanceof AuthError) {
                this.logger.error(`There was a network error while attempting to get the cloud discovery instance metadata.\nError: ${error.errorCode}\nError Description: ${error.errorMessage}`);
            }
            else {
                const typedError = error;
                this.logger.error(`A non-MSALJS error was thrown while attempting to get the cloud instance discovery metadata.\nError: ${typedError.name}\nError Description: ${typedError.message}`);
            }
            return null;
        }
        // Custom Domain scenario, host is trusted because Instance Discovery call succeeded
        if (!match) {
            this.logger.warning("The developer's authority was not found within the CloudInstanceDiscoveryMetadata returned from the network request.");
            this.logger.verbose("Creating custom Authority for custom domain scenario.");
            match = Authority.createCloudDiscoveryMetadataFromHost(this.hostnameAndPort);
        }
        return match;
    }
    /**
     * Helper function to determine if this host is included in the knownAuthorities config option
     */
    isInKnownAuthorities() {
        const matches = this.authorityOptions.knownAuthorities.filter((authority) => {
            return (authority &&
                UrlString.getDomainFromUrl(authority).toLowerCase() ===
                    this.hostnameAndPort);
        });
        return matches.length > 0;
    }
    /**
     * helper function to populate the authority based on azureCloudOptions
     * @param authorityString
     * @param azureCloudOptions
     */
    static generateAuthority(authorityString, azureCloudOptions) {
        let authorityAzureCloudInstance;
        if (azureCloudOptions &&
            azureCloudOptions.azureCloudInstance !== AzureCloudInstance.None) {
            const tenant = azureCloudOptions.tenant
                ? azureCloudOptions.tenant
                : Constants.DEFAULT_COMMON_TENANT;
            authorityAzureCloudInstance = `${azureCloudOptions.azureCloudInstance}/${tenant}/`;
        }
        return authorityAzureCloudInstance
            ? authorityAzureCloudInstance
            : authorityString;
    }
    /**
     * Creates cloud discovery metadata object from a given host
     * @param host
     */
    static createCloudDiscoveryMetadataFromHost(host) {
        return {
            preferred_network: host,
            preferred_cache: host,
            aliases: [host],
        };
    }
    /**
     * helper function to generate environment from authority object
     */
    getPreferredCache() {
        if (this.managedIdentity) {
            return Constants.DEFAULT_AUTHORITY_HOST;
        }
        else if (this.discoveryComplete()) {
            return this.metadata.preferred_cache;
        }
        else {
            throw createClientAuthError(endpointResolutionError);
        }
    }
    /**
     * Returns whether or not the provided host is an alias of this authority instance
     * @param host
     */
    isAlias(host) {
        return this.metadata.aliases.indexOf(host) > -1;
    }
    /**
     * Returns whether or not the provided host is an alias of a known Microsoft authority for purposes of endpoint discovery
     * @param host
     */
    isAliasOfKnownMicrosoftAuthority(host) {
        return InstanceDiscoveryMetadataAliases.has(host);
    }
    /**
     * Checks whether the provided host is that of a public cloud authority
     *
     * @param authority string
     * @returns bool
     */
    static isPublicCloudAuthority(host) {
        return Constants.KNOWN_PUBLIC_CLOUDS.indexOf(host) >= 0;
    }
    /**
     * Rebuild the authority string with the region
     *
     * @param host string
     * @param region string
     */
    static buildRegionalAuthorityString(host, region, queryString) {
        // Create and validate a Url string object with the initial authority string
        const authorityUrlInstance = new UrlString(host);
        authorityUrlInstance.validateAsUri();
        const authorityUrlParts = authorityUrlInstance.getUrlComponents();
        let hostNameAndPort = `${region}.${authorityUrlParts.HostNameAndPort}`;
        if (this.isPublicCloudAuthority(authorityUrlParts.HostNameAndPort)) {
            hostNameAndPort = `${region}.${Constants.REGIONAL_AUTH_PUBLIC_CLOUD_SUFFIX}`;
        }
        // Include the query string portion of the url
        const url = UrlString.constructAuthorityUriFromObject({
            ...authorityUrlInstance.getUrlComponents(),
            HostNameAndPort: hostNameAndPort,
        }).urlString;
        // Add the query string if a query string was provided
        if (queryString)
            return `${url}?${queryString}`;
        return url;
    }
    /**
     * Replace the endpoints in the metadata object with their regional equivalents.
     *
     * @param metadata OpenIdConfigResponse
     * @param azureRegion string
     */
    static replaceWithRegionalInformation(metadata, azureRegion) {
        const regionalMetadata = { ...metadata };
        regionalMetadata.authorization_endpoint =
            Authority.buildRegionalAuthorityString(regionalMetadata.authorization_endpoint, azureRegion);
        regionalMetadata.token_endpoint =
            Authority.buildRegionalAuthorityString(regionalMetadata.token_endpoint, azureRegion);
        if (regionalMetadata.end_session_endpoint) {
            regionalMetadata.end_session_endpoint =
                Authority.buildRegionalAuthorityString(regionalMetadata.end_session_endpoint, azureRegion);
        }
        return regionalMetadata;
    }
    /**
     * Transform CIAM_AUTHORIY as per the below rules:
     * If no path segments found and it is a CIAM authority (hostname ends with .ciamlogin.com), then transform it
     *
     * NOTE: The transformation path should go away once STS supports CIAM with the format: `tenantIdorDomain.ciamlogin.com`
     * `ciamlogin.com` can also change in the future and we should accommodate the same
     *
     * @param authority
     */
    static transformCIAMAuthority(authority) {
        let ciamAuthority = authority;
        const authorityUrl = new UrlString(authority);
        const authorityUrlComponents = authorityUrl.getUrlComponents();
        // check if transformation is needed
        if (authorityUrlComponents.PathSegments.length === 0 &&
            authorityUrlComponents.HostNameAndPort.endsWith(Constants.CIAM_AUTH_URL)) {
            const tenantIdOrDomain = authorityUrlComponents.HostNameAndPort.split(".")[0];
            ciamAuthority = `${ciamAuthority}${tenantIdOrDomain}${Constants.AAD_TENANT_DOMAIN_SUFFIX}`;
        }
        return ciamAuthority;
    }
}
// Reserved tenant domain names that will not be replaced with tenant id
Authority.reservedTenantDomains = new Set([
    "{tenant}",
    "{tenantid}",
    AADAuthorityConstants.COMMON,
    AADAuthorityConstants.CONSUMERS,
    AADAuthorityConstants.ORGANIZATIONS,
]);
/**
 * Extract tenantId from authority
 */
function getTenantFromAuthorityString(authority) {
    const authorityUrl = new UrlString(authority);
    const authorityUrlComponents = authorityUrl.getUrlComponents();
    /**
     * For credential matching purposes, tenantId is the last path segment of the authority URL:
     *  AAD Authority - domain/tenantId -> Credentials are cached with realm = tenantId
     *  B2C Authority - domain/{tenantId}?/.../policy -> Credentials are cached with realm = policy
     *  tenantId is downcased because B2C policies can have mixed case but tfp claim is downcased
     *
     * Note that we may not have any path segments in certain OIDC scenarios.
     */
    const tenantId = authorityUrlComponents.PathSegments.slice(-1)[0]?.toLowerCase();
    switch (tenantId) {
        case AADAuthorityConstants.COMMON:
        case AADAuthorityConstants.ORGANIZATIONS:
        case AADAuthorityConstants.CONSUMERS:
            return undefined;
        default:
            return tenantId;
    }
}
function formatAuthorityUri(authorityUri) {
    return authorityUri.endsWith(Constants.FORWARD_SLASH)
        ? authorityUri
        : `${authorityUri}${Constants.FORWARD_SLASH}`;
}
function buildStaticAuthorityOptions(authOptions) {
    const rawCloudDiscoveryMetadata = authOptions.cloudDiscoveryMetadata;
    let cloudDiscoveryMetadata = undefined;
    if (rawCloudDiscoveryMetadata) {
        try {
            cloudDiscoveryMetadata = JSON.parse(rawCloudDiscoveryMetadata);
        }
        catch (e) {
            throw createClientConfigurationError(invalidCloudDiscoveryMetadata);
        }
    }
    return {
        canonicalAuthority: authOptions.authority
            ? formatAuthorityUri(authOptions.authority)
            : undefined,
        knownAuthorities: authOptions.knownAuthorities,
        cloudDiscoveryMetadata: cloudDiscoveryMetadata,
    };
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Create an authority object of the correct type based on the url
 * Performs basic authority validation - checks to see if the authority is of a valid type (i.e. aad, b2c, adfs)
 *
 * Also performs endpoint discovery.
 *
 * @param authorityUri
 * @param networkClient
 * @param protocolMode
 * @internal
 */
async function createDiscoveredInstance(authorityUri, networkClient, cacheManager, authorityOptions, logger, correlationId, performanceClient) {
    performanceClient?.addQueueMeasurement(PerformanceEvents.AuthorityFactoryCreateDiscoveredInstance, correlationId);
    const authorityUriFinal = Authority.transformCIAMAuthority(formatAuthorityUri(authorityUri));
    // Initialize authority and perform discovery endpoint check.
    const acquireTokenAuthority = new Authority(authorityUriFinal, networkClient, cacheManager, authorityOptions, logger, correlationId, performanceClient);
    try {
        await invokeAsync(acquireTokenAuthority.resolveEndpointsAsync.bind(acquireTokenAuthority), PerformanceEvents.AuthorityResolveEndpointsAsync, logger, performanceClient, correlationId)();
        return acquireTokenAuthority;
    }
    catch (e) {
        throw createClientAuthError(endpointResolutionError);
    }
}

var AuthorityFactory = /*#__PURE__*/Object.freeze({
    __proto__: null,
    createDiscoveredInstance: createDiscoveredInstance
});

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const CLIENT_ID = "client_id";
const REDIRECT_URI = "redirect_uri";
const RESPONSE_TYPE = "response_type";
const RESPONSE_MODE = "response_mode";
const GRANT_TYPE = "grant_type";
const CLAIMS = "claims";
const SCOPE = "scope";
const ERROR = "error";
const ERROR_DESCRIPTION = "error_description";
const ACCESS_TOKEN = "access_token";
const ID_TOKEN = "id_token";
const REFRESH_TOKEN = "refresh_token";
const EXPIRES_IN = "expires_in";
const REFRESH_TOKEN_EXPIRES_IN = "refresh_token_expires_in";
const STATE = "state";
const NONCE = "nonce";
const PROMPT = "prompt";
const SESSION_STATE = "session_state";
const CLIENT_INFO = "client_info";
const CODE = "code";
const CODE_CHALLENGE = "code_challenge";
const CODE_CHALLENGE_METHOD = "code_challenge_method";
const CODE_VERIFIER = "code_verifier";
const CLIENT_REQUEST_ID = "client-request-id";
const X_CLIENT_SKU = "x-client-SKU";
const X_CLIENT_VER = "x-client-VER";
const X_CLIENT_OS = "x-client-OS";
const X_CLIENT_CPU = "x-client-CPU";
const X_CLIENT_CURR_TELEM = "x-client-current-telemetry";
const X_CLIENT_LAST_TELEM = "x-client-last-telemetry";
const X_MS_LIB_CAPABILITY = "x-ms-lib-capability";
const X_APP_NAME = "x-app-name";
const X_APP_VER = "x-app-ver";
const POST_LOGOUT_URI = "post_logout_redirect_uri";
const ID_TOKEN_HINT = "id_token_hint";
const DEVICE_CODE = "device_code";
const CLIENT_SECRET = "client_secret";
const CLIENT_ASSERTION = "client_assertion";
const CLIENT_ASSERTION_TYPE = "client_assertion_type";
const TOKEN_TYPE = "token_type";
const REQ_CNF = "req_cnf";
const OBO_ASSERTION = "assertion";
const REQUESTED_TOKEN_USE = "requested_token_use";
const ON_BEHALF_OF = "on_behalf_of";
const FOCI = "foci";
const CCS_HEADER = "X-AnchorMailbox";
const RETURN_SPA_CODE = "return_spa_code";
const NATIVE_BROKER = "nativebroker";
const LOGOUT_HINT = "logout_hint";
const SID = "sid";
const LOGIN_HINT = "login_hint";
const DOMAIN_HINT = "domain_hint";
const X_CLIENT_EXTRA_SKU = "x-client-xtra-sku";
const BROKER_CLIENT_ID = "brk_client_id";
const BROKER_REDIRECT_URI = "brk_redirect_uri";
const INSTANCE_AWARE = "instance_aware";
const EAR_JWK = "ear_jwk";
const EAR_JWE_CRYPTO = "ear_jwe_crypto";

var AADServerParamKeys = /*#__PURE__*/Object.freeze({
    __proto__: null,
    ACCESS_TOKEN: ACCESS_TOKEN,
    BROKER_CLIENT_ID: BROKER_CLIENT_ID,
    BROKER_REDIRECT_URI: BROKER_REDIRECT_URI,
    CCS_HEADER: CCS_HEADER,
    CLAIMS: CLAIMS,
    CLIENT_ASSERTION: CLIENT_ASSERTION,
    CLIENT_ASSERTION_TYPE: CLIENT_ASSERTION_TYPE,
    CLIENT_ID: CLIENT_ID,
    CLIENT_INFO: CLIENT_INFO,
    CLIENT_REQUEST_ID: CLIENT_REQUEST_ID,
    CLIENT_SECRET: CLIENT_SECRET,
    CODE: CODE,
    CODE_CHALLENGE: CODE_CHALLENGE,
    CODE_CHALLENGE_METHOD: CODE_CHALLENGE_METHOD,
    CODE_VERIFIER: CODE_VERIFIER,
    DEVICE_CODE: DEVICE_CODE,
    DOMAIN_HINT: DOMAIN_HINT,
    EAR_JWE_CRYPTO: EAR_JWE_CRYPTO,
    EAR_JWK: EAR_JWK,
    ERROR: ERROR,
    ERROR_DESCRIPTION: ERROR_DESCRIPTION,
    EXPIRES_IN: EXPIRES_IN,
    FOCI: FOCI,
    GRANT_TYPE: GRANT_TYPE,
    ID_TOKEN: ID_TOKEN,
    ID_TOKEN_HINT: ID_TOKEN_HINT,
    INSTANCE_AWARE: INSTANCE_AWARE,
    LOGIN_HINT: LOGIN_HINT,
    LOGOUT_HINT: LOGOUT_HINT,
    NATIVE_BROKER: NATIVE_BROKER,
    NONCE: NONCE,
    OBO_ASSERTION: OBO_ASSERTION,
    ON_BEHALF_OF: ON_BEHALF_OF,
    POST_LOGOUT_URI: POST_LOGOUT_URI,
    PROMPT: PROMPT,
    REDIRECT_URI: REDIRECT_URI,
    REFRESH_TOKEN: REFRESH_TOKEN,
    REFRESH_TOKEN_EXPIRES_IN: REFRESH_TOKEN_EXPIRES_IN,
    REQUESTED_TOKEN_USE: REQUESTED_TOKEN_USE,
    REQ_CNF: REQ_CNF,
    RESPONSE_MODE: RESPONSE_MODE,
    RESPONSE_TYPE: RESPONSE_TYPE,
    RETURN_SPA_CODE: RETURN_SPA_CODE,
    SCOPE: SCOPE,
    SESSION_STATE: SESSION_STATE,
    SID: SID,
    STATE: STATE,
    TOKEN_TYPE: TOKEN_TYPE,
    X_APP_NAME: X_APP_NAME,
    X_APP_VER: X_APP_VER,
    X_CLIENT_CPU: X_CLIENT_CPU,
    X_CLIENT_CURR_TELEM: X_CLIENT_CURR_TELEM,
    X_CLIENT_EXTRA_SKU: X_CLIENT_EXTRA_SKU,
    X_CLIENT_LAST_TELEM: X_CLIENT_LAST_TELEM,
    X_CLIENT_OS: X_CLIENT_OS,
    X_CLIENT_SKU: X_CLIENT_SKU,
    X_CLIENT_VER: X_CLIENT_VER,
    X_MS_LIB_CAPABILITY: X_MS_LIB_CAPABILITY
});

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const DEFAULT_CRYPTO_IMPLEMENTATION = {
    createNewGuid: () => {
        throw createClientAuthError(methodNotImplemented);
    },
    base64Decode: () => {
        throw createClientAuthError(methodNotImplemented);
    },
    base64Encode: () => {
        throw createClientAuthError(methodNotImplemented);
    },
    base64UrlEncode: () => {
        throw createClientAuthError(methodNotImplemented);
    },
    encodeKid: () => {
        throw createClientAuthError(methodNotImplemented);
    },
    async getPublicKeyThumbprint() {
        throw createClientAuthError(methodNotImplemented);
    },
    async removeTokenBindingKey() {
        throw createClientAuthError(methodNotImplemented);
    },
    async clearKeystore() {
        throw createClientAuthError(methodNotImplemented);
    },
    async signJwt() {
        throw createClientAuthError(methodNotImplemented);
    },
    async hashString() {
        throw createClientAuthError(methodNotImplemented);
    },
};

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Log message level.
 */
exports.LogLevel = void 0;
(function (LogLevel) {
    LogLevel[LogLevel["Error"] = 0] = "Error";
    LogLevel[LogLevel["Warning"] = 1] = "Warning";
    LogLevel[LogLevel["Info"] = 2] = "Info";
    LogLevel[LogLevel["Verbose"] = 3] = "Verbose";
    LogLevel[LogLevel["Trace"] = 4] = "Trace";
})(exports.LogLevel || (exports.LogLevel = {}));
/**
 * Class which facilitates logging of messages to a specific place.
 */
class Logger {
    constructor(loggerOptions, packageName, packageVersion) {
        // Current log level, defaults to info.
        this.level = exports.LogLevel.Info;
        const defaultLoggerCallback = () => {
            return;
        };
        const setLoggerOptions = loggerOptions || Logger.createDefaultLoggerOptions();
        this.localCallback =
            setLoggerOptions.loggerCallback || defaultLoggerCallback;
        this.piiLoggingEnabled = setLoggerOptions.piiLoggingEnabled || false;
        this.level =
            typeof setLoggerOptions.logLevel === "number"
                ? setLoggerOptions.logLevel
                : exports.LogLevel.Info;
        this.correlationId =
            setLoggerOptions.correlationId || Constants.EMPTY_STRING;
        this.packageName = packageName || Constants.EMPTY_STRING;
        this.packageVersion = packageVersion || Constants.EMPTY_STRING;
    }
    static createDefaultLoggerOptions() {
        return {
            loggerCallback: () => {
                // allow users to not set loggerCallback
            },
            piiLoggingEnabled: false,
            logLevel: exports.LogLevel.Info,
        };
    }
    /**
     * Create new Logger with existing configurations.
     */
    clone(packageName, packageVersion, correlationId) {
        return new Logger({
            loggerCallback: this.localCallback,
            piiLoggingEnabled: this.piiLoggingEnabled,
            logLevel: this.level,
            correlationId: correlationId || this.correlationId,
        }, packageName, packageVersion);
    }
    /**
     * Log message with required options.
     */
    logMessage(logMessage, options) {
        if (options.logLevel > this.level ||
            (!this.piiLoggingEnabled && options.containsPii)) {
            return;
        }
        const timestamp = new Date().toUTCString();
        // Add correlationId to logs if set, correlationId provided on log messages take precedence
        const logHeader = `[${timestamp}] : [${options.correlationId || this.correlationId || ""}]`;
        const log = `${logHeader} : ${this.packageName}@${this.packageVersion} : ${exports.LogLevel[options.logLevel]} - ${logMessage}`;
        // debug(`msal:${LogLevel[options.logLevel]}${options.containsPii ? "-Pii": Constants.EMPTY_STRING}${options.context ? `:${options.context}` : Constants.EMPTY_STRING}`)(logMessage);
        this.executeCallback(options.logLevel, log, options.containsPii || false);
    }
    /**
     * Execute callback with message.
     */
    executeCallback(level, message, containsPii) {
        if (this.localCallback) {
            this.localCallback(level, message, containsPii);
        }
    }
    /**
     * Logs error messages.
     */
    error(message, correlationId) {
        this.logMessage(message, {
            logLevel: exports.LogLevel.Error,
            containsPii: false,
            correlationId: correlationId || Constants.EMPTY_STRING,
        });
    }
    /**
     * Logs error messages with PII.
     */
    errorPii(message, correlationId) {
        this.logMessage(message, {
            logLevel: exports.LogLevel.Error,
            containsPii: true,
            correlationId: correlationId || Constants.EMPTY_STRING,
        });
    }
    /**
     * Logs warning messages.
     */
    warning(message, correlationId) {
        this.logMessage(message, {
            logLevel: exports.LogLevel.Warning,
            containsPii: false,
            correlationId: correlationId || Constants.EMPTY_STRING,
        });
    }
    /**
     * Logs warning messages with PII.
     */
    warningPii(message, correlationId) {
        this.logMessage(message, {
            logLevel: exports.LogLevel.Warning,
            containsPii: true,
            correlationId: correlationId || Constants.EMPTY_STRING,
        });
    }
    /**
     * Logs info messages.
     */
    info(message, correlationId) {
        this.logMessage(message, {
            logLevel: exports.LogLevel.Info,
            containsPii: false,
            correlationId: correlationId || Constants.EMPTY_STRING,
        });
    }
    /**
     * Logs info messages with PII.
     */
    infoPii(message, correlationId) {
        this.logMessage(message, {
            logLevel: exports.LogLevel.Info,
            containsPii: true,
            correlationId: correlationId || Constants.EMPTY_STRING,
        });
    }
    /**
     * Logs verbose messages.
     */
    verbose(message, correlationId) {
        this.logMessage(message, {
            logLevel: exports.LogLevel.Verbose,
            containsPii: false,
            correlationId: correlationId || Constants.EMPTY_STRING,
        });
    }
    /**
     * Logs verbose messages with PII.
     */
    verbosePii(message, correlationId) {
        this.logMessage(message, {
            logLevel: exports.LogLevel.Verbose,
            containsPii: true,
            correlationId: correlationId || Constants.EMPTY_STRING,
        });
    }
    /**
     * Logs trace messages.
     */
    trace(message, correlationId) {
        this.logMessage(message, {
            logLevel: exports.LogLevel.Trace,
            containsPii: false,
            correlationId: correlationId || Constants.EMPTY_STRING,
        });
    }
    /**
     * Logs trace messages with PII.
     */
    tracePii(message, correlationId) {
        this.logMessage(message, {
            logLevel: exports.LogLevel.Trace,
            containsPii: true,
            correlationId: correlationId || Constants.EMPTY_STRING,
        });
    }
    /**
     * Returns whether PII Logging is enabled or not.
     */
    isPiiLoggingEnabled() {
        return this.piiLoggingEnabled || false;
    }
}

/* eslint-disable header/header */
const name = "@azure/msal-common";
const version = "15.13.3";

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * The ScopeSet class creates a set of scopes. Scopes are case-insensitive, unique values, so the Set object in JS makes
 * the most sense to implement for this class. All scopes are trimmed and converted to lower case strings in intersection and union functions
 * to ensure uniqueness of strings.
 */
class ScopeSet {
    constructor(inputScopes) {
        // Filter empty string and null/undefined array items
        const scopeArr = inputScopes
            ? StringUtils.trimArrayEntries([...inputScopes])
            : [];
        const filteredInput = scopeArr
            ? StringUtils.removeEmptyStringsFromArray(scopeArr)
            : [];
        // Check if scopes array has at least one member
        if (!filteredInput || !filteredInput.length) {
            throw createClientConfigurationError(emptyInputScopesError);
        }
        this.scopes = new Set(); // Iterator in constructor not supported by IE11
        filteredInput.forEach((scope) => this.scopes.add(scope));
    }
    /**
     * Factory method to create ScopeSet from space-delimited string
     * @param inputScopeString
     * @param appClientId
     * @param scopesRequired
     */
    static fromString(inputScopeString) {
        const scopeString = inputScopeString || Constants.EMPTY_STRING;
        const inputScopes = scopeString.split(" ");
        return new ScopeSet(inputScopes);
    }
    /**
     * Creates the set of scopes to search for in cache lookups
     * @param inputScopeString
     * @returns
     */
    static createSearchScopes(inputScopeString) {
        // Handle empty scopes by using default OIDC scopes for cache lookup
        const scopesToUse = inputScopeString && inputScopeString.length > 0
            ? inputScopeString
            : [...OIDC_DEFAULT_SCOPES];
        const scopeSet = new ScopeSet(scopesToUse);
        if (!scopeSet.containsOnlyOIDCScopes()) {
            scopeSet.removeOIDCScopes();
        }
        else {
            scopeSet.removeScope(Constants.OFFLINE_ACCESS_SCOPE);
        }
        return scopeSet;
    }
    /**
     * Check if a given scope is present in this set of scopes.
     * @param scope
     */
    containsScope(scope) {
        const lowerCaseScopes = this.printScopesLowerCase().split(" ");
        const lowerCaseScopesSet = new ScopeSet(lowerCaseScopes);
        // compare lowercase scopes
        return scope
            ? lowerCaseScopesSet.scopes.has(scope.toLowerCase())
            : false;
    }
    /**
     * Check if a set of scopes is present in this set of scopes.
     * @param scopeSet
     */
    containsScopeSet(scopeSet) {
        if (!scopeSet || scopeSet.scopes.size <= 0) {
            return false;
        }
        return (this.scopes.size >= scopeSet.scopes.size &&
            scopeSet.asArray().every((scope) => this.containsScope(scope)));
    }
    /**
     * Check if set of scopes contains only the defaults
     */
    containsOnlyOIDCScopes() {
        let defaultScopeCount = 0;
        OIDC_SCOPES.forEach((defaultScope) => {
            if (this.containsScope(defaultScope)) {
                defaultScopeCount += 1;
            }
        });
        return this.scopes.size === defaultScopeCount;
    }
    /**
     * Appends single scope if passed
     * @param newScope
     */
    appendScope(newScope) {
        if (newScope) {
            this.scopes.add(newScope.trim());
        }
    }
    /**
     * Appends multiple scopes if passed
     * @param newScopes
     */
    appendScopes(newScopes) {
        try {
            newScopes.forEach((newScope) => this.appendScope(newScope));
        }
        catch (e) {
            throw createClientAuthError(cannotAppendScopeSet);
        }
    }
    /**
     * Removes element from set of scopes.
     * @param scope
     */
    removeScope(scope) {
        if (!scope) {
            throw createClientAuthError(cannotRemoveEmptyScope);
        }
        this.scopes.delete(scope.trim());
    }
    /**
     * Removes default scopes from set of scopes
     * Primarily used to prevent cache misses if the default scopes are not returned from the server
     */
    removeOIDCScopes() {
        OIDC_SCOPES.forEach((defaultScope) => {
            this.scopes.delete(defaultScope);
        });
    }
    /**
     * Combines an array of scopes with the current set of scopes.
     * @param otherScopes
     */
    unionScopeSets(otherScopes) {
        if (!otherScopes) {
            throw createClientAuthError(emptyInputScopeSet);
        }
        const unionScopes = new Set(); // Iterator in constructor not supported in IE11
        otherScopes.scopes.forEach((scope) => unionScopes.add(scope.toLowerCase()));
        this.scopes.forEach((scope) => unionScopes.add(scope.toLowerCase()));
        return unionScopes;
    }
    /**
     * Check if scopes intersect between this set and another.
     * @param otherScopes
     */
    intersectingScopeSets(otherScopes) {
        if (!otherScopes) {
            throw createClientAuthError(emptyInputScopeSet);
        }
        // Do not allow OIDC scopes to be the only intersecting scopes
        if (!otherScopes.containsOnlyOIDCScopes()) {
            otherScopes.removeOIDCScopes();
        }
        const unionScopes = this.unionScopeSets(otherScopes);
        const sizeOtherScopes = otherScopes.getScopeCount();
        const sizeThisScopes = this.getScopeCount();
        const sizeUnionScopes = unionScopes.size;
        return sizeUnionScopes < sizeThisScopes + sizeOtherScopes;
    }
    /**
     * Returns size of set of scopes.
     */
    getScopeCount() {
        return this.scopes.size;
    }
    /**
     * Returns the scopes as an array of string values
     */
    asArray() {
        const array = [];
        this.scopes.forEach((val) => array.push(val));
        return array;
    }
    /**
     * Prints scopes into a space-delimited string
     */
    printScopes() {
        if (this.scopes) {
            const scopeArr = this.asArray();
            return scopeArr.join(" ");
        }
        return Constants.EMPTY_STRING;
    }
    /**
     * Prints scopes into a space-delimited lower-case string (used for caching)
     */
    printScopesLowerCase() {
        return this.printScopes().toLowerCase();
    }
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Function to build a client info object from server clientInfo string
 * @param rawClientInfo
 * @param crypto
 */
function buildClientInfo(rawClientInfo, base64Decode) {
    if (!rawClientInfo) {
        throw createClientAuthError(clientInfoEmptyError);
    }
    try {
        const decodedClientInfo = base64Decode(rawClientInfo);
        return JSON.parse(decodedClientInfo);
    }
    catch (e) {
        throw createClientAuthError(clientInfoDecodingError);
    }
}
/**
 * Function to build a client info object from cached homeAccountId string
 * @param homeAccountId
 */
function buildClientInfoFromHomeAccountId(homeAccountId) {
    if (!homeAccountId) {
        throw createClientAuthError(clientInfoDecodingError);
    }
    const clientInfoParts = homeAccountId.split(Separators.CLIENT_INFO_SEPARATOR, 2);
    return {
        uid: clientInfoParts[0],
        utid: clientInfoParts.length < 2
            ? Constants.EMPTY_STRING
            : clientInfoParts[1],
    };
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Returns true if tenantId matches the utid portion of homeAccountId
 * @param tenantId
 * @param homeAccountId
 * @returns
 */
function tenantIdMatchesHomeTenant(tenantId, homeAccountId) {
    return (!!tenantId &&
        !!homeAccountId &&
        tenantId === homeAccountId.split(".")[1]);
}
/**
 * Build tenant profile
 * @param homeAccountId - Home account identifier for this account object
 * @param localAccountId - Local account identifer for this account object
 * @param tenantId - Full tenant or organizational id that this account belongs to
 * @param idTokenClaims - Claims from the ID token
 * @returns
 */
function buildTenantProfile(homeAccountId, localAccountId, tenantId, idTokenClaims) {
    if (idTokenClaims) {
        const { oid, sub, tid, name, tfp, acr, preferred_username, upn, login_hint, } = idTokenClaims;
        /**
         * Since there is no way to determine if the authority is AAD or B2C, we exhaust all the possible claims that can serve as tenant ID with the following precedence:
         * tid - TenantID claim that identifies the tenant that issued the token in AAD. Expected in all AAD ID tokens, not present in B2C ID Tokens.
         * tfp - Trust Framework Policy claim that identifies the policy that was used to authenticate the user. Functions as tenant for B2C scenarios.
         * acr - Authentication Context Class Reference claim used only with older B2C policies. Fallback in case tfp is not present, but likely won't be present anyway.
         */
        const tenantId = tid || tfp || acr || "";
        return {
            tenantId: tenantId,
            localAccountId: oid || sub || "",
            name: name,
            username: preferred_username || upn || "",
            loginHint: login_hint,
            isHomeTenant: tenantIdMatchesHomeTenant(tenantId, homeAccountId),
        };
    }
    else {
        return {
            tenantId,
            localAccountId,
            username: "",
            isHomeTenant: tenantIdMatchesHomeTenant(tenantId, homeAccountId),
        };
    }
}
/**
 * Replaces account info that varies by tenant profile sourced from the ID token claims passed in with the tenant-specific account info
 * @param baseAccountInfo
 * @param idTokenClaims
 * @returns
 */
function updateAccountTenantProfileData(baseAccountInfo, tenantProfile, idTokenClaims, idTokenSecret) {
    let updatedAccountInfo = baseAccountInfo;
    // Tenant Profile overrides passed in account info
    if (tenantProfile) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { isHomeTenant, ...tenantProfileOverride } = tenantProfile;
        updatedAccountInfo = { ...baseAccountInfo, ...tenantProfileOverride };
    }
    // ID token claims override passed in account info and tenant profile
    if (idTokenClaims) {
        // Ignore isHomeTenant, loginHint, and sid which are part of tenant profile but not base account info
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { isHomeTenant, ...claimsSourcedTenantProfile } = buildTenantProfile(baseAccountInfo.homeAccountId, baseAccountInfo.localAccountId, baseAccountInfo.tenantId, idTokenClaims);
        updatedAccountInfo = {
            ...updatedAccountInfo,
            ...claimsSourcedTenantProfile,
            idTokenClaims: idTokenClaims,
            idToken: idTokenSecret,
        };
        return updatedAccountInfo;
    }
    return updatedAccountInfo;
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Gets tenantId from available ID token claims to set as credential realm with the following precedence:
 * 1. tid - if the token is acquired from an Azure AD tenant tid will be present
 * 2. tfp - if the token is acquired from a modern B2C tenant tfp should be present
 * 3. acr - if the token is acquired from a legacy B2C tenant acr should be present
 * Downcased to match the realm case-insensitive comparison requirements
 * @param idTokenClaims
 * @returns
 */
function getTenantIdFromIdTokenClaims(idTokenClaims) {
    if (idTokenClaims) {
        const tenantId = idTokenClaims.tid || idTokenClaims.tfp || idTokenClaims.acr;
        return tenantId || null;
    }
    return null;
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Type that defines required and optional parameters for an Account field (based on universal cache schema implemented by all MSALs).
 *
 * Key : Value Schema
 *
 * Key: <home_account_id>-<environment>-<realm*>
 *
 * Value Schema:
 * {
 *      homeAccountId: home account identifier for the auth scheme,
 *      environment: entity that issued the token, represented as a full host
 *      realm: Full tenant or organizational identifier that the account belongs to
 *      localAccountId: Original tenant-specific accountID, usually used for legacy cases
 *      username: primary username that represents the user, usually corresponds to preferred_username in the v2 endpt
 *      authorityType: Accounts authority type as a string
 *      name: Full name for the account, including given name and family name,
 *      lastModificationTime: last time this entity was modified in the cache
 *      lastModificationApp:
 *      nativeAccountId: Account identifier on the native device
 *      tenantProfiles: Array of tenant profile objects for each tenant that the account has authenticated with in the browser
 * }
 * @internal
 */
class AccountEntity {
    /**
     * Returns the AccountInfo interface for this account.
     */
    static getAccountInfo(accountEntity) {
        return {
            homeAccountId: accountEntity.homeAccountId,
            environment: accountEntity.environment,
            tenantId: accountEntity.realm,
            username: accountEntity.username,
            localAccountId: accountEntity.localAccountId,
            loginHint: accountEntity.loginHint,
            name: accountEntity.name,
            nativeAccountId: accountEntity.nativeAccountId,
            authorityType: accountEntity.authorityType,
            // Deserialize tenant profiles array into a Map
            tenantProfiles: new Map((accountEntity.tenantProfiles || []).map((tenantProfile) => {
                return [tenantProfile.tenantId, tenantProfile];
            })),
            dataBoundary: accountEntity.dataBoundary,
        };
    }
    /**
     * Returns true if the account entity is in single tenant format (outdated), false otherwise
     */
    isSingleTenant() {
        return !this.tenantProfiles;
    }
    /**
     * Build Account cache from IdToken, clientInfo and authority/policy. Associated with AAD.
     * @param accountDetails
     */
    static createAccount(accountDetails, authority, base64Decode) {
        const account = new AccountEntity();
        if (authority.authorityType === AuthorityType.Adfs) {
            account.authorityType = CacheAccountType.ADFS_ACCOUNT_TYPE;
        }
        else if (authority.protocolMode === ProtocolMode.OIDC) {
            account.authorityType = CacheAccountType.GENERIC_ACCOUNT_TYPE;
        }
        else {
            account.authorityType = CacheAccountType.MSSTS_ACCOUNT_TYPE;
        }
        let clientInfo;
        if (accountDetails.clientInfo && base64Decode) {
            clientInfo = buildClientInfo(accountDetails.clientInfo, base64Decode);
            if (clientInfo.xms_tdbr) {
                account.dataBoundary =
                    clientInfo.xms_tdbr === "EU" ? "EU" : "None";
            }
        }
        account.clientInfo = accountDetails.clientInfo;
        account.homeAccountId = accountDetails.homeAccountId;
        account.nativeAccountId = accountDetails.nativeAccountId;
        const env = accountDetails.environment ||
            (authority && authority.getPreferredCache());
        if (!env) {
            throw createClientAuthError(invalidCacheEnvironment);
        }
        account.environment = env;
        // non AAD scenarios can have empty realm
        account.realm =
            clientInfo?.utid ||
                getTenantIdFromIdTokenClaims(accountDetails.idTokenClaims) ||
                "";
        // How do you account for MSA CID here?
        account.localAccountId =
            clientInfo?.uid ||
                accountDetails.idTokenClaims?.oid ||
                accountDetails.idTokenClaims?.sub ||
                "";
        /*
         * In B2C scenarios the emails claim is used instead of preferred_username and it is an array.
         * In most cases it will contain a single email. This field should not be relied upon if a custom
         * policy is configured to return more than 1 email.
         */
        const preferredUsername = accountDetails.idTokenClaims?.preferred_username ||
            accountDetails.idTokenClaims?.upn;
        const email = accountDetails.idTokenClaims?.emails
            ? accountDetails.idTokenClaims.emails[0]
            : null;
        account.username = preferredUsername || email || "";
        account.loginHint = accountDetails.idTokenClaims?.login_hint;
        account.name = accountDetails.idTokenClaims?.name || "";
        account.cloudGraphHostName = accountDetails.cloudGraphHostName;
        account.msGraphHost = accountDetails.msGraphHost;
        if (accountDetails.tenantProfiles) {
            account.tenantProfiles = accountDetails.tenantProfiles;
        }
        else {
            const tenantProfile = buildTenantProfile(accountDetails.homeAccountId, account.localAccountId, account.realm, accountDetails.idTokenClaims);
            account.tenantProfiles = [tenantProfile];
        }
        return account;
    }
    /**
     * Creates an AccountEntity object from AccountInfo
     * @param accountInfo
     * @param cloudGraphHostName
     * @param msGraphHost
     * @returns
     */
    static createFromAccountInfo(accountInfo, cloudGraphHostName, msGraphHost) {
        const account = new AccountEntity();
        account.authorityType =
            accountInfo.authorityType || CacheAccountType.GENERIC_ACCOUNT_TYPE;
        account.homeAccountId = accountInfo.homeAccountId;
        account.localAccountId = accountInfo.localAccountId;
        account.nativeAccountId = accountInfo.nativeAccountId;
        account.realm = accountInfo.tenantId;
        account.environment = accountInfo.environment;
        account.username = accountInfo.username;
        account.name = accountInfo.name;
        account.loginHint = accountInfo.loginHint;
        account.cloudGraphHostName = cloudGraphHostName;
        account.msGraphHost = msGraphHost;
        // Serialize tenant profiles map into an array
        account.tenantProfiles = Array.from(accountInfo.tenantProfiles?.values() || []);
        account.dataBoundary = accountInfo.dataBoundary;
        return account;
    }
    /**
     * Generate HomeAccountId from server response
     * @param serverClientInfo
     * @param authType
     */
    static generateHomeAccountId(serverClientInfo, authType, logger, cryptoObj, idTokenClaims) {
        // since ADFS/DSTS do not have tid and does not set client_info
        if (!(authType === AuthorityType.Adfs ||
            authType === AuthorityType.Dsts)) {
            // for cases where there is clientInfo
            if (serverClientInfo) {
                try {
                    const clientInfo = buildClientInfo(serverClientInfo, cryptoObj.base64Decode);
                    if (clientInfo.uid && clientInfo.utid) {
                        return `${clientInfo.uid}.${clientInfo.utid}`;
                    }
                }
                catch (e) { }
            }
            logger.warning("No client info in response");
        }
        // default to "sub" claim
        return idTokenClaims?.sub || "";
    }
    /**
     * Validates an entity: checks for all expected params
     * @param entity
     */
    static isAccountEntity(entity) {
        if (!entity) {
            return false;
        }
        return (entity.hasOwnProperty("homeAccountId") &&
            entity.hasOwnProperty("environment") &&
            entity.hasOwnProperty("realm") &&
            entity.hasOwnProperty("localAccountId") &&
            entity.hasOwnProperty("username") &&
            entity.hasOwnProperty("authorityType"));
    }
    /**
     * Helper function to determine whether 2 accountInfo objects represent the same account
     * @param accountA
     * @param accountB
     * @param compareClaims - If set to true idTokenClaims will also be compared to determine account equality
     */
    static accountInfoIsEqual(accountA, accountB, compareClaims) {
        if (!accountA || !accountB) {
            return false;
        }
        let claimsMatch = true; // default to true so as to not fail comparison below if compareClaims: false
        if (compareClaims) {
            const accountAClaims = (accountA.idTokenClaims ||
                {});
            const accountBClaims = (accountB.idTokenClaims ||
                {});
            // issued at timestamp and nonce are expected to change each time a new id token is acquired
            claimsMatch =
                accountAClaims.iat === accountBClaims.iat &&
                    accountAClaims.nonce === accountBClaims.nonce;
        }
        return (accountA.homeAccountId === accountB.homeAccountId &&
            accountA.localAccountId === accountB.localAccountId &&
            accountA.username === accountB.username &&
            accountA.tenantId === accountB.tenantId &&
            accountA.loginHint === accountB.loginHint &&
            accountA.environment === accountB.environment &&
            accountA.nativeAccountId === accountB.nativeAccountId &&
            claimsMatch);
    }
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const cacheQuotaExceeded = "cache_quota_exceeded";
const cacheErrorUnknown = "cache_error_unknown";

var CacheErrorCodes = /*#__PURE__*/Object.freeze({
    __proto__: null,
    cacheErrorUnknown: cacheErrorUnknown,
    cacheQuotaExceeded: cacheQuotaExceeded
});

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const CacheErrorMessages = {
    [cacheQuotaExceeded]: "Exceeded cache storage capacity.",
    [cacheErrorUnknown]: "Unexpected error occurred when using cache storage.",
};
/**
 * Error thrown when there is an error with the cache
 */
class CacheError extends AuthError {
    constructor(errorCode, errorMessage) {
        const message = errorMessage ||
            (CacheErrorMessages[errorCode]
                ? CacheErrorMessages[errorCode]
                : CacheErrorMessages[cacheErrorUnknown]);
        super(`${errorCode}: ${message}`);
        Object.setPrototypeOf(this, CacheError.prototype);
        this.name = "CacheError";
        this.errorCode = errorCode;
        this.errorMessage = message;
    }
}
/**
 * Helper function to wrap browser errors in a CacheError object
 * @param e
 * @returns
 */
function createCacheError(e) {
    if (!(e instanceof Error)) {
        return new CacheError(cacheErrorUnknown);
    }
    if (e.name === "QuotaExceededError" ||
        e.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
        e.message.includes("exceeded the quota")) {
        return new CacheError(cacheQuotaExceeded);
    }
    else {
        return new CacheError(e.name, e.message);
    }
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Interface class which implement cache storage functions used by MSAL to perform validity checks, and store tokens.
 * @internal
 */
class CacheManager {
    constructor(clientId, cryptoImpl, logger, performanceClient, staticAuthorityOptions) {
        this.clientId = clientId;
        this.cryptoImpl = cryptoImpl;
        this.commonLogger = logger.clone(name, version);
        this.staticAuthorityOptions = staticAuthorityOptions;
        this.performanceClient = performanceClient;
    }
    /**
     * Returns all the accounts in the cache that match the optional filter. If no filter is provided, all accounts are returned.
     * @param accountFilter - (Optional) filter to narrow down the accounts returned
     * @returns Array of AccountInfo objects in cache
     */
    getAllAccounts(accountFilter, correlationId) {
        return this.buildTenantProfiles(this.getAccountsFilteredBy(accountFilter, correlationId), correlationId, accountFilter);
    }
    /**
     * Gets first tenanted AccountInfo object found based on provided filters
     */
    getAccountInfoFilteredBy(accountFilter, correlationId) {
        if (Object.keys(accountFilter).length === 0 ||
            Object.values(accountFilter).every((value) => !value)) {
            this.commonLogger.warning("getAccountInfoFilteredBy: Account filter is empty or invalid, returning null");
            return null;
        }
        const allAccounts = this.getAllAccounts(accountFilter, correlationId);
        if (allAccounts.length > 1) {
            // If one or more accounts are found, prioritize accounts that have an ID token
            const sortedAccounts = allAccounts.sort((account) => {
                return account.idTokenClaims ? -1 : 1;
            });
            return sortedAccounts[0];
        }
        else if (allAccounts.length === 1) {
            // If only one account is found, return it regardless of whether a matching ID token was found
            return allAccounts[0];
        }
        else {
            return null;
        }
    }
    /**
     * Returns a single matching
     * @param accountFilter
     * @returns
     */
    getBaseAccountInfo(accountFilter, correlationId) {
        const accountEntities = this.getAccountsFilteredBy(accountFilter, correlationId);
        if (accountEntities.length > 0) {
            return AccountEntity.getAccountInfo(accountEntities[0]);
        }
        else {
            return null;
        }
    }
    /**
     * Matches filtered account entities with cached ID tokens that match the tenant profile-specific account filters
     * and builds the account info objects from the matching ID token's claims
     * @param cachedAccounts
     * @param accountFilter
     * @returns Array of AccountInfo objects that match account and tenant profile filters
     */
    buildTenantProfiles(cachedAccounts, correlationId, accountFilter) {
        return cachedAccounts.flatMap((accountEntity) => {
            return this.getTenantProfilesFromAccountEntity(accountEntity, correlationId, accountFilter?.tenantId, accountFilter);
        });
    }
    getTenantedAccountInfoByFilter(accountInfo, tokenKeys, tenantProfile, correlationId, tenantProfileFilter) {
        let tenantedAccountInfo = null;
        let idTokenClaims;
        if (tenantProfileFilter) {
            if (!this.tenantProfileMatchesFilter(tenantProfile, tenantProfileFilter)) {
                return null;
            }
        }
        const idToken = this.getIdToken(accountInfo, correlationId, tokenKeys, tenantProfile.tenantId);
        if (idToken) {
            idTokenClaims = extractTokenClaims(idToken.secret, this.cryptoImpl.base64Decode);
            if (!this.idTokenClaimsMatchTenantProfileFilter(idTokenClaims, tenantProfileFilter)) {
                // ID token sourced claims don't match so this tenant profile is not a match
                return null;
            }
        }
        // Expand tenant profile into account info based on matching tenant profile and if available matching ID token claims
        tenantedAccountInfo = updateAccountTenantProfileData(accountInfo, tenantProfile, idTokenClaims, idToken?.secret);
        return tenantedAccountInfo;
    }
    getTenantProfilesFromAccountEntity(accountEntity, correlationId, targetTenantId, tenantProfileFilter) {
        const accountInfo = AccountEntity.getAccountInfo(accountEntity);
        let searchTenantProfiles = accountInfo.tenantProfiles || new Map();
        const tokenKeys = this.getTokenKeys();
        // If a tenant ID was provided, only return the tenant profile for that tenant ID if it exists
        if (targetTenantId) {
            const tenantProfile = searchTenantProfiles.get(targetTenantId);
            if (tenantProfile) {
                // Reduce search field to just this tenant profile
                searchTenantProfiles = new Map([
                    [targetTenantId, tenantProfile],
                ]);
            }
            else {
                // No tenant profile for search tenant ID, return empty array
                return [];
            }
        }
        const matchingTenantProfiles = [];
        searchTenantProfiles.forEach((tenantProfile) => {
            const tenantedAccountInfo = this.getTenantedAccountInfoByFilter(accountInfo, tokenKeys, tenantProfile, correlationId, tenantProfileFilter);
            if (tenantedAccountInfo) {
                matchingTenantProfiles.push(tenantedAccountInfo);
            }
        });
        return matchingTenantProfiles;
    }
    tenantProfileMatchesFilter(tenantProfile, tenantProfileFilter) {
        if (!!tenantProfileFilter.localAccountId &&
            !this.matchLocalAccountIdFromTenantProfile(tenantProfile, tenantProfileFilter.localAccountId)) {
            return false;
        }
        if (!!tenantProfileFilter.name &&
            !(tenantProfile.name === tenantProfileFilter.name)) {
            return false;
        }
        if (tenantProfileFilter.isHomeTenant !== undefined &&
            !(tenantProfile.isHomeTenant === tenantProfileFilter.isHomeTenant)) {
            return false;
        }
        return true;
    }
    idTokenClaimsMatchTenantProfileFilter(idTokenClaims, tenantProfileFilter) {
        // Tenant Profile filtering
        if (tenantProfileFilter) {
            if (!!tenantProfileFilter.localAccountId &&
                !this.matchLocalAccountIdFromTokenClaims(idTokenClaims, tenantProfileFilter.localAccountId)) {
                return false;
            }
            if (!!tenantProfileFilter.loginHint &&
                !this.matchLoginHintFromTokenClaims(idTokenClaims, tenantProfileFilter.loginHint)) {
                return false;
            }
            if (!!tenantProfileFilter.username &&
                !this.matchUsername(idTokenClaims.preferred_username, tenantProfileFilter.username)) {
                return false;
            }
            if (!!tenantProfileFilter.name &&
                !this.matchName(idTokenClaims, tenantProfileFilter.name)) {
                return false;
            }
            if (!!tenantProfileFilter.sid &&
                !this.matchSid(idTokenClaims, tenantProfileFilter.sid)) {
                return false;
            }
        }
        return true;
    }
    /**
     * saves a cache record
     * @param cacheRecord {CacheRecord}
     * @param correlationId {?string} correlation id
     * @param kmsi - Keep Me Signed In
     * @param storeInCache {?StoreInCache}
     */
    async saveCacheRecord(cacheRecord, correlationId, kmsi, storeInCache) {
        if (!cacheRecord) {
            throw createClientAuthError(invalidCacheRecord);
        }
        try {
            if (!!cacheRecord.account) {
                await this.setAccount(cacheRecord.account, correlationId, kmsi);
            }
            if (!!cacheRecord.idToken && storeInCache?.idToken !== false) {
                await this.setIdTokenCredential(cacheRecord.idToken, correlationId, kmsi);
            }
            if (!!cacheRecord.accessToken &&
                storeInCache?.accessToken !== false) {
                await this.saveAccessToken(cacheRecord.accessToken, correlationId, kmsi);
            }
            if (!!cacheRecord.refreshToken &&
                storeInCache?.refreshToken !== false) {
                await this.setRefreshTokenCredential(cacheRecord.refreshToken, correlationId, kmsi);
            }
            if (!!cacheRecord.appMetadata) {
                this.setAppMetadata(cacheRecord.appMetadata, correlationId);
            }
        }
        catch (e) {
            this.commonLogger?.error(`CacheManager.saveCacheRecord: failed`);
            if (e instanceof AuthError) {
                throw e;
            }
            else {
                throw createCacheError(e);
            }
        }
    }
    /**
     * saves access token credential
     * @param credential
     */
    async saveAccessToken(credential, correlationId, kmsi) {
        const accessTokenFilter = {
            clientId: credential.clientId,
            credentialType: credential.credentialType,
            environment: credential.environment,
            homeAccountId: credential.homeAccountId,
            realm: credential.realm,
            tokenType: credential.tokenType,
            requestedClaimsHash: credential.requestedClaimsHash,
        };
        const tokenKeys = this.getTokenKeys();
        const currentScopes = ScopeSet.fromString(credential.target);
        tokenKeys.accessToken.forEach((key) => {
            if (!this.accessTokenKeyMatchesFilter(key, accessTokenFilter, false)) {
                return;
            }
            const tokenEntity = this.getAccessTokenCredential(key, correlationId);
            if (tokenEntity &&
                this.credentialMatchesFilter(tokenEntity, accessTokenFilter)) {
                const tokenScopeSet = ScopeSet.fromString(tokenEntity.target);
                if (tokenScopeSet.intersectingScopeSets(currentScopes)) {
                    this.removeAccessToken(key, correlationId);
                }
            }
        });
        await this.setAccessTokenCredential(credential, correlationId, kmsi);
    }
    /**
     * Retrieve account entities matching all provided tenant-agnostic filters; if no filter is set, get all account entities in the cache
     * Not checking for casing as keys are all generated in lower case, remember to convert to lower case if object properties are compared
     * @param accountFilter - An object containing Account properties to filter by
     */
    getAccountsFilteredBy(accountFilter, correlationId) {
        const allAccountKeys = this.getAccountKeys();
        const matchingAccounts = [];
        allAccountKeys.forEach((cacheKey) => {
            const entity = this.getAccount(cacheKey, correlationId);
            // Match base account fields
            if (!entity) {
                return;
            }
            if (!!accountFilter.homeAccountId &&
                !this.matchHomeAccountId(entity, accountFilter.homeAccountId)) {
                return;
            }
            if (!!accountFilter.username &&
                !this.matchUsername(entity.username, accountFilter.username)) {
                return;
            }
            if (!!accountFilter.environment &&
                !this.matchEnvironment(entity, accountFilter.environment)) {
                return;
            }
            if (!!accountFilter.realm &&
                !this.matchRealm(entity, accountFilter.realm)) {
                return;
            }
            if (!!accountFilter.nativeAccountId &&
                !this.matchNativeAccountId(entity, accountFilter.nativeAccountId)) {
                return;
            }
            if (!!accountFilter.authorityType &&
                !this.matchAuthorityType(entity, accountFilter.authorityType)) {
                return;
            }
            // If at least one tenant profile matches the tenant profile filter, add the account to the list of matching accounts
            const tenantProfileFilter = {
                localAccountId: accountFilter?.localAccountId,
                name: accountFilter?.name,
            };
            const matchingTenantProfiles = entity.tenantProfiles?.filter((tenantProfile) => {
                return this.tenantProfileMatchesFilter(tenantProfile, tenantProfileFilter);
            });
            if (matchingTenantProfiles && matchingTenantProfiles.length === 0) {
                // No tenant profile for this account matches filter, don't add to list of matching accounts
                return;
            }
            matchingAccounts.push(entity);
        });
        return matchingAccounts;
    }
    /**
     * Returns whether or not the given credential entity matches the filter
     * @param entity
     * @param filter
     * @returns
     */
    credentialMatchesFilter(entity, filter) {
        if (!!filter.clientId && !this.matchClientId(entity, filter.clientId)) {
            return false;
        }
        if (!!filter.userAssertionHash &&
            !this.matchUserAssertionHash(entity, filter.userAssertionHash)) {
            return false;
        }
        /*
         * homeAccountId can be undefined, and we want to filter out cached items that have a homeAccountId of ""
         * because we don't want a client_credential request to return a cached token that has a homeAccountId
         */
        if (typeof filter.homeAccountId === "string" &&
            !this.matchHomeAccountId(entity, filter.homeAccountId)) {
            return false;
        }
        if (!!filter.environment &&
            !this.matchEnvironment(entity, filter.environment)) {
            return false;
        }
        if (!!filter.realm && !this.matchRealm(entity, filter.realm)) {
            return false;
        }
        if (!!filter.credentialType &&
            !this.matchCredentialType(entity, filter.credentialType)) {
            return false;
        }
        if (!!filter.familyId && !this.matchFamilyId(entity, filter.familyId)) {
            return false;
        }
        /*
         * idTokens do not have "target", target specific refreshTokens do exist for some types of authentication
         * Resource specific refresh tokens case will be added when the support is deemed necessary
         */
        if (!!filter.target && !this.matchTarget(entity, filter.target)) {
            return false;
        }
        // If request OR cached entity has requested Claims Hash, check if they match
        if (filter.requestedClaimsHash || entity.requestedClaimsHash) {
            // Don't match if either is undefined or they are different
            if (entity.requestedClaimsHash !== filter.requestedClaimsHash) {
                return false;
            }
        }
        // Access Token with Auth Scheme specific matching
        if (entity.credentialType ===
            CredentialType.ACCESS_TOKEN_WITH_AUTH_SCHEME) {
            if (!!filter.tokenType &&
                !this.matchTokenType(entity, filter.tokenType)) {
                return false;
            }
            // KeyId (sshKid) in request must match cached SSH certificate keyId because SSH cert is bound to a specific key
            if (filter.tokenType === AuthenticationScheme.SSH) {
                if (filter.keyId && !this.matchKeyId(entity, filter.keyId)) {
                    return false;
                }
            }
        }
        return true;
    }
    /**
     * retrieve appMetadata matching all provided filters; if no filter is set, get all appMetadata
     * @param filter
     */
    getAppMetadataFilteredBy(filter) {
        const allCacheKeys = this.getKeys();
        const matchingAppMetadata = {};
        allCacheKeys.forEach((cacheKey) => {
            // don't parse any non-appMetadata type cache entities
            if (!this.isAppMetadata(cacheKey)) {
                return;
            }
            // Attempt retrieval
            const entity = this.getAppMetadata(cacheKey);
            if (!entity) {
                return;
            }
            if (!!filter.environment &&
                !this.matchEnvironment(entity, filter.environment)) {
                return;
            }
            if (!!filter.clientId &&
                !this.matchClientId(entity, filter.clientId)) {
                return;
            }
            matchingAppMetadata[cacheKey] = entity;
        });
        return matchingAppMetadata;
    }
    /**
     * retrieve authorityMetadata that contains a matching alias
     * @param filter
     */
    getAuthorityMetadataByAlias(host) {
        const allCacheKeys = this.getAuthorityMetadataKeys();
        let matchedEntity = null;
        allCacheKeys.forEach((cacheKey) => {
            // don't parse any non-authorityMetadata type cache entities
            if (!this.isAuthorityMetadata(cacheKey) ||
                cacheKey.indexOf(this.clientId) === -1) {
                return;
            }
            // Attempt retrieval
            const entity = this.getAuthorityMetadata(cacheKey);
            if (!entity) {
                return;
            }
            if (entity.aliases.indexOf(host) === -1) {
                return;
            }
            matchedEntity = entity;
        });
        return matchedEntity;
    }
    /**
     * Removes all accounts and related tokens from cache.
     */
    removeAllAccounts(correlationId) {
        const accounts = this.getAllAccounts({}, correlationId);
        accounts.forEach((account) => {
            this.removeAccount(account, correlationId);
        });
    }
    /**
     * Removes the account and related tokens for a given account key
     * @param account
     */
    removeAccount(account, correlationId) {
        this.removeAccountContext(account, correlationId);
        const accountKeys = this.getAccountKeys();
        const keyFilter = (key) => {
            return (key.includes(account.homeAccountId) &&
                key.includes(account.environment));
        };
        accountKeys.filter(keyFilter).forEach((key) => {
            this.removeItem(key, correlationId);
            this.performanceClient.incrementFields({ accountsRemoved: 1 }, correlationId);
        });
    }
    /**
     * Removes credentials associated with the provided account
     * @param account
     */
    removeAccountContext(account, correlationId) {
        const allTokenKeys = this.getTokenKeys();
        const keyFilter = (key) => {
            return (key.includes(account.homeAccountId) &&
                key.includes(account.environment));
        };
        allTokenKeys.idToken.filter(keyFilter).forEach((key) => {
            this.removeIdToken(key, correlationId);
        });
        allTokenKeys.accessToken.filter(keyFilter).forEach((key) => {
            this.removeAccessToken(key, correlationId);
        });
        allTokenKeys.refreshToken.filter(keyFilter).forEach((key) => {
            this.removeRefreshToken(key, correlationId);
        });
    }
    /**
     * Removes accessToken from the cache
     * @param key
     * @param correlationId
     */
    removeAccessToken(key, correlationId) {
        const credential = this.getAccessTokenCredential(key, correlationId);
        this.removeItem(key, correlationId);
        this.performanceClient.incrementFields({ accessTokensRemoved: 1 }, correlationId);
        if (!credential ||
            credential.credentialType.toLowerCase() !==
                CredentialType.ACCESS_TOKEN_WITH_AUTH_SCHEME.toLowerCase() ||
            credential.tokenType !== AuthenticationScheme.POP) {
            // If the credential is not a PoP token, we can return
            return;
        }
        // Remove Token Binding Key from key store for PoP Tokens Credentials
        const kid = credential.keyId;
        if (kid) {
            void this.cryptoImpl.removeTokenBindingKey(kid).catch(() => {
                this.commonLogger.error(`Failed to remove token binding key ${kid}`, correlationId);
                this.performanceClient?.incrementFields({ removeTokenBindingKeyFailure: 1 }, correlationId);
            });
        }
    }
    /**
     * Removes all app metadata objects from cache.
     */
    removeAppMetadata(correlationId) {
        const allCacheKeys = this.getKeys();
        allCacheKeys.forEach((cacheKey) => {
            if (this.isAppMetadata(cacheKey)) {
                this.removeItem(cacheKey, correlationId);
            }
        });
        return true;
    }
    /**
     * Retrieve IdTokenEntity from cache
     * @param account {AccountInfo}
     * @param tokenKeys {?TokenKeys}
     * @param targetRealm {?string}
     * @param performanceClient {?IPerformanceClient}
     * @param correlationId {?string}
     */
    getIdToken(account, correlationId, tokenKeys, targetRealm, performanceClient) {
        this.commonLogger.trace("CacheManager - getIdToken called");
        const idTokenFilter = {
            homeAccountId: account.homeAccountId,
            environment: account.environment,
            credentialType: CredentialType.ID_TOKEN,
            clientId: this.clientId,
            realm: targetRealm,
        };
        const idTokenMap = this.getIdTokensByFilter(idTokenFilter, correlationId, tokenKeys);
        const numIdTokens = idTokenMap.size;
        if (numIdTokens < 1) {
            this.commonLogger.info("CacheManager:getIdToken - No token found");
            return null;
        }
        else if (numIdTokens > 1) {
            let tokensToBeRemoved = idTokenMap;
            // Multiple tenant profiles and no tenant specified, pick home account
            if (!targetRealm) {
                const homeIdTokenMap = new Map();
                idTokenMap.forEach((idToken, key) => {
                    if (idToken.realm === account.tenantId) {
                        homeIdTokenMap.set(key, idToken);
                    }
                });
                const numHomeIdTokens = homeIdTokenMap.size;
                if (numHomeIdTokens < 1) {
                    this.commonLogger.info("CacheManager:getIdToken - Multiple ID tokens found for account but none match account entity tenant id, returning first result");
                    return idTokenMap.values().next().value;
                }
                else if (numHomeIdTokens === 1) {
                    this.commonLogger.info("CacheManager:getIdToken - Multiple ID tokens found for account, defaulting to home tenant profile");
                    return homeIdTokenMap.values().next().value;
                }
                else {
                    // Multiple ID tokens for home tenant profile, remove all and return null
                    tokensToBeRemoved = homeIdTokenMap;
                }
            }
            // Multiple tokens for a single tenant profile, remove all and return null
            this.commonLogger.info("CacheManager:getIdToken - Multiple matching ID tokens found, clearing them");
            tokensToBeRemoved.forEach((idToken, key) => {
                this.removeIdToken(key, correlationId);
            });
            if (performanceClient && correlationId) {
                performanceClient.addFields({ multiMatchedID: idTokenMap.size }, correlationId);
            }
            return null;
        }
        this.commonLogger.info("CacheManager:getIdToken - Returning ID token");
        return idTokenMap.values().next().value;
    }
    /**
     * Gets all idTokens matching the given filter
     * @param filter
     * @returns
     */
    getIdTokensByFilter(filter, correlationId, tokenKeys) {
        const idTokenKeys = (tokenKeys && tokenKeys.idToken) || this.getTokenKeys().idToken;
        const idTokens = new Map();
        idTokenKeys.forEach((key) => {
            if (!this.idTokenKeyMatchesFilter(key, {
                clientId: this.clientId,
                ...filter,
            })) {
                return;
            }
            const idToken = this.getIdTokenCredential(key, correlationId);
            if (idToken && this.credentialMatchesFilter(idToken, filter)) {
                idTokens.set(key, idToken);
            }
        });
        return idTokens;
    }
    /**
     * Validate the cache key against filter before retrieving and parsing cache value
     * @param key
     * @param filter
     * @returns
     */
    idTokenKeyMatchesFilter(inputKey, filter) {
        const key = inputKey.toLowerCase();
        if (filter.clientId &&
            key.indexOf(filter.clientId.toLowerCase()) === -1) {
            return false;
        }
        if (filter.homeAccountId &&
            key.indexOf(filter.homeAccountId.toLowerCase()) === -1) {
            return false;
        }
        return true;
    }
    /**
     * Removes idToken from the cache
     * @param key
     */
    removeIdToken(key, correlationId) {
        this.removeItem(key, correlationId);
    }
    /**
     * Removes refresh token from the cache
     * @param key
     */
    removeRefreshToken(key, correlationId) {
        this.removeItem(key, correlationId);
    }
    /**
     * Retrieve AccessTokenEntity from cache
     * @param account {AccountInfo}
     * @param request {BaseAuthRequest}
     * @param correlationId {?string}
     * @param tokenKeys {?TokenKeys}
     * @param performanceClient {?IPerformanceClient}
     */
    getAccessToken(account, request, tokenKeys, targetRealm) {
        const correlationId = request.correlationId;
        this.commonLogger.trace("CacheManager - getAccessToken called", correlationId);
        const scopes = ScopeSet.createSearchScopes(request.scopes);
        const authScheme = request.authenticationScheme || AuthenticationScheme.BEARER;
        /*
         * Distinguish between Bearer and PoP/SSH token cache types
         * Cast to lowercase to handle "bearer" from ADFS
         */
        const credentialType = authScheme &&
            authScheme.toLowerCase() !==
                AuthenticationScheme.BEARER.toLowerCase()
            ? CredentialType.ACCESS_TOKEN_WITH_AUTH_SCHEME
            : CredentialType.ACCESS_TOKEN;
        const accessTokenFilter = {
            homeAccountId: account.homeAccountId,
            environment: account.environment,
            credentialType: credentialType,
            clientId: this.clientId,
            realm: targetRealm || account.tenantId,
            target: scopes,
            tokenType: authScheme,
            keyId: request.sshKid,
            requestedClaimsHash: request.requestedClaimsHash,
        };
        const accessTokenKeys = (tokenKeys && tokenKeys.accessToken) ||
            this.getTokenKeys().accessToken;
        const accessTokens = [];
        accessTokenKeys.forEach((key) => {
            // Validate key
            if (this.accessTokenKeyMatchesFilter(key, accessTokenFilter, true)) {
                const accessToken = this.getAccessTokenCredential(key, correlationId);
                // Validate value
                if (accessToken &&
                    this.credentialMatchesFilter(accessToken, accessTokenFilter)) {
                    accessTokens.push(accessToken);
                }
            }
        });
        const numAccessTokens = accessTokens.length;
        if (numAccessTokens < 1) {
            this.commonLogger.info("CacheManager:getAccessToken - No token found", correlationId);
            return null;
        }
        else if (numAccessTokens > 1) {
            this.commonLogger.info("CacheManager:getAccessToken - Multiple access tokens found, clearing them", correlationId);
            accessTokens.forEach((accessToken) => {
                this.removeAccessToken(this.generateCredentialKey(accessToken), correlationId);
            });
            this.performanceClient.addFields({ multiMatchedAT: accessTokens.length }, correlationId);
            return null;
        }
        this.commonLogger.info("CacheManager:getAccessToken - Returning access token", correlationId);
        return accessTokens[0];
    }
    /**
     * Validate the cache key against filter before retrieving and parsing cache value
     * @param key
     * @param filter
     * @param keyMustContainAllScopes
     * @returns
     */
    accessTokenKeyMatchesFilter(inputKey, filter, keyMustContainAllScopes) {
        const key = inputKey.toLowerCase();
        if (filter.clientId &&
            key.indexOf(filter.clientId.toLowerCase()) === -1) {
            return false;
        }
        if (filter.homeAccountId &&
            key.indexOf(filter.homeAccountId.toLowerCase()) === -1) {
            return false;
        }
        if (filter.realm && key.indexOf(filter.realm.toLowerCase()) === -1) {
            return false;
        }
        if (filter.requestedClaimsHash &&
            key.indexOf(filter.requestedClaimsHash.toLowerCase()) === -1) {
            return false;
        }
        if (filter.target) {
            const scopes = filter.target.asArray();
            for (let i = 0; i < scopes.length; i++) {
                if (keyMustContainAllScopes &&
                    !key.includes(scopes[i].toLowerCase())) {
                    // When performing a cache lookup a missing scope would be a cache miss
                    return false;
                }
                else if (!keyMustContainAllScopes &&
                    key.includes(scopes[i].toLowerCase())) {
                    // When performing a cache write, any token with a subset of requested scopes should be replaced
                    return true;
                }
            }
        }
        return true;
    }
    /**
     * Gets all access tokens matching the filter
     * @param filter
     * @returns
     */
    getAccessTokensByFilter(filter, correlationId) {
        const tokenKeys = this.getTokenKeys();
        const accessTokens = [];
        tokenKeys.accessToken.forEach((key) => {
            if (!this.accessTokenKeyMatchesFilter(key, filter, true)) {
                return;
            }
            const accessToken = this.getAccessTokenCredential(key, correlationId);
            if (accessToken &&
                this.credentialMatchesFilter(accessToken, filter)) {
                accessTokens.push(accessToken);
            }
        });
        return accessTokens;
    }
    /**
     * Helper to retrieve the appropriate refresh token from cache
     * @param account {AccountInfo}
     * @param familyRT {boolean}
     * @param correlationId {?string}
     * @param tokenKeys {?TokenKeys}
     * @param performanceClient {?IPerformanceClient}
     */
    getRefreshToken(account, familyRT, correlationId, tokenKeys, performanceClient) {
        this.commonLogger.trace("CacheManager - getRefreshToken called");
        const id = familyRT ? THE_FAMILY_ID : undefined;
        const refreshTokenFilter = {
            homeAccountId: account.homeAccountId,
            environment: account.environment,
            credentialType: CredentialType.REFRESH_TOKEN,
            clientId: this.clientId,
            familyId: id,
        };
        const refreshTokenKeys = (tokenKeys && tokenKeys.refreshToken) ||
            this.getTokenKeys().refreshToken;
        const refreshTokens = [];
        refreshTokenKeys.forEach((key) => {
            // Validate key
            if (this.refreshTokenKeyMatchesFilter(key, refreshTokenFilter)) {
                const refreshToken = this.getRefreshTokenCredential(key, correlationId);
                // Validate value
                if (refreshToken &&
                    this.credentialMatchesFilter(refreshToken, refreshTokenFilter)) {
                    refreshTokens.push(refreshToken);
                }
            }
        });
        const numRefreshTokens = refreshTokens.length;
        if (numRefreshTokens < 1) {
            this.commonLogger.info("CacheManager:getRefreshToken - No refresh token found.");
            return null;
        }
        // address the else case after remove functions address environment aliases
        if (numRefreshTokens > 1 && performanceClient && correlationId) {
            performanceClient.addFields({ multiMatchedRT: numRefreshTokens }, correlationId);
        }
        this.commonLogger.info("CacheManager:getRefreshToken - returning refresh token");
        return refreshTokens[0];
    }
    /**
     * Validate the cache key against filter before retrieving and parsing cache value
     * @param key
     * @param filter
     */
    refreshTokenKeyMatchesFilter(inputKey, filter) {
        const key = inputKey.toLowerCase();
        if (filter.familyId &&
            key.indexOf(filter.familyId.toLowerCase()) === -1) {
            return false;
        }
        // If familyId is used, clientId is not in the key
        if (!filter.familyId &&
            filter.clientId &&
            key.indexOf(filter.clientId.toLowerCase()) === -1) {
            return false;
        }
        if (filter.homeAccountId &&
            key.indexOf(filter.homeAccountId.toLowerCase()) === -1) {
            return false;
        }
        return true;
    }
    /**
     * Retrieve AppMetadataEntity from cache
     */
    readAppMetadataFromCache(environment) {
        const appMetadataFilter = {
            environment,
            clientId: this.clientId,
        };
        const appMetadata = this.getAppMetadataFilteredBy(appMetadataFilter);
        const appMetadataEntries = Object.keys(appMetadata).map((key) => appMetadata[key]);
        const numAppMetadata = appMetadataEntries.length;
        if (numAppMetadata < 1) {
            return null;
        }
        else if (numAppMetadata > 1) {
            throw createClientAuthError(multipleMatchingAppMetadata);
        }
        return appMetadataEntries[0];
    }
    /**
     * Return the family_id value associated  with FOCI
     * @param environment
     * @param clientId
     */
    isAppMetadataFOCI(environment) {
        const appMetadata = this.readAppMetadataFromCache(environment);
        return !!(appMetadata && appMetadata.familyId === THE_FAMILY_ID);
    }
    /**
     * helper to match account ids
     * @param value
     * @param homeAccountId
     */
    matchHomeAccountId(entity, homeAccountId) {
        return !!(typeof entity.homeAccountId === "string" &&
            homeAccountId === entity.homeAccountId);
    }
    /**
     * helper to match account ids
     * @param entity
     * @param localAccountId
     * @returns
     */
    matchLocalAccountIdFromTokenClaims(tokenClaims, localAccountId) {
        const idTokenLocalAccountId = tokenClaims.oid || tokenClaims.sub;
        return localAccountId === idTokenLocalAccountId;
    }
    matchLocalAccountIdFromTenantProfile(tenantProfile, localAccountId) {
        return tenantProfile.localAccountId === localAccountId;
    }
    /**
     * helper to match names
     * @param entity
     * @param name
     * @returns true if the downcased name properties are present and match in the filter and the entity
     */
    matchName(claims, name) {
        return !!(name.toLowerCase() === claims.name?.toLowerCase());
    }
    /**
     * helper to match usernames
     * @param entity
     * @param username
     * @returns
     */
    matchUsername(cachedUsername, filterUsername) {
        return !!(cachedUsername &&
            typeof cachedUsername === "string" &&
            filterUsername?.toLowerCase() === cachedUsername.toLowerCase());
    }
    /**
     * helper to match assertion
     * @param value
     * @param oboAssertion
     */
    matchUserAssertionHash(entity, userAssertionHash) {
        return !!(entity.userAssertionHash &&
            userAssertionHash === entity.userAssertionHash);
    }
    /**
     * helper to match environment
     * @param value
     * @param environment
     */
    matchEnvironment(entity, environment) {
        // Check static authority options first for cases where authority metadata has not been resolved and cached yet
        if (this.staticAuthorityOptions) {
            const staticAliases = getAliasesFromStaticSources(this.staticAuthorityOptions, this.commonLogger);
            if (staticAliases.includes(environment) &&
                staticAliases.includes(entity.environment)) {
                return true;
            }
        }
        // Query metadata cache if no static authority configuration has aliases that match enviroment
        const cloudMetadata = this.getAuthorityMetadataByAlias(environment);
        if (cloudMetadata &&
            cloudMetadata.aliases.indexOf(entity.environment) > -1) {
            return true;
        }
        return false;
    }
    /**
     * helper to match credential type
     * @param entity
     * @param credentialType
     */
    matchCredentialType(entity, credentialType) {
        return (entity.credentialType &&
            credentialType.toLowerCase() === entity.credentialType.toLowerCase());
    }
    /**
     * helper to match client ids
     * @param entity
     * @param clientId
     */
    matchClientId(entity, clientId) {
        return !!(entity.clientId && clientId === entity.clientId);
    }
    /**
     * helper to match family ids
     * @param entity
     * @param familyId
     */
    matchFamilyId(entity, familyId) {
        return !!(entity.familyId && familyId === entity.familyId);
    }
    /**
     * helper to match realm
     * @param entity
     * @param realm
     */
    matchRealm(entity, realm) {
        return !!(entity.realm?.toLowerCase() === realm.toLowerCase());
    }
    /**
     * helper to match nativeAccountId
     * @param entity
     * @param nativeAccountId
     * @returns boolean indicating the match result
     */
    matchNativeAccountId(entity, nativeAccountId) {
        return !!(entity.nativeAccountId && nativeAccountId === entity.nativeAccountId);
    }
    /**
     * helper to match loginHint which can be either:
     * 1. login_hint ID token claim
     * 2. username in cached account object
     * 3. upn in ID token claims
     * @param entity
     * @param loginHint
     * @returns
     */
    matchLoginHintFromTokenClaims(tokenClaims, loginHint) {
        if (tokenClaims.login_hint === loginHint) {
            return true;
        }
        if (tokenClaims.preferred_username === loginHint) {
            return true;
        }
        if (tokenClaims.upn === loginHint) {
            return true;
        }
        return false;
    }
    /**
     * Helper to match sid
     * @param entity
     * @param sid
     * @returns true if the sid claim is present and matches the filter
     */
    matchSid(idTokenClaims, sid) {
        return idTokenClaims.sid === sid;
    }
    matchAuthorityType(entity, authorityType) {
        return !!(entity.authorityType &&
            authorityType.toLowerCase() === entity.authorityType.toLowerCase());
    }
    /**
     * Returns true if the target scopes are a subset of the current entity's scopes, false otherwise.
     * @param entity
     * @param target
     */
    matchTarget(entity, target) {
        const isNotAccessTokenCredential = entity.credentialType !== CredentialType.ACCESS_TOKEN &&
            entity.credentialType !==
                CredentialType.ACCESS_TOKEN_WITH_AUTH_SCHEME;
        if (isNotAccessTokenCredential || !entity.target) {
            return false;
        }
        const entityScopeSet = ScopeSet.fromString(entity.target);
        return entityScopeSet.containsScopeSet(target);
    }
    /**
     * Returns true if the credential's tokenType or Authentication Scheme matches the one in the request, false otherwise
     * @param entity
     * @param tokenType
     */
    matchTokenType(entity, tokenType) {
        return !!(entity.tokenType && entity.tokenType === tokenType);
    }
    /**
     * Returns true if the credential's keyId matches the one in the request, false otherwise
     * @param entity
     * @param keyId
     */
    matchKeyId(entity, keyId) {
        return !!(entity.keyId && entity.keyId === keyId);
    }
    /**
     * returns if a given cache entity is of the type appmetadata
     * @param key
     */
    isAppMetadata(key) {
        return key.indexOf(APP_METADATA) !== -1;
    }
    /**
     * returns if a given cache entity is of the type authoritymetadata
     * @param key
     */
    isAuthorityMetadata(key) {
        return key.indexOf(AUTHORITY_METADATA_CONSTANTS.CACHE_KEY) !== -1;
    }
    /**
     * returns cache key used for cloud instance metadata
     */
    generateAuthorityMetadataCacheKey(authority) {
        return `${AUTHORITY_METADATA_CONSTANTS.CACHE_KEY}-${this.clientId}-${authority}`;
    }
    /**
     * Helper to convert serialized data to object
     * @param obj
     * @param json
     */
    static toObject(obj, json) {
        for (const propertyName in json) {
            obj[propertyName] = json[propertyName];
        }
        return obj;
    }
}
/** @internal */
class DefaultStorageClass extends CacheManager {
    async setAccount() {
        throw createClientAuthError(methodNotImplemented);
    }
    getAccount() {
        throw createClientAuthError(methodNotImplemented);
    }
    async setIdTokenCredential() {
        throw createClientAuthError(methodNotImplemented);
    }
    getIdTokenCredential() {
        throw createClientAuthError(methodNotImplemented);
    }
    async setAccessTokenCredential() {
        throw createClientAuthError(methodNotImplemented);
    }
    getAccessTokenCredential() {
        throw createClientAuthError(methodNotImplemented);
    }
    async setRefreshTokenCredential() {
        throw createClientAuthError(methodNotImplemented);
    }
    getRefreshTokenCredential() {
        throw createClientAuthError(methodNotImplemented);
    }
    setAppMetadata() {
        throw createClientAuthError(methodNotImplemented);
    }
    getAppMetadata() {
        throw createClientAuthError(methodNotImplemented);
    }
    setServerTelemetry() {
        throw createClientAuthError(methodNotImplemented);
    }
    getServerTelemetry() {
        throw createClientAuthError(methodNotImplemented);
    }
    setAuthorityMetadata() {
        throw createClientAuthError(methodNotImplemented);
    }
    getAuthorityMetadata() {
        throw createClientAuthError(methodNotImplemented);
    }
    getAuthorityMetadataKeys() {
        throw createClientAuthError(methodNotImplemented);
    }
    setThrottlingCache() {
        throw createClientAuthError(methodNotImplemented);
    }
    getThrottlingCache() {
        throw createClientAuthError(methodNotImplemented);
    }
    removeItem() {
        throw createClientAuthError(methodNotImplemented);
    }
    getKeys() {
        throw createClientAuthError(methodNotImplemented);
    }
    getAccountKeys() {
        throw createClientAuthError(methodNotImplemented);
    }
    getTokenKeys() {
        throw createClientAuthError(methodNotImplemented);
    }
    generateCredentialKey() {
        throw createClientAuthError(methodNotImplemented);
    }
    generateAccountKey() {
        throw createClientAuthError(methodNotImplemented);
    }
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
class StubPerformanceMeasurement {
    startMeasurement() {
        return;
    }
    endMeasurement() {
        return;
    }
    flushMeasurement() {
        return null;
    }
}
class StubPerformanceClient {
    generateId() {
        return "callback-id";
    }
    startMeasurement(measureName, correlationId) {
        return {
            end: () => null,
            discard: () => { },
            add: () => { },
            increment: () => { },
            event: {
                eventId: this.generateId(),
                status: PerformanceEventStatus.InProgress,
                authority: "",
                libraryName: "",
                libraryVersion: "",
                clientId: "",
                name: measureName,
                startTimeMs: Date.now(),
                correlationId: correlationId || "",
            },
            measurement: new StubPerformanceMeasurement(),
        };
    }
    startPerformanceMeasurement() {
        return new StubPerformanceMeasurement();
    }
    calculateQueuedTime() {
        return 0;
    }
    addQueueMeasurement() {
        return;
    }
    setPreQueueTime() {
        return;
    }
    endMeasurement() {
        return null;
    }
    discardMeasurements() {
        return;
    }
    removePerformanceCallback() {
        return true;
    }
    addPerformanceCallback() {
        return "";
    }
    emitEvents() {
        return;
    }
    addFields() {
        return;
    }
    incrementFields() {
        return;
    }
    cacheEventByCorrelationId() {
        return;
    }
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const DEFAULT_SYSTEM_OPTIONS = {
    tokenRenewalOffsetSeconds: DEFAULT_TOKEN_RENEWAL_OFFSET_SEC,
    preventCorsPreflight: false,
};
const DEFAULT_LOGGER_IMPLEMENTATION = {
    loggerCallback: () => {
        // allow users to not set loggerCallback
    },
    piiLoggingEnabled: false,
    logLevel: exports.LogLevel.Info,
    correlationId: Constants.EMPTY_STRING,
};
const DEFAULT_CACHE_OPTIONS = {
    claimsBasedCachingEnabled: false,
};
const DEFAULT_NETWORK_IMPLEMENTATION = {
    async sendGetRequestAsync() {
        throw createClientAuthError(methodNotImplemented);
    },
    async sendPostRequestAsync() {
        throw createClientAuthError(methodNotImplemented);
    },
};
const DEFAULT_LIBRARY_INFO = {
    sku: Constants.SKU,
    version: version,
    cpu: Constants.EMPTY_STRING,
    os: Constants.EMPTY_STRING,
};
const DEFAULT_CLIENT_CREDENTIALS = {
    clientSecret: Constants.EMPTY_STRING,
    clientAssertion: undefined,
};
const DEFAULT_AZURE_CLOUD_OPTIONS = {
    azureCloudInstance: AzureCloudInstance.None,
    tenant: `${Constants.DEFAULT_COMMON_TENANT}`,
};
const DEFAULT_TELEMETRY_OPTIONS = {
    application: {
        appName: "",
        appVersion: "",
    },
};
/**
 * Function that sets the default options when not explicitly configured from app developer
 *
 * @param Configuration
 *
 * @returns Configuration
 */
function buildClientConfiguration({ authOptions: userAuthOptions, systemOptions: userSystemOptions, loggerOptions: userLoggerOption, cacheOptions: userCacheOptions, storageInterface: storageImplementation, networkInterface: networkImplementation, cryptoInterface: cryptoImplementation, clientCredentials: clientCredentials, libraryInfo: libraryInfo, telemetry: telemetry, serverTelemetryManager: serverTelemetryManager, persistencePlugin: persistencePlugin, serializableCache: serializableCache, }) {
    const loggerOptions = {
        ...DEFAULT_LOGGER_IMPLEMENTATION,
        ...userLoggerOption,
    };
    return {
        authOptions: buildAuthOptions(userAuthOptions),
        systemOptions: { ...DEFAULT_SYSTEM_OPTIONS, ...userSystemOptions },
        loggerOptions: loggerOptions,
        cacheOptions: { ...DEFAULT_CACHE_OPTIONS, ...userCacheOptions },
        storageInterface: storageImplementation ||
            new DefaultStorageClass(userAuthOptions.clientId, DEFAULT_CRYPTO_IMPLEMENTATION, new Logger(loggerOptions), new StubPerformanceClient()),
        networkInterface: networkImplementation || DEFAULT_NETWORK_IMPLEMENTATION,
        cryptoInterface: cryptoImplementation || DEFAULT_CRYPTO_IMPLEMENTATION,
        clientCredentials: clientCredentials || DEFAULT_CLIENT_CREDENTIALS,
        libraryInfo: { ...DEFAULT_LIBRARY_INFO, ...libraryInfo },
        telemetry: { ...DEFAULT_TELEMETRY_OPTIONS, ...telemetry },
        serverTelemetryManager: serverTelemetryManager || null,
        persistencePlugin: persistencePlugin || null,
        serializableCache: serializableCache || null,
    };
}
/**
 * Construct authoptions from the client and platform passed values
 * @param authOptions
 */
function buildAuthOptions(authOptions) {
    return {
        clientCapabilities: [],
        azureCloudOptions: DEFAULT_AZURE_CLOUD_OPTIONS,
        skipAuthorityMetadataCache: false,
        instanceAware: false,
        encodeExtraQueryParams: false,
        ...authOptions,
    };
}
/**
 * Returns true if config has protocolMode set to ProtocolMode.OIDC, false otherwise
 * @param ClientConfiguration
 */
function isOidcProtocolMode(config) {
    return (config.authOptions.authority.options.protocolMode === ProtocolMode.OIDC);
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const CcsCredentialType = {
    HOME_ACCOUNT_ID: "home_account_id",
    UPN: "UPN",
};

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
function instrumentBrokerParams(parameters, correlationId, performanceClient) {
    if (!correlationId) {
        return;
    }
    const clientId = parameters.get(CLIENT_ID);
    if (clientId && parameters.has(BROKER_CLIENT_ID)) {
        performanceClient?.addFields({
            embeddedClientId: clientId,
            embeddedRedirectUri: parameters.get(REDIRECT_URI),
        }, correlationId);
    }
}
/**
 * Add the given response_type
 * @param parameters
 * @param responseType
 */
function addResponseType(parameters, responseType) {
    parameters.set(RESPONSE_TYPE, responseType);
}
/**
 * add response_mode. defaults to query.
 * @param responseMode
 */
function addResponseMode(parameters, responseMode) {
    parameters.set(RESPONSE_MODE, responseMode ? responseMode : ResponseMode.QUERY);
}
/**
 * Add flag to indicate STS should attempt to use WAM if available
 */
function addNativeBroker(parameters) {
    parameters.set(NATIVE_BROKER, "1");
}
/**
 * add scopes. set addOidcScopes to false to prevent default scopes in non-user scenarios
 * @param scopeSet
 * @param addOidcScopes
 */
function addScopes(parameters, scopes, addOidcScopes = true, defaultScopes = OIDC_DEFAULT_SCOPES) {
    // Always add openid to the scopes when adding OIDC scopes
    if (addOidcScopes &&
        !defaultScopes.includes("openid") &&
        !scopes.includes("openid")) {
        defaultScopes.push("openid");
    }
    const requestScopes = addOidcScopes
        ? [...(scopes || []), ...defaultScopes]
        : scopes || [];
    const scopeSet = new ScopeSet(requestScopes);
    parameters.set(SCOPE, scopeSet.printScopes());
}
/**
 * add clientId
 * @param clientId
 */
function addClientId(parameters, clientId) {
    parameters.set(CLIENT_ID, clientId);
}
/**
 * add redirect_uri
 * @param redirectUri
 */
function addRedirectUri(parameters, redirectUri) {
    parameters.set(REDIRECT_URI, redirectUri);
}
/**
 * add post logout redirectUri
 * @param redirectUri
 */
function addPostLogoutRedirectUri(parameters, redirectUri) {
    parameters.set(POST_LOGOUT_URI, redirectUri);
}
/**
 * add id_token_hint to logout request
 * @param idTokenHint
 */
function addIdTokenHint(parameters, idTokenHint) {
    parameters.set(ID_TOKEN_HINT, idTokenHint);
}
/**
 * add domain_hint
 * @param domainHint
 */
function addDomainHint(parameters, domainHint) {
    parameters.set(DOMAIN_HINT, domainHint);
}
/**
 * add login_hint
 * @param loginHint
 */
function addLoginHint(parameters, loginHint) {
    parameters.set(LOGIN_HINT, loginHint);
}
/**
 * Adds the CCS (Cache Credential Service) query parameter for login_hint
 * @param loginHint
 */
function addCcsUpn(parameters, loginHint) {
    parameters.set(HeaderNames.CCS_HEADER, `UPN:${loginHint}`);
}
/**
 * Adds the CCS (Cache Credential Service) query parameter for account object
 * @param loginHint
 */
function addCcsOid(parameters, clientInfo) {
    parameters.set(HeaderNames.CCS_HEADER, `Oid:${clientInfo.uid}@${clientInfo.utid}`);
}
/**
 * add sid
 * @param sid
 */
function addSid(parameters, sid) {
    parameters.set(SID, sid);
}
/**
 * add claims
 * @param claims
 */
function addClaims(parameters, claims, clientCapabilities) {
    const mergedClaims = addClientCapabilitiesToClaims(claims, clientCapabilities);
    try {
        JSON.parse(mergedClaims);
    }
    catch (e) {
        throw createClientConfigurationError(invalidClaims);
    }
    parameters.set(CLAIMS, mergedClaims);
}
/**
 * add correlationId
 * @param correlationId
 */
function addCorrelationId(parameters, correlationId) {
    parameters.set(CLIENT_REQUEST_ID, correlationId);
}
/**
 * add library info query params
 * @param libraryInfo
 */
function addLibraryInfo(parameters, libraryInfo) {
    // Telemetry Info
    parameters.set(X_CLIENT_SKU, libraryInfo.sku);
    parameters.set(X_CLIENT_VER, libraryInfo.version);
    if (libraryInfo.os) {
        parameters.set(X_CLIENT_OS, libraryInfo.os);
    }
    if (libraryInfo.cpu) {
        parameters.set(X_CLIENT_CPU, libraryInfo.cpu);
    }
}
/**
 * Add client telemetry parameters
 * @param appTelemetry
 */
function addApplicationTelemetry(parameters, appTelemetry) {
    if (appTelemetry?.appName) {
        parameters.set(X_APP_NAME, appTelemetry.appName);
    }
    if (appTelemetry?.appVersion) {
        parameters.set(X_APP_VER, appTelemetry.appVersion);
    }
}
/**
 * add prompt
 * @param prompt
 */
function addPrompt(parameters, prompt) {
    parameters.set(PROMPT, prompt);
}
/**
 * add state
 * @param state
 */
function addState(parameters, state) {
    if (state) {
        parameters.set(STATE, state);
    }
}
/**
 * add nonce
 * @param nonce
 */
function addNonce(parameters, nonce) {
    parameters.set(NONCE, nonce);
}
/**
 * add code_challenge and code_challenge_method
 * - throw if either of them are not passed
 * @param codeChallenge
 * @param codeChallengeMethod
 */
function addCodeChallengeParams(parameters, codeChallenge, codeChallengeMethod) {
    if (codeChallenge && codeChallengeMethod) {
        parameters.set(CODE_CHALLENGE, codeChallenge);
        parameters.set(CODE_CHALLENGE_METHOD, codeChallengeMethod);
    }
    else {
        throw createClientConfigurationError(pkceParamsMissing);
    }
}
/**
 * add the `authorization_code` passed by the user to exchange for a token
 * @param code
 */
function addAuthorizationCode(parameters, code) {
    parameters.set(CODE, code);
}
/**
 * add the `authorization_code` passed by the user to exchange for a token
 * @param code
 */
function addDeviceCode(parameters, code) {
    parameters.set(DEVICE_CODE, code);
}
/**
 * add the `refreshToken` passed by the user
 * @param refreshToken
 */
function addRefreshToken(parameters, refreshToken) {
    parameters.set(REFRESH_TOKEN, refreshToken);
}
/**
 * add the `code_verifier` passed by the user to exchange for a token
 * @param codeVerifier
 */
function addCodeVerifier(parameters, codeVerifier) {
    parameters.set(CODE_VERIFIER, codeVerifier);
}
/**
 * add client_secret
 * @param clientSecret
 */
function addClientSecret(parameters, clientSecret) {
    parameters.set(CLIENT_SECRET, clientSecret);
}
/**
 * add clientAssertion for confidential client flows
 * @param clientAssertion
 */
function addClientAssertion(parameters, clientAssertion) {
    if (clientAssertion) {
        parameters.set(CLIENT_ASSERTION, clientAssertion);
    }
}
/**
 * add clientAssertionType for confidential client flows
 * @param clientAssertionType
 */
function addClientAssertionType(parameters, clientAssertionType) {
    if (clientAssertionType) {
        parameters.set(CLIENT_ASSERTION_TYPE, clientAssertionType);
    }
}
/**
 * add OBO assertion for confidential client flows
 * @param clientAssertion
 */
function addOboAssertion(parameters, oboAssertion) {
    parameters.set(OBO_ASSERTION, oboAssertion);
}
/**
 * add grant type
 * @param grantType
 */
function addRequestTokenUse(parameters, tokenUse) {
    parameters.set(REQUESTED_TOKEN_USE, tokenUse);
}
/**
 * add grant type
 * @param grantType
 */
function addGrantType(parameters, grantType) {
    parameters.set(GRANT_TYPE, grantType);
}
/**
 * add client info
 *
 */
function addClientInfo(parameters) {
    parameters.set(CLIENT_INFO$1, "1");
}
function addInstanceAware(parameters) {
    if (!parameters.has(INSTANCE_AWARE)) {
        parameters.set(INSTANCE_AWARE, "true");
    }
}
/**
 * add extraQueryParams
 * @param eQParams
 */
function addExtraQueryParameters(parameters, eQParams) {
    Object.entries(eQParams).forEach(([key, value]) => {
        if (!parameters.has(key) && value) {
            parameters.set(key, value);
        }
    });
}
function addClientCapabilitiesToClaims(claims, clientCapabilities) {
    let mergedClaims;
    // Parse provided claims into JSON object or initialize empty object
    if (!claims) {
        mergedClaims = {};
    }
    else {
        try {
            mergedClaims = JSON.parse(claims);
        }
        catch (e) {
            throw createClientConfigurationError(invalidClaims);
        }
    }
    if (clientCapabilities && clientCapabilities.length > 0) {
        if (!mergedClaims.hasOwnProperty(ClaimsRequestKeys.ACCESS_TOKEN)) {
            // Add access_token key to claims object
            mergedClaims[ClaimsRequestKeys.ACCESS_TOKEN] = {};
        }
        // Add xms_cc claim with provided clientCapabilities to access_token key
        mergedClaims[ClaimsRequestKeys.ACCESS_TOKEN][ClaimsRequestKeys.XMS_CC] =
            {
                values: clientCapabilities,
            };
    }
    return JSON.stringify(mergedClaims);
}
/**
 * adds `username` for Password Grant flow
 * @param username
 */
function addUsername(parameters, username) {
    parameters.set(PasswordGrantConstants.username, username);
}
/**
 * adds `password` for Password Grant flow
 * @param password
 */
function addPassword(parameters, password) {
    parameters.set(PasswordGrantConstants.password, password);
}
/**
 * add pop_jwk to query params
 * @param cnfString
 */
function addPopToken(parameters, cnfString) {
    if (cnfString) {
        parameters.set(TOKEN_TYPE, AuthenticationScheme.POP);
        parameters.set(REQ_CNF, cnfString);
    }
}
/**
 * add SSH JWK and key ID to query params
 */
function addSshJwk(parameters, sshJwkString) {
    if (sshJwkString) {
        parameters.set(TOKEN_TYPE, AuthenticationScheme.SSH);
        parameters.set(REQ_CNF, sshJwkString);
    }
}
/**
 * add server telemetry fields
 * @param serverTelemetryManager
 */
function addServerTelemetry(parameters, serverTelemetryManager) {
    parameters.set(X_CLIENT_CURR_TELEM, serverTelemetryManager.generateCurrentRequestHeaderValue());
    parameters.set(X_CLIENT_LAST_TELEM, serverTelemetryManager.generateLastRequestHeaderValue());
}
/**
 * Adds parameter that indicates to the server that throttling is supported
 */
function addThrottling(parameters) {
    parameters.set(X_MS_LIB_CAPABILITY, ThrottlingConstants.X_MS_LIB_CAPABILITY_VALUE);
}
/**
 * Adds logout_hint parameter for "silent" logout which prevent server account picker
 */
function addLogoutHint(parameters, logoutHint) {
    parameters.set(LOGOUT_HINT, logoutHint);
}
function addBrokerParameters(parameters, brokerClientId, brokerRedirectUri) {
    if (!parameters.has(BROKER_CLIENT_ID)) {
        parameters.set(BROKER_CLIENT_ID, brokerClientId);
    }
    if (!parameters.has(BROKER_REDIRECT_URI)) {
        parameters.set(BROKER_REDIRECT_URI, brokerRedirectUri);
    }
}
/**
 * Add EAR (Encrypted Authorize Response) request parameters
 * @param parameters
 * @param jwk
 */
function addEARParameters(parameters, jwk) {
    parameters.set(EAR_JWK, encodeURIComponent(jwk));
    // ear_jwe_crypto will always have value: {"alg":"dir","enc":"A256GCM"} so we can hardcode this
    const jweCryptoB64Encoded = "eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0";
    parameters.set(EAR_JWE_CRYPTO, jweCryptoB64Encoded);
}
/**
 * Adds authorize body parameters to the request parameters
 * @param parameters
 * @param bodyParameters
 */
function addPostBodyParameters(parameters, bodyParameters) {
    Object.entries(bodyParameters).forEach(([key, value]) => {
        if (value) {
            parameters.set(key, value);
        }
    });
}

var RequestParameterBuilder = /*#__PURE__*/Object.freeze({
    __proto__: null,
    addApplicationTelemetry: addApplicationTelemetry,
    addAuthorizationCode: addAuthorizationCode,
    addBrokerParameters: addBrokerParameters,
    addCcsOid: addCcsOid,
    addCcsUpn: addCcsUpn,
    addClaims: addClaims,
    addClientAssertion: addClientAssertion,
    addClientAssertionType: addClientAssertionType,
    addClientCapabilitiesToClaims: addClientCapabilitiesToClaims,
    addClientId: addClientId,
    addClientInfo: addClientInfo,
    addClientSecret: addClientSecret,
    addCodeChallengeParams: addCodeChallengeParams,
    addCodeVerifier: addCodeVerifier,
    addCorrelationId: addCorrelationId,
    addDeviceCode: addDeviceCode,
    addDomainHint: addDomainHint,
    addEARParameters: addEARParameters,
    addExtraQueryParameters: addExtraQueryParameters,
    addGrantType: addGrantType,
    addIdTokenHint: addIdTokenHint,
    addInstanceAware: addInstanceAware,
    addLibraryInfo: addLibraryInfo,
    addLoginHint: addLoginHint,
    addLogoutHint: addLogoutHint,
    addNativeBroker: addNativeBroker,
    addNonce: addNonce,
    addOboAssertion: addOboAssertion,
    addPassword: addPassword,
    addPopToken: addPopToken,
    addPostBodyParameters: addPostBodyParameters,
    addPostLogoutRedirectUri: addPostLogoutRedirectUri,
    addPrompt: addPrompt,
    addRedirectUri: addRedirectUri,
    addRefreshToken: addRefreshToken,
    addRequestTokenUse: addRequestTokenUse,
    addResponseMode: addResponseMode,
    addResponseType: addResponseType,
    addScopes: addScopes,
    addServerTelemetry: addServerTelemetry,
    addSid: addSid,
    addSshJwk: addSshJwk,
    addState: addState,
    addThrottling: addThrottling,
    addUsername: addUsername,
    instrumentBrokerParams: instrumentBrokerParams
});

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Error thrown when there is an error with the server code, for example, unavailability.
 */
class ServerError extends AuthError {
    constructor(errorCode, errorMessage, subError, errorNo, status) {
        super(errorCode, errorMessage, subError);
        this.name = "ServerError";
        this.errorNo = errorNo;
        this.status = status;
        Object.setPrototypeOf(this, ServerError.prototype);
    }
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
function getRequestThumbprint(clientId, request, homeAccountId) {
    return {
        clientId: clientId,
        authority: request.authority,
        scopes: request.scopes,
        homeAccountIdentifier: homeAccountId,
        claims: request.claims,
        authenticationScheme: request.authenticationScheme,
        resourceRequestMethod: request.resourceRequestMethod,
        resourceRequestUri: request.resourceRequestUri,
        shrClaims: request.shrClaims,
        sshKid: request.sshKid,
        embeddedClientId: request.embeddedClientId || request.tokenBodyParameters?.clientId,
    };
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/** @internal */
class ThrottlingUtils {
    /**
     * Prepares a RequestThumbprint to be stored as a key.
     * @param thumbprint
     */
    static generateThrottlingStorageKey(thumbprint) {
        return `${ThrottlingConstants.THROTTLING_PREFIX}.${JSON.stringify(thumbprint)}`;
    }
    /**
     * Performs necessary throttling checks before a network request.
     * @param cacheManager
     * @param thumbprint
     */
    static preProcess(cacheManager, thumbprint, correlationId) {
        const key = ThrottlingUtils.generateThrottlingStorageKey(thumbprint);
        const value = cacheManager.getThrottlingCache(key);
        if (value) {
            if (value.throttleTime < Date.now()) {
                cacheManager.removeItem(key, correlationId);
                return;
            }
            throw new ServerError(value.errorCodes?.join(" ") || Constants.EMPTY_STRING, value.errorMessage, value.subError);
        }
    }
    /**
     * Performs necessary throttling checks after a network request.
     * @param cacheManager
     * @param thumbprint
     * @param response
     */
    static postProcess(cacheManager, thumbprint, response, correlationId) {
        if (ThrottlingUtils.checkResponseStatus(response) ||
            ThrottlingUtils.checkResponseForRetryAfter(response)) {
            const thumbprintValue = {
                throttleTime: ThrottlingUtils.calculateThrottleTime(parseInt(response.headers[HeaderNames.RETRY_AFTER])),
                error: response.body.error,
                errorCodes: response.body.error_codes,
                errorMessage: response.body.error_description,
                subError: response.body.suberror,
            };
            cacheManager.setThrottlingCache(ThrottlingUtils.generateThrottlingStorageKey(thumbprint), thumbprintValue, correlationId);
        }
    }
    /**
     * Checks a NetworkResponse object's status codes against 429 or 5xx
     * @param response
     */
    static checkResponseStatus(response) {
        return (response.status === 429 ||
            (response.status >= 500 && response.status < 600));
    }
    /**
     * Checks a NetworkResponse object's RetryAfter header
     * @param response
     */
    static checkResponseForRetryAfter(response) {
        if (response.headers) {
            return (response.headers.hasOwnProperty(HeaderNames.RETRY_AFTER) &&
                (response.status < 200 || response.status >= 300));
        }
        return false;
    }
    /**
     * Calculates the Unix-time value for a throttle to expire given throttleTime in seconds.
     * @param throttleTime
     */
    static calculateThrottleTime(throttleTime) {
        const time = throttleTime <= 0 ? 0 : throttleTime;
        const currentSeconds = Date.now() / 1000;
        return Math.floor(Math.min(currentSeconds +
            (time || ThrottlingConstants.DEFAULT_THROTTLE_TIME_SECONDS), currentSeconds +
            ThrottlingConstants.DEFAULT_MAX_THROTTLE_TIME_SECONDS) * 1000);
    }
    static removeThrottle(cacheManager, clientId, request, homeAccountIdentifier) {
        const thumbprint = getRequestThumbprint(clientId, request, homeAccountIdentifier);
        const key = this.generateThrottlingStorageKey(thumbprint);
        cacheManager.removeItem(key, request.correlationId);
    }
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Represents network related errors
 */
class NetworkError extends AuthError {
    constructor(error, httpStatus, responseHeaders) {
        super(error.errorCode, error.errorMessage, error.subError);
        Object.setPrototypeOf(this, NetworkError.prototype);
        this.name = "NetworkError";
        this.error = error;
        this.httpStatus = httpStatus;
        this.responseHeaders = responseHeaders;
    }
}
/**
 * Creates NetworkError object for a failed network request
 * @param error - Error to be thrown back to the caller
 * @param httpStatus - Status code of the network request
 * @param responseHeaders - Response headers of the network request, when available
 * @returns NetworkError object
 */
function createNetworkError(error, httpStatus, responseHeaders, additionalError) {
    error.errorMessage = `${error.errorMessage}, additionalErrorInfo: error.name:${additionalError?.name}, error.message:${additionalError?.message}`;
    return new NetworkError(error, httpStatus, responseHeaders);
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Base application class which will construct requests to send to and handle responses from the Microsoft STS using the authorization code flow.
 * @internal
 */
class BaseClient {
    constructor(configuration, performanceClient) {
        // Set the configuration
        this.config = buildClientConfiguration(configuration);
        // Initialize the logger
        this.logger = new Logger(this.config.loggerOptions, name, version);
        // Initialize crypto
        this.cryptoUtils = this.config.cryptoInterface;
        // Initialize storage interface
        this.cacheManager = this.config.storageInterface;
        // Set the network interface
        this.networkClient = this.config.networkInterface;
        // Set TelemetryManager
        this.serverTelemetryManager = this.config.serverTelemetryManager;
        // set Authority
        this.authority = this.config.authOptions.authority;
        // set performance telemetry client
        this.performanceClient = performanceClient;
    }
    /**
     * Creates default headers for requests to token endpoint
     */
    createTokenRequestHeaders(ccsCred) {
        const headers = {};
        headers[HeaderNames.CONTENT_TYPE] = Constants.URL_FORM_CONTENT_TYPE;
        if (!this.config.systemOptions.preventCorsPreflight && ccsCred) {
            switch (ccsCred.type) {
                case CcsCredentialType.HOME_ACCOUNT_ID:
                    try {
                        const clientInfo = buildClientInfoFromHomeAccountId(ccsCred.credential);
                        headers[HeaderNames.CCS_HEADER] = `Oid:${clientInfo.uid}@${clientInfo.utid}`;
                    }
                    catch (e) {
                        this.logger.verbose("Could not parse home account ID for CCS Header: " +
                            e);
                    }
                    break;
                case CcsCredentialType.UPN:
                    headers[HeaderNames.CCS_HEADER] = `UPN: ${ccsCred.credential}`;
                    break;
            }
        }
        return headers;
    }
    /**
     * Http post to token endpoint
     * @param tokenEndpoint
     * @param queryString
     * @param headers
     * @param thumbprint
     */
    async executePostToTokenEndpoint(tokenEndpoint, queryString, headers, thumbprint, correlationId, queuedEvent) {
        if (queuedEvent) {
            this.performanceClient?.addQueueMeasurement(queuedEvent, correlationId);
        }
        const response = await this.sendPostRequest(thumbprint, tokenEndpoint, { body: queryString, headers: headers }, correlationId);
        if (this.config.serverTelemetryManager &&
            response.status < 500 &&
            response.status !== 429) {
            // Telemetry data successfully logged by server, clear Telemetry cache
            this.config.serverTelemetryManager.clearTelemetryCache();
        }
        return response;
    }
    /**
     * Wraps sendPostRequestAsync with necessary preflight and postflight logic
     * @param thumbprint - Request thumbprint for throttling
     * @param tokenEndpoint - Endpoint to make the POST to
     * @param options - Body and Headers to include on the POST request
     * @param correlationId - CorrelationId for telemetry
     */
    async sendPostRequest(thumbprint, tokenEndpoint, options, correlationId) {
        ThrottlingUtils.preProcess(this.cacheManager, thumbprint, correlationId);
        let response;
        try {
            response = await invokeAsync((this.networkClient.sendPostRequestAsync.bind(this.networkClient)), PerformanceEvents.NetworkClientSendPostRequestAsync, this.logger, this.performanceClient, correlationId)(tokenEndpoint, options);
            const responseHeaders = response.headers || {};
            this.performanceClient?.addFields({
                refreshTokenSize: response.body.refresh_token?.length || 0,
                httpVerToken: responseHeaders[HeaderNames.X_MS_HTTP_VERSION] || "",
                requestId: responseHeaders[HeaderNames.X_MS_REQUEST_ID] || "",
            }, correlationId);
        }
        catch (e) {
            if (e instanceof NetworkError) {
                const responseHeaders = e.responseHeaders;
                if (responseHeaders) {
                    this.performanceClient?.addFields({
                        httpVerToken: responseHeaders[HeaderNames.X_MS_HTTP_VERSION] || "",
                        requestId: responseHeaders[HeaderNames.X_MS_REQUEST_ID] ||
                            "",
                        contentTypeHeader: responseHeaders[HeaderNames.CONTENT_TYPE] ||
                            undefined,
                        contentLengthHeader: responseHeaders[HeaderNames.CONTENT_LENGTH] ||
                            undefined,
                        httpStatus: e.httpStatus,
                    }, correlationId);
                }
                throw e.error;
            }
            if (e instanceof AuthError) {
                throw e;
            }
            else {
                throw createClientAuthError(networkError);
            }
        }
        ThrottlingUtils.postProcess(this.cacheManager, thumbprint, response, correlationId);
        return response;
    }
    /**
     * Updates the authority object of the client. Endpoint discovery must be completed.
     * @param updatedAuthority
     */
    async updateAuthority(cloudInstanceHostname, correlationId) {
        this.performanceClient?.addQueueMeasurement(PerformanceEvents.UpdateTokenEndpointAuthority, correlationId);
        const cloudInstanceAuthorityUri = `https://${cloudInstanceHostname}/${this.authority.tenant}/`;
        const cloudInstanceAuthority = await createDiscoveredInstance(cloudInstanceAuthorityUri, this.networkClient, this.cacheManager, this.authority.options, this.logger, correlationId, this.performanceClient);
        this.authority = cloudInstanceAuthority;
    }
    /**
     * Creates query string for the /token request
     * @param request
     */
    createTokenQueryParameters(request) {
        const parameters = new Map();
        if (request.embeddedClientId) {
            addBrokerParameters(parameters, this.config.authOptions.clientId, this.config.authOptions.redirectUri);
        }
        if (request.tokenQueryParameters) {
            addExtraQueryParameters(parameters, request.tokenQueryParameters);
        }
        addCorrelationId(parameters, request.correlationId);
        instrumentBrokerParams(parameters, request.correlationId, this.performanceClient);
        return mapToQueryString(parameters);
    }
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
// Codes defined by MSAL
const noTokensFound = "no_tokens_found";
const nativeAccountUnavailable = "native_account_unavailable";
const refreshTokenExpired = "refresh_token_expired";
const uxNotAllowed = "ux_not_allowed";
// Codes potentially returned by server
const interactionRequired = "interaction_required";
const consentRequired = "consent_required";
const loginRequired = "login_required";
const badToken = "bad_token";

var InteractionRequiredAuthErrorCodes = /*#__PURE__*/Object.freeze({
    __proto__: null,
    badToken: badToken,
    consentRequired: consentRequired,
    interactionRequired: interactionRequired,
    loginRequired: loginRequired,
    nativeAccountUnavailable: nativeAccountUnavailable,
    noTokensFound: noTokensFound,
    refreshTokenExpired: refreshTokenExpired,
    uxNotAllowed: uxNotAllowed
});

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * InteractionRequiredServerErrorMessage contains string constants used by error codes and messages returned by the server indicating interaction is required
 */
const InteractionRequiredServerErrorMessage = [
    interactionRequired,
    consentRequired,
    loginRequired,
    badToken,
    uxNotAllowed,
];
const InteractionRequiredAuthSubErrorMessage = [
    "message_only",
    "additional_action",
    "basic_action",
    "user_password_expired",
    "consent_required",
    "bad_token",
];
const InteractionRequiredAuthErrorMessages = {
    [noTokensFound]: "No refresh token found in the cache. Please sign-in.",
    [nativeAccountUnavailable]: "The requested account is not available in the native broker. It may have been deleted or logged out. Please sign-in again using an interactive API.",
    [refreshTokenExpired]: "Refresh token has expired.",
    [badToken]: "Identity provider returned bad_token due to an expired or invalid refresh token. Please invoke an interactive API to resolve.",
    [uxNotAllowed]: "`canShowUI` flag in Edge was set to false. User interaction required on web page. Please invoke an interactive API to resolve.",
};
/**
 * Interaction required errors defined by the SDK
 * @deprecated Use InteractionRequiredAuthErrorCodes instead
 */
const InteractionRequiredAuthErrorMessage = {
    noTokensFoundError: {
        code: noTokensFound,
        desc: InteractionRequiredAuthErrorMessages[noTokensFound],
    },
    native_account_unavailable: {
        code: nativeAccountUnavailable,
        desc: InteractionRequiredAuthErrorMessages[nativeAccountUnavailable],
    },
    bad_token: {
        code: badToken,
        desc: InteractionRequiredAuthErrorMessages[badToken],
    },
};
/**
 * Error thrown when user interaction is required.
 */
class InteractionRequiredAuthError extends AuthError {
    constructor(errorCode, errorMessage, subError, timestamp, traceId, correlationId, claims, errorNo) {
        super(errorCode, errorMessage, subError);
        Object.setPrototypeOf(this, InteractionRequiredAuthError.prototype);
        this.timestamp = timestamp || Constants.EMPTY_STRING;
        this.traceId = traceId || Constants.EMPTY_STRING;
        this.correlationId = correlationId || Constants.EMPTY_STRING;
        this.claims = claims || Constants.EMPTY_STRING;
        this.name = "InteractionRequiredAuthError";
        this.errorNo = errorNo;
    }
}
/**
 * Helper function used to determine if an error thrown by the server requires interaction to resolve
 * @param errorCode
 * @param errorString
 * @param subError
 */
function isInteractionRequiredError(errorCode, errorString, subError) {
    const isInteractionRequiredErrorCode = !!errorCode &&
        InteractionRequiredServerErrorMessage.indexOf(errorCode) > -1;
    const isInteractionRequiredSubError = !!subError &&
        InteractionRequiredAuthSubErrorMessage.indexOf(subError) > -1;
    const isInteractionRequiredErrorDesc = !!errorString &&
        InteractionRequiredServerErrorMessage.some((irErrorCode) => {
            return errorString.indexOf(irErrorCode) > -1;
        });
    return (isInteractionRequiredErrorCode ||
        isInteractionRequiredErrorDesc ||
        isInteractionRequiredSubError);
}
/**
 * Creates an InteractionRequiredAuthError
 */
function createInteractionRequiredAuthError(errorCode) {
    return new InteractionRequiredAuthError(errorCode, InteractionRequiredAuthErrorMessages[errorCode]);
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Class which provides helpers for OAuth 2.0 protocol specific values
 */
class ProtocolUtils {
    /**
     * Appends user state with random guid, or returns random guid.
     * @param userState
     * @param randomGuid
     */
    static setRequestState(cryptoObj, userState, meta) {
        const libraryState = ProtocolUtils.generateLibraryState(cryptoObj, meta);
        return userState
            ? `${libraryState}${Constants.RESOURCE_DELIM}${userState}`
            : libraryState;
    }
    /**
     * Generates the state value used by the common library.
     * @param randomGuid
     * @param cryptoObj
     */
    static generateLibraryState(cryptoObj, meta) {
        if (!cryptoObj) {
            throw createClientAuthError(noCryptoObject);
        }
        // Create a state object containing a unique id and the timestamp of the request creation
        const stateObj = {
            id: cryptoObj.createNewGuid(),
        };
        if (meta) {
            stateObj.meta = meta;
        }
        const stateString = JSON.stringify(stateObj);
        return cryptoObj.base64Encode(stateString);
    }
    /**
     * Parses the state into the RequestStateObject, which contains the LibraryState info and the state passed by the user.
     * @param state
     * @param cryptoObj
     */
    static parseRequestState(cryptoObj, state) {
        if (!cryptoObj) {
            throw createClientAuthError(noCryptoObject);
        }
        if (!state) {
            throw createClientAuthError(invalidState);
        }
        try {
            // Split the state between library state and user passed state and decode them separately
            const splitState = state.split(Constants.RESOURCE_DELIM);
            const libraryState = splitState[0];
            const userState = splitState.length > 1
                ? splitState.slice(1).join(Constants.RESOURCE_DELIM)
                : Constants.EMPTY_STRING;
            const libraryStateString = cryptoObj.base64Decode(libraryState);
            const libraryStateObj = JSON.parse(libraryStateString);
            return {
                userRequestState: userState || Constants.EMPTY_STRING,
                libraryState: libraryStateObj,
            };
        }
        catch (e) {
            throw createClientAuthError(invalidState);
        }
    }
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const KeyLocation = {
    SW: "sw"};
/** @internal */
class PopTokenGenerator {
    constructor(cryptoUtils, performanceClient) {
        this.cryptoUtils = cryptoUtils;
        this.performanceClient = performanceClient;
    }
    /**
     * Generates the req_cnf validated at the RP in the POP protocol for SHR parameters
     * and returns an object containing the keyid, the full req_cnf string and the req_cnf string hash
     * @param request
     * @returns
     */
    async generateCnf(request, logger) {
        this.performanceClient?.addQueueMeasurement(PerformanceEvents.PopTokenGenerateCnf, request.correlationId);
        const reqCnf = await invokeAsync(this.generateKid.bind(this), PerformanceEvents.PopTokenGenerateCnf, logger, this.performanceClient, request.correlationId)(request);
        const reqCnfString = this.cryptoUtils.base64UrlEncode(JSON.stringify(reqCnf));
        return {
            kid: reqCnf.kid,
            reqCnfString,
        };
    }
    /**
     * Generates key_id for a SHR token request
     * @param request
     * @returns
     */
    async generateKid(request) {
        this.performanceClient?.addQueueMeasurement(PerformanceEvents.PopTokenGenerateKid, request.correlationId);
        const kidThumbprint = await this.cryptoUtils.getPublicKeyThumbprint(request);
        return {
            kid: kidThumbprint,
            xms_ksl: KeyLocation.SW,
        };
    }
    /**
     * Signs the POP access_token with the local generated key-pair
     * @param accessToken
     * @param request
     * @returns
     */
    async signPopToken(accessToken, keyId, request) {
        return this.signPayload(accessToken, keyId, request);
    }
    /**
     * Utility function to generate the signed JWT for an access_token
     * @param payload
     * @param kid
     * @param request
     * @param claims
     * @returns
     */
    async signPayload(payload, keyId, request, claims) {
        // Deconstruct request to extract SHR parameters
        const { resourceRequestMethod, resourceRequestUri, shrClaims, shrNonce, shrOptions, } = request;
        const resourceUrlString = resourceRequestUri
            ? new UrlString(resourceRequestUri)
            : undefined;
        const resourceUrlComponents = resourceUrlString?.getUrlComponents();
        return this.cryptoUtils.signJwt({
            at: payload,
            ts: nowSeconds(),
            m: resourceRequestMethod?.toUpperCase(),
            u: resourceUrlComponents?.HostNameAndPort,
            nonce: shrNonce || this.cryptoUtils.createNewGuid(),
            p: resourceUrlComponents?.AbsolutePath,
            q: resourceUrlComponents?.QueryString
                ? [[], resourceUrlComponents.QueryString]
                : undefined,
            client_claims: shrClaims || undefined,
            ...claims,
        }, keyId, shrOptions, request.correlationId);
    }
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * This class instance helps track the memory changes facilitating
 * decisions to read from and write to the persistent cache
 */ class TokenCacheContext {
    constructor(tokenCache, hasChanged) {
        this.cache = tokenCache;
        this.hasChanged = hasChanged;
    }
    /**
     * boolean which indicates the changes in cache
     */
    get cacheHasChanged() {
        return this.hasChanged;
    }
    /**
     * function to retrieve the token cache
     */
    get tokenCache() {
        return this.cache;
    }
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Class that handles response parsing.
 * @internal
 */
class ResponseHandler {
    constructor(clientId, cacheStorage, cryptoObj, logger, serializableCache, persistencePlugin, performanceClient) {
        this.clientId = clientId;
        this.cacheStorage = cacheStorage;
        this.cryptoObj = cryptoObj;
        this.logger = logger;
        this.serializableCache = serializableCache;
        this.persistencePlugin = persistencePlugin;
        this.performanceClient = performanceClient;
    }
    /**
     * Function which validates server authorization token response.
     * @param serverResponse
     * @param refreshAccessToken
     */
    validateTokenResponse(serverResponse, refreshAccessToken) {
        // Check for error
        if (serverResponse.error ||
            serverResponse.error_description ||
            serverResponse.suberror) {
            const errString = `Error(s): ${serverResponse.error_codes || Constants.NOT_AVAILABLE} - Timestamp: ${serverResponse.timestamp || Constants.NOT_AVAILABLE} - Description: ${serverResponse.error_description || Constants.NOT_AVAILABLE} - Correlation ID: ${serverResponse.correlation_id || Constants.NOT_AVAILABLE} - Trace ID: ${serverResponse.trace_id || Constants.NOT_AVAILABLE}`;
            const serverErrorNo = serverResponse.error_codes?.length
                ? serverResponse.error_codes[0]
                : undefined;
            const serverError = new ServerError(serverResponse.error, errString, serverResponse.suberror, serverErrorNo, serverResponse.status);
            // check if 500 error
            if (refreshAccessToken &&
                serverResponse.status &&
                serverResponse.status >= HttpStatus.SERVER_ERROR_RANGE_START &&
                serverResponse.status <= HttpStatus.SERVER_ERROR_RANGE_END) {
                this.logger.warning(`executeTokenRequest:validateTokenResponse - AAD is currently unavailable and the access token is unable to be refreshed.\n${serverError}`);
                // don't throw an exception, but alert the user via a log that the token was unable to be refreshed
                return;
                // check if 400 error
            }
            else if (refreshAccessToken &&
                serverResponse.status &&
                serverResponse.status >= HttpStatus.CLIENT_ERROR_RANGE_START &&
                serverResponse.status <= HttpStatus.CLIENT_ERROR_RANGE_END) {
                this.logger.warning(`executeTokenRequest:validateTokenResponse - AAD is currently available but is unable to refresh the access token.\n${serverError}`);
                // don't throw an exception, but alert the user via a log that the token was unable to be refreshed
                return;
            }
            if (isInteractionRequiredError(serverResponse.error, serverResponse.error_description, serverResponse.suberror)) {
                throw new InteractionRequiredAuthError(serverResponse.error, serverResponse.error_description, serverResponse.suberror, serverResponse.timestamp || Constants.EMPTY_STRING, serverResponse.trace_id || Constants.EMPTY_STRING, serverResponse.correlation_id || Constants.EMPTY_STRING, serverResponse.claims || Constants.EMPTY_STRING, serverErrorNo);
            }
            throw serverError;
        }
    }
    /**
     * Returns a constructed token response based on given string. Also manages the cache updates and cleanups.
     * @param serverTokenResponse
     * @param authority
     */
    async handleServerTokenResponse(serverTokenResponse, authority, reqTimestamp, request, authCodePayload, userAssertionHash, handlingRefreshTokenResponse, forceCacheRefreshTokenResponse, serverRequestId) {
        this.performanceClient?.addQueueMeasurement(PerformanceEvents.HandleServerTokenResponse, serverTokenResponse.correlation_id);
        // create an idToken object (not entity)
        let idTokenClaims;
        if (serverTokenResponse.id_token) {
            idTokenClaims = extractTokenClaims(serverTokenResponse.id_token || Constants.EMPTY_STRING, this.cryptoObj.base64Decode);
            // token nonce check (TODO: Add a warning if no nonce is given?)
            if (authCodePayload && authCodePayload.nonce) {
                if (idTokenClaims.nonce !== authCodePayload.nonce) {
                    throw createClientAuthError(nonceMismatch);
                }
            }
            // token max_age check
            if (request.maxAge || request.maxAge === 0) {
                const authTime = idTokenClaims.auth_time;
                if (!authTime) {
                    throw createClientAuthError(authTimeNotFound);
                }
                checkMaxAge(authTime, request.maxAge);
            }
        }
        // generate homeAccountId
        this.homeAccountIdentifier = AccountEntity.generateHomeAccountId(serverTokenResponse.client_info || Constants.EMPTY_STRING, authority.authorityType, this.logger, this.cryptoObj, idTokenClaims);
        // save the response tokens
        let requestStateObj;
        if (!!authCodePayload && !!authCodePayload.state) {
            requestStateObj = ProtocolUtils.parseRequestState(this.cryptoObj, authCodePayload.state);
        }
        // Add keyId from request to serverTokenResponse if defined
        serverTokenResponse.key_id =
            serverTokenResponse.key_id || request.sshKid || undefined;
        const cacheRecord = this.generateCacheRecord(serverTokenResponse, authority, reqTimestamp, request, idTokenClaims, userAssertionHash, authCodePayload);
        let cacheContext;
        try {
            if (this.persistencePlugin && this.serializableCache) {
                this.logger.verbose("Persistence enabled, calling beforeCacheAccess");
                cacheContext = new TokenCacheContext(this.serializableCache, true);
                await this.persistencePlugin.beforeCacheAccess(cacheContext);
            }
            /*
             * When saving a refreshed tokens to the cache, it is expected that the account that was used is present in the cache.
             * If not present, we should return null, as it's the case that another application called removeAccount in between
             * the calls to getAllAccounts and acquireTokenSilent. We should not overwrite that removal, unless explicitly flagged by
             * the developer, as in the case of refresh token flow used in ADAL Node to MSAL Node migration.
             */
            if (handlingRefreshTokenResponse &&
                !forceCacheRefreshTokenResponse &&
                cacheRecord.account) {
                const key = this.cacheStorage.generateAccountKey(AccountEntity.getAccountInfo(cacheRecord.account));
                const account = this.cacheStorage.getAccount(key, request.correlationId);
                if (!account) {
                    this.logger.warning("Account used to refresh tokens not in persistence, refreshed tokens will not be stored in the cache");
                    return await ResponseHandler.generateAuthenticationResult(this.cryptoObj, authority, cacheRecord, false, request, idTokenClaims, requestStateObj, undefined, serverRequestId);
                }
            }
            await this.cacheStorage.saveCacheRecord(cacheRecord, request.correlationId, isKmsi(idTokenClaims || {}), request.storeInCache);
        }
        finally {
            if (this.persistencePlugin &&
                this.serializableCache &&
                cacheContext) {
                this.logger.verbose("Persistence enabled, calling afterCacheAccess");
                await this.persistencePlugin.afterCacheAccess(cacheContext);
            }
        }
        return ResponseHandler.generateAuthenticationResult(this.cryptoObj, authority, cacheRecord, false, request, idTokenClaims, requestStateObj, serverTokenResponse, serverRequestId);
    }
    /**
     * Generates CacheRecord
     * @param serverTokenResponse
     * @param idTokenObj
     * @param authority
     */
    generateCacheRecord(serverTokenResponse, authority, reqTimestamp, request, idTokenClaims, userAssertionHash, authCodePayload) {
        const env = authority.getPreferredCache();
        if (!env) {
            throw createClientAuthError(invalidCacheEnvironment);
        }
        const claimsTenantId = getTenantIdFromIdTokenClaims(idTokenClaims);
        // IdToken: non AAD scenarios can have empty realm
        let cachedIdToken;
        let cachedAccount;
        if (serverTokenResponse.id_token && !!idTokenClaims) {
            cachedIdToken = createIdTokenEntity(this.homeAccountIdentifier, env, serverTokenResponse.id_token, this.clientId, claimsTenantId || "");
            cachedAccount = buildAccountToCache(this.cacheStorage, authority, this.homeAccountIdentifier, this.cryptoObj.base64Decode, request.correlationId, idTokenClaims, serverTokenResponse.client_info, env, claimsTenantId, authCodePayload, undefined, // nativeAccountId
            this.logger);
        }
        // AccessToken
        let cachedAccessToken = null;
        if (serverTokenResponse.access_token) {
            // If scopes not returned in server response, use request scopes
            const responseScopes = serverTokenResponse.scope
                ? ScopeSet.fromString(serverTokenResponse.scope)
                : new ScopeSet(request.scopes || []);
            /*
             * Use timestamp calculated before request
             * Server may return timestamps as strings, parse to numbers if so.
             */
            const expiresIn = (typeof serverTokenResponse.expires_in === "string"
                ? parseInt(serverTokenResponse.expires_in, 10)
                : serverTokenResponse.expires_in) || 0;
            const extExpiresIn = (typeof serverTokenResponse.ext_expires_in === "string"
                ? parseInt(serverTokenResponse.ext_expires_in, 10)
                : serverTokenResponse.ext_expires_in) || 0;
            const refreshIn = (typeof serverTokenResponse.refresh_in === "string"
                ? parseInt(serverTokenResponse.refresh_in, 10)
                : serverTokenResponse.refresh_in) || undefined;
            const tokenExpirationSeconds = reqTimestamp + expiresIn;
            const extendedTokenExpirationSeconds = tokenExpirationSeconds + extExpiresIn;
            const refreshOnSeconds = refreshIn && refreshIn > 0
                ? reqTimestamp + refreshIn
                : undefined;
            // non AAD scenarios can have empty realm
            cachedAccessToken = createAccessTokenEntity(this.homeAccountIdentifier, env, serverTokenResponse.access_token, this.clientId, claimsTenantId || authority.tenant || "", responseScopes.printScopes(), tokenExpirationSeconds, extendedTokenExpirationSeconds, this.cryptoObj.base64Decode, refreshOnSeconds, serverTokenResponse.token_type, userAssertionHash, serverTokenResponse.key_id, request.claims, request.requestedClaimsHash);
        }
        // refreshToken
        let cachedRefreshToken = null;
        if (serverTokenResponse.refresh_token) {
            let rtExpiresOn;
            if (serverTokenResponse.refresh_token_expires_in) {
                const rtExpiresIn = typeof serverTokenResponse.refresh_token_expires_in ===
                    "string"
                    ? parseInt(serverTokenResponse.refresh_token_expires_in, 10)
                    : serverTokenResponse.refresh_token_expires_in;
                rtExpiresOn = reqTimestamp + rtExpiresIn;
            }
            cachedRefreshToken = createRefreshTokenEntity(this.homeAccountIdentifier, env, serverTokenResponse.refresh_token, this.clientId, serverTokenResponse.foci, userAssertionHash, rtExpiresOn);
        }
        // appMetadata
        let cachedAppMetadata = null;
        if (serverTokenResponse.foci) {
            cachedAppMetadata = {
                clientId: this.clientId,
                environment: env,
                familyId: serverTokenResponse.foci,
            };
        }
        return {
            account: cachedAccount,
            idToken: cachedIdToken,
            accessToken: cachedAccessToken,
            refreshToken: cachedRefreshToken,
            appMetadata: cachedAppMetadata,
        };
    }
    /**
     * Creates an @AuthenticationResult from @CacheRecord , @IdToken , and a boolean that states whether or not the result is from cache.
     *
     * Optionally takes a state string that is set as-is in the response.
     *
     * @param cacheRecord
     * @param idTokenObj
     * @param fromTokenCache
     * @param stateString
     */
    static async generateAuthenticationResult(cryptoObj, authority, cacheRecord, fromTokenCache, request, idTokenClaims, requestState, serverTokenResponse, requestId) {
        let accessToken = Constants.EMPTY_STRING;
        let responseScopes = [];
        let expiresOn = null;
        let extExpiresOn;
        let refreshOn;
        let familyId = Constants.EMPTY_STRING;
        if (cacheRecord.accessToken) {
            /*
             * if the request object has `popKid` property, `signPopToken` will be set to false and
             * the token will be returned unsigned
             */
            if (cacheRecord.accessToken.tokenType ===
                AuthenticationScheme.POP &&
                !request.popKid) {
                const popTokenGenerator = new PopTokenGenerator(cryptoObj);
                const { secret, keyId } = cacheRecord.accessToken;
                if (!keyId) {
                    throw createClientAuthError(keyIdMissing);
                }
                accessToken = await popTokenGenerator.signPopToken(secret, keyId, request);
            }
            else {
                accessToken = cacheRecord.accessToken.secret;
            }
            responseScopes = ScopeSet.fromString(cacheRecord.accessToken.target).asArray();
            // Access token expiresOn cached in seconds, converting to Date for AuthenticationResult
            expiresOn = toDateFromSeconds(cacheRecord.accessToken.expiresOn);
            extExpiresOn = toDateFromSeconds(cacheRecord.accessToken.extendedExpiresOn);
            if (cacheRecord.accessToken.refreshOn) {
                refreshOn = toDateFromSeconds(cacheRecord.accessToken.refreshOn);
            }
        }
        if (cacheRecord.appMetadata) {
            familyId =
                cacheRecord.appMetadata.familyId === THE_FAMILY_ID
                    ? THE_FAMILY_ID
                    : "";
        }
        const uid = idTokenClaims?.oid || idTokenClaims?.sub || "";
        const tid = idTokenClaims?.tid || "";
        // for hybrid + native bridge enablement, send back the native account Id
        if (serverTokenResponse?.spa_accountid && !!cacheRecord.account) {
            cacheRecord.account.nativeAccountId =
                serverTokenResponse?.spa_accountid;
        }
        const accountInfo = cacheRecord.account
            ? updateAccountTenantProfileData(AccountEntity.getAccountInfo(cacheRecord.account), undefined, // tenantProfile optional
            idTokenClaims, cacheRecord.idToken?.secret)
            : null;
        return {
            authority: authority.canonicalAuthority,
            uniqueId: uid,
            tenantId: tid,
            scopes: responseScopes,
            account: accountInfo,
            idToken: cacheRecord?.idToken?.secret || "",
            idTokenClaims: idTokenClaims || {},
            accessToken: accessToken,
            fromCache: fromTokenCache,
            expiresOn: expiresOn,
            extExpiresOn: extExpiresOn,
            refreshOn: refreshOn,
            correlationId: request.correlationId,
            requestId: requestId || Constants.EMPTY_STRING,
            familyId: familyId,
            tokenType: cacheRecord.accessToken?.tokenType || Constants.EMPTY_STRING,
            state: requestState
                ? requestState.userRequestState
                : Constants.EMPTY_STRING,
            cloudGraphHostName: cacheRecord.account?.cloudGraphHostName ||
                Constants.EMPTY_STRING,
            msGraphHost: cacheRecord.account?.msGraphHost || Constants.EMPTY_STRING,
            code: serverTokenResponse?.spa_code,
            fromNativeBroker: false,
        };
    }
}
function buildAccountToCache(cacheStorage, authority, homeAccountId, base64Decode, correlationId, idTokenClaims, clientInfo, environment, claimsTenantId, authCodePayload, nativeAccountId, logger) {
    logger?.verbose("setCachedAccount called");
    // Check if base account is already cached
    const accountKeys = cacheStorage.getAccountKeys();
    const baseAccountKey = accountKeys.find((accountKey) => {
        return accountKey.startsWith(homeAccountId);
    });
    let cachedAccount = null;
    if (baseAccountKey) {
        cachedAccount = cacheStorage.getAccount(baseAccountKey, correlationId);
    }
    const baseAccount = cachedAccount ||
        AccountEntity.createAccount({
            homeAccountId,
            idTokenClaims,
            clientInfo,
            environment,
            cloudGraphHostName: authCodePayload?.cloud_graph_host_name,
            msGraphHost: authCodePayload?.msgraph_host,
            nativeAccountId: nativeAccountId,
        }, authority, base64Decode);
    const tenantProfiles = baseAccount.tenantProfiles || [];
    const tenantId = claimsTenantId || baseAccount.realm;
    if (tenantId &&
        !tenantProfiles.find((tenantProfile) => {
            return tenantProfile.tenantId === tenantId;
        })) {
        const newTenantProfile = buildTenantProfile(homeAccountId, baseAccount.localAccountId, tenantId, idTokenClaims);
        tenantProfiles.push(newTenantProfile);
    }
    baseAccount.tenantProfiles = tenantProfiles;
    return baseAccount;
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
async function getClientAssertion(clientAssertion, clientId, tokenEndpoint) {
    if (typeof clientAssertion === "string") {
        return clientAssertion;
    }
    else {
        const config = {
            clientId: clientId,
            tokenEndpoint: tokenEndpoint,
        };
        return clientAssertion(config);
    }
}

var ClientAssertionUtils = /*#__PURE__*/Object.freeze({
    __proto__: null,
    getClientAssertion: getClientAssertion
});

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Oauth2.0 Authorization Code client
 * @internal
 */
class AuthorizationCodeClient extends BaseClient {
    constructor(configuration, performanceClient) {
        super(configuration, performanceClient);
        // Flag to indicate if client is for hybrid spa auth code redemption
        this.includeRedirectUri = true;
        this.oidcDefaultScopes =
            this.config.authOptions.authority.options.OIDCOptions?.defaultScopes;
    }
    /**
     * API to acquire a token in exchange of 'authorization_code` acquired by the user in the first leg of the
     * authorization_code_grant
     * @param request
     */
    async acquireToken(request, authCodePayload) {
        this.performanceClient?.addQueueMeasurement(PerformanceEvents.AuthClientAcquireToken, request.correlationId);
        if (!request.code) {
            throw createClientAuthError(requestCannotBeMade);
        }
        const reqTimestamp = nowSeconds();
        const response = await invokeAsync(this.executeTokenRequest.bind(this), PerformanceEvents.AuthClientExecuteTokenRequest, this.logger, this.performanceClient, request.correlationId)(this.authority, request);
        // Retrieve requestId from response headers
        const requestId = response.headers?.[HeaderNames.X_MS_REQUEST_ID];
        const responseHandler = new ResponseHandler(this.config.authOptions.clientId, this.cacheManager, this.cryptoUtils, this.logger, this.config.serializableCache, this.config.persistencePlugin, this.performanceClient);
        // Validate response. This function throws a server error if an error is returned by the server.
        responseHandler.validateTokenResponse(response.body);
        return invokeAsync(responseHandler.handleServerTokenResponse.bind(responseHandler), PerformanceEvents.HandleServerTokenResponse, this.logger, this.performanceClient, request.correlationId)(response.body, this.authority, reqTimestamp, request, authCodePayload, undefined, undefined, undefined, requestId);
    }
    /**
     * Used to log out the current user, and redirect the user to the postLogoutRedirectUri.
     * Default behaviour is to redirect the user to `window.location.href`.
     * @param authorityUri
     */
    getLogoutUri(logoutRequest) {
        // Throw error if logoutRequest is null/undefined
        if (!logoutRequest) {
            throw createClientConfigurationError(logoutRequestEmpty);
        }
        const queryString = this.createLogoutUrlQueryString(logoutRequest);
        // Construct logout URI
        return UrlString.appendQueryString(this.authority.endSessionEndpoint, queryString);
    }
    /**
     * Executes POST request to token endpoint
     * @param authority
     * @param request
     */
    async executeTokenRequest(authority, request) {
        this.performanceClient?.addQueueMeasurement(PerformanceEvents.AuthClientExecuteTokenRequest, request.correlationId);
        const queryParametersString = this.createTokenQueryParameters(request);
        const endpoint = UrlString.appendQueryString(authority.tokenEndpoint, queryParametersString);
        const requestBody = await invokeAsync(this.createTokenRequestBody.bind(this), PerformanceEvents.AuthClientCreateTokenRequestBody, this.logger, this.performanceClient, request.correlationId)(request);
        let ccsCredential = undefined;
        if (request.clientInfo) {
            try {
                const clientInfo = buildClientInfo(request.clientInfo, this.cryptoUtils.base64Decode);
                ccsCredential = {
                    credential: `${clientInfo.uid}${Separators.CLIENT_INFO_SEPARATOR}${clientInfo.utid}`,
                    type: CcsCredentialType.HOME_ACCOUNT_ID,
                };
            }
            catch (e) {
                this.logger.verbose("Could not parse client info for CCS Header: " + e);
            }
        }
        const headers = this.createTokenRequestHeaders(ccsCredential || request.ccsCredential);
        const thumbprint = getRequestThumbprint(this.config.authOptions.clientId, request);
        return invokeAsync(this.executePostToTokenEndpoint.bind(this), PerformanceEvents.AuthorizationCodeClientExecutePostToTokenEndpoint, this.logger, this.performanceClient, request.correlationId)(endpoint, requestBody, headers, thumbprint, request.correlationId, PerformanceEvents.AuthorizationCodeClientExecutePostToTokenEndpoint);
    }
    /**
     * Generates a map for all the params to be sent to the service
     * @param request
     */
    async createTokenRequestBody(request) {
        this.performanceClient?.addQueueMeasurement(PerformanceEvents.AuthClientCreateTokenRequestBody, request.correlationId);
        const parameters = new Map();
        addClientId(parameters, request.embeddedClientId ||
            request.tokenBodyParameters?.[CLIENT_ID] ||
            this.config.authOptions.clientId);
        /*
         * For hybrid spa flow, there will be a code but no verifier
         * In this scenario, don't include redirect uri as auth code will not be bound to redirect URI
         */
        if (!this.includeRedirectUri) {
            // Just validate
            if (!request.redirectUri) {
                throw createClientConfigurationError(redirectUriEmpty);
            }
        }
        else {
            // Validate and include redirect uri
            addRedirectUri(parameters, request.redirectUri);
        }
        // Add scope array, parameter builder will add default scopes and dedupe
        addScopes(parameters, request.scopes, true, this.oidcDefaultScopes);
        // add code: user set, not validated
        addAuthorizationCode(parameters, request.code);
        // Add library metadata
        addLibraryInfo(parameters, this.config.libraryInfo);
        addApplicationTelemetry(parameters, this.config.telemetry.application);
        addThrottling(parameters);
        if (this.serverTelemetryManager && !isOidcProtocolMode(this.config)) {
            addServerTelemetry(parameters, this.serverTelemetryManager);
        }
        // add code_verifier if passed
        if (request.codeVerifier) {
            addCodeVerifier(parameters, request.codeVerifier);
        }
        if (this.config.clientCredentials.clientSecret) {
            addClientSecret(parameters, this.config.clientCredentials.clientSecret);
        }
        if (this.config.clientCredentials.clientAssertion) {
            const clientAssertion = this.config.clientCredentials.clientAssertion;
            addClientAssertion(parameters, await getClientAssertion(clientAssertion.assertion, this.config.authOptions.clientId, request.resourceRequestUri));
            addClientAssertionType(parameters, clientAssertion.assertionType);
        }
        addGrantType(parameters, GrantType.AUTHORIZATION_CODE_GRANT);
        addClientInfo(parameters);
        if (request.authenticationScheme === AuthenticationScheme.POP) {
            const popTokenGenerator = new PopTokenGenerator(this.cryptoUtils, this.performanceClient);
            let reqCnfData;
            if (!request.popKid) {
                const generatedReqCnfData = await invokeAsync(popTokenGenerator.generateCnf.bind(popTokenGenerator), PerformanceEvents.PopTokenGenerateCnf, this.logger, this.performanceClient, request.correlationId)(request, this.logger);
                reqCnfData = generatedReqCnfData.reqCnfString;
            }
            else {
                reqCnfData = this.cryptoUtils.encodeKid(request.popKid);
            }
            // SPA PoP requires full Base64Url encoded req_cnf string (unhashed)
            addPopToken(parameters, reqCnfData);
        }
        else if (request.authenticationScheme === AuthenticationScheme.SSH) {
            if (request.sshJwk) {
                addSshJwk(parameters, request.sshJwk);
            }
            else {
                throw createClientConfigurationError(missingSshJwk);
            }
        }
        if (!StringUtils.isEmptyObj(request.claims) ||
            (this.config.authOptions.clientCapabilities &&
                this.config.authOptions.clientCapabilities.length > 0)) {
            addClaims(parameters, request.claims, this.config.authOptions.clientCapabilities);
        }
        let ccsCred = undefined;
        if (request.clientInfo) {
            try {
                const clientInfo = buildClientInfo(request.clientInfo, this.cryptoUtils.base64Decode);
                ccsCred = {
                    credential: `${clientInfo.uid}${Separators.CLIENT_INFO_SEPARATOR}${clientInfo.utid}`,
                    type: CcsCredentialType.HOME_ACCOUNT_ID,
                };
            }
            catch (e) {
                this.logger.verbose("Could not parse client info for CCS Header: " + e);
            }
        }
        else {
            ccsCred = request.ccsCredential;
        }
        // Adds these as parameters in the request instead of headers to prevent CORS preflight request
        if (this.config.systemOptions.preventCorsPreflight && ccsCred) {
            switch (ccsCred.type) {
                case CcsCredentialType.HOME_ACCOUNT_ID:
                    try {
                        const clientInfo = buildClientInfoFromHomeAccountId(ccsCred.credential);
                        addCcsOid(parameters, clientInfo);
                    }
                    catch (e) {
                        this.logger.verbose("Could not parse home account ID for CCS Header: " +
                            e);
                    }
                    break;
                case CcsCredentialType.UPN:
                    addCcsUpn(parameters, ccsCred.credential);
                    break;
            }
        }
        if (request.embeddedClientId) {
            addBrokerParameters(parameters, this.config.authOptions.clientId, this.config.authOptions.redirectUri);
        }
        if (request.tokenBodyParameters) {
            addExtraQueryParameters(parameters, request.tokenBodyParameters);
        }
        // Add hybrid spa parameters if not already provided
        if (request.enableSpaAuthorizationCode &&
            (!request.tokenBodyParameters ||
                !request.tokenBodyParameters[RETURN_SPA_CODE])) {
            addExtraQueryParameters(parameters, {
                [RETURN_SPA_CODE]: "1",
            });
        }
        instrumentBrokerParams(parameters, request.correlationId, this.performanceClient);
        return mapToQueryString(parameters);
    }
    /**
     * This API validates the `EndSessionRequest` and creates a URL
     * @param request
     */
    createLogoutUrlQueryString(request) {
        const parameters = new Map();
        if (request.postLogoutRedirectUri) {
            addPostLogoutRedirectUri(parameters, request.postLogoutRedirectUri);
        }
        if (request.correlationId) {
            addCorrelationId(parameters, request.correlationId);
        }
        if (request.idTokenHint) {
            addIdTokenHint(parameters, request.idTokenHint);
        }
        if (request.state) {
            addState(parameters, request.state);
        }
        if (request.logoutHint) {
            addLogoutHint(parameters, request.logoutHint);
        }
        if (request.extraQueryParameters) {
            addExtraQueryParameters(parameters, request.extraQueryParameters);
        }
        if (this.config.authOptions.instanceAware) {
            addInstanceAware(parameters);
        }
        return mapToQueryString(parameters, this.config.authOptions.encodeExtraQueryParams, request.extraQueryParameters);
    }
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const DEFAULT_REFRESH_TOKEN_EXPIRATION_OFFSET_SECONDS = 300; // 5 Minutes
/**
 * OAuth2.0 refresh token client
 * @internal
 */
class RefreshTokenClient extends BaseClient {
    constructor(configuration, performanceClient) {
        super(configuration, performanceClient);
    }
    async acquireToken(request) {
        this.performanceClient?.addQueueMeasurement(PerformanceEvents.RefreshTokenClientAcquireToken, request.correlationId);
        const reqTimestamp = nowSeconds();
        const response = await invokeAsync(this.executeTokenRequest.bind(this), PerformanceEvents.RefreshTokenClientExecuteTokenRequest, this.logger, this.performanceClient, request.correlationId)(request, this.authority);
        // Retrieve requestId from response headers
        const requestId = response.headers?.[HeaderNames.X_MS_REQUEST_ID];
        const responseHandler = new ResponseHandler(this.config.authOptions.clientId, this.cacheManager, this.cryptoUtils, this.logger, this.config.serializableCache, this.config.persistencePlugin);
        responseHandler.validateTokenResponse(response.body);
        return invokeAsync(responseHandler.handleServerTokenResponse.bind(responseHandler), PerformanceEvents.HandleServerTokenResponse, this.logger, this.performanceClient, request.correlationId)(response.body, this.authority, reqTimestamp, request, undefined, undefined, true, request.forceCache, requestId);
    }
    /**
     * Gets cached refresh token and attaches to request, then calls acquireToken API
     * @param request
     */
    async acquireTokenByRefreshToken(request) {
        // Cannot renew token if no request object is given.
        if (!request) {
            throw createClientConfigurationError(tokenRequestEmpty);
        }
        this.performanceClient?.addQueueMeasurement(PerformanceEvents.RefreshTokenClientAcquireTokenByRefreshToken, request.correlationId);
        // We currently do not support silent flow for account === null use cases; This will be revisited for confidential flow usecases
        if (!request.account) {
            throw createClientAuthError(noAccountInSilentRequest);
        }
        // try checking if FOCI is enabled for the given application
        const isFOCI = this.cacheManager.isAppMetadataFOCI(request.account.environment);
        // if the app is part of the family, retrive a Family refresh token if present and make a refreshTokenRequest
        if (isFOCI) {
            try {
                return await invokeAsync(this.acquireTokenWithCachedRefreshToken.bind(this), PerformanceEvents.RefreshTokenClientAcquireTokenWithCachedRefreshToken, this.logger, this.performanceClient, request.correlationId)(request, true);
            }
            catch (e) {
                const noFamilyRTInCache = e instanceof InteractionRequiredAuthError &&
                    e.errorCode ===
                        noTokensFound;
                const clientMismatchErrorWithFamilyRT = e instanceof ServerError &&
                    e.errorCode === Errors.INVALID_GRANT_ERROR &&
                    e.subError === Errors.CLIENT_MISMATCH_ERROR;
                // if family Refresh Token (FRT) cache acquisition fails or if client_mismatch error is seen with FRT, reattempt with application Refresh Token (ART)
                if (noFamilyRTInCache || clientMismatchErrorWithFamilyRT) {
                    return invokeAsync(this.acquireTokenWithCachedRefreshToken.bind(this), PerformanceEvents.RefreshTokenClientAcquireTokenWithCachedRefreshToken, this.logger, this.performanceClient, request.correlationId)(request, false);
                    // throw in all other cases
                }
                else {
                    throw e;
                }
            }
        }
        // fall back to application refresh token acquisition
        return invokeAsync(this.acquireTokenWithCachedRefreshToken.bind(this), PerformanceEvents.RefreshTokenClientAcquireTokenWithCachedRefreshToken, this.logger, this.performanceClient, request.correlationId)(request, false);
    }
    /**
     * makes a network call to acquire tokens by exchanging RefreshToken available in userCache; throws if refresh token is not cached
     * @param request
     */
    async acquireTokenWithCachedRefreshToken(request, foci) {
        this.performanceClient?.addQueueMeasurement(PerformanceEvents.RefreshTokenClientAcquireTokenWithCachedRefreshToken, request.correlationId);
        // fetches family RT or application RT based on FOCI value
        const refreshToken = invoke(this.cacheManager.getRefreshToken.bind(this.cacheManager), PerformanceEvents.CacheManagerGetRefreshToken, this.logger, this.performanceClient, request.correlationId)(request.account, foci, request.correlationId, undefined, this.performanceClient);
        if (!refreshToken) {
            throw createInteractionRequiredAuthError(noTokensFound);
        }
        if (refreshToken.expiresOn &&
            isTokenExpired(refreshToken.expiresOn, request.refreshTokenExpirationOffsetSeconds ||
                DEFAULT_REFRESH_TOKEN_EXPIRATION_OFFSET_SECONDS)) {
            this.performanceClient?.addFields({ rtExpiresOnMs: Number(refreshToken.expiresOn) }, request.correlationId);
            throw createInteractionRequiredAuthError(refreshTokenExpired);
        }
        // attach cached RT size to the current measurement
        const refreshTokenRequest = {
            ...request,
            refreshToken: refreshToken.secret,
            authenticationScheme: request.authenticationScheme || AuthenticationScheme.BEARER,
            ccsCredential: {
                credential: request.account.homeAccountId,
                type: CcsCredentialType.HOME_ACCOUNT_ID,
            },
        };
        try {
            return await invokeAsync(this.acquireToken.bind(this), PerformanceEvents.RefreshTokenClientAcquireToken, this.logger, this.performanceClient, request.correlationId)(refreshTokenRequest);
        }
        catch (e) {
            if (e instanceof InteractionRequiredAuthError) {
                this.performanceClient?.addFields({ rtExpiresOnMs: Number(refreshToken.expiresOn) }, request.correlationId);
                if (e.subError === badToken) {
                    // Remove bad refresh token from cache
                    this.logger.verbose("acquireTokenWithRefreshToken: bad refresh token, removing from cache");
                    const badRefreshTokenKey = this.cacheManager.generateCredentialKey(refreshToken);
                    this.cacheManager.removeRefreshToken(badRefreshTokenKey, request.correlationId);
                }
            }
            throw e;
        }
    }
    /**
     * Constructs the network message and makes a NW call to the underlying secure token service
     * @param request
     * @param authority
     */
    async executeTokenRequest(request, authority) {
        this.performanceClient?.addQueueMeasurement(PerformanceEvents.RefreshTokenClientExecuteTokenRequest, request.correlationId);
        const queryParametersString = this.createTokenQueryParameters(request);
        const endpoint = UrlString.appendQueryString(authority.tokenEndpoint, queryParametersString);
        const requestBody = await invokeAsync(this.createTokenRequestBody.bind(this), PerformanceEvents.RefreshTokenClientCreateTokenRequestBody, this.logger, this.performanceClient, request.correlationId)(request);
        const headers = this.createTokenRequestHeaders(request.ccsCredential);
        const thumbprint = getRequestThumbprint(this.config.authOptions.clientId, request);
        return invokeAsync(this.executePostToTokenEndpoint.bind(this), PerformanceEvents.RefreshTokenClientExecutePostToTokenEndpoint, this.logger, this.performanceClient, request.correlationId)(endpoint, requestBody, headers, thumbprint, request.correlationId, PerformanceEvents.RefreshTokenClientExecutePostToTokenEndpoint);
    }
    /**
     * Helper function to create the token request body
     * @param request
     */
    async createTokenRequestBody(request) {
        this.performanceClient?.addQueueMeasurement(PerformanceEvents.RefreshTokenClientCreateTokenRequestBody, request.correlationId);
        const parameters = new Map();
        addClientId(parameters, request.embeddedClientId ||
            request.tokenBodyParameters?.[CLIENT_ID] ||
            this.config.authOptions.clientId);
        if (request.redirectUri) {
            addRedirectUri(parameters, request.redirectUri);
        }
        addScopes(parameters, request.scopes, true, this.config.authOptions.authority.options.OIDCOptions?.defaultScopes);
        addGrantType(parameters, GrantType.REFRESH_TOKEN_GRANT);
        addClientInfo(parameters);
        addLibraryInfo(parameters, this.config.libraryInfo);
        addApplicationTelemetry(parameters, this.config.telemetry.application);
        addThrottling(parameters);
        if (this.serverTelemetryManager && !isOidcProtocolMode(this.config)) {
            addServerTelemetry(parameters, this.serverTelemetryManager);
        }
        addRefreshToken(parameters, request.refreshToken);
        if (this.config.clientCredentials.clientSecret) {
            addClientSecret(parameters, this.config.clientCredentials.clientSecret);
        }
        if (this.config.clientCredentials.clientAssertion) {
            const clientAssertion = this.config.clientCredentials.clientAssertion;
            addClientAssertion(parameters, await getClientAssertion(clientAssertion.assertion, this.config.authOptions.clientId, request.resourceRequestUri));
            addClientAssertionType(parameters, clientAssertion.assertionType);
        }
        if (request.authenticationScheme === AuthenticationScheme.POP) {
            const popTokenGenerator = new PopTokenGenerator(this.cryptoUtils, this.performanceClient);
            let reqCnfData;
            if (!request.popKid) {
                const generatedReqCnfData = await invokeAsync(popTokenGenerator.generateCnf.bind(popTokenGenerator), PerformanceEvents.PopTokenGenerateCnf, this.logger, this.performanceClient, request.correlationId)(request, this.logger);
                reqCnfData = generatedReqCnfData.reqCnfString;
            }
            else {
                reqCnfData = this.cryptoUtils.encodeKid(request.popKid);
            }
            // SPA PoP requires full Base64Url encoded req_cnf string (unhashed)
            addPopToken(parameters, reqCnfData);
        }
        else if (request.authenticationScheme === AuthenticationScheme.SSH) {
            if (request.sshJwk) {
                addSshJwk(parameters, request.sshJwk);
            }
            else {
                throw createClientConfigurationError(missingSshJwk);
            }
        }
        if (!StringUtils.isEmptyObj(request.claims) ||
            (this.config.authOptions.clientCapabilities &&
                this.config.authOptions.clientCapabilities.length > 0)) {
            addClaims(parameters, request.claims, this.config.authOptions.clientCapabilities);
        }
        if (this.config.systemOptions.preventCorsPreflight &&
            request.ccsCredential) {
            switch (request.ccsCredential.type) {
                case CcsCredentialType.HOME_ACCOUNT_ID:
                    try {
                        const clientInfo = buildClientInfoFromHomeAccountId(request.ccsCredential.credential);
                        addCcsOid(parameters, clientInfo);
                    }
                    catch (e) {
                        this.logger.verbose("Could not parse home account ID for CCS Header: " +
                            e);
                    }
                    break;
                case CcsCredentialType.UPN:
                    addCcsUpn(parameters, request.ccsCredential.credential);
                    break;
            }
        }
        if (request.embeddedClientId) {
            addBrokerParameters(parameters, this.config.authOptions.clientId, this.config.authOptions.redirectUri);
        }
        if (request.tokenBodyParameters) {
            addExtraQueryParameters(parameters, request.tokenBodyParameters);
        }
        instrumentBrokerParams(parameters, request.correlationId, this.performanceClient);
        return mapToQueryString(parameters);
    }
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/** @internal */
class SilentFlowClient extends BaseClient {
    constructor(configuration, performanceClient) {
        super(configuration, performanceClient);
    }
    /**
     * Retrieves token from cache or throws an error if it must be refreshed.
     * @param request
     */
    async acquireCachedToken(request) {
        this.performanceClient?.addQueueMeasurement(PerformanceEvents.SilentFlowClientAcquireCachedToken, request.correlationId);
        let lastCacheOutcome = CacheOutcome.NOT_APPLICABLE;
        if (request.forceRefresh ||
            (!this.config.cacheOptions.claimsBasedCachingEnabled &&
                !StringUtils.isEmptyObj(request.claims))) {
            // Must refresh due to present force_refresh flag.
            this.setCacheOutcome(CacheOutcome.FORCE_REFRESH_OR_CLAIMS, request.correlationId);
            throw createClientAuthError(tokenRefreshRequired);
        }
        // We currently do not support silent flow for account === null use cases; This will be revisited for confidential flow usecases
        if (!request.account) {
            throw createClientAuthError(noAccountInSilentRequest);
        }
        const requestTenantId = request.account.tenantId ||
            getTenantFromAuthorityString(request.authority);
        const tokenKeys = this.cacheManager.getTokenKeys();
        const cachedAccessToken = this.cacheManager.getAccessToken(request.account, request, tokenKeys, requestTenantId);
        if (!cachedAccessToken) {
            // must refresh due to non-existent access_token
            this.setCacheOutcome(CacheOutcome.NO_CACHED_ACCESS_TOKEN, request.correlationId);
            throw createClientAuthError(tokenRefreshRequired);
        }
        else if (wasClockTurnedBack(cachedAccessToken.cachedAt) ||
            isTokenExpired(cachedAccessToken.expiresOn, this.config.systemOptions.tokenRenewalOffsetSeconds)) {
            // must refresh due to the expires_in value
            this.setCacheOutcome(CacheOutcome.CACHED_ACCESS_TOKEN_EXPIRED, request.correlationId);
            throw createClientAuthError(tokenRefreshRequired);
        }
        else if (cachedAccessToken.refreshOn &&
            isTokenExpired(cachedAccessToken.refreshOn, 0)) {
            // must refresh (in the background) due to the refresh_in value
            lastCacheOutcome = CacheOutcome.PROACTIVELY_REFRESHED;
            // don't throw ClientAuthError.createRefreshRequiredError(), return cached token instead
        }
        const environment = request.authority || this.authority.getPreferredCache();
        const cacheRecord = {
            account: this.cacheManager.getAccount(this.cacheManager.generateAccountKey(request.account), request.correlationId),
            accessToken: cachedAccessToken,
            idToken: this.cacheManager.getIdToken(request.account, request.correlationId, tokenKeys, requestTenantId, this.performanceClient),
            refreshToken: null,
            appMetadata: this.cacheManager.readAppMetadataFromCache(environment),
        };
        this.setCacheOutcome(lastCacheOutcome, request.correlationId);
        if (this.config.serverTelemetryManager) {
            this.config.serverTelemetryManager.incrementCacheHits();
        }
        return [
            await invokeAsync(this.generateResultFromCacheRecord.bind(this), PerformanceEvents.SilentFlowClientGenerateResultFromCacheRecord, this.logger, this.performanceClient, request.correlationId)(cacheRecord, request),
            lastCacheOutcome,
        ];
    }
    setCacheOutcome(cacheOutcome, correlationId) {
        this.serverTelemetryManager?.setCacheOutcome(cacheOutcome);
        this.performanceClient?.addFields({
            cacheOutcome: cacheOutcome,
        }, correlationId);
        if (cacheOutcome !== CacheOutcome.NOT_APPLICABLE) {
            this.logger.info(`Token refresh is required due to cache outcome: ${cacheOutcome}`);
        }
    }
    /**
     * Helper function to build response object from the CacheRecord
     * @param cacheRecord
     */
    async generateResultFromCacheRecord(cacheRecord, request) {
        this.performanceClient?.addQueueMeasurement(PerformanceEvents.SilentFlowClientGenerateResultFromCacheRecord, request.correlationId);
        let idTokenClaims;
        if (cacheRecord.idToken) {
            idTokenClaims = extractTokenClaims(cacheRecord.idToken.secret, this.config.cryptoInterface.base64Decode);
        }
        // token max_age check
        if (request.maxAge || request.maxAge === 0) {
            const authTime = idTokenClaims?.auth_time;
            if (!authTime) {
                throw createClientAuthError(authTimeNotFound);
            }
            checkMaxAge(authTime, request.maxAge);
        }
        return ResponseHandler.generateAuthenticationResult(this.cryptoUtils, this.authority, cacheRecord, true, request, idTokenClaims);
    }
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const StubbedNetworkModule = {
    sendGetRequestAsync: () => {
        return Promise.reject(createClientAuthError(methodNotImplemented));
    },
    sendPostRequestAsync: () => {
        return Promise.reject(createClientAuthError(methodNotImplemented));
    },
};

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Returns map of parameters that are applicable to all calls to /authorize whether using PKCE or EAR
 * @param config
 * @param request
 * @param logger
 * @param performanceClient
 * @returns
 */
function getStandardAuthorizeRequestParameters(authOptions, request, logger, performanceClient) {
    // generate the correlationId if not set by the user and add
    const correlationId = request.correlationId;
    const parameters = new Map();
    addClientId(parameters, request.embeddedClientId ||
        request.extraQueryParameters?.[CLIENT_ID] ||
        authOptions.clientId);
    const requestScopes = [
        ...(request.scopes || []),
        ...(request.extraScopesToConsent || []),
    ];
    addScopes(parameters, requestScopes, true, authOptions.authority.options.OIDCOptions?.defaultScopes);
    addRedirectUri(parameters, request.redirectUri);
    addCorrelationId(parameters, correlationId);
    // add response_mode. If not passed in it defaults to query.
    addResponseMode(parameters, request.responseMode);
    // add client_info=1
    addClientInfo(parameters);
    if (request.prompt) {
        addPrompt(parameters, request.prompt);
        performanceClient?.addFields({ prompt: request.prompt }, correlationId);
    }
    if (request.domainHint) {
        addDomainHint(parameters, request.domainHint);
        performanceClient?.addFields({ domainHintFromRequest: true }, correlationId);
    }
    // Add sid or loginHint with preference for login_hint claim (in request) -> sid -> loginHint (upn/email) -> username of AccountInfo object
    if (request.prompt !== PromptValue.SELECT_ACCOUNT) {
        // AAD will throw if prompt=select_account is passed with an account hint
        if (request.sid && request.prompt === PromptValue.NONE) {
            // SessionID is only used in silent calls
            logger.verbose("createAuthCodeUrlQueryString: Prompt is none, adding sid from request");
            addSid(parameters, request.sid);
            performanceClient?.addFields({ sidFromRequest: true }, correlationId);
        }
        else if (request.account) {
            const accountSid = extractAccountSid(request.account);
            let accountLoginHintClaim = extractLoginHint(request.account);
            if (accountLoginHintClaim && request.domainHint) {
                logger.warning(`AuthorizationCodeClient.createAuthCodeUrlQueryString: "domainHint" param is set, skipping opaque "login_hint" claim. Please consider not passing domainHint`);
                accountLoginHintClaim = null;
            }
            // If login_hint claim is present, use it over sid/username
            if (accountLoginHintClaim) {
                logger.verbose("createAuthCodeUrlQueryString: login_hint claim present on account");
                addLoginHint(parameters, accountLoginHintClaim);
                performanceClient?.addFields({ loginHintFromClaim: true }, correlationId);
                try {
                    const clientInfo = buildClientInfoFromHomeAccountId(request.account.homeAccountId);
                    addCcsOid(parameters, clientInfo);
                }
                catch (e) {
                    logger.verbose("createAuthCodeUrlQueryString: Could not parse home account ID for CCS Header");
                }
            }
            else if (accountSid && request.prompt === PromptValue.NONE) {
                /*
                 * If account and loginHint are provided, we will check account first for sid before adding loginHint
                 * SessionId is only used in silent calls
                 */
                logger.verbose("createAuthCodeUrlQueryString: Prompt is none, adding sid from account");
                addSid(parameters, accountSid);
                performanceClient?.addFields({ sidFromClaim: true }, correlationId);
                try {
                    const clientInfo = buildClientInfoFromHomeAccountId(request.account.homeAccountId);
                    addCcsOid(parameters, clientInfo);
                }
                catch (e) {
                    logger.verbose("createAuthCodeUrlQueryString: Could not parse home account ID for CCS Header");
                }
            }
            else if (request.loginHint) {
                logger.verbose("createAuthCodeUrlQueryString: Adding login_hint from request");
                addLoginHint(parameters, request.loginHint);
                addCcsUpn(parameters, request.loginHint);
                performanceClient?.addFields({ loginHintFromRequest: true }, correlationId);
            }
            else if (request.account.username) {
                // Fallback to account username if provided
                logger.verbose("createAuthCodeUrlQueryString: Adding login_hint from account");
                addLoginHint(parameters, request.account.username);
                performanceClient?.addFields({ loginHintFromUpn: true }, correlationId);
                try {
                    const clientInfo = buildClientInfoFromHomeAccountId(request.account.homeAccountId);
                    addCcsOid(parameters, clientInfo);
                }
                catch (e) {
                    logger.verbose("createAuthCodeUrlQueryString: Could not parse home account ID for CCS Header");
                }
            }
        }
        else if (request.loginHint) {
            logger.verbose("createAuthCodeUrlQueryString: No account, adding login_hint from request");
            addLoginHint(parameters, request.loginHint);
            addCcsUpn(parameters, request.loginHint);
            performanceClient?.addFields({ loginHintFromRequest: true }, correlationId);
        }
    }
    else {
        logger.verbose("createAuthCodeUrlQueryString: Prompt is select_account, ignoring account hints");
    }
    if (request.nonce) {
        addNonce(parameters, request.nonce);
    }
    if (request.state) {
        addState(parameters, request.state);
    }
    if (request.claims ||
        (authOptions.clientCapabilities &&
            authOptions.clientCapabilities.length > 0)) {
        addClaims(parameters, request.claims, authOptions.clientCapabilities);
    }
    if (request.embeddedClientId) {
        addBrokerParameters(parameters, authOptions.clientId, authOptions.redirectUri);
    }
    // If extraQueryParameters includes instance_aware its value will be added when extraQueryParameters are added
    if (authOptions.instanceAware &&
        (!request.extraQueryParameters ||
            !Object.keys(request.extraQueryParameters).includes(INSTANCE_AWARE))) {
        addInstanceAware(parameters);
    }
    return parameters;
}
/**
 * Returns authorize endpoint with given request parameters in the query string
 * @param authority
 * @param requestParameters
 * @returns
 */
function getAuthorizeUrl(authority, requestParameters, encodeParams, extraQueryParameters) {
    const queryString = mapToQueryString(requestParameters, encodeParams, extraQueryParameters);
    return UrlString.appendQueryString(authority.authorizationEndpoint, queryString);
}
/**
 * Handles the hash fragment response from public client code request. Returns a code response used by
 * the client to exchange for a token in acquireToken.
 * @param serverParams
 * @param cachedState
 */
function getAuthorizationCodePayload(serverParams, cachedState) {
    // Get code response
    validateAuthorizationResponse(serverParams, cachedState);
    // throw when there is no auth code in the response
    if (!serverParams.code) {
        throw createClientAuthError(authorizationCodeMissingFromServerResponse);
    }
    return serverParams;
}
/**
 * Function which validates server authorization code response.
 * @param serverResponseHash
 * @param requestState
 */
function validateAuthorizationResponse(serverResponse, requestState) {
    if (!serverResponse.state || !requestState) {
        throw serverResponse.state
            ? createClientAuthError(stateNotFound, "Cached State")
            : createClientAuthError(stateNotFound, "Server State");
    }
    let decodedServerResponseState;
    let decodedRequestState;
    try {
        decodedServerResponseState = decodeURIComponent(serverResponse.state);
    }
    catch (e) {
        throw createClientAuthError(invalidState, serverResponse.state);
    }
    try {
        decodedRequestState = decodeURIComponent(requestState);
    }
    catch (e) {
        throw createClientAuthError(invalidState, serverResponse.state);
    }
    if (decodedServerResponseState !== decodedRequestState) {
        throw createClientAuthError(stateMismatch);
    }
    // Check for error
    if (serverResponse.error ||
        serverResponse.error_description ||
        serverResponse.suberror) {
        const serverErrorNo = parseServerErrorNo(serverResponse);
        if (isInteractionRequiredError(serverResponse.error, serverResponse.error_description, serverResponse.suberror)) {
            throw new InteractionRequiredAuthError(serverResponse.error || "", serverResponse.error_description, serverResponse.suberror, serverResponse.timestamp || "", serverResponse.trace_id || "", serverResponse.correlation_id || "", serverResponse.claims || "", serverErrorNo);
        }
        throw new ServerError(serverResponse.error || "", serverResponse.error_description, serverResponse.suberror, serverErrorNo);
    }
}
/**
 * Get server error No from the error_uri
 * @param serverResponse
 * @returns
 */
function parseServerErrorNo(serverResponse) {
    const errorCodePrefix = "code=";
    const errorCodePrefixIndex = serverResponse.error_uri?.lastIndexOf(errorCodePrefix);
    return errorCodePrefixIndex && errorCodePrefixIndex >= 0
        ? serverResponse.error_uri?.substring(errorCodePrefixIndex + errorCodePrefix.length)
        : undefined;
}
/**
 * Helper to get sid from account. Returns null if idTokenClaims are not present or sid is not present.
 * @param account
 */
function extractAccountSid(account) {
    return account.idTokenClaims?.sid || null;
}
function extractLoginHint(account) {
    return account.loginHint || account.idTokenClaims?.login_hint || null;
}

var Authorize = /*#__PURE__*/Object.freeze({
    __proto__: null,
    getAuthorizationCodePayload: getAuthorizationCodePayload,
    getAuthorizeUrl: getAuthorizeUrl,
    getStandardAuthorizeRequestParameters: getStandardAuthorizeRequestParameters,
    validateAuthorizationResponse: validateAuthorizationResponse
});

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * This is a helper class that parses supported HTTP response authentication headers to extract and return
 * header challenge values that can be used outside the basic authorization flows.
 */
class AuthenticationHeaderParser {
    constructor(headers) {
        this.headers = headers;
    }
    /**
     * This method parses the SHR nonce value out of either the Authentication-Info or WWW-Authenticate authentication headers.
     * @returns
     */
    getShrNonce() {
        // Attempt to parse nonce from Authentiacation-Info
        const authenticationInfo = this.headers[HeaderNames.AuthenticationInfo];
        if (authenticationInfo) {
            const authenticationInfoChallenges = this.parseChallenges(authenticationInfo);
            if (authenticationInfoChallenges.nextnonce) {
                return authenticationInfoChallenges.nextnonce;
            }
            throw createClientConfigurationError(invalidAuthenticationHeader);
        }
        // Attempt to parse nonce from WWW-Authenticate
        const wwwAuthenticate = this.headers[HeaderNames.WWWAuthenticate];
        if (wwwAuthenticate) {
            const wwwAuthenticateChallenges = this.parseChallenges(wwwAuthenticate);
            if (wwwAuthenticateChallenges.nonce) {
                return wwwAuthenticateChallenges.nonce;
            }
            throw createClientConfigurationError(invalidAuthenticationHeader);
        }
        // If neither header is present, throw missing headers error
        throw createClientConfigurationError(missingNonceAuthenticationHeader);
    }
    /**
     * Parses an HTTP header's challenge set into a key/value map.
     * @param header
     * @returns
     */
    parseChallenges(header) {
        const schemeSeparator = header.indexOf(" ");
        const challenges = header.substr(schemeSeparator + 1).split(",");
        const challengeMap = {};
        challenges.forEach((challenge) => {
            const [key, value] = challenge.split("=");
            // Remove escaped quotation marks (', ") from challenge string to keep only the challenge value
            challengeMap[key] = unescape(value.replace(/['"]+/g, Constants.EMPTY_STRING));
        });
        return challengeMap;
    }
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Converts a numeric tag to a string representation
 * @param tag - The numeric tag to convert
 * @returns The string representation of the tag
 */
function tagToString(tag) {
    if (tag === 0) {
        return "UNTAG";
    }
    const tagSymbolSpace = "abcdefghijklmnopqrstuvwxyz0123456789****************************";
    let tagBuffer = "*****";
    const chars = [
        tagSymbolSpace[(tag >> 24) & 0x3f],
        tagSymbolSpace[(tag >> 18) & 0x3f],
        tagSymbolSpace[(tag >> 12) & 0x3f],
        tagSymbolSpace[(tag >> 6) & 0x3f],
        tagSymbolSpace[(tag >> 0) & 0x3f],
    ];
    tagBuffer = chars.join("");
    return tagBuffer;
}
/**
 * Error class for MSAL Runtime errors that preserves detailed broker information
 */
class PlatformBrokerError extends AuthError {
    constructor(errorStatus, errorContext, errorCode, errorTag) {
        const tagString = tagToString(errorTag);
        const enhancedErrorContext = errorContext
            ? `${errorContext} (Error Code: ${errorCode}, Tag: ${tagString})`
            : `(Error Code: ${errorCode}, Tag: ${tagString})`;
        super(errorStatus, enhancedErrorContext);
        this.name = "PlatformBrokerError";
        this.statusCode = errorCode;
        this.tag = tagString;
        Object.setPrototypeOf(this, PlatformBrokerError.prototype);
    }
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const skuGroupSeparator = ",";
const skuValueSeparator = "|";
function makeExtraSkuString(params) {
    const { skus, libraryName, libraryVersion, extensionName, extensionVersion, } = params;
    const skuMap = new Map([
        [0, [libraryName, libraryVersion]],
        [2, [extensionName, extensionVersion]],
    ]);
    let skuArr = [];
    if (skus?.length) {
        skuArr = skus.split(skuGroupSeparator);
        // Ignore invalid input sku param
        if (skuArr.length < 4) {
            return skus;
        }
    }
    else {
        skuArr = Array.from({ length: 4 }, () => skuValueSeparator);
    }
    skuMap.forEach((value, key) => {
        if (value.length === 2 && value[0]?.length && value[1]?.length) {
            setSku({
                skuArr,
                index: key,
                skuName: value[0],
                skuVersion: value[1],
            });
        }
    });
    return skuArr.join(skuGroupSeparator);
}
function setSku(params) {
    const { skuArr, index, skuName, skuVersion } = params;
    if (index >= skuArr.length) {
        return;
    }
    skuArr[index] = [skuName, skuVersion].join(skuValueSeparator);
}
/** @internal */
class ServerTelemetryManager {
    constructor(telemetryRequest, cacheManager) {
        this.cacheOutcome = CacheOutcome.NOT_APPLICABLE;
        this.cacheManager = cacheManager;
        this.apiId = telemetryRequest.apiId;
        this.correlationId = telemetryRequest.correlationId;
        this.wrapperSKU = telemetryRequest.wrapperSKU || Constants.EMPTY_STRING;
        this.wrapperVer = telemetryRequest.wrapperVer || Constants.EMPTY_STRING;
        this.telemetryCacheKey =
            SERVER_TELEM_CONSTANTS.CACHE_KEY +
                Separators.CACHE_KEY_SEPARATOR +
                telemetryRequest.clientId;
    }
    /**
     * API to add MSER Telemetry to request
     */
    generateCurrentRequestHeaderValue() {
        const request = `${this.apiId}${SERVER_TELEM_CONSTANTS.VALUE_SEPARATOR}${this.cacheOutcome}`;
        const platformFieldsArr = [this.wrapperSKU, this.wrapperVer];
        const nativeBrokerErrorCode = this.getNativeBrokerErrorCode();
        if (nativeBrokerErrorCode?.length) {
            platformFieldsArr.push(`broker_error=${nativeBrokerErrorCode}`);
        }
        const platformFields = platformFieldsArr.join(SERVER_TELEM_CONSTANTS.VALUE_SEPARATOR);
        const regionDiscoveryFields = this.getRegionDiscoveryFields();
        const requestWithRegionDiscoveryFields = [
            request,
            regionDiscoveryFields,
        ].join(SERVER_TELEM_CONSTANTS.VALUE_SEPARATOR);
        return [
            SERVER_TELEM_CONSTANTS.SCHEMA_VERSION,
            requestWithRegionDiscoveryFields,
            platformFields,
        ].join(SERVER_TELEM_CONSTANTS.CATEGORY_SEPARATOR);
    }
    /**
     * API to add MSER Telemetry for the last failed request
     */
    generateLastRequestHeaderValue() {
        const lastRequests = this.getLastRequests();
        const maxErrors = ServerTelemetryManager.maxErrorsToSend(lastRequests);
        const failedRequests = lastRequests.failedRequests
            .slice(0, 2 * maxErrors)
            .join(SERVER_TELEM_CONSTANTS.VALUE_SEPARATOR);
        const errors = lastRequests.errors
            .slice(0, maxErrors)
            .join(SERVER_TELEM_CONSTANTS.VALUE_SEPARATOR);
        const errorCount = lastRequests.errors.length;
        // Indicate whether this header contains all data or partial data
        const overflow = maxErrors < errorCount
            ? SERVER_TELEM_CONSTANTS.OVERFLOW_TRUE
            : SERVER_TELEM_CONSTANTS.OVERFLOW_FALSE;
        const platformFields = [errorCount, overflow].join(SERVER_TELEM_CONSTANTS.VALUE_SEPARATOR);
        return [
            SERVER_TELEM_CONSTANTS.SCHEMA_VERSION,
            lastRequests.cacheHits,
            failedRequests,
            errors,
            platformFields,
        ].join(SERVER_TELEM_CONSTANTS.CATEGORY_SEPARATOR);
    }
    /**
     * API to cache token failures for MSER data capture
     * @param error
     */
    cacheFailedRequest(error) {
        const lastRequests = this.getLastRequests();
        if (lastRequests.errors.length >=
            SERVER_TELEM_CONSTANTS.MAX_CACHED_ERRORS) {
            // Remove a cached error to make room, first in first out
            lastRequests.failedRequests.shift(); // apiId
            lastRequests.failedRequests.shift(); // correlationId
            lastRequests.errors.shift();
        }
        lastRequests.failedRequests.push(this.apiId, this.correlationId);
        if (error instanceof Error && !!error && error.toString()) {
            if (error instanceof AuthError) {
                if (error.subError) {
                    lastRequests.errors.push(error.subError);
                }
                else if (error.errorCode) {
                    lastRequests.errors.push(error.errorCode);
                }
                else {
                    lastRequests.errors.push(error.toString());
                }
            }
            else {
                lastRequests.errors.push(error.toString());
            }
        }
        else {
            lastRequests.errors.push(SERVER_TELEM_CONSTANTS.UNKNOWN_ERROR);
        }
        this.cacheManager.setServerTelemetry(this.telemetryCacheKey, lastRequests, this.correlationId);
        return;
    }
    /**
     * Update server telemetry cache entry by incrementing cache hit counter
     */
    incrementCacheHits() {
        const lastRequests = this.getLastRequests();
        lastRequests.cacheHits += 1;
        this.cacheManager.setServerTelemetry(this.telemetryCacheKey, lastRequests, this.correlationId);
        return lastRequests.cacheHits;
    }
    /**
     * Get the server telemetry entity from cache or initialize a new one
     */
    getLastRequests() {
        const initialValue = {
            failedRequests: [],
            errors: [],
            cacheHits: 0,
        };
        const lastRequests = this.cacheManager.getServerTelemetry(this.telemetryCacheKey);
        return lastRequests || initialValue;
    }
    /**
     * Remove server telemetry cache entry
     */
    clearTelemetryCache() {
        const lastRequests = this.getLastRequests();
        const numErrorsFlushed = ServerTelemetryManager.maxErrorsToSend(lastRequests);
        const errorCount = lastRequests.errors.length;
        if (numErrorsFlushed === errorCount) {
            // All errors were sent on last request, clear Telemetry cache
            this.cacheManager.removeItem(this.telemetryCacheKey, this.correlationId);
        }
        else {
            // Partial data was flushed to server, construct a new telemetry cache item with errors that were not flushed
            const serverTelemEntity = {
                failedRequests: lastRequests.failedRequests.slice(numErrorsFlushed * 2),
                errors: lastRequests.errors.slice(numErrorsFlushed),
                cacheHits: 0,
            };
            this.cacheManager.setServerTelemetry(this.telemetryCacheKey, serverTelemEntity, this.correlationId);
        }
    }
    /**
     * Returns the maximum number of errors that can be flushed to the server in the next network request
     * @param serverTelemetryEntity
     */
    static maxErrorsToSend(serverTelemetryEntity) {
        let i;
        let maxErrors = 0;
        let dataSize = 0;
        const errorCount = serverTelemetryEntity.errors.length;
        for (i = 0; i < errorCount; i++) {
            // failedRequests parameter contains pairs of apiId and correlationId, multiply index by 2 to preserve pairs
            const apiId = serverTelemetryEntity.failedRequests[2 * i] ||
                Constants.EMPTY_STRING;
            const correlationId = serverTelemetryEntity.failedRequests[2 * i + 1] ||
                Constants.EMPTY_STRING;
            const errorCode = serverTelemetryEntity.errors[i] || Constants.EMPTY_STRING;
            // Count number of characters that would be added to header, each character is 1 byte. Add 3 at the end to account for separators
            dataSize +=
                apiId.toString().length +
                    correlationId.toString().length +
                    errorCode.length +
                    3;
            if (dataSize < SERVER_TELEM_CONSTANTS.MAX_LAST_HEADER_BYTES) {
                // Adding this entry to the header would still keep header size below the limit
                maxErrors += 1;
            }
            else {
                break;
            }
        }
        return maxErrors;
    }
    /**
     * Get the region discovery fields
     *
     * @returns string
     */
    getRegionDiscoveryFields() {
        const regionDiscoveryFields = [];
        regionDiscoveryFields.push(this.regionUsed || Constants.EMPTY_STRING);
        regionDiscoveryFields.push(this.regionSource || Constants.EMPTY_STRING);
        regionDiscoveryFields.push(this.regionOutcome || Constants.EMPTY_STRING);
        return regionDiscoveryFields.join(",");
    }
    /**
     * Update the region discovery metadata
     *
     * @param regionDiscoveryMetadata
     * @returns void
     */
    updateRegionDiscoveryMetadata(regionDiscoveryMetadata) {
        this.regionUsed = regionDiscoveryMetadata.region_used;
        this.regionSource = regionDiscoveryMetadata.region_source;
        this.regionOutcome = regionDiscoveryMetadata.region_outcome;
    }
    /**
     * Set cache outcome
     */
    setCacheOutcome(cacheOutcome) {
        this.cacheOutcome = cacheOutcome;
    }
    setNativeBrokerErrorCode(errorCode) {
        const lastRequests = this.getLastRequests();
        lastRequests.nativeBrokerErrorCode = errorCode;
        this.cacheManager.setServerTelemetry(this.telemetryCacheKey, lastRequests, this.correlationId);
    }
    getNativeBrokerErrorCode() {
        return this.getLastRequests().nativeBrokerErrorCode;
    }
    clearNativeBrokerErrorCode() {
        const lastRequests = this.getLastRequests();
        delete lastRequests.nativeBrokerErrorCode;
        this.cacheManager.setServerTelemetry(this.telemetryCacheKey, lastRequests, this.correlationId);
    }
    static makeExtraSkuString(params) {
        return makeExtraSkuString(params);
    }
}

exports.AADAuthorityConstants = AADAuthorityConstants;
exports.AADServerParamKeys = AADServerParamKeys;
exports.AccountEntity = AccountEntity;
exports.AuthError = AuthError;
exports.AuthErrorCodes = AuthErrorCodes;
exports.AuthErrorMessage = AuthErrorMessage;
exports.AuthToken = AuthToken;
exports.AuthenticationHeaderParser = AuthenticationHeaderParser;
exports.AuthenticationScheme = AuthenticationScheme;
exports.Authority = Authority;
exports.AuthorityFactory = AuthorityFactory;
exports.AuthorityType = AuthorityType;
exports.AuthorizationCodeClient = AuthorizationCodeClient;
exports.Authorize = Authorize;
exports.AzureCloudInstance = AzureCloudInstance;
exports.BaseClient = BaseClient;
exports.CacheAccountType = CacheAccountType;
exports.CacheError = CacheError;
exports.CacheErrorCodes = CacheErrorCodes;
exports.CacheHelpers = CacheHelpers;
exports.CacheManager = CacheManager;
exports.CacheOutcome = CacheOutcome;
exports.CacheType = CacheType;
exports.CcsCredentialType = CcsCredentialType;
exports.ClaimsRequestKeys = ClaimsRequestKeys;
exports.ClientAssertionUtils = ClientAssertionUtils;
exports.ClientAuthError = ClientAuthError;
exports.ClientAuthErrorCodes = ClientAuthErrorCodes;
exports.ClientAuthErrorMessage = ClientAuthErrorMessage;
exports.ClientConfigurationError = ClientConfigurationError;
exports.ClientConfigurationErrorCodes = ClientConfigurationErrorCodes;
exports.ClientConfigurationErrorMessage = ClientConfigurationErrorMessage;
exports.CodeChallengeMethodValues = CodeChallengeMethodValues;
exports.Constants = Constants;
exports.CredentialType = CredentialType;
exports.DEFAULT_CRYPTO_IMPLEMENTATION = DEFAULT_CRYPTO_IMPLEMENTATION;
exports.DEFAULT_SYSTEM_OPTIONS = DEFAULT_SYSTEM_OPTIONS;
exports.DEFAULT_TOKEN_RENEWAL_OFFSET_SEC = DEFAULT_TOKEN_RENEWAL_OFFSET_SEC;
exports.DefaultStorageClass = DefaultStorageClass;
exports.EncodingTypes = EncodingTypes;
exports.Errors = Errors;
exports.GrantType = GrantType;
exports.HeaderNames = HeaderNames;
exports.HttpMethod = HttpMethod;
exports.HttpStatus = HttpStatus;
exports.IntFields = IntFields;
exports.InteractionRequiredAuthError = InteractionRequiredAuthError;
exports.InteractionRequiredAuthErrorCodes = InteractionRequiredAuthErrorCodes;
exports.InteractionRequiredAuthErrorMessage = InteractionRequiredAuthErrorMessage;
exports.JsonWebTokenTypes = JsonWebTokenTypes;
exports.Logger = Logger;
exports.NetworkError = NetworkError;
exports.OAuthResponseType = OAuthResponseType;
exports.OIDC_DEFAULT_SCOPES = OIDC_DEFAULT_SCOPES;
exports.ONE_DAY_IN_MS = ONE_DAY_IN_MS;
exports.PasswordGrantConstants = PasswordGrantConstants;
exports.PerformanceEventAbbreviations = PerformanceEventAbbreviations;
exports.PerformanceEventStatus = PerformanceEventStatus;
exports.PerformanceEvents = PerformanceEvents;
exports.PersistentCacheKeys = PersistentCacheKeys;
exports.PlatformBrokerError = PlatformBrokerError;
exports.PopTokenGenerator = PopTokenGenerator;
exports.PromptValue = PromptValue;
exports.ProtocolMode = ProtocolMode;
exports.ProtocolUtils = ProtocolUtils;
exports.RefreshTokenClient = RefreshTokenClient;
exports.RequestParameterBuilder = RequestParameterBuilder;
exports.ResponseHandler = ResponseHandler;
exports.ResponseMode = ResponseMode;
exports.ScopeSet = ScopeSet;
exports.ServerError = ServerError;
exports.ServerResponseType = ServerResponseType;
exports.ServerTelemetryManager = ServerTelemetryManager;
exports.SilentFlowClient = SilentFlowClient;
exports.StringUtils = StringUtils;
exports.StubPerformanceClient = StubPerformanceClient;
exports.StubPerformanceMeasurement = StubPerformanceMeasurement;
exports.StubbedNetworkModule = StubbedNetworkModule;
exports.THE_FAMILY_ID = THE_FAMILY_ID;
exports.ThrottlingConstants = ThrottlingConstants;
exports.ThrottlingUtils = ThrottlingUtils;
exports.TimeUtils = TimeUtils;
exports.TokenCacheContext = TokenCacheContext;
exports.UrlString = UrlString;
exports.UrlUtils = UrlUtils;
exports.buildAccountToCache = buildAccountToCache;
exports.buildClientInfo = buildClientInfo;
exports.buildClientInfoFromHomeAccountId = buildClientInfoFromHomeAccountId;
exports.buildStaticAuthorityOptions = buildStaticAuthorityOptions;
exports.buildTenantProfile = buildTenantProfile;
exports.createAuthError = createAuthError;
exports.createCacheError = createCacheError;
exports.createClientAuthError = createClientAuthError;
exports.createClientConfigurationError = createClientConfigurationError;
exports.createInteractionRequiredAuthError = createInteractionRequiredAuthError;
exports.createNetworkError = createNetworkError;
exports.formatAuthorityUri = formatAuthorityUri;
exports.getClientAssertion = getClientAssertion;
exports.getRequestThumbprint = getRequestThumbprint;
exports.getTenantIdFromIdTokenClaims = getTenantIdFromIdTokenClaims;
exports.invoke = invoke;
exports.invokeAsync = invokeAsync;
exports.tenantIdMatchesHomeTenant = tenantIdMatchesHomeTenant;
exports.updateAccountTenantProfileData = updateAccountTenantProfileData;
exports.version = version;
//# sourceMappingURL=index-node-4Jss3kYh.js.map
