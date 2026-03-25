"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.warning = void 0;
exports.stsRegionDefaultResolver = stsRegionDefaultResolver;
const config_resolver_1 = require("@smithy/config-resolver");
const node_config_provider_1 = require("@smithy/node-config-provider");
function stsRegionDefaultResolver(loaderConfig = {}) {
    return (0, node_config_provider_1.loadConfig)({
        ...config_resolver_1.NODE_REGION_CONFIG_OPTIONS,
        async default() {
            if (!exports.warning.silence) {
                console.warn("@aws-sdk - WARN - default STS region of us-east-1 used. See @aws-sdk/credential-providers README and set a region explicitly.");
            }
            return "us-east-1";
        },
    }, { ...config_resolver_1.NODE_REGION_CONFIG_FILE_OPTIONS, ...loaderConfig });
}
exports.warning = {
    silence: false,
};
