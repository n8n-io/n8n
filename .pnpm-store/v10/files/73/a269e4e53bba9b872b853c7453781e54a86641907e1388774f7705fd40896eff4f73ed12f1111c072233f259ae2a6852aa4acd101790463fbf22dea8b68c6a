/**
 * The functions and constants in this file allow us to interact
 * with the internal representation of an IEEE 64-bit floating point
 * number. We need to work with all 64-bits, thus, care needs to be
 * taken when working with Javascript's bitwise operators (<<, >>, &,
 * |, etc) as they truncate operands to 32-bits. In order to work around
 * this we work with the 64-bits as two 32-bit halves, perform bitwise
 * operations on them independently, and combine the results (if needed).
 */
export declare const SIGNIFICAND_WIDTH = 52;
/**
 * MIN_NORMAL_EXPONENT is the minimum exponent of a normalized
 * floating point: -1022.
 */
export declare const MIN_NORMAL_EXPONENT: number;
/**
 * MAX_NORMAL_EXPONENT is the maximum exponent of a normalized
 * floating point: 1023.
 */
export declare const MAX_NORMAL_EXPONENT = 1023;
/**
 * MIN_VALUE is the smallest normal number
 */
export declare const MIN_VALUE: number;
/**
 * getNormalBase2 extracts the normalized base-2 fractional exponent.
 * This returns k for the equation f x 2**k where f is
 * in the range [1, 2).  Note that this function is not called for
 * subnormal numbers.
 * @param {number} value - the value to determine normalized base-2 fractional
 *    exponent for
 * @returns {number} the normalized base-2 exponent
 */
export declare function getNormalBase2(value: number): number;
/**
 * GetSignificand returns the 52 bit (unsigned) significand as a signed value.
 * @param {number} value - the floating point number to extract the significand from
 * @returns {number} The 52-bit significand
 */
export declare function getSignificand(value: number): number;
//# sourceMappingURL=ieee754.d.ts.map