"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertLegacyHttpOptions = void 0;
const otlp_http_configuration_1 = require("./otlp-http-configuration");
const otlp_http_env_configuration_1 = require("./otlp-http-env-configuration");
const api_1 = require("@opentelemetry/api");
const shared_configuration_1 = require("./shared-configuration");
function convertLegacyAgentOptions(config) {
    if (typeof config.httpAgentOptions === 'function') {
        return config.httpAgentOptions;
    }
    let legacy = config.httpAgentOptions;
    if (config.keepAlive != null) {
        legacy = { keepAlive: config.keepAlive, ...legacy };
    }
    if (legacy != null) {
        return (0, otlp_http_configuration_1.httpAgentFactoryFromOptions)(legacy);
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
    return (0, otlp_http_configuration_1.mergeOtlpHttpConfigurationWithDefaults)({
        url: config.url,
        headers: (0, shared_configuration_1.wrapStaticHeadersInFunction)(config.headers),
        concurrencyLimit: config.concurrencyLimit,
        timeoutMillis: config.timeoutMillis,
        compression: config.compression,
        agentFactory: convertLegacyAgentOptions(config),
    }, (0, otlp_http_env_configuration_1.getHttpConfigurationFromEnvironment)(signalIdentifier, signalResourcePath), (0, otlp_http_configuration_1.getHttpConfigurationDefaults)(requiredHeaders, signalResourcePath));
}
exports.convertLegacyHttpOptions = convertLegacyHttpOptions;
//# sourceMappingURL=convert-legacy-node-http-options.js.map