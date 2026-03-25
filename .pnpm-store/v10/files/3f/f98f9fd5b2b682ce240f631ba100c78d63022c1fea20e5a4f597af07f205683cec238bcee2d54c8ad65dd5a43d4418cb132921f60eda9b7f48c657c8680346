/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { AuthorityType } from "./AuthorityType.js";
import {
    isOpenIdConfigResponse,
    OpenIdConfigResponse,
} from "./OpenIdConfigResponse.js";
import { UrlString } from "../url/UrlString.js";
import { IUri } from "../url/IUri.js";
import {
    createClientAuthError,
    ClientAuthErrorCodes,
} from "../error/ClientAuthError.js";
import { INetworkModule } from "../network/INetworkModule.js";
import {
    AADAuthorityConstants,
    AuthorityMetadataSource,
    Constants,
    RegionDiscoveryOutcomes,
} from "../utils/Constants.js";
import {
    EndpointMetadata,
    getCloudDiscoveryMetadataFromHardcodedValues,
    getCloudDiscoveryMetadataFromNetworkResponse,
    InstanceDiscoveryMetadataAliases,
} from "./AuthorityMetadata.js";
import {
    createClientConfigurationError,
    ClientConfigurationErrorCodes,
} from "../error/ClientConfigurationError.js";
import { ProtocolMode } from "./ProtocolMode.js";
import { ICacheManager } from "../cache/interface/ICacheManager.js";
import { AuthorityMetadataEntity } from "../cache/entities/AuthorityMetadataEntity.js";
import {
    AuthorityOptions,
    AzureCloudInstance,
    StaticAuthorityOptions,
} from "./AuthorityOptions.js";
import {
    CloudInstanceDiscoveryResponse,
    isCloudInstanceDiscoveryResponse,
} from "./CloudInstanceDiscoveryResponse.js";
import {
    CloudInstanceDiscoveryErrorResponse,
    isCloudInstanceDiscoveryErrorResponse,
} from "./CloudInstanceDiscoveryErrorResponse.js";
import { CloudDiscoveryMetadata } from "./CloudDiscoveryMetadata.js";
import { RegionDiscovery } from "./RegionDiscovery.js";
import { RegionDiscoveryMetadata } from "./RegionDiscoveryMetadata.js";
import { ImdsOptions } from "./ImdsOptions.js";
import type { AzureCloudOptions } from "../config/ClientConfiguration.js";
import { Logger } from "../logger/Logger.js";
import { AuthError } from "../error/AuthError.js";
import { IPerformanceClient } from "../telemetry/performance/IPerformanceClient.js";
import { PerformanceEvents } from "../telemetry/performance/PerformanceEvent.js";
import { invokeAsync } from "../utils/FunctionWrappers.js";
import * as CacheHelpers from "../cache/utils/CacheHelpers.js";

/**
 * The authority class validates the authority URIs used by the user, and retrieves the OpenID Configuration Data from the
 * endpoint. It will store the pertinent config data in this object for use during token calls.
 * @internal
 */
export class Authority {
    // Canonical authority url string
    private _canonicalAuthority: UrlString;
    // Canonicaly authority url components
    private _canonicalAuthorityUrlComponents: IUri | null;
    // Network interface to make requests with.
    protected networkInterface: INetworkModule;
    // Cache Manager to cache network responses
    protected cacheManager: ICacheManager;
    // Protocol mode to construct endpoints
    private authorityOptions: AuthorityOptions;
    // Authority metadata
    private metadata: AuthorityMetadataEntity;
    // Region discovery service
    private regionDiscovery: RegionDiscovery;
    // Region discovery metadata
    public regionDiscoveryMetadata: RegionDiscoveryMetadata;
    // Logger object
    private logger: Logger;
    // Performance client
    protected performanceClient: IPerformanceClient | undefined;
    // Correlation Id
    protected correlationId: string;
    // Indicates if the authority is fake, for the purpose of a Managed Identity Application
    private managedIdentity: boolean;
    // Reserved tenant domain names that will not be replaced with tenant id
    private static reservedTenantDomains: Set<string> = new Set([
        "{tenant}",
        "{tenantid}",
        AADAuthorityConstants.COMMON,
        AADAuthorityConstants.CONSUMERS,
        AADAuthorityConstants.ORGANIZATIONS,
    ]);

    constructor(
        authority: string,
        networkInterface: INetworkModule,
        cacheManager: ICacheManager,
        authorityOptions: AuthorityOptions,
        logger: Logger,
        correlationId: string,
        performanceClient?: IPerformanceClient,
        managedIdentity?: boolean
    ) {
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
        this.regionDiscovery = new RegionDiscovery(
            networkInterface,
            this.logger,
            this.performanceClient,
            this.correlationId
        );
    }

