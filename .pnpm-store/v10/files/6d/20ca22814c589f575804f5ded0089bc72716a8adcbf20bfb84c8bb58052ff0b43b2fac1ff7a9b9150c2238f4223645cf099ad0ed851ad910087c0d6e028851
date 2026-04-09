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
import { hexToBinary, hrTimeToNanoseconds } from '@opentelemetry/core';
export function hrTimeToNanos(hrTime) {
    const NANOSECONDS = BigInt(1000000000);
    return BigInt(hrTime[0]) * NANOSECONDS + BigInt(hrTime[1]);
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
const DEFAULT_ENCODER = {
    encodeHrTime: encodeAsLongBits,
    encodeSpanContext: hexToBinary,
    encodeOptionalSpanContext: optionalHexToBinary,
};
export function getOtlpEncoder(options) {
    var _a, _b;
    if (options === undefined) {
        return DEFAULT_ENCODER;
    }
    const useLongBits = (_a = options.useLongBits) !== null && _a !== void 0 ? _a : true;
    const useHex = (_b = options.useHex) !== null && _b !== void 0 ? _b : false;
    return {
        encodeHrTime: useLongBits ? encodeAsLongBits : encodeTimestamp,
        encodeSpanContext: useHex ? identity : hexToBinary,
        encodeOptionalSpanContext: useHex ? identity : optionalHexToBinary,
    };
}
//# sourceMappingURL=index.js.map