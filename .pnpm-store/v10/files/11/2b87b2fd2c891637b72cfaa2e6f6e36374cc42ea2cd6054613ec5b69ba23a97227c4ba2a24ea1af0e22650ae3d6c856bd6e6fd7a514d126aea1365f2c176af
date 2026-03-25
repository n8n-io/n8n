"use strict";
/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOtlpEncoder = exports.encodeAsString = exports.encodeAsLongBits = exports.toLongBits = exports.hrTimeToNanos = void 0;
const core_1 = require("@opentelemetry/core");
const hex_to_binary_1 = require("./hex-to-binary");
function hrTimeToNanos(hrTime) {
    const NANOSECONDS = BigInt(1000000000);
    return BigInt(hrTime[0]) * NANOSECONDS + BigInt(hrTime[1]);
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
const DEFAULT_ENCODER = {
    encodeHrTime: encodeAsLongBits,
    encodeSpanContext: hex_to_binary_1.hexToBinary,
    encodeOptionalSpanContext: optionalHexToBinary,
};
function getOtlpEncoder(options) {
    if (options === undefined) {
        return DEFAULT_ENCODER;
    }
    const useLongBits = options.useLongBits ?? true;
    const useHex = options.useHex ?? false;
    return {
        encodeHrTime: useLongBits ? encodeAsLongBits : encodeTimestamp,
        encodeSpanContext: useHex ? identity : hex_to_binary_1.hexToBinary,
        encodeOptionalSpanContext: useHex ? identity : optionalHexToBinary,
    };
}
exports.getOtlpEncoder = getOtlpEncoder;
//# sourceMappingURL=utils.js.map