    /**
     * Get {@link AuthorityType}
     * @param authorityUri {@link IUri}
     * @private
     */
    private getAuthorityType(authorityUri: IUri): AuthorityType {
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
                default:
                    break;
            }
        }
        return AuthorityType.Default;
    }

    // See above for AuthorityType
    public get authorityType(): AuthorityType {
        return this.getAuthorityType(this.canonicalAuthorityUrlComponents);
    }

    /**
     * ProtocolMode enum representing the way endpoints are constructed.
     */
    public get protocolMode(): ProtocolMode {
        return this.authorityOptions.protocolMode;
    }

    /**
     * Returns authorityOptions which can be used to reinstantiate a new authority instance
     */
    public get options(): AuthorityOptions {
        return this.authorityOptions;
    }

    /**
     * A URL that is the authority set by the developer
     */
    public get canonicalAuthority(): string {
        return this._canonicalAuthority.urlString;
    }

    /**
     * Sets canonical authority.
     */
    public set canonicalAuthority(url: string) {
        this._canonicalAuthority = new UrlString(url);
        this._canonicalAuthority.validateAsUri();
        this._canonicalAuthorityUrlComponents = null;
    }

    /**
     * Get authority components.
     */
    public get canonicalAuthorityUrlComponents(): IUri {
        if (!this._canonicalAuthorityUrlComponents) {
            this._canonicalAuthorityUrlComponents =
                this._canonicalAuthority.getUrlComponents();
        }

        return this._canonicalAuthorityUrlComponents;
    }

    /**
     * Get hostname and port i.e. login.microsoftonline.com
     */
    public get hostnameAndPort(): string {
        return this.canonicalAuthorityUrlComponents.HostNameAndPort.toLowerCase();
    }

    /**
     * Get tenant for authority.
     */
    public get tenant(): string {
        return this.canonicalAuthorityUrlComponents.PathSegments[0];
    }

    /**
     * OAuth /authorize endpoint for requests
     */
    public get authorizationEndpoint(): string {
        if (this.discoveryComplete()) {
            return this.replacePath(this.metadata.authorization_endpoint);
        } else {
            throw createClientAuthError(
                ClientAuthErrorCodes.endpointResolutionError
            );
        }
    }

    /**
     * OAuth /token endpoint for requests
     */
    public get tokenEndpoint(): string {
        if (this.discoveryComplete()) {
            return this.replacePath(this.metadata.token_endpoint);
        } else {
            throw createClientAuthError(
                ClientAuthErrorCodes.endpointResolutionError
            );
        }
    }

    public get deviceCodeEndpoint(): string {
        if (this.discoveryComplete()) {
            return this.replacePath(
                this.metadata.token_endpoint.replace("/token", "/devicecode")
            );
        } else {
            throw createClientAuthError(
                ClientAuthErrorCodes.endpointResolutionError
            );
        }
    }

    /**
     * OAuth logout endpoint for requests
     */
    public get endSessionEndpoint(): string {
        if (this.discoveryComplete()) {
            // ROPC policies may not have end_session_endpoint set
            if (!this.metadata.end_session_endpoint) {
                throw createClientAuthError(
                    ClientAuthErrorCodes.endSessionEndpointNotSupported
                );
            }
            return this.replacePath(this.metadata.end_session_endpoint);
        } else {
            throw createClientAuthError(
                ClientAuthErrorCodes.endpointResolutionError
            );
        }
    }

    /**
     * OAuth issuer for requests
     */
    public get selfSignedJwtAudience(): string {
        if (this.discoveryComplete()) {
            return this.replacePath(this.metadata.issuer);
        } else {
            throw createClientAuthError(
                ClientAuthErrorCodes.endpointResolutionError
            );
        }
    }

    /**
     * Jwks_uri for token signing keys
     */
    public get jwksUri(): string {
        if (this.discoveryComplete()) {
            return this.replacePath(this.metadata.jwks_uri);
        } else {
            throw createClientAuthError(
                ClientAuthErrorCodes.endpointResolutionError
            );
        }
    }

    /**
     * Returns a flag indicating that tenant name can be replaced in authority {@link IUri}
     * @param authorityUri {@link IUri}
     * @private
     */
    private canReplaceTenant(authorityUri: IUri): boolean {
        return (
            authorityUri.PathSegments.length === 1 &&
            !Authority.reservedTenantDomains.has(
                authorityUri.PathSegments[0]
            ) &&
            this.getAuthorityType(authorityUri) === AuthorityType.Default &&
            this.protocolMode !== ProtocolMode.OIDC
        );
    }

    /**
     * Replaces tenant in url path with current tenant. Defaults to common.
     * @param urlString
     */
    private replaceTenant(urlString: string): string {
        return urlString.replace(/{tenant}|{tenantid}/g, this.tenant);
    }

    /**
     * Replaces path such as tenant or policy with the current tenant or policy.
     * @param urlString
     */
    private replacePath(urlString: string): string {
        let endpoint = urlString;
        const cachedAuthorityUrl = new UrlString(
            this.metadata.canonical_authority
        );
        const cachedAuthorityUrlComponents =
            cachedAuthorityUrl.getUrlComponents();
        const cachedAuthorityParts = cachedAuthorityUrlComponents.PathSegments;
        const currentAuthorityParts =
            this.canonicalAuthorityUrlComponents.PathSegments;

        currentAuthorityParts.forEach((currentPart, index) => {
            let cachedPart = cachedAuthorityParts[index];
            if (
                index === 0 &&
                this.canReplaceTenant(cachedAuthorityUrlComponents)
            ) {
                const tenantId = new UrlString(
                    this.metadata.authorization_endpoint
                ).getUrlComponents().PathSegments[0];
                /**
                 * Check if AAD canonical authority contains tenant domain name, for example "testdomain.onmicrosoft.com",
                 * by comparing its first path segment to the corresponding authorization endpoint path segment, which is
                 * always resolved with tenant id by OIDC.
                 */
                if (cachedPart !== tenantId) {
                    this.logger.verbose(
                        `Replacing tenant domain name ${cachedPart} with id ${tenantId}`
                    );
                    cachedPart = tenantId;
                }
            }
            if (currentPart !== cachedPart) {
                endpoint = endpoint.replace(
                    `/${cachedPart}/`,
                    `/${currentPart}/`
                );
            }
        });

        return this.replaceTenant(endpoint);
    }

    /**
     * The default open id configuration endpoint for any canonical authority.
     */
    protected get defaultOpenIdConfigurationEndpoint(): string {
        const canonicalAuthorityHost = this.hostnameAndPort;
        if (
            this.canonicalAuthority.endsWith("v2.0/") ||
            this.authorityType === AuthorityType.Adfs ||
            (this.protocolMode === ProtocolMode.OIDC &&
                !this.isAliasOfKnownMicrosoftAuthority(canonicalAuthorityHost))
        ) {
            return `${this.canonicalAuthority}.well-known/openid-configuration`;
        }
        return `${this.canonicalAuthority}v2.0/.well-known/openid-configuration`;
    }

    /**
     * Boolean that returns whether or not tenant discovery has been completed.
     */
    discoveryComplete(): boolean {
        return !!this.metadata;
    }

    /**
     * Perform endpoint discovery to discover aliases, preferred_cache, preferred_network
     * and the /authorize, /token and logout endpoints.
     */
    public async resolveEndpointsAsync(): Promise<void> {
        this.performanceClient?.addQueueMeasurement(
            PerformanceEvents.AuthorityResolveEndpointsAsync,
            this.correlationId
        );

        const metadataEntity = this.getCurrentMetadataEntity();

        const cloudDiscoverySource = await invokeAsync(
            this.updateCloudDiscoveryMetadata.bind(this),
            PerformanceEvents.AuthorityUpdateCloudDiscoveryMetadata,
            this.logger,
            this.performanceClient,
            this.correlationId
        )(metadataEntity);
        this.canonicalAuthority = this.canonicalAuthority.replace(
            this.hostnameAndPort,
            metadataEntity.preferred_network
        );
        const endpointSource = await invokeAsync(
            this.updateEndpointMetadata.bind(this),
            PerformanceEvents.AuthorityUpdateEndpointMetadata,
            this.logger,
            this.performanceClient,
            this.correlationId
        )(metadataEntity);
        this.updateCachedMetadata(metadataEntity, cloudDiscoverySource, {
            source: endpointSource,
        });
        this.performanceClient?.addFields(
            {
                cloudDiscoverySource: cloudDiscoverySource,
                authorityEndpointSource: endpointSource,
            },
            this.correlationId
        );
    }

    /**
     * Returns metadata entity from cache if it exists, otherwiser returns a new metadata entity built
     * from the configured canonical authority
     * @returns
     */
    private getCurrentMetadataEntity(): AuthorityMetadataEntity {
        let metadataEntity: AuthorityMetadataEntity | null =
            this.cacheManager.getAuthorityMetadataByAlias(this.hostnameAndPort);

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
                expiresAt: CacheHelpers.generateAuthorityMetadataExpiresAt(),
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
    private updateCachedMetadata(
        metadataEntity: AuthorityMetadataEntity,
        cloudDiscoverySource: AuthorityMetadataSource | null,
        endpointMetadataResult: {
            source: AuthorityMetadataSource;
            metadata?: OpenIdConfigResponse;
        } | null
    ): void {
        if (
            cloudDiscoverySource !== AuthorityMetadataSource.CACHE &&
            endpointMetadataResult?.source !== AuthorityMetadataSource.CACHE
        ) {
            // Reset the expiration time unless both values came from a successful cache lookup
            metadataEntity.expiresAt =
                CacheHelpers.generateAuthorityMetadataExpiresAt();
            metadataEntity.canonical_authority = this.canonicalAuthority;
        }

        const cacheKey = this.cacheManager.generateAuthorityMetadataCacheKey(
            metadataEntity.preferred_cache
        );
        this.cacheManager.setAuthorityMetadata(cacheKey, metadataEntity);
        this.metadata = metadataEntity;
    }

    /**
     * Update AuthorityMetadataEntity with new endpoints and return where the information came from
     * @param metadataEntity
     */
    private async updateEndpointMetadata(
        metadataEntity: AuthorityMetadataEntity
    ): Promise<AuthorityMetadataSource> {
        this.performanceClient?.addQueueMeasurement(
            PerformanceEvents.AuthorityUpdateEndpointMetadata,
            this.correlationId
        );

        const localMetadata =
            this.updateEndpointMetadataFromLocalSources(metadataEntity);

        // Further update may be required for hardcoded metadata if regional metadata is preferred
        if (localMetadata) {
            if (
                localMetadata.source ===
                AuthorityMetadataSource.HARDCODED_VALUES
            ) {
                // If the user prefers to use an azure region replace the global endpoints with regional information.
                if (
                    this.authorityOptions.azureRegionConfiguration?.azureRegion
                ) {
                    if (localMetadata.metadata) {
                        const hardcodedMetadata = await invokeAsync(
                            this.updateMetadataWithRegionalInformation.bind(
                                this
                            ),
                            PerformanceEvents.AuthorityUpdateMetadataWithRegionalInformation,
                            this.logger,
                            this.performanceClient,
                            this.correlationId
                        )(localMetadata.metadata);
                        CacheHelpers.updateAuthorityEndpointMetadata(
                            metadataEntity,
                            hardcodedMetadata,
                            false
                        );
                        metadataEntity.canonical_authority =
                            this.canonicalAuthority;
                    }
                }
            }
            return localMetadata.source;
        }

        // Get metadata from network if local sources aren't available
        let metadata = await invokeAsync(
            this.getEndpointMetadataFromNetwork.bind(this),
            PerformanceEvents.AuthorityGetEndpointMetadataFromNetwork,
            this.logger,
            this.performanceClient,
            this.correlationId
        )();
        if (metadata) {
            // If the user prefers to use an azure region replace the global endpoints with regional information.
            if (this.authorityOptions.azureRegionConfiguration?.azureRegion) {
                metadata = await invokeAsync(
                    this.updateMetadataWithRegionalInformation.bind(this),
                    PerformanceEvents.AuthorityUpdateMetadataWithRegionalInformation,
                    this.logger,
                    this.performanceClient,
                    this.correlationId
                )(metadata);
            }

            CacheHelpers.updateAuthorityEndpointMetadata(
                metadataEntity,
                metadata,
                true
            );
            return AuthorityMetadataSource.NETWORK;
        } else {
            // Metadata could not be obtained from the config, cache, network or hardcoded values
            throw createClientAuthError(
                ClientAuthErrorCodes.openIdConfigError,
                this.defaultOpenIdConfigurationEndpoint
            );
        }
    }

    /**
     * Updates endpoint metadata from local sources and returns where the information was retrieved from and the metadata config
     * response if the source is hardcoded metadata
     * @param metadataEntity
     * @returns
     */
    private updateEndpointMetadataFromLocalSources(
        metadataEntity: AuthorityMetadataEntity
    ): {
        source: AuthorityMetadataSource;
        metadata?: OpenIdConfigResponse;
    } | null {
        this.logger.verbose(
            "Attempting to get endpoint metadata from authority configuration"
        );
        const configMetadata = this.getEndpointMetadataFromConfig();
        if (configMetadata) {
            this.logger.verbose(
                "Found endpoint metadata in authority configuration"
            );
            CacheHelpers.updateAuthorityEndpointMetadata(
                metadataEntity,
                configMetadata,
                false
            );
            return {
                source: AuthorityMetadataSource.CONFIG,
            };
        }

        this.logger.verbose(
            "Did not find endpoint metadata in the config... Attempting to get endpoint metadata from the hardcoded values."
        );

        // skipAuthorityMetadataCache is used to bypass hardcoded authority metadata and force a network metadata cache lookup and network metadata request if no cached response is available.
        if (this.authorityOptions.skipAuthorityMetadataCache) {
            this.logger.verbose(
                "Skipping hardcoded metadata cache since skipAuthorityMetadataCache is set to true. Attempting to get endpoint metadata from the network metadata cache."
            );
        } else {
            const hardcodedMetadata =
                this.getEndpointMetadataFromHardcodedValues();
            if (hardcodedMetadata) {
                CacheHelpers.updateAuthorityEndpointMetadata(
                    metadataEntity,
                    hardcodedMetadata,
                    false
                );
                return {
                    source: AuthorityMetadataSource.HARDCODED_VALUES,
                    metadata: hardcodedMetadata,
                };
            } else {
                this.logger.verbose(
                    "Did not find endpoint metadata in hardcoded values... Attempting to get endpoint metadata from the network metadata cache."
                );
            }
        }

        // Check cached metadata entity expiration status
        const metadataEntityExpired =
            CacheHelpers.isAuthorityMetadataExpired(metadataEntity);
        if (
            this.isAuthoritySameType(metadataEntity) &&
            metadataEntity.endpointsFromNetwork &&
            !metadataEntityExpired
        ) {
            // No need to update
            this.logger.verbose("Found endpoint metadata in the cache.");
            return { source: AuthorityMetadataSource.CACHE };
        } else if (metadataEntityExpired) {
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
    private isAuthoritySameType(
        metadataEntity: AuthorityMetadataEntity
    ): boolean {
        const cachedAuthorityUrl = new UrlString(
            metadataEntity.canonical_authority
        );
        const cachedParts = cachedAuthorityUrl.getUrlComponents().PathSegments;

        return (
            cachedParts.length ===
            this.canonicalAuthorityUrlComponents.PathSegments.length
        );
    }

    /**
     * Parse authorityMetadata config option
     */
    private getEndpointMetadataFromConfig(): OpenIdConfigResponse | null {
        if (this.authorityOptions.authorityMetadata) {
            try {
                return JSON.parse(
                    this.authorityOptions.authorityMetadata
                ) as OpenIdConfigResponse;
            } catch (e) {
                throw createClientConfigurationError(
                    ClientConfigurationErrorCodes.invalidAuthorityMetadata
                );
            }
        }

        return null;
    }

    /**
     * Gets OAuth endpoints from the given OpenID configuration endpoint.
     *
     * @param hasHardcodedMetadata boolean
     */
    private async getEndpointMetadataFromNetwork(): Promise<OpenIdConfigResponse | null> {
        this.performanceClient?.addQueueMeasurement(
            PerformanceEvents.AuthorityGetEndpointMetadataFromNetwork,
            this.correlationId
        );

        const options: ImdsOptions = {};

        /*
         * TODO: Add a timeout if the authority exists in our library's
         * hardcoded list of metadata
         */

        const openIdConfigurationEndpoint =
            this.defaultOpenIdConfigurationEndpoint;
        this.logger.verbose(
            `Authority.getEndpointMetadataFromNetwork: attempting to retrieve OAuth endpoints from ${openIdConfigurationEndpoint}`
        );

        try {
            const response =
                await this.networkInterface.sendGetRequestAsync<OpenIdConfigResponse>(
                    openIdConfigurationEndpoint,
                    options
                );
            const isValidResponse = isOpenIdConfigResponse(response.body);
            if (isValidResponse) {
                return response.body;
            } else {
                this.logger.verbose(
                    `Authority.getEndpointMetadataFromNetwork: could not parse response as OpenID configuration`
                );
                return null;
            }
        } catch (e) {
            this.logger.verbose(
                `Authority.getEndpointMetadataFromNetwork: ${e}`
            );
            return null;
        }
    }

    /**
     * Get OAuth endpoints for common authorities.
     */
    private getEndpointMetadataFromHardcodedValues(): OpenIdConfigResponse | null {
        if (this.hostnameAndPort in EndpointMetadata) {
            return EndpointMetadata[this.hostnameAndPort];
        }

        return null;
    }

    /**
     * Update the retrieved metadata with regional information.
     * User selected Azure region will be used if configured.
     */
    private async updateMetadataWithRegionalInformation(
        metadata: OpenIdConfigResponse
    ): Promise<OpenIdConfigResponse> {
        this.performanceClient?.addQueueMeasurement(
            PerformanceEvents.AuthorityUpdateMetadataWithRegionalInformation,
            this.correlationId
        );

        const userConfiguredAzureRegion =
            this.authorityOptions.azureRegionConfiguration?.azureRegion;

        if (userConfiguredAzureRegion) {
            if (
                userConfiguredAzureRegion !==
                Constants.AZURE_REGION_AUTO_DISCOVER_FLAG
            ) {
                this.regionDiscoveryMetadata.region_outcome =
                    RegionDiscoveryOutcomes.CONFIGURED_NO_AUTO_DETECTION;
                this.regionDiscoveryMetadata.region_used =
                    userConfiguredAzureRegion;
                return Authority.replaceWithRegionalInformation(
                    metadata,
                    userConfiguredAzureRegion
                );
            }

            const autodetectedRegionName = await invokeAsync(
                this.regionDiscovery.detectRegion.bind(this.regionDiscovery),
                PerformanceEvents.RegionDiscoveryDetectRegion,
                this.logger,
                this.performanceClient,
                this.correlationId
            )(
                this.authorityOptions.azureRegionConfiguration
                    ?.environmentRegion,
                this.regionDiscoveryMetadata
            );

            if (autodetectedRegionName) {
                this.regionDiscoveryMetadata.region_outcome =
                    RegionDiscoveryOutcomes.AUTO_DETECTION_REQUESTED_SUCCESSFUL;
                this.regionDiscoveryMetadata.region_used =
                    autodetectedRegionName;
                return Authority.replaceWithRegionalInformation(
                    metadata,
                    autodetectedRegionName
                );
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
    private async updateCloudDiscoveryMetadata(
        metadataEntity: AuthorityMetadataEntity
    ): Promise<AuthorityMetadataSource> {
        this.performanceClient?.addQueueMeasurement(
            PerformanceEvents.AuthorityUpdateCloudDiscoveryMetadata,
            this.correlationId
        );
        const localMetadataSource =
            this.updateCloudDiscoveryMetadataFromLocalSources(metadataEntity);
        if (localMetadataSource) {
            return localMetadataSource;
        }

        // Fallback to network as metadata source
        const metadata = await invokeAsync(
            this.getCloudDiscoveryMetadataFromNetwork.bind(this),
            PerformanceEvents.AuthorityGetCloudDiscoveryMetadataFromNetwork,
            this.logger,
            this.performanceClient,
            this.correlationId
        )();

        if (metadata) {
            CacheHelpers.updateCloudDiscoveryMetadata(
                metadataEntity,
                metadata,
                true
            );
            return AuthorityMetadataSource.NETWORK;
        }

        // Metadata could not be obtained from the config, cache, network or hardcoded values
        throw createClientConfigurationError(
            ClientConfigurationErrorCodes.untrustedAuthority
        );
    }

    private updateCloudDiscoveryMetadataFromLocalSources(
        metadataEntity: AuthorityMetadataEntity
    ): AuthorityMetadataSource | null {
        this.logger.verbose(
            "Attempting to get cloud discovery metadata  from authority configuration"
        );
        this.logger.verbosePii(
            `Known Authorities: ${
                this.authorityOptions.knownAuthorities ||
                Constants.NOT_APPLICABLE
            }`
        );
        this.logger.verbosePii(
            `Authority Metadata: ${
                this.authorityOptions.authorityMetadata ||
                Constants.NOT_APPLICABLE
            }`
        );
        this.logger.verbosePii(
            `Canonical Authority: ${
                metadataEntity.canonical_authority || Constants.NOT_APPLICABLE
            }`
        );
        const metadata = this.getCloudDiscoveryMetadataFromConfig();
        if (metadata) {
            this.logger.verbose(
                "Found cloud discovery metadata in authority configuration"
            );
            CacheHelpers.updateCloudDiscoveryMetadata(
                metadataEntity,
                metadata,
                false
            );
            return AuthorityMetadataSource.CONFIG;
        }

        // If the cached metadata came from config but that config was not passed to this instance, we must go to hardcoded values
        this.logger.verbose(
            "Did not find cloud discovery metadata in the config... Attempting to get cloud discovery metadata from the hardcoded values."
        );

        if (this.options.skipAuthorityMetadataCache) {
            this.logger.verbose(
                "Skipping hardcoded cloud discovery metadata cache since skipAuthorityMetadataCache is set to true. Attempting to get cloud discovery metadata from the network metadata cache."
            );
        } else {
            const hardcodedMetadata =
                getCloudDiscoveryMetadataFromHardcodedValues(
                    this.hostnameAndPort
                );
            if (hardcodedMetadata) {
                this.logger.verbose(
                    "Found cloud discovery metadata from hardcoded values."
                );
                CacheHelpers.updateCloudDiscoveryMetadata(
                    metadataEntity,
                    hardcodedMetadata,
                    false
                );
                return AuthorityMetadataSource.HARDCODED_VALUES;
            }

            this.logger.verbose(
                "Did not find cloud discovery metadata in hardcoded values... Attempting to get cloud discovery metadata from the network metadata cache."
            );
        }

        const metadataEntityExpired =
            CacheHelpers.isAuthorityMetadataExpired(metadataEntity);
        if (
            this.isAuthoritySameType(metadataEntity) &&
            metadataEntity.aliasesFromNetwork &&
            !metadataEntityExpired
        ) {
            this.logger.verbose("Found cloud discovery metadata in the cache.");
            // No need to update
            return AuthorityMetadataSource.CACHE;
        } else if (metadataEntityExpired) {
            this.logger.verbose("The metadata entity is expired.");
        }

        return null;
    }

    /**
     * Parse cloudDiscoveryMetadata config or check knownAuthorities
     */
    private getCloudDiscoveryMetadataFromConfig(): CloudDiscoveryMetadata | null {
        // CIAM does not support cloud discovery metadata
        if (this.authorityType === AuthorityType.Ciam) {
            this.logger.verbose(
                "CIAM authorities do not support cloud discovery metadata, generate the aliases from authority host."
            );
            return Authority.createCloudDiscoveryMetadataFromHost(
                this.hostnameAndPort
            );
        }

        // Check if network response was provided in config
        if (this.authorityOptions.cloudDiscoveryMetadata) {
            this.logger.verbose(
                "The cloud discovery metadata has been provided as a network response, in the config."
            );
            try {
                this.logger.verbose(
                    "Attempting to parse the cloud discovery metadata."
                );
                const parsedResponse = JSON.parse(
                    this.authorityOptions.cloudDiscoveryMetadata
                ) as CloudInstanceDiscoveryResponse;
                const metadata = getCloudDiscoveryMetadataFromNetworkResponse(
                    parsedResponse.metadata,
                    this.hostnameAndPort
                );
                this.logger.verbose("Parsed the cloud discovery metadata.");
                if (metadata) {
                    this.logger.verbose(
                        "There is returnable metadata attached to the parsed cloud discovery metadata."
                    );
                    return metadata;
                } else {
                    this.logger.verbose(
                        "There is no metadata attached to the parsed cloud discovery metadata."
                    );
                }
            } catch (e) {
                this.logger.verbose(
                    "Unable to parse the cloud discovery metadata. Throwing Invalid Cloud Discovery Metadata Error."
                );
                throw createClientConfigurationError(
                    ClientConfigurationErrorCodes.invalidCloudDiscoveryMetadata
                );
            }
        }

        // If cloudDiscoveryMetadata is empty or does not contain the host, check knownAuthorities
        if (this.isInKnownAuthorities()) {
            this.logger.verbose(
                "The host is included in knownAuthorities. Creating new cloud discovery metadata from the host."
            );
            return Authority.createCloudDiscoveryMetadataFromHost(
                this.hostnameAndPort
            );
        }

        return null;
    }

    /**
     * Called to get metadata from network if CloudDiscoveryMetadata was not populated by config
     *
     * @param hasHardcodedMetadata boolean
     */
    private async getCloudDiscoveryMetadataFromNetwork(): Promise<CloudDiscoveryMetadata | null> {
        this.performanceClient?.addQueueMeasurement(
            PerformanceEvents.AuthorityGetCloudDiscoveryMetadataFromNetwork,
            this.correlationId
        );
        const instanceDiscoveryEndpoint = `${Constants.AAD_INSTANCE_DISCOVERY_ENDPT}${this.canonicalAuthority}oauth2/v2.0/authorize`;
        const options: ImdsOptions = {};

        /*
         * TODO: Add a timeout if the authority exists in our library's
         * hardcoded list of metadata
         */

        let match = null;
        try {
            const response = await this.networkInterface.sendGetRequestAsync<
                | CloudInstanceDiscoveryResponse
                | CloudInstanceDiscoveryErrorResponse
            >(instanceDiscoveryEndpoint, options);
            let typedResponseBody:
                | CloudInstanceDiscoveryResponse
                | CloudInstanceDiscoveryErrorResponse;
            let metadata: Array<CloudDiscoveryMetadata>;
            if (isCloudInstanceDiscoveryResponse(response.body)) {
                typedResponseBody =
                    response.body as CloudInstanceDiscoveryResponse;
                metadata = typedResponseBody.metadata;

                this.logger.verbosePii(
                    `tenant_discovery_endpoint is: ${typedResponseBody.tenant_discovery_endpoint}`
                );
            } else if (isCloudInstanceDiscoveryErrorResponse(response.body)) {
                this.logger.warning(
                    `A CloudInstanceDiscoveryErrorResponse was returned. The cloud instance discovery network request's status code is: ${response.status}`
                );

                typedResponseBody =
                    response.body as CloudInstanceDiscoveryErrorResponse;
                if (typedResponseBody.error === Constants.INVALID_INSTANCE) {
                    this.logger.error(
                        "The CloudInstanceDiscoveryErrorResponse error is invalid_instance."
                    );
                    return null;
                }

                this.logger.warning(
                    `The CloudInstanceDiscoveryErrorResponse error is ${typedResponseBody.error}`
                );
                this.logger.warning(
                    `The CloudInstanceDiscoveryErrorResponse error description is ${typedResponseBody.error_description}`
                );

                this.logger.warning(
                    "Setting the value of the CloudInstanceDiscoveryMetadata (returned from the network) to []"
                );
                metadata = [];
            } else {
                this.logger.error(
                    "AAD did not return a CloudInstanceDiscoveryResponse or CloudInstanceDiscoveryErrorResponse"
                );
                return null;
            }

            this.logger.verbose(
                "Attempting to find a match between the developer's authority and the CloudInstanceDiscoveryMetadata returned from the network request."
            );
            match = getCloudDiscoveryMetadataFromNetworkResponse(
                metadata,
                this.hostnameAndPort
            );
        } catch (error) {
            if (error instanceof AuthError) {
                this.logger.error(
                    `There was a network error while attempting to get the cloud discovery instance metadata.\nError: ${error.errorCode}\nError Description: ${error.errorMessage}`
                );
            } else {
                const typedError = error as Error;
                this.logger.error(
                    `A non-MSALJS error was thrown while attempting to get the cloud instance discovery metadata.\nError: ${typedError.name}\nError Description: ${typedError.message}`
                );
            }

            return null;
        }

        // Custom Domain scenario, host is trusted because Instance Discovery call succeeded
        if (!match) {
            this.logger.warning(
                "The developer's authority was not found within the CloudInstanceDiscoveryMetadata returned from the network request."
            );
            this.logger.verbose(
                "Creating custom Authority for custom domain scenario."
            );

            match = Authority.createCloudDiscoveryMetadataFromHost(
                this.hostnameAndPort
            );
        }
        return match;
    }

    /**
     * Helper function to determine if this host is included in the knownAuthorities config option
     */
    private isInKnownAuthorities(): boolean {
        const matches = this.authorityOptions.knownAuthorities.filter(
            (authority) => {
                return (
                    authority &&
                    UrlString.getDomainFromUrl(authority).toLowerCase() ===
                        this.hostnameAndPort
                );
            }
        );
        return matches.length > 0;
    }

    /**
     * helper function to populate the authority based on azureCloudOptions
     * @param authorityString
     * @param azureCloudOptions
     */
    static generateAuthority(
        authorityString: string,
        azureCloudOptions?: AzureCloudOptions
    ): string {
        let authorityAzureCloudInstance;

        if (
            azureCloudOptions &&
            azureCloudOptions.azureCloudInstance !== AzureCloudInstance.None
        ) {
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
    static createCloudDiscoveryMetadataFromHost(
        host: string
    ): CloudDiscoveryMetadata {
        return {
            preferred_network: host,
            preferred_cache: host,
            aliases: [host],
        };
    }

    /**
     * helper function to generate environment from authority object
     */
    getPreferredCache(): string {
        if (this.managedIdentity) {
            return Constants.DEFAULT_AUTHORITY_HOST;
        } else if (this.discoveryComplete()) {
            return this.metadata.preferred_cache;
        } else {
            throw createClientAuthError(
                ClientAuthErrorCodes.endpointResolutionError
            );
        }
    }

    /**
     * Returns whether or not the provided host is an alias of this authority instance
     * @param host
     */
    isAlias(host: string): boolean {
        return this.metadata.aliases.indexOf(host) > -1;
    }

    /**
     * Returns whether or not the provided host is an alias of a known Microsoft authority for purposes of endpoint discovery
     * @param host
     */
    isAliasOfKnownMicrosoftAuthority(host: string): boolean {
        return InstanceDiscoveryMetadataAliases.has(host);
    }

    /**
     * Checks whether the provided host is that of a public cloud authority
     *
     * @param authority string
     * @returns bool
     */
    static isPublicCloudAuthority(host: string): boolean {
        return Constants.KNOWN_PUBLIC_CLOUDS.indexOf(host) >= 0;
    }

    /**
     * Rebuild the authority string with the region
     *
     * @param host string
     * @param region string
     */
    static buildRegionalAuthorityString(
        host: string,
        region: string,
        queryString?: string
    ): string {
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
        if (queryString) return `${url}?${queryString}`;

        return url;
    }

    /**
     * Replace the endpoints in the metadata object with their regional equivalents.
     *
     * @param metadata OpenIdConfigResponse
     * @param azureRegion string
     */
    static replaceWithRegionalInformation(
        metadata: OpenIdConfigResponse,
        azureRegion: string
    ): OpenIdConfigResponse {
        const regionalMetadata = { ...metadata };
        regionalMetadata.authorization_endpoint =
            Authority.buildRegionalAuthorityString(
                regionalMetadata.authorization_endpoint,
                azureRegion
            );

        regionalMetadata.token_endpoint =
            Authority.buildRegionalAuthorityString(
                regionalMetadata.token_endpoint,
                azureRegion
            );

        if (regionalMetadata.end_session_endpoint) {
            regionalMetadata.end_session_endpoint =
                Authority.buildRegionalAuthorityString(
                    regionalMetadata.end_session_endpoint,
                    azureRegion
                );
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
    static transformCIAMAuthority(authority: string): string {
        let ciamAuthority = authority;
        const authorityUrl = new UrlString(authority);
        const authorityUrlComponents = authorityUrl.getUrlComponents();

        // check if transformation is needed
        if (
            authorityUrlComponents.PathSegments.length === 0 &&
            authorityUrlComponents.HostNameAndPort.endsWith(
                Constants.CIAM_AUTH_URL
            )
        ) {
            const tenantIdOrDomain =
                authorityUrlComponents.HostNameAndPort.split(".")[0];
            ciamAuthority = `${ciamAuthority}${tenantIdOrDomain}${Constants.AAD_TENANT_DOMAIN_SUFFIX}`;
        }

        return ciamAuthority;
    }
}

/**
 * Extract tenantId from authority
 */
export function getTenantFromAuthorityString(
    authority: string
): string | undefined {
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
    const tenantId =
        authorityUrlComponents.PathSegments.slice(-1)[0]?.toLowerCase();

    switch (tenantId) {
        case AADAuthorityConstants.COMMON:
        case AADAuthorityConstants.ORGANIZATIONS:
        case AADAuthorityConstants.CONSUMERS:
            return undefined;
        default:
            return tenantId;
    }
}

export function formatAuthorityUri(authorityUri: string): string {
    return authorityUri.endsWith(Constants.FORWARD_SLASH)
        ? authorityUri
        : `${authorityUri}${Constants.FORWARD_SLASH}`;
}

export function buildStaticAuthorityOptions(
    authOptions: Partial<AuthorityOptions>
): StaticAuthorityOptions {
    const rawCloudDiscoveryMetadata = authOptions.cloudDiscoveryMetadata;
    let cloudDiscoveryMetadata: CloudInstanceDiscoveryResponse | undefined =
        undefined;
    if (rawCloudDiscoveryMetadata) {
        try {
            cloudDiscoveryMetadata = JSON.parse(rawCloudDiscoveryMetadata);
        } catch (e) {
            throw createClientConfigurationError(
                ClientConfigurationErrorCodes.invalidCloudDiscoveryMetadata
            );
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
