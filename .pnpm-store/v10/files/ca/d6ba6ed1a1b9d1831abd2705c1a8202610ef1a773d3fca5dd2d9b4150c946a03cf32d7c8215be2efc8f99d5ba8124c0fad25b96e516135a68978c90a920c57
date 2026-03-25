/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    LoggerOptions,
    INetworkModule,
    LogLevel,
    ProtocolMode,
    ICachePlugin,
    Constants,
    AzureCloudInstance,
    AzureCloudOptions,
    ApplicationTelemetry,
    INativeBrokerPlugin,
    ClientAssertionCallback,
} from "@azure/msal-common/node";
import { HttpClient } from "../network/HttpClient.js";
import http from "http";
import https from "https";
import { ManagedIdentityId } from "./ManagedIdentityId.js";
import { NodeAuthError } from "../error/NodeAuthError.js";

/**
 * - clientId               - Client id of the application.
 * - authority              - Url of the authority. If no value is set, defaults to https://login.microsoftonline.com/common.
 * - knownAuthorities       - Needed for Azure B2C and ADFS. All authorities that will be used in the client application. Only the host of the authority should be passed in.
 * - clientSecret           - Secret string that the application uses when requesting a token. Only used in confidential client applications. Can be created in the Azure app registration portal.
 * - clientAssertion        - A ClientAssertion object containing an assertion string or a callback function that returns an assertion string that the application uses when requesting a token, as well as the assertion's type (urn:ietf:params:oauth:client-assertion-type:jwt-bearer). Only used in confidential client applications.
 * - clientCertificate      - Certificate that the application uses when requesting a token. Only used in confidential client applications. Requires hex encoded X.509 SHA-1 or SHA-256 thumbprint of the certificate, and the PEM encoded private key (string should contain -----BEGIN PRIVATE KEY----- ... -----END PRIVATE KEY----- )
 * - protocolMode           - Enum that represents the protocol that msal follows. Used for configuring proper endpoints.
 * - skipAuthorityMetadataCache - A flag to choose whether to use or not use the local metadata cache during authority initialization. Defaults to false.
 * - encodeExtraQueryParams - A flag to choose whether to encode extra query parameters in the request URL. Defaults to false.
 * @public
 */
export type NodeAuthOptions = {
    clientId: string;
    authority?: string;
    clientSecret?: string;
    clientAssertion?: string | ClientAssertionCallback;
    clientCertificate?: {
        /**
         * @deprecated Use thumbprintSha2 property instead. Thumbprint needs to be computed with SHA-256 algorithm.
         * SHA-1 is only needed for backwards compatibility with older versions of ADFS.
         */
        thumbprint?: string;
        thumbprintSha256?: string;
        privateKey: string;
        x5c?: string;
    };
    knownAuthorities?: Array<string>;
    cloudDiscoveryMetadata?: string;
    authorityMetadata?: string;
    clientCapabilities?: Array<string>;
    protocolMode?: ProtocolMode;
    azureCloudOptions?: AzureCloudOptions;
    skipAuthorityMetadataCache?: boolean;
    /**
     * @deprecated This flag is deprecated and will be removed in the next major version where all extra query params will be encoded by default.
     */
    encodeExtraQueryParams?: boolean;
};

/**
 * Use this to configure the below cache configuration options:
 *
 * - cachePlugin   - Plugin for reading and writing token cache to disk.
 * @public
 */
export type CacheOptions = {
    cachePlugin?: ICachePlugin;
    /**
     * @deprecated claims-based-caching functionality will be removed in the next version of MSALJS
     */
    claimsBasedCachingEnabled?: boolean;
};

/**
 * Use this to configure the below broker options:
 * - nativeBrokerPlugin - Native broker implementation (should be imported from msal-node-extensions)
 *
 * Note: These options are only available for PublicClientApplications using the Authorization Code Flow
 * @public
 */
export type BrokerOptions = {
    nativeBrokerPlugin?: INativeBrokerPlugin;
};

/**
 * Type for configuring logger and http client options
 *
 * - logger                       - Used to initialize the Logger object; TODO: Expand on logger details or link to the documentation on logger
 * - networkClient                - Http client used for all http get and post calls. Defaults to using MSAL's default http client.
 * @public
 */
export type NodeSystemOptions = {
    loggerOptions?: LoggerOptions;
    networkClient?: INetworkModule;
    proxyUrl?: string;
    customAgentOptions?: http.AgentOptions | https.AgentOptions;
    disableInternalRetries?: boolean;
};

/** @public */
export type NodeTelemetryOptions = {
    application?: ApplicationTelemetry;
};

/**
 * Use the configuration object to configure MSAL and initialize the client application object
 *
 * - auth: this is where you configure auth elements like clientID, authority used for authenticating against the Microsoft Identity Platform
 * - broker: this is where you configure broker options
 * - cache: this is where you configure cache location
 * - system: this is where you can configure the network client, logger
 * - telemetry: this is where you can configure telemetry options
 * @public
 */
export type Configuration = {
    auth: NodeAuthOptions;
    broker?: BrokerOptions;
    cache?: CacheOptions;
    system?: NodeSystemOptions;
    telemetry?: NodeTelemetryOptions;
};

/** @public */
export type ManagedIdentityIdParams = {
    userAssignedClientId?: string;
    userAssignedResourceId?: string;
    userAssignedObjectId?: string;
};

