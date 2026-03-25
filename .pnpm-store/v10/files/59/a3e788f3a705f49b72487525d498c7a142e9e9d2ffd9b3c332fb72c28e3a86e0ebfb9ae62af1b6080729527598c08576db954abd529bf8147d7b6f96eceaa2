/**
 * Cluster categories for Power Platform API discovery.
 * String enum provides both compile-time type safety and runtime validation.
 */
export declare enum ClusterCategory {
    local = "local",
    dev = "dev",
    test = "test",
    preprod = "preprod",
    firstrelease = "firstrelease",
    prod = "prod",
    gov = "gov",
    high = "high",
    dod = "dod",
    mooncake = "mooncake",
    ex = "ex",
    rx = "rx"
}
export declare class PowerPlatformApiDiscovery {
    readonly clusterCategory: ClusterCategory;
    constructor(clusterCategory: ClusterCategory);
    getTokenAudience(): string;
    getTokenEndpointHost(): string;
    getTenantEndpoint(tenantId: string): string;
    getTenantIslandClusterEndpoint(tenantId: string): string;
    private _generatePowerPlatformApiDomain;
    private _getHexApiSuffixLength;
    private _getEnvironmentApiHostNameSuffix;
}
//# sourceMappingURL=power-platform-api-discovery.d.ts.map