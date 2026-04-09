import type { OtlpEncodingOptions, Fixed64, LongBits } from './types';
import { HrTime } from '@opentelemetry/api';
export declare function hrTimeToNanos(hrTime: HrTime): bigint;
export declare function toLongBits(value: bigint): LongBits;
export declare function encodeAsLongBits(hrTime: HrTime): LongBits;
export declare function encodeAsString(hrTime: HrTime): string;
export declare type HrTimeEncodeFunction = (hrTime: HrTime) => Fixed64;
export declare type SpanContextEncodeFunction = (spanContext: string) => string | Uint8Array;
export declare type OptionalSpanContextEncodeFunction = (spanContext: string | undefined) => string | Uint8Array | undefined;
export interface Encoder {
    encodeHrTime: HrTimeEncodeFunction;
    encodeSpanContext: SpanContextEncodeFunction;
    encodeOptionalSpanContext: OptionalSpanContextEncodeFunction;
}
export declare function getOtlpEncoder(options?: OtlpEncodingOptions): Encoder;
//# sourceMappingURL=index.d.ts.map