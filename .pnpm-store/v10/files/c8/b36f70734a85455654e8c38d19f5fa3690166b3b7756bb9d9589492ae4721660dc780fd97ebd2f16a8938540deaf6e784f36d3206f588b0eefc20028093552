/**
 * Test whether a string contains an integer number
 */
export declare function isInteger(value: string): boolean;
/**
 * Test whether a string contains a number
 * http://stackoverflow.com/questions/13340717/json-numbers-regular-expression
 */
export declare function isNumber(value: string): boolean;
/**
 * Test whether a string can be safely represented with a number
 * without information loss.
 *
 * When approx is true, floating point numbers that lose a few digits but
 * are still approximately equal in value are considered safe too.
 * Integer numbers must still be exactly equal.
 */
export declare function isSafeNumber(value: string, config?: {
    approx: boolean;
}): boolean;
export declare enum UnsafeNumberReason {
    underflow = "underflow",
    overflow = "overflow",
    truncate_integer = "truncate_integer",
    truncate_float = "truncate_float"
}
/**
 * When the provided value is an unsafe number, describe what the reason is:
 * overflow, underflow, truncate_integer, or truncate_float.
 * Returns undefined when the value is safe.
 */
export declare function getUnsafeNumberReason(value: string): UnsafeNumberReason | undefined;
/**
 * Convert a string into a number when it is safe to do so.
 * Throws an error otherwise, explaining the reason.
 */
export declare function toSafeNumberOrThrow(value: string, config?: {
    approx: boolean;
}): number;
/**
 * Get the significant digits of a number.
 *
 * For example:
 *   '2.34' returns '234'
 *   '-77' returns '77'
 *   '0.003400' returns '34'
 *   '120.5e+30' returns '1205'
 **/
export declare function extractSignificantDigits(value: string): string;
//# sourceMappingURL=utils.d.ts.map