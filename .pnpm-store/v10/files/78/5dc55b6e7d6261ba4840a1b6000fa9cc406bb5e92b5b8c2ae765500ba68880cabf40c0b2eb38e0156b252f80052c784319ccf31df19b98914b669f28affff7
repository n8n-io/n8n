import { getHttpConfigurationDefaults, mergeOtlpHttpConfigurationWithDefaults, } from './otlp-http-configuration';
import { convertLegacyHeaders } from './convert-legacy-http-options';
/**
 * @deprecated this will be removed in 2.0
 *
 * @param config
 * @param signalResourcePath
 * @param requiredHeaders
 */
export function convertLegacyBrowserHttpOptions(config, signalResourcePath, requiredHeaders) {
    return mergeOtlpHttpConfigurationWithDefaults({
        url: config.url,
        timeoutMillis: config.timeoutMillis,
        headers: convertLegacyHeaders(config),
        concurrencyLimit: config.concurrencyLimit,
    }, {}, // no fallback for browser case
    getHttpConfigurationDefaults(requiredHeaders, signalResourcePath));
}
//# sourceMappingURL=convert-legacy-browser-http-options.js.map