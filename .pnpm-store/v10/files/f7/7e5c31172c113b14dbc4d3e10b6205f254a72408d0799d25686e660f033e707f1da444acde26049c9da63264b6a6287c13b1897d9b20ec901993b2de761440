"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PowerPlatformApiDiscovery = exports.ClusterCategory = void 0;
/**
 * Cluster categories for Power Platform API discovery.
 * String enum provides both compile-time type safety and runtime validation.
 */
var ClusterCategory;
(function (ClusterCategory) {
    ClusterCategory["local"] = "local";
    ClusterCategory["dev"] = "dev";
    ClusterCategory["test"] = "test";
    ClusterCategory["preprod"] = "preprod";
    ClusterCategory["firstrelease"] = "firstrelease";
    ClusterCategory["prod"] = "prod";
    ClusterCategory["gov"] = "gov";
    ClusterCategory["high"] = "high";
    ClusterCategory["dod"] = "dod";
    ClusterCategory["mooncake"] = "mooncake";
    ClusterCategory["ex"] = "ex";
    ClusterCategory["rx"] = "rx";
})(ClusterCategory || (exports.ClusterCategory = ClusterCategory = {}));
class PowerPlatformApiDiscovery {
    constructor(clusterCategory) {
        this.clusterCategory = clusterCategory;
    }
    getTokenAudience() {
        return `https://${this._getEnvironmentApiHostNameSuffix()}`;
    }
    getTokenEndpointHost() {
        return this._getEnvironmentApiHostNameSuffix();
    }
    getTenantEndpoint(tenantId) {
        return this._generatePowerPlatformApiDomain(tenantId);
    }
    getTenantIslandClusterEndpoint(tenantId) {
        return this._generatePowerPlatformApiDomain(tenantId, 'il-');
    }
    _generatePowerPlatformApiDomain(hostNameIdentifier, hostNamePrefix = '') {
        if (!/^[a-zA-Z0-9-]+$/.test(hostNameIdentifier)) {
            throw new Error(`Cannot generate Power Platform API endpoint because the tenant identifier contains invalid host name characters, only alphanumeric and dash characters are expected: ${hostNameIdentifier}`);
        }
        const hostNameInfix = 'tenant';
        const hexNameSuffixLength = this._getHexApiSuffixLength();
        const hexName = hostNameIdentifier.toLowerCase().replace(/-/g, '');
        if (hexNameSuffixLength >= hexName.length) {
            throw new Error(`Cannot generate Power Platform API endpoint because the normalized tenant identifier must be at least ${hexNameSuffixLength + 1} characters in length: ${hexName}`);
        }
        const hexNameSuffix = hexName.substring(hexName.length - hexNameSuffixLength);
        const hexNamePrefix = hexName.substring(0, hexName.length - hexNameSuffixLength);
        const hostNameSuffix = this._getEnvironmentApiHostNameSuffix();
        return `${hostNamePrefix}${hexNamePrefix}.${hexNameSuffix}.${hostNameInfix}.${hostNameSuffix}`;
    }
    _getHexApiSuffixLength() {
        switch (this.clusterCategory) {
            case ClusterCategory.firstrelease:
            case ClusterCategory.prod:
                return 2;
            default:
                return 1;
        }
    }
    _getEnvironmentApiHostNameSuffix() {
        const apiHostNameSuffixMap = {
            local: 'api.powerplatform.localhost',
            dev: 'api.powerplatform.com', //default to prod
            test: 'api.powerplatform.com', //default to prod
            preprod: 'api.powerplatform.com', //default to prod
            firstrelease: 'api.powerplatform.com',
            prod: 'api.powerplatform.com',
            gov: 'api.gov.powerplatform.microsoft.us',
            high: 'api.high.powerplatform.microsoft.us',
            dod: 'api.appsplatform.us',
            mooncake: 'api.powerplatform.partner.microsoftonline.cn',
            ex: 'api.powerplatform.eaglex.ic.gov',
            rx: 'api.powerplatform.microsoft.scloud',
        };
        const suffix = apiHostNameSuffixMap[this.clusterCategory];
        if (!suffix) {
            throw new Error(`Invalid ClusterCategory value: ${this.clusterCategory}`);
        }
        return suffix;
    }
}
exports.PowerPlatformApiDiscovery = PowerPlatformApiDiscovery;
//# sourceMappingURL=power-platform-api-discovery.js.map