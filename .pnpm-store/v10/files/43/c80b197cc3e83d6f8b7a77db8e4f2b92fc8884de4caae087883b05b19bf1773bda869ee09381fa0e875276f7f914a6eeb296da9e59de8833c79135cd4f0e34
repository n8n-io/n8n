"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inferExportDelegateToUse = exports.createLegacyOtlpBrowserExportDelegate = void 0;
const otlp_browser_http_export_delegate_1 = require("../otlp-browser-http-export-delegate");
const convert_legacy_browser_http_options_1 = require("./convert-legacy-browser-http-options");
/**
 * @deprecated
 * @param config
 * @param serializer
 * @param signalResourcePath
 * @param requiredHeaders
 */
function createLegacyOtlpBrowserExportDelegate(config, serializer, signalResourcePath, requiredHeaders) {
    const createOtlpExportDelegate = inferExportDelegateToUse(config.headers);
    const options = (0, convert_legacy_browser_http_options_1.convertLegacyBrowserHttpOptions)(config, signalResourcePath, requiredHeaders);
    return createOtlpExportDelegate(options, serializer);
}
exports.createLegacyOtlpBrowserExportDelegate = createLegacyOtlpBrowserExportDelegate;
function inferExportDelegateToUse(configHeaders) {
    if (!configHeaders && typeof navigator.sendBeacon === 'function') {
        return otlp_browser_http_export_delegate_1.createOtlpSendBeaconExportDelegate;
    }
    else if (typeof globalThis.fetch !== 'undefined') {
        return otlp_browser_http_export_delegate_1.createOtlpFetchExportDelegate;
    }
    else {
        return otlp_browser_http_export_delegate_1.createOtlpXhrExportDelegate;
    }
}
exports.inferExportDelegateToUse = inferExportDelegateToUse;
//# sourceMappingURL=create-legacy-browser-delegate.js.map