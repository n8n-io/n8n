import { createRetryingTransport } from './retrying-transport';
import { createOtlpNetworkExportDelegate } from './otlp-network-export-delegate';
import { createFetchTransport } from './transport/fetch-transport';
export function createOtlpFetchExportDelegate(options, serializer) {
    return createOtlpNetworkExportDelegate(options, serializer, createRetryingTransport({
        transport: createFetchTransport(options),
    }));
}
/**
 * @deprecated Use {@link createOtlpFetchExportDelegate} instead. Modern browsers use `fetch` with `keepAlive: true` when `sendBeacon` is used. Use a `fetch` polyfill that mimics this behavior to keep using `sendBeacon`.
 */
export function createOtlpSendBeaconExportDelegate(options, serializer) {
    return createOtlpFetchExportDelegate(options, serializer);
}
//# sourceMappingURL=otlp-browser-http-export-delegate.js.map