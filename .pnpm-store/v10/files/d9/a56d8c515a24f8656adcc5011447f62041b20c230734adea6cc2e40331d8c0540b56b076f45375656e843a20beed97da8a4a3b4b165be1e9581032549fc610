import { Logger } from "../logger/Logger.js";
import { AuthorityMetadataSource } from "../utils/Constants.js";
import { StaticAuthorityOptions } from "./AuthorityOptions.js";
import { CloudDiscoveryMetadata } from "./CloudDiscoveryMetadata.js";
import { CloudInstanceDiscoveryResponse } from "./CloudInstanceDiscoveryResponse.js";
import { OpenIdConfigResponse } from "./OpenIdConfigResponse.js";
type RawMetadata = {
    endpointMetadata: {
        [key: string]: OpenIdConfigResponse;
    };
    instanceDiscoveryMetadata: CloudInstanceDiscoveryResponse;
};
export declare const rawMetdataJSON: RawMetadata;
export declare const EndpointMetadata: {
    [key: string]: OpenIdConfigResponse;
};
export declare const InstanceDiscoveryMetadata: CloudInstanceDiscoveryResponse;
export declare const InstanceDiscoveryMetadataAliases: Set<String>;
/**
 * Attempts to get an aliases array from the static authority metadata sources based on the canonical authority host
 * @param staticAuthorityOptions
 * @param logger
 * @returns
 */
export declare function getAliasesFromStaticSources(staticAuthorityOptions: StaticAuthorityOptions, logger?: Logger): string[];
/**
 * Returns aliases for from the raw cloud discovery metadata passed in
 * @param authorityHost
 * @param rawCloudDiscoveryMetadata
 * @returns
 */
export declare function getAliasesFromMetadata(authorityHost?: string, cloudDiscoveryMetadata?: CloudDiscoveryMetadata[], source?: AuthorityMetadataSource, logger?: Logger): string[] | null;
/**
 * Get cloud discovery metadata for common authorities
 */
export declare function getCloudDiscoveryMetadataFromHardcodedValues(authorityHost: string): CloudDiscoveryMetadata | null;
/**
 * Searches instance discovery network response for the entry that contains the host in the aliases list
 * @param response
 * @param authority
 */
export declare function getCloudDiscoveryMetadataFromNetworkResponse(response: CloudDiscoveryMetadata[], authorityHost: string): CloudDiscoveryMetadata | null;
export {};
//# sourceMappingURL=AuthorityMetadata.d.ts.map