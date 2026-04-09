/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { Logger } from "../logger/Logger.js";
import { UrlString } from "../url/UrlString.js";
import { AuthorityMetadataSource } from "../utils/Constants.js";
import { StaticAuthorityOptions } from "./AuthorityOptions.js";
import { CloudDiscoveryMetadata } from "./CloudDiscoveryMetadata.js";
import { CloudInstanceDiscoveryResponse } from "./CloudInstanceDiscoveryResponse.js";
import { OpenIdConfigResponse } from "./OpenIdConfigResponse.js";

type RawMetadata = {
    endpointMetadata: { [key: string]: OpenIdConfigResponse };
    instanceDiscoveryMetadata: CloudInstanceDiscoveryResponse;
};

export const rawMetdataJSON: RawMetadata = {
    endpointMetadata: {
        "login.microsoftonline.com": {
            token_endpoint:
                "https://login.microsoftonline.com/{tenantid}/oauth2/v2.0/token",
            jwks_uri:
                "https://login.microsoftonline.com/{tenantid}/discovery/v2.0/keys",
            issuer: "https://login.microsoftonline.com/{tenantid}/v2.0",
            authorization_endpoint:
                "https://login.microsoftonline.com/{tenantid}/oauth2/v2.0/authorize",
            end_session_endpoint:
                "https://login.microsoftonline.com/{tenantid}/oauth2/v2.0/logout",
        },
        "login.chinacloudapi.cn": {
            token_endpoint:
                "https://login.chinacloudapi.cn/{tenantid}/oauth2/v2.0/token",
            jwks_uri:
                "https://login.chinacloudapi.cn/{tenantid}/discovery/v2.0/keys",
            issuer: "https://login.partner.microsoftonline.cn/{tenantid}/v2.0",
            authorization_endpoint:
                "https://login.chinacloudapi.cn/{tenantid}/oauth2/v2.0/authorize",
            end_session_endpoint:
                "https://login.chinacloudapi.cn/{tenantid}/oauth2/v2.0/logout",
        },
        "login.microsoftonline.us": {
            token_endpoint:
                "https://login.microsoftonline.us/{tenantid}/oauth2/v2.0/token",
            jwks_uri:
                "https://login.microsoftonline.us/{tenantid}/discovery/v2.0/keys",
            issuer: "https://login.microsoftonline.us/{tenantid}/v2.0",
            authorization_endpoint:
                "https://login.microsoftonline.us/{tenantid}/oauth2/v2.0/authorize",
            end_session_endpoint:
                "https://login.microsoftonline.us/{tenantid}/oauth2/v2.0/logout",
        },
        "login.sovcloud-identity.fr": {
            token_endpoint:
                "https://login.sovcloud-identity.fr/{tenantid}/oauth2/v2.0/token",
            jwks_uri:
                "https://login.sovcloud-identity.fr/{tenantid}/discovery/v2.0/keys",
            issuer: "https://login.sovcloud-identity.fr/{tenantid}/v2.0",
            authorization_endpoint:
                "https://login.sovcloud-identity.fr/{tenantid}/oauth2/v2.0/authorize",
            end_session_endpoint:
                "https://login.sovcloud-identity.fr/{tenantid}/oauth2/v2.0/logout",
        },
        "login.sovcloud-identity.de": {
            token_endpoint:
                "https://login.sovcloud-identity.de/{tenantid}/oauth2/v2.0/token",
            jwks_uri:
                "https://login.sovcloud-identity.de/{tenantid}/discovery/v2.0/keys",
            issuer: "https://login.sovcloud-identity.de/{tenantid}/v2.0",
            authorization_endpoint:
                "https://login.sovcloud-identity.de/{tenantid}/oauth2/v2.0/authorize",
            end_session_endpoint:
                "https://login.sovcloud-identity.de/{tenantid}/oauth2/v2.0/logout",
        },
        "login.sovcloud-identity.sg": {
            token_endpoint:
                "https://login.sovcloud-identity.sg/common/oauth2/v2.0/token",
            jwks_uri:
                "https://login.sovcloud-identity.sg/common/discovery/v2.0/keys",
            issuer: "https://login.sovcloud-identity.sg/{tenantid}/v2.0",
            authorization_endpoint:
                "https://login.sovcloud-identity.sg/common/oauth2/v2.0/authorize",
            end_session_endpoint:
                "https://login.sovcloud-identity.sg/common/oauth2/v2.0/logout",
        },
    },
    instanceDiscoveryMetadata: {
        tenant_discovery_endpoint:
            "https://{canonicalAuthority}/v2.0/.well-known/openid-configuration",
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
            {
                preferred_network: "login.sovcloud-identity.fr",
                preferred_cache: "login.sovcloud-identity.fr",
                aliases: ["login.sovcloud-identity.fr"],
            },
            {
                preferred_network: "login.sovcloud-identity.de",
                preferred_cache: "login.sovcloud-identity.de",
                aliases: ["login.sovcloud-identity.de"],
            },
            {
                preferred_network: "login.sovcloud-identity.sg",
                preferred_cache: "login.sovcloud-identity.sg",
                aliases: ["login.sovcloud-identity.sg"],
            },
        ],
    },
};

