import { diag } from '@opentelemetry/api';
import { wrapStaticHeadersInFunction } from './shared-configuration';
import { getNodeHttpConfigurationDefaults, mergeOtlpNodeHttpConfigurationWithDefaults, } from './otlp-node-http-configuration';
import { httpAgentFactoryFromOptions } from '../index-node-http';
import { getNodeHttpConfigurationFromEnvironment } from './otlp-node-http-env-configuration';
function convertLegacyAgentOptions(config) {
    if (typeof config.httpAgentOptions === 'function') {
        return config.httpAgentOptions;
    }
    let legacy = config.httpAgentOptions;
    if (config.keepAlive != null) {
        legacy = { keepAlive: config.keepAlive, ...legacy };
    }
    if (legacy != null) {
        return httpAgentFactoryFromOptions(legacy);
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
export function convertLegacyHttpOptions(config, signalIdentifier, signalResourcePath, requiredHeaders) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (config.metadata) {
        diag.warn('Metadata cannot be set when using http');
    }
    return mergeOtlpNodeHttpConfigurationWithDefaults({
        url: config.url,
        headers: wrapStaticHeadersInFunction(config.headers),
        concurrencyLimit: config.concurrencyLimit,
        timeoutMillis: config.timeoutMillis,
        compression: config.compression,
        agentFactory: convertLegacyAgentOptions(config),
    }, getNodeHttpConfigurationFromEnvironment(signalIdentifier, signalResourcePath), getNodeHttpConfigurationDefaults(requiredHeaders, signalResourcePath));
}
//# sourceMappingURL=convert-legacy-node-http-options.js.map