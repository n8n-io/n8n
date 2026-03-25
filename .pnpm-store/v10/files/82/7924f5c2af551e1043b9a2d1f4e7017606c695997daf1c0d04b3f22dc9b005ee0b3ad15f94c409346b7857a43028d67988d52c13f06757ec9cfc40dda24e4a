import type { OtlpEncodingOptions, Fixed64, LongBits } from './internal-types';
import { HrTime } from '@opentelemetry/api';
export declare function hrTimeToNanos(hrTime: HrTime): bigint;
export declare function toLongBits(value: bigint): LongBits;
export declare function encodeAsLongBits(hrTime: HrTime): LongBits;
export declare function encodeAsString(hrTime: HrTime): string;
export type HrTimeEncodeFunction = (hrTime: HrTime) => Fixed64;
export type SpanContextEncodeFunction = (spanContext: string) => string | Uint8Array;
export type OptionalSpanContextEncodeFunction = (spanContext: string | undefined) => string | Uint8Array | undefined;
export interface Encoder {
    encodeHrTime: HrTimeEncodeFunction;
    encodeSpanContext: SpanContextEncodeFunction;
    encodeOptionalSpanContext: OptionalSpanContextEncodeFunction;
}
export declare function getOtlpEncoder(options?: OtlpEncodingOptions): Encoder;
//# sourceMappingURL=utils.d.ts.map