/** @public */
export type ManagedIdentityConfiguration = {
    clientCapabilities?: Array<string>;
    managedIdentityIdParams?: ManagedIdentityIdParams;
    system?: NodeSystemOptions;
};

const DEFAULT_AUTH_OPTIONS: Required<NodeAuthOptions> = {
    clientId: Constants.EMPTY_STRING,
    authority: Constants.DEFAULT_AUTHORITY,
    clientSecret: Constants.EMPTY_STRING,
    clientAssertion: Constants.EMPTY_STRING,
    clientCertificate: {
        thumbprint: Constants.EMPTY_STRING,
        thumbprintSha256: Constants.EMPTY_STRING,
        privateKey: Constants.EMPTY_STRING,
        x5c: Constants.EMPTY_STRING,
    },
    knownAuthorities: [],
    cloudDiscoveryMetadata: Constants.EMPTY_STRING,
    authorityMetadata: Constants.EMPTY_STRING,
    clientCapabilities: [],
    protocolMode: ProtocolMode.AAD,
    azureCloudOptions: {
        azureCloudInstance: AzureCloudInstance.None,
        tenant: Constants.EMPTY_STRING,
    },
    skipAuthorityMetadataCache: false,
    encodeExtraQueryParams: false,
};

const DEFAULT_CACHE_OPTIONS: CacheOptions = {
    claimsBasedCachingEnabled: false,
};

const DEFAULT_LOGGER_OPTIONS: LoggerOptions = {
    loggerCallback: (): void => {
        // allow users to not set logger call back
    },
    piiLoggingEnabled: false,
    logLevel: LogLevel.Info,
};

const DEFAULT_SYSTEM_OPTIONS: Required<NodeSystemOptions> = {
    loggerOptions: DEFAULT_LOGGER_OPTIONS,
    networkClient: new HttpClient(),
    proxyUrl: Constants.EMPTY_STRING,
    customAgentOptions: {} as http.AgentOptions | https.AgentOptions,
    disableInternalRetries: false,
};

const DEFAULT_TELEMETRY_OPTIONS: Required<NodeTelemetryOptions> = {
    application: {
        appName: Constants.EMPTY_STRING,
        appVersion: Constants.EMPTY_STRING,
    },
};

/** @internal */
export type NodeConfiguration = {
    auth: Required<NodeAuthOptions>;
    broker: BrokerOptions;
    cache: CacheOptions;
    system: Required<NodeSystemOptions>;
    telemetry: Required<NodeTelemetryOptions>;
};

/**
 * Sets the default options when not explicitly configured from app developer
 *
 * @param auth - Authentication options
 * @param cache - Cache options
 * @param system - System options
 * @param telemetry - Telemetry options
 *
 * @returns Configuration
 * @internal
 */
export function buildAppConfiguration({
    auth,
    broker,
    cache,
    system,
    telemetry,
}: Configuration): NodeConfiguration {
    const systemOptions: Required<NodeSystemOptions> = {
        ...DEFAULT_SYSTEM_OPTIONS,
        networkClient: new HttpClient(
            system?.proxyUrl,
            system?.customAgentOptions as http.AgentOptions | https.AgentOptions
        ),
        loggerOptions: system?.loggerOptions || DEFAULT_LOGGER_OPTIONS,
        disableInternalRetries: system?.disableInternalRetries || false,
    };

    // if client certificate was provided, ensure that at least one of the SHA-1 or SHA-256 thumbprints were provided
    if (
        !!auth.clientCertificate &&
        !!!auth.clientCertificate.thumbprint &&
        !!!auth.clientCertificate.thumbprintSha256
    ) {
        throw NodeAuthError.createStateNotFoundError();
    }

    return {
        auth: { ...DEFAULT_AUTH_OPTIONS, ...auth },
        broker: { ...broker },
        cache: { ...DEFAULT_CACHE_OPTIONS, ...cache },
        system: { ...systemOptions, ...system },
        telemetry: { ...DEFAULT_TELEMETRY_OPTIONS, ...telemetry },
    };
}

/** @internal */
export type ManagedIdentityNodeConfiguration = {
    clientCapabilities?: Array<string>;
    disableInternalRetries: boolean;
    managedIdentityId: ManagedIdentityId;
    system: Required<
        Pick<NodeSystemOptions, "loggerOptions" | "networkClient">
    >;
};

export function buildManagedIdentityConfiguration({
    clientCapabilities,
    managedIdentityIdParams,
    system,
}: ManagedIdentityConfiguration): ManagedIdentityNodeConfiguration {
    const managedIdentityId: ManagedIdentityId = new ManagedIdentityId(
        managedIdentityIdParams
    );

    const loggerOptions: LoggerOptions =
        system?.loggerOptions || DEFAULT_LOGGER_OPTIONS;

    let networkClient: INetworkModule;
    // use developer provided network client if passed in
    if (system?.networkClient) {
        networkClient = system.networkClient;
        // otherwise, create a new one
    } else {
        networkClient = new HttpClient(
            system?.proxyUrl,
            system?.customAgentOptions as http.AgentOptions | https.AgentOptions
        );
    }

    return {
        clientCapabilities: clientCapabilities || [],
        managedIdentityId: managedIdentityId,
        system: {
            loggerOptions,
            networkClient,
        },
        disableInternalRetries: system?.disableInternalRetries || false,
    };
}
