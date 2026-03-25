"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fromTemporaryCredentials = void 0;
const config_resolver_1 = require("@smithy/config-resolver");
const node_config_provider_1 = require("@smithy/node-config-provider");
const fromNodeProviderChain_1 = require("./fromNodeProviderChain");
const fromTemporaryCredentials_base_1 = require("./fromTemporaryCredentials.base");
const fromTemporaryCredentials = (options) => {
    return (0, fromTemporaryCredentials_base_1.fromTemporaryCredentials)(options, fromNodeProviderChain_1.fromNodeProviderChain, async ({ profile = process.env.AWS_PROFILE }) => (0, node_config_provider_1.loadConfig)({
        environmentVariableSelector: (env) => env.AWS_REGION,
        configFileSelector: (profileData) => {
            return profileData.region;
        },
        default: () => undefined,
    }, { ...config_resolver_1.NODE_REGION_CONFIG_FILE_OPTIONS, profile })());
};
exports.fromTemporaryCredentials = fromTemporaryCredentials;
