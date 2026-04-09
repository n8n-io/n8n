"use strict";
/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.JSON_ENCODER = exports.PROTOBUF_ENCODER = exports.encodeAsString = exports.encodeAsLongBits = exports.toLongBits = exports.hrTimeToNanos = void 0;
const core_1 = require("@opentelemetry/core");
const hex_to_binary_1 = require("./hex-to-binary");
function hrTimeToNanos(hrTime) {
    const NANOSECONDS = BigInt(1000000000);
    return (BigInt(Math.trunc(hrTime[0])) * NANOSECONDS + BigInt(Math.trunc(hrTime[1])));
}
exports.hrTimeToNanos = hrTimeToNanos;
function toLongBits(value) {
    const low = Number(BigInt.asUintN(32, value));
    const high = Number(BigInt.asUintN(32, value >> BigInt(32)));
    return { low, high };
}
exports.toLongBits = toLongBits;
function encodeAsLongBits(hrTime) {
    const nanos = hrTimeToNanos(hrTime);
    return toLongBits(nanos);
}
exports.encodeAsLongBits = encodeAsLongBits;
function encodeAsString(hrTime) {
    const nanos = hrTimeToNanos(hrTime);
    return nanos.toString();
}
exports.encodeAsString = encodeAsString;
const encodeTimestamp = typeof BigInt !== 'undefined' ? encodeAsString : core_1.hrTimeToNanoseconds;
function identity(value) {
    return value;
}
function optionalHexToBinary(str) {
    if (str === undefined)
        return undefined;
    return (0, hex_to_binary_1.hexToBinary)(str);
}
/**
 * Encoder for protobuf format.
 * Uses { high, low } timestamps and binary for span/trace IDs, leaves Uint8Array attributes as-is.
 */
exports.PROTOBUF_ENCODER = {
    encodeHrTime: encodeAsLongBits,
    encodeSpanContext: hex_to_binary_1.hexToBinary,
    encodeOptionalSpanContext: optionalHexToBinary,
    encodeUint8Array: identity,
};
/**
 * Encoder for JSON format.
 * Uses string timestamps, hex for span/trace IDs, and base64 for Uint8Array.
 */
exports.JSON_ENCODER = {
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