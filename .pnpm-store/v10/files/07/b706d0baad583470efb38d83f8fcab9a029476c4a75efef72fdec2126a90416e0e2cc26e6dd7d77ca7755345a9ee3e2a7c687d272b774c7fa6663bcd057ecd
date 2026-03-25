import { ProtocolMode } from "./ProtocolMode.js";
import { OIDCOptions } from "./OIDCOptions.js";
import { AzureRegionConfiguration } from "./AzureRegionConfiguration.js";
import { CloudInstanceDiscoveryResponse } from "./CloudInstanceDiscoveryResponse.js";
export type AuthorityOptions = {
    protocolMode: ProtocolMode;
    OIDCOptions?: OIDCOptions | null;
    knownAuthorities: Array<string>;
    cloudDiscoveryMetadata: string;
    authorityMetadata: string;
    skipAuthorityMetadataCache?: boolean;
    azureRegionConfiguration?: AzureRegionConfiguration;
    authority?: string;
};
export type StaticAuthorityOptions = Partial<Pick<AuthorityOptions, "knownAuthorities">> & {
    canonicalAuthority?: string;
    cloudDiscoveryMetadata?: CloudInstanceDiscoveryResponse;
};
export declare const AzureCloudInstance: {
    readonly None: "none";
    readonly AzurePublic: "https://login.microsoftonline.com";
    readonly AzurePpe: "https://login.windows-ppe.net";
    readonly AzureChina: "https://login.chinacloudapi.cn";
    readonly AzureGermany: "https://login.microsoftonline.de";
    readonly AzureUsGovernment: "https://login.microsoftonline.us";
};
export type AzureCloudInstance = (typeof AzureCloudInstance)[keyof typeof AzureCloudInstance];
//# sourceMappingURL=AuthorityOptions.d.ts.map