export const EndpointMetadata = rawMetdataJSON.endpointMetadata;
export const InstanceDiscoveryMetadata =
    rawMetdataJSON.instanceDiscoveryMetadata;

export const InstanceDiscoveryMetadataAliases: Set<String> = new Set();
InstanceDiscoveryMetadata.metadata.forEach(
    (metadataEntry: CloudDiscoveryMetadata) => {
        metadataEntry.aliases.forEach((alias: string) => {
            InstanceDiscoveryMetadataAliases.add(alias);
        });
    }
);

/**
 * Attempts to get an aliases array from the static authority metadata sources based on the canonical authority host
 * @param staticAuthorityOptions
 * @param logger
 * @returns
 */
export function getAliasesFromStaticSources(
    staticAuthorityOptions: StaticAuthorityOptions,
    logger?: Logger
): string[] {
    let staticAliases: string[] | undefined;
    const canonicalAuthority = staticAuthorityOptions.canonicalAuthority;
    if (canonicalAuthority) {
        const authorityHost = new UrlString(
            canonicalAuthority
        ).getUrlComponents().HostNameAndPort;
        staticAliases =
            getAliasesFromMetadata(
                authorityHost,
                staticAuthorityOptions.cloudDiscoveryMetadata?.metadata,
                AuthorityMetadataSource.CONFIG,
                logger
            ) ||
            getAliasesFromMetadata(
                authorityHost,
                InstanceDiscoveryMetadata.metadata,
                AuthorityMetadataSource.HARDCODED_VALUES,
                logger
            ) ||
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
export function getAliasesFromMetadata(
    authorityHost?: string,
    cloudDiscoveryMetadata?: CloudDiscoveryMetadata[],
    source?: AuthorityMetadataSource,
    logger?: Logger
): string[] | null {
    logger?.trace(`getAliasesFromMetadata called with source: ${source}`);
    if (authorityHost && cloudDiscoveryMetadata) {
        const metadata = getCloudDiscoveryMetadataFromNetworkResponse(
            cloudDiscoveryMetadata,
            authorityHost
        );

        if (metadata) {
            logger?.trace(
                `getAliasesFromMetadata: found cloud discovery metadata in ${source}, returning aliases`
            );
            return metadata.aliases;
        } else {
            logger?.trace(
                `getAliasesFromMetadata: did not find cloud discovery metadata in ${source}`
            );
        }
    }

    return null;
}

/**
 * Get cloud discovery metadata for common authorities
 */
export function getCloudDiscoveryMetadataFromHardcodedValues(
    authorityHost: string
): CloudDiscoveryMetadata | null {
    const metadata = getCloudDiscoveryMetadataFromNetworkResponse(
        InstanceDiscoveryMetadata.metadata,
        authorityHost
    );
    return metadata;
}

/**
 * Searches instance discovery network response for the entry that contains the host in the aliases list
 * @param response
 * @param authority
 */
export function getCloudDiscoveryMetadataFromNetworkResponse(
    response: CloudDiscoveryMetadata[],
    authorityHost: string
): CloudDiscoveryMetadata | null {
    for (let i = 0; i < response.length; i++) {
        const metadata = response[i];
        if (metadata.aliases.includes(authorityHost)) {
            return metadata;
        }
    }

    return null;
}
