import type { Fixed64, LongBits } from './internal-types';
import { HrTime } from '@opentelemetry/api';
export declare function hrTimeToNanos(hrTime: HrTime): bigint;
export declare function toLongBits(value: bigint): LongBits;
export declare function encodeAsLongBits(hrTime: HrTime): LongBits;
export declare function encodeAsString(hrTime: HrTime): string;
export type HrTimeEncodeFunction = (hrTime: HrTime) => Fixed64;
export type SpanContextEncodeFunction = (spanContext: string) => string | Uint8Array;
export type OptionalSpanContextEncodeFunction = (spanContext: string | undefined) => string | Uint8Array | undefined;
export type Uint8ArrayEncodeFunction = (value: Uint8Array) => string | Uint8Array;
export interface Encoder {
    encodeHrTime: HrTimeEncodeFunction;
    encodeSpanContext: SpanContextEncodeFunction;
    encodeOptionalSpanContext: OptionalSpanContextEncodeFunction;
    encodeUint8Array: Uint8ArrayEncodeFunction;
}
/**
 * Encoder for protobuf format.
 * Uses { high, low } timestamps and binary for span/trace IDs, leaves Uint8Array attributes as-is.
 */
export declare const PROTOBUF_ENCODER: Encoder;
/**
 * Encoder for JSON format.
 * Uses string timestamps, hex for span/trace IDs, and base64 for Uint8Array.
 */
export declare const JSON_ENCODER: Encoder;
//# sourceMappingURL=utils.d.ts.map