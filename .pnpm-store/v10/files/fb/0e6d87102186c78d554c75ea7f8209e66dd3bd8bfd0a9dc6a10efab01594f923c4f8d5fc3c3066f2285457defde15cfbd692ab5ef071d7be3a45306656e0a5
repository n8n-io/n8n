import { createRetryingTransport } from './retrying-transport';
import { createXhrTransport } from './transport/xhr-transport';
import { createSendBeaconTransport } from './transport/send-beacon-transport';
import { createOtlpNetworkExportDelegate } from './otlp-network-export-delegate';
import { createFetchTransport } from './transport/fetch-transport';
/**
 * @deprecated use {@link createOtlpFetchExportDelegate}
 */
export function createOtlpXhrExportDelegate(options, serializer) {
    return createOtlpNetworkExportDelegate(options, serializer, createRetryingTransport({
        transport: createXhrTransport(options),
    }));
}
export function createOtlpFetchExportDelegate(options, serializer) {
    return createOtlpNetworkExportDelegate(options, serializer, createRetryingTransport({
        transport: createFetchTransport(options),
    }));
}
export function createOtlpSendBeaconExportDelegate(options, serializer) {
    return createOtlpNetworkExportDelegate(options, serializer, createRetryingTransport({
        transport: createSendBeaconTransport({
            url: options.url,
            blobType: options.headers()['Content-Type'],
        }),
    }));
}
//# sourceMappingURL=otlp-browser-http-export-delegate.js.map