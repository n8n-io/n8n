import { createOtlpFetchExportDelegate } from '../otlp-browser-http-export-delegate';
import { convertLegacyBrowserHttpOptions } from './convert-legacy-browser-http-options';
/**
 * @deprecated
 * @param config
 * @param serializer
 * @param signalResourcePath
 * @param requiredHeaders
 */
export function createLegacyOtlpBrowserExportDelegate(config, serializer, signalResourcePath, requiredHeaders) {
    const options = convertLegacyBrowserHttpOptions(config, signalResourcePath, requiredHeaders);
    return createOtlpFetchExportDelegate(options, serializer);
}
//# sourceMappingURL=create-legacy-browser-delegate.js.map