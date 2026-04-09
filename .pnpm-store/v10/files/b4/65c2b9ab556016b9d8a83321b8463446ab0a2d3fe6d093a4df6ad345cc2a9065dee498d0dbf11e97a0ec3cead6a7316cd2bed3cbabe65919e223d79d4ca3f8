/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
import { hrTimeToNanoseconds } from '@opentelemetry/core';
import { hexToBinary } from './hex-to-binary';
export function hrTimeToNanos(hrTime) {
    const NANOSECONDS = BigInt(1000000000);
    return (BigInt(Math.trunc(hrTime[0])) * NANOSECONDS + BigInt(Math.trunc(hrTime[1])));
}
export function toLongBits(value) {
    const low = Number(BigInt.asUintN(32, value));
    const high = Number(BigInt.asUintN(32, value >> BigInt(32)));
    return { low, high };
}
export function encodeAsLongBits(hrTime) {
    const nanos = hrTimeToNanos(hrTime);
    return toLongBits(nanos);
}
export function encodeAsString(hrTime) {
    const nanos = hrTimeToNanos(hrTime);
    return nanos.toString();
}
const encodeTimestamp = typeof BigInt !== 'undefined' ? encodeAsString : hrTimeToNanoseconds;
function identity(value) {
    return value;
}
function optionalHexToBinary(str) {
    if (str === undefined)
        return undefined;
    return hexToBinary(str);
}
/**
 * Encoder for protobuf format.
 * Uses { high, low } timestamps and binary for span/trace IDs, leaves Uint8Array attributes as-is.
 */
export const PROTOBUF_ENCODER = {
    encodeHrTime: encodeAsLongBits,
    encodeSpanContext: hexToBinary,
    encodeOptionalSpanContext: optionalHexToBinary,
    encodeUint8Array: identity,
};
/**
 * Encoder for JSON format.
 * Uses string timestamps, hex for span/trace IDs, and base64 for Uint8Array.
 */
export const JSON_ENCODER = {
    encodeHrTime: encodeTimestamp,
    encodeSpanContext: identity,
    encodeOptionalSpanContext: identity,
    encodeUint8Array: (bytes) => {
        if (typeof Buffer !== 'undefined') {
            return Buffer.from(bytes).toString('base64');
        }
        // implementation note: not using spread operator and passing to
        // btoa to avoid stack overflow on large Uint8Arrays
        const chars = new Array(bytes.length);
        for (let i = 0; i < bytes.length; i++) {
            chars[i] = String.fromCharCode(bytes[i]);
        }
        return btoa(chars.join(''));
    },
};
//# sourceMappingURL=utils.js.map