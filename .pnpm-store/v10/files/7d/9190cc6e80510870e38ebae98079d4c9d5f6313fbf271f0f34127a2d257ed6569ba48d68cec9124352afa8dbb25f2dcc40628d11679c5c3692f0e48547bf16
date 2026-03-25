/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

export const Constants = {
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
    AAD_INSTANCE_DISCOVERY_ENDPT:
        "https://login.microsoftonline.com/common/discovery/instance?api-version=1.1&authorization_endpoint=",
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

export const HttpStatus = {
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
} as const;
export type HttpStatus = (typeof HttpStatus)[keyof typeof HttpStatus];

export const HttpMethod = {
    GET: "GET",
    POST: "POST",
} as const;
export type HttpMethod = (typeof HttpMethod)[keyof typeof HttpMethod];

export const OIDC_DEFAULT_SCOPES = [
    Constants.OPENID_SCOPE,
    Constants.PROFILE_SCOPE,
    Constants.OFFLINE_ACCESS_SCOPE,
];

export const OIDC_SCOPES = [...OIDC_DEFAULT_SCOPES, Constants.EMAIL_SCOPE];

/**
 * Request header names
 */
export const HeaderNames = {
    CONTENT_TYPE: "Content-Type",
    CONTENT_LENGTH: "Content-Length",
    RETRY_AFTER: "Retry-After",
    CCS_HEADER: "X-AnchorMailbox",
    WWWAuthenticate: "WWW-Authenticate",
    AuthenticationInfo: "Authentication-Info",
    X_MS_REQUEST_ID: "x-ms-request-id",
    X_MS_HTTP_VERSION: "x-ms-httpver",
} as const;
export type HeaderNames = (typeof HeaderNames)[keyof typeof HeaderNames];

/**
 * Persistent cache keys MSAL which stay while user is logged in.
 */
export const PersistentCacheKeys = {
    ACTIVE_ACCOUNT_FILTERS: "active-account-filters", // new cache entry for active_account for a more robust version for browser
} as const;
export type PersistentCacheKeys =
    (typeof PersistentCacheKeys)[keyof typeof PersistentCacheKeys];

/**
 * String constants related to AAD Authority
 */
export const AADAuthorityConstants = {
    COMMON: "common",
    ORGANIZATIONS: "organizations",
    CONSUMERS: "consumers",
} as const;
export type AADAuthorityConstants =
    (typeof AADAuthorityConstants)[keyof typeof AADAuthorityConstants];

/**
 * Claims request keys
 */
export const ClaimsRequestKeys = {
    ACCESS_TOKEN: "access_token",
    XMS_CC: "xms_cc",
} as const;
export type ClaimsRequestKeys =
    (typeof ClaimsRequestKeys)[keyof typeof ClaimsRequestKeys];

/**
 * we considered making this "enum" in the request instead of string, however it looks like the allowed list of
 * prompt values kept changing over past couple of years. There are some undocumented prompt values for some
 * internal partners too, hence the choice of generic "string" type instead of the "enum"
 */
export const PromptValue = {
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
export const CodeChallengeMethodValues = {
    PLAIN: "plain",
    S256: "S256",
};

/**
 * Allowed values for response_type
 */
export const OAuthResponseType = {
    CODE: "code",
    IDTOKEN_TOKEN: "id_token token",
    IDTOKEN_TOKEN_REFRESHTOKEN: "id_token token refresh_token",
} as const;
export type OAuthResponseType =
    (typeof OAuthResponseType)[keyof typeof OAuthResponseType];

/**
 * allowed values for server response type
 * @deprecated Use ResponseMode instead
 */
export const ServerResponseType = {
    QUERY: "query",
    FRAGMENT: "fragment",
} as const;
export type ServerResponseType =
    (typeof ServerResponseType)[keyof typeof ServerResponseType];

/**
 * allowed values for response_mode
 */
export const ResponseMode = {
    QUERY: "query",
    FRAGMENT: "fragment",
    FORM_POST: "form_post",
} as const;
export type ResponseMode = (typeof ResponseMode)[keyof typeof ResponseMode];

/**
 * allowed grant_type
 */
export const GrantType = {
    IMPLICIT_GRANT: "implicit",
    AUTHORIZATION_CODE_GRANT: "authorization_code",
    CLIENT_CREDENTIALS_GRANT: "client_credentials",
    RESOURCE_OWNER_PASSWORD_GRANT: "password",
    REFRESH_TOKEN_GRANT: "refresh_token",
    DEVICE_CODE_GRANT: "device_code",
    JWT_BEARER: "urn:ietf:params:oauth:grant-type:jwt-bearer",
} as const;
export type GrantType = (typeof GrantType)[keyof typeof GrantType];

/**
 * Account types in Cache
 */
export const CacheAccountType = {
    MSSTS_ACCOUNT_TYPE: "MSSTS",
    ADFS_ACCOUNT_TYPE: "ADFS",
    MSAV1_ACCOUNT_TYPE: "MSA",
    GENERIC_ACCOUNT_TYPE: "Generic", // NTLM, Kerberos, FBA, Basic etc
} as const;
export type CacheAccountType =
    (typeof CacheAccountType)[keyof typeof CacheAccountType];

/**
 * Separators used in cache
 */
export const Separators = {
    CACHE_KEY_SEPARATOR: "-",
    CLIENT_INFO_SEPARATOR: ".",
} as const;
export type Separators = (typeof Separators)[keyof typeof Separators];

/**
 * Credential Type stored in the cache
 */
export const CredentialType = {
    ID_TOKEN: "IdToken",
    ACCESS_TOKEN: "AccessToken",
    ACCESS_TOKEN_WITH_AUTH_SCHEME: "AccessToken_With_AuthScheme",
    REFRESH_TOKEN: "RefreshToken",
} as const;
export type CredentialType =
    (typeof CredentialType)[keyof typeof CredentialType];

/**
 * Combine all cache types
 */
export const CacheType = {
    ADFS: 1001,
    MSA: 1002,
    MSSTS: 1003,
    GENERIC: 1004,
    ACCESS_TOKEN: 2001,
    REFRESH_TOKEN: 2002,
    ID_TOKEN: 2003,
    APP_METADATA: 3001,
    UNDEFINED: 9999,
} as const;
export type CacheType = (typeof CacheType)[keyof typeof CacheType];

/**
 * More Cache related constants
 */
export const APP_METADATA = "appmetadata";
export const CLIENT_INFO = "client_info";
export const THE_FAMILY_ID = "1";

export const AUTHORITY_METADATA_CONSTANTS = {
    CACHE_KEY: "authority-metadata",
    REFRESH_TIME_SECONDS: 3600 * 24, // 24 Hours
};

export const AuthorityMetadataSource = {
    CONFIG: "config",
    CACHE: "cache",
    NETWORK: "network",
    HARDCODED_VALUES: "hardcoded_values",
} as const;
export type AuthorityMetadataSource =
    (typeof AuthorityMetadataSource)[keyof typeof AuthorityMetadataSource];

export const SERVER_TELEM_CONSTANTS = {
    SCHEMA_VERSION: 5,
    MAX_CUR_HEADER_BYTES: 80, // ESTS limit is 100B, set to 80 to provide a 20B buffer
    MAX_LAST_HEADER_BYTES: 330, // ESTS limit is 350B, set to 330 to provide a 20B buffer,
    MAX_CACHED_ERRORS: 50, // Limit the number of errors that can be stored to prevent uncontrolled size gains
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
export const AuthenticationScheme = {
    BEARER: "Bearer",
    POP: "pop",
    SSH: "ssh-cert",
} as const;
export type AuthenticationScheme =
    (typeof AuthenticationScheme)[keyof typeof AuthenticationScheme];

/**
 * Constants related to throttling
 */
export const ThrottlingConstants = {
    // Default time to throttle RequestThumbprint in seconds
    DEFAULT_THROTTLE_TIME_SECONDS: 60,
    // Default maximum time to throttle in seconds, overrides what the server sends back
    DEFAULT_MAX_THROTTLE_TIME_SECONDS: 3600,
    // Prefix for storing throttling entries
    THROTTLING_PREFIX: "throttling",
    // Value assigned to the x-ms-lib-capability header to indicate to the server the library supports throttling
    X_MS_LIB_CAPABILITY_VALUE: "retry-after, h429",
};

export const Errors = {
    INVALID_GRANT_ERROR: "invalid_grant",
    CLIENT_MISMATCH_ERROR: "client_mismatch",
};

/**
 * Password grant parameters
 */
export const PasswordGrantConstants = {
    username: "username",
    password: "password",
} as const;
export type PasswordGrantConstants =
    (typeof PasswordGrantConstants)[keyof typeof PasswordGrantConstants];

/**
 * Region Discovery Sources
 */
export const RegionDiscoverySources = {
    FAILED_AUTO_DETECTION: "1",
    INTERNAL_CACHE: "2",
    ENVIRONMENT_VARIABLE: "3",
    IMDS: "4",
} as const;
export type RegionDiscoverySources =
    (typeof RegionDiscoverySources)[keyof typeof RegionDiscoverySources];

/**
 * Region Discovery Outcomes
 */
export const RegionDiscoveryOutcomes = {
    CONFIGURED_MATCHES_DETECTED: "1",
    CONFIGURED_NO_AUTO_DETECTION: "2",
    CONFIGURED_NOT_DETECTED: "3",
    AUTO_DETECTION_REQUESTED_SUCCESSFUL: "4",
    AUTO_DETECTION_REQUESTED_FAILED: "5",
} as const;
export type RegionDiscoveryOutcomes =
    (typeof RegionDiscoveryOutcomes)[keyof typeof RegionDiscoveryOutcomes];

/**
 * Specifies the reason for fetching the access token from the identity provider
 */
export const CacheOutcome = {
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
} as const;
export type CacheOutcome = (typeof CacheOutcome)[keyof typeof CacheOutcome];

export const JsonWebTokenTypes = {
    Jwt: "JWT",
    Jwk: "JWK",
    Pop: "pop",
} as const;
export type JsonWebTokenTypes =
    (typeof JsonWebTokenTypes)[keyof typeof JsonWebTokenTypes];

export const ONE_DAY_IN_MS = 86400000;

// Token renewal offset default in seconds
export const DEFAULT_TOKEN_RENEWAL_OFFSET_SEC = 300;

export const EncodingTypes = {
    BASE64: "base64",
    HEX: "hex",
    UTF8: "utf-8",
} as const;
export type EncodingTypes = (typeof EncodingTypes)[keyof typeof EncodingTypes];
