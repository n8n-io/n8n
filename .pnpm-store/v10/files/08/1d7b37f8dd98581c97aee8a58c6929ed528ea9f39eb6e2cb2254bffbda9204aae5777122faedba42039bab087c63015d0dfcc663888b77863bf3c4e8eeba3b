/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
'use strict';

/*! @azure/msal-common v15.13.3 2025-12-04 */
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
 * Allowed values for response_type
 */
const OAuthResponseType = {
    CODE: "code",
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
    QUERY: "query"};
/**
 * allowed grant_type
 */
const GrantType = {
    AUTHORIZATION_CODE_GRANT: "authorization_code",
    REFRESH_TOKEN_GRANT: "refresh_token"};
/**
 * Account types in Cache
 */
const CacheAccountType = {
    MSSTS_ACCOUNT_TYPE: "MSSTS",
    ADFS_ACCOUNT_TYPE: "ADFS",
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
 * More Cache related constants
 */
const APP_METADATA = "appmetadata";
const CLIENT_INFO = "client_info";
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
// Token renewal offset default in seconds
const DEFAULT_TOKEN_RENEWAL_OFFSET_SEC = 300;

/*! @azure/msal-common v15.13.3 2025-12-04 */
/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * AuthErrorMessage class containing string constants used by error codes and messages.
 */
const unexpectedError = "unexpected_error";
const postRequestFailed$1 = "post_request_failed";

var AuthErrorCodes = /*#__PURE__*/Object.freeze({
    __proto__: null,
    postRequestFailed: postRequestFailed$1,
    unexpectedError: unexpectedError
});

/*! @azure/msal-common v15.13.3 2025-12-04 */

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const AuthErrorMessages = {
    [unexpectedError]: "Unexpected error in authentication.",
    [postRequestFailed$1]: "Post request failed from the network, could be a 4xx/5xx or a network unavailability. Please check the exact error code for details.",
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
        code: postRequestFailed$1,
        desc: AuthErrorMessages[postRequestFailed$1],
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

/*! @azure/msal-common v15.13.3 2025-12-04 */
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
const noNetworkConnectivity$1 = "no_network_connectivity";
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
    noNetworkConnectivity: noNetworkConnectivity$1,
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

/*! @azure/msal-common v15.13.3 2025-12-04 */

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
    [noNetworkConnectivity$1]: "No network connectivity. Check your internet connection.",
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
        code: noNetworkConnectivity$1,
        desc: ClientAuthErrorMessages[noNetworkConnectivity$1],
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

/*! @azure/msal-common v15.13.3 2025-12-04 */

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

/*! @azure/msal-common v15.13.3 2025-12-04 */

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

/*! @azure/msal-common v15.13.3 2025-12-04 */
/* eslint-disable header/header */
const name$1 = "@azure/msal-common";
const version$1 = "15.13.3";

/*! @azure/msal-common v15.13.3 2025-12-04 */
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

/*! @azure/msal-common v15.13.3 2025-12-04 */
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

/*! @azure/msal-common v15.13.3 2025-12-04 */

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

/*! @azure/msal-common v15.13.3 2025-12-04 */
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

/*! @azure/msal-common v15.13.3 2025-12-04 */

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

/*! @azure/msal-common v15.13.3 2025-12-04 */

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

/*! @azure/msal-common v15.13.3 2025-12-04 */
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

/*! @azure/msal-common v15.13.3 2025-12-04 */
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

/*! @azure/msal-common v15.13.3 2025-12-04 */
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

/*! @azure/msal-common v15.13.3 2025-12-04 */
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

/*! @azure/msal-common v15.13.3 2025-12-04 */

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

/*! @azure/msal-common v15.13.3 2025-12-04 */

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

/*! @azure/msal-common v15.13.3 2025-12-04 */

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

/*! @azure/msal-common v15.13.3 2025-12-04 */

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

/*! @azure/msal-common v15.13.3 2025-12-04 */

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

/*! @azure/msal-common v15.13.3 2025-12-04 */
/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const cacheQuotaExceeded = "cache_quota_exceeded";
const cacheErrorUnknown = "cache_error_unknown";

/*! @azure/msal-common v15.13.3 2025-12-04 */

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

/*! @azure/msal-common v15.13.3 2025-12-04 */

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
        this.commonLogger = logger.clone(name$1, version$1);
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

/*! @azure/msal-common v15.13.3 2025-12-04 */
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

/*! @azure/msal-common v15.13.3 2025-12-04 */

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

/*! @azure/msal-common v15.13.3 2025-12-04 */

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
    version: version$1,
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

/*! @azure/msal-common v15.13.3 2025-12-04 */
/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const CcsCredentialType = {
    HOME_ACCOUNT_ID: "home_account_id",
    UPN: "UPN",
};

/*! @azure/msal-common v15.13.3 2025-12-04 */
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
const REFRESH_TOKEN = "refresh_token";
const STATE = "state";
const NONCE = "nonce";
const PROMPT = "prompt";
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
const CLIENT_SECRET = "client_secret";
const CLIENT_ASSERTION = "client_assertion";
const CLIENT_ASSERTION_TYPE = "client_assertion_type";
const TOKEN_TYPE = "token_type";
const REQ_CNF = "req_cnf";
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

/*! @azure/msal-common v15.13.3 2025-12-04 */

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
    const mergedClaims = addClientCapabilitiesToClaims$1(claims, clientCapabilities);
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
    parameters.set(CLIENT_INFO, "1");
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
function addClientCapabilitiesToClaims$1(claims, clientCapabilities) {
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

/*! @azure/msal-common v15.13.3 2025-12-04 */
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

/*! @azure/msal-common v15.13.3 2025-12-04 */
/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
function isCloudInstanceDiscoveryResponse(response) {
    return (response.hasOwnProperty("tenant_discovery_endpoint") &&
        response.hasOwnProperty("metadata"));
}

/*! @azure/msal-common v15.13.3 2025-12-04 */
/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
function isCloudInstanceDiscoveryErrorResponse(response) {
    return (response.hasOwnProperty("error") &&
        response.hasOwnProperty("error_description"));
}

/*! @azure/msal-common v15.13.3 2025-12-04 */
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

/*! @azure/msal-common v15.13.3 2025-12-04 */

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

/*! @azure/msal-common v15.13.3 2025-12-04 */
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

/*! @azure/msal-common v15.13.3 2025-12-04 */

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

/*! @azure/msal-common v15.13.3 2025-12-04 */

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

/*! @azure/msal-common v15.13.3 2025-12-04 */

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

/*! @azure/msal-common v15.13.3 2025-12-04 */

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

/*! @azure/msal-common v15.13.3 2025-12-04 */
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

/*! @azure/msal-common v15.13.3 2025-12-04 */

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

/*! @azure/msal-common v15.13.3 2025-12-04 */

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

/*! @azure/msal-common v15.13.3 2025-12-04 */

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
        this.logger = new Logger(this.config.loggerOptions, name$1, version$1);
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

/*! @azure/msal-common v15.13.3 2025-12-04 */
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

/*! @azure/msal-common v15.13.3 2025-12-04 */

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

/*! @azure/msal-common v15.13.3 2025-12-04 */

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

/*! @azure/msal-common v15.13.3 2025-12-04 */

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

/*! @azure/msal-common v15.13.3 2025-12-04 */
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

/*! @azure/msal-common v15.13.3 2025-12-04 */

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

/*! @azure/msal-common v15.13.3 2025-12-04 */
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

/*! @azure/msal-common v15.13.3 2025-12-04 */

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

/*! @azure/msal-common v15.13.3 2025-12-04 */

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

/*! @azure/msal-common v15.13.3 2025-12-04 */

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

/*! @azure/msal-common v15.13.3 2025-12-04 */

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

/*! @azure/msal-common v15.13.3 2025-12-04 */

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

/*! @azure/msal-common v15.13.3 2025-12-04 */

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

/*! @azure/msal-common v15.13.3 2025-12-04 */

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

/*! @azure/msal-common v15.13.3 2025-12-04 */
/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const missingKidError = "missing_kid_error";
const missingAlgError = "missing_alg_error";

/*! @azure/msal-common v15.13.3 2025-12-04 */

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const JoseHeaderErrorMessages = {
    [missingKidError]: "The JOSE Header for the requested JWT, JWS or JWK object requires a keyId to be configured as the 'kid' header claim. No 'kid' value was provided.",
    [missingAlgError]: "The JOSE Header for the requested JWT, JWS or JWK object requires an algorithm to be specified as the 'alg' header claim. No 'alg' value was provided.",
};
/**
 * Error thrown when there is an error in the client code running on the browser.
 */
class JoseHeaderError extends AuthError {
    constructor(errorCode, errorMessage) {
        super(errorCode, errorMessage);
        this.name = "JoseHeaderError";
        Object.setPrototypeOf(this, JoseHeaderError.prototype);
    }
}
/** Returns JoseHeaderError object */
function createJoseHeaderError(code) {
    return new JoseHeaderError(code, JoseHeaderErrorMessages[code]);
}

/*! @azure/msal-common v15.13.3 2025-12-04 */

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/** @internal */
class JoseHeader {
    constructor(options) {
        this.typ = options.typ;
        this.alg = options.alg;
        this.kid = options.kid;
    }
    /**
     * Builds SignedHttpRequest formatted JOSE Header from the
     * JOSE Header options provided or previously set on the object and returns
     * the stringified header object.
     * Throws if keyId or algorithm aren't provided since they are required for Access Token Binding.
     * @param shrHeaderOptions
     * @returns
     */
    static getShrHeaderString(shrHeaderOptions) {
        // KeyID is required on the SHR header
        if (!shrHeaderOptions.kid) {
            throw createJoseHeaderError(missingKidError);
        }
        // Alg is required on the SHR header
        if (!shrHeaderOptions.alg) {
            throw createJoseHeaderError(missingAlgError);
        }
        const shrHeader = new JoseHeader({
            // Access Token PoP headers must have type pop, but the type header can be overriden for special cases
            typ: shrHeaderOptions.typ || JsonWebTokenTypes.Pop,
            kid: shrHeaderOptions.kid,
            alg: shrHeaderOptions.alg,
        });
        return JSON.stringify(shrHeader);
    }
}

/*! @azure/msal-common v15.13.3 2025-12-04 */

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Starts context by adding payload to the stack
 * @param event {PerformanceEvent}
 * @param abbreviations {Map<string, string>} event name abbreviations
 * @param stack {?PerformanceEventStackedContext[]} stack
 */
function startContext(event, abbreviations, stack) {
    if (!stack) {
        return;
    }
    stack.push({
        name: abbreviations.get(event.name) || event.name,
    });
}
/**
 * Ends context by removing payload from the stack and returning parent or self, if stack is empty, payload
 *
 * @param event {PerformanceEvent}
 * @param abbreviations {Map<string, string>} event name abbreviations
 * @param stack {?PerformanceEventStackedContext[]} stack
 * @param error {?unknown} error
 */
function endContext(event, abbreviations, stack, error) {
    if (!stack?.length) {
        return;
    }
    const peek = (stack) => {
        return stack.length ? stack[stack.length - 1] : undefined;
    };
    const abbrEventName = abbreviations.get(event.name) || event.name;
    const top = peek(stack);
    if (top?.name !== abbrEventName) {
        return;
    }
    const current = stack?.pop();
    if (!current) {
        return;
    }
    const errorCode = error instanceof AuthError
        ? error.errorCode
        : error instanceof Error
            ? error.name
            : undefined;
    const subErr = error instanceof AuthError ? error.subError : undefined;
    if (errorCode && current.childErr !== errorCode) {
        current.err = errorCode;
        if (subErr) {
            current.subErr = subErr;
        }
    }
    delete current.name;
    delete current.childErr;
    const context = {
        ...current,
        dur: event.durationMs,
    };
    if (!event.success) {
        context.fail = 1;
    }
    const parent = peek(stack);
    if (!parent) {
        return { [abbrEventName]: context };
    }
    if (errorCode) {
        parent.childErr = errorCode;
    }
    let childName;
    if (!parent[abbrEventName]) {
        childName = abbrEventName;
    }
    else {
        const siblings = Object.keys(parent).filter((key) => key.startsWith(abbrEventName)).length;
        childName = `${abbrEventName}_${siblings + 1}`;
    }
    parent[childName] = context;
    return parent;
}
/**
 * Adds error name and stack trace to the telemetry event
 * @param error {Error}
 * @param logger {Logger}
 * @param event {PerformanceEvent}
 * @param stackMaxSize {number} max error stack size to capture
 */
function addError(error, logger, event, stackMaxSize = 5) {
    if (!(error instanceof Error)) {
        logger.trace("PerformanceClient.addErrorStack: Input error is not instance of Error", event.correlationId);
        return;
    }
    else if (error instanceof AuthError) {
        event.errorCode = error.errorCode;
        event.subErrorCode = error.subError;
        if (error instanceof ServerError ||
            error instanceof InteractionRequiredAuthError) {
            event.serverErrorNo = error.errorNo;
        }
        return;
    }
    else if (error instanceof CacheError) {
        event.errorCode = error.errorCode;
        return;
    }
    else if (event.errorStack?.length) {
        logger.trace("PerformanceClient.addErrorStack: Stack already exist", event.correlationId);
        return;
    }
    else if (!error.stack?.length) {
        logger.trace("PerformanceClient.addErrorStack: Input stack is empty", event.correlationId);
        return;
    }
    if (error.stack) {
        event.errorStack = compactStack(error.stack, stackMaxSize);
    }
    event.errorName = error.name;
}
/**
 * Compacts error stack into array by fetching N first entries
 * @param stack {string} error stack
 * @param stackMaxSize {number} max error stack size to capture
 * @returns {string[]}
 */
function compactStack(stack, stackMaxSize) {
    if (stackMaxSize < 0) {
        return [];
    }
    const stackArr = stack.split("\n") || [];
    const res = [];
    // Check for a handful of known, common runtime errors and log them (with redaction where applicable).
    const firstLine = stackArr[0];
    if (firstLine.startsWith("TypeError: Cannot read property") ||
        firstLine.startsWith("TypeError: Cannot read properties of") ||
        firstLine.startsWith("TypeError: Cannot set property") ||
        firstLine.startsWith("TypeError: Cannot set properties of") ||
        firstLine.endsWith("is not a function")) {
        // These types of errors are not at risk of leaking PII. They will indicate unavailable APIs
        res.push(compactStackLine(firstLine));
    }
    else if (firstLine.startsWith("SyntaxError") ||
        firstLine.startsWith("TypeError")) {
        // Prevent unintentional leaking of arbitrary info by redacting contents between both single and double quotes
        res.push(compactStackLine(
        // Example: SyntaxError: Unexpected token 'e', "test" is not valid JSON -> SyntaxError: Unexpected token <redacted>, <redacted> is not valid JSON
        firstLine.replace(/['].*[']|["].*["]/g, "<redacted>")));
    }
    // Get top N stack lines
    for (let ix = 1; ix < stackArr.length; ix++) {
        if (res.length >= stackMaxSize) {
            break;
        }
        const line = stackArr[ix];
        res.push(compactStackLine(line));
    }
    return res;
}
/**
 * Compacts error stack line by shortening file path
 * Example: https://localhost/msal-common/src/authority/Authority.js:100:1 -> Authority.js:100:1
 * @param line {string} stack line
 * @returns {string}
 */
function compactStackLine(line) {
    const filePathIx = line.lastIndexOf(" ") + 1;
    if (filePathIx < 1) {
        return line;
    }
    const filePath = line.substring(filePathIx);
    let fileNameIx = filePath.lastIndexOf("/");
    fileNameIx = fileNameIx < 0 ? filePath.lastIndexOf("\\") : fileNameIx;
    if (fileNameIx >= 0) {
        return (line.substring(0, filePathIx) +
            "(" +
            filePath.substring(fileNameIx + 1) +
            (filePath.charAt(filePath.length - 1) === ")" ? "" : ")")).trimStart();
    }
    return line.trimStart();
}
function getAccountType(account) {
    const idTokenClaims = account?.idTokenClaims;
    if (idTokenClaims?.tfp || idTokenClaims?.acr) {
        return "B2C";
    }
    if (!idTokenClaims?.tid) {
        return undefined;
    }
    else if (idTokenClaims?.tid === "9188040d-6c67-4c5b-b112-36a304b66dad") {
        return "MSA";
    }
    return "AAD";
}
class PerformanceClient {
    /**
     * Creates an instance of PerformanceClient,
     * an abstract class containing core performance telemetry logic.
     *
     * @constructor
     * @param {string} clientId Client ID of the application
     * @param {string} authority Authority used by the application
     * @param {Logger} logger Logger used by the application
     * @param {string} libraryName Name of the library
     * @param {string} libraryVersion Version of the library
     * @param {ApplicationTelemetry} applicationTelemetry application name and version
     * @param {Set<String>} intFields integer fields to be truncated
     * @param {Map<string, string>} abbreviations event name abbreviations
     */
    constructor(clientId, authority, logger, libraryName, libraryVersion, applicationTelemetry, intFields, abbreviations) {
        this.authority = authority;
        this.libraryName = libraryName;
        this.libraryVersion = libraryVersion;
        this.applicationTelemetry = applicationTelemetry;
        this.clientId = clientId;
        this.logger = logger;
        this.callbacks = new Map();
        this.eventsByCorrelationId = new Map();
        this.eventStack = new Map();
        this.queueMeasurements = new Map();
        this.preQueueTimeByCorrelationId = new Map();
        this.intFields = intFields || new Set();
        for (const item of IntFields) {
            this.intFields.add(item);
        }
        this.abbreviations = abbreviations || new Map();
        for (const [key, value] of PerformanceEventAbbreviations) {
            this.abbreviations.set(key, value);
        }
    }
    /**
     * Starts and returns an platform-specific implementation of IPerformanceMeasurement.
     * Note: this function can be changed to abstract at the next major version bump.
     *
     * @param {string} measureName
     * @param {string} correlationId
     * @returns {IPerformanceMeasurement}
     * @deprecated This method will be removed in the next major version
     */
    startPerformanceMeasurement(measureName, // eslint-disable-line @typescript-eslint/no-unused-vars
    correlationId // eslint-disable-line @typescript-eslint/no-unused-vars
    ) {
        return {};
    }
    /**
     * Gets map of pre-queue times by correlation Id
     *
     * @param {PerformanceEvents} eventName
     * @param {string} correlationId
     * @returns {number}
     */
    getPreQueueTime(eventName, correlationId) {
        const preQueueEvent = this.preQueueTimeByCorrelationId.get(correlationId);
        if (!preQueueEvent) {
            this.logger.trace(`PerformanceClient.getPreQueueTime: no pre-queue times found for correlationId: ${correlationId}, unable to add queue measurement`);
            return;
        }
        else if (preQueueEvent.name !== eventName) {
            this.logger.trace(`PerformanceClient.getPreQueueTime: no pre-queue time found for ${eventName}, unable to add queue measurement`);
            return;
        }
        return preQueueEvent.time;
    }
    /**
     * Calculates the difference between current time and time when function was queued.
     * Note: It is possible to have 0 as the queue time if the current time and the queued time was the same.
     *
     * @param {number} preQueueTime
     * @param {number} currentTime
     * @returns {number}
     */
    calculateQueuedTime(preQueueTime, currentTime) {
        if (preQueueTime < 1) {
            this.logger.trace(`PerformanceClient: preQueueTime should be a positive integer and not ${preQueueTime}`);
            return 0;
        }
        if (currentTime < 1) {
            this.logger.trace(`PerformanceClient: currentTime should be a positive integer and not ${currentTime}`);
            return 0;
        }
        if (currentTime < preQueueTime) {
            this.logger.trace("PerformanceClient: currentTime is less than preQueueTime, check how time is being retrieved");
            return 0;
        }
        return currentTime - preQueueTime;
    }
    /**
     * Adds queue measurement time to QueueMeasurements array for given correlation ID.
     *
     * @param {PerformanceEvents} eventName
     * @param {?string} correlationId
     * @param {?number} queueTime
     * @param {?boolean} manuallyCompleted - indicator for manually completed queue measurements
     * @returns
     */
    addQueueMeasurement(eventName, correlationId, queueTime, manuallyCompleted) {
        if (!correlationId) {
            this.logger.trace(`PerformanceClient.addQueueMeasurement: correlationId not provided for ${eventName}, cannot add queue measurement`);
            return;
        }
        if (queueTime === 0) {
            // Possible for there to be no queue time after calculation
            this.logger.trace(`PerformanceClient.addQueueMeasurement: queue time provided for ${eventName} is ${queueTime}`);
        }
        else if (!queueTime) {
            this.logger.trace(`PerformanceClient.addQueueMeasurement: no queue time provided for ${eventName}`);
            return;
        }
        const queueMeasurement = {
            eventName,
            // Always default queue time to 0 for manually completed (improperly instrumented)
            queueTime: manuallyCompleted ? 0 : queueTime,
            manuallyCompleted,
        };
        // Adds to existing correlation Id if present in queueMeasurements
        const existingMeasurements = this.queueMeasurements.get(correlationId);
        if (existingMeasurements) {
            existingMeasurements.push(queueMeasurement);
            this.queueMeasurements.set(correlationId, existingMeasurements);
        }
        else {
            // Sets new correlation Id if not present in queueMeasurements
            this.logger.trace(`PerformanceClient.addQueueMeasurement: adding correlationId ${correlationId} to queue measurements`);
            const measurementArray = [queueMeasurement];
            this.queueMeasurements.set(correlationId, measurementArray);
        }
        // Delete processed pre-queue event.
        this.preQueueTimeByCorrelationId.delete(correlationId);
    }
    /**
     * Starts measuring performance for a given operation. Returns a function that should be used to end the measurement.
     *
     * @param {PerformanceEvents} measureName
     * @param {?string} [correlationId]
     * @returns {InProgressPerformanceEvent}
     */
    startMeasurement(measureName, correlationId) {
        // Generate a placeholder correlation if the request does not provide one
        const eventCorrelationId = correlationId || this.generateId();
        if (!correlationId) {
            this.logger.info(`PerformanceClient: No correlation id provided for ${measureName}, generating`, eventCorrelationId);
        }
        this.logger.trace(`PerformanceClient: Performance measurement started for ${measureName}`, eventCorrelationId);
        const inProgressEvent = {
            eventId: this.generateId(),
            status: PerformanceEventStatus.InProgress,
            authority: this.authority,
            libraryName: this.libraryName,
            libraryVersion: this.libraryVersion,
            clientId: this.clientId,
            name: measureName,
            startTimeMs: Date.now(),
            correlationId: eventCorrelationId,
            appName: this.applicationTelemetry?.appName,
            appVersion: this.applicationTelemetry?.appVersion,
        };
        // Store in progress events so they can be discarded if not ended properly
        this.cacheEventByCorrelationId(inProgressEvent);
        startContext(inProgressEvent, this.abbreviations, this.eventStack.get(eventCorrelationId));
        // Return the event and functions the caller can use to properly end/flush the measurement
        return {
            end: (event, error, account) => {
                return this.endMeasurement({
                    // Initial set of event properties
                    ...inProgressEvent,
                    // Properties set when event ends
                    ...event,
                }, error, account);
            },
            discard: () => {
                return this.discardMeasurements(inProgressEvent.correlationId);
            },
            add: (fields) => {
                return this.addFields(fields, inProgressEvent.correlationId);
            },
            increment: (fields) => {
                return this.incrementFields(fields, inProgressEvent.correlationId);
            },
            event: inProgressEvent,
            measurement: new StubPerformanceMeasurement(),
        };
    }
    /**
     * Stops measuring the performance for an operation. Should only be called directly by PerformanceClient classes,
     * as consumers should instead use the function returned by startMeasurement.
     * Adds a new field named as "[event name]DurationMs" for sub-measurements, completes and emits an event
     * otherwise.
     *
     * @param {PerformanceEvent} event
     * @param {unknown} error
     * @param {AccountInfo?} account
     * @returns {(PerformanceEvent | null)}
     */
    endMeasurement(event, error, account) {
        const rootEvent = this.eventsByCorrelationId.get(event.correlationId);
        if (!rootEvent) {
            this.logger.trace(`PerformanceClient: Measurement not found for ${event.eventId}`, event.correlationId);
            return null;
        }
        const isRoot = event.eventId === rootEvent.eventId;
        let queueInfo = {
            totalQueueTime: 0,
            totalQueueCount: 0,
            manuallyCompletedCount: 0,
        };
        event.durationMs = Math.round(event.durationMs || this.getDurationMs(event.startTimeMs));
        const context = JSON.stringify(endContext(event, this.abbreviations, this.eventStack.get(rootEvent.correlationId), error));
        if (isRoot) {
            queueInfo = this.getQueueInfo(event.correlationId);
            this.discardMeasurements(rootEvent.correlationId);
        }
        else {
            rootEvent.incompleteSubMeasurements?.delete(event.eventId);
        }
        this.logger.trace(`PerformanceClient: Performance measurement ended for ${event.name}: ${event.durationMs} ms`, event.correlationId);
        if (error) {
            addError(error, this.logger, rootEvent);
        }
        // Add sub-measurement attribute to root event.
        if (!isRoot) {
            rootEvent[event.name + "DurationMs"] = Math.floor(event.durationMs);
            return { ...rootEvent };
        }
        if (isRoot &&
            !error &&
            (rootEvent.errorCode || rootEvent.subErrorCode)) {
            this.logger.trace(`PerformanceClient: Remove error and sub-error codes for root event ${event.name} as intermediate error was successfully handled`, event.correlationId);
            rootEvent.errorCode = undefined;
            rootEvent.subErrorCode = undefined;
        }
        let finalEvent = { ...rootEvent, ...event };
        let incompleteSubsCount = 0;
        // Incomplete sub-measurements are discarded. They are likely an instrumentation bug that should be fixed.
        finalEvent.incompleteSubMeasurements?.forEach((subMeasurement) => {
            this.logger.trace(`PerformanceClient: Incomplete submeasurement ${subMeasurement.name} found for ${event.name}`, finalEvent.correlationId);
            incompleteSubsCount++;
        });
        finalEvent.incompleteSubMeasurements = undefined;
        finalEvent = {
            ...finalEvent,
            queuedTimeMs: queueInfo.totalQueueTime,
            queuedCount: queueInfo.totalQueueCount,
            queuedManuallyCompletedCount: queueInfo.manuallyCompletedCount,
            status: PerformanceEventStatus.Completed,
            incompleteSubsCount,
            context,
        };
        if (account) {
            finalEvent.accountType = getAccountType(account);
            finalEvent.dataBoundary = account.dataBoundary;
        }
        this.truncateIntegralFields(finalEvent);
        this.emitEvents([finalEvent], event.correlationId);
        return finalEvent;
    }
    /**
     * Saves extra information to be emitted when the measurements are flushed
     * @param fields
     * @param correlationId
     */
    addFields(fields, correlationId) {
        this.logger.trace("PerformanceClient: Updating static fields");
        const event = this.eventsByCorrelationId.get(correlationId);
        if (event) {
            this.eventsByCorrelationId.set(correlationId, {
                ...event,
                ...fields,
            });
        }
        else {
            this.logger.trace("PerformanceClient: Event not found for", correlationId);
        }
    }
    /**
     * Increment counters to be emitted when the measurements are flushed
     * @param fields {string[]}
     * @param correlationId {string} correlation identifier
     */
    incrementFields(fields, correlationId) {
        this.logger.trace("PerformanceClient: Updating counters");
        const event = this.eventsByCorrelationId.get(correlationId);
        if (event) {
            for (const counter in fields) {
                if (!event.hasOwnProperty(counter)) {
                    event[counter] = 0;
                }
                else if (isNaN(Number(event[counter]))) {
                    return;
                }
                event[counter] += fields[counter];
            }
        }
        else {
            this.logger.trace("PerformanceClient: Event not found for", correlationId);
        }
    }
    /**
     * Upserts event into event cache.
     * First key is the correlation id, second key is the event id.
     * Allows for events to be grouped by correlation id,
     * and to easily allow for properties on them to be updated.
     *
     * @private
     * @param {PerformanceEvent} event
     */
    cacheEventByCorrelationId(event) {
        const rootEvent = this.eventsByCorrelationId.get(event.correlationId);
        if (rootEvent) {
            this.logger.trace(`PerformanceClient: Performance measurement for ${event.name} added/updated`, event.correlationId);
            rootEvent.incompleteSubMeasurements =
                rootEvent.incompleteSubMeasurements || new Map();
            rootEvent.incompleteSubMeasurements.set(event.eventId, {
                name: event.name,
                startTimeMs: event.startTimeMs,
            });
        }
        else {
            this.logger.trace(`PerformanceClient: Performance measurement for ${event.name} started`, event.correlationId);
            this.eventsByCorrelationId.set(event.correlationId, { ...event });
            this.eventStack.set(event.correlationId, []);
        }
    }
    getQueueInfo(correlationId) {
        const queueMeasurementForCorrelationId = this.queueMeasurements.get(correlationId);
        if (!queueMeasurementForCorrelationId) {
            this.logger.trace(`PerformanceClient: no queue measurements found for for correlationId: ${correlationId}`);
        }
        let totalQueueTime = 0;
        let totalQueueCount = 0;
        let manuallyCompletedCount = 0;
        queueMeasurementForCorrelationId?.forEach((measurement) => {
            totalQueueTime += measurement.queueTime;
            totalQueueCount++;
            manuallyCompletedCount += measurement.manuallyCompleted ? 1 : 0;
        });
        return {
            totalQueueTime,
            totalQueueCount,
            manuallyCompletedCount,
        };
    }
    /**
     * Removes measurements and aux data for a given correlation id.
     *
     * @param {string} correlationId
     */
    discardMeasurements(correlationId) {
        this.logger.trace("PerformanceClient: Performance measurements discarded", correlationId);
        this.eventsByCorrelationId.delete(correlationId);
        this.logger.trace("PerformanceClient: QueueMeasurements discarded", correlationId);
        this.queueMeasurements.delete(correlationId);
        this.logger.trace("PerformanceClient: Pre-queue times discarded", correlationId);
        this.preQueueTimeByCorrelationId.delete(correlationId);
        this.logger.trace("PerformanceClient: Event stack discarded", correlationId);
        this.eventStack.delete(correlationId);
    }
    /**
     * Registers a callback function to receive performance events.
     *
     * @param {PerformanceCallbackFunction} callback
     * @returns {string}
     */
    addPerformanceCallback(callback) {
        for (const [id, cb] of this.callbacks) {
            if (cb.toString() === callback.toString()) {
                this.logger.warning(`PerformanceClient: Performance callback is already registered with id: ${id}`);
                return id;
            }
        }
        const callbackId = this.generateId();
        this.callbacks.set(callbackId, callback);
        this.logger.verbose(`PerformanceClient: Performance callback registered with id: ${callbackId}`);
        return callbackId;
    }
    /**
     * Removes a callback registered with addPerformanceCallback.
     *
     * @param {string} callbackId
     * @returns {boolean}
     */
    removePerformanceCallback(callbackId) {
        const result = this.callbacks.delete(callbackId);
        if (result) {
            this.logger.verbose(`PerformanceClient: Performance callback ${callbackId} removed.`);
        }
        else {
            this.logger.verbose(`PerformanceClient: Performance callback ${callbackId} not removed.`);
        }
        return result;
    }
    /**
     * Emits events to all registered callbacks.
     *
     * @param {PerformanceEvent[]} events
     * @param {?string} [correlationId]
     */
    emitEvents(events, correlationId) {
        this.logger.verbose("PerformanceClient: Emitting performance events", correlationId);
        this.callbacks.forEach((callback, callbackId) => {
            this.logger.trace(`PerformanceClient: Emitting event to callback ${callbackId}`, correlationId);
            callback.apply(null, [events]);
        });
    }
    /**
     * Enforce truncation of integral fields in performance event.
     * @param {PerformanceEvent} event performance event to update.
     */
    truncateIntegralFields(event) {
        this.intFields.forEach((key) => {
            if (key in event && typeof event[key] === "number") {
                event[key] = Math.floor(event[key]);
            }
        });
    }
    /**
     * Returns event duration in milliseconds
     * @param startTimeMs {number}
     * @returns {number}
     */
    getDurationMs(startTimeMs) {
        const durationMs = Date.now() - startTimeMs;
        // Handle clock skew
        return durationMs < 0 ? durationMs : 0;
    }
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const pkceNotCreated = "pkce_not_created";
const earJwkEmpty = "ear_jwk_empty";
const earJweEmpty = "ear_jwe_empty";
const cryptoNonExistent = "crypto_nonexistent";
const emptyNavigateUri = "empty_navigate_uri";
const hashEmptyError = "hash_empty_error";
const noStateInHash = "no_state_in_hash";
const hashDoesNotContainKnownProperties = "hash_does_not_contain_known_properties";
const unableToParseState = "unable_to_parse_state";
const stateInteractionTypeMismatch = "state_interaction_type_mismatch";
const interactionInProgress = "interaction_in_progress";
const popupWindowError = "popup_window_error";
const emptyWindowError = "empty_window_error";
const userCancelled = "user_cancelled";
const monitorPopupTimeout = "monitor_popup_timeout";
const monitorWindowTimeout = "monitor_window_timeout";
const redirectInIframe = "redirect_in_iframe";
const blockIframeReload = "block_iframe_reload";
const blockNestedPopups = "block_nested_popups";
const iframeClosedPrematurely = "iframe_closed_prematurely";
const silentLogoutUnsupported = "silent_logout_unsupported";
const noAccountError = "no_account_error";
const silentPromptValueError = "silent_prompt_value_error";
const noTokenRequestCacheError = "no_token_request_cache_error";
const unableToParseTokenRequestCacheError = "unable_to_parse_token_request_cache_error";
const authRequestNotSetError = "auth_request_not_set_error";
const invalidCacheType = "invalid_cache_type";
const nonBrowserEnvironment = "non_browser_environment";
const databaseNotOpen = "database_not_open";
const noNetworkConnectivity = "no_network_connectivity";
const postRequestFailed = "post_request_failed";
const getRequestFailed = "get_request_failed";
const failedToParseResponse = "failed_to_parse_response";
const unableToLoadToken = "unable_to_load_token";
const cryptoKeyNotFound = "crypto_key_not_found";
const authCodeRequired = "auth_code_required";
const authCodeOrNativeAccountIdRequired = "auth_code_or_nativeAccountId_required";
const spaCodeAndNativeAccountIdPresent = "spa_code_and_nativeAccountId_present";
const databaseUnavailable = "database_unavailable";
const unableToAcquireTokenFromNativePlatform = "unable_to_acquire_token_from_native_platform";
const nativeHandshakeTimeout = "native_handshake_timeout";
const nativeExtensionNotInstalled = "native_extension_not_installed";
const nativeConnectionNotEstablished = "native_connection_not_established";
const uninitializedPublicClientApplication = "uninitialized_public_client_application";
const nativePromptNotSupported = "native_prompt_not_supported";
const invalidBase64String = "invalid_base64_string";
const invalidPopTokenRequest = "invalid_pop_token_request";
const failedToBuildHeaders = "failed_to_build_headers";
const failedToParseHeaders = "failed_to_parse_headers";
const failedToDecryptEarResponse = "failed_to_decrypt_ear_response";
const timedOut = "timed_out";

var BrowserAuthErrorCodes = /*#__PURE__*/Object.freeze({
    __proto__: null,
    authCodeOrNativeAccountIdRequired: authCodeOrNativeAccountIdRequired,
    authCodeRequired: authCodeRequired,
    authRequestNotSetError: authRequestNotSetError,
    blockIframeReload: blockIframeReload,
    blockNestedPopups: blockNestedPopups,
    cryptoKeyNotFound: cryptoKeyNotFound,
    cryptoNonExistent: cryptoNonExistent,
    databaseNotOpen: databaseNotOpen,
    databaseUnavailable: databaseUnavailable,
    earJweEmpty: earJweEmpty,
    earJwkEmpty: earJwkEmpty,
    emptyNavigateUri: emptyNavigateUri,
    emptyWindowError: emptyWindowError,
    failedToBuildHeaders: failedToBuildHeaders,
    failedToDecryptEarResponse: failedToDecryptEarResponse,
    failedToParseHeaders: failedToParseHeaders,
    failedToParseResponse: failedToParseResponse,
    getRequestFailed: getRequestFailed,
    hashDoesNotContainKnownProperties: hashDoesNotContainKnownProperties,
    hashEmptyError: hashEmptyError,
    iframeClosedPrematurely: iframeClosedPrematurely,
    interactionInProgress: interactionInProgress,
    invalidBase64String: invalidBase64String,
    invalidCacheType: invalidCacheType,
    invalidPopTokenRequest: invalidPopTokenRequest,
    monitorPopupTimeout: monitorPopupTimeout,
    monitorWindowTimeout: monitorWindowTimeout,
    nativeConnectionNotEstablished: nativeConnectionNotEstablished,
    nativeExtensionNotInstalled: nativeExtensionNotInstalled,
    nativeHandshakeTimeout: nativeHandshakeTimeout,
    nativePromptNotSupported: nativePromptNotSupported,
    noAccountError: noAccountError,
    noNetworkConnectivity: noNetworkConnectivity,
    noStateInHash: noStateInHash,
    noTokenRequestCacheError: noTokenRequestCacheError,
    nonBrowserEnvironment: nonBrowserEnvironment,
    pkceNotCreated: pkceNotCreated,
    popupWindowError: popupWindowError,
    postRequestFailed: postRequestFailed,
    redirectInIframe: redirectInIframe,
    silentLogoutUnsupported: silentLogoutUnsupported,
    silentPromptValueError: silentPromptValueError,
    spaCodeAndNativeAccountIdPresent: spaCodeAndNativeAccountIdPresent,
    stateInteractionTypeMismatch: stateInteractionTypeMismatch,
    timedOut: timedOut,
    unableToAcquireTokenFromNativePlatform: unableToAcquireTokenFromNativePlatform,
    unableToLoadToken: unableToLoadToken,
    unableToParseState: unableToParseState,
    unableToParseTokenRequestCacheError: unableToParseTokenRequestCacheError,
    uninitializedPublicClientApplication: uninitializedPublicClientApplication,
    userCancelled: userCancelled
});

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const ErrorLink = "For more visit: aka.ms/msaljs/browser-errors";
/**
 * BrowserAuthErrorMessage class containing string constants used by error codes and messages.
 */
const BrowserAuthErrorMessages = {
    [pkceNotCreated]: "The PKCE code challenge and verifier could not be generated.",
    [earJwkEmpty]: "No EAR encryption key provided. This is unexpected.",
    [earJweEmpty]: "Server response does not contain ear_jwe property. This is unexpected.",
    [cryptoNonExistent]: "The crypto object or function is not available.",
    [emptyNavigateUri]: "Navigation URI is empty. Please check stack trace for more info.",
    [hashEmptyError]: `Hash value cannot be processed because it is empty. Please verify that your redirectUri is not clearing the hash. ${ErrorLink}`,
    [noStateInHash]: "Hash does not contain state. Please verify that the request originated from msal.",
    [hashDoesNotContainKnownProperties]: `Hash does not contain known properites. Please verify that your redirectUri is not changing the hash.  ${ErrorLink}`,
    [unableToParseState]: "Unable to parse state. Please verify that the request originated from msal.",
    [stateInteractionTypeMismatch]: "Hash contains state but the interaction type does not match the caller.",
    [interactionInProgress]: `Interaction is currently in progress. Please ensure that this interaction has been completed before calling an interactive API.   ${ErrorLink}`,
    [popupWindowError]: "Error opening popup window. This can happen if you are using IE or if popups are blocked in the browser.",
    [emptyWindowError]: "window.open returned null or undefined window object.",
    [userCancelled]: "User cancelled the flow.",
    [monitorPopupTimeout]: `Token acquisition in popup failed due to timeout.  ${ErrorLink}`,
    [monitorWindowTimeout]: `Token acquisition in iframe failed due to timeout.  ${ErrorLink}`,
    [redirectInIframe]: "Redirects are not supported for iframed or brokered applications. Please ensure you are using MSAL.js in a top frame of the window if using the redirect APIs, or use the popup APIs.",
    [blockIframeReload]: `Request was blocked inside an iframe because MSAL detected an authentication response.  ${ErrorLink}`,
    [blockNestedPopups]: "Request was blocked inside a popup because MSAL detected it was running in a popup.",
    [iframeClosedPrematurely]: "The iframe being monitored was closed prematurely.",
    [silentLogoutUnsupported]: "Silent logout not supported. Please call logoutRedirect or logoutPopup instead.",
    [noAccountError]: "No account object provided to acquireTokenSilent and no active account has been set. Please call setActiveAccount or provide an account on the request.",
    [silentPromptValueError]: "The value given for the prompt value is not valid for silent requests - must be set to 'none' or 'no_session'.",
    [noTokenRequestCacheError]: "No token request found in cache.",
    [unableToParseTokenRequestCacheError]: "The cached token request could not be parsed.",
    [authRequestNotSetError]: "Auth Request not set. Please ensure initiateAuthRequest was called from the InteractionHandler",
    [invalidCacheType]: "Invalid cache type",
    [nonBrowserEnvironment]: "Login and token requests are not supported in non-browser environments.",
    [databaseNotOpen]: "Database is not open!",
    [noNetworkConnectivity]: "No network connectivity. Check your internet connection.",
    [postRequestFailed]: "Network request failed: If the browser threw a CORS error, check that the redirectUri is registered in the Azure App Portal as type 'SPA'",
    [getRequestFailed]: "Network request failed. Please check the network trace to determine root cause.",
    [failedToParseResponse]: "Failed to parse network response. Check network trace.",
    [unableToLoadToken]: "Error loading token to cache.",
    [cryptoKeyNotFound]: "Cryptographic Key or Keypair not found in browser storage.",
    [authCodeRequired]: "An authorization code must be provided (as the `code` property on the request) to this flow.",
    [authCodeOrNativeAccountIdRequired]: "An authorization code or nativeAccountId must be provided to this flow.",
    [spaCodeAndNativeAccountIdPresent]: "Request cannot contain both spa code and native account id.",
    [databaseUnavailable]: "IndexedDB, which is required for persistent cryptographic key storage, is unavailable. This may be caused by browser privacy features which block persistent storage in third-party contexts.",
    [unableToAcquireTokenFromNativePlatform]: `Unable to acquire token from native platform.  ${ErrorLink}`,
    [nativeHandshakeTimeout]: "Timed out while attempting to establish connection to browser extension",
    [nativeExtensionNotInstalled]: "Native extension is not installed. If you think this is a mistake call the initialize function.",
    [nativeConnectionNotEstablished]: `Connection to native platform has not been established. Please install a compatible browser extension and run initialize().  ${ErrorLink}`,
    [uninitializedPublicClientApplication]: `You must call and await the initialize function before attempting to call any other MSAL API.  ${ErrorLink}`,
    [nativePromptNotSupported]: "The provided prompt is not supported by the native platform. This request should be routed to the web based flow.",
    [invalidBase64String]: "Invalid base64 encoded string.",
    [invalidPopTokenRequest]: "Invalid PoP token request. The request should not have both a popKid value and signPopToken set to true.",
    [failedToBuildHeaders]: "Failed to build request headers object.",
    [failedToParseHeaders]: "Failed to parse response headers",
    [failedToDecryptEarResponse]: "Failed to decrypt ear response",
    [timedOut]: "The request timed out.",
};
/**
 * BrowserAuthErrorMessage class containing string constants used by error codes and messages.
 * @deprecated Use exported BrowserAuthErrorCodes instead.
 * In your app you can do :
 * ```
 * import { BrowserAuthErrorCodes } from "@azure/msal-browser";
 * ```
 */
const BrowserAuthErrorMessage = {
    pkceNotGenerated: {
        code: pkceNotCreated,
        desc: BrowserAuthErrorMessages[pkceNotCreated],
    },
    cryptoDoesNotExist: {
        code: cryptoNonExistent,
        desc: BrowserAuthErrorMessages[cryptoNonExistent],
    },
    emptyNavigateUriError: {
        code: emptyNavigateUri,
        desc: BrowserAuthErrorMessages[emptyNavigateUri],
    },
    hashEmptyError: {
        code: hashEmptyError,
        desc: BrowserAuthErrorMessages[hashEmptyError],
    },
    hashDoesNotContainStateError: {
        code: noStateInHash,
        desc: BrowserAuthErrorMessages[noStateInHash],
    },
    hashDoesNotContainKnownPropertiesError: {
        code: hashDoesNotContainKnownProperties,
        desc: BrowserAuthErrorMessages[hashDoesNotContainKnownProperties],
    },
    unableToParseStateError: {
        code: unableToParseState,
        desc: BrowserAuthErrorMessages[unableToParseState],
    },
    stateInteractionTypeMismatchError: {
        code: stateInteractionTypeMismatch,
        desc: BrowserAuthErrorMessages[stateInteractionTypeMismatch],
    },
    interactionInProgress: {
        code: interactionInProgress,
        desc: BrowserAuthErrorMessages[interactionInProgress],
    },
    popupWindowError: {
        code: popupWindowError,
        desc: BrowserAuthErrorMessages[popupWindowError],
    },
    emptyWindowError: {
        code: emptyWindowError,
        desc: BrowserAuthErrorMessages[emptyWindowError],
    },
    userCancelledError: {
        code: userCancelled,
        desc: BrowserAuthErrorMessages[userCancelled],
    },
    monitorPopupTimeoutError: {
        code: monitorPopupTimeout,
        desc: BrowserAuthErrorMessages[monitorPopupTimeout],
    },
    monitorIframeTimeoutError: {
        code: monitorWindowTimeout,
        desc: BrowserAuthErrorMessages[monitorWindowTimeout],
    },
    redirectInIframeError: {
        code: redirectInIframe,
        desc: BrowserAuthErrorMessages[redirectInIframe],
    },
    blockTokenRequestsInHiddenIframeError: {
        code: blockIframeReload,
        desc: BrowserAuthErrorMessages[blockIframeReload],
    },
    blockAcquireTokenInPopupsError: {
        code: blockNestedPopups,
        desc: BrowserAuthErrorMessages[blockNestedPopups],
    },
    iframeClosedPrematurelyError: {
        code: iframeClosedPrematurely,
        desc: BrowserAuthErrorMessages[iframeClosedPrematurely],
    },
    silentLogoutUnsupportedError: {
        code: silentLogoutUnsupported,
        desc: BrowserAuthErrorMessages[silentLogoutUnsupported],
    },
    noAccountError: {
        code: noAccountError,
        desc: BrowserAuthErrorMessages[noAccountError],
    },
    silentPromptValueError: {
        code: silentPromptValueError,
        desc: BrowserAuthErrorMessages[silentPromptValueError],
    },
    noTokenRequestCacheError: {
        code: noTokenRequestCacheError,
        desc: BrowserAuthErrorMessages[noTokenRequestCacheError],
    },
    unableToParseTokenRequestCacheError: {
        code: unableToParseTokenRequestCacheError,
        desc: BrowserAuthErrorMessages[unableToParseTokenRequestCacheError],
    },
    authRequestNotSet: {
        code: authRequestNotSetError,
        desc: BrowserAuthErrorMessages[authRequestNotSetError],
    },
    invalidCacheType: {
        code: invalidCacheType,
        desc: BrowserAuthErrorMessages[invalidCacheType],
    },
    notInBrowserEnvironment: {
        code: nonBrowserEnvironment,
        desc: BrowserAuthErrorMessages[nonBrowserEnvironment],
    },
    databaseNotOpen: {
        code: databaseNotOpen,
        desc: BrowserAuthErrorMessages[databaseNotOpen],
    },
    noNetworkConnectivity: {
        code: noNetworkConnectivity,
        desc: BrowserAuthErrorMessages[noNetworkConnectivity],
    },
    postRequestFailed: {
        code: postRequestFailed,
        desc: BrowserAuthErrorMessages[postRequestFailed],
    },
    getRequestFailed: {
        code: getRequestFailed,
        desc: BrowserAuthErrorMessages[getRequestFailed],
    },
    failedToParseNetworkResponse: {
        code: failedToParseResponse,
        desc: BrowserAuthErrorMessages[failedToParseResponse],
    },
    unableToLoadTokenError: {
        code: unableToLoadToken,
        desc: BrowserAuthErrorMessages[unableToLoadToken],
    },
    signingKeyNotFoundInStorage: {
        code: cryptoKeyNotFound,
        desc: BrowserAuthErrorMessages[cryptoKeyNotFound],
    },
    authCodeRequired: {
        code: authCodeRequired,
        desc: BrowserAuthErrorMessages[authCodeRequired],
    },
    authCodeOrNativeAccountRequired: {
        code: authCodeOrNativeAccountIdRequired,
        desc: BrowserAuthErrorMessages[authCodeOrNativeAccountIdRequired],
    },
    spaCodeAndNativeAccountPresent: {
        code: spaCodeAndNativeAccountIdPresent,
        desc: BrowserAuthErrorMessages[spaCodeAndNativeAccountIdPresent],
    },
    databaseUnavailable: {
        code: databaseUnavailable,
        desc: BrowserAuthErrorMessages[databaseUnavailable],
    },
    unableToAcquireTokenFromNativePlatform: {
        code: unableToAcquireTokenFromNativePlatform,
        desc: BrowserAuthErrorMessages[unableToAcquireTokenFromNativePlatform],
    },
    nativeHandshakeTimeout: {
        code: nativeHandshakeTimeout,
        desc: BrowserAuthErrorMessages[nativeHandshakeTimeout],
    },
    nativeExtensionNotInstalled: {
        code: nativeExtensionNotInstalled,
        desc: BrowserAuthErrorMessages[nativeExtensionNotInstalled],
    },
    nativeConnectionNotEstablished: {
        code: nativeConnectionNotEstablished,
        desc: BrowserAuthErrorMessages[nativeConnectionNotEstablished],
    },
    uninitializedPublicClientApplication: {
        code: uninitializedPublicClientApplication,
        desc: BrowserAuthErrorMessages[uninitializedPublicClientApplication],
    },
    nativePromptNotSupported: {
        code: nativePromptNotSupported,
        desc: BrowserAuthErrorMessages[nativePromptNotSupported],
    },
    invalidBase64StringError: {
        code: invalidBase64String,
        desc: BrowserAuthErrorMessages[invalidBase64String],
    },
    invalidPopTokenRequest: {
        code: invalidPopTokenRequest,
        desc: BrowserAuthErrorMessages[invalidPopTokenRequest],
    },
};
/**
 * Browser library error class thrown by the MSAL.js library for SPAs
 */
class BrowserAuthError extends AuthError {
    constructor(errorCode, subError) {
        super(errorCode, BrowserAuthErrorMessages[errorCode], subError);
        Object.setPrototypeOf(this, BrowserAuthError.prototype);
        this.name = "BrowserAuthError";
    }
}
function createBrowserAuthError(errorCode, subError) {
    return new BrowserAuthError(errorCode, subError);
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Constants
 */
const BrowserConstants = {
    /**
     * Invalid grant error code
     */
    INVALID_GRANT_ERROR: "invalid_grant",
    /**
     * Default popup window width
     */
    POPUP_WIDTH: 483,
    /**
     * Default popup window height
     */
    POPUP_HEIGHT: 600,
    /**
     * Name of the popup window starts with
     */
    POPUP_NAME_PREFIX: "msal",
    /**
     * Default popup monitor poll interval in milliseconds
     */
    DEFAULT_POLL_INTERVAL_MS: 30,
    /**
     * Msal-browser SKU
     */
    MSAL_SKU: "msal.js.browser",
};
const PlatformAuthConstants = {
    CHANNEL_ID: "53ee284d-920a-4b59-9d30-a60315b26836",
    PREFERRED_EXTENSION_ID: "ppnbnpeolgkicgegkbkbjmhlideopiji",
    MATS_TELEMETRY: "MATS",
    MICROSOFT_ENTRA_BROKERID: "MicrosoftEntra",
    DOM_API_NAME: "DOM API",
    PLATFORM_DOM_APIS: "get-token-and-sign-out",
    PLATFORM_DOM_PROVIDER: "PlatformAuthDOMHandler",
    PLATFORM_EXTENSION_PROVIDER: "PlatformAuthExtensionHandler",
};
const NativeExtensionMethod = {
    HandshakeRequest: "Handshake",
    HandshakeResponse: "HandshakeResponse",
    GetToken: "GetToken",
    Response: "Response",
};
const BrowserCacheLocation = {
    LocalStorage: "localStorage",
    SessionStorage: "sessionStorage",
    MemoryStorage: "memoryStorage",
};
/**
 * HTTP Request types supported by MSAL.
 */
const HTTP_REQUEST_TYPE = {
    GET: "GET",
    POST: "POST",
};
const INTERACTION_TYPE = {
    SIGNIN: "signin",
    SIGNOUT: "signout",
};
/**
 * Temporary cache keys for MSAL, deleted after any request.
 */
const TemporaryCacheKeys = {
    ORIGIN_URI: "request.origin",
    URL_HASH: "urlHash",
    REQUEST_PARAMS: "request.params",
    VERIFIER: "code.verifier",
    INTERACTION_STATUS_KEY: "interaction.status",
    NATIVE_REQUEST: "request.native",
};
/**
 * Cache keys stored in-memory
 */
const InMemoryCacheKeys = {
    WRAPPER_SKU: "wrapper.sku",
    WRAPPER_VER: "wrapper.version",
};
/**
 * API Codes for Telemetry purposes.
 * Before adding a new code you must claim it in the MSAL Telemetry tracker as these number spaces are shared across all MSALs
 * 0-99 Silent Flow
 * 800-899 Auth Code Flow
 */
const ApiId = {
    acquireTokenRedirect: 861,
    acquireTokenPopup: 862,
    ssoSilent: 863,
    acquireTokenSilent_authCode: 864,
    handleRedirectPromise: 865,
    acquireTokenByCode: 866,
    acquireTokenSilent_silentFlow: 61,
    logout: 961,
    logoutPopup: 962,
};
/*
 * Interaction type of the API - used for state and telemetry
 */
exports.InteractionType = void 0;
(function (InteractionType) {
    InteractionType["Redirect"] = "redirect";
    InteractionType["Popup"] = "popup";
    InteractionType["Silent"] = "silent";
    InteractionType["None"] = "none";
})(exports.InteractionType || (exports.InteractionType = {}));
/**
 * Types of interaction currently in progress.
 * Used in events in wrapper libraries to invoke functions when certain interaction is in progress or all interactions are complete.
 */
const InteractionStatus = {
    /**
     * Initial status before interaction occurs
     */
    Startup: "startup",
    /**
     * Status set when all login calls occuring
     */
    Login: "login",
    /**
     * Status set when logout call occuring
     */
    Logout: "logout",
    /**
     * Status set for acquireToken calls
     */
    AcquireToken: "acquireToken",
    /**
     * Status set for ssoSilent calls
     */
    SsoSilent: "ssoSilent",
    /**
     * Status set when handleRedirect in progress
     */
    HandleRedirect: "handleRedirect",
    /**
     * Status set when interaction is complete
     */
    None: "none",
};
const DEFAULT_REQUEST = {
    scopes: OIDC_DEFAULT_SCOPES,
};
/**
 * JWK Key Format string (Type MUST be defined for window crypto APIs)
 */
const KEY_FORMAT_JWK = "jwk";
// Supported wrapper SKUs
const WrapperSKU = {
    React: "@azure/msal-react",
    Angular: "@azure/msal-angular",
};
// DatabaseStorage Constants
const DB_NAME = "msal.db";
const DB_VERSION = 1;
const DB_TABLE_NAME = `${DB_NAME}.keys`;
const CacheLookupPolicy = {
    /*
     * acquireTokenSilent will attempt to retrieve an access token from the cache. If the access token is expired
     * or cannot be found the refresh token will be used to acquire a new one. Finally, if the refresh token
     * is expired acquireTokenSilent will attempt to acquire new access and refresh tokens.
     */
    Default: 0,
    /*
     * acquireTokenSilent will only look for access tokens in the cache. It will not attempt to renew access or
     * refresh tokens.
     */
    AccessToken: 1,
    /*
     * acquireTokenSilent will attempt to retrieve an access token from the cache. If the access token is expired or
     * cannot be found, the refresh token will be used to acquire a new one. If the refresh token is expired, it
     * will not be renewed and acquireTokenSilent will fail.
     */
    AccessTokenAndRefreshToken: 2,
    /*
     * acquireTokenSilent will not attempt to retrieve access tokens from the cache and will instead attempt to
     * exchange the cached refresh token for a new access token. If the refresh token is expired, it will not be
     * renewed and acquireTokenSilent will fail.
     */
    RefreshToken: 3,
    /*
     * acquireTokenSilent will not look in the cache for the access token. It will go directly to network with the
     * cached refresh token. If the refresh token is expired an attempt will be made to renew it. This is equivalent to
     * setting "forceRefresh: true".
     */
    RefreshTokenAndNetwork: 4,
    /*
     * acquireTokenSilent will attempt to renew both access and refresh tokens. It will not look in the cache. This will
     * always fail if 3rd party cookies are blocked by the browser.
     */
    Skip: 5,
};
const iFrameRenewalPolicies = [
    CacheLookupPolicy.Default,
    CacheLookupPolicy.Skip,
    CacheLookupPolicy.RefreshTokenAndNetwork,
];

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Class which exposes APIs to encode plaintext to base64 encoded string. See here for implementation details:
 * https://developer.mozilla.org/en-US/docs/Web/API/WindowBase64/Base64_encoding_and_decoding#Solution_2_%E2%80%93_JavaScript's_UTF-16_%3E_UTF-8_%3E_base64
 */
/**
 * Returns URL Safe b64 encoded string from a plaintext string.
 * @param input
 */
function urlEncode(input) {
    return encodeURIComponent(base64Encode(input)
        .replace(/=/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_"));
}
/**
 * Returns URL Safe b64 encoded string from an int8Array.
 * @param inputArr
 */
function urlEncodeArr(inputArr) {
    return base64EncArr(inputArr)
        .replace(/=/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");
}
/**
 * Returns b64 encoded string from plaintext string.
 * @param input
 */
function base64Encode(input) {
    return base64EncArr(new TextEncoder().encode(input));
}
/**
 * Base64 encode byte array
 * @param aBytes
 */
function base64EncArr(aBytes) {
    const binString = Array.from(aBytes, (x) => String.fromCodePoint(x)).join("");
    return btoa(binString);
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Class which exposes APIs to decode base64 strings to plaintext. See here for implementation details:
 * https://developer.mozilla.org/en-US/docs/Glossary/Base64#the_unicode_problem
 */
/**
 * Returns a URL-safe plaintext decoded string from b64 encoded input.
 * @param input
 */
function base64Decode(input) {
    return new TextDecoder().decode(base64DecToArr(input));
}
/**
 * Decodes base64 into Uint8Array
 * @param base64String
 */
function base64DecToArr(base64String) {
    let encodedString = base64String.replace(/-/g, "+").replace(/_/g, "/");
    switch (encodedString.length % 4) {
        case 0:
            break;
        case 2:
            encodedString += "==";
            break;
        case 3:
            encodedString += "=";
            break;
        default:
            throw createBrowserAuthError(invalidBase64String);
    }
    const binString = atob(encodedString);
    return Uint8Array.from(binString, (m) => m.codePointAt(0) || 0);
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * This file defines functions used by the browser library to perform cryptography operations such as
 * hashing and encoding. It also has helper functions to validate the availability of specific APIs.
 */
/**
 * See here for more info on RsaHashedKeyGenParams: https://developer.mozilla.org/en-US/docs/Web/API/RsaHashedKeyGenParams
 */
// Algorithms
const PKCS1_V15_KEYGEN_ALG = "RSASSA-PKCS1-v1_5";
const AES_GCM = "AES-GCM";
const HKDF = "HKDF";
// SHA-256 hashing algorithm
const S256_HASH_ALG = "SHA-256";
// MOD length for PoP tokens
const MODULUS_LENGTH = 2048;
// Public Exponent
const PUBLIC_EXPONENT = new Uint8Array([0x01, 0x00, 0x01]);
// UUID hex digits
const UUID_CHARS = "0123456789abcdef";
// Array to store UINT32 random value
const UINT32_ARR = new Uint32Array(1);
// Key Format
const RAW = "raw";
// Key Usages
const ENCRYPT = "encrypt";
const DECRYPT = "decrypt";
const DERIVE_KEY = "deriveKey";
// Suberror
const SUBTLE_SUBERROR = "crypto_subtle_undefined";
const keygenAlgorithmOptions = {
    name: PKCS1_V15_KEYGEN_ALG,
    hash: S256_HASH_ALG,
    modulusLength: MODULUS_LENGTH,
    publicExponent: PUBLIC_EXPONENT,
};
/**
 * Check whether browser crypto is available.
 */
function validateCryptoAvailable(skipValidateSubtleCrypto) {
    if (!window) {
        throw createBrowserAuthError(nonBrowserEnvironment);
    }
    if (!window.crypto) {
        throw createBrowserAuthError(cryptoNonExistent);
    }
    if (!skipValidateSubtleCrypto && !window.crypto.subtle) {
        throw createBrowserAuthError(cryptoNonExistent, SUBTLE_SUBERROR);
    }
}
/**
 * Returns a sha-256 hash of the given dataString as an ArrayBuffer.
 * @param dataString {string} data string
 * @param performanceClient {?IPerformanceClient}
 * @param correlationId {?string} correlation id
 */
async function sha256Digest(dataString, performanceClient, correlationId) {
    performanceClient?.addQueueMeasurement(PerformanceEvents.Sha256Digest, correlationId);
    const encoder = new TextEncoder();
    const data = encoder.encode(dataString);
    return window.crypto.subtle.digest(S256_HASH_ALG, data);
}
/**
 * Populates buffer with cryptographically random values.
 * @param dataBuffer
 */
function getRandomValues(dataBuffer) {
    return window.crypto.getRandomValues(dataBuffer);
}
/**
 * Returns random Uint32 value.
 * @returns {number}
 */
function getRandomUint32() {
    window.crypto.getRandomValues(UINT32_ARR);
    return UINT32_ARR[0];
}
/**
 * Creates a UUID v7 from the current timestamp.
 * Implementation relies on the system clock to guarantee increasing order of generated identifiers.
 * @returns {number}
 */
function createNewGuid() {
    const currentTimestamp = Date.now();
    const baseRand = getRandomUint32() * 0x400 + (getRandomUint32() & 0x3ff);
    // Result byte array
    const bytes = new Uint8Array(16);
    // A 12-bit `rand_a` field value
    const randA = Math.trunc(baseRand / 2 ** 30);
    // The higher 30 bits of 62-bit `rand_b` field value
    const randBHi = baseRand & (2 ** 30 - 1);
    // The lower 32 bits of 62-bit `rand_b` field value
    const randBLo = getRandomUint32();
    bytes[0] = currentTimestamp / 2 ** 40;
    bytes[1] = currentTimestamp / 2 ** 32;
    bytes[2] = currentTimestamp / 2 ** 24;
    bytes[3] = currentTimestamp / 2 ** 16;
    bytes[4] = currentTimestamp / 2 ** 8;
    bytes[5] = currentTimestamp;
    bytes[6] = 0x70 | (randA >>> 8);
    bytes[7] = randA;
    bytes[8] = 0x80 | (randBHi >>> 24);
    bytes[9] = randBHi >>> 16;
    bytes[10] = randBHi >>> 8;
    bytes[11] = randBHi;
    bytes[12] = randBLo >>> 24;
    bytes[13] = randBLo >>> 16;
    bytes[14] = randBLo >>> 8;
    bytes[15] = randBLo;
    let text = "";
    for (let i = 0; i < bytes.length; i++) {
        text += UUID_CHARS.charAt(bytes[i] >>> 4);
        text += UUID_CHARS.charAt(bytes[i] & 0xf);
        if (i === 3 || i === 5 || i === 7 || i === 9) {
            text += "-";
        }
    }
    return text;
}
/**
 * Generates a keypair based on current keygen algorithm config.
 * @param extractable
 * @param usages
 */
async function generateKeyPair(extractable, usages) {
    return window.crypto.subtle.generateKey(keygenAlgorithmOptions, extractable, usages);
}
/**
 * Export key as Json Web Key (JWK)
 * @param key
 */
async function exportJwk(key) {
    return window.crypto.subtle.exportKey(KEY_FORMAT_JWK, key);
}
/**
 * Imports key as Json Web Key (JWK), can set extractable and usages.
 * @param key
 * @param extractable
 * @param usages
 */
async function importJwk(key, extractable, usages) {
    return window.crypto.subtle.importKey(KEY_FORMAT_JWK, key, keygenAlgorithmOptions, extractable, usages);
}
/**
 * Signs given data with given key
 * @param key
 * @param data
 */
async function sign(key, data) {
    return window.crypto.subtle.sign(keygenAlgorithmOptions, key, data);
}
/**
 * Generates Base64 encoded jwk used in the Encrypted Authorize Response (EAR) flow
 */
async function generateEarKey() {
    const key = await generateBaseKey();
    const keyStr = urlEncodeArr(new Uint8Array(key));
    const jwk = {
        alg: "dir",
        kty: "oct",
        k: keyStr,
    };
    return base64Encode(JSON.stringify(jwk));
}
/**
 * Parses earJwk for encryption key and returns CryptoKey object
 * @param earJwk
 * @returns
 */
async function importEarKey(earJwk) {
    const b64DecodedJwk = base64Decode(earJwk);
    const jwkJson = JSON.parse(b64DecodedJwk);
    const rawKey = jwkJson.k;
    const keyBuffer = base64DecToArr(rawKey);
    return window.crypto.subtle.importKey(RAW, keyBuffer, AES_GCM, false, [
        DECRYPT,
    ]);
}
/**
 * Decrypt ear_jwe response returned in the Encrypted Authorize Response (EAR) flow
 * @param earJwk
 * @param earJwe
 * @returns
 */
async function decryptEarResponse(earJwk, earJwe) {
    const earJweParts = earJwe.split(".");
    if (earJweParts.length !== 5) {
        throw createBrowserAuthError(failedToDecryptEarResponse, "jwe_length");
    }
    const key = await importEarKey(earJwk).catch(() => {
        throw createBrowserAuthError(failedToDecryptEarResponse, "import_key");
    });
    try {
        const header = new TextEncoder().encode(earJweParts[0]);
        const iv = base64DecToArr(earJweParts[2]);
        const ciphertext = base64DecToArr(earJweParts[3]);
        const tag = base64DecToArr(earJweParts[4]);
        const tagLengthBits = tag.byteLength * 8;
        // Concat ciphertext and tag
        const encryptedData = new Uint8Array(ciphertext.length + tag.length);
        encryptedData.set(ciphertext);
        encryptedData.set(tag, ciphertext.length);
        const decryptedData = await window.crypto.subtle.decrypt({
            name: AES_GCM,
            iv: iv,
            tagLength: tagLengthBits,
            additionalData: header,
        }, key, encryptedData);
        return new TextDecoder().decode(decryptedData);
    }
    catch (e) {
        throw createBrowserAuthError(failedToDecryptEarResponse, "decrypt");
    }
}
/**
 * Generates symmetric base encryption key. This may be stored as all encryption/decryption keys will be derived from this one.
 */
async function generateBaseKey() {
    const key = await window.crypto.subtle.generateKey({
        name: AES_GCM,
        length: 256,
    }, true, [ENCRYPT, DECRYPT]);
    return window.crypto.subtle.exportKey(RAW, key);
}
/**
 * Returns the raw key to be passed into the key derivation function
 * @param baseKey
 * @returns
 */
async function generateHKDF(baseKey) {
    return window.crypto.subtle.importKey(RAW, baseKey, HKDF, false, [
        DERIVE_KEY,
    ]);
}
/**
 * Given a base key and a nonce generates a derived key to be used in encryption and decryption.
 * Note: every time we encrypt a new key is derived
 * @param baseKey
 * @param nonce
 * @returns
 */
async function deriveKey(baseKey, nonce, context) {
    return window.crypto.subtle.deriveKey({
        name: HKDF,
        salt: nonce,
        hash: S256_HASH_ALG,
        info: new TextEncoder().encode(context),
    }, baseKey, { name: AES_GCM, length: 256 }, false, [ENCRYPT, DECRYPT]);
}
/**
 * Encrypt the given data given a base key. Returns encrypted data and a nonce that must be provided during decryption
 * @param key
 * @param rawData
 */
async function encrypt(baseKey, rawData, context) {
    const encodedData = new TextEncoder().encode(rawData);
    // The nonce must never be reused with a given key.
    const nonce = window.crypto.getRandomValues(new Uint8Array(16));
    const derivedKey = await deriveKey(baseKey, nonce, context);
    const encryptedData = await window.crypto.subtle.encrypt({
        name: AES_GCM,
        iv: new Uint8Array(12), // New key is derived for every encrypt so we don't need a new nonce
    }, derivedKey, encodedData);
    return {
        data: urlEncodeArr(new Uint8Array(encryptedData)),
        nonce: urlEncodeArr(nonce),
    };
}
/**
 * Decrypt data with the given key and nonce
 * @param key
 * @param nonce
 * @param encryptedData
 * @returns
 */
async function decrypt(baseKey, nonce, context, encryptedData) {
    const encodedData = base64DecToArr(encryptedData);
    const derivedKey = await deriveKey(baseKey, base64DecToArr(nonce), context);
    const decryptedData = await window.crypto.subtle.decrypt({
        name: AES_GCM,
        iv: new Uint8Array(12), // New key is derived for every encrypt so we don't need a new nonce
    }, derivedKey, encodedData);
    return new TextDecoder().decode(decryptedData);
}
/**
 * Returns the SHA-256 hash of an input string
 * @param plainText
 */
async function hashString(plainText) {
    const hashBuffer = await sha256Digest(plainText);
    const hashBytes = new Uint8Array(hashBuffer);
    return urlEncodeArr(hashBytes);
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const storageNotSupported = "storage_not_supported";
const stubbedPublicClientApplicationCalled = "stubbed_public_client_application_called";
const inMemRedirectUnavailable = "in_mem_redirect_unavailable";

var BrowserConfigurationAuthErrorCodes = /*#__PURE__*/Object.freeze({
    __proto__: null,
    inMemRedirectUnavailable: inMemRedirectUnavailable,
    storageNotSupported: storageNotSupported,
    stubbedPublicClientApplicationCalled: stubbedPublicClientApplicationCalled
});

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const BrowserConfigurationAuthErrorMessages = {
    [storageNotSupported]: "Given storage configuration option was not supported.",
    [stubbedPublicClientApplicationCalled]: "Stub instance of Public Client Application was called. If using msal-react, please ensure context is not used without a provider. For more visit: aka.ms/msaljs/browser-errors",
    [inMemRedirectUnavailable]: "Redirect cannot be supported. In-memory storage was selected and storeAuthStateInCookie=false, which would cause the library to be unable to handle the incoming hash. If you would like to use the redirect API, please use session/localStorage or set storeAuthStateInCookie=true.",
};
/**
 * BrowserAuthErrorMessage class containing string constants used by error codes and messages.
 * @deprecated Use BrowserAuthErrorCodes instead
 */
const BrowserConfigurationAuthErrorMessage = {
    storageNotSupportedError: {
        code: storageNotSupported,
        desc: BrowserConfigurationAuthErrorMessages[storageNotSupported],
    },
    stubPcaInstanceCalled: {
        code: stubbedPublicClientApplicationCalled,
        desc: BrowserConfigurationAuthErrorMessages[stubbedPublicClientApplicationCalled],
    },
    inMemRedirectUnavailable: {
        code: inMemRedirectUnavailable,
        desc: BrowserConfigurationAuthErrorMessages[inMemRedirectUnavailable],
    },
};
/**
 * Browser library error class thrown by the MSAL.js library for SPAs
 */
class BrowserConfigurationAuthError extends AuthError {
    constructor(errorCode, errorMessage) {
        super(errorCode, errorMessage);
        this.name = "BrowserConfigurationAuthError";
        Object.setPrototypeOf(this, BrowserConfigurationAuthError.prototype);
    }
}
function createBrowserConfigurationAuthError(errorCode) {
    return new BrowserConfigurationAuthError(errorCode, BrowserConfigurationAuthErrorMessages[errorCode]);
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Clears hash from window url.
 */
function clearHash(contentWindow) {
    // Office.js sets history.replaceState to null
    contentWindow.location.hash = "";
    if (typeof contentWindow.history.replaceState === "function") {
        // Full removes "#" from url
        contentWindow.history.replaceState(null, "", `${contentWindow.location.origin}${contentWindow.location.pathname}${contentWindow.location.search}`);
    }
}
/**
 * Replaces current hash with hash from provided url
 */
function replaceHash(url) {
    const urlParts = url.split("#");
    urlParts.shift(); // Remove part before the hash
    window.location.hash = urlParts.length > 0 ? urlParts.join("#") : "";
}
/**
 * Returns boolean of whether the current window is in an iframe or not.
 */
function isInIframe() {
    return window.parent !== window;
}
/**
 * Returns boolean of whether or not the current window is a popup opened by msal
 */
function isInPopup() {
    return (typeof window !== "undefined" &&
        !!window.opener &&
        window.opener !== window &&
        typeof window.name === "string" &&
        window.name.indexOf(`${BrowserConstants.POPUP_NAME_PREFIX}.`) === 0);
}
// #endregion
/**
 * Returns current window URL as redirect uri
 */
function getCurrentUri() {
    return typeof window !== "undefined" && window.location
        ? window.location.href.split("?")[0].split("#")[0]
        : "";
}
/**
 * Gets the homepage url for the current window location.
 */
function getHomepage() {
    const currentUrl = new UrlString(window.location.href);
    const urlComponents = currentUrl.getUrlComponents();
    return `${urlComponents.Protocol}//${urlComponents.HostNameAndPort}/`;
}
/**
 * Throws error if we have completed an auth and are
 * attempting another auth request inside an iframe.
 */
function blockReloadInHiddenIframes() {
    const isResponseHash = UrlString.hashContainsKnownProperties(window.location.hash);
    // return an error if called from the hidden iframe created by the msal js silent calls
    if (isResponseHash && isInIframe()) {
        throw createBrowserAuthError(blockIframeReload);
    }
}
/**
 * Block redirect operations in iframes unless explicitly allowed
 * @param interactionType Interaction type for the request
 * @param allowRedirectInIframe Config value to allow redirects when app is inside an iframe
 */
function blockRedirectInIframe(allowRedirectInIframe) {
    if (isInIframe() && !allowRedirectInIframe) {
        // If we are not in top frame, we shouldn't redirect. This is also handled by the service.
        throw createBrowserAuthError(redirectInIframe);
    }
}
/**
 * Block redirectUri loaded in popup from calling AcquireToken APIs
 */
function blockAcquireTokenInPopups() {
    // Popups opened by msal popup APIs are given a name that starts with "msal."
    if (isInPopup()) {
        throw createBrowserAuthError(blockNestedPopups);
    }
}
/**
 * Throws error if token requests are made in non-browser environment
 * @param isBrowserEnvironment Flag indicating if environment is a browser.
 */
function blockNonBrowserEnvironment() {
    if (typeof window === "undefined") {
        throw createBrowserAuthError(nonBrowserEnvironment);
    }
}
/**
 * Throws error if initialize hasn't been called
 * @param initialized
 */
function blockAPICallsBeforeInitialize(initialized) {
    if (!initialized) {
        throw createBrowserAuthError(uninitializedPublicClientApplication);
    }
}
/**
 * Helper to validate app environment before making an auth request
 * @param initialized
 */
function preflightCheck$1(initialized) {
    // Block request if not in browser environment
    blockNonBrowserEnvironment();
    // Block auth requests inside a hidden iframe
    blockReloadInHiddenIframes();
    // Block redirectUri opened in a popup from calling MSAL APIs
    blockAcquireTokenInPopups();
    // Block token acquisition before initialize has been called
    blockAPICallsBeforeInitialize(initialized);
}
/**
 * Helper to validate app enviornment before making redirect request
 * @param initialized
 * @param config
 */
function redirectPreflightCheck(initialized, config) {
    preflightCheck$1(initialized);
    blockRedirectInIframe(config.system.allowRedirectInIframe);
    // Block redirects if memory storage is enabled but storeAuthStateInCookie is not
    if (config.cache.cacheLocation === BrowserCacheLocation.MemoryStorage &&
        !config.cache.storeAuthStateInCookie) {
        throw createBrowserConfigurationAuthError(inMemRedirectUnavailable);
    }
}
/**
 * Adds a preconnect link element to the header which begins DNS resolution and SSL connection in anticipation of the /token request
 * @param loginDomain Authority domain, including https protocol e.g. https://login.microsoftonline.com
 * @returns
 */
function preconnect(authority) {
    const link = document.createElement("link");
    link.rel = "preconnect";
    link.href = new URL(authority).origin;
    link.crossOrigin = "anonymous";
    document.head.appendChild(link);
    // The browser will close connection if not used within a few seconds, remove element from the header after 10s
    window.setTimeout(() => {
        try {
            document.head.removeChild(link);
        }
        catch { }
    }, 10000); // 10s Timeout
}
/**
 * Wrapper function that creates a UUID v7 from the current timestamp.
 * @returns {string}
 */
function createGuid() {
    return createNewGuid();
}
const addClientCapabilitiesToClaims = addClientCapabilitiesToClaims$1;

var BrowserUtils = /*#__PURE__*/Object.freeze({
    __proto__: null,
    addClientCapabilitiesToClaims: addClientCapabilitiesToClaims,
    blockAPICallsBeforeInitialize: blockAPICallsBeforeInitialize,
    blockAcquireTokenInPopups: blockAcquireTokenInPopups,
    blockNonBrowserEnvironment: blockNonBrowserEnvironment,
    blockRedirectInIframe: blockRedirectInIframe,
    blockReloadInHiddenIframes: blockReloadInHiddenIframes,
    clearHash: clearHash,
    createGuid: createGuid,
    getCurrentUri: getCurrentUri,
    getHomepage: getHomepage,
    invoke: invoke,
    invokeAsync: invokeAsync,
    isInIframe: isInIframe,
    isInPopup: isInPopup,
    preconnect: preconnect,
    preflightCheck: preflightCheck$1,
    redirectPreflightCheck: redirectPreflightCheck,
    replaceHash: replaceHash
});

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
class NavigationClient {
    /**
     * Navigates to other pages within the same web application
     * @param url
     * @param options
     */
    navigateInternal(url, options) {
        return NavigationClient.defaultNavigateWindow(url, options);
    }
    /**
     * Navigates to other pages outside the web application i.e. the Identity Provider
     * @param url
     * @param options
     */
    navigateExternal(url, options) {
        return NavigationClient.defaultNavigateWindow(url, options);
    }
    /**
     * Default navigation implementation invoked by the internal and external functions
     * @param url
     * @param options
     */
    static defaultNavigateWindow(url, options) {
        if (options.noHistory) {
            window.location.replace(url); // CodeQL [SM03712] Application owner controls the URL. User can't change it.
        }
        else {
            window.location.assign(url); // CodeQL [SM03712] Application owner controls the URL. User can't change it.
        }
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                reject(createBrowserAuthError(timedOut, "failed_to_redirect"));
            }, options.timeout);
        });
    }
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * This class implements the Fetch API for GET and POST requests. See more here: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
 */
class FetchClient {
    /**
     * Fetch Client for REST endpoints - Get request
     * @param url
     * @param headers
     * @param body
     */
    async sendGetRequestAsync(url, options) {
        let response;
        let responseHeaders = {};
        let responseStatus = 0;
        const reqHeaders = getFetchHeaders(options);
        try {
            response = await fetch(url, {
                method: HTTP_REQUEST_TYPE.GET,
                headers: reqHeaders,
            });
        }
        catch (e) {
            throw createNetworkError(createBrowserAuthError(window.navigator.onLine
                ? getRequestFailed
                : noNetworkConnectivity), undefined, undefined, e);
        }
        responseHeaders = getHeaderDict(response.headers);
        try {
            responseStatus = response.status;
            return {
                headers: responseHeaders,
                body: (await response.json()),
                status: responseStatus,
            };
        }
        catch (e) {
            throw createNetworkError(createBrowserAuthError(failedToParseResponse), responseStatus, responseHeaders, e);
        }
    }
    /**
     * Fetch Client for REST endpoints - Post request
     * @param url
     * @param headers
     * @param body
     */
    async sendPostRequestAsync(url, options) {
        const reqBody = (options && options.body) || "";
        const reqHeaders = getFetchHeaders(options);
        let response;
        let responseStatus = 0;
        let responseHeaders = {};
        try {
            response = await fetch(url, {
                method: HTTP_REQUEST_TYPE.POST,
                headers: reqHeaders,
                body: reqBody,
            });
        }
        catch (e) {
            throw createNetworkError(createBrowserAuthError(window.navigator.onLine
                ? postRequestFailed
                : noNetworkConnectivity), undefined, undefined, e);
        }
        responseHeaders = getHeaderDict(response.headers);
        try {
            responseStatus = response.status;
            return {
                headers: responseHeaders,
                body: (await response.json()),
                status: responseStatus,
            };
        }
        catch (e) {
            throw createNetworkError(createBrowserAuthError(failedToParseResponse), responseStatus, responseHeaders, e);
        }
    }
}
/**
 * Get Fetch API Headers object from string map
 * @param inputHeaders
 */
function getFetchHeaders(options) {
    try {
        const headers = new Headers();
        if (!(options && options.headers)) {
            return headers;
        }
        const optionsHeaders = options.headers;
        Object.entries(optionsHeaders).forEach(([key, value]) => {
            headers.append(key, value);
        });
        return headers;
    }
    catch (e) {
        throw createNetworkError(createBrowserAuthError(failedToBuildHeaders), undefined, undefined, e);
    }
}
/**
 * Returns object representing response headers
 * @param headers
 * @returns
 */
function getHeaderDict(headers) {
    try {
        const headerDict = {};
        headers.forEach((value, key) => {
            headerDict[key] = value;
        });
        return headerDict;
    }
    catch (e) {
        throw createBrowserAuthError(failedToParseHeaders);
    }
}

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
        logLevel: exports.LogLevel.Info,
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
        logger.warning(JSON.stringify(createClientConfigurationError(cannotSetOIDCOptions)));
    }
    // Throw an error if user has set allowPlatformBroker to true with OIDC protocol mode
    if (userInputAuth?.protocolMode &&
        userInputAuth.protocolMode === ProtocolMode.OIDC &&
        providedSystemOptions?.allowPlatformBroker) {
        throw createClientConfigurationError(cannotAllowPlatformBroker);
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

/* eslint-disable header/header */
const name = "@azure/msal-browser";
const version = "4.27.0";

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const PREFIX = "msal";
const BROWSER_PREFIX = "browser";
const CACHE_KEY_SEPARATOR = "|";
const CREDENTIAL_SCHEMA_VERSION = 2;
const ACCOUNT_SCHEMA_VERSION = 2;
const LOG_LEVEL_CACHE_KEY = `${PREFIX}.${BROWSER_PREFIX}.log.level`;
const LOG_PII_CACHE_KEY = `${PREFIX}.${BROWSER_PREFIX}.log.pii`;
const BROWSER_PERF_ENABLED_KEY = `${PREFIX}.${BROWSER_PREFIX}.performance.enabled`;
const VERSION_CACHE_KEY = `${PREFIX}.version`;
const ACCOUNT_KEYS = "account.keys";
const TOKEN_KEYS = "token.keys";
function getAccountKeysCacheKey(schema = ACCOUNT_SCHEMA_VERSION) {
    if (schema < 1) {
        return `${PREFIX}.${ACCOUNT_KEYS}`;
    }
    return `${PREFIX}.${schema}.${ACCOUNT_KEYS}`;
}
function getTokenKeysCacheKey(clientId, schema = CREDENTIAL_SCHEMA_VERSION) {
    if (schema < 1) {
        return `${PREFIX}.${TOKEN_KEYS}.${clientId}`;
    }
    return `${PREFIX}.${schema}.${TOKEN_KEYS}.${clientId}`;
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Base class for operating context
 * Operating contexts are contexts in which MSAL.js is being run
 * More than one operating context may be available at a time
 * It's important from a logging and telemetry point of view for us to be able to identify the operating context.
 * For example: Some operating contexts will pre-cache tokens impacting performance telemetry
 */
class BaseOperatingContext {
    static loggerCallback(level, message) {
        switch (level) {
            case exports.LogLevel.Error:
                // eslint-disable-next-line no-console
                console.error(message);
                return;
            case exports.LogLevel.Info:
                // eslint-disable-next-line no-console
                console.info(message);
                return;
            case exports.LogLevel.Verbose:
                // eslint-disable-next-line no-console
                console.debug(message);
                return;
            case exports.LogLevel.Warning:
                // eslint-disable-next-line no-console
                console.warn(message);
                return;
            default:
                // eslint-disable-next-line no-console
                console.log(message);
                return;
        }
    }
    constructor(config) {
        /*
         * If loaded in an environment where window is not available,
         * set internal flag to false so that further requests fail.
         * This is to support server-side rendering environments.
         */
        this.browserEnvironment = typeof window !== "undefined";
        this.config = buildConfiguration(config, this.browserEnvironment);
        let sessionStorage;
        try {
            sessionStorage = window[BrowserCacheLocation.SessionStorage];
            // Mute errors if it's a non-browser environment or cookies are blocked.
        }
        catch (e) { }
        const logLevelKey = sessionStorage?.getItem(LOG_LEVEL_CACHE_KEY);
        const piiLoggingKey = sessionStorage
            ?.getItem(LOG_PII_CACHE_KEY)
            ?.toLowerCase();
        const piiLoggingEnabled = piiLoggingKey === "true"
            ? true
            : piiLoggingKey === "false"
                ? false
                : undefined;
        const loggerOptions = { ...this.config.system.loggerOptions };
        const logLevel = logLevelKey && Object.keys(exports.LogLevel).includes(logLevelKey)
            ? exports.LogLevel[logLevelKey]
            : undefined;
        if (logLevel) {
            loggerOptions.loggerCallback = BaseOperatingContext.loggerCallback;
            loggerOptions.logLevel = logLevel;
        }
        if (piiLoggingEnabled !== undefined) {
            loggerOptions.piiLoggingEnabled = piiLoggingEnabled;
        }
        this.logger = new Logger(loggerOptions, name, version);
        this.available = false;
    }
    /**
     * Return the MSAL config
     * @returns BrowserConfiguration
     */
    getConfig() {
        return this.config;
    }
    /**
     * Returns the MSAL Logger
     * @returns Logger
     */
    getLogger() {
        return this.logger;
    }
    isAvailable() {
        return this.available;
    }
    isBrowserEnvironment() {
        return this.browserEnvironment;
    }
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const BridgeStatusCode = {
    UserInteractionRequired: "USER_INTERACTION_REQUIRED",
    UserCancel: "USER_CANCEL",
    NoNetwork: "NO_NETWORK",
    TransientError: "TRANSIENT_ERROR",
    PersistentError: "PERSISTENT_ERROR",
    Disabled: "DISABLED",
    AccountUnavailable: "ACCOUNT_UNAVAILABLE",
    NestedAppAuthUnavailable: "NESTED_APP_AUTH_UNAVAILABLE", // NAA is unavailable in the current context, can retry with standard browser based auth
};

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * BridgeProxy
 * Provides a proxy for accessing a bridge to a host app and/or
 * platform broker
 */
class BridgeProxy {
    /**
     * initializeNestedAppAuthBridge - Initializes the bridge to the host app
     * @returns a promise that resolves to an InitializeBridgeResponse or rejects with an Error
     * @remarks This method will be called by the create factory method
     * @remarks If the bridge is not available, this method will throw an error
     */
    static async initializeNestedAppAuthBridge() {
        if (window === undefined) {
            throw new Error("window is undefined");
        }
        if (window.nestedAppAuthBridge === undefined) {
            throw new Error("window.nestedAppAuthBridge is undefined");
        }
        try {
            window.nestedAppAuthBridge.addEventListener("message", (response) => {
                const responsePayload = typeof response === "string" ? response : response.data;
                const responseEnvelope = JSON.parse(responsePayload);
                const request = BridgeProxy.bridgeRequests.find((element) => element.requestId === responseEnvelope.requestId);
                if (request !== undefined) {
                    BridgeProxy.bridgeRequests.splice(BridgeProxy.bridgeRequests.indexOf(request), 1);
                    if (responseEnvelope.success) {
                        request.resolve(responseEnvelope);
                    }
                    else {
                        request.reject(responseEnvelope.error);
                    }
                }
            });
            const bridgeResponse = await new Promise((resolve, reject) => {
                const message = BridgeProxy.buildRequest("GetInitContext");
                const request = {
                    requestId: message.requestId,
                    method: message.method,
                    resolve: resolve,
                    reject: reject,
                };
                BridgeProxy.bridgeRequests.push(request);
                window.nestedAppAuthBridge.postMessage(JSON.stringify(message));
            });
            return BridgeProxy.validateBridgeResultOrThrow(bridgeResponse.initContext);
        }
        catch (error) {
            window.console.log(error);
            throw error;
        }
    }
    /**
     * getTokenInteractive - Attempts to get a token interactively from the bridge
     * @param request A token request
     * @returns a promise that resolves to an auth result or rejects with a BridgeError
     */
    getTokenInteractive(request) {
        return this.getToken("GetTokenPopup", request);
    }
    /**
     * getTokenSilent Attempts to get a token silently from the bridge
     * @param request A token request
     * @returns a promise that resolves to an auth result or rejects with a BridgeError
     */
    getTokenSilent(request) {
        return this.getToken("GetToken", request);
    }
    async getToken(requestType, request) {
        const result = await this.sendRequest(requestType, {
            tokenParams: request,
        });
        return {
            token: BridgeProxy.validateBridgeResultOrThrow(result.token),
            account: BridgeProxy.validateBridgeResultOrThrow(result.account),
        };
    }
    getHostCapabilities() {
        return this.capabilities ?? null;
    }
    getAccountContext() {
        return this.accountContext ? this.accountContext : null;
    }
    static buildRequest(method, requestParams) {
        return {
            messageType: "NestedAppAuthRequest",
            method: method,
            requestId: createNewGuid(),
            sendTime: Date.now(),
            clientLibrary: BrowserConstants.MSAL_SKU,
            clientLibraryVersion: version,
            ...requestParams,
        };
    }
    /**
     * A method used to send a request to the bridge
     * @param request A token request
     * @returns a promise that resolves to a response of provided type or rejects with a BridgeError
     */
    sendRequest(method, requestParams) {
        const message = BridgeProxy.buildRequest(method, requestParams);
        const promise = new Promise((resolve, reject) => {
            const request = {
                requestId: message.requestId,
                method: message.method,
                resolve: resolve,
                reject: reject,
            };
            BridgeProxy.bridgeRequests.push(request);
            window.nestedAppAuthBridge.postMessage(JSON.stringify(message));
        });
        return promise;
    }
    static validateBridgeResultOrThrow(input) {
        if (input === undefined) {
            const bridgeError = {
                status: BridgeStatusCode.NestedAppAuthUnavailable,
            };
            throw bridgeError;
        }
        return input;
    }
    /**
     * Private constructor for BridgeProxy
     * @param sdkName The name of the SDK being used to make requests on behalf of the app
     * @param sdkVersion The version of the SDK being used to make requests on behalf of the app
     * @param capabilities The capabilities of the bridge / SDK / platform broker
     */
    constructor(sdkName, sdkVersion, accountContext, capabilities) {
        this.sdkName = sdkName;
        this.sdkVersion = sdkVersion;
        this.accountContext = accountContext;
        this.capabilities = capabilities;
    }
    /**
     * Factory method for creating an implementation of IBridgeProxy
     * @returns A promise that resolves to a BridgeProxy implementation
     */
    static async create() {
        const response = await BridgeProxy.initializeNestedAppAuthBridge();
        return new BridgeProxy(response.sdkName, response.sdkVersion, response.accountContext, response.capabilities);
    }
}
BridgeProxy.bridgeRequests = [];

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
class NestedAppOperatingContext extends BaseOperatingContext {
    constructor() {
        super(...arguments);
        this.bridgeProxy = undefined;
        this.accountContext = null;
    }
    /**
     * Return the module name.  Intended for use with import() to enable dynamic import
     * of the implementation associated with this operating context
     * @returns
     */
    getModuleName() {
        return NestedAppOperatingContext.MODULE_NAME;
    }
    /**
     * Returns the unique identifier for this operating context
     * @returns string
     */
    getId() {
        return NestedAppOperatingContext.ID;
    }
    /**
     * Returns the current BridgeProxy
     * @returns IBridgeProxy | undefined
     */
    getBridgeProxy() {
        return this.bridgeProxy;
    }
    /**
     * Checks whether the operating context is available.
     * Confirms that the code is running a browser rather.  This is required.
     * @returns Promise<boolean> indicating whether this operating context is currently available.
     */
    async initialize() {
        try {
            if (typeof window !== "undefined") {
                if (typeof window.__initializeNestedAppAuth === "function") {
                    await window.__initializeNestedAppAuth();
                }
                const bridgeProxy = await BridgeProxy.create();
                /*
                 * Because we want single sign on we expect the host app to provide the account context
                 * with a min set of params that can be used to identify the account
                 * this.account = nestedApp.getAccountByFilter(bridgeProxy.getAccountContext());
                 */
                this.accountContext = bridgeProxy.getAccountContext();
                this.bridgeProxy = bridgeProxy;
                this.available = bridgeProxy !== undefined;
            }
        }
        catch (ex) {
            this.logger.infoPii(`Could not initialize Nested App Auth bridge (${ex})`);
        }
        this.logger.info(`Nested App Auth Bridge available: ${this.available}`);
        return this.available;
    }
}
/*
 * TODO: Once we have determine the bundling code return here to specify the name of the bundle
 * containing the implementation for this operating context
 */
NestedAppOperatingContext.MODULE_NAME = "";
/**
 * Unique identifier for the operating context
 */
NestedAppOperatingContext.ID = "NestedAppOperatingContext";

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
class StandardOperatingContext extends BaseOperatingContext {
    /**
     * Return the module name.  Intended for use with import() to enable dynamic import
     * of the implementation associated with this operating context
     * @returns
     */
    getModuleName() {
        return StandardOperatingContext.MODULE_NAME;
    }
    /**
     * Returns the unique identifier for this operating context
     * @returns string
     */
    getId() {
        return StandardOperatingContext.ID;
    }
    /**
     * Checks whether the operating context is available.
     * Confirms that the code is running a browser rather.  This is required.
     * @returns Promise<boolean> indicating whether this operating context is currently available.
     */
    async initialize() {
        this.available = typeof window !== "undefined";
        return this.available;
        /*
         * NOTE: The standard context is available as long as there is a window.  If/when we split out WAM from Browser
         * We can move the current contents of the initialize method to here and verify that the WAM extension is available
         */
    }
}
/*
 * TODO: Once we have determine the bundling code return here to specify the name of the bundle
 * containing the implementation for this operating context
 */
StandardOperatingContext.MODULE_NAME = "";
/**
 * Unique identifier for the operating context
 */
StandardOperatingContext.ID = "StandardOperatingContext";

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Storage wrapper for IndexedDB storage in browsers: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
 */
class DatabaseStorage {
    constructor() {
        this.dbName = DB_NAME;
        this.version = DB_VERSION;
        this.tableName = DB_TABLE_NAME;
        this.dbOpen = false;
    }
    /**
     * Opens IndexedDB instance.
     */
    async open() {
        return new Promise((resolve, reject) => {
            const openDB = window.indexedDB.open(this.dbName, this.version);
            openDB.addEventListener("upgradeneeded", (e) => {
                const event = e;
                event.target.result.createObjectStore(this.tableName);
            });
            openDB.addEventListener("success", (e) => {
                const event = e;
                this.db = event.target.result;
                this.dbOpen = true;
                resolve();
            });
            openDB.addEventListener("error", () => reject(createBrowserAuthError(databaseUnavailable)));
        });
    }
    /**
     * Closes the connection to IndexedDB database when all pending transactions
     * complete.
     */
    closeConnection() {
        const db = this.db;
        if (db && this.dbOpen) {
            db.close();
            this.dbOpen = false;
        }
    }
    /**
     * Opens database if it's not already open
     */
    async validateDbIsOpen() {
        if (!this.dbOpen) {
            return this.open();
        }
    }
    /**
     * Retrieves item from IndexedDB instance.
     * @param key
     */
    async getItem(key) {
        await this.validateDbIsOpen();
        return new Promise((resolve, reject) => {
            // TODO: Add timeouts?
            if (!this.db) {
                return reject(createBrowserAuthError(databaseNotOpen));
            }
            const transaction = this.db.transaction([this.tableName], "readonly");
            const objectStore = transaction.objectStore(this.tableName);
            const dbGet = objectStore.get(key);
            dbGet.addEventListener("success", (e) => {
                const event = e;
                this.closeConnection();
                resolve(event.target.result);
            });
            dbGet.addEventListener("error", (e) => {
                this.closeConnection();
                reject(e);
            });
        });
    }
    /**
     * Adds item to IndexedDB under given key
     * @param key
     * @param payload
     */
    async setItem(key, payload) {
        await this.validateDbIsOpen();
        return new Promise((resolve, reject) => {
            // TODO: Add timeouts?
            if (!this.db) {
                return reject(createBrowserAuthError(databaseNotOpen));
            }
            const transaction = this.db.transaction([this.tableName], "readwrite");
            const objectStore = transaction.objectStore(this.tableName);
            const dbPut = objectStore.put(payload, key);
            dbPut.addEventListener("success", () => {
                this.closeConnection();
                resolve();
            });
            dbPut.addEventListener("error", (e) => {
                this.closeConnection();
                reject(e);
            });
        });
    }
    /**
     * Removes item from IndexedDB under given key
     * @param key
     */
    async removeItem(key) {
        await this.validateDbIsOpen();
        return new Promise((resolve, reject) => {
            if (!this.db) {
                return reject(createBrowserAuthError(databaseNotOpen));
            }
            const transaction = this.db.transaction([this.tableName], "readwrite");
            const objectStore = transaction.objectStore(this.tableName);
            const dbDelete = objectStore.delete(key);
            dbDelete.addEventListener("success", () => {
                this.closeConnection();
                resolve();
            });
            dbDelete.addEventListener("error", (e) => {
                this.closeConnection();
                reject(e);
            });
        });
    }
    /**
     * Get all the keys from the storage object as an iterable array of strings.
     */
    async getKeys() {
        await this.validateDbIsOpen();
        return new Promise((resolve, reject) => {
            if (!this.db) {
                return reject(createBrowserAuthError(databaseNotOpen));
            }
            const transaction = this.db.transaction([this.tableName], "readonly");
            const objectStore = transaction.objectStore(this.tableName);
            const dbGetKeys = objectStore.getAllKeys();
            dbGetKeys.addEventListener("success", (e) => {
                const event = e;
                this.closeConnection();
                resolve(event.target.result);
            });
            dbGetKeys.addEventListener("error", (e) => {
                this.closeConnection();
                reject(e);
            });
        });
    }
    /**
     *
     * Checks whether there is an object under the search key in the object store
     */
    async containsKey(key) {
        await this.validateDbIsOpen();
        return new Promise((resolve, reject) => {
            if (!this.db) {
                return reject(createBrowserAuthError(databaseNotOpen));
            }
            const transaction = this.db.transaction([this.tableName], "readonly");
            const objectStore = transaction.objectStore(this.tableName);
            const dbContainsKey = objectStore.count(key);
            dbContainsKey.addEventListener("success", (e) => {
                const event = e;
                this.closeConnection();
                resolve(event.target.result === 1);
            });
            dbContainsKey.addEventListener("error", (e) => {
                this.closeConnection();
                reject(e);
            });
        });
    }
    /**
     * Deletes the MSAL database. The database is deleted rather than cleared to make it possible
     * for client applications to downgrade to a previous MSAL version without worrying about forward compatibility issues
     * with IndexedDB database versions.
     */
    async deleteDatabase() {
        // Check if database being deleted exists
        if (this.db && this.dbOpen) {
            this.closeConnection();
        }
        return new Promise((resolve, reject) => {
            const deleteDbRequest = window.indexedDB.deleteDatabase(DB_NAME);
            const id = setTimeout(() => reject(false), 200); // Reject if events aren't raised within 200ms
            deleteDbRequest.addEventListener("success", () => {
                clearTimeout(id);
                return resolve(true);
            });
            deleteDbRequest.addEventListener("blocked", () => {
                clearTimeout(id);
                return resolve(true);
            });
            deleteDbRequest.addEventListener("error", () => {
                clearTimeout(id);
                return reject(false);
            });
        });
    }
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
class MemoryStorage {
    constructor() {
        this.cache = new Map();
    }
    async initialize() {
        // Memory storage does not require initialization
    }
    getItem(key) {
        return this.cache.get(key) || null;
    }
    getUserData(key) {
        return this.getItem(key);
    }
    setItem(key, value) {
        this.cache.set(key, value);
    }
    async setUserData(key, value) {
        this.setItem(key, value);
    }
    removeItem(key) {
        this.cache.delete(key);
    }
    getKeys() {
        const cacheKeys = [];
        this.cache.forEach((value, key) => {
            cacheKeys.push(key);
        });
        return cacheKeys;
    }
    containsKey(key) {
        return this.cache.has(key);
    }
    clear() {
        this.cache.clear();
    }
    decryptData() {
        // Memory storage does not support encryption, so this method is a no-op
        return Promise.resolve(null);
    }
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * This class allows MSAL to store artifacts asynchronously using the DatabaseStorage IndexedDB wrapper,
 * backed up with the more volatile MemoryStorage object for cases in which IndexedDB may be unavailable.
 */
class AsyncMemoryStorage {
    constructor(logger) {
        this.inMemoryCache = new MemoryStorage();
        this.indexedDBCache = new DatabaseStorage();
        this.logger = logger;
    }
    handleDatabaseAccessError(error) {
        if (error instanceof BrowserAuthError &&
            error.errorCode === databaseUnavailable) {
            this.logger.error("Could not access persistent storage. This may be caused by browser privacy features which block persistent storage in third-party contexts.");
        }
        else {
            throw error;
        }
    }
    /**
     * Get the item matching the given key. Tries in-memory cache first, then in the asynchronous
     * storage object if item isn't found in-memory.
     * @param key
     */
    async getItem(key) {
        const item = this.inMemoryCache.getItem(key);
        if (!item) {
            try {
                this.logger.verbose("Queried item not found in in-memory cache, now querying persistent storage.");
                return await this.indexedDBCache.getItem(key);
            }
            catch (e) {
                this.handleDatabaseAccessError(e);
            }
        }
        return item;
    }
    /**
     * Sets the item in the in-memory cache and then tries to set it in the asynchronous
     * storage object with the given key.
     * @param key
     * @param value
     */
    async setItem(key, value) {
        this.inMemoryCache.setItem(key, value);
        try {
            await this.indexedDBCache.setItem(key, value);
        }
        catch (e) {
            this.handleDatabaseAccessError(e);
        }
    }
    /**
     * Removes the item matching the key from the in-memory cache, then tries to remove it from the asynchronous storage object.
     * @param key
     */
    async removeItem(key) {
        this.inMemoryCache.removeItem(key);
        try {
            await this.indexedDBCache.removeItem(key);
        }
        catch (e) {
            this.handleDatabaseAccessError(e);
        }
    }
    /**
     * Get all the keys from the in-memory cache as an iterable array of strings. If no keys are found, query the keys in the
     * asynchronous storage object.
     */
    async getKeys() {
        const cacheKeys = this.inMemoryCache.getKeys();
        if (cacheKeys.length === 0) {
            try {
                this.logger.verbose("In-memory cache is empty, now querying persistent storage.");
                return await this.indexedDBCache.getKeys();
            }
            catch (e) {
                this.handleDatabaseAccessError(e);
            }
        }
        return cacheKeys;
    }
    /**
     * Returns true or false if the given key is present in the cache.
     * @param key
     */
    async containsKey(key) {
        const containsKey = this.inMemoryCache.containsKey(key);
        if (!containsKey) {
            try {
                this.logger.verbose("Key not found in in-memory cache, now querying persistent storage.");
                return await this.indexedDBCache.containsKey(key);
            }
            catch (e) {
                this.handleDatabaseAccessError(e);
            }
        }
        return containsKey;
    }
    /**
     * Clears in-memory Map
     */
    clearInMemory() {
        // InMemory cache is a Map instance, clear is straightforward
        this.logger.verbose(`Deleting in-memory keystore`);
        this.inMemoryCache.clear();
        this.logger.verbose(`In-memory keystore deleted`);
    }
    /**
     * Tries to delete the IndexedDB database
     * @returns
     */
    async clearPersistent() {
        try {
            this.logger.verbose("Deleting persistent keystore");
            const dbDeleted = await this.indexedDBCache.deleteDatabase();
            if (dbDeleted) {
                this.logger.verbose("Persistent keystore deleted");
            }
            return dbDeleted;
        }
        catch (e) {
            this.handleDatabaseAccessError(e);
            return false;
        }
    }
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * This class implements MSAL's crypto interface, which allows it to perform base64 encoding and decoding, generating cryptographically random GUIDs and
 * implementing Proof Key for Code Exchange specs for the OAuth Authorization Code Flow using PKCE (rfc here: https://tools.ietf.org/html/rfc7636).
 */
class CryptoOps {
    constructor(logger, performanceClient, skipValidateSubtleCrypto) {
        this.logger = logger;
        // Browser crypto needs to be validated first before any other classes can be set.
        validateCryptoAvailable(skipValidateSubtleCrypto ?? false);
        this.cache = new AsyncMemoryStorage(this.logger);
        this.performanceClient = performanceClient;
    }
    /**
     * Creates a new random GUID - used to populate state and nonce.
     * @returns string (GUID)
     */
    createNewGuid() {
        return createNewGuid();
    }
    /**
     * Encodes input string to base64.
     * @param input
     */
    base64Encode(input) {
        return base64Encode(input);
    }
    /**
     * Decodes input string from base64.
     * @param input
     */
    base64Decode(input) {
        return base64Decode(input);
    }
    /**
     * Encodes input string to base64 URL safe string.
     * @param input
     */
    base64UrlEncode(input) {
        return urlEncode(input);
    }
    /**
     * Stringifies and base64Url encodes input public key
     * @param inputKid
     * @returns Base64Url encoded public key
     */
    encodeKid(inputKid) {
        return this.base64UrlEncode(JSON.stringify({ kid: inputKid }));
    }
    /**
     * Generates a keypair, stores it and returns a thumbprint
     * @param request
     */
    async getPublicKeyThumbprint(request) {
        const publicKeyThumbMeasurement = this.performanceClient?.startMeasurement(PerformanceEvents.CryptoOptsGetPublicKeyThumbprint, request.correlationId);
        // Generate Keypair
        const keyPair = await generateKeyPair(CryptoOps.EXTRACTABLE, CryptoOps.POP_KEY_USAGES);
        // Generate Thumbprint for Public Key
        const publicKeyJwk = await exportJwk(keyPair.publicKey);
        const pubKeyThumprintObj = {
            e: publicKeyJwk.e,
            kty: publicKeyJwk.kty,
            n: publicKeyJwk.n,
        };
        const publicJwkString = getSortedObjectString(pubKeyThumprintObj);
        const publicJwkHash = await this.hashString(publicJwkString);
        // Generate Thumbprint for Private Key
        const privateKeyJwk = await exportJwk(keyPair.privateKey);
        // Re-import private key to make it unextractable
        const unextractablePrivateKey = await importJwk(privateKeyJwk, false, ["sign"]);
        // Store Keypair data in keystore
        await this.cache.setItem(publicJwkHash, {
            privateKey: unextractablePrivateKey,
            publicKey: keyPair.publicKey,
            requestMethod: request.resourceRequestMethod,
            requestUri: request.resourceRequestUri,
        });
        if (publicKeyThumbMeasurement) {
            publicKeyThumbMeasurement.end({
                success: true,
            });
        }
        return publicJwkHash;
    }
    /**
     * Removes cryptographic keypair from key store matching the keyId passed in
     * @param kid
     */
    async removeTokenBindingKey(kid) {
        await this.cache.removeItem(kid);
        const keyFound = await this.cache.containsKey(kid);
        if (keyFound) {
            throw createClientAuthError(bindingKeyNotRemoved);
        }
    }
    /**
     * Removes all cryptographic keys from IndexedDB storage
     */
    async clearKeystore() {
        // Delete in-memory keystores
        this.cache.clearInMemory();
        /**
         * There is only one database, so calling clearPersistent on asymmetric keystore takes care of
         * every persistent keystore
         */
        try {
            await this.cache.clearPersistent();
            return true;
        }
        catch (e) {
            if (e instanceof Error) {
                this.logger.error(`Clearing keystore failed with error: ${e.message}`);
            }
            else {
                this.logger.error("Clearing keystore failed with unknown error");
            }
            return false;
        }
    }
    /**
     * Signs the given object as a jwt payload with private key retrieved by given kid.
     * @param payload
     * @param kid
     */
    async signJwt(payload, kid, shrOptions, correlationId) {
        const signJwtMeasurement = this.performanceClient?.startMeasurement(PerformanceEvents.CryptoOptsSignJwt, correlationId);
        const cachedKeyPair = await this.cache.getItem(kid);
        if (!cachedKeyPair) {
            throw createBrowserAuthError(cryptoKeyNotFound);
        }
        // Get public key as JWK
        const publicKeyJwk = await exportJwk(cachedKeyPair.publicKey);
        const publicKeyJwkString = getSortedObjectString(publicKeyJwk);
        // Base64URL encode public key thumbprint with keyId only: BASE64URL({ kid: "FULL_PUBLIC_KEY_HASH" })
        const encodedKeyIdThumbprint = urlEncode(JSON.stringify({ kid: kid }));
        // Generate header
        const shrHeader = JoseHeader.getShrHeaderString({
            ...shrOptions?.header,
            alg: publicKeyJwk.alg,
            kid: encodedKeyIdThumbprint,
        });
        const encodedShrHeader = urlEncode(shrHeader);
        // Generate payload
        payload.cnf = {
            jwk: JSON.parse(publicKeyJwkString),
        };
        const encodedPayload = urlEncode(JSON.stringify(payload));
        // Form token string
        const tokenString = `${encodedShrHeader}.${encodedPayload}`;
        // Sign token
        const encoder = new TextEncoder();
        const tokenBuffer = encoder.encode(tokenString);
        const signatureBuffer = await sign(cachedKeyPair.privateKey, tokenBuffer);
        const encodedSignature = urlEncodeArr(new Uint8Array(signatureBuffer));
        const signedJwt = `${tokenString}.${encodedSignature}`;
        if (signJwtMeasurement) {
            signJwtMeasurement.end({
                success: true,
            });
        }
        return signedJwt;
    }
    /**
     * Returns the SHA-256 hash of an input string
     * @param plainText
     */
    async hashString(plainText) {
        return hashString(plainText);
    }
}
CryptoOps.POP_KEY_USAGES = ["sign", "verify"];
CryptoOps.EXTRACTABLE = true;
function getSortedObjectString(obj) {
    return JSON.stringify(obj, Object.keys(obj).sort());
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
// Cookie life calculation (hours * minutes * seconds * ms)
const COOKIE_LIFE_MULTIPLIER = 24 * 60 * 60 * 1000;
const SameSiteOptions = {
    Lax: "Lax",
    None: "None",
};
class CookieStorage {
    initialize() {
        return Promise.resolve();
    }
    getItem(key) {
        const name = `${encodeURIComponent(key)}`;
        const cookieList = document.cookie.split(";");
        for (let i = 0; i < cookieList.length; i++) {
            const cookie = cookieList[i];
            const [key, ...rest] = decodeURIComponent(cookie).trim().split("=");
            const value = rest.join("=");
            if (key === name) {
                return value;
            }
        }
        return "";
    }
    getUserData() {
        throw createClientAuthError(methodNotImplemented);
    }
    setItem(key, value, cookieLifeDays, secure = true, sameSite = SameSiteOptions.Lax) {
        let cookieStr = `${encodeURIComponent(key)}=${encodeURIComponent(value)};path=/;SameSite=${sameSite};`;
        if (cookieLifeDays) {
            const expireTime = getCookieExpirationTime(cookieLifeDays);
            cookieStr += `expires=${expireTime};`;
        }
        if (secure || sameSite === SameSiteOptions.None) {
            // SameSite None requires Secure flag
            cookieStr += "Secure;";
        }
        document.cookie = cookieStr;
    }
    async setUserData() {
        return Promise.reject(createClientAuthError(methodNotImplemented));
    }
    removeItem(key) {
        // Setting expiration to -1 removes it
        this.setItem(key, "", -1);
    }
    getKeys() {
        const cookieList = document.cookie.split(";");
        const keys = [];
        cookieList.forEach((cookie) => {
            const cookieParts = decodeURIComponent(cookie).trim().split("=");
            keys.push(cookieParts[0]);
        });
        return keys;
    }
    containsKey(key) {
        return this.getKeys().includes(key);
    }
    decryptData() {
        // Cookie storage does not support encryption, so this method is a no-op
        return Promise.resolve(null);
    }
}
/**
 * Get cookie expiration time
 * @param cookieLifeDays
 */
function getCookieExpirationTime(cookieLifeDays) {
    const today = new Date();
    const expr = new Date(today.getTime() + cookieLifeDays * COOKIE_LIFE_MULTIPLIER);
    return expr.toUTCString();
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Returns a list of cache keys for all known accounts
 * @param storage
 * @returns
 */
function getAccountKeys(storage, schemaVersion) {
    const accountKeys = storage.getItem(getAccountKeysCacheKey(schemaVersion));
    if (accountKeys) {
        return JSON.parse(accountKeys);
    }
    return [];
}
/**
 * Returns a list of cache keys for all known tokens
 * @param clientId
 * @param storage
 * @returns
 */
function getTokenKeys(clientId, storage, schemaVersion) {
    const item = storage.getItem(getTokenKeysCacheKey(clientId, schemaVersion));
    if (item) {
        const tokenKeys = JSON.parse(item);
        if (tokenKeys &&
            tokenKeys.hasOwnProperty("idToken") &&
            tokenKeys.hasOwnProperty("accessToken") &&
            tokenKeys.hasOwnProperty("refreshToken")) {
            return tokenKeys;
        }
    }
    return {
        idToken: [],
        accessToken: [],
        refreshToken: [],
    };
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
function isEncrypted(data) {
    return (data.hasOwnProperty("id") &&
        data.hasOwnProperty("nonce") &&
        data.hasOwnProperty("data"));
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const ENCRYPTION_KEY = "msal.cache.encryption";
const BROADCAST_CHANNEL_NAME$1 = "msal.broadcast.cache";
class LocalStorage {
    constructor(clientId, logger, performanceClient) {
        if (!window.localStorage) {
            throw createBrowserConfigurationAuthError(storageNotSupported);
        }
        this.memoryStorage = new MemoryStorage();
        this.initialized = false;
        this.clientId = clientId;
        this.logger = logger;
        this.performanceClient = performanceClient;
        this.broadcast = new BroadcastChannel(BROADCAST_CHANNEL_NAME$1);
    }
    async initialize(correlationId) {
        const cookies = new CookieStorage();
        const cookieString = cookies.getItem(ENCRYPTION_KEY);
        let parsedCookie = { key: "", id: "" };
        if (cookieString) {
            try {
                parsedCookie = JSON.parse(cookieString);
            }
            catch (e) { }
        }
        if (parsedCookie.key && parsedCookie.id) {
            // Encryption key already exists, import
            const baseKey = invoke(base64DecToArr, PerformanceEvents.Base64Decode, this.logger, this.performanceClient, correlationId)(parsedCookie.key);
            this.encryptionCookie = {
                id: parsedCookie.id,
                key: await invokeAsync(generateHKDF, PerformanceEvents.GenerateHKDF, this.logger, this.performanceClient, correlationId)(baseKey),
            };
        }
        else {
            // Encryption key doesn't exist or is invalid, generate a new one
            const id = createNewGuid();
            const baseKey = await invokeAsync(generateBaseKey, PerformanceEvents.GenerateBaseKey, this.logger, this.performanceClient, correlationId)();
            const keyStr = invoke(urlEncodeArr, PerformanceEvents.UrlEncodeArr, this.logger, this.performanceClient, correlationId)(new Uint8Array(baseKey));
            this.encryptionCookie = {
                id: id,
                key: await invokeAsync(generateHKDF, PerformanceEvents.GenerateHKDF, this.logger, this.performanceClient, correlationId)(baseKey),
            };
            const cookieData = {
                id: id,
                key: keyStr,
            };
            cookies.setItem(ENCRYPTION_KEY, JSON.stringify(cookieData), 0, // Expiration - 0 means cookie will be cleared at the end of the browser session
            true, // Secure flag
            SameSiteOptions.None // SameSite must be None to support iframed apps
            );
        }
        await invokeAsync(this.importExistingCache.bind(this), PerformanceEvents.ImportExistingCache, this.logger, this.performanceClient, correlationId)(correlationId);
        // Register listener for cache updates in other tabs
        this.broadcast.addEventListener("message", this.updateCache.bind(this));
        this.initialized = true;
    }
    getItem(key) {
        return window.localStorage.getItem(key);
    }
    getUserData(key) {
        if (!this.initialized) {
            throw createBrowserAuthError(uninitializedPublicClientApplication);
        }
        return this.memoryStorage.getItem(key);
    }
    async decryptData(key, data, correlationId) {
        if (!this.initialized || !this.encryptionCookie) {
            throw createBrowserAuthError(uninitializedPublicClientApplication);
        }
        if (data.id !== this.encryptionCookie.id) {
            // Data was encrypted with a different key. It must be removed because it is from a previous session.
            this.performanceClient.incrementFields({ encryptedCacheExpiredCount: 1 }, correlationId);
            return null;
        }
        const decryptedData = await invokeAsync(decrypt, PerformanceEvents.Decrypt, this.logger, this.performanceClient, correlationId)(this.encryptionCookie.key, data.nonce, this.getContext(key), data.data);
        if (!decryptedData) {
            return null;
        }
        try {
            return {
                ...JSON.parse(decryptedData),
                lastUpdatedAt: data.lastUpdatedAt,
            };
        }
        catch (e) {
            this.performanceClient.incrementFields({ encryptedCacheCorruptionCount: 1 }, correlationId);
            return null;
        }
    }
    setItem(key, value) {
        window.localStorage.setItem(key, value);
    }
    async setUserData(key, value, correlationId, timestamp, kmsi) {
        if (!this.initialized || !this.encryptionCookie) {
            throw createBrowserAuthError(uninitializedPublicClientApplication);
        }
        if (kmsi) {
            this.setItem(key, value);
        }
        else {
            const { data, nonce } = await invokeAsync(encrypt, PerformanceEvents.Encrypt, this.logger, this.performanceClient, correlationId)(this.encryptionCookie.key, value, this.getContext(key));
            const encryptedData = {
                id: this.encryptionCookie.id,
                nonce: nonce,
                data: data,
                lastUpdatedAt: timestamp,
            };
            this.setItem(key, JSON.stringify(encryptedData));
        }
        this.memoryStorage.setItem(key, value);
        // Notify other frames to update their in-memory cache
        this.broadcast.postMessage({
            key: key,
            value: value,
            context: this.getContext(key),
        });
    }
    removeItem(key) {
        if (this.memoryStorage.containsKey(key)) {
            this.memoryStorage.removeItem(key);
            this.broadcast.postMessage({
                key: key,
                value: null,
                context: this.getContext(key),
            });
        }
        window.localStorage.removeItem(key);
    }
    getKeys() {
        return Object.keys(window.localStorage);
    }
    containsKey(key) {
        return window.localStorage.hasOwnProperty(key);
    }
    /**
     * Removes all known MSAL keys from the cache
     */
    clear() {
        // Removes all remaining MSAL cache items
        this.memoryStorage.clear();
        const accountKeys = getAccountKeys(this);
        accountKeys.forEach((key) => this.removeItem(key));
        const tokenKeys = getTokenKeys(this.clientId, this);
        tokenKeys.idToken.forEach((key) => this.removeItem(key));
        tokenKeys.accessToken.forEach((key) => this.removeItem(key));
        tokenKeys.refreshToken.forEach((key) => this.removeItem(key));
        // Clean up anything left
        this.getKeys().forEach((cacheKey) => {
            if (cacheKey.startsWith(PREFIX) ||
                cacheKey.indexOf(this.clientId) !== -1) {
                this.removeItem(cacheKey);
            }
        });
    }
    /**
     * Helper to decrypt all known MSAL keys in localStorage and save them to inMemory storage
     * @returns
     */
    async importExistingCache(correlationId) {
        if (!this.encryptionCookie) {
            return;
        }
        let accountKeys = getAccountKeys(this);
        accountKeys = await this.importArray(accountKeys, correlationId);
        // Write valid account keys back to map
        if (accountKeys.length) {
            this.setItem(getAccountKeysCacheKey(), JSON.stringify(accountKeys));
        }
        else {
            this.removeItem(getAccountKeysCacheKey());
        }
        const tokenKeys = getTokenKeys(this.clientId, this);
        tokenKeys.idToken = await this.importArray(tokenKeys.idToken, correlationId);
        tokenKeys.accessToken = await this.importArray(tokenKeys.accessToken, correlationId);
        tokenKeys.refreshToken = await this.importArray(tokenKeys.refreshToken, correlationId);
        // Write valid token keys back to map
        if (tokenKeys.idToken.length ||
            tokenKeys.accessToken.length ||
            tokenKeys.refreshToken.length) {
            this.setItem(getTokenKeysCacheKey(this.clientId), JSON.stringify(tokenKeys));
        }
        else {
            this.removeItem(getTokenKeysCacheKey(this.clientId));
        }
    }
    /**
     * Helper to decrypt and save cache entries
     * @param key
     * @returns
     */
    async getItemFromEncryptedCache(key, correlationId) {
        if (!this.encryptionCookie) {
            return null;
        }
        const rawCache = this.getItem(key);
        if (!rawCache) {
            return null;
        }
        let encObj;
        try {
            encObj = JSON.parse(rawCache);
        }
        catch (e) {
            // Not a valid encrypted object, remove
            return null;
        }
        if (!isEncrypted(encObj)) {
            // Data is not encrypted
            this.performanceClient.incrementFields({ unencryptedCacheCount: 1 }, correlationId);
            return rawCache;
        }
        if (encObj.id !== this.encryptionCookie.id) {
            // Data was encrypted with a different key. It must be removed because it is from a previous session.
            this.performanceClient.incrementFields({ encryptedCacheExpiredCount: 1 }, correlationId);
            return null;
        }
        this.performanceClient.incrementFields({ encryptedCacheCount: 1 }, correlationId);
        return invokeAsync(decrypt, PerformanceEvents.Decrypt, this.logger, this.performanceClient, correlationId)(this.encryptionCookie.key, encObj.nonce, this.getContext(key), encObj.data);
    }
    /**
     * Helper to decrypt and save an array of cache keys
     * @param arr
     * @returns Array of keys successfully imported
     */
    async importArray(arr, correlationId) {
        const importedArr = [];
        const promiseArr = [];
        arr.forEach((key) => {
            const promise = this.getItemFromEncryptedCache(key, correlationId).then((value) => {
                if (value) {
                    this.memoryStorage.setItem(key, value);
                    importedArr.push(key);
                }
                else {
                    // If value is empty, unencrypted or expired remove
                    this.removeItem(key);
                }
            });
            promiseArr.push(promise);
        });
        await Promise.all(promiseArr);
        return importedArr;
    }
    /**
     * Gets encryption context for a given cache entry. This is clientId for app specific entries, empty string for shared entries
     * @param key
     * @returns
     */
    getContext(key) {
        let context = "";
        if (key.includes(this.clientId)) {
            context = this.clientId; // Used to bind encryption key to this appId
        }
        return context;
    }
    updateCache(event) {
        this.logger.trace("Updating internal cache from broadcast event");
        const perfMeasurement = this.performanceClient.startMeasurement(PerformanceEvents.LocalStorageUpdated);
        perfMeasurement.add({ isBackground: true });
        const { key, value, context } = event.data;
        if (!key) {
            this.logger.error("Broadcast event missing key");
            perfMeasurement.end({ success: false, errorCode: "noKey" });
            return;
        }
        if (context && context !== this.clientId) {
            this.logger.trace(`Ignoring broadcast event from clientId: ${context}`);
            perfMeasurement.end({
                success: false,
                errorCode: "contextMismatch",
            });
            return;
        }
        if (!value) {
            this.memoryStorage.removeItem(key);
            this.logger.verbose("Removed item from internal cache");
        }
        else {
            this.memoryStorage.setItem(key, value);
            this.logger.verbose("Updated item in internal cache");
        }
        perfMeasurement.end({ success: true });
    }
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
class SessionStorage {
    constructor() {
        if (!window.sessionStorage) {
            throw createBrowserConfigurationAuthError(storageNotSupported);
        }
    }
    async initialize() {
        // Session storage does not require initialization
    }
    getItem(key) {
        return window.sessionStorage.getItem(key);
    }
    getUserData(key) {
        return this.getItem(key);
    }
    setItem(key, value) {
        window.sessionStorage.setItem(key, value);
    }
    async setUserData(key, value) {
        this.setItem(key, value);
    }
    removeItem(key) {
        window.sessionStorage.removeItem(key);
    }
    getKeys() {
        return Object.keys(window.sessionStorage);
    }
    containsKey(key) {
        return window.sessionStorage.hasOwnProperty(key);
    }
    decryptData() {
        // Session storage does not support encryption, so this method is a no-op
        return Promise.resolve(null);
    }
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const EventType = {
    INITIALIZE_START: "msal:initializeStart",
    INITIALIZE_END: "msal:initializeEnd",
    ACCOUNT_ADDED: "msal:accountAdded",
    ACCOUNT_REMOVED: "msal:accountRemoved",
    ACTIVE_ACCOUNT_CHANGED: "msal:activeAccountChanged",
    LOGIN_START: "msal:loginStart",
    LOGIN_SUCCESS: "msal:loginSuccess",
    LOGIN_FAILURE: "msal:loginFailure",
    ACQUIRE_TOKEN_START: "msal:acquireTokenStart",
    ACQUIRE_TOKEN_SUCCESS: "msal:acquireTokenSuccess",
    ACQUIRE_TOKEN_FAILURE: "msal:acquireTokenFailure",
    ACQUIRE_TOKEN_NETWORK_START: "msal:acquireTokenFromNetworkStart",
    SSO_SILENT_START: "msal:ssoSilentStart",
    SSO_SILENT_SUCCESS: "msal:ssoSilentSuccess",
    SSO_SILENT_FAILURE: "msal:ssoSilentFailure",
    ACQUIRE_TOKEN_BY_CODE_START: "msal:acquireTokenByCodeStart",
    ACQUIRE_TOKEN_BY_CODE_SUCCESS: "msal:acquireTokenByCodeSuccess",
    ACQUIRE_TOKEN_BY_CODE_FAILURE: "msal:acquireTokenByCodeFailure",
    HANDLE_REDIRECT_START: "msal:handleRedirectStart",
    HANDLE_REDIRECT_END: "msal:handleRedirectEnd",
    POPUP_OPENED: "msal:popupOpened",
    LOGOUT_START: "msal:logoutStart",
    LOGOUT_SUCCESS: "msal:logoutSuccess",
    LOGOUT_FAILURE: "msal:logoutFailure",
    LOGOUT_END: "msal:logoutEnd",
    RESTORE_FROM_BFCACHE: "msal:restoreFromBFCache",
    BROKER_CONNECTION_ESTABLISHED: "msal:brokerConnectionEstablished",
};

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Utility function to remove an element from an array in place.
 * @param array - The array from which to remove the element.
 * @param element - The element to remove from the array.
 */
function removeElementFromArray(array, element) {
    const index = array.indexOf(element);
    if (index > -1) {
        array.splice(index, 1);
    }
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * This class implements the cache storage interface for MSAL through browser local or session storage.
 * Cookies are only used if storeAuthStateInCookie is true, and are only used for
 * parameters such as state and nonce, generally.
 */
class BrowserCacheManager extends CacheManager {
    constructor(clientId, cacheConfig, cryptoImpl, logger, performanceClient, eventHandler, staticAuthorityOptions) {
        super(clientId, cryptoImpl, logger, performanceClient, staticAuthorityOptions);
        this.cacheConfig = cacheConfig;
        this.logger = logger;
        this.internalStorage = new MemoryStorage();
        this.browserStorage = getStorageImplementation(clientId, cacheConfig.cacheLocation, logger, performanceClient);
        this.temporaryCacheStorage = getStorageImplementation(clientId, cacheConfig.temporaryCacheLocation, logger, performanceClient);
        this.cookieStorage = new CookieStorage();
        this.eventHandler = eventHandler;
    }
    async initialize(correlationId) {
        this.performanceClient.addFields({
            cacheLocation: this.cacheConfig.cacheLocation,
            cacheRetentionDays: this.cacheConfig.cacheRetentionDays,
        }, correlationId);
        await this.browserStorage.initialize(correlationId);
        await this.migrateExistingCache(correlationId);
        this.trackVersionChanges(correlationId);
    }
    /**
     * Migrates any existing cache data from previous versions of MSAL.js into the current cache structure.
     */
    async migrateExistingCache(correlationId) {
        let accountKeys = getAccountKeys(this.browserStorage);
        let tokenKeys = getTokenKeys(this.clientId, this.browserStorage);
        this.performanceClient.addFields({
            preMigrateAcntCount: accountKeys.length,
            preMigrateATCount: tokenKeys.accessToken.length,
            preMigrateITCount: tokenKeys.idToken.length,
            preMigrateRTCount: tokenKeys.refreshToken.length,
        }, correlationId);
        for (let i = 0; i < ACCOUNT_SCHEMA_VERSION; i++) {
            const credentialSchema = i; // For now account and credential schemas are the same, but may diverge in future
            await this.removeStaleAccounts(i, credentialSchema, correlationId);
        }
        // Must migrate idTokens first to ensure we have KMSI info for the rest
        for (let i = 0; i < CREDENTIAL_SCHEMA_VERSION; i++) {
            const accountSchema = i; // For now account and credential schemas are the same, but may diverge in future
            await this.migrateIdTokens(i, accountSchema, correlationId);
        }
        const kmsiMap = this.getKMSIValues();
        for (let i = 0; i < CREDENTIAL_SCHEMA_VERSION; i++) {
            await this.migrateAccessTokens(i, kmsiMap, correlationId);
            await this.migrateRefreshTokens(i, kmsiMap, correlationId);
        }
        accountKeys = getAccountKeys(this.browserStorage);
        tokenKeys = getTokenKeys(this.clientId, this.browserStorage);
        this.performanceClient.addFields({
            postMigrateAcntCount: accountKeys.length,
            postMigrateATCount: tokenKeys.accessToken.length,
            postMigrateITCount: tokenKeys.idToken.length,
            postMigrateRTCount: tokenKeys.refreshToken.length,
        }, correlationId);
    }
    /**
     * Parses entry, adds lastUpdatedAt if it doesn't exist, removes entry if expired or invalid
     * @param key
     * @param correlationId
     * @returns
     */
    async updateOldEntry(key, correlationId) {
        const rawValue = this.browserStorage.getItem(key);
        const parsedValue = this.validateAndParseJson(rawValue || "");
        if (!parsedValue) {
            this.browserStorage.removeItem(key);
            return null;
        }
        if (!parsedValue.lastUpdatedAt) {
            // Add lastUpdatedAt to the existing v0 entry if it doesnt exist so we know when it's safe to remove it
            parsedValue.lastUpdatedAt = Date.now().toString();
            this.setItem(key, JSON.stringify(parsedValue), correlationId);
        }
        else if (isCacheExpired(parsedValue.lastUpdatedAt, this.cacheConfig.cacheRetentionDays)) {
            this.browserStorage.removeItem(key);
            this.performanceClient.incrementFields({ expiredCacheRemovedCount: 1 }, correlationId);
            return null;
        }
        const decryptedData = isEncrypted(parsedValue)
            ? await this.browserStorage.decryptData(key, parsedValue, correlationId)
            : parsedValue;
        if (!decryptedData || !isCredentialEntity(decryptedData)) {
            this.performanceClient.incrementFields({ invalidCacheCount: 1 }, correlationId);
            return null;
        }
        if ((isAccessTokenEntity(decryptedData) ||
            isRefreshTokenEntity(decryptedData)) &&
            decryptedData.expiresOn &&
            isTokenExpired(decryptedData.expiresOn, DEFAULT_TOKEN_RENEWAL_OFFSET_SEC)) {
            this.browserStorage.removeItem(key);
            this.performanceClient.incrementFields({ expiredCacheRemovedCount: 1 }, correlationId);
            return null;
        }
        return decryptedData;
    }
    /**
     * Remove accounts from the cache for older schema versions if they have not been updated in the last cacheRetentionDays
     * @param accountSchema
     * @param credentialSchema
     * @param correlationId
     * @returns
     */
    async removeStaleAccounts(accountSchema, credentialSchema, correlationId) {
        const accountKeysToCheck = getAccountKeys(this.browserStorage, accountSchema);
        if (accountKeysToCheck.length === 0) {
            return;
        }
        for (const accountKey of [...accountKeysToCheck]) {
            this.performanceClient.incrementFields({ oldAcntCount: 1 }, correlationId);
            const rawValue = this.browserStorage.getItem(accountKey);
            const parsedValue = this.validateAndParseJson(rawValue || "");
            if (!parsedValue) {
                removeElementFromArray(accountKeysToCheck, accountKey);
                continue;
            }
            if (!parsedValue.lastUpdatedAt) {
                // Add lastUpdatedAt to the existing entry if it doesnt exist so we know when it's safe to remove it
                parsedValue.lastUpdatedAt = Date.now().toString();
                this.setItem(accountKey, JSON.stringify(parsedValue), correlationId);
                continue;
            }
            else if (isCacheExpired(parsedValue.lastUpdatedAt, this.cacheConfig.cacheRetentionDays)) {
                // Cache expired remove account and associated tokens
                await this.removeAccountOldSchema(accountKey, parsedValue, credentialSchema, correlationId);
                removeElementFromArray(accountKeysToCheck, accountKey);
            }
        }
        this.setAccountKeys(accountKeysToCheck, correlationId, accountSchema);
    }
    /**
     * Remove the given account and all associated tokens from the cache
     * @param accountKey
     * @param rawObject
     * @param credentialSchema
     * @param correlationId
     */
    async removeAccountOldSchema(accountKey, rawObject, credentialSchema, correlationId) {
        const decryptedData = isEncrypted(rawObject)
            ? (await this.browserStorage.decryptData(accountKey, rawObject, correlationId))
            : rawObject;
        const homeAccountId = decryptedData?.homeAccountId;
        if (homeAccountId) {
            const tokenKeys = this.getTokenKeys(credentialSchema);
            [...tokenKeys.idToken]
                .filter((key) => key.includes(homeAccountId))
                .forEach((key) => {
                this.browserStorage.removeItem(key);
                removeElementFromArray(tokenKeys.idToken, key);
            });
            [...tokenKeys.accessToken]
                .filter((key) => key.includes(homeAccountId))
                .forEach((key) => {
                this.browserStorage.removeItem(key);
                removeElementFromArray(tokenKeys.accessToken, key);
            });
            [...tokenKeys.refreshToken]
                .filter((key) => key.includes(homeAccountId))
                .forEach((key) => {
                this.browserStorage.removeItem(key);
                removeElementFromArray(tokenKeys.refreshToken, key);
            });
            this.setTokenKeys(tokenKeys, correlationId, credentialSchema);
        }
        this.performanceClient.incrementFields({ expiredAcntRemovedCount: 1 }, correlationId);
        this.browserStorage.removeItem(accountKey);
    }
    /**
     * Gets key value pair mapping homeAccountId to KMSI value
     * @returns
     */
    getKMSIValues() {
        const kmsiMap = {};
        const tokenKeys = this.getTokenKeys().idToken;
        for (const key of tokenKeys) {
            const rawValue = this.browserStorage.getUserData(key);
            if (rawValue) {
                const idToken = JSON.parse(rawValue);
                const claims = extractTokenClaims(idToken.secret, base64Decode);
                if (claims) {
                    kmsiMap[idToken.homeAccountId] = isKmsi(claims);
                }
            }
        }
        return kmsiMap;
    }
    /**
     * Migrates id tokens from the old schema to the new schema, also migrates associated account object if it doesn't already exist in the new schema
     * @param credentialSchema
     * @param accountSchema
     * @param correlationId
     * @returns
     */
    async migrateIdTokens(credentialSchema, accountSchema, correlationId) {
        const credentialKeysToMigrate = getTokenKeys(this.clientId, this.browserStorage, credentialSchema);
        if (credentialKeysToMigrate.idToken.length === 0) {
            return;
        }
        const currentCredentialKeys = getTokenKeys(this.clientId, this.browserStorage, CREDENTIAL_SCHEMA_VERSION);
        const currentAccountKeys = getAccountKeys(this.browserStorage);
        const previousAccountKeys = getAccountKeys(this.browserStorage, accountSchema);
        for (const idTokenKey of [...credentialKeysToMigrate.idToken]) {
            this.performanceClient.incrementFields({ oldITCount: 1 }, correlationId);
            const oldSchemaData = (await this.updateOldEntry(idTokenKey, correlationId));
            if (!oldSchemaData) {
                removeElementFromArray(credentialKeysToMigrate.idToken, idTokenKey);
                continue;
            }
            const currentAccountKey = currentAccountKeys.find((key) => key.includes(oldSchemaData.homeAccountId));
            const previousAccountKey = previousAccountKeys.find((key) => key.includes(oldSchemaData.homeAccountId));
            let account = null;
            if (currentAccountKey) {
                account = this.getAccount(currentAccountKey, correlationId);
            }
            else if (previousAccountKey) {
                const rawValue = this.browserStorage.getItem(previousAccountKey);
                const parsedValue = this.validateAndParseJson(rawValue || "");
                account =
                    parsedValue && isEncrypted(parsedValue)
                        ? (await this.browserStorage.decryptData(previousAccountKey, parsedValue, correlationId))
                        : parsedValue;
            }
            if (!account) {
                // Don't migrate idToken if we don't have an account for it
                this.performanceClient.incrementFields({ skipITMigrateCount: 1 }, correlationId);
                continue;
            }
            const claims = extractTokenClaims(oldSchemaData.secret, base64Decode);
            const newIdTokenKey = this.generateCredentialKey(oldSchemaData);
            const currentIdToken = this.getIdTokenCredential(newIdTokenKey, correlationId);
            const oldTokenHasSignInState = Object.keys(claims).includes("signin_state");
            const currentTokenHasSignInState = currentIdToken &&
                Object.keys(extractTokenClaims(currentIdToken.secret, base64Decode) || {}).includes("signin_state");
            /**
             * Only migrate if:
             * 1. Token doesn't yet exist in current schema
             * 2. Old schema token has been updated more recently than the current one AND migrating it won't result in loss of KMSI state
             */
            if (!currentIdToken ||
                (oldSchemaData.lastUpdatedAt > currentIdToken.lastUpdatedAt &&
                    (oldTokenHasSignInState || !currentTokenHasSignInState))) {
                const tenantProfiles = account.tenantProfiles || [];
                const tenantId = getTenantIdFromIdTokenClaims(claims) || account.realm;
                if (tenantId &&
                    !tenantProfiles.find((tenantProfile) => {
                        return tenantProfile.tenantId === tenantId;
                    })) {
                    const newTenantProfile = buildTenantProfile(account.homeAccountId, account.localAccountId, tenantId, claims);
                    tenantProfiles.push(newTenantProfile);
                }
                account.tenantProfiles = tenantProfiles;
                const newAccountKey = this.generateAccountKey(AccountEntity.getAccountInfo(account));
                const kmsi = isKmsi(claims);
                await this.setUserData(newAccountKey, JSON.stringify(account), correlationId, account.lastUpdatedAt, kmsi);
                if (!currentAccountKeys.includes(newAccountKey)) {
                    currentAccountKeys.push(newAccountKey);
                }
                await this.setUserData(newIdTokenKey, JSON.stringify(oldSchemaData), correlationId, oldSchemaData.lastUpdatedAt, kmsi);
                this.performanceClient.incrementFields({ migratedITCount: 1 }, correlationId);
                currentCredentialKeys.idToken.push(newIdTokenKey);
            }
        }
        this.setTokenKeys(credentialKeysToMigrate, correlationId, credentialSchema);
        this.setTokenKeys(currentCredentialKeys, correlationId);
        this.setAccountKeys(currentAccountKeys, correlationId);
    }
    /**
     * Migrates access tokens from old cache schema to current schema
     * @param credentialSchema
     * @param kmsiMap
     * @param correlationId
     * @returns
     */
    async migrateAccessTokens(credentialSchema, kmsiMap, correlationId) {
        const credentialKeysToMigrate = getTokenKeys(this.clientId, this.browserStorage, credentialSchema);
        if (credentialKeysToMigrate.accessToken.length === 0) {
            return;
        }
        const currentCredentialKeys = getTokenKeys(this.clientId, this.browserStorage, CREDENTIAL_SCHEMA_VERSION);
        for (const accessTokenKey of [...credentialKeysToMigrate.accessToken]) {
            this.performanceClient.incrementFields({ oldATCount: 1 }, correlationId);
            const oldSchemaData = (await this.updateOldEntry(accessTokenKey, correlationId));
            if (!oldSchemaData) {
                removeElementFromArray(credentialKeysToMigrate.accessToken, accessTokenKey);
                continue;
            }
            if (!Object.keys(kmsiMap).includes(oldSchemaData.homeAccountId)) {
                // Don't migrate tokens if we don't have an idToken for them
                this.performanceClient.incrementFields({ skipATMigrateCount: 1 }, correlationId);
                continue;
            }
            const newKey = this.generateCredentialKey(oldSchemaData);
            const kmsi = kmsiMap[oldSchemaData.homeAccountId];
            if (!currentCredentialKeys.accessToken.includes(newKey)) {
                await this.setUserData(newKey, JSON.stringify(oldSchemaData), correlationId, oldSchemaData.lastUpdatedAt, kmsi);
                this.performanceClient.incrementFields({ migratedATCount: 1 }, correlationId);
                currentCredentialKeys.accessToken.push(newKey);
            }
            else {
                const currentToken = this.getAccessTokenCredential(newKey, correlationId);
                if (!currentToken ||
                    oldSchemaData.lastUpdatedAt > currentToken.lastUpdatedAt) {
                    // If the token already exists, only overwrite it if the old token has a more recent lastUpdatedAt
                    await this.setUserData(newKey, JSON.stringify(oldSchemaData), correlationId, oldSchemaData.lastUpdatedAt, kmsi);
                    this.performanceClient.incrementFields({ migratedATCount: 1 }, correlationId);
                }
            }
        }
        this.setTokenKeys(credentialKeysToMigrate, correlationId, credentialSchema);
        this.setTokenKeys(currentCredentialKeys, correlationId);
    }
    /**
     * Migrates refresh tokens from old cache schema to current schema
     * @param credentialSchema
     * @param kmsiMap
     * @param correlationId
     * @returns
     */
    async migrateRefreshTokens(credentialSchema, kmsiMap, correlationId) {
        const credentialKeysToMigrate = getTokenKeys(this.clientId, this.browserStorage, credentialSchema);
        if (credentialKeysToMigrate.refreshToken.length === 0) {
            return;
        }
        const currentCredentialKeys = getTokenKeys(this.clientId, this.browserStorage, CREDENTIAL_SCHEMA_VERSION);
        for (const refreshTokenKey of [
            ...credentialKeysToMigrate.refreshToken,
        ]) {
            this.performanceClient.incrementFields({ oldRTCount: 1 }, correlationId);
            const oldSchemaData = (await this.updateOldEntry(refreshTokenKey, correlationId));
            if (!oldSchemaData) {
                removeElementFromArray(credentialKeysToMigrate.refreshToken, refreshTokenKey);
                continue;
            }
            if (!Object.keys(kmsiMap).includes(oldSchemaData.homeAccountId)) {
                // Don't migrate tokens if we don't have an idToken for them
                this.performanceClient.incrementFields({ skipRTMigrateCount: 1 }, correlationId);
                continue;
            }
            const newKey = this.generateCredentialKey(oldSchemaData);
            const kmsi = kmsiMap[oldSchemaData.homeAccountId];
            if (!currentCredentialKeys.refreshToken.includes(newKey)) {
                await this.setUserData(newKey, JSON.stringify(oldSchemaData), correlationId, oldSchemaData.lastUpdatedAt, kmsi);
                this.performanceClient.incrementFields({ migratedRTCount: 1 }, correlationId);
                currentCredentialKeys.refreshToken.push(newKey);
            }
            else {
                const currentToken = this.getRefreshTokenCredential(newKey, correlationId);
                if (!currentToken ||
                    oldSchemaData.lastUpdatedAt > currentToken.lastUpdatedAt) {
                    // If the token already exists, only overwrite it if the old token has a more recent lastUpdatedAt
                    await this.setUserData(newKey, JSON.stringify(oldSchemaData), correlationId, oldSchemaData.lastUpdatedAt, kmsi);
                    this.performanceClient.incrementFields({ migratedRTCount: 1 }, correlationId);
                }
            }
        }
        this.setTokenKeys(credentialKeysToMigrate, correlationId, credentialSchema);
        this.setTokenKeys(currentCredentialKeys, correlationId);
    }
    /**
     * Tracks upgrades and downgrades for telemetry and debugging purposes
     */
    trackVersionChanges(correlationId) {
        const previousVersion = this.browserStorage.getItem(VERSION_CACHE_KEY);
        if (previousVersion) {
            this.logger.info(`MSAL.js was last initialized by version: ${previousVersion}`);
            this.performanceClient.addFields({ previousLibraryVersion: previousVersion }, correlationId);
        }
        if (previousVersion !== version) {
            this.setItem(VERSION_CACHE_KEY, version, correlationId);
        }
    }
    /**
     * Parses passed value as JSON object, JSON.parse() will throw an error.
     * @param input
     */
    validateAndParseJson(jsonValue) {
        if (!jsonValue) {
            return null;
        }
        try {
            const parsedJson = JSON.parse(jsonValue);
            /**
             * There are edge cases in which JSON.parse will successfully parse a non-valid JSON object
             * (e.g. JSON.parse will parse an escaped string into an unescaped string), so adding a type check
             * of the parsed value is necessary in order to be certain that the string represents a valid JSON object.
             *
             */
            return parsedJson && typeof parsedJson === "object"
                ? parsedJson
                : null;
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Helper to setItem in browser storage, with cleanup in case of quota errors
     * @param key
     * @param value
     */
    setItem(key, value, correlationId) {
        const tokenKeysCount = new Array(CREDENTIAL_SCHEMA_VERSION + 1).fill(0); // Array mapping schema version to number of token keys stored for that version
        const accessTokenKeys = []; // Flat map of all access token keys stored, ordered by schema version
        const maxRetries = 20;
        for (let i = 0; i <= maxRetries; i++) {
            // Attempt to store item in cache, if cache is full this call will throw and we'll attempt to clear space by removing access tokens from the cache one by one, starting with tokens stored by previous versions of MSAL.js
            try {
                this.browserStorage.setItem(key, value);
                if (i > 0) {
                    // If any tokens were removed in order to store this item update the token keys array with the tokens removed
                    for (let schemaVersion = 0; schemaVersion <= CREDENTIAL_SCHEMA_VERSION; schemaVersion++) {
                        // Get the sum of all previous token counts to use as start index for this schema version
                        const startIndex = tokenKeysCount
                            .slice(0, schemaVersion)
                            .reduce((sum, count) => sum + count, 0);
                        if (startIndex >= i) {
                            // Done removing tokens
                            break;
                        }
                        const endIndex = i > startIndex + tokenKeysCount[schemaVersion]
                            ? startIndex + tokenKeysCount[schemaVersion]
                            : i;
                        if (i > startIndex &&
                            tokenKeysCount[schemaVersion] > 0) {
                            this.removeAccessTokenKeys(accessTokenKeys.slice(startIndex, endIndex), correlationId, schemaVersion);
                        }
                    }
                }
                break; // If setItem succeeds, exit the loop
            }
            catch (e) {
                const cacheError = createCacheError(e);
                if (cacheError.errorCode ===
                    cacheQuotaExceeded &&
                    i < maxRetries) {
                    if (!accessTokenKeys.length) {
                        // If we are currently trying to set the token keys, use the value we're trying to set
                        for (let i = 0; i <= CREDENTIAL_SCHEMA_VERSION; i++) {
                            if (key ===
                                getTokenKeysCacheKey(this.clientId, i)) {
                                const tokenKeys = JSON.parse(value).accessToken;
                                accessTokenKeys.push(...tokenKeys);
                                tokenKeysCount[i] = tokenKeys.length;
                            }
                            else {
                                const tokenKeys = this.getTokenKeys(i).accessToken;
                                accessTokenKeys.push(...tokenKeys);
                                tokenKeysCount[i] = tokenKeys.length;
                            }
                        }
                    }
                    if (accessTokenKeys.length <= i) {
                        // Nothing to remove, rethrow the error
                        throw cacheError;
                    }
                    // When cache quota is exceeded, start removing access tokens until we can successfully set the item
                    this.removeAccessToken(accessTokenKeys[i], correlationId, false // Don't save token keys yet, do it at the end
                    );
                }
                else {
                    // If the error is not a quota exceeded error, rethrow it
                    throw cacheError;
                }
            }
        }
    }
    /**
     * Helper to setUserData in browser storage, with cleanup in case of quota errors
     * @param key
     * @param value
     * @param correlationId
     */
    async setUserData(key, value, correlationId, timestamp, kmsi) {
        const tokenKeysCount = new Array(CREDENTIAL_SCHEMA_VERSION + 1).fill(0); // Array mapping schema version to number of token keys stored for that version
        const accessTokenKeys = []; // Flat map of all access token keys stored, ordered by schema version
        const maxRetries = 20;
        for (let i = 0; i <= maxRetries; i++) {
            try {
                // Attempt to store item in cache, if cache is full this call will throw and we'll attempt to clear space by removing access tokens from the cache one by one, starting with tokens stored by previous versions of MSAL.js
                await invokeAsync(this.browserStorage.setUserData.bind(this.browserStorage), PerformanceEvents.SetUserData, this.logger, this.performanceClient)(key, value, correlationId, timestamp, kmsi);
                if (i > 0) {
                    // If any tokens were removed in order to store this item update the token keys array with the tokens removed
                    for (let schemaVersion = 0; schemaVersion <= CREDENTIAL_SCHEMA_VERSION; schemaVersion++) {
                        // Get the sum of all previous token counts to use as start index for this schema version
                        const startIndex = tokenKeysCount
                            .slice(0, schemaVersion)
                            .reduce((sum, count) => sum + count, 0);
                        if (startIndex >= i) {
                            // Done removing tokens
                            break;
                        }
                        const endIndex = i > startIndex + tokenKeysCount[schemaVersion]
                            ? startIndex + tokenKeysCount[schemaVersion]
                            : i;
                        if (i > startIndex &&
                            tokenKeysCount[schemaVersion] > 0) {
                            this.removeAccessTokenKeys(accessTokenKeys.slice(startIndex, endIndex), correlationId, schemaVersion);
                        }
                    }
                }
                break; // If setItem succeeds, exit the loop
            }
            catch (e) {
                const cacheError = createCacheError(e);
                if (cacheError.errorCode ===
                    cacheQuotaExceeded &&
                    i < maxRetries) {
                    if (!accessTokenKeys.length) {
                        // If we are currently trying to set the token keys, use the value we're trying to set
                        for (let i = 0; i <= CREDENTIAL_SCHEMA_VERSION; i++) {
                            const tokenKeys = this.getTokenKeys(i).accessToken;
                            accessTokenKeys.push(...tokenKeys);
                            tokenKeysCount[i] = tokenKeys.length;
                        }
                    }
                    if (accessTokenKeys.length <= i) {
                        // Nothing left to remove, rethrow the error
                        throw cacheError;
                    }
                    // When cache quota is exceeded, start removing access tokens until we can successfully set the item
                    this.removeAccessToken(accessTokenKeys[i], correlationId, false // Don't save token keys yet, do it at the end
                    );
                }
                else {
                    // If the error is not a quota exceeded error, rethrow it
                    throw cacheError;
                }
            }
        }
    }
    /**
     * Reads account from cache, deserializes it into an account entity and returns it.
     * If account is not found from the key, returns null and removes key from map.
     * @param accountKey
     * @returns
     */
    getAccount(accountKey, correlationId) {
        this.logger.trace("BrowserCacheManager.getAccount called");
        const serializedAccount = this.browserStorage.getUserData(accountKey);
        if (!serializedAccount) {
            this.removeAccountKeyFromMap(accountKey, correlationId);
            return null;
        }
        const parsedAccount = this.validateAndParseJson(serializedAccount);
        if (!parsedAccount || !AccountEntity.isAccountEntity(parsedAccount)) {
            return null;
        }
        return CacheManager.toObject(new AccountEntity(), parsedAccount);
    }
    /**
     * set account entity in the platform cache
     * @param account
     */
    async setAccount(account, correlationId, kmsi) {
        this.logger.trace("BrowserCacheManager.setAccount called");
        const key = this.generateAccountKey(AccountEntity.getAccountInfo(account));
        const timestamp = Date.now().toString();
        account.lastUpdatedAt = timestamp;
        await this.setUserData(key, JSON.stringify(account), correlationId, timestamp, kmsi);
        const wasAdded = this.addAccountKeyToMap(key, correlationId);
        this.performanceClient.addFields({ kmsi: kmsi }, correlationId);
        /**
         * @deprecated - Remove this in next major version in favor of more consistent LOGIN event
         */
        if (this.cacheConfig.cacheLocation ===
            BrowserCacheLocation.LocalStorage &&
            wasAdded) {
            this.eventHandler.emitEvent(EventType.ACCOUNT_ADDED, undefined, AccountEntity.getAccountInfo(account));
        }
    }
    /**
     * Returns the array of account keys currently cached
     * @returns
     */
    getAccountKeys() {
        return getAccountKeys(this.browserStorage);
    }
    setAccountKeys(accountKeys, correlationId, schemaVersion = ACCOUNT_SCHEMA_VERSION) {
        if (accountKeys.length === 0) {
            this.removeItem(getAccountKeysCacheKey(schemaVersion));
        }
        else {
            this.setItem(getAccountKeysCacheKey(schemaVersion), JSON.stringify(accountKeys), correlationId);
        }
    }
    /**
     * Add a new account to the key map
     * @param key
     */
    addAccountKeyToMap(key, correlationId) {
        this.logger.trace("BrowserCacheManager.addAccountKeyToMap called");
        this.logger.tracePii(`BrowserCacheManager.addAccountKeyToMap called with key: ${key}`);
        const accountKeys = this.getAccountKeys();
        if (accountKeys.indexOf(key) === -1) {
            // Only add key if it does not already exist in the map
            accountKeys.push(key);
            this.setItem(getAccountKeysCacheKey(), JSON.stringify(accountKeys), correlationId);
            this.logger.verbose("BrowserCacheManager.addAccountKeyToMap account key added");
            return true;
        }
        else {
            this.logger.verbose("BrowserCacheManager.addAccountKeyToMap account key already exists in map");
            return false;
        }
    }
    /**
     * Remove an account from the key map
     * @param key
     */
    removeAccountKeyFromMap(key, correlationId) {
        this.logger.trace("BrowserCacheManager.removeAccountKeyFromMap called");
        this.logger.tracePii(`BrowserCacheManager.removeAccountKeyFromMap called with key: ${key}`);
        const accountKeys = this.getAccountKeys();
        const removalIndex = accountKeys.indexOf(key);
        if (removalIndex > -1) {
            accountKeys.splice(removalIndex, 1);
            this.setAccountKeys(accountKeys, correlationId);
            this.logger.trace("BrowserCacheManager.removeAccountKeyFromMap account key removed");
        }
        else {
            this.logger.trace("BrowserCacheManager.removeAccountKeyFromMap key not found in existing map");
        }
    }
    /**
     * Extends inherited removeAccount function to include removal of the account key from the map
     * @param key
     */
    removeAccount(account, correlationId) {
        const activeAccount = this.getActiveAccount(correlationId);
        if (activeAccount?.homeAccountId === account.homeAccountId &&
            activeAccount?.environment === account.environment) {
            this.setActiveAccount(null, correlationId);
        }
        super.removeAccount(account, correlationId);
        this.removeAccountKeyFromMap(this.generateAccountKey(account), correlationId);
        // Remove all other associated cache items
        this.browserStorage.getKeys().forEach((key) => {
            if (key.includes(account.homeAccountId) &&
                key.includes(account.environment)) {
                this.browserStorage.removeItem(key);
            }
        });
        /**
         * @deprecated - Remove this in next major version in favor of more consistent LOGOUT event
         */
        if (this.cacheConfig.cacheLocation === BrowserCacheLocation.LocalStorage) {
            this.eventHandler.emitEvent(EventType.ACCOUNT_REMOVED, undefined, account);
        }
    }
    /**
     * Removes given idToken from the cache and from the key map
     * @param key
     */
    removeIdToken(key, correlationId) {
        super.removeIdToken(key, correlationId);
        const tokenKeys = this.getTokenKeys();
        const idRemoval = tokenKeys.idToken.indexOf(key);
        if (idRemoval > -1) {
            this.logger.info("idToken removed from tokenKeys map");
            tokenKeys.idToken.splice(idRemoval, 1);
            this.setTokenKeys(tokenKeys, correlationId);
        }
    }
    /**
     * Removes given accessToken from the cache and from the key map
     * @param key
     */
    removeAccessToken(key, correlationId, updateTokenKeys = true) {
        super.removeAccessToken(key, correlationId);
        updateTokenKeys && this.removeAccessTokenKeys([key], correlationId);
    }
    /**
     * Remove access token key from the key map
     * @param key
     * @param correlationId
     * @param tokenKeys
     */
    removeAccessTokenKeys(keys, correlationId, schemaVersion = CREDENTIAL_SCHEMA_VERSION) {
        this.logger.trace("removeAccessTokenKey called");
        const tokenKeys = this.getTokenKeys(schemaVersion);
        let keysRemoved = 0;
        keys.forEach((key) => {
            const accessRemoval = tokenKeys.accessToken.indexOf(key);
            if (accessRemoval > -1) {
                tokenKeys.accessToken.splice(accessRemoval, 1);
                keysRemoved++;
            }
        });
        if (keysRemoved > 0) {
            this.logger.info(`removed ${keysRemoved} accessToken keys from tokenKeys map`);
            this.setTokenKeys(tokenKeys, correlationId, schemaVersion);
            return;
        }
    }
    /**
     * Removes given refreshToken from the cache and from the key map
     * @param key
     */
    removeRefreshToken(key, correlationId) {
        super.removeRefreshToken(key, correlationId);
        const tokenKeys = this.getTokenKeys();
        const refreshRemoval = tokenKeys.refreshToken.indexOf(key);
        if (refreshRemoval > -1) {
            this.logger.info("refreshToken removed from tokenKeys map");
            tokenKeys.refreshToken.splice(refreshRemoval, 1);
            this.setTokenKeys(tokenKeys, correlationId);
        }
    }
    /**
     * Gets the keys for the cached tokens associated with this clientId
     * @returns
     */
    getTokenKeys(schemaVersion = CREDENTIAL_SCHEMA_VERSION) {
        return getTokenKeys(this.clientId, this.browserStorage, schemaVersion);
    }
    /**
     * Stores the token keys in the cache
     * @param tokenKeys
     * @param correlationId
     * @returns
     */
    setTokenKeys(tokenKeys, correlationId, schemaVersion = CREDENTIAL_SCHEMA_VERSION) {
        if (tokenKeys.idToken.length === 0 &&
            tokenKeys.accessToken.length === 0 &&
            tokenKeys.refreshToken.length === 0) {
            // If no keys left, remove the map
            this.removeItem(getTokenKeysCacheKey(this.clientId, schemaVersion));
            return;
        }
        else {
            this.setItem(getTokenKeysCacheKey(this.clientId, schemaVersion), JSON.stringify(tokenKeys), correlationId);
        }
    }
    /**
     * generates idToken entity from a string
     * @param idTokenKey
     */
    getIdTokenCredential(idTokenKey, correlationId) {
        const value = this.browserStorage.getUserData(idTokenKey);
        if (!value) {
            this.logger.trace("BrowserCacheManager.getIdTokenCredential: called, no cache hit");
            this.removeIdToken(idTokenKey, correlationId);
            return null;
        }
        const parsedIdToken = this.validateAndParseJson(value);
        if (!parsedIdToken || !isIdTokenEntity(parsedIdToken)) {
            this.logger.trace("BrowserCacheManager.getIdTokenCredential: called, no cache hit");
            return null;
        }
        this.logger.trace("BrowserCacheManager.getIdTokenCredential: cache hit");
        return parsedIdToken;
    }
    /**
     * set IdToken credential to the platform cache
     * @param idToken
     */
    async setIdTokenCredential(idToken, correlationId, kmsi) {
        this.logger.trace("BrowserCacheManager.setIdTokenCredential called");
        const idTokenKey = this.generateCredentialKey(idToken);
        const timestamp = Date.now().toString();
        idToken.lastUpdatedAt = timestamp;
        await this.setUserData(idTokenKey, JSON.stringify(idToken), correlationId, timestamp, kmsi);
        const tokenKeys = this.getTokenKeys();
        if (tokenKeys.idToken.indexOf(idTokenKey) === -1) {
            this.logger.info("BrowserCacheManager: addTokenKey - idToken added to map");
            tokenKeys.idToken.push(idTokenKey);
            this.setTokenKeys(tokenKeys, correlationId);
        }
    }
    /**
     * generates accessToken entity from a string
     * @param key
     */
    getAccessTokenCredential(accessTokenKey, correlationId) {
        const value = this.browserStorage.getUserData(accessTokenKey);
        if (!value) {
            this.logger.trace("BrowserCacheManager.getAccessTokenCredential: called, no cache hit");
            this.removeAccessTokenKeys([accessTokenKey], correlationId);
            return null;
        }
        const parsedAccessToken = this.validateAndParseJson(value);
        if (!parsedAccessToken ||
            !isAccessTokenEntity(parsedAccessToken)) {
            this.logger.trace("BrowserCacheManager.getAccessTokenCredential: called, no cache hit");
            return null;
        }
        this.logger.trace("BrowserCacheManager.getAccessTokenCredential: cache hit");
        return parsedAccessToken;
    }
    /**
     * set accessToken credential to the platform cache
     * @param accessToken
     */
    async setAccessTokenCredential(accessToken, correlationId, kmsi) {
        this.logger.trace("BrowserCacheManager.setAccessTokenCredential called");
        const accessTokenKey = this.generateCredentialKey(accessToken);
        const timestamp = Date.now().toString();
        accessToken.lastUpdatedAt = timestamp;
        await this.setUserData(accessTokenKey, JSON.stringify(accessToken), correlationId, timestamp, kmsi);
        const tokenKeys = this.getTokenKeys();
        const index = tokenKeys.accessToken.indexOf(accessTokenKey);
        if (index !== -1) {
            tokenKeys.accessToken.splice(index, 1); // Remove existing key before pushing to the end
        }
        this.logger.trace(`access token ${index === -1 ? "added to" : "updated in"} map`);
        tokenKeys.accessToken.push(accessTokenKey);
        this.setTokenKeys(tokenKeys, correlationId);
    }
    /**
     * generates refreshToken entity from a string
     * @param refreshTokenKey
     */
    getRefreshTokenCredential(refreshTokenKey, correlationId) {
        const value = this.browserStorage.getUserData(refreshTokenKey);
        if (!value) {
            this.logger.trace("BrowserCacheManager.getRefreshTokenCredential: called, no cache hit");
            this.removeRefreshToken(refreshTokenKey, correlationId);
            return null;
        }
        const parsedRefreshToken = this.validateAndParseJson(value);
        if (!parsedRefreshToken ||
            !isRefreshTokenEntity(parsedRefreshToken)) {
            this.logger.trace("BrowserCacheManager.getRefreshTokenCredential: called, no cache hit");
            return null;
        }
        this.logger.trace("BrowserCacheManager.getRefreshTokenCredential: cache hit");
        return parsedRefreshToken;
    }
    /**
     * set refreshToken credential to the platform cache
     * @param refreshToken
     */
    async setRefreshTokenCredential(refreshToken, correlationId, kmsi) {
        this.logger.trace("BrowserCacheManager.setRefreshTokenCredential called");
        const refreshTokenKey = this.generateCredentialKey(refreshToken);
        const timestamp = Date.now().toString();
        refreshToken.lastUpdatedAt = timestamp;
        await this.setUserData(refreshTokenKey, JSON.stringify(refreshToken), correlationId, timestamp, kmsi);
        const tokenKeys = this.getTokenKeys();
        if (tokenKeys.refreshToken.indexOf(refreshTokenKey) === -1) {
            this.logger.info("BrowserCacheManager: addTokenKey - refreshToken added to map");
            tokenKeys.refreshToken.push(refreshTokenKey);
            this.setTokenKeys(tokenKeys, correlationId);
        }
    }
    /**
     * fetch appMetadata entity from the platform cache
     * @param appMetadataKey
     */
    getAppMetadata(appMetadataKey) {
        const value = this.browserStorage.getItem(appMetadataKey);
        if (!value) {
            this.logger.trace("BrowserCacheManager.getAppMetadata: called, no cache hit");
            return null;
        }
        const parsedMetadata = this.validateAndParseJson(value);
        if (!parsedMetadata ||
            !isAppMetadataEntity(appMetadataKey, parsedMetadata)) {
            this.logger.trace("BrowserCacheManager.getAppMetadata: called, no cache hit");
            return null;
        }
        this.logger.trace("BrowserCacheManager.getAppMetadata: cache hit");
        return parsedMetadata;
    }
    /**
     * set appMetadata entity to the platform cache
     * @param appMetadata
     */
    setAppMetadata(appMetadata, correlationId) {
        this.logger.trace("BrowserCacheManager.setAppMetadata called");
        const appMetadataKey = generateAppMetadataKey(appMetadata);
        this.setItem(appMetadataKey, JSON.stringify(appMetadata), correlationId);
    }
    /**
     * fetch server telemetry entity from the platform cache
     * @param serverTelemetryKey
     */
    getServerTelemetry(serverTelemetryKey) {
        const value = this.browserStorage.getItem(serverTelemetryKey);
        if (!value) {
            this.logger.trace("BrowserCacheManager.getServerTelemetry: called, no cache hit");
            return null;
        }
        const parsedEntity = this.validateAndParseJson(value);
        if (!parsedEntity ||
            !isServerTelemetryEntity(serverTelemetryKey, parsedEntity)) {
            this.logger.trace("BrowserCacheManager.getServerTelemetry: called, no cache hit");
            return null;
        }
        this.logger.trace("BrowserCacheManager.getServerTelemetry: cache hit");
        return parsedEntity;
    }
    /**
     * set server telemetry entity to the platform cache
     * @param serverTelemetryKey
     * @param serverTelemetry
     */
    setServerTelemetry(serverTelemetryKey, serverTelemetry, correlationId) {
        this.logger.trace("BrowserCacheManager.setServerTelemetry called");
        this.setItem(serverTelemetryKey, JSON.stringify(serverTelemetry), correlationId);
    }
    /**
     *
     */
    getAuthorityMetadata(key) {
        const value = this.internalStorage.getItem(key);
        if (!value) {
            this.logger.trace("BrowserCacheManager.getAuthorityMetadata: called, no cache hit");
            return null;
        }
        const parsedMetadata = this.validateAndParseJson(value);
        if (parsedMetadata &&
            isAuthorityMetadataEntity(key, parsedMetadata)) {
            this.logger.trace("BrowserCacheManager.getAuthorityMetadata: cache hit");
            return parsedMetadata;
        }
        return null;
    }
    /**
     *
     */
    getAuthorityMetadataKeys() {
        const allKeys = this.internalStorage.getKeys();
        return allKeys.filter((key) => {
            return this.isAuthorityMetadata(key);
        });
    }
    /**
     * Sets wrapper metadata in memory
     * @param wrapperSKU
     * @param wrapperVersion
     */
    setWrapperMetadata(wrapperSKU, wrapperVersion) {
        this.internalStorage.setItem(InMemoryCacheKeys.WRAPPER_SKU, wrapperSKU);
        this.internalStorage.setItem(InMemoryCacheKeys.WRAPPER_VER, wrapperVersion);
    }
    /**
     * Returns wrapper metadata from in-memory storage
     */
    getWrapperMetadata() {
        const sku = this.internalStorage.getItem(InMemoryCacheKeys.WRAPPER_SKU) ||
            Constants.EMPTY_STRING;
        const version = this.internalStorage.getItem(InMemoryCacheKeys.WRAPPER_VER) ||
            Constants.EMPTY_STRING;
        return [sku, version];
    }
    /**
     *
     * @param entity
     */
    setAuthorityMetadata(key, entity) {
        this.logger.trace("BrowserCacheManager.setAuthorityMetadata called");
        this.internalStorage.setItem(key, JSON.stringify(entity));
    }
    /**
     * Gets the active account
     */
    getActiveAccount(correlationId) {
        const activeAccountKeyFilters = this.generateCacheKey(PersistentCacheKeys.ACTIVE_ACCOUNT_FILTERS);
        const activeAccountValueFilters = this.browserStorage.getItem(activeAccountKeyFilters);
        if (!activeAccountValueFilters) {
            this.logger.trace("BrowserCacheManager.getActiveAccount: No active account filters found");
            return null;
        }
        const activeAccountValueObj = this.validateAndParseJson(activeAccountValueFilters);
        if (activeAccountValueObj) {
            this.logger.trace("BrowserCacheManager.getActiveAccount: Active account filters schema found");
            return this.getAccountInfoFilteredBy({
                homeAccountId: activeAccountValueObj.homeAccountId,
                localAccountId: activeAccountValueObj.localAccountId,
                tenantId: activeAccountValueObj.tenantId,
            }, correlationId);
        }
        this.logger.trace("BrowserCacheManager.getActiveAccount: No active account found");
        return null;
    }
    /**
     * Sets the active account's localAccountId in cache
     * @param account
     */
    setActiveAccount(account, correlationId) {
        const activeAccountKey = this.generateCacheKey(PersistentCacheKeys.ACTIVE_ACCOUNT_FILTERS);
        if (account) {
            this.logger.verbose("setActiveAccount: Active account set");
            const activeAccountValue = {
                homeAccountId: account.homeAccountId,
                localAccountId: account.localAccountId,
                tenantId: account.tenantId,
                lastUpdatedAt: nowSeconds().toString(),
            };
            this.setItem(activeAccountKey, JSON.stringify(activeAccountValue), correlationId);
        }
        else {
            this.logger.verbose("setActiveAccount: No account passed, active account not set");
            this.browserStorage.removeItem(activeAccountKey);
        }
        this.eventHandler.emitEvent(EventType.ACTIVE_ACCOUNT_CHANGED);
    }
    /**
     * fetch throttling entity from the platform cache
     * @param throttlingCacheKey
     */
    getThrottlingCache(throttlingCacheKey) {
        const value = this.browserStorage.getItem(throttlingCacheKey);
        if (!value) {
            this.logger.trace("BrowserCacheManager.getThrottlingCache: called, no cache hit");
            return null;
        }
        const parsedThrottlingCache = this.validateAndParseJson(value);
        if (!parsedThrottlingCache ||
            !isThrottlingEntity(throttlingCacheKey, parsedThrottlingCache)) {
            this.logger.trace("BrowserCacheManager.getThrottlingCache: called, no cache hit");
            return null;
        }
        this.logger.trace("BrowserCacheManager.getThrottlingCache: cache hit");
        return parsedThrottlingCache;
    }
    /**
     * set throttling entity to the platform cache
     * @param throttlingCacheKey
     * @param throttlingCache
     */
    setThrottlingCache(throttlingCacheKey, throttlingCache, correlationId) {
        this.logger.trace("BrowserCacheManager.setThrottlingCache called");
        this.setItem(throttlingCacheKey, JSON.stringify(throttlingCache), correlationId);
    }
    /**
     * Gets cache item with given key.
     * Will retrieve from cookies if storeAuthStateInCookie is set to true.
     * @param key
     */
    getTemporaryCache(cacheKey, generateKey) {
        const key = generateKey ? this.generateCacheKey(cacheKey) : cacheKey;
        if (this.cacheConfig.storeAuthStateInCookie) {
            const itemCookie = this.cookieStorage.getItem(key);
            if (itemCookie) {
                this.logger.trace("BrowserCacheManager.getTemporaryCache: storeAuthStateInCookies set to true, retrieving from cookies");
                return itemCookie;
            }
        }
        const value = this.temporaryCacheStorage.getItem(key);
        if (!value) {
            // If temp cache item not found in session/memory, check local storage for items set by old versions
            if (this.cacheConfig.cacheLocation ===
                BrowserCacheLocation.LocalStorage) {
                const item = this.browserStorage.getItem(key);
                if (item) {
                    this.logger.trace("BrowserCacheManager.getTemporaryCache: Temporary cache item found in local storage");
                    return item;
                }
            }
            this.logger.trace("BrowserCacheManager.getTemporaryCache: No cache item found in local storage");
            return null;
        }
        this.logger.trace("BrowserCacheManager.getTemporaryCache: Temporary cache item returned");
        return value;
    }
    /**
     * Sets the cache item with the key and value given.
     * Stores in cookie if storeAuthStateInCookie is set to true.
     * This can cause cookie overflow if used incorrectly.
     * @param key
     * @param value
     */
    setTemporaryCache(cacheKey, value, generateKey) {
        const key = generateKey ? this.generateCacheKey(cacheKey) : cacheKey;
        this.temporaryCacheStorage.setItem(key, value);
        if (this.cacheConfig.storeAuthStateInCookie) {
            this.logger.trace("BrowserCacheManager.setTemporaryCache: storeAuthStateInCookie set to true, setting item cookie");
            this.cookieStorage.setItem(key, value, undefined, this.cacheConfig.secureCookies);
        }
    }
    /**
     * Removes the cache item with the given key.
     * @param key
     */
    removeItem(key) {
        this.browserStorage.removeItem(key);
    }
    /**
     * Removes the temporary cache item with the given key.
     * Will also clear the cookie item if storeAuthStateInCookie is set to true.
     * @param key
     */
    removeTemporaryItem(key) {
        this.temporaryCacheStorage.removeItem(key);
        if (this.cacheConfig.storeAuthStateInCookie) {
            this.logger.trace("BrowserCacheManager.removeItem: storeAuthStateInCookie is true, clearing item cookie");
            this.cookieStorage.removeItem(key);
        }
    }
    /**
     * Gets all keys in window.
     */
    getKeys() {
        return this.browserStorage.getKeys();
    }
    /**
     * Clears all cache entries created by MSAL.
     */
    clear(correlationId) {
        // Removes all accounts and their credentials
        this.removeAllAccounts(correlationId);
        this.removeAppMetadata(correlationId);
        // Remove temp storage first to make sure any cookies are cleared
        this.temporaryCacheStorage.getKeys().forEach((cacheKey) => {
            if (cacheKey.indexOf(PREFIX) !== -1 ||
                cacheKey.indexOf(this.clientId) !== -1) {
                this.removeTemporaryItem(cacheKey);
            }
        });
        // Removes all remaining MSAL cache items
        this.browserStorage.getKeys().forEach((cacheKey) => {
            if (cacheKey.indexOf(PREFIX) !== -1 ||
                cacheKey.indexOf(this.clientId) !== -1) {
                this.browserStorage.removeItem(cacheKey);
            }
        });
        this.internalStorage.clear();
    }
    /**
     * Clears all access tokes that have claims prior to saving the current one
     * @param performanceClient {IPerformanceClient}
     * @param correlationId {string} correlation id
     * @returns
     */
    clearTokensAndKeysWithClaims(correlationId) {
        this.performanceClient.addQueueMeasurement(PerformanceEvents.ClearTokensAndKeysWithClaims, correlationId);
        const tokenKeys = this.getTokenKeys();
        let removedAccessTokens = 0;
        tokenKeys.accessToken.forEach((key) => {
            // if the access token has claims in its key, remove the token key and the token
            const credential = this.getAccessTokenCredential(key, correlationId);
            if (credential?.requestedClaimsHash &&
                key.includes(credential.requestedClaimsHash.toLowerCase())) {
                this.removeAccessToken(key, correlationId);
                removedAccessTokens++;
            }
        });
        // warn if any access tokens are removed
        if (removedAccessTokens > 0) {
            this.logger.warning(`${removedAccessTokens} access tokens with claims in the cache keys have been removed from the cache.`);
        }
    }
    /**
     * Prepend msal.<client-id> to each key
     * @param key
     * @param addInstanceId
     */
    generateCacheKey(key) {
        if (StringUtils.startsWith(key, PREFIX)) {
            return key;
        }
        return `${PREFIX}.${this.clientId}.${key}`;
    }
    /**
     * Cache Key: msal.<schema_version>-<home_account_id>-<environment>-<credential_type>-<client_id or familyId>-<realm>-<scopes>-<claims hash>-<scheme>
     * IdToken Example: uid.utid-login.microsoftonline.com-idtoken-app_client_id-contoso.com
     * AccessToken Example: uid.utid-login.microsoftonline.com-accesstoken-app_client_id-contoso.com-scope1 scope2--pop
     * RefreshToken Example: uid.utid-login.microsoftonline.com-refreshtoken-1-contoso.com
     * @param credentialEntity
     * @returns
     */
    generateCredentialKey(credential) {
        const familyId = (credential.credentialType === CredentialType.REFRESH_TOKEN &&
            credential.familyId) ||
            credential.clientId;
        const scheme = credential.tokenType &&
            credential.tokenType.toLowerCase() !==
                AuthenticationScheme.BEARER.toLowerCase()
            ? credential.tokenType.toLowerCase()
            : "";
        const credentialKey = [
            `${PREFIX}.${CREDENTIAL_SCHEMA_VERSION}`,
            credential.homeAccountId,
            credential.environment,
            credential.credentialType,
            familyId,
            credential.realm || "",
            credential.target || "",
            credential.requestedClaimsHash || "",
            scheme,
        ];
        return credentialKey.join(CACHE_KEY_SEPARATOR).toLowerCase();
    }
    /**
     * Cache Key: msal.<schema_version>.<home_account_id>.<environment>.<tenant_id>
     * @param account
     * @returns
     */
    generateAccountKey(account) {
        const homeTenantId = account.homeAccountId.split(".")[1];
        const accountKey = [
            `${PREFIX}.${ACCOUNT_SCHEMA_VERSION}`,
            account.homeAccountId,
            account.environment,
            homeTenantId || account.tenantId || "",
        ];
        return accountKey.join(CACHE_KEY_SEPARATOR).toLowerCase();
    }
    /**
     * Reset all temporary cache items
     * @param state
     */
    resetRequestCache() {
        this.logger.trace("BrowserCacheManager.resetRequestCache called");
        this.removeTemporaryItem(this.generateCacheKey(TemporaryCacheKeys.REQUEST_PARAMS));
        this.removeTemporaryItem(this.generateCacheKey(TemporaryCacheKeys.VERIFIER));
        this.removeTemporaryItem(this.generateCacheKey(TemporaryCacheKeys.ORIGIN_URI));
        this.removeTemporaryItem(this.generateCacheKey(TemporaryCacheKeys.URL_HASH));
        this.removeTemporaryItem(this.generateCacheKey(TemporaryCacheKeys.NATIVE_REQUEST));
        this.setInteractionInProgress(false);
    }
    cacheAuthorizeRequest(authCodeRequest, codeVerifier) {
        this.logger.trace("BrowserCacheManager.cacheAuthorizeRequest called");
        const encodedValue = base64Encode(JSON.stringify(authCodeRequest));
        this.setTemporaryCache(TemporaryCacheKeys.REQUEST_PARAMS, encodedValue, true);
        if (codeVerifier) {
            const encodedVerifier = base64Encode(codeVerifier);
            this.setTemporaryCache(TemporaryCacheKeys.VERIFIER, encodedVerifier, true);
        }
    }
    /**
     * Gets the token exchange parameters from the cache. Throws an error if nothing is found.
     */
    getCachedRequest() {
        this.logger.trace("BrowserCacheManager.getCachedRequest called");
        // Get token request from cache and parse as TokenExchangeParameters.
        const encodedTokenRequest = this.getTemporaryCache(TemporaryCacheKeys.REQUEST_PARAMS, true);
        if (!encodedTokenRequest) {
            throw createBrowserAuthError(noTokenRequestCacheError);
        }
        const encodedVerifier = this.getTemporaryCache(TemporaryCacheKeys.VERIFIER, true);
        let parsedRequest;
        let verifier = "";
        try {
            parsedRequest = JSON.parse(base64Decode(encodedTokenRequest));
            if (encodedVerifier) {
                verifier = base64Decode(encodedVerifier);
            }
        }
        catch (e) {
            this.logger.errorPii(`Attempted to parse: ${encodedTokenRequest}`);
            this.logger.error(`Parsing cached token request threw with error: ${e}`);
            throw createBrowserAuthError(unableToParseTokenRequestCacheError);
        }
        return [parsedRequest, verifier];
    }
    /**
     * Gets cached native request for redirect flows
     */
    getCachedNativeRequest() {
        this.logger.trace("BrowserCacheManager.getCachedNativeRequest called");
        const cachedRequest = this.getTemporaryCache(TemporaryCacheKeys.NATIVE_REQUEST, true);
        if (!cachedRequest) {
            this.logger.trace("BrowserCacheManager.getCachedNativeRequest: No cached native request found");
            return null;
        }
        const parsedRequest = this.validateAndParseJson(cachedRequest);
        if (!parsedRequest) {
            this.logger.error("BrowserCacheManager.getCachedNativeRequest: Unable to parse native request");
            return null;
        }
        return parsedRequest;
    }
    isInteractionInProgress(matchClientId) {
        const clientId = this.getInteractionInProgress()?.clientId;
        if (matchClientId) {
            return clientId === this.clientId;
        }
        else {
            return !!clientId;
        }
    }
    getInteractionInProgress() {
        const key = `${PREFIX}.${TemporaryCacheKeys.INTERACTION_STATUS_KEY}`;
        const value = this.getTemporaryCache(key, false);
        try {
            return value ? JSON.parse(value) : null;
        }
        catch (e) {
            // Remove interaction and other temp keys if interaction status can't be parsed
            this.logger.error(`Cannot parse interaction status. Removing temporary cache items and clearing url hash. Retrying interaction should fix the error`);
            this.removeTemporaryItem(key);
            this.resetRequestCache();
            clearHash(window);
            return null;
        }
    }
    setInteractionInProgress(inProgress, type = INTERACTION_TYPE.SIGNIN) {
        // Ensure we don't overwrite interaction in progress for a different clientId
        const key = `${PREFIX}.${TemporaryCacheKeys.INTERACTION_STATUS_KEY}`;
        if (inProgress) {
            if (this.getInteractionInProgress()) {
                throw createBrowserAuthError(interactionInProgress);
            }
            else {
                // No interaction is in progress
                this.setTemporaryCache(key, JSON.stringify({ clientId: this.clientId, type }), false);
            }
        }
        else if (!inProgress &&
            this.getInteractionInProgress()?.clientId === this.clientId) {
            this.removeTemporaryItem(key);
        }
    }
    /**
     * Builds credential entities from AuthenticationResult object and saves the resulting credentials to the cache
     * @param result
     * @param request
     */
    async hydrateCache(result, request) {
        const idTokenEntity = createIdTokenEntity(result.account?.homeAccountId, result.account?.environment, result.idToken, this.clientId, result.tenantId);
        let claimsHash;
        if (request.claims) {
            claimsHash = await this.cryptoImpl.hashString(request.claims);
        }
        /**
         * meta data for cache stores time in seconds from epoch
         * AuthenticationResult returns expiresOn and extExpiresOn in milliseconds (as a Date object which is in ms)
         * We need to map these for the cache when building tokens from AuthenticationResult
         *
         * The next MSAL VFuture should map these both to same value if possible
         */
        const accessTokenEntity = createAccessTokenEntity(result.account?.homeAccountId, result.account.environment, result.accessToken, this.clientId, result.tenantId, result.scopes.join(" "), 
        // Access token expiresOn stored in seconds, converting from AuthenticationResult expiresOn stored as Date
        result.expiresOn
            ? toSecondsFromDate(result.expiresOn)
            : 0, result.extExpiresOn
            ? toSecondsFromDate(result.extExpiresOn)
            : 0, base64Decode, undefined, // refreshOn
        result.tokenType, undefined, // userAssertionHash
        request.sshKid, request.claims, claimsHash);
        const cacheRecord = {
            idToken: idTokenEntity,
            accessToken: accessTokenEntity,
        };
        return this.saveCacheRecord(cacheRecord, result.correlationId, isKmsi(extractTokenClaims(result.idToken, base64Decode)));
    }
    /**
     * saves a cache record
     * @param cacheRecord {CacheRecord}
     * @param storeInCache {?StoreInCache}
     * @param correlationId {?string} correlation id
     */
    async saveCacheRecord(cacheRecord, correlationId, kmsi, storeInCache) {
        try {
            await super.saveCacheRecord(cacheRecord, correlationId, kmsi, storeInCache);
        }
        catch (e) {
            if (e instanceof CacheError &&
                this.performanceClient &&
                correlationId) {
                try {
                    const tokenKeys = this.getTokenKeys();
                    this.performanceClient.addFields({
                        cacheRtCount: tokenKeys.refreshToken.length,
                        cacheIdCount: tokenKeys.idToken.length,
                        cacheAtCount: tokenKeys.accessToken.length,
                    }, correlationId);
                }
                catch (e) { }
            }
            throw e;
        }
    }
}
/**
 * Returns a window storage class implementing the IWindowStorage interface that corresponds to the configured cacheLocation.
 * @param cacheLocation
 */
function getStorageImplementation(clientId, cacheLocation, logger, performanceClient) {
    try {
        switch (cacheLocation) {
            case BrowserCacheLocation.LocalStorage:
                return new LocalStorage(clientId, logger, performanceClient);
            case BrowserCacheLocation.SessionStorage:
                return new SessionStorage();
            case BrowserCacheLocation.MemoryStorage:
            default:
                break;
        }
    }
    catch (e) {
        logger.error(e);
    }
    return new MemoryStorage();
}
const DEFAULT_BROWSER_CACHE_MANAGER = (clientId, logger, performanceClient, eventHandler) => {
    const cacheOptions = {
        cacheLocation: BrowserCacheLocation.MemoryStorage,
        cacheRetentionDays: 5,
        temporaryCacheLocation: BrowserCacheLocation.MemoryStorage,
        storeAuthStateInCookie: false,
        secureCookies: false,
        cacheMigrationEnabled: false,
        claimsBasedCachingEnabled: false,
    };
    return new BrowserCacheManager(clientId, cacheOptions, DEFAULT_CRYPTO_IMPLEMENTATION, logger, performanceClient, eventHandler);
};

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Returns all the accounts in the cache that match the optional filter. If no filter is provided, all accounts are returned.
 * @param accountFilter - (Optional) filter to narrow down the accounts returned
 * @returns Array of AccountInfo objects in cache
 */
function getAllAccounts(logger, browserStorage, isInBrowser, correlationId, accountFilter) {
    logger.verbose("getAllAccounts called");
    return isInBrowser
        ? browserStorage.getAllAccounts(accountFilter || {}, correlationId)
        : [];
}
/**
 * Returns the first account found in the cache that matches the account filter passed in.
 * @param accountFilter
 * @returns The first account found in the cache matching the provided filter or null if no account could be found.
 */
function getAccount(accountFilter, logger, browserStorage, correlationId) {
    const account = browserStorage.getAccountInfoFilteredBy(accountFilter, correlationId);
    if (account) {
        logger.verbose("getAccount: Account matching provided filter found, returning");
        return account;
    }
    else {
        logger.verbose("getAccount: No matching account found, returning null");
        return null;
    }
}
/**
 * Returns the signed in account matching username.
 * (the account object is created at the time of successful login)
 * or null when no matching account is found.
 * This API is provided for convenience but getAccountById should be used for best reliability
 * @param username
 * @returns The account object stored in MSAL
 */
function getAccountByUsername(username, logger, browserStorage, correlationId) {
    logger.trace("getAccountByUsername called");
    if (!username) {
        logger.warning("getAccountByUsername: No username provided");
        return null;
    }
    const account = browserStorage.getAccountInfoFilteredBy({
        username,
    }, correlationId);
    if (account) {
        logger.verbose("getAccountByUsername: Account matching username found, returning");
        logger.verbosePii(`getAccountByUsername: Returning signed-in accounts matching username: ${username}`);
        return account;
    }
    else {
        logger.verbose("getAccountByUsername: No matching account found, returning null");
        return null;
    }
}
/**
 * Returns the signed in account matching homeAccountId.
 * (the account object is created at the time of successful login)
 * or null when no matching account is found
 * @param homeAccountId
 * @returns The account object stored in MSAL
 */
function getAccountByHomeId(homeAccountId, logger, browserStorage, correlationId) {
    logger.trace("getAccountByHomeId called");
    if (!homeAccountId) {
        logger.warning("getAccountByHomeId: No homeAccountId provided");
        return null;
    }
    const account = browserStorage.getAccountInfoFilteredBy({
        homeAccountId,
    }, correlationId);
    if (account) {
        logger.verbose("getAccountByHomeId: Account matching homeAccountId found, returning");
        logger.verbosePii(`getAccountByHomeId: Returning signed-in accounts matching homeAccountId: ${homeAccountId}`);
        return account;
    }
    else {
        logger.verbose("getAccountByHomeId: No matching account found, returning null");
        return null;
    }
}
/**
 * Returns the signed in account matching localAccountId.
 * (the account object is created at the time of successful login)
 * or null when no matching account is found
 * @param localAccountId
 * @returns The account object stored in MSAL
 */
function getAccountByLocalId(localAccountId, logger, browserStorage, correlationId) {
    logger.trace("getAccountByLocalId called");
    if (!localAccountId) {
        logger.warning("getAccountByLocalId: No localAccountId provided");
        return null;
    }
    const account = browserStorage.getAccountInfoFilteredBy({
        localAccountId,
    }, correlationId);
    if (account) {
        logger.verbose("getAccountByLocalId: Account matching localAccountId found, returning");
        logger.verbosePii(`getAccountByLocalId: Returning signed-in accounts matching localAccountId: ${localAccountId}`);
        return account;
    }
    else {
        logger.verbose("getAccountByLocalId: No matching account found, returning null");
        return null;
    }
}
/**
 * Sets the account to use as the active account. If no account is passed to the acquireToken APIs, then MSAL will use this active account.
 * @param account
 */
function setActiveAccount(account, browserStorage, correlationId) {
    browserStorage.setActiveAccount(account, correlationId);
}
/**
 * Gets the currently active account
 */
function getActiveAccount(browserStorage, correlationId) {
    return browserStorage.getActiveAccount(correlationId);
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const BROADCAST_CHANNEL_NAME = "msal.broadcast.event";
class EventHandler {
    constructor(logger) {
        this.eventCallbacks = new Map();
        this.logger = logger || new Logger({});
        if (typeof BroadcastChannel !== "undefined") {
            this.broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        }
        this.invokeCrossTabCallbacks = this.invokeCrossTabCallbacks.bind(this);
    }
    /**
     * Adds event callbacks to array
     * @param callback - callback to be invoked when an event is raised
     * @param eventTypes - list of events that this callback will be invoked for, if not provided callback will be invoked for all events
     * @param callbackId - Identifier for the callback, used to locate and remove the callback when no longer required
     */
    addEventCallback(callback, eventTypes, callbackId) {
        if (typeof window !== "undefined") {
            const id = callbackId || createGuid();
            if (this.eventCallbacks.has(id)) {
                this.logger.error(`Event callback with id: ${id} is already registered. Please provide a unique id or remove the existing callback and try again.`);
                return null;
            }
            this.eventCallbacks.set(id, [callback, eventTypes || []]);
            this.logger.verbose(`Event callback registered with id: ${id}`);
            return id;
        }
        return null;
    }
    /**
     * Removes callback with provided id from callback array
     * @param callbackId
     */
    removeEventCallback(callbackId) {
        this.eventCallbacks.delete(callbackId);
        this.logger.verbose(`Event callback ${callbackId} removed.`);
    }
    /**
     * Emits events by calling callback with event message
     * @param eventType
     * @param interactionType
     * @param payload
     * @param error
     */
    emitEvent(eventType, interactionType, payload, error) {
        const message = {
            eventType: eventType,
            interactionType: interactionType || null,
            payload: payload || null,
            error: error || null,
            timestamp: Date.now(),
        };
        switch (eventType) {
            case EventType.ACCOUNT_ADDED:
            case EventType.ACCOUNT_REMOVED:
            case EventType.ACTIVE_ACCOUNT_CHANGED:
                // Send event to other open tabs / MSAL instances on same domain
                this.broadcastChannel?.postMessage(message);
                break;
            default:
                // Emit event to callbacks registered in this instance
                this.invokeCallbacks(message);
                break;
        }
    }
    /**
     * Invoke registered callbacks
     * @param message
     */
    invokeCallbacks(message) {
        this.eventCallbacks.forEach(([callback, eventTypes], callbackId) => {
            if (eventTypes.length === 0 ||
                eventTypes.includes(message.eventType)) {
                this.logger.verbose(`Emitting event to callback ${callbackId}: ${message.eventType}`);
                callback.apply(null, [message]);
            }
        });
    }
    /**
     * Wrapper around invokeCallbacks to handle broadcast events received from other tabs/instances
     * @param event
     */
    invokeCrossTabCallbacks(event) {
        const message = event.data;
        this.invokeCallbacks(message);
    }
    /**
     * Listen for events broadcasted from other tabs/instances
     */
    subscribeCrossTab() {
        this.broadcastChannel?.addEventListener("message", this.invokeCrossTabCallbacks);
    }
    /**
     * Unsubscribe from broadcast events
     */
    unsubscribeCrossTab() {
        this.broadcastChannel?.removeEventListener("message", this.invokeCrossTabCallbacks);
    }
}

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
        const discoveredAuthority = await invokeAsync(createDiscoveredInstance, PerformanceEvents.AuthorityFactoryCreateDiscoveredInstance, this.logger, this.performanceClient, this.correlationId)(builtAuthority, this.config.system.networkClient, this.browserStorage, authorityOptions, this.logger, this.correlationId, this.performanceClient);
        if (account && !discoveredAuthority.isAlias(account.environment)) {
            throw createClientConfigurationError(authorityMismatch);
        }
        return discoveredAuthority;
    }
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Initializer function for all request APIs
 * @param request
 */
async function initializeBaseRequest(request, config, performanceClient, logger) {
    performanceClient.addQueueMeasurement(PerformanceEvents.InitializeBaseRequest, request.correlationId);
    const authority = request.authority || config.auth.authority;
    const scopes = [...((request && request.scopes) || [])];
    const validatedRequest = {
        ...request,
        correlationId: request.correlationId,
        authority,
        scopes,
    };
    // Set authenticationScheme to BEARER if not explicitly set in the request
    if (!validatedRequest.authenticationScheme) {
        validatedRequest.authenticationScheme = AuthenticationScheme.BEARER;
        logger.verbose('Authentication Scheme wasn\'t explicitly set in request, defaulting to "Bearer" request');
    }
    else {
        if (validatedRequest.authenticationScheme === AuthenticationScheme.SSH) {
            if (!request.sshJwk) {
                throw createClientConfigurationError(missingSshJwk);
            }
            if (!request.sshKid) {
                throw createClientConfigurationError(missingSshKid);
            }
        }
        logger.verbose(`Authentication Scheme set to "${validatedRequest.authenticationScheme}" as configured in Auth request`);
    }
    // Set requested claims hash if claims-based caching is enabled and claims were requested
    if (config.cache.claimsBasedCachingEnabled &&
        request.claims &&
        // Checks for empty stringified object "{}" which doesn't qualify as requested claims
        !StringUtils.isEmptyObj(request.claims)) {
        validatedRequest.requestedClaimsHash = await hashString(request.claims);
    }
    return validatedRequest;
}
async function initializeSilentRequest(request, account, config, performanceClient, logger) {
    performanceClient.addQueueMeasurement(PerformanceEvents.InitializeSilentRequest, request.correlationId);
    const baseRequest = await invokeAsync(initializeBaseRequest, PerformanceEvents.InitializeBaseRequest, logger, performanceClient, request.correlationId)(request, config, performanceClient, logger);
    return {
        ...request,
        ...baseRequest,
        account: account,
        forceRefresh: request.forceRefresh || false,
    };
}
/**
 * Validates that the combination of request method, protocol mode and authorize body parameters is correct.
 * Returns the validated or defaulted HTTP method or throws if the configured combination is invalid.
 * @param interactionRequest
 * @param protocolMode
 * @returns
 */
function validateRequestMethod(interactionRequest, protocolMode) {
    let httpMethod;
    const requestMethod = interactionRequest.httpMethod;
    if (protocolMode === ProtocolMode.EAR) {
        // Don't override httpMethod if it is already set, default to POST if not set
        httpMethod = requestMethod || HttpMethod.POST;
        // Validate that method is not GET if protocol mode is EAR
        if (httpMethod !== HttpMethod.POST) {
            throw createClientConfigurationError(invalidRequestMethodForEAR);
        }
    }
    else {
        // For non-EAR protocol modes, default to GET if httpMethod is not set
        httpMethod = requestMethod || HttpMethod.GET;
    }
    // Regardless of protocolMode, if there are authorizePostBodyParameters, validate the request method is POST
    if (interactionRequest.authorizePostBodyParameters &&
        httpMethod !== HttpMethod.POST) {
        throw createClientConfigurationError(invalidAuthorizePostBodyParameters);
    }
    return httpMethod;
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Defines the class structure and helper functions used by the "standard", non-brokered auth flows (popup, redirect, silent (RT), silent (iframe))
 */
class StandardInteractionClient extends BaseInteractionClient {
    /**
     * Initializer for the logout request.
     * @param logoutRequest
     */
    initializeLogoutRequest(logoutRequest) {
        this.logger.verbose("initializeLogoutRequest called", logoutRequest?.correlationId);
        const validLogoutRequest = {
            correlationId: this.correlationId || createNewGuid(),
            ...logoutRequest,
        };
        /**
         * Set logout_hint to be login_hint from ID Token Claims if present
         * and logoutHint attribute wasn't manually set in logout request
         */
        if (logoutRequest) {
            // If logoutHint isn't set and an account was passed in, try to extract logoutHint from ID Token Claims
            if (!logoutRequest.logoutHint) {
                if (logoutRequest.account) {
                    const logoutHint = this.getLogoutHintFromIdTokenClaims(logoutRequest.account);
                    if (logoutHint) {
                        this.logger.verbose("Setting logoutHint to login_hint ID Token Claim value for the account provided");
                        validLogoutRequest.logoutHint = logoutHint;
                    }
                }
                else {
                    this.logger.verbose("logoutHint was not set and account was not passed into logout request, logoutHint will not be set");
                }
            }
            else {
                this.logger.verbose("logoutHint has already been set in logoutRequest");
            }
        }
        else {
            this.logger.verbose("logoutHint will not be set since no logout request was configured");
        }
        /*
         * Only set redirect uri if logout request isn't provided or the set uri isn't null.
         * Otherwise, use passed uri, config, or current page.
         */
        if (!logoutRequest || logoutRequest.postLogoutRedirectUri !== null) {
            if (logoutRequest && logoutRequest.postLogoutRedirectUri) {
                this.logger.verbose("Setting postLogoutRedirectUri to uri set on logout request", validLogoutRequest.correlationId);
                validLogoutRequest.postLogoutRedirectUri =
                    UrlString.getAbsoluteUrl(logoutRequest.postLogoutRedirectUri, getCurrentUri());
            }
            else if (this.config.auth.postLogoutRedirectUri === null) {
                this.logger.verbose("postLogoutRedirectUri configured as null and no uri set on request, not passing post logout redirect", validLogoutRequest.correlationId);
            }
            else if (this.config.auth.postLogoutRedirectUri) {
                this.logger.verbose("Setting postLogoutRedirectUri to configured uri", validLogoutRequest.correlationId);
                validLogoutRequest.postLogoutRedirectUri =
                    UrlString.getAbsoluteUrl(this.config.auth.postLogoutRedirectUri, getCurrentUri());
            }
            else {
                this.logger.verbose("Setting postLogoutRedirectUri to current page", validLogoutRequest.correlationId);
                validLogoutRequest.postLogoutRedirectUri =
                    UrlString.getAbsoluteUrl(getCurrentUri(), getCurrentUri());
            }
        }
        else {
            this.logger.verbose("postLogoutRedirectUri passed as null, not setting post logout redirect uri", validLogoutRequest.correlationId);
        }
        return validLogoutRequest;
    }
    /**
     * Parses login_hint ID Token Claim out of AccountInfo object to be used as
     * logout_hint in end session request.
     * @param account
     */
    getLogoutHintFromIdTokenClaims(account) {
        const idTokenClaims = account.idTokenClaims;
        if (idTokenClaims) {
            if (idTokenClaims.login_hint) {
                return idTokenClaims.login_hint;
            }
            else {
                this.logger.verbose("The ID Token Claims tied to the provided account do not contain a login_hint claim, logoutHint will not be added to logout request");
            }
        }
        else {
            this.logger.verbose("The provided account does not contain ID Token Claims, logoutHint will not be added to logout request");
        }
        return null;
    }
    /**
     * Creates an Authorization Code Client with the given authority, or the default authority.
     * @param params {
     *         serverTelemetryManager: ServerTelemetryManager;
     *         authorityUrl?: string;
     *         requestAzureCloudOptions?: AzureCloudOptions;
     *         requestExtraQueryParameters?: StringDict;
     *         account?: AccountInfo;
     *        }
     */
    async createAuthCodeClient(params) {
        this.performanceClient.addQueueMeasurement(PerformanceEvents.StandardInteractionClientCreateAuthCodeClient, this.correlationId);
        // Create auth module.
        const clientConfig = await invokeAsync(this.getClientConfiguration.bind(this), PerformanceEvents.StandardInteractionClientGetClientConfiguration, this.logger, this.performanceClient, this.correlationId)(params);
        return new AuthorizationCodeClient(clientConfig, this.performanceClient);
    }
    /**
     * Creates a Client Configuration object with the given request authority, or the default authority.
     * @param params {
     *         serverTelemetryManager: ServerTelemetryManager;
     *         requestAuthority?: string;
     *         requestAzureCloudOptions?: AzureCloudOptions;
     *         requestExtraQueryParameters?: boolean;
     *         account?: AccountInfo;
     *        }
     */
    async getClientConfiguration(params) {
        const { serverTelemetryManager, requestAuthority, requestAzureCloudOptions, requestExtraQueryParameters, account, } = params;
        this.performanceClient.addQueueMeasurement(PerformanceEvents.StandardInteractionClientGetClientConfiguration, this.correlationId);
        const discoveredAuthority = params.authority ||
            (await invokeAsync(this.getDiscoveredAuthority.bind(this), PerformanceEvents.StandardInteractionClientGetDiscoveredAuthority, this.logger, this.performanceClient, this.correlationId)({
                requestAuthority,
                requestAzureCloudOptions,
                requestExtraQueryParameters,
                account,
            }));
        const logger = this.config.system.loggerOptions;
        return {
            authOptions: {
                clientId: this.config.auth.clientId,
                authority: discoveredAuthority,
                clientCapabilities: this.config.auth.clientCapabilities,
                redirectUri: this.config.auth.redirectUri,
            },
            systemOptions: {
                tokenRenewalOffsetSeconds: this.config.system.tokenRenewalOffsetSeconds,
                preventCorsPreflight: true,
            },
            loggerOptions: {
                loggerCallback: logger.loggerCallback,
                piiLoggingEnabled: logger.piiLoggingEnabled,
                logLevel: logger.logLevel,
                correlationId: this.correlationId,
            },
            cacheOptions: {
                claimsBasedCachingEnabled: this.config.cache.claimsBasedCachingEnabled,
            },
            cryptoInterface: this.browserCrypto,
            networkInterface: this.networkClient,
            storageInterface: this.browserStorage,
            serverTelemetryManager: serverTelemetryManager,
            libraryInfo: {
                sku: BrowserConstants.MSAL_SKU,
                version: version,
                cpu: Constants.EMPTY_STRING,
                os: Constants.EMPTY_STRING,
            },
            telemetry: this.config.telemetry,
        };
    }
    /**
     * Helper to initialize required request parameters for interactive APIs and ssoSilent()
     * @param request
     * @param interactionType
     */
    async initializeAuthorizationRequest(request, interactionType) {
        this.performanceClient.addQueueMeasurement(PerformanceEvents.StandardInteractionClientInitializeAuthorizationRequest, this.correlationId);
        const redirectUri = this.getRedirectUri(request.redirectUri);
        const browserState = {
            interactionType: interactionType,
        };
        const state = ProtocolUtils.setRequestState(this.browserCrypto, (request && request.state) || Constants.EMPTY_STRING, browserState);
        const baseRequest = await invokeAsync(initializeBaseRequest, PerformanceEvents.InitializeBaseRequest, this.logger, this.performanceClient, this.correlationId)({ ...request, correlationId: this.correlationId }, this.config, this.performanceClient, this.logger);
        const interactionRequest = {
            ...baseRequest,
            redirectUri: redirectUri,
            state: state,
            nonce: request.nonce || createNewGuid(),
            responseMode: this.config.auth.OIDCOptions
                .serverResponseType,
        };
        const validatedRequest = {
            ...interactionRequest,
            httpMethod: validateRequestMethod(interactionRequest, this.config.auth.protocolMode),
        };
        // Skip active account lookup if either login hint or session id is set
        if (request.loginHint || request.sid) {
            return validatedRequest;
        }
        const account = request.account ||
            this.browserStorage.getActiveAccount(this.correlationId);
        if (account) {
            this.logger.verbose("Setting validated request account", this.correlationId);
            this.logger.verbosePii(`Setting validated request account: ${account.homeAccountId}`, this.correlationId);
            validatedRequest.account = account;
        }
        return validatedRequest;
    }
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Extracts the BrowserStateObject from the state string.
 * @param browserCrypto
 * @param state
 */
function extractBrowserRequestState(browserCrypto, state) {
    if (!state) {
        return null;
    }
    try {
        const requestStateObj = ProtocolUtils.parseRequestState(browserCrypto, state);
        return requestStateObj.libraryState.meta;
    }
    catch (e) {
        throw createClientAuthError(invalidState);
    }
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
function deserializeResponse(responseString, responseLocation, logger) {
    // Deserialize hash fragment response parameters.
    const serverParams = getDeserializedResponse(responseString);
    if (!serverParams) {
        if (!stripLeadingHashOrQuery(responseString)) {
            // Hash or Query string is empty
            logger.error(`The request has returned to the redirectUri but a ${responseLocation} is not present. It's likely that the ${responseLocation} has been removed or the page has been redirected by code running on the redirectUri page.`);
            throw createBrowserAuthError(hashEmptyError);
        }
        else {
            logger.error(`A ${responseLocation} is present in the iframe but it does not contain known properties. It's likely that the ${responseLocation} has been replaced by code running on the redirectUri page.`);
            logger.errorPii(`The ${responseLocation} detected is: ${responseString}`);
            throw createBrowserAuthError(hashDoesNotContainKnownProperties);
        }
    }
    return serverParams;
}
/**
 * Returns the interaction type that the response object belongs to
 */
function validateInteractionType(response, browserCrypto, interactionType) {
    if (!response.state) {
        throw createBrowserAuthError(noStateInHash);
    }
    const platformStateObj = extractBrowserRequestState(browserCrypto, response.state);
    if (!platformStateObj) {
        throw createBrowserAuthError(unableToParseState);
    }
    if (platformStateObj.interactionType !== interactionType) {
        throw createBrowserAuthError(stateInteractionTypeMismatch);
    }
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Abstract class which defines operations for a browser interaction handling class.
 */
class InteractionHandler {
    constructor(authCodeModule, storageImpl, authCodeRequest, logger, performanceClient) {
        this.authModule = authCodeModule;
        this.browserStorage = storageImpl;
        this.authCodeRequest = authCodeRequest;
        this.logger = logger;
        this.performanceClient = performanceClient;
    }
    /**
     * Function to handle response parameters from hash.
     * @param locationHash
     */
    async handleCodeResponse(response, request) {
        this.performanceClient.addQueueMeasurement(PerformanceEvents.HandleCodeResponse, request.correlationId);
        let authCodeResponse;
        try {
            authCodeResponse = getAuthorizationCodePayload(response, request.state);
        }
        catch (e) {
            if (e instanceof ServerError &&
                e.subError === userCancelled) {
                // Translate server error caused by user closing native prompt to corresponding first class MSAL error
                throw createBrowserAuthError(userCancelled);
            }
            else {
                throw e;
            }
        }
        return invokeAsync(this.handleCodeResponseFromServer.bind(this), PerformanceEvents.HandleCodeResponseFromServer, this.logger, this.performanceClient, request.correlationId)(authCodeResponse, request);
    }
    /**
     * Process auth code response from AAD
     * @param authCodeResponse
     * @param state
     * @param authority
     * @param networkModule
     * @returns
     */
    async handleCodeResponseFromServer(authCodeResponse, request, validateNonce = true) {
        this.performanceClient.addQueueMeasurement(PerformanceEvents.HandleCodeResponseFromServer, request.correlationId);
        this.logger.trace("InteractionHandler.handleCodeResponseFromServer called");
        // Assign code to request
        this.authCodeRequest.code = authCodeResponse.code;
        // Check for new cloud instance
        if (authCodeResponse.cloud_instance_host_name) {
            await invokeAsync(this.authModule.updateAuthority.bind(this.authModule), PerformanceEvents.UpdateTokenEndpointAuthority, this.logger, this.performanceClient, request.correlationId)(authCodeResponse.cloud_instance_host_name, request.correlationId);
        }
        // Nonce validation not needed when redirect not involved (e.g. hybrid spa, renewing token via rt)
        if (validateNonce) {
            // TODO: Assigning "response nonce" to "request nonce" is confusing. Refactor the function doing validation to accept request nonce directly
            authCodeResponse.nonce = request.nonce || undefined;
        }
        authCodeResponse.state = request.state;
        // Add CCS parameters if available
        if (authCodeResponse.client_info) {
            this.authCodeRequest.clientInfo = authCodeResponse.client_info;
        }
        else {
            const ccsCred = this.createCcsCredentials(request);
            if (ccsCred) {
                this.authCodeRequest.ccsCredential = ccsCred;
            }
        }
        // Acquire token with retrieved code.
        const tokenResponse = (await invokeAsync(this.authModule.acquireToken.bind(this.authModule), PerformanceEvents.AuthClientAcquireToken, this.logger, this.performanceClient, request.correlationId)(this.authCodeRequest, authCodeResponse));
        return tokenResponse;
    }
    /**
     * Build ccs creds if available
     */
    createCcsCredentials(request) {
        if (request.account) {
            return {
                credential: request.account.homeAccountId,
                type: CcsCredentialType.HOME_ACCOUNT_ID,
            };
        }
        else if (request.loginHint) {
            return {
                credential: request.loginHint,
                type: CcsCredentialType.UPN,
            };
        }
        return null;
    }
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const contentError = "ContentError";
const pageException = "PageException";
const userSwitch = "user_switch";

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
// Status Codes that can be thrown by WAM
const USER_INTERACTION_REQUIRED = "USER_INTERACTION_REQUIRED";
const USER_CANCEL = "USER_CANCEL";
const NO_NETWORK = "NO_NETWORK";
const DISABLED = "DISABLED";
const ACCOUNT_UNAVAILABLE = "ACCOUNT_UNAVAILABLE";
const UX_NOT_ALLOWED = "UX_NOT_ALLOWED";

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const INVALID_METHOD_ERROR = -2147186943;
const NativeAuthErrorMessages = {
    [userSwitch]: "User attempted to switch accounts in the native broker, which is not allowed. All new accounts must sign-in through the standard web flow first, please try again.",
};
class NativeAuthError extends AuthError {
    constructor(errorCode, description, ext) {
        super(errorCode, description);
        Object.setPrototypeOf(this, NativeAuthError.prototype);
        this.name = "NativeAuthError";
        this.ext = ext;
    }
}
/**
 * These errors should result in a fallback to the 'standard' browser based auth flow.
 */
function isFatalNativeAuthError(error) {
    if (error.ext &&
        error.ext.status &&
        error.ext.status === DISABLED) {
        return true;
    }
    if (error.ext &&
        error.ext.error &&
        error.ext.error === INVALID_METHOD_ERROR) {
        return true;
    }
    switch (error.errorCode) {
        case contentError:
        case pageException:
            return true;
        default:
            return false;
    }
}
/**
 * Create the appropriate error object based on the WAM status code.
 * @param code
 * @param description
 * @param ext
 * @returns
 */
function createNativeAuthError(code, description, ext) {
    if (ext && ext.status) {
        switch (ext.status) {
            case ACCOUNT_UNAVAILABLE:
                return createInteractionRequiredAuthError(nativeAccountUnavailable);
            case USER_INTERACTION_REQUIRED:
                return new InteractionRequiredAuthError(code, description);
            case USER_CANCEL:
                return createBrowserAuthError(userCancelled);
            case NO_NETWORK:
                return createBrowserAuthError(noNetworkConnectivity);
            case UX_NOT_ALLOWED:
                return createInteractionRequiredAuthError(uxNotAllowed);
        }
    }
    return new NativeAuthError(code, NativeAuthErrorMessages[code] || description, ext);
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
class SilentCacheClient extends StandardInteractionClient {
    /**
     * Returns unexpired tokens from the cache, if available
     * @param silentRequest
     */
    async acquireToken(silentRequest) {
        this.performanceClient.addQueueMeasurement(PerformanceEvents.SilentCacheClientAcquireToken, silentRequest.correlationId);
        // Telemetry manager only used to increment cacheHits here
        const serverTelemetryManager = this.initializeServerTelemetryManager(ApiId.acquireTokenSilent_silentFlow);
        const clientConfig = await invokeAsync(this.getClientConfiguration.bind(this), PerformanceEvents.StandardInteractionClientGetClientConfiguration, this.logger, this.performanceClient, this.correlationId)({
            serverTelemetryManager,
            requestAuthority: silentRequest.authority,
            requestAzureCloudOptions: silentRequest.azureCloudOptions,
            account: silentRequest.account,
        });
        const silentAuthClient = new SilentFlowClient(clientConfig, this.performanceClient);
        this.logger.verbose("Silent auth client created");
        try {
            const response = await invokeAsync(silentAuthClient.acquireCachedToken.bind(silentAuthClient), PerformanceEvents.SilentFlowClientAcquireCachedToken, this.logger, this.performanceClient, silentRequest.correlationId)(silentRequest);
            const authResponse = response[0];
            this.performanceClient.addFields({
                fromCache: true,
            }, silentRequest.correlationId);
            return authResponse;
        }
        catch (error) {
            if (error instanceof BrowserAuthError &&
                error.errorCode === cryptoKeyNotFound) {
                this.logger.verbose("Signing keypair for bound access token not found. Refreshing bound access token and generating a new crypto keypair.");
            }
            throw error;
        }
    }
    /**
     * API to silenty clear the browser cache.
     * @param logoutRequest
     */
    logout(logoutRequest) {
        this.logger.verbose("logoutRedirect called");
        const validLogoutRequest = this.initializeLogoutRequest(logoutRequest);
        return this.clearCacheOnLogout(validLogoutRequest.correlationId, validLogoutRequest?.account);
    }
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
class PlatformAuthInteractionClient extends BaseInteractionClient {
    constructor(config, browserStorage, browserCrypto, logger, eventHandler, navigationClient, apiId, performanceClient, provider, accountId, nativeStorageImpl, correlationId) {
        super(config, browserStorage, browserCrypto, logger, eventHandler, navigationClient, performanceClient, provider, correlationId);
        this.apiId = apiId;
        this.accountId = accountId;
        this.platformAuthProvider = provider;
        this.nativeStorageManager = nativeStorageImpl;
        this.silentCacheClient = new SilentCacheClient(config, this.nativeStorageManager, browserCrypto, logger, eventHandler, navigationClient, performanceClient, provider, correlationId);
        const extensionName = this.platformAuthProvider.getExtensionName();
        this.skus = ServerTelemetryManager.makeExtraSkuString({
            libraryName: BrowserConstants.MSAL_SKU,
            libraryVersion: version,
            extensionName: extensionName,
            extensionVersion: this.platformAuthProvider.getExtensionVersion(),
        });
    }
    /**
     * Adds SKUs to request extra query parameters
     * @param request {PlatformAuthRequest}
     * @private
     */
    addRequestSKUs(request) {
        request.extraParameters = {
            ...request.extraParameters,
            [X_CLIENT_EXTRA_SKU]: this.skus,
        };
    }
    /**
     * Acquire token from native platform via browser extension
     * @param request
     */
    async acquireToken(request, cacheLookupPolicy) {
        this.performanceClient.addQueueMeasurement(PerformanceEvents.NativeInteractionClientAcquireToken, this.correlationId);
        this.logger.trace("NativeInteractionClient - acquireToken called.");
        // start the perf measurement
        const nativeATMeasurement = this.performanceClient.startMeasurement(PerformanceEvents.NativeInteractionClientAcquireToken, this.correlationId);
        const reqTimestamp = nowSeconds();
        const serverTelemetryManager = this.initializeServerTelemetryManager(this.apiId);
        try {
            // initialize native request
            const nativeRequest = await this.initializeNativeRequest(request);
            // check if the tokens can be retrieved from internal cache
            try {
                const result = await this.acquireTokensFromCache(this.accountId, nativeRequest);
                nativeATMeasurement.end({
                    success: true,
                    isNativeBroker: false,
                    fromCache: true,
                });
                return result;
            }
            catch (e) {
                if (cacheLookupPolicy === CacheLookupPolicy.AccessToken) {
                    this.logger.info("MSAL internal Cache does not contain tokens, return error as per cache policy");
                    nativeATMeasurement.end({
                        success: false,
                        brokerErrorCode: "cache_request_failed",
                    });
                    throw e;
                }
                // continue with a native call for any and all errors
                this.logger.info("MSAL internal Cache does not contain tokens, proceed to make a native call");
            }
            const validatedResponse = await this.platformAuthProvider.sendMessage(nativeRequest);
            return await this.handleNativeResponse(validatedResponse, nativeRequest, reqTimestamp)
                .then((result) => {
                nativeATMeasurement.end({
                    success: true,
                    isNativeBroker: true,
                    requestId: result.requestId,
                });
                serverTelemetryManager.clearNativeBrokerErrorCode();
                return result;
            })
                .catch((error) => {
                nativeATMeasurement.end({
                    success: false,
                    errorCode: error.errorCode,
                    subErrorCode: error.subError,
                });
                throw error;
            });
        }
        catch (e) {
            if (e instanceof NativeAuthError) {
                serverTelemetryManager.setNativeBrokerErrorCode(e.errorCode);
            }
            nativeATMeasurement.end({
                success: false,
            });
            throw e;
        }
    }
    /**
     * Creates silent flow request
     * @param request
     * @param cachedAccount
     * @returns CommonSilentFlowRequest
     */
    createSilentCacheRequest(request, cachedAccount) {
        return {
            authority: request.authority,
            correlationId: this.correlationId,
            scopes: ScopeSet.fromString(request.scope).asArray(),
            account: cachedAccount,
            forceRefresh: false,
        };
    }
    /**
     * Fetches the tokens from the cache if un-expired
     * @param nativeAccountId
     * @param request
     * @returns authenticationResult
     */
    async acquireTokensFromCache(nativeAccountId, request) {
        if (!nativeAccountId) {
            this.logger.warning("NativeInteractionClient:acquireTokensFromCache - No nativeAccountId provided");
            throw createClientAuthError(noAccountFound);
        }
        // fetch the account from browser cache
        const account = this.browserStorage.getBaseAccountInfo({
            nativeAccountId,
        }, this.correlationId);
        if (!account) {
            throw createClientAuthError(noAccountFound);
        }
        // leverage silent flow for cached tokens retrieval
        try {
            const silentRequest = this.createSilentCacheRequest(request, account);
            const result = await this.silentCacheClient.acquireToken(silentRequest);
            const fullAccount = {
                ...account,
                idTokenClaims: result?.idTokenClaims,
                idToken: result?.idToken,
            };
            return {
                ...result,
                account: fullAccount,
            };
        }
        catch (e) {
            throw e;
        }
    }
    /**
     * Acquires a token from native platform then redirects to the redirectUri instead of returning the response
     * @param {RedirectRequest} request
     * @param {InProgressPerformanceEvent} rootMeasurement
     */
    async acquireTokenRedirect(request, rootMeasurement) {
        this.logger.trace("NativeInteractionClient - acquireTokenRedirect called.");
        const { ...remainingParameters } = request;
        delete remainingParameters.onRedirectNavigate;
        const nativeRequest = await this.initializeNativeRequest(remainingParameters);
        try {
            await this.platformAuthProvider.sendMessage(nativeRequest);
        }
        catch (e) {
            // Only throw fatal errors here to allow application to fallback to regular redirect. Otherwise proceed and the error will be thrown in handleRedirectPromise
            if (e instanceof NativeAuthError) {
                const serverTelemetryManager = this.initializeServerTelemetryManager(this.apiId);
                serverTelemetryManager.setNativeBrokerErrorCode(e.errorCode);
                if (isFatalNativeAuthError(e)) {
                    throw e;
                }
            }
        }
        this.browserStorage.setTemporaryCache(TemporaryCacheKeys.NATIVE_REQUEST, JSON.stringify(nativeRequest), true);
        const navigationOptions = {
            apiId: ApiId.acquireTokenRedirect,
            timeout: this.config.system.redirectNavigationTimeout,
            noHistory: false,
        };
        const redirectUri = this.config.auth.navigateToLoginRequestUrl
            ? window.location.href
            : this.getRedirectUri(request.redirectUri);
        rootMeasurement.end({ success: true });
        await this.navigationClient.navigateExternal(redirectUri, navigationOptions); // Need to treat this as external to ensure handleRedirectPromise is run again
    }
    /**
     * If the previous page called native platform for a token using redirect APIs, send the same request again and return the response
     * @param performanceClient {IPerformanceClient?}
     * @param correlationId {string?} correlation identifier
     */
    async handleRedirectPromise(performanceClient, correlationId) {
        this.logger.trace("NativeInteractionClient - handleRedirectPromise called.");
        if (!this.browserStorage.isInteractionInProgress(true)) {
            this.logger.info("handleRedirectPromise called but there is no interaction in progress, returning null.");
            return null;
        }
        // remove prompt from the request to prevent WAM from prompting twice
        const cachedRequest = this.browserStorage.getCachedNativeRequest();
        if (!cachedRequest) {
            this.logger.verbose("NativeInteractionClient - handleRedirectPromise called but there is no cached request, returning null.");
            if (performanceClient && correlationId) {
                performanceClient?.addFields({ errorCode: "no_cached_request" }, correlationId);
            }
            return null;
        }
        const { prompt, ...request } = cachedRequest;
        if (prompt) {
            this.logger.verbose("NativeInteractionClient - handleRedirectPromise called and prompt was included in the original request, removing prompt from cached request to prevent second interaction with native broker window.");
        }
        this.browserStorage.removeItem(this.browserStorage.generateCacheKey(TemporaryCacheKeys.NATIVE_REQUEST));
        const reqTimestamp = nowSeconds();
        try {
            this.logger.verbose("NativeInteractionClient - handleRedirectPromise sending message to native broker.");
            const response = await this.platformAuthProvider.sendMessage(request);
            const authResult = await this.handleNativeResponse(response, request, reqTimestamp);
            const serverTelemetryManager = this.initializeServerTelemetryManager(this.apiId);
            serverTelemetryManager.clearNativeBrokerErrorCode();
            if (performanceClient && this.correlationId) {
                this.performanceClient.addFields({ isNativeBroker: true }, this.correlationId);
            }
            return authResult;
        }
        catch (e) {
            throw e;
        }
    }
    /**
     * Logout from native platform via browser extension
     * @param request
     */
    logout() {
        this.logger.trace("NativeInteractionClient - logout called.");
        return Promise.reject("Logout not implemented yet");
    }
    /**
     * Transform response from native platform into AuthenticationResult object which will be returned to the end user
     * @param response
     * @param request
     * @param reqTimestamp
     */
    async handleNativeResponse(response, request, reqTimestamp) {
        this.logger.trace("NativeInteractionClient - handleNativeResponse called.");
        // generate identifiers
        const idTokenClaims = extractTokenClaims(response.id_token, base64Decode);
        const homeAccountIdentifier = this.createHomeAccountIdentifier(response, idTokenClaims);
        const cachedhomeAccountId = this.browserStorage.getAccountInfoFilteredBy({
            nativeAccountId: request.accountId,
        }, this.correlationId)?.homeAccountId;
        // add exception for double brokering, please note this is temporary and will be fortified in future
        if (request.extraParameters?.child_client_id &&
            response.account.id !== request.accountId) {
            this.logger.info("handleNativeServerResponse: Double broker flow detected, ignoring accountId mismatch");
        }
        else if (homeAccountIdentifier !== cachedhomeAccountId &&
            response.account.id !== request.accountId) {
            // User switch in native broker prompt is not supported. All users must first sign in through web flow to ensure server state is in sync
            throw createNativeAuthError(userSwitch);
        }
        // Get the preferred_cache domain for the given authority
        const authority = await this.getDiscoveredAuthority({
            requestAuthority: request.authority,
        });
        const baseAccount = buildAccountToCache(this.browserStorage, authority, homeAccountIdentifier, base64Decode, this.correlationId, idTokenClaims, response.client_info, undefined, // environment
        idTokenClaims.tid, undefined, // auth code payload
        response.account.id, this.logger);
        // Ensure expires_in is in number format
        response.expires_in = Number(response.expires_in);
        // generate authenticationResult
        const result = await this.generateAuthenticationResult(response, request, idTokenClaims, baseAccount, authority.canonicalAuthority, reqTimestamp);
        // cache accounts and tokens in the appropriate storage
        await this.cacheAccount(baseAccount, this.correlationId, isKmsi(idTokenClaims));
        await this.cacheNativeTokens(response, request, homeAccountIdentifier, idTokenClaims, response.access_token, result.tenantId, reqTimestamp);
        return result;
    }
    /**
     * creates an homeAccountIdentifier for the account
     * @param response
     * @param idTokenObj
     * @returns
     */
    createHomeAccountIdentifier(response, idTokenClaims) {
        // Save account in browser storage
        const homeAccountIdentifier = AccountEntity.generateHomeAccountId(response.client_info || Constants.EMPTY_STRING, AuthorityType.Default, this.logger, this.browserCrypto, idTokenClaims);
        return homeAccountIdentifier;
    }
    /**
     * Helper to generate scopes
     * @param response
     * @param request
     * @returns
     */
    generateScopes(requestScopes, responseScopes) {
        return responseScopes
            ? ScopeSet.fromString(responseScopes)
            : ScopeSet.fromString(requestScopes);
    }
    /**
     * If PoP token is requesred, records the PoP token if returned from the WAM, else generates one in the browser
     * @param request
     * @param response
     */
    async generatePopAccessToken(response, request) {
        if (request.tokenType === AuthenticationScheme.POP &&
            request.signPopToken) {
            /**
             * This code prioritizes SHR returned from the native layer. In case of error/SHR not calculated from WAM and the AT
             * is still received, SHR is calculated locally
             */
            // Check if native layer returned an SHR token
            if (response.shr) {
                this.logger.trace("handleNativeServerResponse: SHR is enabled in native layer");
                return response.shr;
            }
            // Generate SHR in msal js if WAM does not compute it when POP is enabled
            const popTokenGenerator = new PopTokenGenerator(this.browserCrypto);
            const shrParameters = {
                resourceRequestMethod: request.resourceRequestMethod,
                resourceRequestUri: request.resourceRequestUri,
                shrClaims: request.shrClaims,
                shrNonce: request.shrNonce,
            };
            /**
             * KeyID must be present in the native request from when the PoP key was generated in order for
             * PopTokenGenerator to query the full key for signing
             */
            if (!request.keyId) {
                throw createClientAuthError(keyIdMissing);
            }
            return popTokenGenerator.signPopToken(response.access_token, request.keyId, shrParameters);
        }
        else {
            return response.access_token;
        }
    }
    /**
     * Generates authentication result
     * @param response
     * @param request
     * @param idTokenObj
     * @param accountEntity
     * @param authority
     * @param reqTimestamp
     * @returns
     */
    async generateAuthenticationResult(response, request, idTokenClaims, accountEntity, authority, reqTimestamp) {
        // Add Native Broker fields to Telemetry
        const mats = this.addTelemetryFromNativeResponse(response.properties.MATS);
        // If scopes not returned in server response, use request scopes
        const responseScopes = this.generateScopes(request.scope, response.scope);
        const accountProperties = response.account.properties || {};
        const uid = accountProperties["UID"] ||
            idTokenClaims.oid ||
            idTokenClaims.sub ||
            Constants.EMPTY_STRING;
        const tid = accountProperties["TenantId"] ||
            idTokenClaims.tid ||
            Constants.EMPTY_STRING;
        const accountInfo = updateAccountTenantProfileData(AccountEntity.getAccountInfo(accountEntity), undefined, // tenantProfile optional
        idTokenClaims, response.id_token);
        /**
         * In pairwise broker flows, this check prevents the broker's native account id
         * from being returned over the embedded app's account id.
         */
        if (accountInfo.nativeAccountId !== response.account.id) {
            accountInfo.nativeAccountId = response.account.id;
        }
        // generate PoP token as needed
        const responseAccessToken = await this.generatePopAccessToken(response, request);
        const tokenType = request.tokenType === AuthenticationScheme.POP
            ? AuthenticationScheme.POP
            : AuthenticationScheme.BEARER;
        const result = {
            authority: authority,
            uniqueId: uid,
            tenantId: tid,
            scopes: responseScopes.asArray(),
            account: accountInfo,
            idToken: response.id_token,
            idTokenClaims: idTokenClaims,
            accessToken: responseAccessToken,
            fromCache: mats ? this.isResponseFromCache(mats) : false,
            // Request timestamp and NativeResponse expires_in are in seconds, converting to Date for AuthenticationResult
            expiresOn: toDateFromSeconds(reqTimestamp + response.expires_in),
            tokenType: tokenType,
            correlationId: this.correlationId,
            state: response.state,
            fromNativeBroker: true,
        };
        return result;
    }
    /**
     * cache the account entity in browser storage
     * @param accountEntity
     */
    async cacheAccount(accountEntity, correlationId, kmsi) {
        // Store the account info and hence `nativeAccountId` in browser cache
        await this.browserStorage.setAccount(accountEntity, this.correlationId, kmsi);
        // Remove any existing cached tokens for this account in browser storage
        this.browserStorage.removeAccountContext(AccountEntity.getAccountInfo(accountEntity), correlationId);
    }
    /**
     * Stores the access_token and id_token in inmemory storage
     * @param response
     * @param request
     * @param homeAccountIdentifier
     * @param idTokenObj
     * @param responseAccessToken
     * @param tenantId
     * @param reqTimestamp
     */
    cacheNativeTokens(response, request, homeAccountIdentifier, idTokenClaims, responseAccessToken, tenantId, reqTimestamp) {
        const cachedIdToken = createIdTokenEntity(homeAccountIdentifier, request.authority, response.id_token || "", request.clientId, idTokenClaims.tid || "");
        // cache accessToken in inmemory storage
        const expiresIn = request.tokenType === AuthenticationScheme.POP
            ? Constants.SHR_NONCE_VALIDITY
            : (typeof response.expires_in === "string"
                ? parseInt(response.expires_in, 10)
                : response.expires_in) || 0;
        const tokenExpirationSeconds = reqTimestamp + expiresIn;
        const responseScopes = this.generateScopes(response.scope, request.scope);
        const cachedAccessToken = createAccessTokenEntity(homeAccountIdentifier, request.authority, responseAccessToken, request.clientId, idTokenClaims.tid || tenantId, responseScopes.printScopes(), tokenExpirationSeconds, 0, base64Decode, undefined, request.tokenType, undefined, request.keyId);
        const nativeCacheRecord = {
            idToken: cachedIdToken,
            accessToken: cachedAccessToken,
        };
        return this.nativeStorageManager.saveCacheRecord(nativeCacheRecord, this.correlationId, isKmsi(idTokenClaims), request.storeInCache);
    }
    getExpiresInValue(tokenType, expiresIn) {
        return tokenType === AuthenticationScheme.POP
            ? Constants.SHR_NONCE_VALIDITY
            : (typeof expiresIn === "string"
                ? parseInt(expiresIn, 10)
                : expiresIn) || 0;
    }
    addTelemetryFromNativeResponse(matsResponse) {
        const mats = this.getMATSFromResponse(matsResponse);
        if (!mats) {
            return null;
        }
        this.performanceClient.addFields({
            extensionId: this.platformAuthProvider.getExtensionId(),
            extensionVersion: this.platformAuthProvider.getExtensionVersion(),
            matsBrokerVersion: mats.broker_version,
            matsAccountJoinOnStart: mats.account_join_on_start,
            matsAccountJoinOnEnd: mats.account_join_on_end,
            matsDeviceJoin: mats.device_join,
            matsPromptBehavior: mats.prompt_behavior,
            matsApiErrorCode: mats.api_error_code,
            matsUiVisible: mats.ui_visible,
            matsSilentCode: mats.silent_code,
            matsSilentBiSubCode: mats.silent_bi_sub_code,
            matsSilentMessage: mats.silent_message,
            matsSilentStatus: mats.silent_status,
            matsHttpStatus: mats.http_status,
            matsHttpEventCount: mats.http_event_count,
        }, this.correlationId);
        return mats;
    }
    /**
     * Gets MATS telemetry from native response
     * @param response
     * @returns
     */
    getMATSFromResponse(matsResponse) {
        if (matsResponse) {
            try {
                return JSON.parse(matsResponse);
            }
            catch (e) {
                this.logger.error("NativeInteractionClient - Error parsing MATS telemetry, returning null instead");
            }
        }
        return null;
    }
    /**
     * Returns whether or not response came from native cache
     * @param response
     * @returns
     */
    isResponseFromCache(mats) {
        if (typeof mats.is_cached === "undefined") {
            this.logger.verbose("NativeInteractionClient - MATS telemetry does not contain field indicating if response was served from cache. Returning false.");
            return false;
        }
        return !!mats.is_cached;
    }
    /**
     * Translates developer provided request object into NativeRequest object
     * @param request
     */
    async initializeNativeRequest(request) {
        this.logger.trace("NativeInteractionClient - initializeNativeRequest called");
        const canonicalAuthority = await this.getCanonicalAuthority(request);
        // scopes are expected to be received by the native broker as "scope" and will be added to the request below. Other properties that should be dropped from the request to the native broker can be included in the object destructuring here.
        const { scopes, ...remainingProperties } = request;
        const scopeSet = new ScopeSet(scopes || []);
        scopeSet.appendScopes(OIDC_DEFAULT_SCOPES);
        const validatedRequest = {
            ...remainingProperties,
            accountId: this.accountId,
            clientId: this.config.auth.clientId,
            authority: canonicalAuthority.urlString,
            scope: scopeSet.printScopes(),
            redirectUri: this.getRedirectUri(request.redirectUri),
            prompt: this.getPrompt(request.prompt),
            correlationId: this.correlationId,
            tokenType: request.authenticationScheme,
            windowTitleSubstring: document.title,
            extraParameters: {
                ...request.extraQueryParameters,
                ...request.tokenQueryParameters,
            },
            extendedExpiryToken: false,
            keyId: request.popKid,
        };
        // Check for PoP token requests: signPopToken should only be set to true if popKid is not set
        if (validatedRequest.signPopToken && !!request.popKid) {
            throw createBrowserAuthError(invalidPopTokenRequest);
        }
        this.handleExtraBrokerParams(validatedRequest);
        validatedRequest.extraParameters =
            validatedRequest.extraParameters || {};
        validatedRequest.extraParameters.telemetry =
            PlatformAuthConstants.MATS_TELEMETRY;
        if (request.authenticationScheme === AuthenticationScheme.POP) {
            // add POP request type
            const shrParameters = {
                resourceRequestUri: request.resourceRequestUri,
                resourceRequestMethod: request.resourceRequestMethod,
                shrClaims: request.shrClaims,
                shrNonce: request.shrNonce,
            };
            const popTokenGenerator = new PopTokenGenerator(this.browserCrypto);
            // generate reqCnf if not provided in the request
            let reqCnfData;
            if (!validatedRequest.keyId) {
                const generatedReqCnfData = await invokeAsync(popTokenGenerator.generateCnf.bind(popTokenGenerator), PerformanceEvents.PopTokenGenerateCnf, this.logger, this.performanceClient, this.correlationId)(shrParameters, this.logger);
                reqCnfData = generatedReqCnfData.reqCnfString;
                validatedRequest.keyId = generatedReqCnfData.kid;
                validatedRequest.signPopToken = true;
            }
            else {
                reqCnfData = this.browserCrypto.base64UrlEncode(JSON.stringify({ kid: validatedRequest.keyId }));
                validatedRequest.signPopToken = false;
            }
            // SPAs require whole string to be passed to broker
            validatedRequest.reqCnf = reqCnfData;
        }
        this.addRequestSKUs(validatedRequest);
        return validatedRequest;
    }
    async getCanonicalAuthority(request) {
        const requestAuthority = request.authority || this.config.auth.authority;
        if (request.account) {
            // validate authority
            await this.getDiscoveredAuthority({
                requestAuthority,
                requestAzureCloudOptions: request.azureCloudOptions,
                account: request.account,
            });
        }
        const canonicalAuthority = new UrlString(requestAuthority);
        canonicalAuthority.validateAsUri();
        return canonicalAuthority;
    }
    getPrompt(prompt) {
        // If request is silent, prompt is always none
        switch (this.apiId) {
            case ApiId.ssoSilent:
            case ApiId.acquireTokenSilent_silentFlow:
                this.logger.trace("initializeNativeRequest: silent request sets prompt to none");
                return PromptValue.NONE;
        }
        // Prompt not provided, request may proceed and native broker decides if it needs to prompt
        if (!prompt) {
            this.logger.trace("initializeNativeRequest: prompt was not provided");
            return undefined;
        }
        // If request is interactive, check if prompt provided is allowed to go directly to native broker
        switch (prompt) {
            case PromptValue.NONE:
            case PromptValue.CONSENT:
            case PromptValue.LOGIN:
            case PromptValue.SELECT_ACCOUNT:
                this.logger.trace("initializeNativeRequest: prompt is compatible with native flow");
                return prompt;
            default:
                this.logger.trace(`initializeNativeRequest: prompt = ${prompt} is not compatible with native flow`);
                throw createBrowserAuthError(nativePromptNotSupported);
        }
    }
    /**
     * Handles extra broker request parameters
     * @param request {PlatformAuthRequest}
     * @private
     */
    handleExtraBrokerParams(request) {
        const hasExtraBrokerParams = request.extraParameters &&
            request.extraParameters.hasOwnProperty(BROKER_CLIENT_ID) &&
            request.extraParameters.hasOwnProperty(BROKER_REDIRECT_URI) &&
            request.extraParameters.hasOwnProperty(CLIENT_ID);
        if (!request.embeddedClientId && !hasExtraBrokerParams) {
            return;
        }
        let child_client_id = "";
        const child_redirect_uri = request.redirectUri;
        if (request.embeddedClientId) {
            request.redirectUri = this.config.auth.redirectUri;
            child_client_id = request.embeddedClientId;
        }
        else if (request.extraParameters) {
            request.redirectUri =
                request.extraParameters[BROKER_REDIRECT_URI];
            child_client_id =
                request.extraParameters[CLIENT_ID];
        }
        request.extraParameters = {
            child_client_id,
            child_redirect_uri,
        };
        this.performanceClient?.addFields({
            embeddedClientId: child_client_id,
            embeddedRedirectUri: child_redirect_uri,
        }, this.correlationId);
    }
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Returns map of parameters that are applicable to all calls to /authorize whether using PKCE or EAR
 * @param config
 * @param authority
 * @param request
 * @param logger
 * @param performanceClient
 * @returns
 */
async function getStandardParameters(config, authority, request, logger, performanceClient) {
    const parameters = getStandardAuthorizeRequestParameters({ ...config.auth, authority: authority }, request, logger, performanceClient);
    addLibraryInfo(parameters, {
        sku: BrowserConstants.MSAL_SKU,
        version: version,
        os: "",
        cpu: "",
    });
    if (config.auth.protocolMode !== ProtocolMode.OIDC) {
        addApplicationTelemetry(parameters, config.telemetry.application);
    }
    if (request.platformBroker) {
        // signal ests that this is a WAM call
        addNativeBroker(parameters);
        // instrument JS-platform bridge specific fields
        performanceClient.addFields({
            isPlatformAuthorizeRequest: true,
        }, request.correlationId);
        // pass the req_cnf for POP
        if (request.authenticationScheme === AuthenticationScheme.POP) {
            const cryptoOps = new CryptoOps(logger, performanceClient);
            const popTokenGenerator = new PopTokenGenerator(cryptoOps);
            // req_cnf is always sent as a string for SPAs
            let reqCnfData;
            if (!request.popKid) {
                const generatedReqCnfData = await invokeAsync(popTokenGenerator.generateCnf.bind(popTokenGenerator), PerformanceEvents.PopTokenGenerateCnf, logger, performanceClient, request.correlationId)(request, logger);
                reqCnfData = generatedReqCnfData.reqCnfString;
            }
            else {
                reqCnfData = cryptoOps.encodeKid(request.popKid);
            }
            addPopToken(parameters, reqCnfData);
        }
    }
    instrumentBrokerParams(parameters, request.correlationId, performanceClient);
    return parameters;
}
/**
 * Gets the full /authorize URL with request parameters when using Auth Code + PKCE
 * @param config
 * @param authority
 * @param request
 * @param logger
 * @param performanceClient
 * @returns
 */
async function getAuthCodeRequestUrl(config, authority, request, logger, performanceClient) {
    if (!request.codeChallenge) {
        throw createClientConfigurationError(pkceParamsMissing);
    }
    const parameters = await invokeAsync(getStandardParameters, PerformanceEvents.GetStandardParams, logger, performanceClient, request.correlationId)(config, authority, request, logger, performanceClient);
    addResponseType(parameters, OAuthResponseType.CODE);
    addCodeChallengeParams(parameters, request.codeChallenge, Constants.S256_CODE_CHALLENGE_METHOD);
    addExtraQueryParameters(parameters, request.extraQueryParameters || {});
    return getAuthorizeUrl(authority, parameters, config.auth.encodeExtraQueryParams, request.extraQueryParameters);
}
/**
 * Gets the form that will be posted to /authorize with request parameters when using EAR
 */
async function getEARForm(frame, config, authority, request, logger, performanceClient) {
    if (!request.earJwk) {
        throw createBrowserAuthError(earJwkEmpty);
    }
    const parameters = await getStandardParameters(config, authority, request, logger, performanceClient);
    addResponseType(parameters, OAuthResponseType.IDTOKEN_TOKEN_REFRESHTOKEN);
    addEARParameters(parameters, request.earJwk);
    // Also add codeChallenge as backup in case EAR is not supported
    addCodeChallengeParams(parameters, request.codeChallenge, Constants.S256_CODE_CHALLENGE_METHOD);
    const queryParams = new Map();
    addExtraQueryParameters(queryParams, request.extraQueryParameters || {});
    const url = getAuthorizeUrl(authority, queryParams, config.auth.encodeExtraQueryParams, request.extraQueryParameters);
    return createForm(frame, url, parameters);
}
/**
 * Gets the form that will be posted to /authorize with request parameters when using POST method
 */
async function getCodeForm(frame, config, authority, request, logger, performanceClient) {
    const parameters = await getStandardParameters(config, authority, request, logger, performanceClient);
    addResponseType(parameters, OAuthResponseType.CODE);
    addCodeChallengeParams(parameters, request.codeChallenge, request.codeChallengeMethod || Constants.S256_CODE_CHALLENGE_METHOD);
    addPostBodyParameters(parameters, request.authorizePostBodyParameters || {});
    const queryParams = new Map();
    addExtraQueryParameters(queryParams, request.extraQueryParameters || {});
    const url = getAuthorizeUrl(authority, queryParams, config.auth.encodeExtraQueryParams, request.extraQueryParameters);
    return createForm(frame, url, parameters);
}
/**
 * Creates form element in the provided document with auth parameters in the post body
 * @param frame
 * @param authorizeUrl
 * @param parameters
 * @returns
 */
function createForm(frame, authorizeUrl, parameters) {
    const form = frame.createElement("form");
    form.method = "post";
    form.action = authorizeUrl;
    parameters.forEach((value, key) => {
        const param = frame.createElement("input");
        param.hidden = true;
        param.name = key;
        param.value = value;
        form.appendChild(param);
    });
    frame.body.appendChild(form);
    return form;
}
/**
 * Response handler when server returns accountId on the /authorize request
 * @param request
 * @param accountId
 * @param apiId
 * @param config
 * @param browserStorage
 * @param nativeStorage
 * @param eventHandler
 * @param logger
 * @param performanceClient
 * @param nativeMessageHandler
 * @returns
 */
async function handleResponsePlatformBroker(request, accountId, apiId, config, browserStorage, nativeStorage, eventHandler, logger, performanceClient, platformAuthProvider) {
    logger.verbose("Account id found, calling WAM for token");
    if (!platformAuthProvider) {
        throw createBrowserAuthError(nativeConnectionNotEstablished);
    }
    const browserCrypto = new CryptoOps(logger, performanceClient);
    const nativeInteractionClient = new PlatformAuthInteractionClient(config, browserStorage, browserCrypto, logger, eventHandler, config.system.navigationClient, apiId, performanceClient, platformAuthProvider, accountId, nativeStorage, request.correlationId);
    const { userRequestState } = ProtocolUtils.parseRequestState(browserCrypto, request.state);
    return invokeAsync(nativeInteractionClient.acquireToken.bind(nativeInteractionClient), PerformanceEvents.NativeInteractionClientAcquireToken, logger, performanceClient, request.correlationId)({
        ...request,
        state: userRequestState,
        prompt: undefined, // Server should handle the prompt, ideally native broker can do this part silently
    });
}
/**
 * Response handler when server returns code on the /authorize request
 * @param request
 * @param response
 * @param codeVerifier
 * @param authClient
 * @param browserStorage
 * @param logger
 * @param performanceClient
 * @returns
 */
async function handleResponseCode(request, response, codeVerifier, apiId, config, authClient, browserStorage, nativeStorage, eventHandler, logger, performanceClient, platformAuthProvider) {
    // Remove throttle if it exists
    ThrottlingUtils.removeThrottle(browserStorage, config.auth.clientId, request);
    if (response.accountId) {
        return invokeAsync(handleResponsePlatformBroker, PerformanceEvents.HandleResponsePlatformBroker, logger, performanceClient, request.correlationId)(request, response.accountId, apiId, config, browserStorage, nativeStorage, eventHandler, logger, performanceClient, platformAuthProvider);
    }
    const authCodeRequest = {
        ...request,
        code: response.code || "",
        codeVerifier: codeVerifier,
    };
    // Create popup interaction handler.
    const interactionHandler = new InteractionHandler(authClient, browserStorage, authCodeRequest, logger, performanceClient);
    // Handle response from hash string.
    const result = await invokeAsync(interactionHandler.handleCodeResponse.bind(interactionHandler), PerformanceEvents.HandleCodeResponse, logger, performanceClient, request.correlationId)(response, request);
    return result;
}
/**
 * Response handler when server returns ear_jwe on the /authorize request
 * @param request
 * @param response
 * @param apiId
 * @param config
 * @param authority
 * @param browserStorage
 * @param nativeStorage
 * @param eventHandler
 * @param logger
 * @param performanceClient
 * @param nativeMessageHandler
 * @returns
 */
async function handleResponseEAR(request, response, apiId, config, authority, browserStorage, nativeStorage, eventHandler, logger, performanceClient, platformAuthProvider) {
    // Remove throttle if it exists
    ThrottlingUtils.removeThrottle(browserStorage, config.auth.clientId, request);
    // Validate state & check response for errors
    validateAuthorizationResponse(response, request.state);
    if (!response.ear_jwe) {
        throw createBrowserAuthError(earJweEmpty);
    }
    if (!request.earJwk) {
        throw createBrowserAuthError(earJwkEmpty);
    }
    const decryptedData = JSON.parse(await invokeAsync(decryptEarResponse, PerformanceEvents.DecryptEarResponse, logger, performanceClient, request.correlationId)(request.earJwk, response.ear_jwe));
    if (decryptedData.accountId) {
        return invokeAsync(handleResponsePlatformBroker, PerformanceEvents.HandleResponsePlatformBroker, logger, performanceClient, request.correlationId)(request, decryptedData.accountId, apiId, config, browserStorage, nativeStorage, eventHandler, logger, performanceClient, platformAuthProvider);
    }
    const responseHandler = new ResponseHandler(config.auth.clientId, browserStorage, new CryptoOps(logger, performanceClient), logger, null, null, performanceClient);
    // Validate response. This function throws a server error if an error is returned by the server.
    responseHandler.validateTokenResponse(decryptedData);
    // Temporary until response handler is refactored to be more flow agnostic.
    const additionalData = {
        code: "",
        state: request.state,
        nonce: request.nonce,
        client_info: decryptedData.client_info,
        cloud_graph_host_name: decryptedData.cloud_graph_host_name,
        cloud_instance_host_name: decryptedData.cloud_instance_host_name,
        cloud_instance_name: decryptedData.cloud_instance_name,
        msgraph_host: decryptedData.msgraph_host,
    };
    return (await invokeAsync(responseHandler.handleServerTokenResponse.bind(responseHandler), PerformanceEvents.HandleServerTokenResponse, logger, performanceClient, request.correlationId)(decryptedData, authority, nowSeconds(), request, additionalData, undefined, undefined, undefined, undefined));
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
// Constant byte array length
const RANDOM_BYTE_ARR_LENGTH = 32;
/**
 * This file defines APIs to generate PKCE codes and code verifiers.
 */
/**
 * Generates PKCE Codes. See the RFC for more information: https://tools.ietf.org/html/rfc7636
 */
async function generatePkceCodes(performanceClient, logger, correlationId) {
    performanceClient.addQueueMeasurement(PerformanceEvents.GeneratePkceCodes, correlationId);
    const codeVerifier = invoke(generateCodeVerifier, PerformanceEvents.GenerateCodeVerifier, logger, performanceClient, correlationId)(performanceClient, logger, correlationId);
    const codeChallenge = await invokeAsync(generateCodeChallengeFromVerifier, PerformanceEvents.GenerateCodeChallengeFromVerifier, logger, performanceClient, correlationId)(codeVerifier, performanceClient, logger, correlationId);
    return {
        verifier: codeVerifier,
        challenge: codeChallenge,
    };
}
/**
 * Generates a random 32 byte buffer and returns the base64
 * encoded string to be used as a PKCE Code Verifier
 */
function generateCodeVerifier(performanceClient, logger, correlationId) {
    try {
        // Generate random values as utf-8
        const buffer = new Uint8Array(RANDOM_BYTE_ARR_LENGTH);
        invoke(getRandomValues, PerformanceEvents.GetRandomValues, logger, performanceClient, correlationId)(buffer);
        // encode verifier as base64
        const pkceCodeVerifierB64 = urlEncodeArr(buffer);
        return pkceCodeVerifierB64;
    }
    catch (e) {
        throw createBrowserAuthError(pkceNotCreated);
    }
}
/**
 * Creates a base64 encoded PKCE Code Challenge string from the
 * hash created from the PKCE Code Verifier supplied
 */
async function generateCodeChallengeFromVerifier(pkceCodeVerifier, performanceClient, logger, correlationId) {
    performanceClient.addQueueMeasurement(PerformanceEvents.GenerateCodeChallengeFromVerifier, correlationId);
    try {
        // hashed verifier
        const pkceHashedCodeVerifier = await invokeAsync(sha256Digest, PerformanceEvents.Sha256Digest, logger, performanceClient, correlationId)(pkceCodeVerifier, performanceClient, correlationId);
        // encode hash as base64
        return urlEncodeArr(new Uint8Array(pkceHashedCodeVerifier));
    }
    catch (e) {
        throw createBrowserAuthError(pkceNotCreated);
    }
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
class PlatformAuthExtensionHandler {
    constructor(logger, handshakeTimeoutMs, performanceClient, extensionId) {
        this.logger = logger;
        this.handshakeTimeoutMs = handshakeTimeoutMs;
        this.extensionId = extensionId;
        this.resolvers = new Map(); // Used for non-handshake messages
        this.handshakeResolvers = new Map(); // Used for handshake messages
        this.messageChannel = new MessageChannel();
        this.windowListener = this.onWindowMessage.bind(this); // Window event callback doesn't have access to 'this' unless it's bound
        this.performanceClient = performanceClient;
        this.handshakeEvent = performanceClient.startMeasurement(PerformanceEvents.NativeMessageHandlerHandshake);
        this.platformAuthType =
            PlatformAuthConstants.PLATFORM_EXTENSION_PROVIDER;
    }
    /**
     * Sends a given message to the extension and resolves with the extension response
     * @param request
     */
    async sendMessage(request) {
        this.logger.trace(this.platformAuthType + " - sendMessage called.");
        // fall back to native calls
        const messageBody = {
            method: NativeExtensionMethod.GetToken,
            request: request,
        };
        const req = {
            channel: PlatformAuthConstants.CHANNEL_ID,
            extensionId: this.extensionId,
            responseId: createNewGuid(),
            body: messageBody,
        };
        this.logger.trace(this.platformAuthType + " - Sending request to browser extension");
        this.logger.tracePii(this.platformAuthType +
            ` - Sending request to browser extension: ${JSON.stringify(req)}`);
        this.messageChannel.port1.postMessage(req);
        const response = await new Promise((resolve, reject) => {
            this.resolvers.set(req.responseId, { resolve, reject });
        });
        const validatedResponse = this.validatePlatformBrokerResponse(response);
        return validatedResponse;
    }
    /**
     * Returns an instance of the MessageHandler that has successfully established a connection with an extension
     * @param {Logger} logger
     * @param {number} handshakeTimeoutMs
     * @param {IPerformanceClient} performanceClient
     * @param {ICrypto} crypto
     */
    static async createProvider(logger, handshakeTimeoutMs, performanceClient) {
        logger.trace("PlatformAuthExtensionHandler - createProvider called.");
        try {
            const preferredProvider = new PlatformAuthExtensionHandler(logger, handshakeTimeoutMs, performanceClient, PlatformAuthConstants.PREFERRED_EXTENSION_ID);
            await preferredProvider.sendHandshakeRequest();
            return preferredProvider;
        }
        catch (e) {
            // If preferred extension fails for whatever reason, fallback to using any installed extension
            const backupProvider = new PlatformAuthExtensionHandler(logger, handshakeTimeoutMs, performanceClient);
            await backupProvider.sendHandshakeRequest();
            return backupProvider;
        }
    }
    /**
     * Send handshake request helper.
     */
    async sendHandshakeRequest() {
        this.logger.trace(this.platformAuthType + " - sendHandshakeRequest called.");
        // Register this event listener before sending handshake
        window.addEventListener("message", this.windowListener, false); // false is important, because content script message processing should work first
        const req = {
            channel: PlatformAuthConstants.CHANNEL_ID,
            extensionId: this.extensionId,
            responseId: createNewGuid(),
            body: {
                method: NativeExtensionMethod.HandshakeRequest,
            },
        };
        this.handshakeEvent.add({
            extensionId: this.extensionId,
            extensionHandshakeTimeoutMs: this.handshakeTimeoutMs,
        });
        this.messageChannel.port1.onmessage = (event) => {
            this.onChannelMessage(event);
        };
        window.postMessage(req, window.origin, [this.messageChannel.port2]);
        return new Promise((resolve, reject) => {
            this.handshakeResolvers.set(req.responseId, { resolve, reject });
            this.timeoutId = window.setTimeout(() => {
                /*
                 * Throw an error if neither HandshakeResponse nor original Handshake request are received in a reasonable timeframe.
                 * This typically suggests an event handler stopped propagation of the Handshake request but did not respond to it on the MessageChannel port
                 */
                window.removeEventListener("message", this.windowListener, false);
                this.messageChannel.port1.close();
                this.messageChannel.port2.close();
                this.handshakeEvent.end({
                    extensionHandshakeTimedOut: true,
                    success: false,
                });
                reject(createBrowserAuthError(nativeHandshakeTimeout));
                this.handshakeResolvers.delete(req.responseId);
            }, this.handshakeTimeoutMs); // Use a reasonable timeout in milliseconds here
        });
    }
    /**
     * Invoked when a message is posted to the window. If a handshake request is received it means the extension is not installed.
     * @param event
     */
    onWindowMessage(event) {
        this.logger.trace(this.platformAuthType + " - onWindowMessage called");
        // We only accept messages from ourselves
        if (event.source !== window) {
            return;
        }
        const request = event.data;
        if (!request.channel ||
            request.channel !== PlatformAuthConstants.CHANNEL_ID) {
            return;
        }
        if (request.extensionId && request.extensionId !== this.extensionId) {
            return;
        }
        if (request.body.method === NativeExtensionMethod.HandshakeRequest) {
            const handshakeResolver = this.handshakeResolvers.get(request.responseId);
            /*
             * Filter out responses with no matched resolvers sooner to keep channel ports open while waiting for
             * the proper response.
             */
            if (!handshakeResolver) {
                this.logger.trace(this.platformAuthType +
                    `.onWindowMessage - resolver can't be found for request ${request.responseId}`);
                return;
            }
            // If we receive this message back it means no extension intercepted the request, meaning no extension supporting handshake protocol is installed
            this.logger.verbose(request.extensionId
                ? `Extension with id: ${request.extensionId} not installed`
                : "No extension installed");
            clearTimeout(this.timeoutId);
            this.messageChannel.port1.close();
            this.messageChannel.port2.close();
            window.removeEventListener("message", this.windowListener, false);
            this.handshakeEvent.end({
                success: false,
                extensionInstalled: false,
            });
            handshakeResolver.reject(createBrowserAuthError(nativeExtensionNotInstalled));
        }
    }
    /**
     * Invoked when a message is received from the extension on the MessageChannel port
     * @param event
     */
    onChannelMessage(event) {
        this.logger.trace(this.platformAuthType + " - onChannelMessage called.");
        const request = event.data;
        const resolver = this.resolvers.get(request.responseId);
        const handshakeResolver = this.handshakeResolvers.get(request.responseId);
        try {
            const method = request.body.method;
            if (method === NativeExtensionMethod.Response) {
                if (!resolver) {
                    return;
                }
                const response = request.body.response;
                this.logger.trace(this.platformAuthType +
                    " - Received response from browser extension");
                this.logger.tracePii(this.platformAuthType +
                    ` - Received response from browser extension: ${JSON.stringify(response)}`);
                if (response.status !== "Success") {
                    resolver.reject(createNativeAuthError(response.code, response.description, response.ext));
                }
                else if (response.result) {
                    if (response.result["code"] &&
                        response.result["description"]) {
                        resolver.reject(createNativeAuthError(response.result["code"], response.result["description"], response.result["ext"]));
                    }
                    else {
                        resolver.resolve(response.result);
                    }
                }
                else {
                    throw createAuthError(unexpectedError, "Event does not contain result.");
                }
                this.resolvers.delete(request.responseId);
            }
            else if (method === NativeExtensionMethod.HandshakeResponse) {
                if (!handshakeResolver) {
                    this.logger.trace(this.platformAuthType +
                        `.onChannelMessage - resolver can't be found for request ${request.responseId}`);
                    return;
                }
                clearTimeout(this.timeoutId); // Clear setTimeout
                window.removeEventListener("message", this.windowListener, false); // Remove 'No extension' listener
                this.extensionId = request.extensionId;
                this.extensionVersion = request.body.version;
                this.logger.verbose(this.platformAuthType +
                    ` - Received HandshakeResponse from extension: ${this.extensionId}`);
                this.handshakeEvent.end({
                    extensionInstalled: true,
                    success: true,
                });
                handshakeResolver.resolve();
                this.handshakeResolvers.delete(request.responseId);
            }
            // Do nothing if method is not Response or HandshakeResponse
        }
        catch (err) {
            this.logger.error("Error parsing response from WAM Extension");
            this.logger.errorPii(`Error parsing response from WAM Extension: ${err}`);
            this.logger.errorPii(`Unable to parse ${event}`);
            if (resolver) {
                resolver.reject(err);
            }
            else if (handshakeResolver) {
                handshakeResolver.reject(err);
            }
        }
    }
    /**
     * Validates native platform response before processing
     * @param response
     */
    validatePlatformBrokerResponse(response) {
        if (response.hasOwnProperty("access_token") &&
            response.hasOwnProperty("id_token") &&
            response.hasOwnProperty("client_info") &&
            response.hasOwnProperty("account") &&
            response.hasOwnProperty("scope") &&
            response.hasOwnProperty("expires_in")) {
            return response;
        }
        else {
            throw createAuthError(unexpectedError, "Response missing expected properties.");
        }
    }
    /**
     * Returns the Id for the browser extension this handler is communicating with
     * @returns
     */
    getExtensionId() {
        return this.extensionId;
    }
    /**
     * Returns the version for the browser extension this handler is communicating with
     * @returns
     */
    getExtensionVersion() {
        return this.extensionVersion;
    }
    getExtensionName() {
        return this.getExtensionId() ===
            PlatformAuthConstants.PREFERRED_EXTENSION_ID
            ? "chrome"
            : this.getExtensionId()?.length
                ? "unknown"
                : undefined;
    }
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
class PlatformAuthDOMHandler {
    constructor(logger, performanceClient, correlationId) {
        this.logger = logger;
        this.performanceClient = performanceClient;
        this.correlationId = correlationId;
        this.platformAuthType = PlatformAuthConstants.PLATFORM_DOM_PROVIDER;
    }
    static async createProvider(logger, performanceClient, correlationId) {
        logger.trace("PlatformAuthDOMHandler: createProvider called");
        // @ts-ignore
        if (window.navigator?.platformAuthentication) {
            const supportedContracts = 
            // @ts-ignore
            await window.navigator.platformAuthentication.getSupportedContracts(PlatformAuthConstants.MICROSOFT_ENTRA_BROKERID);
            if (supportedContracts?.includes(PlatformAuthConstants.PLATFORM_DOM_APIS)) {
                logger.trace("Platform auth api available in DOM");
                return new PlatformAuthDOMHandler(logger, performanceClient, correlationId);
            }
        }
        return undefined;
    }
    /**
     * Returns the Id for the broker extension this handler is communicating with
     * @returns
     */
    getExtensionId() {
        return PlatformAuthConstants.MICROSOFT_ENTRA_BROKERID;
    }
    getExtensionVersion() {
        return "";
    }
    getExtensionName() {
        return PlatformAuthConstants.DOM_API_NAME;
    }
    /**
     * Send token request to platform broker via browser DOM API
     * @param request
     * @returns
     */
    async sendMessage(request) {
        this.logger.trace(this.platformAuthType + " - Sending request to browser DOM API");
        try {
            const platformDOMRequest = this.initializePlatformDOMRequest(request);
            const response = 
            // @ts-ignore
            await window.navigator.platformAuthentication.executeGetToken(platformDOMRequest);
            return this.validatePlatformBrokerResponse(response);
        }
        catch (e) {
            this.logger.error(this.platformAuthType + " - executeGetToken DOM API error");
            throw e;
        }
    }
    initializePlatformDOMRequest(request) {
        this.logger.trace(this.platformAuthType + " - initializeNativeDOMRequest called");
        const { accountId, clientId, authority, scope, redirectUri, correlationId, state, storeInCache, embeddedClientId, extraParameters, ...remainingProperties } = request;
        const validExtraParameters = this.getDOMExtraParams(remainingProperties);
        const platformDOMRequest = {
            accountId: accountId,
            brokerId: this.getExtensionId(),
            authority: authority,
            clientId: clientId,
            correlationId: correlationId || this.correlationId,
            extraParameters: { ...extraParameters, ...validExtraParameters },
            isSecurityTokenService: false,
            redirectUri: redirectUri,
            scope: scope,
            state: state,
            storeInCache: storeInCache,
            embeddedClientId: embeddedClientId,
        };
        return platformDOMRequest;
    }
    validatePlatformBrokerResponse(response) {
        if (response.hasOwnProperty("isSuccess")) {
            if (response.hasOwnProperty("accessToken") &&
                response.hasOwnProperty("idToken") &&
                response.hasOwnProperty("clientInfo") &&
                response.hasOwnProperty("account") &&
                response.hasOwnProperty("scopes") &&
                response.hasOwnProperty("expiresIn")) {
                this.logger.trace(this.platformAuthType +
                    " - platform broker returned successful and valid response");
                return this.convertToPlatformBrokerResponse(response);
            }
            else if (response.hasOwnProperty("error")) {
                const errorResponse = response;
                if (errorResponse.isSuccess === false &&
                    errorResponse.error &&
                    errorResponse.error.code) {
                    this.logger.trace(this.platformAuthType +
                        " - platform broker returned error response");
                    throw createNativeAuthError(errorResponse.error.code, errorResponse.error.description, {
                        error: parseInt(errorResponse.error.errorCode),
                        protocol_error: errorResponse.error.protocolError,
                        status: errorResponse.error.status,
                        properties: errorResponse.error.properties,
                    });
                }
            }
        }
        throw createAuthError(unexpectedError, "Response missing expected properties.");
    }
    convertToPlatformBrokerResponse(response) {
        this.logger.trace(this.platformAuthType + " - convertToNativeResponse called");
        const nativeResponse = {
            access_token: response.accessToken,
            id_token: response.idToken,
            client_info: response.clientInfo,
            account: response.account,
            expires_in: response.expiresIn,
            scope: response.scopes,
            state: response.state || "",
            properties: response.properties || {},
            extendedLifetimeToken: response.extendedLifetimeToken ?? false,
            shr: response.proofOfPossessionPayload,
        };
        return nativeResponse;
    }
    getDOMExtraParams(extraParameters) {
        const stringifiedParams = Object.entries(extraParameters).reduce((record, [key, value]) => {
            record[key] = String(value);
            return record;
        }, {});
        const validExtraParams = {
            ...stringifiedParams,
        };
        return validExtraParams;
    }
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Checks if the platform broker is available in the current environment.
 * @param loggerOptions
 * @param perfClient
 * @returns
 */
async function isPlatformBrokerAvailable(loggerOptions, perfClient, correlationId, domConfig) {
    const logger = new Logger(loggerOptions || {}, name, version);
    logger.trace("isPlatformBrokerAvailable called");
    const performanceClient = perfClient || new StubPerformanceClient();
    if (typeof window === "undefined") {
        logger.trace("Non-browser environment detected, returning false");
        return false;
    }
    return !!(await getPlatformAuthProvider(logger, performanceClient, correlationId || createNewGuid(), undefined, domConfig));
}
async function getPlatformAuthProvider(logger, performanceClient, correlationId, nativeBrokerHandshakeTimeout, enablePlatformBrokerDOMSupport) {
    logger.trace("getPlatformAuthProvider called", correlationId);
    logger.trace("Has client allowed platform auth via DOM API: " +
        enablePlatformBrokerDOMSupport);
    let platformAuthProvider;
    try {
        if (enablePlatformBrokerDOMSupport) {
            // Check if DOM platform API is supported first
            platformAuthProvider = await PlatformAuthDOMHandler.createProvider(logger, performanceClient, correlationId);
        }
        if (!platformAuthProvider) {
            logger.trace("Platform auth via DOM API not available, checking for extension");
            /*
             * If DOM APIs are not available, check if browser extension is available.
             * Platform authentication via DOM APIs is preferred over extension APIs.
             */
            platformAuthProvider =
                await PlatformAuthExtensionHandler.createProvider(logger, nativeBrokerHandshakeTimeout ||
                    DEFAULT_NATIVE_BROKER_HANDSHAKE_TIMEOUT_MS, performanceClient);
        }
    }
    catch (e) {
        logger.trace("Platform auth not available", e);
    }
    return platformAuthProvider;
}
/**
 * Returns boolean indicating whether or not the request should attempt to use native broker
 * @param logger
 * @param config
 * @param platformAuthProvider
 * @param authenticationScheme
 */
function isPlatformAuthAllowed(config, logger, platformAuthProvider, authenticationScheme) {
    logger.trace("isPlatformAuthAllowed called");
    // throw an error if allowPlatformBroker is not enabled and allowPlatformBrokerWithDOM is enabled
    if (!config.system.allowPlatformBroker &&
        config.system.allowPlatformBrokerWithDOM) {
        throw createClientConfigurationError(invalidPlatformBrokerConfiguration);
    }
    if (!config.system.allowPlatformBroker) {
        logger.trace("isPlatformAuthAllowed: allowPlatformBroker is not enabled, returning false");
        // Developer disabled WAM
        return false;
    }
    if (!platformAuthProvider) {
        logger.trace("isPlatformAuthAllowed: Platform auth provider is not initialized, returning false");
        // Platform broker auth providers are not available
        return false;
    }
    if (authenticationScheme) {
        switch (authenticationScheme) {
            case AuthenticationScheme.BEARER:
            case AuthenticationScheme.POP:
                logger.trace("isPlatformAuthAllowed: authenticationScheme is supported, returning true");
                return true;
            default:
                logger.trace("isPlatformAuthAllowed: authenticationScheme is not supported, returning false");
                return false;
        }
    }
    return true;
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
class PopupClient extends StandardInteractionClient {
    constructor(config, storageImpl, browserCrypto, logger, eventHandler, navigationClient, performanceClient, nativeStorageImpl, platformAuthHandler, correlationId) {
        super(config, storageImpl, browserCrypto, logger, eventHandler, navigationClient, performanceClient, platformAuthHandler, correlationId);
        // Properly sets this reference for the unload event.
        this.unloadWindow = this.unloadWindow.bind(this);
        this.nativeStorage = nativeStorageImpl;
        this.eventHandler = eventHandler;
    }
    /**
     * Acquires tokens by opening a popup window to the /authorize endpoint of the authority
     * @param request
     * @param pkceCodes
     */
    acquireToken(request, pkceCodes) {
        let popupParams = undefined;
        try {
            const popupName = this.generatePopupName(request.scopes || OIDC_DEFAULT_SCOPES, request.authority || this.config.auth.authority);
            popupParams = {
                popupName,
                popupWindowAttributes: request.popupWindowAttributes || {},
                popupWindowParent: request.popupWindowParent ?? window,
            };
            this.performanceClient.addFields({ isAsyncPopup: this.config.system.asyncPopups }, this.correlationId);
            // asyncPopups flag is true. Acquires token without first opening popup. Popup will be opened later asynchronously.
            if (this.config.system.asyncPopups) {
                this.logger.verbose("asyncPopups set to true, acquiring token");
                // Passes on popup position and dimensions if in request
                return this.acquireTokenPopupAsync(request, popupParams, pkceCodes);
            }
            else {
                // Pre-validate request method to avoid opening popup if the request is invalid
                const validatedRequest = {
                    ...request,
                    httpMethod: validateRequestMethod(request, this.config.auth.protocolMode),
                };
                // asyncPopups flag is set to false. Opens popup before acquiring token.
                this.logger.verbose("asyncPopup set to false, opening popup before acquiring token");
                popupParams.popup = this.openSizedPopup("about:blank", popupParams);
                return this.acquireTokenPopupAsync(validatedRequest, popupParams, pkceCodes);
            }
        }
        catch (e) {
            return Promise.reject(e);
        }
    }
    /**
     * Clears local cache for the current user then opens a popup window prompting the user to sign-out of the server
     * @param logoutRequest
     */
    logout(logoutRequest) {
        try {
            this.logger.verbose("logoutPopup called");
            const validLogoutRequest = this.initializeLogoutRequest(logoutRequest);
            const popupParams = {
                popupName: this.generateLogoutPopupName(validLogoutRequest),
                popupWindowAttributes: logoutRequest?.popupWindowAttributes || {},
                popupWindowParent: logoutRequest?.popupWindowParent ?? window,
            };
            const authority = logoutRequest && logoutRequest.authority;
            const mainWindowRedirectUri = logoutRequest && logoutRequest.mainWindowRedirectUri;
            // asyncPopups flag is true. Acquires token without first opening popup. Popup will be opened later asynchronously.
            if (this.config.system.asyncPopups) {
                this.logger.verbose("asyncPopups set to true");
                // Passes on popup position and dimensions if in request
                return this.logoutPopupAsync(validLogoutRequest, popupParams, authority, mainWindowRedirectUri);
            }
            else {
                // asyncPopups flag is set to false. Opens popup before logging out.
                this.logger.verbose("asyncPopup set to false, opening popup");
                popupParams.popup = this.openSizedPopup("about:blank", popupParams);
                return this.logoutPopupAsync(validLogoutRequest, popupParams, authority, mainWindowRedirectUri);
            }
        }
        catch (e) {
            // Since this function is synchronous we need to reject
            return Promise.reject(e);
        }
    }
    /**
     * Helper which obtains an access_token for your API via opening a popup window in the user's browser
     * @param request
     * @param popupParams
     * @param pkceCodes
     *
     * @returns A promise that is fulfilled when this function has completed, or rejected if an error was raised.
     */
    async acquireTokenPopupAsync(request, popupParams, pkceCodes) {
        this.logger.verbose("acquireTokenPopupAsync called");
        const validRequest = await invokeAsync(this.initializeAuthorizationRequest.bind(this), PerformanceEvents.StandardInteractionClientInitializeAuthorizationRequest, this.logger, this.performanceClient, this.correlationId)(request, exports.InteractionType.Popup);
        /*
         * Skip pre-connect for async popups to reduce time between user interaction and popup window creation to avoid
         * popup from being blocked by browsers with shorter popup timers
         */
        if (popupParams.popup) {
            preconnect(validRequest.authority);
        }
        const isPlatformBroker = isPlatformAuthAllowed(this.config, this.logger, this.platformAuthProvider, request.authenticationScheme);
        validRequest.platformBroker = isPlatformBroker;
        if (this.config.auth.protocolMode === ProtocolMode.EAR) {
            return this.executeEarFlow(validRequest, popupParams, pkceCodes);
        }
        else {
            return this.executeCodeFlow(validRequest, popupParams, pkceCodes);
        }
    }
    /**
     * Executes auth code + PKCE flow
     * @param request
     * @param popupParams
     * @param pkceCodes
     * @returns
     */
    async executeCodeFlow(request, popupParams, pkceCodes) {
        const correlationId = request.correlationId;
        const serverTelemetryManager = this.initializeServerTelemetryManager(ApiId.acquireTokenPopup);
        const pkce = pkceCodes ||
            (await invokeAsync(generatePkceCodes, PerformanceEvents.GeneratePkceCodes, this.logger, this.performanceClient, correlationId)(this.performanceClient, this.logger, correlationId));
        const popupRequest = {
            ...request,
            codeChallenge: pkce.challenge,
        };
        try {
            // Initialize the client
            const authClient = await invokeAsync(this.createAuthCodeClient.bind(this), PerformanceEvents.StandardInteractionClientCreateAuthCodeClient, this.logger, this.performanceClient, correlationId)({
                serverTelemetryManager,
                requestAuthority: popupRequest.authority,
                requestAzureCloudOptions: popupRequest.azureCloudOptions,
                requestExtraQueryParameters: popupRequest.extraQueryParameters,
                account: popupRequest.account,
            });
            if (popupRequest.httpMethod === HttpMethod.POST) {
                return await this.executeCodeFlowWithPost(popupRequest, popupParams, authClient, pkce.verifier);
            }
            else {
                // Create acquire token url.
                const navigateUrl = await invokeAsync(getAuthCodeRequestUrl, PerformanceEvents.GetAuthCodeUrl, this.logger, this.performanceClient, correlationId)(this.config, authClient.authority, popupRequest, this.logger, this.performanceClient);
                // Show the UI once the url has been created. Get the window handle for the popup.
                const popupWindow = this.initiateAuthRequest(navigateUrl, popupParams);
                this.eventHandler.emitEvent(EventType.POPUP_OPENED, exports.InteractionType.Popup, { popupWindow }, null);
                // Monitor the window for the hash. Return the string value and close the popup when the hash is received. Default timeout is 60 seconds.
                const responseString = await this.monitorPopupForHash(popupWindow, popupParams.popupWindowParent);
                const serverParams = invoke(deserializeResponse, PerformanceEvents.DeserializeResponse, this.logger, this.performanceClient, this.correlationId)(responseString, this.config.auth.OIDCOptions.serverResponseType, this.logger);
                return await invokeAsync(handleResponseCode, PerformanceEvents.HandleResponseCode, this.logger, this.performanceClient, correlationId)(request, serverParams, pkce.verifier, ApiId.acquireTokenPopup, this.config, authClient, this.browserStorage, this.nativeStorage, this.eventHandler, this.logger, this.performanceClient, this.platformAuthProvider);
            }
        }
        catch (e) {
            // Close the synchronous popup if an error is thrown before the window unload event is registered
            popupParams.popup?.close();
            if (e instanceof AuthError) {
                e.setCorrelationId(this.correlationId);
                serverTelemetryManager.cacheFailedRequest(e);
            }
            throw e;
        }
    }
    /**
     * Executes EAR flow
     * @param request
     */
    async executeEarFlow(request, popupParams, pkceCodes) {
        const correlationId = request.correlationId;
        // Get the frame handle for the silent request
        const discoveredAuthority = await invokeAsync(this.getDiscoveredAuthority.bind(this), PerformanceEvents.StandardInteractionClientGetDiscoveredAuthority, this.logger, this.performanceClient, correlationId)({
            requestAuthority: request.authority,
            requestAzureCloudOptions: request.azureCloudOptions,
            requestExtraQueryParameters: request.extraQueryParameters,
            account: request.account,
        });
        const earJwk = await invokeAsync(generateEarKey, PerformanceEvents.GenerateEarKey, this.logger, this.performanceClient, correlationId)();
        const pkce = pkceCodes ||
            (await invokeAsync(generatePkceCodes, PerformanceEvents.GeneratePkceCodes, this.logger, this.performanceClient, correlationId)(this.performanceClient, this.logger, correlationId));
        const popupRequest = {
            ...request,
            earJwk: earJwk,
            codeChallenge: pkce.challenge,
        };
        const popupWindow = popupParams.popup || this.openPopup("about:blank", popupParams);
        const form = await getEARForm(popupWindow.document, this.config, discoveredAuthority, popupRequest, this.logger, this.performanceClient);
        form.submit();
        // Monitor the popup for the hash. Return the string value and close the popup when the hash is received. Default timeout is 60 seconds.
        const responseString = await invokeAsync(this.monitorPopupForHash.bind(this), PerformanceEvents.SilentHandlerMonitorIframeForHash, this.logger, this.performanceClient, correlationId)(popupWindow, popupParams.popupWindowParent);
        const serverParams = invoke(deserializeResponse, PerformanceEvents.DeserializeResponse, this.logger, this.performanceClient, this.correlationId)(responseString, this.config.auth.OIDCOptions.serverResponseType, this.logger);
        if (!serverParams.ear_jwe && serverParams.code) {
            const authClient = await invokeAsync(this.createAuthCodeClient.bind(this), PerformanceEvents.StandardInteractionClientCreateAuthCodeClient, this.logger, this.performanceClient, correlationId)({
                serverTelemetryManager: this.initializeServerTelemetryManager(ApiId.acquireTokenPopup),
                requestAuthority: request.authority,
                requestAzureCloudOptions: request.azureCloudOptions,
                requestExtraQueryParameters: request.extraQueryParameters,
                account: request.account,
                authority: discoveredAuthority,
            });
            return invokeAsync(handleResponseCode, PerformanceEvents.HandleResponseCode, this.logger, this.performanceClient, correlationId)(popupRequest, serverParams, pkce.verifier, ApiId.acquireTokenPopup, this.config, authClient, this.browserStorage, this.nativeStorage, this.eventHandler, this.logger, this.performanceClient, this.platformAuthProvider);
        }
        else {
            return invokeAsync(handleResponseEAR, PerformanceEvents.HandleResponseEar, this.logger, this.performanceClient, correlationId)(popupRequest, serverParams, ApiId.acquireTokenPopup, this.config, discoveredAuthority, this.browserStorage, this.nativeStorage, this.eventHandler, this.logger, this.performanceClient, this.platformAuthProvider);
        }
    }
    async executeCodeFlowWithPost(request, popupParams, authClient, pkceVerifier) {
        const correlationId = request.correlationId;
        // Get the frame handle for the silent request
        const discoveredAuthority = await invokeAsync(this.getDiscoveredAuthority.bind(this), PerformanceEvents.StandardInteractionClientGetDiscoveredAuthority, this.logger, this.performanceClient, correlationId)({
            requestAuthority: request.authority,
            requestAzureCloudOptions: request.azureCloudOptions,
            requestExtraQueryParameters: request.extraQueryParameters,
            account: request.account,
        });
        const popupWindow = popupParams.popup || this.openPopup("about:blank", popupParams);
        const form = await getCodeForm(popupWindow.document, this.config, discoveredAuthority, request, this.logger, this.performanceClient);
        form.submit();
        // Monitor the popup for the hash. Return the string value and close the popup when the hash is received. Default timeout is 60 seconds.
        const responseString = await invokeAsync(this.monitorPopupForHash.bind(this), PerformanceEvents.SilentHandlerMonitorIframeForHash, this.logger, this.performanceClient, correlationId)(popupWindow, popupParams.popupWindowParent);
        const serverParams = invoke(deserializeResponse, PerformanceEvents.DeserializeResponse, this.logger, this.performanceClient, this.correlationId)(responseString, this.config.auth.OIDCOptions.serverResponseType, this.logger);
        return invokeAsync(handleResponseCode, PerformanceEvents.HandleResponseCode, this.logger, this.performanceClient, correlationId)(request, serverParams, pkceVerifier, ApiId.acquireTokenPopup, this.config, authClient, this.browserStorage, this.nativeStorage, this.eventHandler, this.logger, this.performanceClient, this.platformAuthProvider);
    }
    /**
     *
     * @param validRequest
     * @param popupName
     * @param requestAuthority
     * @param popup
     * @param mainWindowRedirectUri
     * @param popupWindowAttributes
     */
    async logoutPopupAsync(validRequest, popupParams, requestAuthority, mainWindowRedirectUri) {
        this.logger.verbose("logoutPopupAsync called");
        this.eventHandler.emitEvent(EventType.LOGOUT_START, exports.InteractionType.Popup, validRequest);
        const serverTelemetryManager = this.initializeServerTelemetryManager(ApiId.logoutPopup);
        try {
            // Clear cache on logout
            await this.clearCacheOnLogout(this.correlationId, validRequest.account);
            // Initialize the client
            const authClient = await invokeAsync(this.createAuthCodeClient.bind(this), PerformanceEvents.StandardInteractionClientCreateAuthCodeClient, this.logger, this.performanceClient, this.correlationId)({
                serverTelemetryManager,
                requestAuthority: requestAuthority,
                account: validRequest.account || undefined,
            });
            try {
                authClient.authority.endSessionEndpoint;
            }
            catch {
                if (validRequest.account?.homeAccountId &&
                    validRequest.postLogoutRedirectUri &&
                    authClient.authority.protocolMode === ProtocolMode.OIDC) {
                    this.eventHandler.emitEvent(EventType.LOGOUT_SUCCESS, exports.InteractionType.Popup, validRequest);
                    if (mainWindowRedirectUri) {
                        const navigationOptions = {
                            apiId: ApiId.logoutPopup,
                            timeout: this.config.system.redirectNavigationTimeout,
                            noHistory: false,
                        };
                        const absoluteUrl = UrlString.getAbsoluteUrl(mainWindowRedirectUri, getCurrentUri());
                        await this.navigationClient.navigateInternal(absoluteUrl, navigationOptions);
                    }
                    popupParams.popup?.close();
                    return;
                }
            }
            // Create logout string and navigate user window to logout.
            const logoutUri = authClient.getLogoutUri(validRequest);
            this.eventHandler.emitEvent(EventType.LOGOUT_SUCCESS, exports.InteractionType.Popup, validRequest);
            // Open the popup window to requestUrl.
            const popupWindow = this.openPopup(logoutUri, popupParams);
            this.eventHandler.emitEvent(EventType.POPUP_OPENED, exports.InteractionType.Popup, { popupWindow }, null);
            await this.monitorPopupForHash(popupWindow, popupParams.popupWindowParent).catch(() => {
                // Swallow any errors related to monitoring the window. Server logout is best effort
            });
            if (mainWindowRedirectUri) {
                const navigationOptions = {
                    apiId: ApiId.logoutPopup,
                    timeout: this.config.system.redirectNavigationTimeout,
                    noHistory: false,
                };
                const absoluteUrl = UrlString.getAbsoluteUrl(mainWindowRedirectUri, getCurrentUri());
                this.logger.verbose("Redirecting main window to url specified in the request");
                this.logger.verbosePii(`Redirecting main window to: ${absoluteUrl}`);
                await this.navigationClient.navigateInternal(absoluteUrl, navigationOptions);
            }
            else {
                this.logger.verbose("No main window navigation requested");
            }
        }
        catch (e) {
            // Close the synchronous popup if an error is thrown before the window unload event is registered
            popupParams.popup?.close();
            if (e instanceof AuthError) {
                e.setCorrelationId(this.correlationId);
                serverTelemetryManager.cacheFailedRequest(e);
            }
            this.eventHandler.emitEvent(EventType.LOGOUT_FAILURE, exports.InteractionType.Popup, null, e);
            this.eventHandler.emitEvent(EventType.LOGOUT_END, exports.InteractionType.Popup);
            throw e;
        }
        this.eventHandler.emitEvent(EventType.LOGOUT_END, exports.InteractionType.Popup);
    }
    /**
     * Opens a popup window with given request Url.
     * @param requestUrl
     */
    initiateAuthRequest(requestUrl, params) {
        // Check that request url is not empty.
        if (requestUrl) {
            this.logger.infoPii(`Navigate to: ${requestUrl}`);
            // Open the popup window to requestUrl.
            return this.openPopup(requestUrl, params);
        }
        else {
            // Throw error if request URL is empty.
            this.logger.error("Navigate url is empty");
            throw createBrowserAuthError(emptyNavigateUri);
        }
    }
    /**
     * Monitors a window until it loads a url with the same origin.
     * @param popupWindow - window that is being monitored
     * @param timeout - timeout for processing hash once popup is redirected back to application
     */
    monitorPopupForHash(popupWindow, popupWindowParent) {
        return new Promise((resolve, reject) => {
            this.logger.verbose("PopupHandler.monitorPopupForHash - polling started");
            const intervalId = setInterval(() => {
                // Window is closed
                if (popupWindow.closed) {
                    this.logger.error("PopupHandler.monitorPopupForHash - window closed");
                    clearInterval(intervalId);
                    reject(createBrowserAuthError(userCancelled));
                    return;
                }
                let href = "";
                try {
                    /*
                     * Will throw if cross origin,
                     * which should be caught and ignored
                     * since we need the interval to keep running while on STS UI.
                     */
                    href = popupWindow.location.href;
                }
                catch (e) { }
                // Don't process blank pages or cross domain
                if (!href || href === "about:blank") {
                    return;
                }
                clearInterval(intervalId);
                let responseString = "";
                const responseType = this.config.auth.OIDCOptions.serverResponseType;
                if (popupWindow) {
                    if (responseType === ServerResponseType.QUERY) {
                        responseString = popupWindow.location.search;
                    }
                    else {
                        responseString = popupWindow.location.hash;
                    }
                }
                this.logger.verbose("PopupHandler.monitorPopupForHash - popup window is on same origin as caller");
                resolve(responseString);
            }, this.config.system.pollIntervalMilliseconds);
        }).finally(() => {
            this.cleanPopup(popupWindow, popupWindowParent);
        });
    }
    /**
     * @hidden
     *
     * Configures popup window for login.
     *
     * @param urlNavigate
     * @param title
     * @param popUpWidth
     * @param popUpHeight
     * @param popupWindowAttributes
     * @ignore
     * @hidden
     */
    openPopup(urlNavigate, popupParams) {
        try {
            let popupWindow;
            // Popup window passed in, setting url to navigate to
            if (popupParams.popup) {
                popupWindow = popupParams.popup;
                this.logger.verbosePii(`Navigating popup window to: ${urlNavigate}`);
                popupWindow.location.assign(urlNavigate);
            }
            else if (typeof popupParams.popup === "undefined") {
                // Popup will be undefined if it was not passed in
                this.logger.verbosePii(`Opening popup window to: ${urlNavigate}`);
                popupWindow = this.openSizedPopup(urlNavigate, popupParams);
            }
            // Popup will be null if popups are blocked
            if (!popupWindow) {
                throw createBrowserAuthError(emptyWindowError);
            }
            if (popupWindow.focus) {
                popupWindow.focus();
            }
            this.currentWindow = popupWindow;
            popupParams.popupWindowParent.addEventListener("beforeunload", this.unloadWindow);
            return popupWindow;
        }
        catch (e) {
            this.logger.error("error opening popup " + e.message);
            throw createBrowserAuthError(popupWindowError);
        }
    }
    /**
     * Helper function to set popup window dimensions and position
     * @param urlNavigate
     * @param popupName
     * @param popupWindowAttributes
     * @returns
     */
    openSizedPopup(urlNavigate, { popupName, popupWindowAttributes, popupWindowParent }) {
        /**
         * adding winLeft and winTop to account for dual monitor
         * using screenLeft and screenTop for IE8 and earlier
         */
        const winLeft = popupWindowParent.screenLeft
            ? popupWindowParent.screenLeft
            : popupWindowParent.screenX;
        const winTop = popupWindowParent.screenTop
            ? popupWindowParent.screenTop
            : popupWindowParent.screenY;
        /**
         * window.innerWidth displays browser window"s height and width excluding toolbars
         * using document.documentElement.clientWidth for IE8 and earlier
         */
        const winWidth = popupWindowParent.innerWidth ||
            document.documentElement.clientWidth ||
            document.body.clientWidth;
        const winHeight = popupWindowParent.innerHeight ||
            document.documentElement.clientHeight ||
            document.body.clientHeight;
        let width = popupWindowAttributes.popupSize?.width;
        let height = popupWindowAttributes.popupSize?.height;
        let top = popupWindowAttributes.popupPosition?.top;
        let left = popupWindowAttributes.popupPosition?.left;
        if (!width || width < 0 || width > winWidth) {
            this.logger.verbose("Default popup window width used. Window width not configured or invalid.");
            width = BrowserConstants.POPUP_WIDTH;
        }
        if (!height || height < 0 || height > winHeight) {
            this.logger.verbose("Default popup window height used. Window height not configured or invalid.");
            height = BrowserConstants.POPUP_HEIGHT;
        }
        if (!top || top < 0 || top > winHeight) {
            this.logger.verbose("Default popup window top position used. Window top not configured or invalid.");
            top = Math.max(0, winHeight / 2 - BrowserConstants.POPUP_HEIGHT / 2 + winTop);
        }
        if (!left || left < 0 || left > winWidth) {
            this.logger.verbose("Default popup window left position used. Window left not configured or invalid.");
            left = Math.max(0, winWidth / 2 - BrowserConstants.POPUP_WIDTH / 2 + winLeft);
        }
        return popupWindowParent.open(urlNavigate, popupName, `width=${width}, height=${height}, top=${top}, left=${left}, scrollbars=yes`);
    }
    /**
     * Event callback to unload main window.
     */
    unloadWindow(e) {
        if (this.currentWindow) {
            this.currentWindow.close();
        }
        // Guarantees browser unload will happen, so no other errors will be thrown.
        e.preventDefault();
    }
    /**
     * Closes popup, removes any state vars created during popup calls.
     * @param popupWindow
     */
    cleanPopup(popupWindow, popupWindowParent) {
        // Close window.
        popupWindow.close();
        // Remove window unload function
        popupWindowParent.removeEventListener("beforeunload", this.unloadWindow);
    }
    /**
     * Generates the name for the popup based on the client id and request
     * @param clientId
     * @param request
     */
    generatePopupName(scopes, authority) {
        return `${BrowserConstants.POPUP_NAME_PREFIX}.${this.config.auth.clientId}.${scopes.join("-")}.${authority}.${this.correlationId}`;
    }
    /**
     * Generates the name for the popup based on the client id and request for logouts
     * @param clientId
     * @param request
     */
    generateLogoutPopupName(request) {
        const homeAccountId = request.account && request.account.homeAccountId;
        return `${BrowserConstants.POPUP_NAME_PREFIX}.${this.config.auth.clientId}.${homeAccountId}.${this.correlationId}`;
    }
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
function getNavigationType() {
    if (typeof window === "undefined" ||
        typeof window.performance === "undefined" ||
        typeof window.performance.getEntriesByType !== "function") {
        return undefined;
    }
    const navigationEntries = window.performance.getEntriesByType("navigation");
    const navigation = navigationEntries.length
        ? navigationEntries[0]
        : undefined;
    return navigation?.type;
}
class RedirectClient extends StandardInteractionClient {
    constructor(config, storageImpl, browserCrypto, logger, eventHandler, navigationClient, performanceClient, nativeStorageImpl, platformAuthHandler, correlationId) {
        super(config, storageImpl, browserCrypto, logger, eventHandler, navigationClient, performanceClient, platformAuthHandler, correlationId);
        this.nativeStorage = nativeStorageImpl;
    }
    /**
     * Redirects the page to the /authorize endpoint of the IDP
     * @param request
     */
    async acquireToken(request) {
        const validRequest = await invokeAsync(this.initializeAuthorizationRequest.bind(this), PerformanceEvents.StandardInteractionClientInitializeAuthorizationRequest, this.logger, this.performanceClient, this.correlationId)(request, exports.InteractionType.Redirect);
        validRequest.platformBroker = isPlatformAuthAllowed(this.config, this.logger, this.platformAuthProvider, request.authenticationScheme);
        const handleBackButton = (event) => {
            // Clear temporary cache if the back button is clicked during the redirect flow.
            if (event.persisted) {
                this.logger.verbose("Page was restored from back/forward cache. Clearing temporary cache.");
                this.browserStorage.resetRequestCache();
                this.eventHandler.emitEvent(EventType.RESTORE_FROM_BFCACHE, exports.InteractionType.Redirect);
            }
        };
        const redirectStartPage = this.getRedirectStartPage(request.redirectStartPage);
        this.logger.verbosePii(`Redirect start page: ${redirectStartPage}`);
        // Cache start page, returns to this page after redirectUri if navigateToLoginRequestUrl is true
        this.browserStorage.setTemporaryCache(TemporaryCacheKeys.ORIGIN_URI, redirectStartPage, true);
        // Clear temporary cache if the back button is clicked during the redirect flow.
        window.addEventListener("pageshow", handleBackButton);
        try {
            if (this.config.auth.protocolMode === ProtocolMode.EAR) {
                await this.executeEarFlow(validRequest);
            }
            else {
                await this.executeCodeFlow(validRequest, request.onRedirectNavigate);
            }
        }
        catch (e) {
            if (e instanceof AuthError) {
                e.setCorrelationId(this.correlationId);
            }
            window.removeEventListener("pageshow", handleBackButton);
            throw e;
        }
    }
    /**
     * Executes auth code + PKCE flow
     * @param request
     * @returns
     */
    async executeCodeFlow(request, onRedirectNavigate) {
        const correlationId = request.correlationId;
        const serverTelemetryManager = this.initializeServerTelemetryManager(ApiId.acquireTokenRedirect);
        const pkceCodes = await invokeAsync(generatePkceCodes, PerformanceEvents.GeneratePkceCodes, this.logger, this.performanceClient, correlationId)(this.performanceClient, this.logger, correlationId);
        const redirectRequest = {
            ...request,
            codeChallenge: pkceCodes.challenge,
        };
        this.browserStorage.cacheAuthorizeRequest(redirectRequest, pkceCodes.verifier);
        try {
            if (redirectRequest.httpMethod === HttpMethod.POST) {
                return await this.executeCodeFlowWithPost(redirectRequest);
            }
            else {
                // Initialize the client
                const authClient = await invokeAsync(this.createAuthCodeClient.bind(this), PerformanceEvents.StandardInteractionClientCreateAuthCodeClient, this.logger, this.performanceClient, this.correlationId)({
                    serverTelemetryManager,
                    requestAuthority: redirectRequest.authority,
                    requestAzureCloudOptions: redirectRequest.azureCloudOptions,
                    requestExtraQueryParameters: redirectRequest.extraQueryParameters,
                    account: redirectRequest.account,
                });
                // Create acquire token url.
                const navigateUrl = await invokeAsync(getAuthCodeRequestUrl, PerformanceEvents.GetAuthCodeUrl, this.logger, this.performanceClient, request.correlationId)(this.config, authClient.authority, redirectRequest, this.logger, this.performanceClient);
                // Show the UI once the url has been created. Response will come back in the hash, which will be handled in the handleRedirectCallback function.
                return await this.initiateAuthRequest(navigateUrl, onRedirectNavigate);
            }
        }
        catch (e) {
            if (e instanceof AuthError) {
                e.setCorrelationId(this.correlationId);
                serverTelemetryManager.cacheFailedRequest(e);
            }
            throw e;
        }
    }
    /**
     * Executes EAR flow
     * @param request
     */
    async executeEarFlow(request) {
        const correlationId = request.correlationId;
        // Get the frame handle for the silent request
        const discoveredAuthority = await invokeAsync(this.getDiscoveredAuthority.bind(this), PerformanceEvents.StandardInteractionClientGetDiscoveredAuthority, this.logger, this.performanceClient, correlationId)({
            requestAuthority: request.authority,
            requestAzureCloudOptions: request.azureCloudOptions,
            requestExtraQueryParameters: request.extraQueryParameters,
            account: request.account,
        });
        const earJwk = await invokeAsync(generateEarKey, PerformanceEvents.GenerateEarKey, this.logger, this.performanceClient, correlationId)();
        const pkceCodes = await invokeAsync(generatePkceCodes, PerformanceEvents.GeneratePkceCodes, this.logger, this.performanceClient, correlationId)(this.performanceClient, this.logger, correlationId);
        const redirectRequest = {
            ...request,
            earJwk: earJwk,
            codeChallenge: pkceCodes.challenge,
        };
        this.browserStorage.cacheAuthorizeRequest(redirectRequest, pkceCodes.verifier);
        const form = await getEARForm(document, this.config, discoveredAuthority, redirectRequest, this.logger, this.performanceClient);
        form.submit();
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                reject(createBrowserAuthError(timedOut, "failed_to_redirect"));
            }, this.config.system.redirectNavigationTimeout);
        });
    }
    /**
     * Executes classic Authorization Code flow with a POST request.
     * @param request
     */
    async executeCodeFlowWithPost(request) {
        const correlationId = request.correlationId;
        // Get the frame handle for the silent request
        const discoveredAuthority = await invokeAsync(this.getDiscoveredAuthority.bind(this), PerformanceEvents.StandardInteractionClientGetDiscoveredAuthority, this.logger, this.performanceClient, correlationId)({
            requestAuthority: request.authority,
            requestAzureCloudOptions: request.azureCloudOptions,
            requestExtraQueryParameters: request.extraQueryParameters,
            account: request.account,
        });
        this.browserStorage.cacheAuthorizeRequest(request);
        const form = await getCodeForm(document, this.config, discoveredAuthority, request, this.logger, this.performanceClient);
        form.submit();
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                reject(createBrowserAuthError(timedOut, "failed_to_redirect"));
            }, this.config.system.redirectNavigationTimeout);
        });
    }
    /**
     * Checks if navigateToLoginRequestUrl is set, and:
     * - if true, performs logic to cache and navigate
     * - if false, handles hash string and parses response
     * @param hash {string} url hash
     * @param parentMeasurement {InProgressPerformanceEvent} parent measurement
     */
    async handleRedirectPromise(hash = "", request, pkceVerifier, parentMeasurement) {
        const serverTelemetryManager = this.initializeServerTelemetryManager(ApiId.handleRedirectPromise);
        try {
            const [serverParams, responseString] = this.getRedirectResponse(hash || "");
            if (!serverParams) {
                // Not a recognized server response hash or hash not associated with a redirect request
                this.logger.info("handleRedirectPromise did not detect a response as a result of a redirect. Cleaning temporary cache.");
                this.browserStorage.resetRequestCache();
                // Do not instrument "no_server_response" if user clicked back button
                if (getNavigationType() !== "back_forward") {
                    parentMeasurement.event.errorCode = "no_server_response";
                }
                else {
                    this.logger.verbose("Back navigation event detected. Muting no_server_response error");
                }
                return null;
            }
            // If navigateToLoginRequestUrl is true, get the url where the redirect request was initiated
            const loginRequestUrl = this.browserStorage.getTemporaryCache(TemporaryCacheKeys.ORIGIN_URI, true) || Constants.EMPTY_STRING;
            const loginRequestUrlNormalized = normalizeUrlForComparison(loginRequestUrl);
            const currentUrlNormalized = normalizeUrlForComparison(window.location.href);
            if (loginRequestUrlNormalized === currentUrlNormalized &&
                this.config.auth.navigateToLoginRequestUrl) {
                // We are on the page we need to navigate to - handle hash
                this.logger.verbose("Current page is loginRequestUrl, handling response");
                if (loginRequestUrl.indexOf("#") > -1) {
                    // Replace current hash with non-msal hash, if present
                    replaceHash(loginRequestUrl);
                }
                const handleHashResult = await this.handleResponse(serverParams, request, pkceVerifier, serverTelemetryManager);
                return handleHashResult;
            }
            else if (!this.config.auth.navigateToLoginRequestUrl) {
                this.logger.verbose("NavigateToLoginRequestUrl set to false, handling response");
                return await this.handleResponse(serverParams, request, pkceVerifier, serverTelemetryManager);
            }
            else if (!isInIframe() ||
                this.config.system.allowRedirectInIframe) {
                /*
                 * Returned from authority using redirect - need to perform navigation before processing response
                 * Cache the hash to be retrieved after the next redirect
                 */
                this.browserStorage.setTemporaryCache(TemporaryCacheKeys.URL_HASH, responseString, true);
                const navigationOptions = {
                    apiId: ApiId.handleRedirectPromise,
                    timeout: this.config.system.redirectNavigationTimeout,
                    noHistory: true,
                };
                /**
                 * Default behavior is to redirect to the start page and not process the hash now.
                 * The start page is expected to also call handleRedirectPromise which will process the hash in one of the checks above.
                 */
                let processHashOnRedirect = true;
                if (!loginRequestUrl || loginRequestUrl === "null") {
                    // Redirect to home page if login request url is null (real null or the string null)
                    const homepage = getHomepage();
                    // Cache the homepage under ORIGIN_URI to ensure cached hash is processed on homepage
                    this.browserStorage.setTemporaryCache(TemporaryCacheKeys.ORIGIN_URI, homepage, true);
                    this.logger.warning("Unable to get valid login request url from cache, redirecting to home page");
                    processHashOnRedirect =
                        await this.navigationClient.navigateInternal(homepage, navigationOptions);
                }
                else {
                    // Navigate to page that initiated the redirect request
                    this.logger.verbose(`Navigating to loginRequestUrl: ${loginRequestUrl}`);
                    processHashOnRedirect =
                        await this.navigationClient.navigateInternal(loginRequestUrl, navigationOptions);
                }
                // If navigateInternal implementation returns false, handle the hash now
                if (!processHashOnRedirect) {
                    return await this.handleResponse(serverParams, request, pkceVerifier, serverTelemetryManager);
                }
            }
            return null;
        }
        catch (e) {
            if (e instanceof AuthError) {
                e.setCorrelationId(this.correlationId);
                serverTelemetryManager.cacheFailedRequest(e);
            }
            throw e;
        }
    }
    /**
     * Gets the response hash for a redirect request
     * Returns null if interactionType in the state value is not "redirect" or the hash does not contain known properties
     * @param hash
     */
    getRedirectResponse(userProvidedResponse) {
        this.logger.verbose("getRedirectResponseHash called");
        // Get current location hash from window or cache.
        let responseString = userProvidedResponse;
        if (!responseString) {
            if (this.config.auth.OIDCOptions.serverResponseType ===
                ServerResponseType.QUERY) {
                responseString = window.location.search;
            }
            else {
                responseString = window.location.hash;
            }
        }
        let response = getDeserializedResponse(responseString);
        if (response) {
            try {
                validateInteractionType(response, this.browserCrypto, exports.InteractionType.Redirect);
            }
            catch (e) {
                if (e instanceof AuthError) {
                    this.logger.error(`Interaction type validation failed due to ${e.errorCode}: ${e.errorMessage}`);
                }
                return [null, ""];
            }
            clearHash(window);
            this.logger.verbose("Hash contains known properties, returning response hash");
            return [response, responseString];
        }
        const cachedHash = this.browserStorage.getTemporaryCache(TemporaryCacheKeys.URL_HASH, true);
        this.browserStorage.removeItem(this.browserStorage.generateCacheKey(TemporaryCacheKeys.URL_HASH));
        if (cachedHash) {
            response = getDeserializedResponse(cachedHash);
            if (response) {
                this.logger.verbose("Hash does not contain known properties, returning cached hash");
                return [response, cachedHash];
            }
        }
        return [null, ""];
    }
    /**
     * Checks if hash exists and handles in window.
     * @param hash
     * @param state
     */
    async handleResponse(serverParams, request, codeVerifier, serverTelemetryManager) {
        const state = serverParams.state;
        if (!state) {
            throw createBrowserAuthError(noStateInHash);
        }
        if (serverParams.ear_jwe) {
            const discoveredAuthority = await invokeAsync(this.getDiscoveredAuthority.bind(this), PerformanceEvents.StandardInteractionClientGetDiscoveredAuthority, this.logger, this.performanceClient, request.correlationId)({
                requestAuthority: request.authority,
                requestAzureCloudOptions: request.azureCloudOptions,
                requestExtraQueryParameters: request.extraQueryParameters,
                account: request.account,
            });
            return invokeAsync(handleResponseEAR, PerformanceEvents.HandleResponseEar, this.logger, this.performanceClient, request.correlationId)(request, serverParams, ApiId.acquireTokenRedirect, this.config, discoveredAuthority, this.browserStorage, this.nativeStorage, this.eventHandler, this.logger, this.performanceClient, this.platformAuthProvider);
        }
        const authClient = await invokeAsync(this.createAuthCodeClient.bind(this), PerformanceEvents.StandardInteractionClientCreateAuthCodeClient, this.logger, this.performanceClient, this.correlationId)({ serverTelemetryManager, requestAuthority: request.authority });
        return invokeAsync(handleResponseCode, PerformanceEvents.HandleResponseCode, this.logger, this.performanceClient, request.correlationId)(request, serverParams, codeVerifier, ApiId.acquireTokenRedirect, this.config, authClient, this.browserStorage, this.nativeStorage, this.eventHandler, this.logger, this.performanceClient, this.platformAuthProvider);
    }
    /**
     * Redirects window to given URL.
     * @param urlNavigate
     * @param onRedirectNavigateRequest - onRedirectNavigate callback provided on the request
     */
    async initiateAuthRequest(requestUrl, onRedirectNavigateRequest) {
        this.logger.verbose("RedirectHandler.initiateAuthRequest called");
        // Navigate if valid URL
        if (requestUrl) {
            this.logger.infoPii(`RedirectHandler.initiateAuthRequest: Navigate to: ${requestUrl}`);
            const navigationOptions = {
                apiId: ApiId.acquireTokenRedirect,
                timeout: this.config.system.redirectNavigationTimeout,
                noHistory: false,
            };
            const onRedirectNavigate = onRedirectNavigateRequest ||
                this.config.auth.onRedirectNavigate;
            // If onRedirectNavigate is implemented, invoke it and provide requestUrl
            if (typeof onRedirectNavigate === "function") {
                this.logger.verbose("RedirectHandler.initiateAuthRequest: Invoking onRedirectNavigate callback");
                const navigate = onRedirectNavigate(requestUrl);
                // Returning false from onRedirectNavigate will stop navigation
                if (navigate !== false) {
                    this.logger.verbose("RedirectHandler.initiateAuthRequest: onRedirectNavigate did not return false, navigating");
                    await this.navigationClient.navigateExternal(requestUrl, navigationOptions);
                    return;
                }
                else {
                    this.logger.verbose("RedirectHandler.initiateAuthRequest: onRedirectNavigate returned false, stopping navigation");
                    return;
                }
            }
            else {
                // Navigate window to request URL
                this.logger.verbose("RedirectHandler.initiateAuthRequest: Navigating window to navigate url");
                await this.navigationClient.navigateExternal(requestUrl, navigationOptions);
                return;
            }
        }
        else {
            // Throw error if request URL is empty.
            this.logger.info("RedirectHandler.initiateAuthRequest: Navigate url is empty");
            throw createBrowserAuthError(emptyNavigateUri);
        }
    }
    /**
     * Use to log out the current user, and redirect the user to the postLogoutRedirectUri.
     * Default behaviour is to redirect the user to `window.location.href`.
     * @param logoutRequest
     */
    async logout(logoutRequest) {
        this.logger.verbose("logoutRedirect called");
        const validLogoutRequest = this.initializeLogoutRequest(logoutRequest);
        const serverTelemetryManager = this.initializeServerTelemetryManager(ApiId.logout);
        try {
            this.eventHandler.emitEvent(EventType.LOGOUT_START, exports.InteractionType.Redirect, logoutRequest);
            // Clear cache on logout
            await this.clearCacheOnLogout(this.correlationId, validLogoutRequest.account);
            const navigationOptions = {
                apiId: ApiId.logout,
                timeout: this.config.system.redirectNavigationTimeout,
                noHistory: false,
            };
            const authClient = await invokeAsync(this.createAuthCodeClient.bind(this), PerformanceEvents.StandardInteractionClientCreateAuthCodeClient, this.logger, this.performanceClient, this.correlationId)({
                serverTelemetryManager,
                requestAuthority: logoutRequest && logoutRequest.authority,
                requestExtraQueryParameters: logoutRequest?.extraQueryParameters,
                account: (logoutRequest && logoutRequest.account) || undefined,
            });
            if (authClient.authority.protocolMode === ProtocolMode.OIDC) {
                try {
                    authClient.authority.endSessionEndpoint;
                }
                catch {
                    if (validLogoutRequest.account?.homeAccountId) {
                        this.eventHandler.emitEvent(EventType.LOGOUT_SUCCESS, exports.InteractionType.Redirect, validLogoutRequest);
                        return;
                    }
                }
            }
            // Create logout string and navigate user window to logout.
            const logoutUri = authClient.getLogoutUri(validLogoutRequest);
            this.eventHandler.emitEvent(EventType.LOGOUT_SUCCESS, exports.InteractionType.Redirect, validLogoutRequest);
            // Check if onRedirectNavigate is implemented, and invoke it if so
            if (logoutRequest &&
                typeof logoutRequest.onRedirectNavigate === "function") {
                const navigate = logoutRequest.onRedirectNavigate(logoutUri);
                if (navigate !== false) {
                    this.logger.verbose("Logout onRedirectNavigate did not return false, navigating");
                    // Ensure interaction is in progress
                    if (!this.browserStorage.getInteractionInProgress()) {
                        this.browserStorage.setInteractionInProgress(true, INTERACTION_TYPE.SIGNOUT);
                    }
                    await this.navigationClient.navigateExternal(logoutUri, navigationOptions);
                    return;
                }
                else {
                    // Ensure interaction is not in progress
                    this.browserStorage.setInteractionInProgress(false);
                    this.logger.verbose("Logout onRedirectNavigate returned false, stopping navigation");
                }
            }
            else {
                // Ensure interaction is in progress
                if (!this.browserStorage.getInteractionInProgress()) {
                    this.browserStorage.setInteractionInProgress(true, INTERACTION_TYPE.SIGNOUT);
                }
                await this.navigationClient.navigateExternal(logoutUri, navigationOptions);
                return;
            }
        }
        catch (e) {
            if (e instanceof AuthError) {
                e.setCorrelationId(this.correlationId);
                serverTelemetryManager.cacheFailedRequest(e);
            }
            this.eventHandler.emitEvent(EventType.LOGOUT_FAILURE, exports.InteractionType.Redirect, null, e);
            this.eventHandler.emitEvent(EventType.LOGOUT_END, exports.InteractionType.Redirect);
            throw e;
        }
        this.eventHandler.emitEvent(EventType.LOGOUT_END, exports.InteractionType.Redirect);
    }
    /**
     * Use to get the redirectStartPage either from request or use current window
     * @param requestStartPage
     */
    getRedirectStartPage(requestStartPage) {
        const redirectStartPage = requestStartPage || window.location.href;
        return UrlString.getAbsoluteUrl(redirectStartPage, getCurrentUri());
    }
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Creates a hidden iframe to given URL using user-requested scopes as an id.
 * @param urlNavigate
 * @param userRequestScopes
 */
async function initiateCodeRequest(requestUrl, performanceClient, logger, correlationId, navigateFrameWait) {
    performanceClient.addQueueMeasurement(PerformanceEvents.SilentHandlerInitiateAuthRequest, correlationId);
    if (!requestUrl) {
        // Throw error if request URL is empty.
        logger.info("Navigate url is empty");
        throw createBrowserAuthError(emptyNavigateUri);
    }
    if (navigateFrameWait) {
        return invokeAsync(loadFrame, PerformanceEvents.SilentHandlerLoadFrame, logger, performanceClient, correlationId)(requestUrl, navigateFrameWait, performanceClient, correlationId);
    }
    return invoke(loadFrameSync, PerformanceEvents.SilentHandlerLoadFrameSync, logger, performanceClient, correlationId)(requestUrl);
}
async function initiateCodeFlowWithPost(config, authority, request, logger, performanceClient) {
    const frame = createHiddenIframe();
    if (!frame.contentDocument) {
        throw "No document associated with iframe!";
    }
    const form = await getCodeForm(frame.contentDocument, config, authority, request, logger, performanceClient);
    form.submit();
    return frame;
}
async function initiateEarRequest(config, authority, request, logger, performanceClient) {
    const frame = createHiddenIframe();
    if (!frame.contentDocument) {
        throw "No document associated with iframe!";
    }
    const form = await getEARForm(frame.contentDocument, config, authority, request, logger, performanceClient);
    form.submit();
    return frame;
}
/**
 * Monitors an iframe content window until it loads a url with a known hash, or hits a specified timeout.
 * @param iframe
 * @param timeout
 */
async function monitorIframeForHash(iframe, timeout, pollIntervalMilliseconds, performanceClient, logger, correlationId, responseType) {
    performanceClient.addQueueMeasurement(PerformanceEvents.SilentHandlerMonitorIframeForHash, correlationId);
    return new Promise((resolve, reject) => {
        if (timeout < DEFAULT_IFRAME_TIMEOUT_MS) {
            logger.warning(`system.loadFrameTimeout or system.iframeHashTimeout set to lower (${timeout}ms) than the default (${DEFAULT_IFRAME_TIMEOUT_MS}ms). This may result in timeouts.`);
        }
        /*
         * Polling for iframes can be purely timing based,
         * since we don't need to account for interaction.
         */
        const timeoutId = window.setTimeout(() => {
            window.clearInterval(intervalId);
            reject(createBrowserAuthError(monitorWindowTimeout));
        }, timeout);
        const intervalId = window.setInterval(() => {
            let href = "";
            const contentWindow = iframe.contentWindow;
            try {
                /*
                 * Will throw if cross origin,
                 * which should be caught and ignored
                 * since we need the interval to keep running while on STS UI.
                 */
                href = contentWindow ? contentWindow.location.href : "";
            }
            catch (e) { }
            if (!href || href === "about:blank") {
                return;
            }
            let responseString = "";
            if (contentWindow) {
                if (responseType === ServerResponseType.QUERY) {
                    responseString = contentWindow.location.search;
                }
                else {
                    responseString = contentWindow.location.hash;
                }
            }
            window.clearTimeout(timeoutId);
            window.clearInterval(intervalId);
            resolve(responseString);
        }, pollIntervalMilliseconds);
    }).finally(() => {
        invoke(removeHiddenIframe, PerformanceEvents.RemoveHiddenIframe, logger, performanceClient, correlationId)(iframe);
    });
}
/**
 * @hidden
 * Loads iframe with authorization endpoint URL
 * @ignore
 * @deprecated
 */
function loadFrame(urlNavigate, navigateFrameWait, performanceClient, correlationId) {
    performanceClient.addQueueMeasurement(PerformanceEvents.SilentHandlerLoadFrame, correlationId);
    /*
     * This trick overcomes iframe navigation in IE
     * IE does not load the page consistently in iframe
     */
    return new Promise((resolve, reject) => {
        const frameHandle = createHiddenIframe();
        window.setTimeout(() => {
            if (!frameHandle) {
                reject("Unable to load iframe");
                return;
            }
            frameHandle.src = urlNavigate;
            resolve(frameHandle);
        }, navigateFrameWait);
    });
}
/**
 * @hidden
 * Loads the iframe synchronously when the navigateTimeFrame is set to `0`
 * @param urlNavigate
 * @param frameName
 * @param logger
 */
function loadFrameSync(urlNavigate) {
    const frameHandle = createHiddenIframe();
    frameHandle.src = urlNavigate;
    return frameHandle;
}
/**
 * @hidden
 * Creates a new hidden iframe or gets an existing one for silent token renewal.
 * @ignore
 */
function createHiddenIframe() {
    const authFrame = document.createElement("iframe");
    authFrame.className = "msalSilentIframe";
    authFrame.style.visibility = "hidden";
    authFrame.style.position = "absolute";
    authFrame.style.width = authFrame.style.height = "0";
    authFrame.style.border = "0";
    authFrame.setAttribute("sandbox", "allow-scripts allow-same-origin allow-forms");
    authFrame.setAttribute("allow", "local-network-access *");
    document.body.appendChild(authFrame);
    return authFrame;
}
/**
 * @hidden
 * Removes a hidden iframe from the page.
 * @ignore
 */
function removeHiddenIframe(iframe) {
    if (document.body === iframe.parentNode) {
        document.body.removeChild(iframe);
    }
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
class SilentIframeClient extends StandardInteractionClient {
    constructor(config, storageImpl, browserCrypto, logger, eventHandler, navigationClient, apiId, performanceClient, nativeStorageImpl, platformAuthProvider, correlationId) {
        super(config, storageImpl, browserCrypto, logger, eventHandler, navigationClient, performanceClient, platformAuthProvider, correlationId);
        this.apiId = apiId;
        this.nativeStorage = nativeStorageImpl;
    }
    /**
     * Acquires a token silently by opening a hidden iframe to the /authorize endpoint with prompt=none or prompt=no_session
     * @param request
     */
    async acquireToken(request) {
        this.performanceClient.addQueueMeasurement(PerformanceEvents.SilentIframeClientAcquireToken, request.correlationId);
        // Check that we have some SSO data
        if (!request.loginHint &&
            !request.sid &&
            (!request.account || !request.account.username)) {
            this.logger.warning("No user hint provided. The authorization server may need more information to complete this request.");
        }
        // Check the prompt value
        const inputRequest = { ...request };
        if (inputRequest.prompt) {
            if (inputRequest.prompt !== PromptValue.NONE &&
                inputRequest.prompt !== PromptValue.NO_SESSION) {
                this.logger.warning(`SilentIframeClient. Replacing invalid prompt ${inputRequest.prompt} with ${PromptValue.NONE}`);
                inputRequest.prompt = PromptValue.NONE;
            }
        }
        else {
            inputRequest.prompt = PromptValue.NONE;
        }
        // Create silent request
        const silentRequest = await invokeAsync(this.initializeAuthorizationRequest.bind(this), PerformanceEvents.StandardInteractionClientInitializeAuthorizationRequest, this.logger, this.performanceClient, request.correlationId)(inputRequest, exports.InteractionType.Silent);
        silentRequest.platformBroker = isPlatformAuthAllowed(this.config, this.logger, this.platformAuthProvider, silentRequest.authenticationScheme);
        preconnect(silentRequest.authority);
        if (this.config.auth.protocolMode === ProtocolMode.EAR) {
            return this.executeEarFlow(silentRequest);
        }
        else {
            return this.executeCodeFlow(silentRequest);
        }
    }
    /**
     * Executes auth code + PKCE flow
     * @param request
     * @returns
     */
    async executeCodeFlow(request) {
        let authClient;
        const serverTelemetryManager = this.initializeServerTelemetryManager(this.apiId);
        try {
            // Initialize the client
            authClient = await invokeAsync(this.createAuthCodeClient.bind(this), PerformanceEvents.StandardInteractionClientCreateAuthCodeClient, this.logger, this.performanceClient, request.correlationId)({
                serverTelemetryManager,
                requestAuthority: request.authority,
                requestAzureCloudOptions: request.azureCloudOptions,
                requestExtraQueryParameters: request.extraQueryParameters,
                account: request.account,
            });
            return await invokeAsync(this.silentTokenHelper.bind(this), PerformanceEvents.SilentIframeClientTokenHelper, this.logger, this.performanceClient, request.correlationId)(authClient, request);
        }
        catch (e) {
            if (e instanceof AuthError) {
                e.setCorrelationId(this.correlationId);
                serverTelemetryManager.cacheFailedRequest(e);
            }
            if (!authClient ||
                !(e instanceof AuthError) ||
                e.errorCode !== BrowserConstants.INVALID_GRANT_ERROR) {
                throw e;
            }
            this.performanceClient.addFields({
                retryError: e.errorCode,
            }, this.correlationId);
            return await invokeAsync(this.silentTokenHelper.bind(this), PerformanceEvents.SilentIframeClientTokenHelper, this.logger, this.performanceClient, this.correlationId)(authClient, request);
        }
    }
    /**
     * Executes EAR flow
     * @param request
     */
    async executeEarFlow(request) {
        const correlationId = request.correlationId;
        const discoveredAuthority = await invokeAsync(this.getDiscoveredAuthority.bind(this), PerformanceEvents.StandardInteractionClientGetDiscoveredAuthority, this.logger, this.performanceClient, correlationId)({
            requestAuthority: request.authority,
            requestAzureCloudOptions: request.azureCloudOptions,
            requestExtraQueryParameters: request.extraQueryParameters,
            account: request.account,
        });
        const earJwk = await invokeAsync(generateEarKey, PerformanceEvents.GenerateEarKey, this.logger, this.performanceClient, correlationId)();
        const pkceCodes = await invokeAsync(generatePkceCodes, PerformanceEvents.GeneratePkceCodes, this.logger, this.performanceClient, correlationId)(this.performanceClient, this.logger, correlationId);
        const silentRequest = {
            ...request,
            earJwk: earJwk,
            codeChallenge: pkceCodes.challenge,
        };
        const msalFrame = await invokeAsync(initiateEarRequest, PerformanceEvents.SilentHandlerInitiateAuthRequest, this.logger, this.performanceClient, correlationId)(this.config, discoveredAuthority, silentRequest, this.logger, this.performanceClient);
        const responseType = this.config.auth.OIDCOptions.serverResponseType;
        // Monitor the window for the hash. Return the string value and close the popup when the hash is received. Default timeout is 60 seconds.
        const responseString = await invokeAsync(monitorIframeForHash, PerformanceEvents.SilentHandlerMonitorIframeForHash, this.logger, this.performanceClient, correlationId)(msalFrame, this.config.system.iframeHashTimeout, this.config.system.pollIntervalMilliseconds, this.performanceClient, this.logger, correlationId, responseType);
        const serverParams = invoke(deserializeResponse, PerformanceEvents.DeserializeResponse, this.logger, this.performanceClient, correlationId)(responseString, responseType, this.logger);
        if (!serverParams.ear_jwe && serverParams.code) {
            // If server doesn't support EAR, they may fallback to auth code flow instead
            const authClient = await invokeAsync(this.createAuthCodeClient.bind(this), PerformanceEvents.StandardInteractionClientCreateAuthCodeClient, this.logger, this.performanceClient, correlationId)({
                serverTelemetryManager: this.initializeServerTelemetryManager(this.apiId),
                requestAuthority: request.authority,
                requestAzureCloudOptions: request.azureCloudOptions,
                requestExtraQueryParameters: request.extraQueryParameters,
                account: request.account,
                authority: discoveredAuthority,
            });
            return invokeAsync(handleResponseCode, PerformanceEvents.HandleResponseCode, this.logger, this.performanceClient, correlationId)(silentRequest, serverParams, pkceCodes.verifier, this.apiId, this.config, authClient, this.browserStorage, this.nativeStorage, this.eventHandler, this.logger, this.performanceClient, this.platformAuthProvider);
        }
        else {
            return invokeAsync(handleResponseEAR, PerformanceEvents.HandleResponseEar, this.logger, this.performanceClient, correlationId)(silentRequest, serverParams, this.apiId, this.config, discoveredAuthority, this.browserStorage, this.nativeStorage, this.eventHandler, this.logger, this.performanceClient, this.platformAuthProvider);
        }
    }
    /**
     * Currently Unsupported
     */
    logout() {
        // Synchronous so we must reject
        return Promise.reject(createBrowserAuthError(silentLogoutUnsupported));
    }
    /**
     * Helper which acquires an authorization code silently using a hidden iframe from given url
     * using the scopes requested as part of the id, and exchanges the code for a set of OAuth tokens.
     * @param navigateUrl
     * @param userRequestScopes
     */
    async silentTokenHelper(authClient, request) {
        const correlationId = request.correlationId;
        this.performanceClient.addQueueMeasurement(PerformanceEvents.SilentIframeClientTokenHelper, correlationId);
        const pkceCodes = await invokeAsync(generatePkceCodes, PerformanceEvents.GeneratePkceCodes, this.logger, this.performanceClient, correlationId)(this.performanceClient, this.logger, correlationId);
        const silentRequest = {
            ...request,
            codeChallenge: pkceCodes.challenge,
        };
        let msalFrame;
        if (request.httpMethod === HttpMethod.POST) {
            msalFrame = await invokeAsync(initiateCodeFlowWithPost, PerformanceEvents.SilentHandlerInitiateAuthRequest, this.logger, this.performanceClient, correlationId)(this.config, authClient.authority, silentRequest, this.logger, this.performanceClient);
        }
        else {
            // Create authorize request url
            const navigateUrl = await invokeAsync(getAuthCodeRequestUrl, PerformanceEvents.GetAuthCodeUrl, this.logger, this.performanceClient, correlationId)(this.config, authClient.authority, silentRequest, this.logger, this.performanceClient);
            // Get the frame handle for the silent request
            msalFrame = await invokeAsync(initiateCodeRequest, PerformanceEvents.SilentHandlerInitiateAuthRequest, this.logger, this.performanceClient, correlationId)(navigateUrl, this.performanceClient, this.logger, correlationId, this.config.system.navigateFrameWait);
        }
        const responseType = this.config.auth.OIDCOptions.serverResponseType;
        // Monitor the window for the hash. Return the string value and close the popup when the hash is received. Default timeout is 60 seconds.
        const responseString = await invokeAsync(monitorIframeForHash, PerformanceEvents.SilentHandlerMonitorIframeForHash, this.logger, this.performanceClient, correlationId)(msalFrame, this.config.system.iframeHashTimeout, this.config.system.pollIntervalMilliseconds, this.performanceClient, this.logger, correlationId, responseType);
        const serverParams = invoke(deserializeResponse, PerformanceEvents.DeserializeResponse, this.logger, this.performanceClient, correlationId)(responseString, responseType, this.logger);
        return invokeAsync(handleResponseCode, PerformanceEvents.HandleResponseCode, this.logger, this.performanceClient, correlationId)(request, serverParams, pkceCodes.verifier, this.apiId, this.config, authClient, this.browserStorage, this.nativeStorage, this.eventHandler, this.logger, this.performanceClient, this.platformAuthProvider);
    }
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
class SilentRefreshClient extends StandardInteractionClient {
    /**
     * Exchanges the refresh token for new tokens
     * @param request
     */
    async acquireToken(request) {
        this.performanceClient.addQueueMeasurement(PerformanceEvents.SilentRefreshClientAcquireToken, request.correlationId);
        const baseRequest = await invokeAsync(initializeBaseRequest, PerformanceEvents.InitializeBaseRequest, this.logger, this.performanceClient, request.correlationId)(request, this.config, this.performanceClient, this.logger);
        const silentRequest = {
            ...request,
            ...baseRequest,
        };
        if (request.redirectUri) {
            // Make sure any passed redirectUri is converted to an absolute URL - redirectUri is not a required parameter for refresh token redemption so only include if explicitly provided
            silentRequest.redirectUri = this.getRedirectUri(request.redirectUri);
        }
        const serverTelemetryManager = this.initializeServerTelemetryManager(ApiId.acquireTokenSilent_silentFlow);
        const refreshTokenClient = await this.createRefreshTokenClient({
            serverTelemetryManager,
            authorityUrl: silentRequest.authority,
            azureCloudOptions: silentRequest.azureCloudOptions,
            account: silentRequest.account,
        });
        // Send request to renew token. Auth module will throw errors if token cannot be renewed.
        return invokeAsync(refreshTokenClient.acquireTokenByRefreshToken.bind(refreshTokenClient), PerformanceEvents.RefreshTokenClientAcquireTokenByRefreshToken, this.logger, this.performanceClient, request.correlationId)(silentRequest).catch((e) => {
            e.setCorrelationId(this.correlationId);
            serverTelemetryManager.cacheFailedRequest(e);
            throw e;
        });
    }
    /**
     * Currently Unsupported
     */
    logout() {
        // Synchronous so we must reject
        return Promise.reject(createBrowserAuthError(silentLogoutUnsupported));
    }
    /**
     * Creates a Refresh Client with the given authority, or the default authority.
     * @param params {
     *         serverTelemetryManager: ServerTelemetryManager;
     *         authorityUrl?: string;
     *         azureCloudOptions?: AzureCloudOptions;
     *         extraQueryParams?: StringDict;
     *         account?: AccountInfo;
     *        }
     */
    async createRefreshTokenClient(params) {
        // Create auth module.
        const clientConfig = await invokeAsync(this.getClientConfiguration.bind(this), PerformanceEvents.StandardInteractionClientGetClientConfiguration, this.logger, this.performanceClient, this.correlationId)({
            serverTelemetryManager: params.serverTelemetryManager,
            requestAuthority: params.authorityUrl,
            requestAzureCloudOptions: params.azureCloudOptions,
            requestExtraQueryParameters: params.extraQueryParameters,
            account: params.account,
        });
        return new RefreshTokenClient(clientConfig, this.performanceClient);
    }
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Token cache manager
 */
class TokenCache {
    constructor(configuration, storage, logger, cryptoObj) {
        this.isBrowserEnvironment = typeof window !== "undefined";
        this.config = configuration;
        this.storage = storage;
        this.logger = logger;
        this.cryptoObj = cryptoObj;
    }
    // Move getAllAccounts here and cache utility APIs
    /**
     * API to load tokens to msal-browser cache.
     * @param request
     * @param response
     * @param options
     * @returns `AuthenticationResult` for the response that was loaded.
     */
    async loadExternalTokens(request, response, options) {
        if (!this.isBrowserEnvironment) {
            throw createBrowserAuthError(nonBrowserEnvironment);
        }
        const correlationId = request.correlationId || createNewGuid();
        const idTokenClaims = response.id_token
            ? extractTokenClaims(response.id_token, base64Decode)
            : undefined;
        const kmsi = isKmsi(idTokenClaims || {});
        const authorityOptions = {
            protocolMode: this.config.auth.protocolMode,
            knownAuthorities: this.config.auth.knownAuthorities,
            cloudDiscoveryMetadata: this.config.auth.cloudDiscoveryMetadata,
            authorityMetadata: this.config.auth.authorityMetadata,
            skipAuthorityMetadataCache: this.config.auth.skipAuthorityMetadataCache,
        };
        const authority = request.authority
            ? new Authority(Authority.generateAuthority(request.authority, request.azureCloudOptions), this.config.system.networkClient, this.storage, authorityOptions, this.logger, request.correlationId || createNewGuid())
            : undefined;
        const cacheRecordAccount = await this.loadAccount(request, options.clientInfo || response.client_info || "", correlationId, idTokenClaims, authority);
        const idToken = await this.loadIdToken(response, cacheRecordAccount.homeAccountId, cacheRecordAccount.environment, cacheRecordAccount.realm, correlationId, kmsi);
        const accessToken = await this.loadAccessToken(request, response, cacheRecordAccount.homeAccountId, cacheRecordAccount.environment, cacheRecordAccount.realm, options, correlationId, kmsi);
        const refreshToken = await this.loadRefreshToken(response, cacheRecordAccount.homeAccountId, cacheRecordAccount.environment, correlationId, kmsi);
        return this.generateAuthenticationResult(request, {
            account: cacheRecordAccount,
            idToken,
            accessToken,
            refreshToken,
        }, idTokenClaims, authority);
    }
    /**
     * Helper function to load account to msal-browser cache
     * @param idToken
     * @param environment
     * @param clientInfo
     * @param authorityType
     * @param requestHomeAccountId
     * @returns `AccountEntity`
     */
    async loadAccount(request, clientInfo, correlationId, idTokenClaims, authority) {
        this.logger.verbose("TokenCache - loading account");
        if (request.account) {
            const accountEntity = AccountEntity.createFromAccountInfo(request.account);
            await this.storage.setAccount(accountEntity, correlationId, isKmsi(idTokenClaims || {}));
            return accountEntity;
        }
        else if (!authority || (!clientInfo && !idTokenClaims)) {
            this.logger.error("TokenCache - if an account is not provided on the request, authority and either clientInfo or idToken must be provided instead.");
            throw createBrowserAuthError(unableToLoadToken);
        }
        const homeAccountId = AccountEntity.generateHomeAccountId(clientInfo, authority.authorityType, this.logger, this.cryptoObj, idTokenClaims);
        const claimsTenantId = idTokenClaims?.tid;
        const cachedAccount = buildAccountToCache(this.storage, authority, homeAccountId, base64Decode, correlationId, idTokenClaims, clientInfo, authority.hostnameAndPort, claimsTenantId, undefined, // authCodePayload
        undefined, // nativeAccountId
        this.logger);
        await this.storage.setAccount(cachedAccount, correlationId, isKmsi(idTokenClaims || {}));
        return cachedAccount;
    }
    /**
     * Helper function to load id tokens to msal-browser cache
     * @param idToken
     * @param homeAccountId
     * @param environment
     * @param tenantId
     * @returns `IdTokenEntity`
     */
    async loadIdToken(response, homeAccountId, environment, tenantId, correlationId, kmsi) {
        if (!response.id_token) {
            this.logger.verbose("TokenCache - no id token found in response");
            return null;
        }
        this.logger.verbose("TokenCache - loading id token");
        const idTokenEntity = createIdTokenEntity(homeAccountId, environment, response.id_token, this.config.auth.clientId, tenantId);
        await this.storage.setIdTokenCredential(idTokenEntity, correlationId, kmsi);
        return idTokenEntity;
    }
    /**
     * Helper function to load access tokens to msal-browser cache
     * @param request
     * @param response
     * @param homeAccountId
     * @param environment
     * @param tenantId
     * @returns `AccessTokenEntity`
     */
    async loadAccessToken(request, response, homeAccountId, environment, tenantId, options, correlationId, kmsi) {
        if (!response.access_token) {
            this.logger.verbose("TokenCache - no access token found in response");
            return null;
        }
        else if (!response.expires_in) {
            this.logger.error("TokenCache - no expiration set on the access token. Cannot add it to the cache.");
            return null;
        }
        else if (!response.scope &&
            (!request.scopes || !request.scopes.length)) {
            this.logger.error("TokenCache - scopes not specified in the request or response. Cannot add token to the cache.");
            return null;
        }
        this.logger.verbose("TokenCache - loading access token");
        const scopes = response.scope
            ? ScopeSet.fromString(response.scope)
            : new ScopeSet(request.scopes);
        const expiresOn = options.expiresOn || response.expires_in + nowSeconds();
        const extendedExpiresOn = options.extendedExpiresOn ||
            (response.ext_expires_in || response.expires_in) +
                nowSeconds();
        const accessTokenEntity = createAccessTokenEntity(homeAccountId, environment, response.access_token, this.config.auth.clientId, tenantId, scopes.printScopes(), expiresOn, extendedExpiresOn, base64Decode);
        await this.storage.setAccessTokenCredential(accessTokenEntity, correlationId, kmsi);
        return accessTokenEntity;
    }
    /**
     * Helper function to load refresh tokens to msal-browser cache
     * @param request
     * @param response
     * @param homeAccountId
     * @param environment
     * @returns `RefreshTokenEntity`
     */
    async loadRefreshToken(response, homeAccountId, environment, correlationId, kmsi) {
        if (!response.refresh_token) {
            this.logger.verbose("TokenCache - no refresh token found in response");
            return null;
        }
        this.logger.verbose("TokenCache - loading refresh token");
        const refreshTokenEntity = createRefreshTokenEntity(homeAccountId, environment, response.refresh_token, this.config.auth.clientId, response.foci, undefined, // userAssertionHash
        response.refresh_token_expires_in);
        await this.storage.setRefreshTokenCredential(refreshTokenEntity, correlationId, kmsi);
        return refreshTokenEntity;
    }
    /**
     * Helper function to generate an `AuthenticationResult` for the result.
     * @param request
     * @param idTokenObj
     * @param cacheRecord
     * @param authority
     * @returns `AuthenticationResult`
     */
    generateAuthenticationResult(request, cacheRecord, idTokenClaims, authority) {
        let accessToken = "";
        let responseScopes = [];
        let expiresOn = null;
        let extExpiresOn;
        if (cacheRecord?.accessToken) {
            accessToken = cacheRecord.accessToken.secret;
            responseScopes = ScopeSet.fromString(cacheRecord.accessToken.target).asArray();
            // Access token expiresOn stored in seconds, converting to Date for AuthenticationResult
            expiresOn = toDateFromSeconds(cacheRecord.accessToken.expiresOn);
            extExpiresOn = toDateFromSeconds(cacheRecord.accessToken.extendedExpiresOn);
        }
        const accountEntity = cacheRecord.account;
        return {
            authority: authority ? authority.canonicalAuthority : "",
            uniqueId: cacheRecord.account.localAccountId,
            tenantId: cacheRecord.account.realm,
            scopes: responseScopes,
            account: AccountEntity.getAccountInfo(accountEntity),
            idToken: cacheRecord.idToken?.secret || "",
            idTokenClaims: idTokenClaims || {},
            accessToken: accessToken,
            fromCache: true,
            expiresOn: expiresOn,
            correlationId: request.correlationId || "",
            requestId: "",
            extExpiresOn: extExpiresOn,
            familyId: cacheRecord.refreshToken?.familyId || "",
            tokenType: cacheRecord?.accessToken?.tokenType || "",
            state: request.state || "",
            cloudGraphHostName: accountEntity.cloudGraphHostName || "",
            msGraphHost: accountEntity.msGraphHost || "",
            fromNativeBroker: false,
        };
    }
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
class HybridSpaAuthorizationCodeClient extends AuthorizationCodeClient {
    constructor(config) {
        super(config);
        this.includeRedirectUri = false;
    }
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
class SilentAuthCodeClient extends StandardInteractionClient {
    constructor(config, storageImpl, browserCrypto, logger, eventHandler, navigationClient, apiId, performanceClient, platformAuthProvider, correlationId) {
        super(config, storageImpl, browserCrypto, logger, eventHandler, navigationClient, performanceClient, platformAuthProvider, correlationId);
        this.apiId = apiId;
    }
    /**
     * Acquires a token silently by redeeming an authorization code against the /token endpoint
     * @param request
     */
    async acquireToken(request) {
        // Auth code payload is required
        if (!request.code) {
            throw createBrowserAuthError(authCodeRequired);
        }
        // Create silent request
        const silentRequest = await invokeAsync(this.initializeAuthorizationRequest.bind(this), PerformanceEvents.StandardInteractionClientInitializeAuthorizationRequest, this.logger, this.performanceClient, request.correlationId)(request, exports.InteractionType.Silent);
        const serverTelemetryManager = this.initializeServerTelemetryManager(this.apiId);
        try {
            // Create auth code request (PKCE not needed)
            const authCodeRequest = {
                ...silentRequest,
                code: request.code,
            };
            // Initialize the client
            const clientConfig = await invokeAsync(this.getClientConfiguration.bind(this), PerformanceEvents.StandardInteractionClientGetClientConfiguration, this.logger, this.performanceClient, request.correlationId)({
                serverTelemetryManager,
                requestAuthority: silentRequest.authority,
                requestAzureCloudOptions: silentRequest.azureCloudOptions,
                requestExtraQueryParameters: silentRequest.extraQueryParameters,
                account: silentRequest.account,
            });
            const authClient = new HybridSpaAuthorizationCodeClient(clientConfig);
            this.logger.verbose("Auth code client created");
            // Create silent handler
            const interactionHandler = new InteractionHandler(authClient, this.browserStorage, authCodeRequest, this.logger, this.performanceClient);
            // Handle auth code parameters from request
            return await invokeAsync(interactionHandler.handleCodeResponseFromServer.bind(interactionHandler), PerformanceEvents.HandleCodeResponseFromServer, this.logger, this.performanceClient, request.correlationId)({
                code: request.code,
                msgraph_host: request.msGraphHost,
                cloud_graph_host_name: request.cloudGraphHostName,
                cloud_instance_host_name: request.cloudInstanceHostName,
            }, silentRequest, false);
        }
        catch (e) {
            if (e instanceof AuthError) {
                e.setCorrelationId(this.correlationId);
                serverTelemetryManager.cacheFailedRequest(e);
            }
            throw e;
        }
    }
    /**
     * Currently Unsupported
     */
    logout() {
        // Synchronous so we must reject
        return Promise.reject(createBrowserAuthError(silentLogoutUnsupported));
    }
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
function collectInstanceStats(currentClientId, performanceEvent, logger) {
    const frameInstances = 
    // @ts-ignore
    window.msal?.clientIds || [];
    const msalInstanceCount = frameInstances.length;
    const sameClientIdInstanceCount = frameInstances.filter((i) => i === currentClientId).length;
    if (sameClientIdInstanceCount > 1) {
        logger.warning("There is already an instance of MSAL.js in the window with the same client id.");
    }
    performanceEvent.add({
        msalInstanceCount: msalInstanceCount,
        sameClientIdInstanceCount: sameClientIdInstanceCount,
    });
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
function preflightCheck(initialized, performanceEvent, account) {
    try {
        preflightCheck$1(initialized);
    }
    catch (e) {
        performanceEvent.end({ success: false }, e, account);
        throw e;
    }
}
class StandardController {
    /**
     * @constructor
     * Constructor for the PublicClientApplication used to instantiate the PublicClientApplication object
     *
     * Important attributes in the Configuration object for auth are:
     * - clientID: the application ID of your application. You can obtain one by registering your application with our Application registration portal : https://portal.azure.com/#blade/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/RegisteredAppsPreview
     * - authority: the authority URL for your application.
     * - redirect_uri: the uri of your application registered in the portal.
     *
     * In Azure AD, authority is a URL indicating the Azure active directory that MSAL uses to obtain tokens.
     * It is of the form https://login.microsoftonline.com/{Enter_the_Tenant_Info_Here}
     * If your application supports Accounts in one organizational directory, replace "Enter_the_Tenant_Info_Here" value with the Tenant Id or Tenant name (for example, contoso.microsoft.com).
     * If your application supports Accounts in any organizational directory, replace "Enter_the_Tenant_Info_Here" value with organizations.
     * If your application supports Accounts in any organizational directory and personal Microsoft accounts, replace "Enter_the_Tenant_Info_Here" value with common.
     * To restrict support to Personal Microsoft accounts only, replace "Enter_the_Tenant_Info_Here" value with consumers.
     *
     * In Azure B2C, authority is of the form https://{instance}/tfp/{tenant}/{policyName}/
     * Full B2C functionality will be available in this library in future versions.
     *
     * @param configuration Object for the MSAL PublicClientApplication instance
     */
    constructor(operatingContext) {
        this.operatingContext = operatingContext;
        this.isBrowserEnvironment =
            this.operatingContext.isBrowserEnvironment();
        // Set the configuration.
        this.config = operatingContext.getConfig();
        this.initialized = false;
        // Initialize logger
        this.logger = this.operatingContext.getLogger();
        // Initialize the network module class.
        this.networkClient = this.config.system.networkClient;
        // Initialize the navigation client class.
        this.navigationClient = this.config.system.navigationClient;
        // Initialize redirectResponse Map
        this.redirectResponse = new Map();
        // Initial hybrid spa map
        this.hybridAuthCodeResponses = new Map();
        // Initialize performance client
        this.performanceClient = this.config.telemetry.client;
        // Initialize the crypto class.
        this.browserCrypto = this.isBrowserEnvironment
            ? new CryptoOps(this.logger, this.performanceClient)
            : DEFAULT_CRYPTO_IMPLEMENTATION;
        this.eventHandler = new EventHandler(this.logger);
        // Initialize the browser storage class.
        this.browserStorage = this.isBrowserEnvironment
            ? new BrowserCacheManager(this.config.auth.clientId, this.config.cache, this.browserCrypto, this.logger, this.performanceClient, this.eventHandler, buildStaticAuthorityOptions(this.config.auth))
            : DEFAULT_BROWSER_CACHE_MANAGER(this.config.auth.clientId, this.logger, this.performanceClient, this.eventHandler);
        // initialize in memory storage for native flows
        const nativeCacheOptions = {
            cacheLocation: BrowserCacheLocation.MemoryStorage,
            cacheRetentionDays: 5,
            temporaryCacheLocation: BrowserCacheLocation.MemoryStorage,
            storeAuthStateInCookie: false,
            secureCookies: false,
            cacheMigrationEnabled: false,
            claimsBasedCachingEnabled: false,
        };
        this.nativeInternalStorage = new BrowserCacheManager(this.config.auth.clientId, nativeCacheOptions, this.browserCrypto, this.logger, this.performanceClient, this.eventHandler);
        // Initialize the token cache
        this.tokenCache = new TokenCache(this.config, this.browserStorage, this.logger, this.browserCrypto);
        this.activeSilentTokenRequests = new Map();
        // Register listener functions
        this.trackPageVisibility = this.trackPageVisibility.bind(this);
        // Register listener functions
        this.trackPageVisibilityWithMeasurement =
            this.trackPageVisibilityWithMeasurement.bind(this);
    }
    static async createController(operatingContext, request) {
        const controller = new StandardController(operatingContext);
        await controller.initialize(request);
        return controller;
    }
    trackPageVisibility(correlationId) {
        if (!correlationId) {
            return;
        }
        this.logger.info("Perf: Visibility change detected");
        this.performanceClient.incrementFields({ visibilityChangeCount: 1 }, correlationId);
    }
    /**
     * Initializer function to perform async startup tasks such as connecting to WAM extension
     * @param request {?InitializeApplicationRequest} correlation id
     */
    async initialize(request, isBroker) {
        this.logger.trace("initialize called");
        if (this.initialized) {
            this.logger.info("initialize has already been called, exiting early.");
            return;
        }
        if (!this.isBrowserEnvironment) {
            this.logger.info("in non-browser environment, exiting early.");
            this.initialized = true;
            this.eventHandler.emitEvent(EventType.INITIALIZE_END);
            return;
        }
        const initCorrelationId = request?.correlationId || this.getRequestCorrelationId();
        const allowPlatformBroker = this.config.system.allowPlatformBroker;
        const initMeasurement = this.performanceClient.startMeasurement(PerformanceEvents.InitializeClientApplication, initCorrelationId);
        this.eventHandler.emitEvent(EventType.INITIALIZE_START);
        // Broker applications are initialized twice, so we avoid double-counting it
        if (!isBroker) {
            try {
                this.logMultipleInstances(initMeasurement);
            }
            catch { }
        }
        await invokeAsync(this.browserStorage.initialize.bind(this.browserStorage), PerformanceEvents.InitializeCache, this.logger, this.performanceClient, initCorrelationId)(initCorrelationId);
        if (allowPlatformBroker) {
            try {
                // check if platform authentication is available via DOM or browser extension and create relevant handlers
                this.platformAuthProvider = await getPlatformAuthProvider(this.logger, this.performanceClient, initCorrelationId, this.config.system.nativeBrokerHandshakeTimeout, this.config.system.allowPlatformBrokerWithDOM);
            }
            catch (e) {
                this.logger.verbose(e);
            }
        }
        if (!this.config.cache.claimsBasedCachingEnabled) {
            this.logger.verbose("Claims-based caching is disabled. Clearing the previous cache with claims");
            invoke(this.browserStorage.clearTokensAndKeysWithClaims.bind(this.browserStorage), PerformanceEvents.ClearTokensAndKeysWithClaims, this.logger, this.performanceClient, initCorrelationId)(initCorrelationId);
        }
        this.config.system.asyncPopups &&
            (await this.preGeneratePkceCodes(initCorrelationId));
        this.initialized = true;
        this.eventHandler.emitEvent(EventType.INITIALIZE_END);
        initMeasurement.end({
            allowPlatformBroker: allowPlatformBroker,
            success: true,
        });
    }
    // #region Redirect Flow
    /**
     * Event handler function which allows users to fire events after the PublicClientApplication object
     * has loaded during redirect flows. This should be invoked on all page loads involved in redirect
     * auth flows.
     * @param hash Hash to process. Defaults to the current value of window.location.hash. Only needs to be provided explicitly if the response to be handled is not contained in the current value.
     * @returns Token response or null. If the return value is null, then no auth redirect was detected.
     */
    async handleRedirectPromise(hash) {
        this.logger.verbose("handleRedirectPromise called");
        // Block token acquisition before initialize has been called
        blockAPICallsBeforeInitialize(this.initialized);
        if (this.isBrowserEnvironment) {
            /**
             * Store the promise on the PublicClientApplication instance if this is the first invocation of handleRedirectPromise,
             * otherwise return the promise from the first invocation. Prevents race conditions when handleRedirectPromise is called
             * several times concurrently.
             */
            const redirectResponseKey = hash || "";
            let response = this.redirectResponse.get(redirectResponseKey);
            if (typeof response === "undefined") {
                response = this.handleRedirectPromiseInternal(hash);
                this.redirectResponse.set(redirectResponseKey, response);
                this.logger.verbose("handleRedirectPromise has been called for the first time, storing the promise");
            }
            else {
                this.logger.verbose("handleRedirectPromise has been called previously, returning the result from the first call");
            }
            return response;
        }
        this.logger.verbose("handleRedirectPromise returns null, not browser environment");
        return null;
    }
    /**
     * The internal details of handleRedirectPromise. This is separated out to a helper to allow handleRedirectPromise to memoize requests
     * @param hash
     * @returns
     */
    async handleRedirectPromiseInternal(hash) {
        if (!this.browserStorage.isInteractionInProgress(true)) {
            this.logger.info("handleRedirectPromise called but there is no interaction in progress, returning null.");
            return null;
        }
        const interactionType = this.browserStorage.getInteractionInProgress()?.type;
        if (interactionType === INTERACTION_TYPE.SIGNOUT) {
            this.logger.verbose("handleRedirectPromise removing interaction_in_progress flag and returning null after sign-out");
            this.browserStorage.setInteractionInProgress(false);
            return Promise.resolve(null);
        }
        const loggedInAccounts = this.getAllAccounts();
        const platformBrokerRequest = this.browserStorage.getCachedNativeRequest();
        const useNative = platformBrokerRequest && this.platformAuthProvider && !hash;
        let rootMeasurement;
        this.eventHandler.emitEvent(EventType.HANDLE_REDIRECT_START, exports.InteractionType.Redirect);
        let redirectResponse;
        try {
            if (useNative && this.platformAuthProvider) {
                rootMeasurement = this.performanceClient.startMeasurement(PerformanceEvents.AcquireTokenRedirect, platformBrokerRequest?.correlationId || "");
                this.logger.trace("handleRedirectPromise - acquiring token from native platform");
                rootMeasurement.add({
                    isPlatformBrokerRequest: true,
                });
                const nativeClient = new PlatformAuthInteractionClient(this.config, this.browserStorage, this.browserCrypto, this.logger, this.eventHandler, this.navigationClient, ApiId.handleRedirectPromise, this.performanceClient, this.platformAuthProvider, platformBrokerRequest.accountId, this.nativeInternalStorage, platformBrokerRequest.correlationId);
                redirectResponse = invokeAsync(nativeClient.handleRedirectPromise.bind(nativeClient), PerformanceEvents.HandleNativeRedirectPromiseMeasurement, this.logger, this.performanceClient, rootMeasurement.event.correlationId)(this.performanceClient, rootMeasurement.event.correlationId);
            }
            else {
                const [standardRequest, codeVerifier] = this.browserStorage.getCachedRequest();
                const correlationId = standardRequest.correlationId;
                // Reset rootMeasurement now that we have correlationId
                rootMeasurement = this.performanceClient.startMeasurement(PerformanceEvents.AcquireTokenRedirect, correlationId);
                this.logger.trace("handleRedirectPromise - acquiring token from web flow");
                const redirectClient = this.createRedirectClient(correlationId);
                redirectResponse = invokeAsync(redirectClient.handleRedirectPromise.bind(redirectClient), PerformanceEvents.HandleRedirectPromiseMeasurement, this.logger, this.performanceClient, rootMeasurement.event.correlationId)(hash, standardRequest, codeVerifier, rootMeasurement);
            }
        }
        catch (e) {
            this.browserStorage.resetRequestCache();
            throw e;
        }
        return redirectResponse
            .then((result) => {
            if (result) {
                this.browserStorage.resetRequestCache();
                // Emit login event if number of accounts change
                const isLoggingIn = loggedInAccounts.length < this.getAllAccounts().length;
                if (isLoggingIn) {
                    this.eventHandler.emitEvent(EventType.LOGIN_SUCCESS, exports.InteractionType.Redirect, result);
                    this.logger.verbose("handleRedirectResponse returned result, login success");
                }
                else {
                    this.eventHandler.emitEvent(EventType.ACQUIRE_TOKEN_SUCCESS, exports.InteractionType.Redirect, result);
                    this.logger.verbose("handleRedirectResponse returned result, acquire token success");
                }
                rootMeasurement.end({
                    success: true,
                }, undefined, result.account);
            }
            else {
                /*
                 * Instrument an event only if an error code is set. Otherwise, discard it when the redirect response
                 * is empty and the error code is missing.
                 */
                if (rootMeasurement.event.errorCode) {
                    rootMeasurement.end({ success: false }, undefined);
                }
                else {
                    rootMeasurement.discard();
                }
            }
            this.eventHandler.emitEvent(EventType.HANDLE_REDIRECT_END, exports.InteractionType.Redirect);
            return result;
        })
            .catch((e) => {
            this.browserStorage.resetRequestCache();
            const eventError = e;
            // Emit login event if there is an account
            if (loggedInAccounts.length > 0) {
                this.eventHandler.emitEvent(EventType.ACQUIRE_TOKEN_FAILURE, exports.InteractionType.Redirect, null, eventError);
            }
            else {
                this.eventHandler.emitEvent(EventType.LOGIN_FAILURE, exports.InteractionType.Redirect, null, eventError);
            }
            this.eventHandler.emitEvent(EventType.HANDLE_REDIRECT_END, exports.InteractionType.Redirect);
            rootMeasurement.end({
                success: false,
            }, eventError);
            throw e;
        });
    }
    /**
     * Use when you want to obtain an access_token for your API by redirecting the user's browser window to the authorization endpoint. This function redirects
     * the page, so any code that follows this function will not execute.
     *
     * IMPORTANT: It is NOT recommended to have code that is dependent on the resolution of the Promise. This function will navigate away from the current
     * browser window. It currently returns a Promise in order to reflect the asynchronous nature of the code running in this function.
     *
     * @param request
     */
    async acquireTokenRedirect(request) {
        // Preflight request
        const correlationId = this.getRequestCorrelationId(request);
        this.logger.verbose("acquireTokenRedirect called", correlationId);
        const atrMeasurement = this.performanceClient.startMeasurement(PerformanceEvents.AcquireTokenPreRedirect, correlationId);
        atrMeasurement.add({
            scenarioId: request.scenarioId,
        });
        // Override on request only if set, as onRedirectNavigate field is deprecated
        const onRedirectNavigateCb = request.onRedirectNavigate;
        if (onRedirectNavigateCb) {
            request.onRedirectNavigate = (url) => {
                const navigate = typeof onRedirectNavigateCb === "function"
                    ? onRedirectNavigateCb(url)
                    : undefined;
                atrMeasurement.add({
                    navigateCallbackResult: navigate !== false,
                });
                atrMeasurement.event =
                    atrMeasurement.end({ success: true }, undefined, request.account) || atrMeasurement.event;
                return navigate;
            };
        }
        else {
            const configOnRedirectNavigateCb = this.config.auth.onRedirectNavigate;
            this.config.auth.onRedirectNavigate = (url) => {
                const navigate = typeof configOnRedirectNavigateCb === "function"
                    ? configOnRedirectNavigateCb(url)
                    : undefined;
                atrMeasurement.add({
                    navigateCallbackResult: navigate !== false,
                });
                atrMeasurement.event =
                    atrMeasurement.end({ success: true }, undefined, request.account) || atrMeasurement.event;
                return navigate;
            };
        }
        // If logged in, emit acquire token events
        const isLoggedIn = this.getAllAccounts().length > 0;
        try {
            redirectPreflightCheck(this.initialized, this.config);
            this.browserStorage.setInteractionInProgress(true, INTERACTION_TYPE.SIGNIN);
            if (isLoggedIn) {
                this.eventHandler.emitEvent(EventType.ACQUIRE_TOKEN_START, exports.InteractionType.Redirect, request);
            }
            else {
                this.eventHandler.emitEvent(EventType.LOGIN_START, exports.InteractionType.Redirect, request);
            }
            let result;
            if (this.platformAuthProvider &&
                this.canUsePlatformBroker(request)) {
                const nativeClient = new PlatformAuthInteractionClient(this.config, this.browserStorage, this.browserCrypto, this.logger, this.eventHandler, this.navigationClient, ApiId.acquireTokenRedirect, this.performanceClient, this.platformAuthProvider, this.getNativeAccountId(request), this.nativeInternalStorage, correlationId);
                result = nativeClient
                    .acquireTokenRedirect(request, atrMeasurement)
                    .catch((e) => {
                    atrMeasurement.add({
                        brokerErrorName: e.name,
                        brokerErrorCode: e.errorCode,
                    });
                    if (e instanceof NativeAuthError &&
                        isFatalNativeAuthError(e)) {
                        this.platformAuthProvider = undefined; // If extension gets uninstalled during session prevent future requests from continuing to attempt platform broker calls
                        const redirectClient = this.createRedirectClient(correlationId);
                        return redirectClient.acquireToken(request);
                    }
                    else if (e instanceof InteractionRequiredAuthError) {
                        this.logger.verbose("acquireTokenRedirect - Resolving interaction required error thrown by native broker by falling back to web flow");
                        const redirectClient = this.createRedirectClient(correlationId);
                        return redirectClient.acquireToken(request);
                    }
                    throw e;
                });
            }
            else {
                const redirectClient = this.createRedirectClient(correlationId);
                result = redirectClient.acquireToken(request);
            }
            return await result;
        }
        catch (e) {
            this.browserStorage.resetRequestCache();
            /*
             * Pre-redirect event completes before navigation occurs.
             * Timed out navigation needs to be instrumented separately as a post-redirect event.
             */
            if (atrMeasurement.event.status === 2) {
                this.performanceClient
                    .startMeasurement(PerformanceEvents.AcquireTokenRedirect, correlationId)
                    .end({ success: false }, e, request.account);
            }
            else {
                atrMeasurement.end({ success: false }, e, request.account);
            }
            if (isLoggedIn) {
                this.eventHandler.emitEvent(EventType.ACQUIRE_TOKEN_FAILURE, exports.InteractionType.Redirect, null, e);
            }
            else {
                this.eventHandler.emitEvent(EventType.LOGIN_FAILURE, exports.InteractionType.Redirect, null, e);
            }
            throw e;
        }
    }
    // #endregion
    // #region Popup Flow
    /**
     * Use when you want to obtain an access_token for your API via opening a popup window in the user's browser
     *
     * @param request
     *
     * @returns A promise that is fulfilled when this function has completed, or rejected if an error was raised.
     */
    acquireTokenPopup(request) {
        const correlationId = this.getRequestCorrelationId(request);
        const atPopupMeasurement = this.performanceClient.startMeasurement(PerformanceEvents.AcquireTokenPopup, correlationId);
        atPopupMeasurement.add({
            scenarioId: request.scenarioId,
        });
        try {
            this.logger.verbose("acquireTokenPopup called", correlationId);
            preflightCheck(this.initialized, atPopupMeasurement, request.account);
            this.browserStorage.setInteractionInProgress(true, INTERACTION_TYPE.SIGNIN);
        }
        catch (e) {
            // Since this function is syncronous we need to reject
            return Promise.reject(e);
        }
        // If logged in, emit acquire token events
        const loggedInAccounts = this.getAllAccounts();
        if (loggedInAccounts.length > 0) {
            this.eventHandler.emitEvent(EventType.ACQUIRE_TOKEN_START, exports.InteractionType.Popup, request);
        }
        else {
            this.eventHandler.emitEvent(EventType.LOGIN_START, exports.InteractionType.Popup, request);
        }
        let result;
        const pkce = this.getPreGeneratedPkceCodes(correlationId);
        if (this.canUsePlatformBroker(request)) {
            atPopupMeasurement.add({
                isPlatformBrokerRequest: true,
            });
            result = this.acquireTokenNative({
                ...request,
                correlationId,
            }, ApiId.acquireTokenPopup)
                .then((response) => {
                atPopupMeasurement.end({
                    success: true,
                }, undefined, response.account);
                return response;
            })
                .catch((e) => {
                atPopupMeasurement.add({
                    brokerErrorName: e.name,
                    brokerErrorCode: e.errorCode,
                });
                if (e instanceof NativeAuthError &&
                    isFatalNativeAuthError(e)) {
                    this.platformAuthProvider = undefined; // If extension gets uninstalled during session prevent future requests from continuing to continuing to attempt platform broker calls
                    const popupClient = this.createPopupClient(correlationId);
                    return popupClient.acquireToken(request, pkce);
                }
                else if (e instanceof InteractionRequiredAuthError) {
                    this.logger.verbose("acquireTokenPopup - Resolving interaction required error thrown by native broker by falling back to web flow");
                    const popupClient = this.createPopupClient(correlationId);
                    return popupClient.acquireToken(request, pkce);
                }
                throw e;
            });
        }
        else {
            const popupClient = this.createPopupClient(correlationId);
            result = popupClient.acquireToken(request, pkce);
        }
        return result
            .then((result) => {
            /*
             *  If logged in, emit acquire token events
             */
            const isLoggingIn = loggedInAccounts.length < this.getAllAccounts().length;
            if (isLoggingIn) {
                this.eventHandler.emitEvent(EventType.LOGIN_SUCCESS, exports.InteractionType.Popup, result);
            }
            else {
                this.eventHandler.emitEvent(EventType.ACQUIRE_TOKEN_SUCCESS, exports.InteractionType.Popup, result);
            }
            atPopupMeasurement.end({
                success: true,
                accessTokenSize: result.accessToken.length,
                idTokenSize: result.idToken.length,
            }, undefined, result.account);
            return result;
        })
            .catch((e) => {
            if (loggedInAccounts.length > 0) {
                this.eventHandler.emitEvent(EventType.ACQUIRE_TOKEN_FAILURE, exports.InteractionType.Popup, null, e);
            }
            else {
                this.eventHandler.emitEvent(EventType.LOGIN_FAILURE, exports.InteractionType.Popup, null, e);
            }
            atPopupMeasurement.end({
                success: false,
            }, e, request.account);
            // Since this function is syncronous we need to reject
            return Promise.reject(e);
        })
            .finally(async () => {
            this.browserStorage.setInteractionInProgress(false);
            if (this.config.system.asyncPopups) {
                await this.preGeneratePkceCodes(correlationId);
            }
        });
    }
    trackPageVisibilityWithMeasurement() {
        const measurement = this.ssoSilentMeasurement ||
            this.acquireTokenByCodeAsyncMeasurement;
        if (!measurement) {
            return;
        }
        this.logger.info("Perf: Visibility change detected in ", measurement.event.name);
        measurement.increment({
            visibilityChangeCount: 1,
        });
    }
    // #endregion
    // #region Silent Flow
    /**
     * This function uses a hidden iframe to fetch an authorization code from the eSTS. There are cases where this may not work:
     * - Any browser using a form of Intelligent Tracking Prevention
     * - If there is not an established session with the service
     *
     * In these cases, the request must be done inside a popup or full frame redirect.
     *
     * For the cases where interaction is required, you cannot send a request with prompt=none.
     *
     * If your refresh token has expired, you can use this function to fetch a new set of tokens silently as long as
     * you session on the server still exists.
     * @param request {@link SsoSilentRequest}
     *
     * @returns A promise that is fulfilled when this function has completed, or rejected if an error was raised.
     */
    async ssoSilent(request) {
        const correlationId = this.getRequestCorrelationId(request);
        const validRequest = {
            ...request,
            // will be PromptValue.NONE or PromptValue.NO_SESSION
            prompt: request.prompt,
            correlationId: correlationId,
        };
        this.ssoSilentMeasurement = this.performanceClient.startMeasurement(PerformanceEvents.SsoSilent, correlationId);
        this.ssoSilentMeasurement?.add({
            scenarioId: request.scenarioId,
        });
        preflightCheck(this.initialized, this.ssoSilentMeasurement, request.account);
        this.ssoSilentMeasurement?.increment({
            visibilityChangeCount: 0,
        });
        document.addEventListener("visibilitychange", this.trackPageVisibilityWithMeasurement);
        this.logger.verbose("ssoSilent called", correlationId);
        this.eventHandler.emitEvent(EventType.SSO_SILENT_START, exports.InteractionType.Silent, validRequest);
        let result;
        if (this.canUsePlatformBroker(validRequest)) {
            this.ssoSilentMeasurement?.add({
                isPlatformBrokerRequest: true,
            });
            result = this.acquireTokenNative(validRequest, ApiId.ssoSilent).catch((e) => {
                this.ssoSilentMeasurement?.add({
                    brokerErrorName: e.name,
                    brokerErrorCode: e.errorCode,
                });
                // If native token acquisition fails for availability reasons fallback to standard flow
                if (e instanceof NativeAuthError && isFatalNativeAuthError(e)) {
                    this.platformAuthProvider = undefined; // If extension gets uninstalled during session prevent future requests from continuing to attempt
                    const silentIframeClient = this.createSilentIframeClient(validRequest.correlationId);
                    return silentIframeClient.acquireToken(validRequest);
                }
                throw e;
            });
        }
        else {
            const silentIframeClient = this.createSilentIframeClient(validRequest.correlationId);
            result = silentIframeClient.acquireToken(validRequest);
        }
        return result
            .then((response) => {
            this.eventHandler.emitEvent(EventType.SSO_SILENT_SUCCESS, exports.InteractionType.Silent, response);
            this.ssoSilentMeasurement?.end({
                success: true,
                accessTokenSize: response.accessToken.length,
                idTokenSize: response.idToken.length,
            }, undefined, response.account);
            return response;
        })
            .catch((e) => {
            this.eventHandler.emitEvent(EventType.SSO_SILENT_FAILURE, exports.InteractionType.Silent, null, e);
            this.ssoSilentMeasurement?.end({
                success: false,
            }, e, request.account);
            throw e;
        })
            .finally(() => {
            document.removeEventListener("visibilitychange", this.trackPageVisibilityWithMeasurement);
        });
    }
    /**
     * This function redeems an authorization code (passed as code) from the eSTS token endpoint.
     * This authorization code should be acquired server-side using a confidential client to acquire a spa_code.
     * This API is not indended for normal authorization code acquisition and redemption.
     *
     * Redemption of this authorization code will not require PKCE, as it was acquired by a confidential client.
     *
     * @param request {@link AuthorizationCodeRequest}
     * @returns A promise that is fulfilled when this function has completed, or rejected if an error was raised.
     */
    async acquireTokenByCode(request) {
        const correlationId = this.getRequestCorrelationId(request);
        this.logger.trace("acquireTokenByCode called", correlationId);
        const atbcMeasurement = this.performanceClient.startMeasurement(PerformanceEvents.AcquireTokenByCode, correlationId);
        preflightCheck(this.initialized, atbcMeasurement);
        this.eventHandler.emitEvent(EventType.ACQUIRE_TOKEN_BY_CODE_START, exports.InteractionType.Silent, request);
        atbcMeasurement.add({ scenarioId: request.scenarioId });
        try {
            if (request.code && request.nativeAccountId) {
                // Throw error in case server returns both spa_code and spa_accountid in exchange for auth code.
                throw createBrowserAuthError(spaCodeAndNativeAccountIdPresent);
            }
            else if (request.code) {
                const hybridAuthCode = request.code;
                let response = this.hybridAuthCodeResponses.get(hybridAuthCode);
                if (!response) {
                    this.logger.verbose("Initiating new acquireTokenByCode request", correlationId);
                    response = this.acquireTokenByCodeAsync({
                        ...request,
                        correlationId,
                    })
                        .then((result) => {
                        this.eventHandler.emitEvent(EventType.ACQUIRE_TOKEN_BY_CODE_SUCCESS, exports.InteractionType.Silent, result);
                        this.hybridAuthCodeResponses.delete(hybridAuthCode);
                        atbcMeasurement.end({
                            success: true,
                            accessTokenSize: result.accessToken.length,
                            idTokenSize: result.idToken.length,
                        }, undefined, result.account);
                        return result;
                    })
                        .catch((error) => {
                        this.hybridAuthCodeResponses.delete(hybridAuthCode);
                        this.eventHandler.emitEvent(EventType.ACQUIRE_TOKEN_BY_CODE_FAILURE, exports.InteractionType.Silent, null, error);
                        atbcMeasurement.end({
                            success: false,
                        }, error);
                        throw error;
                    });
                    this.hybridAuthCodeResponses.set(hybridAuthCode, response);
                }
                else {
                    this.logger.verbose("Existing acquireTokenByCode request found", correlationId);
                    atbcMeasurement.discard();
                }
                return await response;
            }
            else if (request.nativeAccountId) {
                if (this.canUsePlatformBroker(request, request.nativeAccountId)) {
                    atbcMeasurement.add({
                        isPlatformBrokerRequest: true,
                    });
                    const result = await this.acquireTokenNative({
                        ...request,
                        correlationId,
                    }, ApiId.acquireTokenByCode, request.nativeAccountId).catch((e) => {
                        // If native token acquisition fails for availability reasons fallback to standard flow
                        if (e instanceof NativeAuthError &&
                            isFatalNativeAuthError(e)) {
                            this.platformAuthProvider = undefined; // If extension gets uninstalled during session prevent future requests from continuing to attempt
                        }
                        atbcMeasurement.add({
                            brokerErrorName: e.name,
                            brokerErrorCode: e.errorCode,
                        });
                        throw e;
                    });
                    atbcMeasurement.end({
                        success: true,
                    }, undefined, result.account);
                    return result;
                }
                else {
                    throw createBrowserAuthError(unableToAcquireTokenFromNativePlatform);
                }
            }
            else {
                throw createBrowserAuthError(authCodeOrNativeAccountIdRequired);
            }
        }
        catch (e) {
            this.eventHandler.emitEvent(EventType.ACQUIRE_TOKEN_BY_CODE_FAILURE, exports.InteractionType.Silent, null, e);
            atbcMeasurement.end({
                success: false,
            }, e);
            throw e;
        }
    }
    /**
     * Creates a SilentAuthCodeClient to redeem an authorization code.
     * @param request
     * @returns Result of the operation to redeem the authorization code
     */
    async acquireTokenByCodeAsync(request) {
        this.logger.trace("acquireTokenByCodeAsync called", request.correlationId);
        this.acquireTokenByCodeAsyncMeasurement =
            this.performanceClient.startMeasurement(PerformanceEvents.AcquireTokenByCodeAsync, request.correlationId);
        this.acquireTokenByCodeAsyncMeasurement?.increment({
            visibilityChangeCount: 0,
        });
        document.addEventListener("visibilitychange", this.trackPageVisibilityWithMeasurement);
        const silentAuthCodeClient = this.createSilentAuthCodeClient(request.correlationId);
        const silentTokenResult = await silentAuthCodeClient
            .acquireToken(request)
            .then((response) => {
            this.acquireTokenByCodeAsyncMeasurement?.end({
                success: true,
                fromCache: response.fromCache,
            });
            return response;
        })
            .catch((tokenRenewalError) => {
            this.acquireTokenByCodeAsyncMeasurement?.end({
                success: false,
            }, tokenRenewalError);
            throw tokenRenewalError;
        })
            .finally(() => {
            document.removeEventListener("visibilitychange", this.trackPageVisibilityWithMeasurement);
        });
        return silentTokenResult;
    }
    /**
     * Attempt to acquire an access token from the cache
     * @param silentCacheClient SilentCacheClient
     * @param commonRequest CommonSilentFlowRequest
     * @param silentRequest SilentRequest
     * @returns A promise that, when resolved, returns the access token
     */
    async acquireTokenFromCache(commonRequest, cacheLookupPolicy) {
        this.performanceClient.addQueueMeasurement(PerformanceEvents.AcquireTokenFromCache, commonRequest.correlationId);
        switch (cacheLookupPolicy) {
            case CacheLookupPolicy.Default:
            case CacheLookupPolicy.AccessToken:
            case CacheLookupPolicy.AccessTokenAndRefreshToken:
                const silentCacheClient = this.createSilentCacheClient(commonRequest.correlationId);
                return invokeAsync(silentCacheClient.acquireToken.bind(silentCacheClient), PerformanceEvents.SilentCacheClientAcquireToken, this.logger, this.performanceClient, commonRequest.correlationId)(commonRequest);
            default:
                throw createClientAuthError(tokenRefreshRequired);
        }
    }
    /**
     * Attempt to acquire an access token via a refresh token
     * @param commonRequest CommonSilentFlowRequest
     * @param cacheLookupPolicy CacheLookupPolicy
     * @returns A promise that, when resolved, returns the access token
     */
    async acquireTokenByRefreshToken(commonRequest, cacheLookupPolicy) {
        this.performanceClient.addQueueMeasurement(PerformanceEvents.AcquireTokenByRefreshToken, commonRequest.correlationId);
        switch (cacheLookupPolicy) {
            case CacheLookupPolicy.Default:
            case CacheLookupPolicy.AccessTokenAndRefreshToken:
            case CacheLookupPolicy.RefreshToken:
            case CacheLookupPolicy.RefreshTokenAndNetwork:
                const silentRefreshClient = this.createSilentRefreshClient(commonRequest.correlationId);
                return invokeAsync(silentRefreshClient.acquireToken.bind(silentRefreshClient), PerformanceEvents.SilentRefreshClientAcquireToken, this.logger, this.performanceClient, commonRequest.correlationId)(commonRequest);
            default:
                throw createClientAuthError(tokenRefreshRequired);
        }
    }
    /**
     * Attempt to acquire an access token via an iframe
     * @param request CommonSilentFlowRequest
     * @returns A promise that, when resolved, returns the access token
     */
    async acquireTokenBySilentIframe(request) {
        this.performanceClient.addQueueMeasurement(PerformanceEvents.AcquireTokenBySilentIframe, request.correlationId);
        const silentIframeClient = this.createSilentIframeClient(request.correlationId);
        return invokeAsync(silentIframeClient.acquireToken.bind(silentIframeClient), PerformanceEvents.SilentIframeClientAcquireToken, this.logger, this.performanceClient, request.correlationId)(request);
    }
    // #endregion
    // #region Logout
    /**
     * Deprecated logout function. Use logoutRedirect or logoutPopup instead
     * @param logoutRequest
     * @deprecated
     */
    async logout(logoutRequest) {
        const correlationId = this.getRequestCorrelationId(logoutRequest);
        this.logger.warning("logout API is deprecated and will be removed in msal-browser v3.0.0. Use logoutRedirect instead.", correlationId);
        return this.logoutRedirect({
            correlationId,
            ...logoutRequest,
        });
    }
    /**
     * Use to log out the current user, and redirect the user to the postLogoutRedirectUri.
     * Default behaviour is to redirect the user to `window.location.href`.
     * @param logoutRequest
     */
    async logoutRedirect(logoutRequest) {
        const correlationId = this.getRequestCorrelationId(logoutRequest);
        redirectPreflightCheck(this.initialized, this.config);
        this.browserStorage.setInteractionInProgress(true, INTERACTION_TYPE.SIGNOUT);
        const redirectClient = this.createRedirectClient(correlationId);
        return redirectClient.logout(logoutRequest);
    }
    /**
     * Clears local cache for the current user then opens a popup window prompting the user to sign-out of the server
     * @param logoutRequest
     */
    logoutPopup(logoutRequest) {
        try {
            const correlationId = this.getRequestCorrelationId(logoutRequest);
            preflightCheck$1(this.initialized);
            this.browserStorage.setInteractionInProgress(true, INTERACTION_TYPE.SIGNOUT);
            const popupClient = this.createPopupClient(correlationId);
            return popupClient.logout(logoutRequest).finally(() => {
                this.browserStorage.setInteractionInProgress(false);
            });
        }
        catch (e) {
            // Since this function is syncronous we need to reject
            return Promise.reject(e);
        }
    }
    /**
     * Creates a cache interaction client to clear broswer cache.
     * @param logoutRequest
     */
    async clearCache(logoutRequest) {
        if (!this.isBrowserEnvironment) {
            this.logger.info("in non-browser environment, returning early.");
            return;
        }
        const correlationId = this.getRequestCorrelationId(logoutRequest);
        const cacheClient = this.createSilentCacheClient(correlationId);
        return cacheClient.logout(logoutRequest);
    }
    // #endregion
    // #region Account APIs
    /**
     * Returns all the accounts in the cache that match the optional filter. If no filter is provided, all accounts are returned.
     * @param accountFilter - (Optional) filter to narrow down the accounts returned
     * @returns Array of AccountInfo objects in cache
     */
    getAllAccounts(accountFilter) {
        const correlationId = this.getRequestCorrelationId();
        return getAllAccounts(this.logger, this.browserStorage, this.isBrowserEnvironment, correlationId, accountFilter);
    }
    /**
     * Returns the first account found in the cache that matches the account filter passed in.
     * @param accountFilter
     * @returns The first account found in the cache matching the provided filter or null if no account could be found.
     */
    getAccount(accountFilter) {
        const correlationId = this.getRequestCorrelationId();
        return getAccount(accountFilter, this.logger, this.browserStorage, correlationId);
    }
    /**
     * Returns the signed in account matching username.
     * (the account object is created at the time of successful login)
     * or null when no matching account is found.
     * This API is provided for convenience but getAccountById should be used for best reliability
     * @param username
     * @returns The account object stored in MSAL
     */
    getAccountByUsername(username) {
        const correlationId = this.getRequestCorrelationId();
        return getAccountByUsername(username, this.logger, this.browserStorage, correlationId);
    }
    /**
     * Returns the signed in account matching homeAccountId.
     * (the account object is created at the time of successful login)
     * or null when no matching account is found
     * @param homeAccountId
     * @returns The account object stored in MSAL
     */
    getAccountByHomeId(homeAccountId) {
        const correlationId = this.getRequestCorrelationId();
        return getAccountByHomeId(homeAccountId, this.logger, this.browserStorage, correlationId);
    }
    /**
     * Returns the signed in account matching localAccountId.
     * (the account object is created at the time of successful login)
     * or null when no matching account is found
     * @param localAccountId
     * @returns The account object stored in MSAL
     */
    getAccountByLocalId(localAccountId) {
        const correlationId = this.getRequestCorrelationId();
        return getAccountByLocalId(localAccountId, this.logger, this.browserStorage, correlationId);
    }
    /**
     * Sets the account to use as the active account. If no account is passed to the acquireToken APIs, then MSAL will use this active account.
     * @param account
     */
    setActiveAccount(account) {
        const correlationId = this.getRequestCorrelationId();
        setActiveAccount(account, this.browserStorage, correlationId);
    }
    /**
     * Gets the currently active account
     */
    getActiveAccount() {
        const correlationId = this.getRequestCorrelationId();
        return getActiveAccount(this.browserStorage, correlationId);
    }
    // #endregion
    /**
     * Hydrates the cache with the tokens from an AuthenticationResult
     * @param result
     * @param request
     * @returns
     */
    async hydrateCache(result, request) {
        this.logger.verbose("hydrateCache called");
        // Account gets saved to browser storage regardless of native or not
        const accountEntity = AccountEntity.createFromAccountInfo(result.account, result.cloudGraphHostName, result.msGraphHost);
        await this.browserStorage.setAccount(accountEntity, result.correlationId, isKmsi(result.idTokenClaims));
        if (result.fromNativeBroker) {
            this.logger.verbose("Response was from native broker, storing in-memory");
            // Tokens from native broker are stored in-memory
            return this.nativeInternalStorage.hydrateCache(result, request);
        }
        else {
            return this.browserStorage.hydrateCache(result, request);
        }
    }
    // #region Helpers
    /**
     * Acquire a token from native device (e.g. WAM)
     * @param request
     */
    async acquireTokenNative(request, apiId, accountId, cacheLookupPolicy) {
        this.logger.trace("acquireTokenNative called");
        if (!this.platformAuthProvider) {
            throw createBrowserAuthError(nativeConnectionNotEstablished);
        }
        const nativeClient = new PlatformAuthInteractionClient(this.config, this.browserStorage, this.browserCrypto, this.logger, this.eventHandler, this.navigationClient, apiId, this.performanceClient, this.platformAuthProvider, accountId || this.getNativeAccountId(request), this.nativeInternalStorage, request.correlationId);
        return nativeClient.acquireToken(request, cacheLookupPolicy);
    }
    /**
     * Returns boolean indicating if this request can use the platform broker
     * @param request
     */
    canUsePlatformBroker(request, accountId) {
        this.logger.trace("canUsePlatformBroker called");
        if (!this.platformAuthProvider) {
            this.logger.trace("canUsePlatformBroker: platform broker unavilable, returning false");
            return false;
        }
        if (!isPlatformAuthAllowed(this.config, this.logger, this.platformAuthProvider, request.authenticationScheme)) {
            this.logger.trace("canUsePlatformBroker: isBrokerAvailable returned false, returning false");
            return false;
        }
        if (request.prompt) {
            switch (request.prompt) {
                case PromptValue.NONE:
                case PromptValue.CONSENT:
                case PromptValue.LOGIN:
                case PromptValue.SELECT_ACCOUNT:
                    this.logger.trace("canUsePlatformBroker: prompt is compatible with platform broker flow");
                    break;
                default:
                    this.logger.trace(`canUsePlatformBroker: prompt = ${request.prompt} is not compatible with platform broker flow, returning false`);
                    return false;
            }
        }
        if (!accountId && !this.getNativeAccountId(request)) {
            this.logger.trace("canUsePlatformBroker: nativeAccountId is not available, returning false");
            return false;
        }
        return true;
    }
    /**
     * Get the native accountId from the account
     * @param request
     * @returns
     */
    getNativeAccountId(request) {
        const account = request.account ||
            this.getAccount({
                loginHint: request.loginHint,
                sid: request.sid,
            }) ||
            this.getActiveAccount();
        return (account && account.nativeAccountId) || "";
    }
    /**
     * Returns new instance of the Popup Interaction Client
     * @param correlationId
     */
    createPopupClient(correlationId) {
        return new PopupClient(this.config, this.browserStorage, this.browserCrypto, this.logger, this.eventHandler, this.navigationClient, this.performanceClient, this.nativeInternalStorage, this.platformAuthProvider, correlationId);
    }
    /**
     * Returns new instance of the Redirect Interaction Client
     * @param correlationId
     */
    createRedirectClient(correlationId) {
        return new RedirectClient(this.config, this.browserStorage, this.browserCrypto, this.logger, this.eventHandler, this.navigationClient, this.performanceClient, this.nativeInternalStorage, this.platformAuthProvider, correlationId);
    }
    /**
     * Returns new instance of the Silent Iframe Interaction Client
     * @param correlationId
     */
    createSilentIframeClient(correlationId) {
        return new SilentIframeClient(this.config, this.browserStorage, this.browserCrypto, this.logger, this.eventHandler, this.navigationClient, ApiId.ssoSilent, this.performanceClient, this.nativeInternalStorage, this.platformAuthProvider, correlationId);
    }
    /**
     * Returns new instance of the Silent Cache Interaction Client
     */
    createSilentCacheClient(correlationId) {
        return new SilentCacheClient(this.config, this.browserStorage, this.browserCrypto, this.logger, this.eventHandler, this.navigationClient, this.performanceClient, this.platformAuthProvider, correlationId);
    }
    /**
     * Returns new instance of the Silent Refresh Interaction Client
     */
    createSilentRefreshClient(correlationId) {
        return new SilentRefreshClient(this.config, this.browserStorage, this.browserCrypto, this.logger, this.eventHandler, this.navigationClient, this.performanceClient, this.platformAuthProvider, correlationId);
    }
    /**
     * Returns new instance of the Silent AuthCode Interaction Client
     */
    createSilentAuthCodeClient(correlationId) {
        return new SilentAuthCodeClient(this.config, this.browserStorage, this.browserCrypto, this.logger, this.eventHandler, this.navigationClient, ApiId.acquireTokenByCode, this.performanceClient, this.platformAuthProvider, correlationId);
    }
    /**
     * Adds event callbacks to array
     * @param callback
     */
    addEventCallback(callback, eventTypes) {
        return this.eventHandler.addEventCallback(callback, eventTypes);
    }
    /**
     * Removes callback with provided id from callback array
     * @param callbackId
     */
    removeEventCallback(callbackId) {
        this.eventHandler.removeEventCallback(callbackId);
    }
    /**
     * Registers a callback to receive performance events.
     *
     * @param {PerformanceCallbackFunction} callback
     * @returns {string}
     */
    addPerformanceCallback(callback) {
        blockNonBrowserEnvironment();
        return this.performanceClient.addPerformanceCallback(callback);
    }
    /**
     * Removes a callback registered with addPerformanceCallback.
     *
     * @param {string} callbackId
     * @returns {boolean}
     */
    removePerformanceCallback(callbackId) {
        return this.performanceClient.removePerformanceCallback(callbackId);
    }
    /**
     * Adds event listener that emits an event when a user account is added or removed from localstorage in a different browser tab or window
     * @deprecated These events will be raised by default and this method will be removed in a future major version.
     */
    enableAccountStorageEvents() {
        if (this.config.cache.cacheLocation !==
            BrowserCacheLocation.LocalStorage) {
            this.logger.info("Account storage events are only available when cacheLocation is set to localStorage");
            return;
        }
        this.eventHandler.subscribeCrossTab();
    }
    /**
     * Removes event listener that emits an event when a user account is added or removed from localstorage in a different browser tab or window
     * @deprecated These events will be raised by default and this method will be removed in a future major version.
     */
    disableAccountStorageEvents() {
        if (this.config.cache.cacheLocation !==
            BrowserCacheLocation.LocalStorage) {
            this.logger.info("Account storage events are only available when cacheLocation is set to localStorage");
            return;
        }
        this.eventHandler.unsubscribeCrossTab();
    }
    /**
     * Gets the token cache for the application.
     */
    getTokenCache() {
        return this.tokenCache;
    }
    /**
     * Returns the logger instance
     */
    getLogger() {
        return this.logger;
    }
    /**
     * Replaces the default logger set in configurations with new Logger with new configurations
     * @param logger Logger instance
     */
    setLogger(logger) {
        this.logger = logger;
    }
    /**
     * Called by wrapper libraries (Angular & React) to set SKU and Version passed down to telemetry, logger, etc.
     * @param sku
     * @param version
     */
    initializeWrapperLibrary(sku, version) {
        // Validate the SKU passed in is one we expect
        this.browserStorage.setWrapperMetadata(sku, version);
    }
    /**
     * Sets navigation client
     * @param navigationClient
     */
    setNavigationClient(navigationClient) {
        this.navigationClient = navigationClient;
    }
    /**
     * Returns the configuration object
     */
    getConfiguration() {
        return this.config;
    }
    /**
     * Returns the performance client
     */
    getPerformanceClient() {
        return this.performanceClient;
    }
    /**
     * Returns the browser env indicator
     */
    isBrowserEnv() {
        return this.isBrowserEnvironment;
    }
    /**
     * Generates a correlation id for a request if none is provided.
     *
     * @protected
     * @param {?Partial<BaseAuthRequest>} [request]
     * @returns {string}
     */
    getRequestCorrelationId(request) {
        if (request?.correlationId) {
            return request.correlationId;
        }
        if (this.isBrowserEnvironment) {
            return createNewGuid();
        }
        /*
         * Included for fallback for non-browser environments,
         * and to ensure this method always returns a string.
         */
        return Constants.EMPTY_STRING;
    }
    // #endregion
    /**
     * Use when initiating the login process by redirecting the user's browser to the authorization endpoint. This function redirects the page, so
     * any code that follows this function will not execute.
     *
     * IMPORTANT: It is NOT recommended to have code that is dependent on the resolution of the Promise. This function will navigate away from the current
     * browser window. It currently returns a Promise in order to reflect the asynchronous nature of the code running in this function.
     *
     * @param request
     */
    async loginRedirect(request) {
        const correlationId = this.getRequestCorrelationId(request);
        this.logger.verbose("loginRedirect called", correlationId);
        return this.acquireTokenRedirect({
            correlationId,
            ...(request || DEFAULT_REQUEST),
        });
    }
    /**
     * Use when initiating the login process via opening a popup window in the user's browser
     *
     * @param request
     *
     * @returns A promise that is fulfilled when this function has completed, or rejected if an error was raised.
     */
    loginPopup(request) {
        const correlationId = this.getRequestCorrelationId(request);
        this.logger.verbose("loginPopup called", correlationId);
        return this.acquireTokenPopup({
            correlationId,
            ...(request || DEFAULT_REQUEST),
        });
    }
    /**
     * Silently acquire an access token for a given set of scopes. Returns currently processing promise if parallel requests are made.
     *
     * @param {@link (SilentRequest:type)}
     * @returns {Promise.<AuthenticationResult>} - a promise that is fulfilled when this function has completed, or rejected if an error was raised. Returns the {@link AuthResponse} object
     */
    async acquireTokenSilent(request) {
        const correlationId = this.getRequestCorrelationId(request);
        const atsMeasurement = this.performanceClient.startMeasurement(PerformanceEvents.AcquireTokenSilent, correlationId);
        atsMeasurement.add({
            cacheLookupPolicy: request.cacheLookupPolicy,
            scenarioId: request.scenarioId,
        });
        preflightCheck(this.initialized, atsMeasurement, request.account);
        this.logger.verbose("acquireTokenSilent called", correlationId);
        const account = request.account || this.getActiveAccount();
        if (!account) {
            throw createBrowserAuthError(noAccountError);
        }
        return this.acquireTokenSilentDeduped(request, account, correlationId)
            .then((result) => {
            atsMeasurement.end({
                success: true,
                fromCache: result.fromCache,
                accessTokenSize: result.accessToken.length,
                idTokenSize: result.idToken.length,
            }, undefined, result.account);
            return {
                ...result,
                state: request.state,
                correlationId: correlationId, // Ensures PWB scenarios can correctly match request to response
            };
        })
            .catch((error) => {
            if (error instanceof AuthError) {
                // Ensures PWB scenarios can correctly match request to response
                error.setCorrelationId(correlationId);
            }
            atsMeasurement.end({
                success: false,
            }, error, account);
            throw error;
        });
    }
    /**
     * Checks if identical request is already in flight and returns reference to the existing promise or fires off a new one if this is the first
     * @param request
     * @param account
     * @param correlationId
     * @returns
     */
    async acquireTokenSilentDeduped(request, account, correlationId) {
        const thumbprint = getRequestThumbprint(this.config.auth.clientId, {
            ...request,
            authority: request.authority || this.config.auth.authority}, account.homeAccountId);
        const silentRequestKey = JSON.stringify(thumbprint);
        const inProgressRequest = this.activeSilentTokenRequests.get(silentRequestKey);
        if (typeof inProgressRequest === "undefined") {
            this.logger.verbose("acquireTokenSilent called for the first time, storing active request", correlationId);
            this.performanceClient.addFields({ deduped: false }, correlationId);
            const activeRequest = invokeAsync(this.acquireTokenSilentAsync.bind(this), PerformanceEvents.AcquireTokenSilentAsync, this.logger, this.performanceClient, correlationId)({
                ...request,
                correlationId,
            }, account);
            this.activeSilentTokenRequests.set(silentRequestKey, activeRequest);
            return activeRequest.finally(() => {
                this.activeSilentTokenRequests.delete(silentRequestKey);
            });
        }
        else {
            this.logger.verbose("acquireTokenSilent has been called previously, returning the result from the first call", correlationId);
            this.performanceClient.addFields({ deduped: true }, correlationId);
            return inProgressRequest;
        }
    }
    /**
     * Silently acquire an access token for a given set of scopes. Will use cached token if available, otherwise will attempt to acquire a new token from the network via refresh token.
     * @param {@link (SilentRequest:type)}
     * @param {@link (AccountInfo:type)}
     * @returns {Promise.<AuthenticationResult>} - a promise that is fulfilled when this function has completed, or rejected if an error was raised. Returns the {@link AuthResponse}
     */
    async acquireTokenSilentAsync(request, account) {
        const trackPageVisibility = () => this.trackPageVisibility(request.correlationId);
        this.performanceClient.addQueueMeasurement(PerformanceEvents.AcquireTokenSilentAsync, request.correlationId);
        this.eventHandler.emitEvent(EventType.ACQUIRE_TOKEN_START, exports.InteractionType.Silent, request);
        if (request.correlationId) {
            this.performanceClient.incrementFields({ visibilityChangeCount: 0 }, request.correlationId);
        }
        document.addEventListener("visibilitychange", trackPageVisibility);
        const silentRequest = await invokeAsync(initializeSilentRequest, PerformanceEvents.InitializeSilentRequest, this.logger, this.performanceClient, request.correlationId)(request, account, this.config, this.performanceClient, this.logger);
        const cacheLookupPolicy = request.cacheLookupPolicy || CacheLookupPolicy.Default;
        const result = this.acquireTokenSilentNoIframe(silentRequest, cacheLookupPolicy).catch(async (refreshTokenError) => {
            const shouldTryToResolveSilently = checkIfRefreshTokenErrorCanBeResolvedSilently(refreshTokenError, cacheLookupPolicy);
            if (shouldTryToResolveSilently) {
                if (!this.activeIframeRequest) {
                    let _resolve;
                    // Always set the active request tracker immediately after checking it to prevent races
                    this.activeIframeRequest = [
                        new Promise((resolve) => {
                            _resolve = resolve;
                        }),
                        silentRequest.correlationId,
                    ];
                    this.logger.verbose("Refresh token expired/invalid or CacheLookupPolicy is set to Skip, attempting acquire token by iframe.", silentRequest.correlationId);
                    return invokeAsync(this.acquireTokenBySilentIframe.bind(this), PerformanceEvents.AcquireTokenBySilentIframe, this.logger, this.performanceClient, silentRequest.correlationId)(silentRequest)
                        .then((iframeResult) => {
                        _resolve(true);
                        return iframeResult;
                    })
                        .catch((e) => {
                        _resolve(false);
                        throw e;
                    })
                        .finally(() => {
                        this.activeIframeRequest = undefined;
                    });
                }
                else if (cacheLookupPolicy !== CacheLookupPolicy.Skip) {
                    const [activePromise, activeCorrelationId] = this.activeIframeRequest;
                    this.logger.verbose(`Iframe request is already in progress, awaiting resolution for request with correlationId: ${activeCorrelationId}`, silentRequest.correlationId);
                    const awaitConcurrentIframeMeasure = this.performanceClient.startMeasurement(PerformanceEvents.AwaitConcurrentIframe, silentRequest.correlationId);
                    awaitConcurrentIframeMeasure.add({
                        awaitIframeCorrelationId: activeCorrelationId,
                    });
                    const activePromiseResult = await activePromise;
                    awaitConcurrentIframeMeasure.end({
                        success: activePromiseResult,
                    });
                    if (activePromiseResult) {
                        this.logger.verbose(`Parallel iframe request with correlationId: ${activeCorrelationId} succeeded. Retrying cache and/or RT redemption`, silentRequest.correlationId);
                        // Retry cache lookup and/or RT exchange after iframe completes
                        return this.acquireTokenSilentNoIframe(silentRequest, cacheLookupPolicy);
                    }
                    else {
                        this.logger.info(`Iframe request with correlationId: ${activeCorrelationId} failed. Interaction is required.`);
                        // If previous iframe request failed, it's unlikely to succeed this time. Throw original error.
                        throw refreshTokenError;
                    }
                }
                else {
                    // Cache policy set to skip and another iframe request is already in progress
                    this.logger.warning("Another iframe request is currently in progress and CacheLookupPolicy is set to Skip. This may result in degraded performance and/or reliability for both calls. Please consider changing the CacheLookupPolicy to take advantage of request queuing and token cache.", silentRequest.correlationId);
                    return invokeAsync(this.acquireTokenBySilentIframe.bind(this), PerformanceEvents.AcquireTokenBySilentIframe, this.logger, this.performanceClient, silentRequest.correlationId)(silentRequest);
                }
            }
            else {
                // Error cannot be silently resolved or iframe renewal is not allowed, interaction required
                throw refreshTokenError;
            }
        });
        return result
            .then((response) => {
            this.eventHandler.emitEvent(EventType.ACQUIRE_TOKEN_SUCCESS, exports.InteractionType.Silent, response);
            this.performanceClient.addFields({
                fromCache: response.fromCache,
            }, request.correlationId);
            return response;
        })
            .catch((tokenRenewalError) => {
            this.eventHandler.emitEvent(EventType.ACQUIRE_TOKEN_FAILURE, exports.InteractionType.Silent, null, tokenRenewalError);
            throw tokenRenewalError;
        })
            .finally(() => {
            document.removeEventListener("visibilitychange", trackPageVisibility);
        });
    }
    /**
     * AcquireTokenSilent without the iframe fallback. This is used to enable the correct fallbacks in cases where there's a potential for multiple silent requests to be made in parallel and prevent those requests from making concurrent iframe requests.
     * @param silentRequest
     * @param cacheLookupPolicy
     * @returns
     */
    async acquireTokenSilentNoIframe(silentRequest, cacheLookupPolicy) {
        // if the cache policy is set to access_token only, we should not be hitting the native layer yet
        if (isPlatformAuthAllowed(this.config, this.logger, this.platformAuthProvider, silentRequest.authenticationScheme) &&
            silentRequest.account.nativeAccountId) {
            this.logger.verbose("acquireTokenSilent - attempting to acquire token from native platform");
            this.performanceClient.addFields({ isPlatformBrokerRequest: true }, silentRequest.correlationId);
            return this.acquireTokenNative(silentRequest, ApiId.acquireTokenSilent_silentFlow, silentRequest.account.nativeAccountId, cacheLookupPolicy).catch(async (e) => {
                this.performanceClient.addFields({
                    brokerErrorName: e.name,
                    brokerErrorCode: e.errorCode,
                }, silentRequest.correlationId);
                // If native token acquisition fails for availability reasons fallback to web flow
                if (e instanceof NativeAuthError && isFatalNativeAuthError(e)) {
                    this.logger.verbose("acquireTokenSilent - native platform unavailable, falling back to web flow");
                    this.platformAuthProvider = undefined; // Prevent future requests from continuing to attempt
                    // Cache will not contain tokens, given that previous WAM requests succeeded. Skip cache and RT renewal and go straight to iframe renewal
                    throw createClientAuthError(tokenRefreshRequired);
                }
                throw e;
            });
        }
        else {
            this.logger.verbose("acquireTokenSilent - attempting to acquire token from web flow");
            // add logs to identify embedded cache retrieval
            if (cacheLookupPolicy === CacheLookupPolicy.AccessToken) {
                this.logger.verbose("acquireTokenSilent - cache lookup policy set to AccessToken, attempting to acquire token from local cache");
            }
            return invokeAsync(this.acquireTokenFromCache.bind(this), PerformanceEvents.AcquireTokenFromCache, this.logger, this.performanceClient, silentRequest.correlationId)(silentRequest, cacheLookupPolicy).catch((cacheError) => {
                if (cacheLookupPolicy === CacheLookupPolicy.AccessToken) {
                    throw cacheError;
                }
                this.eventHandler.emitEvent(EventType.ACQUIRE_TOKEN_NETWORK_START, exports.InteractionType.Silent, silentRequest);
                return invokeAsync(this.acquireTokenByRefreshToken.bind(this), PerformanceEvents.AcquireTokenByRefreshToken, this.logger, this.performanceClient, silentRequest.correlationId)(silentRequest, cacheLookupPolicy);
            });
        }
    }
    /**
     * Pre-generates PKCE codes and stores it in local variable
     * @param correlationId
     */
    async preGeneratePkceCodes(correlationId) {
        this.logger.verbose("Generating new PKCE codes");
        this.pkceCode = await invokeAsync(generatePkceCodes, PerformanceEvents.GeneratePkceCodes, this.logger, this.performanceClient, correlationId)(this.performanceClient, this.logger, correlationId);
        return Promise.resolve();
    }
    /**
     * Provides pre-generated PKCE codes, if any
     * @param correlationId
     */
    getPreGeneratedPkceCodes(correlationId) {
        this.logger.verbose("Attempting to pick up pre-generated PKCE codes");
        const res = this.pkceCode ? { ...this.pkceCode } : undefined;
        this.pkceCode = undefined;
        this.logger.verbose(`${res ? "Found" : "Did not find"} pre-generated PKCE codes`);
        this.performanceClient.addFields({ usePreGeneratedPkce: !!res }, correlationId);
        return res;
    }
    logMultipleInstances(performanceEvent) {
        const clientId = this.config.auth.clientId;
        if (!window)
            return;
        // @ts-ignore
        window.msal = window.msal || {};
        // @ts-ignore
        window.msal.clientIds = window.msal.clientIds || [];
        // @ts-ignore
        const clientIds = window.msal.clientIds;
        if (clientIds.length > 0) {
            this.logger.verbose("There is already an instance of MSAL.js in the window.");
        }
        // @ts-ignore
        window.msal.clientIds.push(clientId);
        collectInstanceStats(clientId, performanceEvent, this.logger);
    }
}
/**
 * Determines whether an error thrown by the refresh token endpoint can be resolved without interaction
 * @param refreshTokenError
 * @param silentRequest
 * @param cacheLookupPolicy
 * @returns
 */
function checkIfRefreshTokenErrorCanBeResolvedSilently(refreshTokenError, cacheLookupPolicy) {
    const noInteractionRequired = !(refreshTokenError instanceof InteractionRequiredAuthError &&
        // For refresh token errors, bad_token does not always require interaction (silently resolvable)
        refreshTokenError.subError !==
            badToken);
    // Errors that result when the refresh token needs to be replaced
    const refreshTokenRefreshRequired = refreshTokenError.errorCode === BrowserConstants.INVALID_GRANT_ERROR ||
        refreshTokenError.errorCode ===
            tokenRefreshRequired;
    // Errors that may be resolved before falling back to interaction (through iframe renewal)
    const isSilentlyResolvable = (noInteractionRequired && refreshTokenRefreshRequired) ||
        refreshTokenError.errorCode ===
            noTokensFound ||
        refreshTokenError.errorCode ===
            refreshTokenExpired;
    // Only these policies allow for an iframe renewal attempt
    const tryIframeRenewal = iFrameRenewalPolicies.includes(cacheLookupPolicy);
    return isSilentlyResolvable && tryIframeRenewal;
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
function isBridgeError(error) {
    return error.status !== undefined;
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
class NestedAppAuthAdapter {
    constructor(clientId, clientCapabilities, crypto, logger) {
        this.clientId = clientId;
        this.clientCapabilities = clientCapabilities;
        this.crypto = crypto;
        this.logger = logger;
    }
    toNaaTokenRequest(request) {
        let extraParams;
        if (request.extraQueryParameters === undefined) {
            extraParams = new Map();
        }
        else {
            extraParams = new Map(Object.entries(request.extraQueryParameters));
        }
        const correlationId = request.correlationId || this.crypto.createNewGuid();
        const claims = addClientCapabilitiesToClaims$1(request.claims, this.clientCapabilities);
        const scopes = request.scopes || OIDC_DEFAULT_SCOPES;
        const tokenRequest = {
            platformBrokerId: request.account?.homeAccountId,
            clientId: this.clientId,
            authority: request.authority,
            scope: scopes.join(" "),
            correlationId,
            claims: !StringUtils.isEmptyObj(claims) ? claims : undefined,
            state: request.state,
            authenticationScheme: request.authenticationScheme || AuthenticationScheme.BEARER,
            extraParameters: extraParams,
        };
        return tokenRequest;
    }
    fromNaaTokenResponse(request, response, reqTimestamp) {
        if (!response.token.id_token || !response.token.access_token) {
            throw createClientAuthError(nullOrEmptyToken);
        }
        // Request timestamp and AuthResult expires_in are in seconds, converting to Date for AuthenticationResult
        const expiresOn = toDateFromSeconds(reqTimestamp + (response.token.expires_in || 0));
        const idTokenClaims = extractTokenClaims(response.token.id_token, this.crypto.base64Decode);
        const account = this.fromNaaAccountInfo(response.account, response.token.id_token, idTokenClaims);
        const scopes = response.token.scope || request.scope;
        const authenticationResult = {
            authority: response.token.authority || account.environment,
            uniqueId: account.localAccountId,
            tenantId: account.tenantId,
            scopes: scopes.split(" "),
            account,
            idToken: response.token.id_token,
            idTokenClaims,
            accessToken: response.token.access_token,
            fromCache: false,
            expiresOn: expiresOn,
            tokenType: request.authenticationScheme || AuthenticationScheme.BEARER,
            correlationId: request.correlationId,
            extExpiresOn: expiresOn,
            state: request.state,
        };
        return authenticationResult;
    }
    /*
     *  export type AccountInfo = {
     *     homeAccountId: string;
     *     environment: string;
     *     tenantId: string;
     *     username: string;
     *     localAccountId: string;
     *     name?: string;
     *     idToken?: string;
     *     idTokenClaims?: TokenClaims & {
     *         [key: string]:
     *             | string
     *             | number
     *             | string[]
     *             | object
     *             | undefined
     *             | unknown;
     *     };
     *     nativeAccountId?: string;
     *     authorityType?: string;
     * };
     */
    fromNaaAccountInfo(fromAccount, idToken, idTokenClaims) {
        const effectiveIdTokenClaims = idTokenClaims || fromAccount.idTokenClaims;
        const localAccountId = fromAccount.localAccountId ||
            effectiveIdTokenClaims?.oid ||
            effectiveIdTokenClaims?.sub ||
            "";
        const tenantId = fromAccount.tenantId || effectiveIdTokenClaims?.tid || "";
        const homeAccountId = fromAccount.homeAccountId || `${localAccountId}.${tenantId}`;
        const username = fromAccount.username ||
            effectiveIdTokenClaims?.preferred_username ||
            "";
        const name = fromAccount.name || effectiveIdTokenClaims?.name;
        const loginHint = fromAccount.loginHint || effectiveIdTokenClaims?.login_hint;
        const tenantProfiles = new Map();
        const tenantProfile = buildTenantProfile(homeAccountId, localAccountId, tenantId, effectiveIdTokenClaims);
        tenantProfiles.set(tenantId, tenantProfile);
        const account = {
            homeAccountId,
            environment: fromAccount.environment,
            tenantId,
            username,
            localAccountId,
            name,
            loginHint,
            idToken: idToken,
            idTokenClaims: effectiveIdTokenClaims,
            tenantProfiles,
        };
        return account;
    }
    /**
     *
     * @param error BridgeError
     * @returns AuthError, ClientAuthError, ClientConfigurationError, ServerError, InteractionRequiredError
     */
    fromBridgeError(error) {
        if (isBridgeError(error)) {
            switch (error.status) {
                case BridgeStatusCode.UserCancel:
                    return new ClientAuthError(userCanceled);
                case BridgeStatusCode.NoNetwork:
                    return new ClientAuthError(noNetworkConnectivity$1);
                case BridgeStatusCode.AccountUnavailable:
                    return new ClientAuthError(noAccountFound);
                case BridgeStatusCode.Disabled:
                    return new ClientAuthError(nestedAppAuthBridgeDisabled);
                case BridgeStatusCode.NestedAppAuthUnavailable:
                    return new ClientAuthError(error.code ||
                        nestedAppAuthBridgeDisabled, error.description);
                case BridgeStatusCode.TransientError:
                case BridgeStatusCode.PersistentError:
                    return new ServerError(error.code, error.description);
                case BridgeStatusCode.UserInteractionRequired:
                    return new InteractionRequiredAuthError(error.code, error.description);
                default:
                    return new AuthError(error.code, error.description);
            }
        }
        else {
            return new AuthError("unknown_error", "An unknown error occurred");
        }
    }
    /**
     * Returns an AuthenticationResult from the given cache items
     *
     * @param account
     * @param idToken
     * @param accessToken
     * @param reqTimestamp
     * @returns
     */
    toAuthenticationResultFromCache(account, idToken, accessToken, request, correlationId) {
        if (!idToken || !accessToken) {
            throw createClientAuthError(nullOrEmptyToken);
        }
        const idTokenClaims = extractTokenClaims(idToken.secret, this.crypto.base64Decode);
        const scopes = accessToken.target || request.scopes.join(" ");
        const authenticationResult = {
            authority: accessToken.environment || account.environment,
            uniqueId: account.localAccountId,
            tenantId: account.tenantId,
            scopes: scopes.split(" "),
            account,
            idToken: idToken.secret,
            idTokenClaims: idTokenClaims || {},
            accessToken: accessToken.secret,
            fromCache: true,
            expiresOn: toDateFromSeconds(accessToken.expiresOn),
            extExpiresOn: toDateFromSeconds(accessToken.extendedExpiresOn),
            tokenType: request.authenticationScheme || AuthenticationScheme.BEARER,
            correlationId,
            state: request.state,
        };
        return authenticationResult;
    }
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * NestedAppAuthErrorMessage class containing string constants used by error codes and messages.
 */
const NestedAppAuthErrorMessage = {
    unsupportedMethod: {
        code: "unsupported_method",
        desc: "This method is not supported in nested app environment.",
    },
};
class NestedAppAuthError extends AuthError {
    constructor(errorCode, errorMessage) {
        super(errorCode, errorMessage);
        Object.setPrototypeOf(this, NestedAppAuthError.prototype);
        this.name = "NestedAppAuthError";
    }
    static createUnsupportedError() {
        return new NestedAppAuthError(NestedAppAuthErrorMessage.unsupportedMethod.code, NestedAppAuthErrorMessage.unsupportedMethod.desc);
    }
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
class NestedAppAuthController {
    constructor(operatingContext) {
        this.operatingContext = operatingContext;
        const proxy = this.operatingContext.getBridgeProxy();
        if (proxy !== undefined) {
            this.bridgeProxy = proxy;
        }
        else {
            throw new Error("unexpected: bridgeProxy is undefined");
        }
        // Set the configuration.
        this.config = operatingContext.getConfig();
        // Initialize logger
        this.logger = this.operatingContext.getLogger();
        // Initialize performance client
        this.performanceClient = this.config.telemetry.client;
        // Initialize the crypto class.
        this.browserCrypto = operatingContext.isBrowserEnvironment()
            ? new CryptoOps(this.logger, this.performanceClient, true)
            : DEFAULT_CRYPTO_IMPLEMENTATION;
        this.eventHandler = new EventHandler(this.logger);
        // Initialize the browser storage class.
        this.browserStorage = this.operatingContext.isBrowserEnvironment()
            ? new BrowserCacheManager(this.config.auth.clientId, this.config.cache, this.browserCrypto, this.logger, this.performanceClient, this.eventHandler, buildStaticAuthorityOptions(this.config.auth))
            : DEFAULT_BROWSER_CACHE_MANAGER(this.config.auth.clientId, this.logger, this.performanceClient, this.eventHandler);
        this.nestedAppAuthAdapter = new NestedAppAuthAdapter(this.config.auth.clientId, this.config.auth.clientCapabilities, this.browserCrypto, this.logger);
        // Set the active account if available
        const accountContext = this.bridgeProxy.getAccountContext();
        this.currentAccountContext = accountContext ? accountContext : null;
    }
    /**
     * Factory function to create a new instance of NestedAppAuthController
     * @param operatingContext
     * @returns Promise<IController>
     */
    static async createController(operatingContext) {
        const controller = new NestedAppAuthController(operatingContext);
        return Promise.resolve(controller);
    }
    /**
     * Specific implementation of initialize function for NestedAppAuthController
     * @returns
     */
    async initialize(request, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    isBroker) {
        const initCorrelationId = request?.correlationId || createNewGuid();
        await this.browserStorage.initialize(initCorrelationId);
        return Promise.resolve();
    }
    /**
     * Validate the incoming request and add correlationId if not present
     * @param request
     * @returns
     */
    ensureValidRequest(request) {
        if (request?.correlationId) {
            return request;
        }
        return {
            ...request,
            correlationId: this.browserCrypto.createNewGuid(),
        };
    }
    /**
     * Internal implementation of acquireTokenInteractive flow
     * @param request
     * @returns
     */
    async acquireTokenInteractive(request) {
        const validRequest = this.ensureValidRequest(request);
        this.eventHandler.emitEvent(EventType.ACQUIRE_TOKEN_START, exports.InteractionType.Popup, validRequest);
        const atPopupMeasurement = this.performanceClient.startMeasurement(PerformanceEvents.AcquireTokenPopup, validRequest.correlationId);
        atPopupMeasurement.add({ nestedAppAuthRequest: true });
        try {
            const naaRequest = this.nestedAppAuthAdapter.toNaaTokenRequest(validRequest);
            const reqTimestamp = nowSeconds();
            const response = await this.bridgeProxy.getTokenInteractive(naaRequest);
            const result = {
                ...this.nestedAppAuthAdapter.fromNaaTokenResponse(naaRequest, response, reqTimestamp),
            };
            // cache the tokens in the response
            try {
                // cache hydration can fail in JS Runtime scenario that doesn't support full crypto API
                await this.hydrateCache(result, request);
            }
            catch (error) {
                this.logger.warningPii(`Failed to hydrate cache. Error: ${error}`, validRequest.correlationId);
            }
            // cache the account context in memory after successful token fetch
            this.currentAccountContext = {
                homeAccountId: result.account.homeAccountId,
                environment: result.account.environment,
                tenantId: result.account.tenantId,
            };
            this.eventHandler.emitEvent(EventType.ACQUIRE_TOKEN_SUCCESS, exports.InteractionType.Popup, result);
            atPopupMeasurement.add({
                accessTokenSize: result.accessToken.length,
                idTokenSize: result.idToken.length,
            });
            atPopupMeasurement.end({
                success: true,
                requestId: result.requestId,
            }, undefined, result.account);
            return result;
        }
        catch (e) {
            const error = e instanceof AuthError
                ? e
                : this.nestedAppAuthAdapter.fromBridgeError(e);
            this.eventHandler.emitEvent(EventType.ACQUIRE_TOKEN_FAILURE, exports.InteractionType.Popup, null, e);
            atPopupMeasurement.end({
                success: false,
            }, e, request.account);
            throw error;
        }
    }
    /**
     * Internal implementation of acquireTokenSilent flow
     * @param request
     * @returns
     */
    async acquireTokenSilentInternal(request) {
        const validRequest = this.ensureValidRequest(request);
        this.eventHandler.emitEvent(EventType.ACQUIRE_TOKEN_START, exports.InteractionType.Silent, validRequest);
        // Look for tokens in the cache first
        const result = await this.acquireTokenFromCache(validRequest);
        if (result) {
            this.eventHandler.emitEvent(EventType.ACQUIRE_TOKEN_SUCCESS, exports.InteractionType.Silent, result);
            return result;
        }
        // proceed with acquiring tokens via the host
        const ssoSilentMeasurement = this.performanceClient.startMeasurement(PerformanceEvents.SsoSilent, validRequest.correlationId);
        ssoSilentMeasurement.increment({
            visibilityChangeCount: 0,
        });
        ssoSilentMeasurement.add({
            nestedAppAuthRequest: true,
        });
        try {
            const naaRequest = this.nestedAppAuthAdapter.toNaaTokenRequest(validRequest);
            naaRequest.forceRefresh = validRequest.forceRefresh;
            const reqTimestamp = nowSeconds();
            const response = await this.bridgeProxy.getTokenSilent(naaRequest);
            const result = this.nestedAppAuthAdapter.fromNaaTokenResponse(naaRequest, response, reqTimestamp);
            // cache the tokens in the response
            try {
                // cache hydration can fail in JS Runtime scenario that doesn't support full crypto API
                await this.hydrateCache(result, request);
            }
            catch (error) {
                this.logger.warningPii(`Failed to hydrate cache. Error: ${error}`, validRequest.correlationId);
            }
            // cache the account context in memory after successful token fetch
            this.currentAccountContext = {
                homeAccountId: result.account.homeAccountId,
                environment: result.account.environment,
                tenantId: result.account.tenantId,
            };
            this.eventHandler.emitEvent(EventType.ACQUIRE_TOKEN_SUCCESS, exports.InteractionType.Silent, result);
            ssoSilentMeasurement?.add({
                accessTokenSize: result.accessToken.length,
                idTokenSize: result.idToken.length,
            });
            ssoSilentMeasurement?.end({
                success: true,
                requestId: result.requestId,
            }, undefined, result.account);
            return result;
        }
        catch (e) {
            const error = e instanceof AuthError
                ? e
                : this.nestedAppAuthAdapter.fromBridgeError(e);
            this.eventHandler.emitEvent(EventType.ACQUIRE_TOKEN_FAILURE, exports.InteractionType.Silent, null, e);
            ssoSilentMeasurement?.end({
                success: false,
            }, e, request.account);
            throw error;
        }
    }
    /**
     * acquires tokens from cache
     * @param request
     * @returns
     */
    async acquireTokenFromCache(request) {
        const atsMeasurement = this.performanceClient.startMeasurement(PerformanceEvents.AcquireTokenSilent, request.correlationId);
        atsMeasurement?.add({
            nestedAppAuthRequest: true,
        });
        // if the request has claims, we cannot look up in the cache
        if (request.claims) {
            this.logger.verbose("Claims are present in the request, skipping cache lookup");
            return null;
        }
        // if the request has forceRefresh, we cannot look up in the cache
        if (request.forceRefresh) {
            this.logger.verbose("forceRefresh is set to true, skipping cache lookup");
            return null;
        }
        // respect cache lookup policy
        let result = null;
        if (!request.cacheLookupPolicy) {
            request.cacheLookupPolicy = CacheLookupPolicy.Default;
        }
        switch (request.cacheLookupPolicy) {
            case CacheLookupPolicy.Default:
            case CacheLookupPolicy.AccessToken:
            case CacheLookupPolicy.AccessTokenAndRefreshToken:
                result = await this.acquireTokenFromCacheInternal(request);
                break;
            default:
                return null;
        }
        if (result) {
            this.eventHandler.emitEvent(EventType.ACQUIRE_TOKEN_SUCCESS, exports.InteractionType.Silent, result);
            atsMeasurement.add({
                accessTokenSize: result.accessToken.length,
                idTokenSize: result.idToken.length,
            });
            atsMeasurement.end({
                success: true,
            }, undefined, result.account);
            return result;
        }
        this.logger.warning("Cached tokens are not found for the account, proceeding with silent token request.");
        this.eventHandler.emitEvent(EventType.ACQUIRE_TOKEN_FAILURE, exports.InteractionType.Silent, null);
        atsMeasurement.end({
            success: false,
        }, undefined, request.account);
        return null;
    }
    /**
     *
     * @param request
     * @returns
     */
    async acquireTokenFromCacheInternal(request) {
        // always prioritize the account context from the bridge
        const accountContext = this.bridgeProxy.getAccountContext() || this.currentAccountContext;
        let currentAccount = null;
        const correlationId = request.correlationId || this.browserCrypto.createNewGuid();
        if (accountContext) {
            currentAccount = getAccount(accountContext, this.logger, this.browserStorage, correlationId);
        }
        // fall back to brokering if no cached account is found
        if (!currentAccount) {
            this.logger.verbose("No active account found, falling back to the host");
            return Promise.resolve(null);
        }
        this.logger.verbose("active account found, attempting to acquire token silently");
        const authRequest = {
            ...request,
            correlationId: request.correlationId || this.browserCrypto.createNewGuid(),
            authority: request.authority || currentAccount.environment,
            scopes: request.scopes?.length
                ? request.scopes
                : [...OIDC_DEFAULT_SCOPES],
        };
        // fetch access token and check for expiry
        const tokenKeys = this.browserStorage.getTokenKeys();
        const cachedAccessToken = this.browserStorage.getAccessToken(currentAccount, authRequest, tokenKeys, currentAccount.tenantId);
        // If there is no access token, log it and return null
        if (!cachedAccessToken) {
            this.logger.verbose("No cached access token found");
            return Promise.resolve(null);
        }
        else if (wasClockTurnedBack(cachedAccessToken.cachedAt) ||
            isTokenExpired(cachedAccessToken.expiresOn, this.config.system.tokenRenewalOffsetSeconds)) {
            this.logger.verbose("Cached access token has expired");
            return Promise.resolve(null);
        }
        const cachedIdToken = this.browserStorage.getIdToken(currentAccount, authRequest.correlationId, tokenKeys, currentAccount.tenantId, this.performanceClient);
        if (!cachedIdToken) {
            this.logger.verbose("No cached id token found");
            return Promise.resolve(null);
        }
        return this.nestedAppAuthAdapter.toAuthenticationResultFromCache(currentAccount, cachedIdToken, cachedAccessToken, authRequest, authRequest.correlationId);
    }
    /**
     * acquireTokenPopup flow implementation
     * @param request
     * @returns
     */
    async acquireTokenPopup(request) {
        return this.acquireTokenInteractive(request);
    }
    /**
     * acquireTokenRedirect flow is not supported in nested app auth
     * @param request
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    acquireTokenRedirect(request) {
        throw NestedAppAuthError.createUnsupportedError();
    }
    /**
     * acquireTokenSilent flow implementation
     * @param silentRequest
     * @returns
     */
    async acquireTokenSilent(silentRequest) {
        return this.acquireTokenSilentInternal(silentRequest);
    }
    /**
     * Hybrid flow is not currently supported in nested app auth
     * @param request
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    acquireTokenByCode(request // eslint-disable-line @typescript-eslint/no-unused-vars
    ) {
        throw NestedAppAuthError.createUnsupportedError();
    }
    /**
     * acquireTokenNative flow is not currently supported in nested app auth
     * @param request
     * @param apiId
     * @param accountId
     */
    acquireTokenNative(request, apiId, // eslint-disable-line @typescript-eslint/no-unused-vars
    accountId // eslint-disable-line @typescript-eslint/no-unused-vars
    ) {
        throw NestedAppAuthError.createUnsupportedError();
    }
    /**
     * acquireTokenByRefreshToken flow is not currently supported in nested app auth
     * @param commonRequest
     * @param silentRequest
     */
    acquireTokenByRefreshToken(commonRequest, // eslint-disable-line @typescript-eslint/no-unused-vars
    silentRequest // eslint-disable-line @typescript-eslint/no-unused-vars
    ) {
        throw NestedAppAuthError.createUnsupportedError();
    }
    /**
     * Adds event callbacks to array
     * @param callback
     * @param eventTypes
     */
    addEventCallback(callback, eventTypes) {
        return this.eventHandler.addEventCallback(callback, eventTypes);
    }
    /**
     * Removes callback with provided id from callback array
     * @param callbackId
     */
    removeEventCallback(callbackId) {
        this.eventHandler.removeEventCallback(callbackId);
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    addPerformanceCallback(callback) {
        throw NestedAppAuthError.createUnsupportedError();
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    removePerformanceCallback(callbackId) {
        throw NestedAppAuthError.createUnsupportedError();
    }
    enableAccountStorageEvents() {
        throw NestedAppAuthError.createUnsupportedError();
    }
    disableAccountStorageEvents() {
        throw NestedAppAuthError.createUnsupportedError();
    }
    // #region Account APIs
    /**
     * Returns all the accounts in the cache that match the optional filter. If no filter is provided, all accounts are returned.
     * @param accountFilter - (Optional) filter to narrow down the accounts returned
     * @returns Array of AccountInfo objects in cache
     */
    getAllAccounts(accountFilter) {
        const correlationId = this.browserCrypto.createNewGuid();
        return getAllAccounts(this.logger, this.browserStorage, this.isBrowserEnv(), correlationId, accountFilter);
    }
    /**
     * Returns the first account found in the cache that matches the account filter passed in.
     * @param accountFilter
     * @returns The first account found in the cache matching the provided filter or null if no account could be found.
     */
    getAccount(accountFilter) {
        const correlationId = this.browserCrypto.createNewGuid();
        return getAccount(accountFilter, this.logger, this.browserStorage, correlationId);
    }
    /**
     * Returns the signed in account matching username.
     * (the account object is created at the time of successful login)
     * or null when no matching account is found.
     * This API is provided for convenience but getAccountById should be used for best reliability
     * @param username
     * @returns The account object stored in MSAL
     */
    getAccountByUsername(username) {
        const correlationId = this.browserCrypto.createNewGuid();
        return getAccountByUsername(username, this.logger, this.browserStorage, correlationId);
    }
    /**
     * Returns the signed in account matching homeAccountId.
     * (the account object is created at the time of successful login)
     * or null when no matching account is found
     * @param homeAccountId
     * @returns The account object stored in MSAL
     */
    getAccountByHomeId(homeAccountId) {
        const correlationId = this.browserCrypto.createNewGuid();
        return getAccountByHomeId(homeAccountId, this.logger, this.browserStorage, correlationId);
    }
    /**
     * Returns the signed in account matching localAccountId.
     * (the account object is created at the time of successful login)
     * or null when no matching account is found
     * @param localAccountId
     * @returns The account object stored in MSAL
     */
    getAccountByLocalId(localAccountId) {
        const correlationId = this.browserCrypto.createNewGuid();
        return getAccountByLocalId(localAccountId, this.logger, this.browserStorage, correlationId);
    }
    /**
     * Sets the account to use as the active account. If no account is passed to the acquireToken APIs, then MSAL will use this active account.
     * @param account
     */
    setActiveAccount(account) {
        /*
         * StandardController uses this to allow the developer to set the active account
         * in the nested app auth scenario the active account is controlled by the app hosting the nested app
         */
        const correlationId = this.browserCrypto.createNewGuid();
        return setActiveAccount(account, this.browserStorage, correlationId);
    }
    /**
     * Gets the currently active account
     */
    getActiveAccount() {
        const correlationId = this.browserCrypto.createNewGuid();
        return getActiveAccount(this.browserStorage, correlationId);
    }
    // #endregion
    handleRedirectPromise(hash // eslint-disable-line @typescript-eslint/no-unused-vars
    ) {
        return Promise.resolve(null);
    }
    loginPopup(request // eslint-disable-line @typescript-eslint/no-unused-vars
    ) {
        return this.acquireTokenInteractive(request || DEFAULT_REQUEST);
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    loginRedirect(request) {
        throw NestedAppAuthError.createUnsupportedError();
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    logout(logoutRequest) {
        throw NestedAppAuthError.createUnsupportedError();
    }
    logoutRedirect(logoutRequest // eslint-disable-line @typescript-eslint/no-unused-vars
    ) {
        throw NestedAppAuthError.createUnsupportedError();
    }
    logoutPopup(logoutRequest // eslint-disable-line @typescript-eslint/no-unused-vars
    ) {
        throw NestedAppAuthError.createUnsupportedError();
    }
    ssoSilent(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    request) {
        return this.acquireTokenSilentInternal(request);
    }
    getTokenCache() {
        throw NestedAppAuthError.createUnsupportedError();
    }
    /**
     * Returns the logger instance
     */
    getLogger() {
        return this.logger;
    }
    /**
     * Replaces the default logger set in configurations with new Logger with new configurations
     * @param logger Logger instance
     */
    setLogger(logger) {
        this.logger = logger;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    initializeWrapperLibrary(sku, version) {
        /*
         * Standard controller uses this to set the sku and version of the wrapper library in the storage
         * we do nothing here
         */
        return;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    setNavigationClient(navigationClient) {
        this.logger.warning("setNavigationClient is not supported in nested app auth");
    }
    getConfiguration() {
        return this.config;
    }
    isBrowserEnv() {
        return this.operatingContext.isBrowserEnvironment();
    }
    getBrowserCrypto() {
        return this.browserCrypto;
    }
    getPerformanceClient() {
        throw NestedAppAuthError.createUnsupportedError();
    }
    getRedirectResponse() {
        throw NestedAppAuthError.createUnsupportedError();
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async clearCache(logoutRequest) {
        throw NestedAppAuthError.createUnsupportedError();
    }
    async hydrateCache(result, request) {
        this.logger.verbose("hydrateCache called");
        const accountEntity = AccountEntity.createFromAccountInfo(result.account, result.cloudGraphHostName, result.msGraphHost);
        await this.browserStorage.setAccount(accountEntity, result.correlationId, isKmsi(result.idTokenClaims));
        return this.browserStorage.hydrateCache(result, request);
    }
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
async function createV3Controller(config, request) {
    const standard = new StandardOperatingContext(config);
    await standard.initialize();
    return StandardController.createController(standard, request);
}
async function createController(config) {
    const standard = new StandardOperatingContext(config);
    const nestedApp = new NestedAppOperatingContext(config);
    const operatingContexts = [standard.initialize(), nestedApp.initialize()];
    await Promise.all(operatingContexts);
    if (nestedApp.isAvailable() && config.auth.supportsNestedAppAuth) {
        return NestedAppAuthController.createController(nestedApp);
    }
    else if (standard.isAvailable()) {
        return StandardController.createController(standard);
    }
    else {
        // Since neither of the actual operating contexts are available keep the UnknownOperatingContextController
        return null;
    }
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * The PublicClientApplication class is the object exposed by the library to perform authentication and authorization functions in Single Page Applications
 * to obtain JWT tokens as described in the OAuth 2.0 Authorization Code Flow with PKCE specification.
 */
class PublicClientApplication {
    /**
     * Creates StandardController and passes it to the PublicClientApplication
     *
     * @param configuration {Configuration}
     */
    static async createPublicClientApplication(configuration) {
        const controller = await createV3Controller(configuration);
        const pca = new PublicClientApplication(configuration, controller);
        return pca;
    }
    /**
     * @constructor
     * Constructor for the PublicClientApplication used to instantiate the PublicClientApplication object
     *
     * Important attributes in the Configuration object for auth are:
     * - clientID: the application ID of your application. You can obtain one by registering your application with our Application registration portal : https://portal.azure.com/#blade/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/RegisteredAppsPreview
     * - authority: the authority URL for your application.
     * - redirect_uri: the uri of your application registered in the portal.
     *
     * In Azure AD, authority is a URL indicating the Azure active directory that MSAL uses to obtain tokens.
     * It is of the form https://login.microsoftonline.com/{Enter_the_Tenant_Info_Here}
     * If your application supports Accounts in one organizational directory, replace "Enter_the_Tenant_Info_Here" value with the Tenant Id or Tenant name (for example, contoso.microsoft.com).
     * If your application supports Accounts in any organizational directory, replace "Enter_the_Tenant_Info_Here" value with organizations.
     * If your application supports Accounts in any organizational directory and personal Microsoft accounts, replace "Enter_the_Tenant_Info_Here" value with common.
     * To restrict support to Personal Microsoft accounts only, replace "Enter_the_Tenant_Info_Here" value with consumers.
     *
     * In Azure B2C, authority is of the form https://{instance}/tfp/{tenant}/{policyName}/
     * Full B2C functionality will be available in this library in future versions.
     *
     * @param configuration Object for the MSAL PublicClientApplication instance
     * @param IController Optional parameter to explictly set the controller. (Will be removed when we remove public constructor)
     */
    constructor(configuration, controller) {
        this.isBroker = false;
        this.controller =
            controller ||
                new StandardController(new StandardOperatingContext(configuration));
    }
    /**
     * Initializer function to perform async startup tasks such as connecting to WAM extension
     * @param request {?InitializeApplicationRequest}
     */
    async initialize(request) {
        return this.controller.initialize(request, this.isBroker);
    }
    /**
     * Use when you want to obtain an access_token for your API via opening a popup window in the user's browser
     *
     * @param request
     *
     * @returns A promise that is fulfilled when this function has completed, or rejected if an error was raised.
     */
    async acquireTokenPopup(request) {
        return this.controller.acquireTokenPopup(request);
    }
    /**
     * Use when you want to obtain an access_token for your API by redirecting the user's browser window to the authorization endpoint. This function redirects
     * the page, so any code that follows this function will not execute.
     *
     * IMPORTANT: It is NOT recommended to have code that is dependent on the resolution of the Promise. This function will navigate away from the current
     * browser window. It currently returns a Promise in order to reflect the asynchronous nature of the code running in this function.
     *
     * @param request
     */
    acquireTokenRedirect(request) {
        return this.controller.acquireTokenRedirect(request);
    }
    /**
     * Silently acquire an access token for a given set of scopes. Returns currently processing promise if parallel requests are made.
     *
     * @param {@link (SilentRequest:type)}
     * @returns {Promise.<AuthenticationResult>} - a promise that is fulfilled when this function has completed, or rejected if an error was raised. Returns the {@link AuthenticationResult} object
     */
    acquireTokenSilent(silentRequest) {
        return this.controller.acquireTokenSilent(silentRequest);
    }
    /**
     * This function redeems an authorization code (passed as code) from the eSTS token endpoint.
     * This authorization code should be acquired server-side using a confidential client to acquire a spa_code.
     * This API is not indended for normal authorization code acquisition and redemption.
     *
     * Redemption of this authorization code will not require PKCE, as it was acquired by a confidential client.
     *
     * @param request {@link AuthorizationCodeRequest}
     * @returns A promise that is fulfilled when this function has completed, or rejected if an error was raised.
     */
    acquireTokenByCode(request) {
        return this.controller.acquireTokenByCode(request);
    }
    /**
     * Adds event callbacks to array
     * @param callback
     * @param eventTypes
     */
    addEventCallback(callback, eventTypes) {
        return this.controller.addEventCallback(callback, eventTypes);
    }
    /**
     * Removes callback with provided id from callback array
     * @param callbackId
     */
    removeEventCallback(callbackId) {
        return this.controller.removeEventCallback(callbackId);
    }
    /**
     * Registers a callback to receive performance events.
     *
     * @param {PerformanceCallbackFunction} callback
     * @returns {string}
     */
    addPerformanceCallback(callback) {
        return this.controller.addPerformanceCallback(callback);
    }
    /**
     * Removes a callback registered with addPerformanceCallback.
     *
     * @param {string} callbackId
     * @returns {boolean}
     */
    removePerformanceCallback(callbackId) {
        return this.controller.removePerformanceCallback(callbackId);
    }
    /**
     * Adds event listener that emits an event when a user account is added or removed from localstorage in a different browser tab or window
     */
    enableAccountStorageEvents() {
        this.controller.enableAccountStorageEvents();
    }
    /**
     * Removes event listener that emits an event when a user account is added or removed from localstorage in a different browser tab or window
     */
    disableAccountStorageEvents() {
        this.controller.disableAccountStorageEvents();
    }
    /**
     * Returns the first account found in the cache that matches the account filter passed in.
     * @param accountFilter
     * @returns The first account found in the cache matching the provided filter or null if no account could be found.
     */
    getAccount(accountFilter) {
        return this.controller.getAccount(accountFilter);
    }
    /**
     * Returns the signed in account matching homeAccountId.
     * (the account object is created at the time of successful login)
     * or null when no matching account is found
     * @param homeAccountId
     * @returns The account object stored in MSAL
     * @deprecated - Use getAccount instead
     */
    getAccountByHomeId(homeAccountId) {
        return this.controller.getAccountByHomeId(homeAccountId);
    }
    /**
     * Returns the signed in account matching localAccountId.
     * (the account object is created at the time of successful login)
     * or null when no matching account is found
     * @param localAccountId
     * @returns The account object stored in MSAL
     * @deprecated - Use getAccount instead
     */
    getAccountByLocalId(localId) {
        return this.controller.getAccountByLocalId(localId);
    }
    /**
     * Returns the signed in account matching username.
     * (the account object is created at the time of successful login)
     * or null when no matching account is found.
     * This API is provided for convenience but getAccountById should be used for best reliability
     * @param userName
     * @returns The account object stored in MSAL
     * @deprecated - Use getAccount instead
     */
    getAccountByUsername(userName) {
        return this.controller.getAccountByUsername(userName);
    }
    /**
     * Returns all the accounts in the cache that match the optional filter. If no filter is provided, all accounts are returned.
     * @param accountFilter - (Optional) filter to narrow down the accounts returned
     * @returns Array of AccountInfo objects in cache
     */
    getAllAccounts(accountFilter) {
        return this.controller.getAllAccounts(accountFilter);
    }
    /**
     * Event handler function which allows users to fire events after the PublicClientApplication object
     * has loaded during redirect flows. This should be invoked on all page loads involved in redirect
     * auth flows.
     * @param hash Hash to process. Defaults to the current value of window.location.hash. Only needs to be provided explicitly if the response to be handled is not contained in the current value.
     * @returns Token response or null. If the return value is null, then no auth redirect was detected.
     */
    handleRedirectPromise(hash) {
        return this.controller.handleRedirectPromise(hash);
    }
    /**
     * Use when initiating the login process via opening a popup window in the user's browser
     *
     * @param request
     *
     * @returns A promise that is fulfilled when this function has completed, or rejected if an error was raised.
     */
    loginPopup(request) {
        return this.controller.loginPopup(request);
    }
    /**
     * Use when initiating the login process by redirecting the user's browser to the authorization endpoint. This function redirects the page, so
     * any code that follows this function will not execute.
     *
     * IMPORTANT: It is NOT recommended to have code that is dependent on the resolution of the Promise. This function will navigate away from the current
     * browser window. It currently returns a Promise in order to reflect the asynchronous nature of the code running in this function.
     *
     * @param request
     */
    loginRedirect(request) {
        return this.controller.loginRedirect(request);
    }
    /**
     * Deprecated logout function. Use logoutRedirect or logoutPopup instead
     * @param logoutRequest
     * @deprecated
     */
    logout(logoutRequest) {
        return this.controller.logout(logoutRequest);
    }
    /**
     * Use to log out the current user, and redirect the user to the postLogoutRedirectUri.
     * Default behaviour is to redirect the user to `window.location.href`.
     * @param logoutRequest
     */
    logoutRedirect(logoutRequest) {
        return this.controller.logoutRedirect(logoutRequest);
    }
    /**
     * Clears local cache for the current user then opens a popup window prompting the user to sign-out of the server
     * @param logoutRequest
     */
    logoutPopup(logoutRequest) {
        return this.controller.logoutPopup(logoutRequest);
    }
    /**
     * This function uses a hidden iframe to fetch an authorization code from the eSTS. There are cases where this may not work:
     * - Any browser using a form of Intelligent Tracking Prevention
     * - If there is not an established session with the service
     *
     * In these cases, the request must be done inside a popup or full frame redirect.
     *
     * For the cases where interaction is required, you cannot send a request with prompt=none.
     *
     * If your refresh token has expired, you can use this function to fetch a new set of tokens silently as long as
     * you session on the server still exists.
     * @param request {@link SsoSilentRequest}
     *
     * @returns A promise that is fulfilled when this function has completed, or rejected if an error was raised.
     */
    ssoSilent(request) {
        return this.controller.ssoSilent(request);
    }
    /**
     * Gets the token cache for the application.
     */
    getTokenCache() {
        return this.controller.getTokenCache();
    }
    /**
     * Returns the logger instance
     */
    getLogger() {
        return this.controller.getLogger();
    }
    /**
     * Replaces the default logger set in configurations with new Logger with new configurations
     * @param logger Logger instance
     */
    setLogger(logger) {
        this.controller.setLogger(logger);
    }
    /**
     * Sets the account to use as the active account. If no account is passed to the acquireToken APIs, then MSAL will use this active account.
     * @param account
     */
    setActiveAccount(account) {
        this.controller.setActiveAccount(account);
    }
    /**
     * Gets the currently active account
     */
    getActiveAccount() {
        return this.controller.getActiveAccount();
    }
    /**
     * Called by wrapper libraries (Angular & React) to set SKU and Version passed down to telemetry, logger, etc.
     * @param sku
     * @param version
     */
    initializeWrapperLibrary(sku, version) {
        return this.controller.initializeWrapperLibrary(sku, version);
    }
    /**
     * Sets navigation client
     * @param navigationClient
     */
    setNavigationClient(navigationClient) {
        this.controller.setNavigationClient(navigationClient);
    }
    /**
     * Returns the configuration object
     * @internal
     */
    getConfiguration() {
        return this.controller.getConfiguration();
    }
    /**
     * Hydrates cache with the tokens and account in the AuthenticationResult object
     * @param result
     * @param request - The request object that was used to obtain the AuthenticationResult
     * @returns
     */
    async hydrateCache(result, request) {
        return this.controller.hydrateCache(result, request);
    }
    /**
     * Clears tokens and account from the browser cache.
     * @param logoutRequest
     */
    clearCache(logoutRequest) {
        return this.controller.clearCache(logoutRequest);
    }
}
/**
 * creates NestedAppAuthController and passes it to the PublicClientApplication,
 * falls back to StandardController if NestedAppAuthController is not available
 *
 * @param configuration
 * @returns IPublicClientApplication
 *
 */
async function createNestablePublicClientApplication(configuration) {
    const nestedAppAuth = new NestedAppOperatingContext(configuration);
    await nestedAppAuth.initialize();
    if (nestedAppAuth.isAvailable()) {
        const controller = new NestedAppAuthController(nestedAppAuth);
        const nestablePCA = new PublicClientApplication(configuration, controller);
        await nestablePCA.initialize();
        return nestablePCA;
    }
    return createStandardPublicClientApplication(configuration);
}
/**
 * creates PublicClientApplication using StandardController
 *
 * @param configuration
 * @returns IPublicClientApplication
 *
 */
async function createStandardPublicClientApplication(configuration) {
    const pca = new PublicClientApplication(configuration);
    await pca.initialize();
    return pca;
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * UnknownOperatingContextController class
 *
 * - Until initialize method is called, this controller is the default
 * - AFter initialize method is called, this controller will be swapped out for the appropriate controller
 * if the operating context can be determined; otherwise this controller will continued be used
 *
 * - Why do we have this?  We don't want to dynamically import (download) all of the code in StandardController if we don't need to.
 *
 * - Only includes implementation for getAccounts and handleRedirectPromise
 *   - All other methods are will throw initialization error (because either initialize method or the factory method were not used)
 *   - This controller is necessary for React Native wrapper, server side rendering and any other scenario where we don't have a DOM
 *
 */
class UnknownOperatingContextController {
    constructor(operatingContext) {
        // Flag representing whether or not the initialize API has been called and completed
        this.initialized = false;
        this.operatingContext = operatingContext;
        this.isBrowserEnvironment =
            this.operatingContext.isBrowserEnvironment();
        this.config = operatingContext.getConfig();
        this.logger = operatingContext.getLogger();
        // Initialize performance client
        this.performanceClient = this.config.telemetry.client;
        // Initialize the crypto class.
        this.browserCrypto = this.isBrowserEnvironment
            ? new CryptoOps(this.logger, this.performanceClient)
            : DEFAULT_CRYPTO_IMPLEMENTATION;
        this.eventHandler = new EventHandler(this.logger);
        // Initialize the browser storage class.
        this.browserStorage = this.isBrowserEnvironment
            ? new BrowserCacheManager(this.config.auth.clientId, this.config.cache, this.browserCrypto, this.logger, this.performanceClient, this.eventHandler, undefined)
            : DEFAULT_BROWSER_CACHE_MANAGER(this.config.auth.clientId, this.logger, this.performanceClient, this.eventHandler);
    }
    getBrowserStorage() {
        return this.browserStorage;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getAccount(accountFilter) {
        return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getAccountByHomeId(homeAccountId) {
        return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getAccountByLocalId(localAccountId) {
        return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getAccountByUsername(username) {
        return null;
    }
    getAllAccounts() {
        return [];
    }
    initialize() {
        this.initialized = true;
        return Promise.resolve();
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    acquireTokenPopup(request) {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
        return {};
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    acquireTokenRedirect(request) {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
        return Promise.resolve();
    }
    acquireTokenSilent(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    silentRequest) {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
        return {};
    }
    acquireTokenByCode(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    request) {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
        return {};
    }
    acquireTokenNative(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    request, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    apiId, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    accountId) {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
        return {};
    }
    acquireTokenByRefreshToken(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    commonRequest, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    silentRequest) {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
        return {};
    }
    addEventCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    callback, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    eventTypes) {
        return null;
    }
    removeEventCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    callbackId) { }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    addPerformanceCallback(callback) {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
        return "";
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    removePerformanceCallback(callbackId) {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
        return true;
    }
    enableAccountStorageEvents() {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
    }
    disableAccountStorageEvents() {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
    }
    handleRedirectPromise(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    hash) {
        blockAPICallsBeforeInitialize(this.initialized);
        return Promise.resolve(null);
    }
    loginPopup(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    request) {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
        return {};
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    loginRedirect(request) {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
        return {};
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    logout(logoutRequest) {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
        return {};
    }
    logoutRedirect(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    logoutRequest) {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
        return {};
    }
    logoutPopup(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    logoutRequest) {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
        return {};
    }
    ssoSilent(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    request) {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
        return {};
    }
    getTokenCache() {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
        return {};
    }
    getLogger() {
        return this.logger;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    setLogger(logger) {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    setActiveAccount(account) {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
    }
    getActiveAccount() {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
        return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    initializeWrapperLibrary(sku, version) {
        this.browserStorage.setWrapperMetadata(sku, version);
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    setNavigationClient(navigationClient) {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
    }
    getConfiguration() {
        return this.config;
    }
    isBrowserEnv() {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
        return true;
    }
    getBrowserCrypto() {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
        return {};
    }
    getPerformanceClient() {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
        return {};
    }
    getRedirectResponse() {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
        return {};
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async clearCache(logoutRequest) {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async hydrateCache(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    result, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    request) {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
    }
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
class UnknownOperatingContext extends BaseOperatingContext {
    /**
     * Returns the unique identifier for this operating context
     * @returns string
     */
    getId() {
        return UnknownOperatingContext.ID;
    }
    /**
     * Return the module name.  Intended for use with import() to enable dynamic import
     * of the implementation associated with this operating context
     * @returns
     */
    getModuleName() {
        return UnknownOperatingContext.MODULE_NAME;
    }
    /**
     * Checks whether the operating context is available.
     * Confirms that the code is running a browser rather.  This is required.
     * @returns Promise<boolean> indicating whether this operating context is currently available.
     */
    async initialize() {
        /**
         * This operating context is in use when we have not checked for what the operating context is.
         * The context is unknown until we check it.
         */
        return true;
    }
}
/*
 * TODO: Once we have determine the bundling code return here to specify the name of the bundle
 * containing the implementation for this operating context
 */
UnknownOperatingContext.MODULE_NAME = "";
/**
 * Unique identifier for the operating context
 */
UnknownOperatingContext.ID = "UnknownOperatingContext";

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * PublicClientNext is an early look at the planned implementation of PublicClientApplication in the next major version of MSAL.js.
 * It contains support for multiple API implementations based on the runtime environment that it is running in.
 *
 * The goals of these changes are to provide a clean separation of behavior between different operating contexts (Nested App Auth, Platform Brokers, Plain old Browser, etc.)
 * while still providing a consistent API surface for developers.
 *
 * Please use PublicClientApplication for any prod/real-world scenarios.
 * Note: PublicClientNext is experimental and subject to breaking changes without following semver
 *
 */
class PublicClientNext {
    static async createPublicClientApplication(configuration) {
        const controller = await createController(configuration);
        let pca;
        if (controller !== null) {
            pca = new PublicClientNext(configuration, controller);
        }
        else {
            pca = new PublicClientNext(configuration);
        }
        return pca;
    }
    /**
     * @constructor
     * Constructor for the PublicClientNext used to instantiate the PublicClientNext object
     *
     * Important attributes in the Configuration object for auth are:
     * - clientID: the application ID of your application. You can obtain one by registering your application with our Application registration portal : https://portal.azure.com/#blade/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/RegisteredAppsPreview
     * - authority: the authority URL for your application.
     * - redirect_uri: the uri of your application registered in the portal.
     *
     * In Azure AD, authority is a URL indicating the Azure active directory that MSAL uses to obtain tokens.
     * It is of the form https://login.microsoftonline.com/{Enter_the_Tenant_Info_Here}
     * If your application supports Accounts in one organizational directory, replace "Enter_the_Tenant_Info_Here" value with the Tenant Id or Tenant name (for example, contoso.microsoft.com).
     * If your application supports Accounts in any organizational directory, replace "Enter_the_Tenant_Info_Here" value with organizations.
     * If your application supports Accounts in any organizational directory and personal Microsoft accounts, replace "Enter_the_Tenant_Info_Here" value with common.
     * To restrict support to Personal Microsoft accounts only, replace "Enter_the_Tenant_Info_Here" value with consumers.
     *
     * In Azure B2C, authority is of the form https://{instance}/tfp/{tenant}/{policyName}/
     * Full B2C functionality will be available in this library in future versions.
     *
     * @param configuration Object for the MSAL PublicClientApplication instance
     * @param IController Optional parameter to explictly set the controller. (Will be removed when we remove public constructor)
     */
    constructor(configuration, controller) {
        this.configuration = configuration;
        if (controller) {
            this.controller = controller;
        }
        else {
            const operatingContext = new UnknownOperatingContext(configuration);
            this.controller = new UnknownOperatingContextController(operatingContext);
        }
    }
    /**
     * Initializer function to perform async startup tasks such as connecting to WAM extension
     */
    async initialize() {
        if (this.controller instanceof UnknownOperatingContextController) {
            const result = await createController(this.configuration);
            if (result !== null) {
                this.controller = result;
            }
            return this.controller.initialize();
        }
        return Promise.resolve();
    }
    /**
     * Use when you want to obtain an access_token for your API via opening a popup window in the user's browser
     *
     * @param request
     *
     * @returns A promise that is fulfilled when this function has completed, or rejected if an error was raised.
     */
    async acquireTokenPopup(request) {
        return this.controller.acquireTokenPopup(request);
    }
    /**
     * Use when you want to obtain an access_token for your API by redirecting the user's browser window to the authorization endpoint. This function redirects
     * the page, so any code that follows this function will not execute.
     *
     * IMPORTANT: It is NOT recommended to have code that is dependent on the resolution of the Promise. This function will navigate away from the current
     * browser window. It currently returns a Promise in order to reflect the asynchronous nature of the code running in this function.
     *
     * @param request
     */
    acquireTokenRedirect(request) {
        return this.controller.acquireTokenRedirect(request);
    }
    /**
     * Silently acquire an access token for a given set of scopes. Returns currently processing promise if parallel requests are made.
     *
     * @param {@link (SilentRequest:type)}
     * @returns {Promise.<AuthenticationResult>} - a promise that is fulfilled when this function has completed, or rejected if an error was raised. Returns the {@link AuthenticationResult} object
     */
    acquireTokenSilent(silentRequest) {
        return this.controller.acquireTokenSilent(silentRequest);
    }
    /**
     * This function redeems an authorization code (passed as code) from the eSTS token endpoint.
     * This authorization code should be acquired server-side using a confidential client to acquire a spa_code.
     * This API is not indended for normal authorization code acquisition and redemption.
     *
     * Redemption of this authorization code will not require PKCE, as it was acquired by a confidential client.
     *
     * @param request {@link AuthorizationCodeRequest}
     * @returns A promise that is fulfilled when this function has completed, or rejected if an error was raised.
     */
    acquireTokenByCode(request) {
        return this.controller.acquireTokenByCode(request);
    }
    /**
     * Adds event callbacks to array
     * @param callback
     */
    addEventCallback(callback, eventTypes) {
        return this.controller.addEventCallback(callback, eventTypes);
    }
    /**
     * Removes callback with provided id from callback array
     * @param callbackId
     */
    removeEventCallback(callbackId) {
        return this.controller.removeEventCallback(callbackId);
    }
    /**
     * Registers a callback to receive performance events.
     *
     * @param {PerformanceCallbackFunction} callback
     * @returns {string}
     */
    addPerformanceCallback(callback) {
        return this.controller.addPerformanceCallback(callback);
    }
    /**
     * Removes a callback registered with addPerformanceCallback.
     *
     * @param {string} callbackId
     * @returns {boolean}
     */
    removePerformanceCallback(callbackId) {
        return this.controller.removePerformanceCallback(callbackId);
    }
    /**
     * Adds event listener that emits an event when a user account is added or removed from localstorage in a different browser tab or window
     */
    enableAccountStorageEvents() {
        this.controller.enableAccountStorageEvents();
    }
    /**
     * Removes event listener that emits an event when a user account is added or removed from localstorage in a different browser tab or window
     */
    disableAccountStorageEvents() {
        this.controller.disableAccountStorageEvents();
    }
    /**
     * Returns the first account found in the cache that matches the account filter passed in.
     * @param accountFilter
     * @returns The first account found in the cache matching the provided filter or null if no account could be found.
     */
    getAccount(accountFilter) {
        return this.controller.getAccount(accountFilter);
    }
    /**
     * Returns the signed in account matching homeAccountId.
     * (the account object is created at the time of successful login)
     * or null when no matching account is found
     * @param homeAccountId
     * @returns The account object stored in MSAL
     * @deprecated - Use getAccount instead
     */
    getAccountByHomeId(homeAccountId) {
        return this.controller.getAccountByHomeId(homeAccountId);
    }
    /**
     * Returns the signed in account matching localAccountId.
     * (the account object is created at the time of successful login)
     * or null when no matching account is found
     * @param localAccountId
     * @returns The account object stored in MSAL
     * @deprecated - Use getAccount instead
     */
    getAccountByLocalId(localId) {
        return this.controller.getAccountByLocalId(localId);
    }
    /**
     * Returns the signed in account matching username.
     * (the account object is created at the time of successful login)
     * or null when no matching account is found.
     * This API is provided for convenience but getAccountById should be used for best reliability
     * @param userName
     * @returns The account object stored in MSAL
     * @deprecated - Use getAccount instead
     */
    getAccountByUsername(userName) {
        return this.controller.getAccountByUsername(userName);
    }
    /**
     * Returns all the accounts in the cache that match the optional filter. If no filter is provided, all accounts are returned.
     * @param accountFilter - (Optional) filter to narrow down the accounts returned
     * @returns Array of AccountInfo objects in cache
     */
    getAllAccounts(accountFilter) {
        return this.controller.getAllAccounts(accountFilter);
    }
    /**
     * Event handler function which allows users to fire events after the PublicClientApplication object
     * has loaded during redirect flows. This should be invoked on all page loads involved in redirect
     * auth flows.
     * @param hash Hash to process. Defaults to the current value of window.location.hash. Only needs to be provided explicitly if the response to be handled is not contained in the current value.
     * @returns Token response or null. If the return value is null, then no auth redirect was detected.
     */
    handleRedirectPromise(hash) {
        return this.controller.handleRedirectPromise(hash);
    }
    /**
     * Use when initiating the login process via opening a popup window in the user's browser
     *
     * @param request
     *
     * @returns A promise that is fulfilled when this function has completed, or rejected if an error was raised.
     */
    loginPopup(request) {
        return this.controller.loginPopup(request);
    }
    /**
     * Use when initiating the login process by redirecting the user's browser to the authorization endpoint. This function redirects the page, so
     * any code that follows this function will not execute.
     *
     * IMPORTANT: It is NOT recommended to have code that is dependent on the resolution of the Promise. This function will navigate away from the current
     * browser window. It currently returns a Promise in order to reflect the asynchronous nature of the code running in this function.
     *
     * @param request
     */
    loginRedirect(request) {
        return this.controller.loginRedirect(request);
    }
    /**
     * Deprecated logout function. Use logoutRedirect or logoutPopup instead
     * @param logoutRequest
     * @deprecated
     */
    logout(logoutRequest) {
        return this.controller.logout(logoutRequest);
    }
    /**
     * Use to log out the current user, and redirect the user to the postLogoutRedirectUri.
     * Default behaviour is to redirect the user to `window.location.href`.
     * @param logoutRequest
     */
    logoutRedirect(logoutRequest) {
        return this.controller.logoutRedirect(logoutRequest);
    }
    /**
     * Clears local cache for the current user then opens a popup window prompting the user to sign-out of the server
     * @param logoutRequest
     */
    logoutPopup(logoutRequest) {
        return this.controller.logoutPopup(logoutRequest);
    }
    /**
     * This function uses a hidden iframe to fetch an authorization code from the eSTS. There are cases where this may not work:
     * - Any browser using a form of Intelligent Tracking Prevention
     * - If there is not an established session with the service
     *
     * In these cases, the request must be done inside a popup or full frame redirect.
     *
     * For the cases where interaction is required, you cannot send a request with prompt=none.
     *
     * If your refresh token has expired, you can use this function to fetch a new set of tokens silently as long as
     * you session on the server still exists.
     * @param request {@link SsoSilentRequest}
     *
     * @returns A promise that is fulfilled when this function has completed, or rejected if an error was raised.
     */
    ssoSilent(request) {
        return this.controller.ssoSilent(request);
    }
    /**
     * Gets the token cache for the application.
     */
    getTokenCache() {
        return this.controller.getTokenCache();
    }
    /**
     * Returns the logger instance
     */
    getLogger() {
        return this.controller.getLogger();
    }
    /**
     * Replaces the default logger set in configurations with new Logger with new configurations
     * @param logger Logger instance
     */
    setLogger(logger) {
        this.controller.setLogger(logger);
    }
    /**
     * Sets the account to use as the active account. If no account is passed to the acquireToken APIs, then MSAL will use this active account.
     * @param account
     */
    setActiveAccount(account) {
        this.controller.setActiveAccount(account);
    }
    /**
     * Gets the currently active account
     */
    getActiveAccount() {
        return this.controller.getActiveAccount();
    }
    /**
     * Called by wrapper libraries (Angular & React) to set SKU and Version passed down to telemetry, logger, etc.
     * @param sku
     * @param version
     */
    initializeWrapperLibrary(sku, version) {
        return this.controller.initializeWrapperLibrary(sku, version);
    }
    /**
     * Sets navigation client
     * @param navigationClient
     */
    setNavigationClient(navigationClient) {
        this.controller.setNavigationClient(navigationClient);
    }
    /**
     * Returns the configuration object
     * @internal
     */
    getConfiguration() {
        return this.controller.getConfiguration();
    }
    /**
     * Hydrates cache with the tokens and account in the AuthenticationResult object
     * @param result
     * @param request - The request object that was used to obtain the AuthenticationResult
     * @returns
     */
    async hydrateCache(result, request) {
        return this.controller.hydrateCache(result, request);
    }
    /**
     * Clears tokens and account from the browser cache.
     * @param logoutRequest
     */
    clearCache(logoutRequest) {
        return this.controller.clearCache(logoutRequest);
    }
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const stubbedPublicClientApplication = {
    initialize: () => {
        return Promise.reject(createBrowserConfigurationAuthError(stubbedPublicClientApplicationCalled));
    },
    acquireTokenPopup: () => {
        return Promise.reject(createBrowserConfigurationAuthError(stubbedPublicClientApplicationCalled));
    },
    acquireTokenRedirect: () => {
        return Promise.reject(createBrowserConfigurationAuthError(stubbedPublicClientApplicationCalled));
    },
    acquireTokenSilent: () => {
        return Promise.reject(createBrowserConfigurationAuthError(stubbedPublicClientApplicationCalled));
    },
    acquireTokenByCode: () => {
        return Promise.reject(createBrowserConfigurationAuthError(stubbedPublicClientApplicationCalled));
    },
    getAllAccounts: () => {
        return [];
    },
    getAccount: () => {
        return null;
    },
    getAccountByHomeId: () => {
        return null;
    },
    getAccountByUsername: () => {
        return null;
    },
    getAccountByLocalId: () => {
        return null;
    },
    handleRedirectPromise: () => {
        return Promise.reject(createBrowserConfigurationAuthError(stubbedPublicClientApplicationCalled));
    },
    loginPopup: () => {
        return Promise.reject(createBrowserConfigurationAuthError(stubbedPublicClientApplicationCalled));
    },
    loginRedirect: () => {
        return Promise.reject(createBrowserConfigurationAuthError(stubbedPublicClientApplicationCalled));
    },
    logout: () => {
        return Promise.reject(createBrowserConfigurationAuthError(stubbedPublicClientApplicationCalled));
    },
    logoutRedirect: () => {
        return Promise.reject(createBrowserConfigurationAuthError(stubbedPublicClientApplicationCalled));
    },
    logoutPopup: () => {
        return Promise.reject(createBrowserConfigurationAuthError(stubbedPublicClientApplicationCalled));
    },
    ssoSilent: () => {
        return Promise.reject(createBrowserConfigurationAuthError(stubbedPublicClientApplicationCalled));
    },
    addEventCallback: () => {
        return null;
    },
    removeEventCallback: () => {
        return;
    },
    addPerformanceCallback: () => {
        return "";
    },
    removePerformanceCallback: () => {
        return false;
    },
    enableAccountStorageEvents: () => {
        return;
    },
    disableAccountStorageEvents: () => {
        return;
    },
    getTokenCache: () => {
        throw createBrowserConfigurationAuthError(stubbedPublicClientApplicationCalled);
    },
    getLogger: () => {
        throw createBrowserConfigurationAuthError(stubbedPublicClientApplicationCalled);
    },
    setLogger: () => {
        return;
    },
    setActiveAccount: () => {
        return;
    },
    getActiveAccount: () => {
        return null;
    },
    initializeWrapperLibrary: () => {
        return;
    },
    setNavigationClient: () => {
        return;
    },
    getConfiguration: () => {
        throw createBrowserConfigurationAuthError(stubbedPublicClientApplicationCalled);
    },
    hydrateCache: () => {
        return Promise.reject(createBrowserConfigurationAuthError(stubbedPublicClientApplicationCalled));
    },
    clearCache: () => {
        return Promise.reject(createBrowserConfigurationAuthError(stubbedPublicClientApplicationCalled));
    },
};

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
class EventMessageUtils {
    /**
     * Gets interaction status from event message
     * @param message
     * @param currentStatus
     */
    static getInteractionStatusFromEvent(message, currentStatus) {
        switch (message.eventType) {
            case EventType.LOGIN_START:
                return InteractionStatus.Login;
            case EventType.SSO_SILENT_START:
                return InteractionStatus.SsoSilent;
            case EventType.ACQUIRE_TOKEN_START:
                if (message.interactionType === exports.InteractionType.Redirect ||
                    message.interactionType === exports.InteractionType.Popup) {
                    return InteractionStatus.AcquireToken;
                }
                break;
            case EventType.HANDLE_REDIRECT_START:
                return InteractionStatus.HandleRedirect;
            case EventType.LOGOUT_START:
                return InteractionStatus.Logout;
            case EventType.SSO_SILENT_SUCCESS:
            case EventType.SSO_SILENT_FAILURE:
                if (currentStatus &&
                    currentStatus !== InteractionStatus.SsoSilent) {
                    // Prevent this event from clearing any status other than ssoSilent
                    break;
                }
                return InteractionStatus.None;
            case EventType.LOGOUT_END:
                if (currentStatus &&
                    currentStatus !== InteractionStatus.Logout) {
                    // Prevent this event from clearing any status other than logout
                    break;
                }
                return InteractionStatus.None;
            case EventType.HANDLE_REDIRECT_END:
                if (currentStatus &&
                    currentStatus !== InteractionStatus.HandleRedirect) {
                    // Prevent this event from clearing any status other than handleRedirect
                    break;
                }
                return InteractionStatus.None;
            case EventType.LOGIN_SUCCESS:
            case EventType.LOGIN_FAILURE:
            case EventType.ACQUIRE_TOKEN_SUCCESS:
            case EventType.ACQUIRE_TOKEN_FAILURE:
            case EventType.RESTORE_FROM_BFCACHE:
                if (message.interactionType === exports.InteractionType.Redirect ||
                    message.interactionType === exports.InteractionType.Popup) {
                    if (currentStatus &&
                        currentStatus !== InteractionStatus.Login &&
                        currentStatus !== InteractionStatus.AcquireToken) {
                        // Prevent this event from clearing any status other than login or acquireToken
                        break;
                    }
                    return InteractionStatus.None;
                }
                break;
        }
        return null;
    }
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
class SignedHttpRequest {
    constructor(shrParameters, shrOptions) {
        const loggerOptions = (shrOptions && shrOptions.loggerOptions) || {};
        this.logger = new Logger(loggerOptions, name, version);
        this.cryptoOps = new CryptoOps(this.logger);
        this.popTokenGenerator = new PopTokenGenerator(this.cryptoOps);
        this.shrParameters = shrParameters;
    }
    /**
     * Generates and caches a keypair for the given request options.
     * @returns Public key digest, which should be sent to the token issuer.
     */
    async generatePublicKeyThumbprint() {
        const { kid } = await this.popTokenGenerator.generateKid(this.shrParameters);
        return kid;
    }
    /**
     * Generates a signed http request for the given payload with the given key.
     * @param payload Payload to sign (e.g. access token)
     * @param publicKeyThumbprint Public key digest (from generatePublicKeyThumbprint API)
     * @param claims Additional claims to include/override in the signed JWT
     * @returns Pop token signed with the corresponding private key
     */
    async signRequest(payload, publicKeyThumbprint, claims) {
        return this.popTokenGenerator.signPayload(payload, publicKeyThumbprint, this.shrParameters, claims);
    }
    /**
     * Removes cached keys from browser for given public key thumbprint
     * @param publicKeyThumbprint Public key digest (from generatePublicKeyThumbprint API)
     * @returns If keys are properly deleted
     */
    async removeKeys(publicKeyThumbprint) {
        return this.cryptoOps
            .removeTokenBindingKey(publicKeyThumbprint)
            .then(() => true)
            .catch((error) => {
            /*
             * @deprecated - To maintain public API signature, we return false if the error is due to the key still being present in indexedDB.
             */
            if (error instanceof ClientAuthError &&
                error.errorCode ===
                    bindingKeyNotRemoved) {
                return false;
            }
            throw error;
        });
    }
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Returns browser performance measurement module if session flag is enabled. Returns undefined otherwise.
 */
function getPerfMeasurementModule() {
    let sessionStorage;
    try {
        sessionStorage = window[BrowserCacheLocation.SessionStorage];
        const perfEnabled = sessionStorage?.getItem(BROWSER_PERF_ENABLED_KEY);
        if (Number(perfEnabled) === 1) {
            return Promise.resolve().then(function () { return BrowserPerformanceMeasurement$1; });
        }
        // Mute errors if it's a non-browser environment or cookies are blocked.
    }
    catch (e) { }
    return undefined;
}
/**
 * Returns boolean, indicating whether browser supports window.performance.now() function.
 */
function supportsBrowserPerformanceNow() {
    return (typeof window !== "undefined" &&
        typeof window.performance !== "undefined" &&
        typeof window.performance.now === "function");
}
/**
 * Returns event duration in milliseconds using window performance API if available. Returns undefined otherwise.
 * @param startTime {DOMHighResTimeStamp | undefined}
 * @returns {number | undefined}
 */
function getPerfDurationMs(startTime) {
    if (!startTime || !supportsBrowserPerformanceNow()) {
        return undefined;
    }
    return Math.round(window.performance.now() - startTime);
}
class BrowserPerformanceClient extends PerformanceClient {
    constructor(configuration, intFields, abbreviations) {
        super(configuration.auth.clientId, configuration.auth.authority || `${Constants.DEFAULT_AUTHORITY}`, new Logger(configuration.system?.loggerOptions || {}, name, version), name, version, configuration.telemetry?.application || {
            appName: "",
            appVersion: "",
        }, intFields, abbreviations);
    }
    generateId() {
        return createNewGuid();
    }
    getPageVisibility() {
        return document.visibilityState?.toString() || null;
    }
    deleteIncompleteSubMeasurements(inProgressEvent) {
        void getPerfMeasurementModule()?.then((module) => {
            const rootEvent = this.eventsByCorrelationId.get(inProgressEvent.event.correlationId);
            const isRootEvent = rootEvent &&
                rootEvent.eventId === inProgressEvent.event.eventId;
            const incompleteMeasurements = [];
            if (isRootEvent && rootEvent?.incompleteSubMeasurements) {
                rootEvent.incompleteSubMeasurements.forEach((subMeasurement) => {
                    incompleteMeasurements.push({ ...subMeasurement });
                });
            }
            // Clean up remaining marks for incomplete sub-measurements
            module.BrowserPerformanceMeasurement.flushMeasurements(inProgressEvent.event.correlationId, incompleteMeasurements);
        });
    }
    /**
     * Starts measuring performance for a given operation. Returns a function that should be used to end the measurement.
     * Also captures browser page visibilityState.
     *
     * @param {PerformanceEvents} measureName
     * @param {?string} [correlationId]
     * @returns {((event?: Partial<PerformanceEvent>) => PerformanceEvent| null)}
     */
    startMeasurement(measureName, correlationId) {
        // Capture page visibilityState and then invoke start/end measurement
        const startPageVisibility = this.getPageVisibility();
        const inProgressEvent = super.startMeasurement(measureName, correlationId);
        const startTime = supportsBrowserPerformanceNow()
            ? window.performance.now()
            : undefined;
        const browserMeasurement = getPerfMeasurementModule()?.then((module) => {
            return new module.BrowserPerformanceMeasurement(measureName, inProgressEvent.event.correlationId);
        });
        void browserMeasurement?.then((measurement) => measurement.startMeasurement());
        return {
            ...inProgressEvent,
            end: (event, error, account) => {
                const res = inProgressEvent.end({
                    ...event,
                    startPageVisibility,
                    endPageVisibility: this.getPageVisibility(),
                    durationMs: getPerfDurationMs(startTime),
                }, error, account);
                void browserMeasurement?.then((measurement) => measurement.endMeasurement());
                this.deleteIncompleteSubMeasurements(inProgressEvent);
                return res;
            },
            discard: () => {
                inProgressEvent.discard();
                void browserMeasurement?.then((measurement) => measurement.flushMeasurement());
                this.deleteIncompleteSubMeasurements(inProgressEvent);
            },
        };
    }
    /**
     * Adds pre-queue time to preQueueTimeByCorrelationId map.
     * @param {PerformanceEvents} eventName
     * @param {?string} correlationId
     * @returns
     */
    setPreQueueTime(eventName, correlationId) {
        if (!supportsBrowserPerformanceNow()) {
            this.logger.trace(`BrowserPerformanceClient: window performance API not available, unable to set telemetry queue time for ${eventName}`);
            return;
        }
        if (!correlationId) {
            this.logger.trace(`BrowserPerformanceClient: correlationId for ${eventName} not provided, unable to set telemetry queue time`);
            return;
        }
        const preQueueEvent = this.preQueueTimeByCorrelationId.get(correlationId);
        /**
         * Manually complete queue measurement if there is an incomplete pre-queue event.
         * Incomplete pre-queue events are instrumentation bugs that should be fixed.
         */
        if (preQueueEvent) {
            this.logger.trace(`BrowserPerformanceClient: Incomplete pre-queue ${preQueueEvent.name} found`, correlationId);
            this.addQueueMeasurement(preQueueEvent.name, correlationId, undefined, true);
        }
        this.preQueueTimeByCorrelationId.set(correlationId, {
            name: eventName,
            time: window.performance.now(),
        });
    }
    /**
     * Calculates and adds queue time measurement for given performance event.
     *
     * @param {PerformanceEvents} eventName
     * @param {?string} correlationId
     * @param {?number} queueTime
     * @param {?boolean} manuallyCompleted - indicator for manually completed queue measurements
     * @returns
     */
    addQueueMeasurement(eventName, correlationId, queueTime, manuallyCompleted) {
        if (!supportsBrowserPerformanceNow()) {
            this.logger.trace(`BrowserPerformanceClient: window performance API not available, unable to add queue measurement for ${eventName}`);
            return;
        }
        if (!correlationId) {
            this.logger.trace(`BrowserPerformanceClient: correlationId for ${eventName} not provided, unable to add queue measurement`);
            return;
        }
        const preQueueTime = super.getPreQueueTime(eventName, correlationId);
        if (!preQueueTime) {
            return;
        }
        const currentTime = window.performance.now();
        const resQueueTime = queueTime || super.calculateQueuedTime(preQueueTime, currentTime);
        return super.addQueueMeasurement(eventName, correlationId, resQueueTime, manuallyCompleted);
    }
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
class BrowserPerformanceMeasurement {
    constructor(name, correlationId) {
        this.correlationId = correlationId;
        this.measureName = BrowserPerformanceMeasurement.makeMeasureName(name, correlationId);
        this.startMark = BrowserPerformanceMeasurement.makeStartMark(name, correlationId);
        this.endMark = BrowserPerformanceMeasurement.makeEndMark(name, correlationId);
    }
    static makeMeasureName(name, correlationId) {
        return `msal.measure.${name}.${correlationId}`;
    }
    static makeStartMark(name, correlationId) {
        return `msal.start.${name}.${correlationId}`;
    }
    static makeEndMark(name, correlationId) {
        return `msal.end.${name}.${correlationId}`;
    }
    static supportsBrowserPerformance() {
        return (typeof window !== "undefined" &&
            typeof window.performance !== "undefined" &&
            typeof window.performance.mark === "function" &&
            typeof window.performance.measure === "function" &&
            typeof window.performance.clearMarks === "function" &&
            typeof window.performance.clearMeasures === "function" &&
            typeof window.performance.getEntriesByName === "function");
    }
    /**
     * Flush browser marks and measurements.
     * @param {string} correlationId
     * @param {SubMeasurement} measurements
     */
    static flushMeasurements(correlationId, measurements) {
        if (BrowserPerformanceMeasurement.supportsBrowserPerformance()) {
            try {
                measurements.forEach((measurement) => {
                    const measureName = BrowserPerformanceMeasurement.makeMeasureName(measurement.name, correlationId);
                    const entriesForMeasurement = window.performance.getEntriesByName(measureName, "measure");
                    if (entriesForMeasurement.length > 0) {
                        window.performance.clearMeasures(measureName);
                        window.performance.clearMarks(BrowserPerformanceMeasurement.makeStartMark(measureName, correlationId));
                        window.performance.clearMarks(BrowserPerformanceMeasurement.makeEndMark(measureName, correlationId));
                    }
                });
            }
            catch (e) {
                // Silently catch and return null
            }
        }
    }
    startMeasurement() {
        if (BrowserPerformanceMeasurement.supportsBrowserPerformance()) {
            try {
                window.performance.mark(this.startMark);
            }
            catch (e) {
                // Silently catch
            }
        }
    }
    endMeasurement() {
        if (BrowserPerformanceMeasurement.supportsBrowserPerformance()) {
            try {
                window.performance.mark(this.endMark);
                window.performance.measure(this.measureName, this.startMark, this.endMark);
            }
            catch (e) {
                // Silently catch
            }
        }
    }
    flushMeasurement() {
        if (BrowserPerformanceMeasurement.supportsBrowserPerformance()) {
            try {
                const entriesForMeasurement = window.performance.getEntriesByName(this.measureName, "measure");
                if (entriesForMeasurement.length > 0) {
                    const durationMs = entriesForMeasurement[0].duration;
                    window.performance.clearMeasures(this.measureName);
                    window.performance.clearMarks(this.startMark);
                    window.performance.clearMarks(this.endMark);
                    return durationMs;
                }
            }
            catch (e) {
                // Silently catch and return null
            }
        }
        return null;
    }
}

var BrowserPerformanceMeasurement$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    BrowserPerformanceMeasurement: BrowserPerformanceMeasurement
});

exports.AccountEntity = AccountEntity;
exports.ApiId = ApiId;
exports.AuthError = AuthError;
exports.AuthErrorCodes = AuthErrorCodes;
exports.AuthErrorMessage = AuthErrorMessage;
exports.AuthenticationHeaderParser = AuthenticationHeaderParser;
exports.AuthenticationScheme = AuthenticationScheme;
exports.AzureCloudInstance = AzureCloudInstance;
exports.BrowserAuthError = BrowserAuthError;
exports.BrowserAuthErrorCodes = BrowserAuthErrorCodes;
exports.BrowserAuthErrorMessage = BrowserAuthErrorMessage;
exports.BrowserCacheLocation = BrowserCacheLocation;
exports.BrowserConfigurationAuthError = BrowserConfigurationAuthError;
exports.BrowserConfigurationAuthErrorCodes = BrowserConfigurationAuthErrorCodes;
exports.BrowserConfigurationAuthErrorMessage = BrowserConfigurationAuthErrorMessage;
exports.BrowserPerformanceClient = BrowserPerformanceClient;
exports.BrowserPerformanceMeasurement = BrowserPerformanceMeasurement;
exports.BrowserUtils = BrowserUtils;
exports.CacheLookupPolicy = CacheLookupPolicy;
exports.ClientAuthError = ClientAuthError;
exports.ClientAuthErrorCodes = ClientAuthErrorCodes;
exports.ClientAuthErrorMessage = ClientAuthErrorMessage;
exports.ClientConfigurationError = ClientConfigurationError;
exports.ClientConfigurationErrorCodes = ClientConfigurationErrorCodes;
exports.ClientConfigurationErrorMessage = ClientConfigurationErrorMessage;
exports.DEFAULT_IFRAME_TIMEOUT_MS = DEFAULT_IFRAME_TIMEOUT_MS;
exports.EventHandler = EventHandler;
exports.EventMessageUtils = EventMessageUtils;
exports.EventType = EventType;
exports.InteractionRequiredAuthError = InteractionRequiredAuthError;
exports.InteractionRequiredAuthErrorCodes = InteractionRequiredAuthErrorCodes;
exports.InteractionRequiredAuthErrorMessage = InteractionRequiredAuthErrorMessage;
exports.InteractionStatus = InteractionStatus;
exports.JsonWebTokenTypes = JsonWebTokenTypes;
exports.LocalStorage = LocalStorage;
exports.Logger = Logger;
exports.MemoryStorage = MemoryStorage;
exports.NavigationClient = NavigationClient;
exports.OIDC_DEFAULT_SCOPES = OIDC_DEFAULT_SCOPES;
exports.PerformanceEvents = PerformanceEvents;
exports.PromptValue = PromptValue;
exports.ProtocolMode = ProtocolMode;
exports.PublicClientApplication = PublicClientApplication;
exports.PublicClientNext = PublicClientNext;
exports.ServerError = ServerError;
exports.ServerResponseType = ServerResponseType;
exports.SessionStorage = SessionStorage;
exports.SignedHttpRequest = SignedHttpRequest;
exports.StringUtils = StringUtils;
exports.StubPerformanceClient = StubPerformanceClient;
exports.UrlString = UrlString;
exports.WrapperSKU = WrapperSKU;
exports.createNestablePublicClientApplication = createNestablePublicClientApplication;
exports.createStandardPublicClientApplication = createStandardPublicClientApplication;
exports.isPlatformBrokerAvailable = isPlatformBrokerAvailable;
exports.stubbedPublicClientApplication = stubbedPublicClientApplication;
exports.version = version;
//# sourceMappingURL=msal-browser.cjs.map
