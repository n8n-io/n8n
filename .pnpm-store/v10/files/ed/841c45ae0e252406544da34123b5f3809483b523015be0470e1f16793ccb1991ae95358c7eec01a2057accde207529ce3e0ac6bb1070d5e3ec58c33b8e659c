/**
 * A lossless number. Stores its numeric value as string
 */
export declare class LosslessNumber {
    value: string;
    isLosslessNumber: boolean;
    constructor(value: string);
    /**
     * Get the value of the LosslessNumber as number or bigint.
     *
     * - a number is returned for safe numbers and decimal values that only lose some insignificant digits
     * - a bigint is returned for big integer numbers
     * - an Error is thrown for values that will overflow or underflow
     *
     * Note that you can implement your own strategy for conversion by just getting the value as string
     * via .toString(), and using util functions like isInteger, isSafeNumber, getUnsafeNumberReason,
     * and toSafeNumberOrThrow to convert it to a numeric value.
     */
    valueOf(): number | bigint;
    /**
     * Get the value of the LosslessNumber as string.
     */
    toString(): string;
}
/**
 * Test whether a value is a LosslessNumber
 */
export declare function isLosslessNumber(value: unknown): value is LosslessNumber;
/**
 * Convert a number into a LosslessNumber if this is possible in a safe way
 * If the value has too many digits, or is NaN or Infinity, an error will be thrown
 */
export declare function toLosslessNumber(value: number): LosslessNumber;
//# sourceMappingURL=LosslessNumber.d.ts.map