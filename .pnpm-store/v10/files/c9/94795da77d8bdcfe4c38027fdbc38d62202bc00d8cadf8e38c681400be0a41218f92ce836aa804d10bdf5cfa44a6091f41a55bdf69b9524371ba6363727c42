import { createOtlpFetchExportDelegate, createOtlpSendBeaconExportDelegate, createOtlpXhrExportDelegate, } from '../otlp-browser-http-export-delegate';
import { convertLegacyBrowserHttpOptions } from './convert-legacy-browser-http-options';
/**
 * @deprecated
 * @param config
 * @param serializer
 * @param signalResourcePath
 * @param requiredHeaders
 */
export function createLegacyOtlpBrowserExportDelegate(config, serializer, signalResourcePath, requiredHeaders) {
    const createOtlpExportDelegate = inferExportDelegateToUse(config.headers);
    const options = convertLegacyBrowserHttpOptions(config, signalResourcePath, requiredHeaders);
    return createOtlpExportDelegate(options, serializer);
}
export function inferExportDelegateToUse(configHeaders) {
    if (!configHeaders && typeof navigator.sendBeacon === 'function') {
        return createOtlpSendBeaconExportDelegate;
    }
    else if (typeof globalThis.fetch !== 'undefined') {
        return createOtlpFetchExportDelegate;
    }
    else {
        return createOtlpXhrExportDelegate;
    }
}
//# sourceMappingURL=create-legacy-browser-delegate.js.map