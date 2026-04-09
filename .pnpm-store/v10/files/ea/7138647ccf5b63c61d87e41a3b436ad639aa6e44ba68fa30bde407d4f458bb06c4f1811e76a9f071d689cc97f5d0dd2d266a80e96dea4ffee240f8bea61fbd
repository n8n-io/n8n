"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLegacyOtlpBrowserExportDelegate = void 0;
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
    const options = (0, convert_legacy_browser_http_options_1.convertLegacyBrowserHttpOptions)(config, signalResourcePath, requiredHeaders);
    return (0, otlp_browser_http_export_delegate_1.createOtlpFetchExportDelegate)(options, serializer);
}
exports.createLegacyOtlpBrowserExportDelegate = createLegacyOtlpBrowserExportDelegate;
//# sourceMappingURL=create-legacy-browser-delegate.js.map