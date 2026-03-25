/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    Authority,
    AuthorityOptions,
    INetworkModule,
    Logger,
} from "@azure/msal-common/browser";
import * as CustomAuthApiEndpoint from "./network_client/custom_auth_api/CustomAuthApiEndpoint.js";
import { buildUrl } from "./utils/UrlUtils.js";
import { BrowserConfiguration } from "../../config/Configuration.js";
import { BrowserCacheManager } from "../../cache/BrowserCacheManager.js";

/**
 * Authority class which can be used to create an authority object for Custom Auth features.
 */
export class CustomAuthAuthority extends Authority {
    /**
     * Constructor for the Custom Auth Authority.
     * @param authority - The authority URL for the authority.
     * @param networkInterface - The network interface implementation to make requests.
     * @param cacheManager - The cache manager.
     * @param authorityOptions - The options for the authority.
     * @param logger - The logger for the authority.
     * @param customAuthProxyDomain - The custom auth proxy domain.
     */
    constructor(
        authority: string,
        config: BrowserConfiguration,
        networkInterface: INetworkModule,
        cacheManager: BrowserCacheManager,
        logger: Logger,
        private customAuthProxyDomain?: string
    ) {
        const ciamAuthorityUrl =
            CustomAuthAuthority.transformCIAMAuthority(authority);

        const authorityOptions: AuthorityOptions = {
            protocolMode: config.auth.protocolMode,
            OIDCOptions: config.auth.OIDCOptions,
            knownAuthorities: config.auth.knownAuthorities,
            cloudDiscoveryMetadata: config.auth.cloudDiscoveryMetadata,
            authorityMetadata: config.auth.authorityMetadata,
            skipAuthorityMetadataCache: config.auth.skipAuthorityMetadataCache,
        };

        super(
            ciamAuthorityUrl,
            networkInterface,
            cacheManager,
            authorityOptions,
            logger,
            ""
        );

        // Set the metadata for the authority
        const metadataEntity = {
            aliases: [this.hostnameAndPort],
            preferred_cache: this.getPreferredCache(),
            preferred_network: this.hostnameAndPort,
            canonical_authority: this.canonicalAuthority,
            authorization_endpoint: "",
            token_endpoint: this.tokenEndpoint,
            end_session_endpoint: "",
            issuer: "",
            aliasesFromNetwork: false,
            endpointsFromNetwork: false,
            /*
             * give max value to make sure it doesn't expire,
             * as we only initiate the authority metadata entity once and it doesn't change
             */
            expiresAt: Number.MAX_SAFE_INTEGER,
            jwks_uri: "",
        };
        const cacheKey = this.cacheManager.generateAuthorityMetadataCacheKey(
            metadataEntity.preferred_cache
        );
        cacheManager.setAuthorityMetadata(cacheKey, metadataEntity);
    }

    /**
     * Gets the custom auth endpoint.
     * The open id configuration doesn't have the correct endpoint for the auth APIs.
     * We need to generate the endpoint manually based on the authority URL.
     * @returns The custom auth endpoint
     */
    getCustomAuthApiDomain(): string {
        /*
         * The customAuthProxyDomain is used to resolve the CORS issue when calling the auth APIs.
         * If the customAuthProxyDomain is not provided, we will generate the auth API domain based on the authority URL.
         */
        return !this.customAuthProxyDomain
            ? this.canonicalAuthority
            : this.customAuthProxyDomain;
    }

    override getPreferredCache(): string {
        return this.canonicalAuthorityUrlComponents.HostNameAndPort;
    }

    override get tokenEndpoint(): string {
        const endpointUrl = buildUrl(
            this.getCustomAuthApiDomain(),
            CustomAuthApiEndpoint.SIGNIN_TOKEN
        );

        return endpointUrl.href;
    }
}
