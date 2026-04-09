import { OtlpHttpConfiguration } from './configuration/otlp-http-configuration';
import { ISerializer } from '@opentelemetry/otlp-transformer';
import { IOtlpExportDelegate } from './otlp-export-delegate';
export declare function createOtlpFetchExportDelegate<Internal, Response>(options: OtlpHttpConfiguration, serializer: ISerializer<Internal, Response>): IOtlpExportDelegate<Internal>;
/**
 * @deprecated Use {@link createOtlpFetchExportDelegate} instead. Modern browsers use `fetch` with `keepAlive: true` when `sendBeacon` is used. Use a `fetch` polyfill that mimics this behavior to keep using `sendBeacon`.
 */
export declare function createOtlpSendBeaconExportDelegate<Internal, Response>(options: OtlpHttpConfiguration, serializer: ISerializer<Internal, Response>): IOtlpExportDelegate<Internal>;
//# sourceMappingURL=otlp-browser-http-export-delegate.d.ts.map