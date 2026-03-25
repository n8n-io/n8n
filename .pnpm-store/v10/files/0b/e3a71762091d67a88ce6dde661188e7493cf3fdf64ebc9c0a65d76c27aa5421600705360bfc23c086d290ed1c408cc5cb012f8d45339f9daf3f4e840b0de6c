import { INetworkModule } from "../network/INetworkModule.js";
import { ICrypto } from "../crypto/ICrypto.js";
import { ILoggerCallback, LogLevel } from "../logger/Logger.js";
import type { Authority } from "../authority/Authority.js";
import { AzureCloudInstance } from "../authority/AuthorityOptions.js";
import { CacheManager } from "../cache/CacheManager.js";
import { ServerTelemetryManager } from "../telemetry/server/ServerTelemetryManager.js";
import { ICachePlugin } from "../cache/interface/ICachePlugin.js";
import { ISerializableTokenCache } from "../cache/interface/ISerializableTokenCache.js";
import { ClientCredentials } from "../account/ClientCredentials.js";
/**
 * Use the configuration object to configure MSAL Modules and initialize the base interfaces for MSAL.
 *
 * This object allows you to configure important elements of MSAL functionality:
 * - authOptions                - Authentication for application
 * - cryptoInterface            - Implementation of crypto functions
 * - libraryInfo                - Library metadata
 * - telemetry                  - Telemetry options and data
 * - loggerOptions              - Logging for application
 * - networkInterface           - Network implementation
 * - storageInterface           - Storage implementation
 * - systemOptions              - Additional library options
 * - clientCredentials          - Credentials options for confidential clients
 * @internal
 */
export type ClientConfiguration = {
    authOptions: AuthOptions;
    systemOptions?: SystemOptions;
    loggerOptions?: LoggerOptions;
    cacheOptions?: CacheOptions;
    storageInterface?: CacheManager;
    networkInterface?: INetworkModule;
    cryptoInterface?: ICrypto;
    clientCredentials?: ClientCredentials;
    libraryInfo?: LibraryInfo;
    telemetry?: TelemetryOptions;
    serverTelemetryManager?: ServerTelemetryManager | null;
    persistencePlugin?: ICachePlugin | null;
    serializableCache?: ISerializableTokenCache | null;
};
export type CommonClientConfiguration = {
    authOptions: Required<AuthOptions>;
    systemOptions: Required<SystemOptions>;
    loggerOptions: Required<LoggerOptions>;
    cacheOptions: Required<CacheOptions>;
    storageInterface: CacheManager;
    networkInterface: INetworkModule;
    cryptoInterface: Required<ICrypto>;
    libraryInfo: LibraryInfo;
    telemetry: Required<TelemetryOptions>;
    serverTelemetryManager: ServerTelemetryManager | null;
    clientCredentials: ClientCredentials;
    persistencePlugin: ICachePlugin | null;
    serializableCache: ISerializableTokenCache | null;
};
/**
 * Use this to configure the auth options in the ClientConfiguration object
 *
 * - clientId                    - Client ID of your app registered with our Application registration portal : https://portal.azure.com/#blade/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/RegisteredAppsPreview in Microsoft Identity Platform
 * - authority                   - You can configure a specific authority, defaults to " " or "https://login.microsoftonline.com/common"
 * - knownAuthorities            - An array of URIs that are known to be valid. Used in B2C scenarios.
 * - cloudDiscoveryMetadata      - A string containing the cloud discovery response. Used in AAD scenarios.
 * - clientCapabilities          - Array of capabilities which will be added to the claims.access_token.xms_cc request property on every network request.
 * - protocolMode                - Enum that represents the protocol that msal follows. Used for configuring proper endpoints.
 * - skipAuthorityMetadataCache  - A flag to choose whether to use or not use the local metadata cache during authority initialization. Defaults to false.
 * - instanceAware               - A flag of whether the STS will send back additional parameters to specify where the tokens should be retrieved from.
 * - redirectUri                 - The redirect URI where authentication responses can be received by your application. It must exactly match one of the redirect URIs registered in the Azure portal.
 * - encodeExtraQueryParams      - A flag to choose whether to encode the extra query parameters or not. Defaults to false.
 * @internal
 */
export type AuthOptions = {
    clientId: string;
    authority: Authority;
    redirectUri: string;
    clientCapabilities?: Array<string>;
    azureCloudOptions?: AzureCloudOptions;
    skipAuthorityMetadataCache?: boolean;
    instanceAware?: boolean;
    /**
     * @deprecated This flag is deprecated and will be removed in the next major version where all extra query params will be encoded by default.
     */
    encodeExtraQueryParams?: boolean;
};
/**
 * Use this to configure token renewal info in the Configuration object
 *
 * - tokenRenewalOffsetSeconds    - Sets the window of offset needed to renew the token before expiry
 */
export type SystemOptions = {
    tokenRenewalOffsetSeconds?: number;
    preventCorsPreflight?: boolean;
};
/**
 *  Use this to configure the logging that MSAL does, by configuring logger options in the Configuration object
 *
 * - loggerCallback                - Callback for logger
 * - piiLoggingEnabled             - Sets whether pii logging is enabled
 * - logLevel                      - Sets the level at which logging happens
 * - correlationId                 - Sets the correlationId printed by the logger
 */
export type LoggerOptions = {
    loggerCallback?: ILoggerCallback;
    piiLoggingEnabled?: boolean;
    logLevel?: LogLevel;
    correlationId?: string;
};
/**
 *  Use this to configure credential cache preferences in the ClientConfiguration object
 *
 * - claimsBasedCachingEnabled   - Sets whether tokens should be cached based on the claims hash. Default is false.
 */
export type CacheOptions = {
    /**
     * @deprecated claimsBasedCachingEnabled is deprecated and will be removed in the next major version.
     */
    claimsBasedCachingEnabled?: boolean;
};
/**
 * Library-specific options
 */
export type LibraryInfo = {
    sku: string;
    version: string;
    cpu: string;
    os: string;
};
/**
 * AzureCloudInstance specific options
 *
 * - azureCloudInstance             - string enum providing short notation for soverign and public cloud authorities
 * - tenant                         - provision to provide the tenant info
 */
export type AzureCloudOptions = {
    azureCloudInstance: AzureCloudInstance;
    tenant?: string;
};
export type TelemetryOptions = {
    application: ApplicationTelemetry;
};
/**
 * Telemetry information sent on request
 * - appName: Unique string name of an application
 * - appVersion: Version of the application using MSAL
 */
export type ApplicationTelemetry = {
    appName: string;
    appVersion: string;
};
export declare const DEFAULT_SYSTEM_OPTIONS: Required<SystemOptions>;
/**
 * Function that sets the default options when not explicitly configured from app developer
 *
 * @param Configuration
 *
 * @returns Configuration
 */
export declare function buildClientConfiguration({ authOptions: userAuthOptions, systemOptions: userSystemOptions, loggerOptions: userLoggerOption, cacheOptions: userCacheOptions, storageInterface: storageImplementation, networkInterface: networkImplementation, cryptoInterface: cryptoImplementation, clientCredentials: clientCredentials, libraryInfo: libraryInfo, telemetry: telemetry, serverTelemetryManager: serverTelemetryManager, persistencePlugin: persistencePlugin, serializableCache: serializableCache, }: ClientConfiguration): CommonClientConfiguration;
/**
 * Returns true if config has protocolMode set to ProtocolMode.OIDC, false otherwise
 * @param ClientConfiguration
 */
export declare function isOidcProtocolMode(config: ClientConfiguration): boolean;
//# sourceMappingURL=ClientConfiguration.d.ts.map