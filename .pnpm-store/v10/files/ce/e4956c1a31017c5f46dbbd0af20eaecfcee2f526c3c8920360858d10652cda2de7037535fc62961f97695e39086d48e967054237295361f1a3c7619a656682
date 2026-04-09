"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertLegacyBrowserHttpOptions = void 0;
const otlp_http_configuration_1 = require("./otlp-http-configuration");
const convert_legacy_http_options_1 = require("./convert-legacy-http-options");
/**
 * @deprecated this will be removed in 2.0
 *
 * @param config
 * @param signalResourcePath
 * @param requiredHeaders
 */
function convertLegacyBrowserHttpOptions(config, signalResourcePath, requiredHeaders) {
    return (0, otlp_http_configuration_1.mergeOtlpHttpConfigurationWithDefaults)({
        url: config.url,
        timeoutMillis: config.timeoutMillis,
        headers: (0, convert_legacy_http_options_1.convertLegacyHeaders)(config),
        concurrencyLimit: config.concurrencyLimit,
    }, {}, // no fallback for browser case
    (0, otlp_http_configuration_1.getHttpConfigurationDefaults)(requiredHeaders, signalResourcePath));
}
exports.convertLegacyBrowserHttpOptions = convertLegacyBrowserHttpOptions;
//# sourceMappingURL=convert-legacy-browser-http-options.js.map