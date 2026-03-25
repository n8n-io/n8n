/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { HttpStatus } from "@azure/msal-common/node";
import { DefaultManagedIdentityRetryPolicy } from "../retry/DefaultManagedIdentityRetryPolicy.js";
import { ImdsRetryPolicy } from "../retry/ImdsRetryPolicy.js";

// MSI Constants. Docs for MSI are available here https://docs.microsoft.com/azure/app-service/overview-managed-identity
export const DEFAULT_MANAGED_IDENTITY_ID = "system_assigned_managed_identity";
export const MANAGED_IDENTITY_DEFAULT_TENANT = "managed_identity";
export const DEFAULT_AUTHORITY_FOR_MANAGED_IDENTITY = `https://login.microsoftonline.com/${MANAGED_IDENTITY_DEFAULT_TENANT}/`;

/**
 * Managed Identity Headers - used in network requests
 */
export const ManagedIdentityHeaders = {
    AUTHORIZATION_HEADER_NAME: "Authorization",
    METADATA_HEADER_NAME: "Metadata",
    APP_SERVICE_SECRET_HEADER_NAME: "X-IDENTITY-HEADER",
    ML_AND_SF_SECRET_HEADER_NAME: "secret",
} as const;
export type ManagedIdentityHeaders =
    (typeof ManagedIdentityHeaders)[keyof typeof ManagedIdentityHeaders];

/**
 * Managed Identity Query Parameters - used in network requests
 */
export const ManagedIdentityQueryParameters = {
    API_VERSION: "api-version",
    RESOURCE: "resource",
    SHA256_TOKEN_TO_REFRESH: "token_sha256_to_refresh",
    XMS_CC: "xms_cc",
} as const;
export type ManagedIdentityQueryParameters =
    (typeof ManagedIdentityQueryParameters)[keyof typeof ManagedIdentityQueryParameters];

/**
 * Managed Identity Environment Variable Names
 */
export const ManagedIdentityEnvironmentVariableNames = {
    AZURE_POD_IDENTITY_AUTHORITY_HOST: "AZURE_POD_IDENTITY_AUTHORITY_HOST",
    DEFAULT_IDENTITY_CLIENT_ID: "DEFAULT_IDENTITY_CLIENT_ID",
    IDENTITY_ENDPOINT: "IDENTITY_ENDPOINT",
    IDENTITY_HEADER: "IDENTITY_HEADER",
    IDENTITY_SERVER_THUMBPRINT: "IDENTITY_SERVER_THUMBPRINT",
    IMDS_ENDPOINT: "IMDS_ENDPOINT",
    MSI_ENDPOINT: "MSI_ENDPOINT",
    MSI_SECRET: "MSI_SECRET",
} as const;
export type ManagedIdentityEnvironmentVariableNames =
    (typeof ManagedIdentityEnvironmentVariableNames)[keyof typeof ManagedIdentityEnvironmentVariableNames];

/**
 * Managed Identity Source Names
 * @public
 */
export const ManagedIdentitySourceNames = {
    APP_SERVICE: "AppService",
    AZURE_ARC: "AzureArc",
    CLOUD_SHELL: "CloudShell",
    DEFAULT_TO_IMDS: "DefaultToImds",
    IMDS: "Imds",
    MACHINE_LEARNING: "MachineLearning",
    SERVICE_FABRIC: "ServiceFabric",
} as const;
/**
 * The ManagedIdentitySourceNames type
 * @public
 */
export type ManagedIdentitySourceNames =
    (typeof ManagedIdentitySourceNames)[keyof typeof ManagedIdentitySourceNames];

/**
 * Managed Identity Ids
 */
export const ManagedIdentityIdType = {
    SYSTEM_ASSIGNED: "system-assigned",
    USER_ASSIGNED_CLIENT_ID: "user-assigned-client-id",
    USER_ASSIGNED_RESOURCE_ID: "user-assigned-resource-id",
    USER_ASSIGNED_OBJECT_ID: "user-assigned-object-id",
} as const;
export type ManagedIdentityIdType =
    (typeof ManagedIdentityIdType)[keyof typeof ManagedIdentityIdType];

/**
 * http methods
 */
export const HttpMethod = {
    GET: "get",
    POST: "post",
} as const;
export type HttpMethod = (typeof HttpMethod)[keyof typeof HttpMethod];

export const ProxyStatus = {
    SUCCESS: HttpStatus.SUCCESS,
    SUCCESS_RANGE_START: HttpStatus.SUCCESS_RANGE_START,
    SUCCESS_RANGE_END: HttpStatus.SUCCESS_RANGE_END,
    SERVER_ERROR: HttpStatus.SERVER_ERROR,
} as const;
export type ProxyStatus = (typeof ProxyStatus)[keyof typeof ProxyStatus];

/**
 * Constants used for region discovery
 */
export const REGION_ENVIRONMENT_VARIABLE = "REGION_NAME";
export const MSAL_FORCE_REGION = "MSAL_FORCE_REGION";

/**
 * Constant used for PKCE
 */
export const RANDOM_OCTET_SIZE = 32;

/**
 * Constants used in PKCE
 */
export const Hash = {
    SHA256: "sha256",
};

/**
 * Constants for encoding schemes
 */
export const CharSet = {
    CV_CHARSET:
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~",
};

/**
 * Cache Constants
 */
export const CACHE = {
    FILE_CACHE: "fileCache",
    EXTENSION_LIB: "extenstion_library",
    KEY_SEPARATOR: "-",
};

/**
 * Constants
 */
export const Constants = {
    MSAL_SKU: "msal.js.node",
    JWT_BEARER_ASSERTION_TYPE:
        "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
    AUTHORIZATION_PENDING: "authorization_pending",
    HTTP_PROTOCOL: "http://",
    LOCALHOST: "localhost",
};

/**
 * API Codes for Telemetry purposes.
 * Before adding a new code you must claim it in the MSAL Telemetry tracker as these number spaces are shared across all MSALs
 * 0-99 Silent Flow
 * 600-699 Device Code Flow
 * 800-899 Auth Code Flow
 */
export const ApiId = {
    acquireTokenSilent: 62,
    acquireTokenByUsernamePassword: 371,
    acquireTokenByDeviceCode: 671,
    acquireTokenByClientCredential: 771,
    acquireTokenByCode: 871,
    acquireTokenByRefreshToken: 872,
};
export type ApiId = (typeof ApiId)[keyof typeof ApiId];

/**
 * JWT  constants
 */
export const JwtConstants = {
    ALGORITHM: "alg",
    RSA_256: "RS256",
    PSS_256: "PS256",
    X5T_256: "x5t#S256",
    X5T: "x5t",
    X5C: "x5c",
    AUDIENCE: "aud",
    EXPIRATION_TIME: "exp",
    ISSUER: "iss",
    SUBJECT: "sub",
    NOT_BEFORE: "nbf",
    JWT_ID: "jti",
};

export const LOOPBACK_SERVER_CONSTANTS = {
    INTERVAL_MS: 100,
    TIMEOUT_MS: 5000,
};

export const AZURE_ARC_SECRET_FILE_MAX_SIZE_BYTES: number = 4096; // 4 KB

export type RetryPolicies = DefaultManagedIdentityRetryPolicy | ImdsRetryPolicy;
