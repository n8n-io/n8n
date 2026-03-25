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
exports.getSignificand = exports.getNormalBase2 = exports.MIN_VALUE = exports.MAX_NORMAL_EXPONENT = exports.MIN_NORMAL_EXPONENT = exports.SIGNIFICAND_WIDTH = void 0;
/**
 * The functions and constants in this file allow us to interact
 * with the internal representation of an IEEE 64-bit floating point
 * number. We need to work with all 64-bits, thus, care needs to be
 * taken when working with Javascript's bitwise operators (<<, >>, &,
 * |, etc) as they truncate operands to 32-bits. In order to work around
 * this we work with the 64-bits as two 32-bit halves, perform bitwise
 * operations on them independently, and combine the results (if needed).
 */
exports.SIGNIFICAND_WIDTH = 52;
/**
 * EXPONENT_MASK is set to 1 for the hi 32-bits of an IEEE 754
 * floating point exponent: 0x7ff00000.
 */
const EXPONENT_MASK = 0x7ff00000;
/**
 * SIGNIFICAND_MASK is the mask for the significand portion of the hi 32-bits
 * of an IEEE 754 double-precision floating-point value: 0xfffff
 */
const SIGNIFICAND_MASK = 0xfffff;
/**
 * EXPONENT_BIAS is the exponent bias specified for encoding
 * the IEEE 754 double-precision floating point exponent: 1023
 */
const EXPONENT_BIAS = 1023;
/**
 * MIN_NORMAL_EXPONENT is the minimum exponent of a normalized
 * floating point: -1022.
 */
exports.MIN_NORMAL_EXPONENT = -EXPONENT_BIAS + 1;
/**
 * MAX_NORMAL_EXPONENT is the maximum exponent of a normalized
 * floating point: 1023.
 */
exports.MAX_NORMAL_EXPONENT = EXPONENT_BIAS;
/**
 * MIN_VALUE is the smallest normal number
 */
exports.MIN_VALUE = Math.pow(2, -1022);
/**
 * getNormalBase2 extracts the normalized base-2 fractional exponent.
 * This returns k for the equation f x 2**k where f is
 * in the range [1, 2).  Note that this function is not called for
 * subnormal numbers.
 * @param {number} value - the value to determine normalized base-2 fractional
 *    exponent for
 * @returns {number} the normalized base-2 exponent
 */
function getNormalBase2(value) {
    const dv = new DataView(new ArrayBuffer(8));
    dv.setFloat64(0, value);
    // access the raw 64-bit float as 32-bit uints
    const hiBits = dv.getUint32(0);
    const expBits = (hiBits & EXPONENT_MASK) >> 20;
    return expBits - EXPONENT_BIAS;
}
exports.getNormalBase2 = getNormalBase2;
/**
 * GetSignificand returns the 52 bit (unsigned) significand as a signed value.
 * @param {number} value - the floating point number to extract the significand from
 * @returns {number} The 52-bit significand
 */
function getSignificand(value) {
    const dv = new DataView(new ArrayBuffer(8));
    dv.setFloat64(0, value);
    // access the raw 64-bit float as two 32-bit uints
    const hiBits = dv.getUint32(0);
    const loBits = dv.getUint32(4);
    // extract the significand bits from the hi bits and left shift 32 places note:
    // we can't use the native << operator as it will truncate the result to 32-bits
    const significandHiBits = (hiBits & SIGNIFICAND_MASK) * Math.pow(2, 32);
    // combine the hi and lo bits and return
    return significandHiBits + loBits;
}
exports.getSignificand = getSignificand;
//# sourceMappingURL=ieee754.js.map