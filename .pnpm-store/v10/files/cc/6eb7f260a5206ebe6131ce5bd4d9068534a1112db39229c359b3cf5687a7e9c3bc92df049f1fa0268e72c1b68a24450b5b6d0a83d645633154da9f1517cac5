import { DefaultManagedIdentityRetryPolicy } from "../retry/DefaultManagedIdentityRetryPolicy.js";
import { ImdsRetryPolicy } from "../retry/ImdsRetryPolicy.js";
export declare const DEFAULT_MANAGED_IDENTITY_ID = "system_assigned_managed_identity";
export declare const MANAGED_IDENTITY_DEFAULT_TENANT = "managed_identity";
export declare const DEFAULT_AUTHORITY_FOR_MANAGED_IDENTITY: string;
/**
 * Managed Identity Headers - used in network requests
 */
export declare const ManagedIdentityHeaders: {
    readonly AUTHORIZATION_HEADER_NAME: "Authorization";
    readonly METADATA_HEADER_NAME: "Metadata";
    readonly APP_SERVICE_SECRET_HEADER_NAME: "X-IDENTITY-HEADER";
    readonly ML_AND_SF_SECRET_HEADER_NAME: "secret";
};
export type ManagedIdentityHeaders = (typeof ManagedIdentityHeaders)[keyof typeof ManagedIdentityHeaders];
/**
 * Managed Identity Query Parameters - used in network requests
 */
export declare const ManagedIdentityQueryParameters: {
    readonly API_VERSION: "api-version";
    readonly RESOURCE: "resource";
    readonly SHA256_TOKEN_TO_REFRESH: "token_sha256_to_refresh";
    readonly XMS_CC: "xms_cc";
};
export type ManagedIdentityQueryParameters = (typeof ManagedIdentityQueryParameters)[keyof typeof ManagedIdentityQueryParameters];
/**
 * Managed Identity Environment Variable Names
 */
export declare const ManagedIdentityEnvironmentVariableNames: {
    readonly AZURE_POD_IDENTITY_AUTHORITY_HOST: "AZURE_POD_IDENTITY_AUTHORITY_HOST";
    readonly DEFAULT_IDENTITY_CLIENT_ID: "DEFAULT_IDENTITY_CLIENT_ID";
    readonly IDENTITY_ENDPOINT: "IDENTITY_ENDPOINT";
    readonly IDENTITY_HEADER: "IDENTITY_HEADER";
    readonly IDENTITY_SERVER_THUMBPRINT: "IDENTITY_SERVER_THUMBPRINT";
    readonly IMDS_ENDPOINT: "IMDS_ENDPOINT";
    readonly MSI_ENDPOINT: "MSI_ENDPOINT";
    readonly MSI_SECRET: "MSI_SECRET";
};
export type ManagedIdentityEnvironmentVariableNames = (typeof ManagedIdentityEnvironmentVariableNames)[keyof typeof ManagedIdentityEnvironmentVariableNames];
/**
 * Managed Identity Source Names
 * @public
 */
export declare const ManagedIdentitySourceNames: {
    readonly APP_SERVICE: "AppService";
    readonly AZURE_ARC: "AzureArc";
    readonly CLOUD_SHELL: "CloudShell";
    readonly DEFAULT_TO_IMDS: "DefaultToImds";
    readonly IMDS: "Imds";
    readonly MACHINE_LEARNING: "MachineLearning";
    readonly SERVICE_FABRIC: "ServiceFabric";
};
/**
 * The ManagedIdentitySourceNames type
 * @public
 */
export type ManagedIdentitySourceNames = (typeof ManagedIdentitySourceNames)[keyof typeof ManagedIdentitySourceNames];
/**
 * Managed Identity Ids
 */
export declare const ManagedIdentityIdType: {
    readonly SYSTEM_ASSIGNED: "system-assigned";
    readonly USER_ASSIGNED_CLIENT_ID: "user-assigned-client-id";
    readonly USER_ASSIGNED_RESOURCE_ID: "user-assigned-resource-id";
    readonly USER_ASSIGNED_OBJECT_ID: "user-assigned-object-id";
};
export type ManagedIdentityIdType = (typeof ManagedIdentityIdType)[keyof typeof ManagedIdentityIdType];
/**
 * http methods
 */
export declare const HttpMethod: {
    readonly GET: "get";
    readonly POST: "post";
};
export type HttpMethod = (typeof HttpMethod)[keyof typeof HttpMethod];
export declare const ProxyStatus: {
    readonly SUCCESS: 200;
    readonly SUCCESS_RANGE_START: 200;
    readonly SUCCESS_RANGE_END: 299;
    readonly SERVER_ERROR: 500;
};
export type ProxyStatus = (typeof ProxyStatus)[keyof typeof ProxyStatus];
/**
 * Constants used for region discovery
 */
export declare const REGION_ENVIRONMENT_VARIABLE = "REGION_NAME";
export declare const MSAL_FORCE_REGION = "MSAL_FORCE_REGION";
/**
 * Constant used for PKCE
 */
export declare const RANDOM_OCTET_SIZE = 32;
/**
 * Constants used in PKCE
 */
export declare const Hash: {
    SHA256: string;
};
/**
 * Constants for encoding schemes
 */
export declare const CharSet: {
    CV_CHARSET: string;
};
/**
 * Cache Constants
 */
export declare const CACHE: {
    FILE_CACHE: string;
    EXTENSION_LIB: string;
    KEY_SEPARATOR: string;
};
/**
 * Constants
 */
export declare const Constants: {
    MSAL_SKU: string;
    JWT_BEARER_ASSERTION_TYPE: string;
    AUTHORIZATION_PENDING: string;
    HTTP_PROTOCOL: string;
    LOCALHOST: string;
};
/**
 * API Codes for Telemetry purposes.
 * Before adding a new code you must claim it in the MSAL Telemetry tracker as these number spaces are shared across all MSALs
 * 0-99 Silent Flow
 * 600-699 Device Code Flow
 * 800-899 Auth Code Flow
 */
export declare const ApiId: {
    acquireTokenSilent: number;
    acquireTokenByUsernamePassword: number;
    acquireTokenByDeviceCode: number;
    acquireTokenByClientCredential: number;
    acquireTokenByCode: number;
    acquireTokenByRefreshToken: number;
};
export type ApiId = (typeof ApiId)[keyof typeof ApiId];
/**
 * JWT  constants
 */
export declare const JwtConstants: {
    ALGORITHM: string;
    RSA_256: string;
    PSS_256: string;
    X5T_256: string;
    X5T: string;
    X5C: string;
    AUDIENCE: string;
    EXPIRATION_TIME: string;
    ISSUER: string;
    SUBJECT: string;
    NOT_BEFORE: string;
    JWT_ID: string;
};
export declare const LOOPBACK_SERVER_CONSTANTS: {
    INTERVAL_MS: number;
    TIMEOUT_MS: number;
};
export declare const AZURE_ARC_SECRET_FILE_MAX_SIZE_BYTES: number;
export type RetryPolicies = DefaultManagedIdentityRetryPolicy | ImdsRetryPolicy;
//# sourceMappingURL=Constants.d.ts.map