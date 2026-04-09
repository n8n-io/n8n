"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertLegacyHttpOptions = void 0;
const api_1 = require("@opentelemetry/api");
const otlp_node_http_configuration_1 = require("./otlp-node-http-configuration");
const index_node_http_1 = require("../index-node-http");
const otlp_node_http_env_configuration_1 = require("./otlp-node-http-env-configuration");
const convert_legacy_http_options_1 = require("./convert-legacy-http-options");
function convertLegacyAgentOptions(config) {
    if (typeof config.httpAgentOptions === 'function') {
        return config.httpAgentOptions;
    }
    let legacy = config.httpAgentOptions;
    if (config.keepAlive != null) {
        legacy = { keepAlive: config.keepAlive, ...legacy };
    }
    if (legacy != null) {
        return (0, index_node_http_1.httpAgentFactoryFromOptions)(legacy);
    }
    else {
        return undefined;
    }
}
/**
 * @deprecated this will be removed in 2.0
 * @param config
 * @param signalIdentifier
 * @param signalResourcePath
 * @param requiredHeaders
 */
function convertLegacyHttpOptions(config, signalIdentifier, signalResourcePath, requiredHeaders) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (config.metadata) {
        api_1.diag.warn('Metadata cannot be set when using http');
    }
    return (0, otlp_node_http_configuration_1.mergeOtlpNodeHttpConfigurationWithDefaults)({
        url: config.url,
        headers: (0, convert_legacy_http_options_1.convertLegacyHeaders)(config),
        concurrencyLimit: config.concurrencyLimit,
        timeoutMillis: config.timeoutMillis,
        compression: config.compression,
        agentFactory: convertLegacyAgentOptions(config),
        userAgent: config.userAgent,
    }, (0, otlp_node_http_env_configuration_1.getNodeHttpConfigurationFromEnvironment)(signalIdentifier, signalResourcePath), (0, otlp_node_http_configuration_1.getNodeHttpConfigurationDefaults)(requiredHeaders, signalResourcePath));
}
exports.convertLegacyHttpOptions = convertLegacyHttpOptions;
//# sourceMappingURL=convert-legacy-node-http-options.js.map