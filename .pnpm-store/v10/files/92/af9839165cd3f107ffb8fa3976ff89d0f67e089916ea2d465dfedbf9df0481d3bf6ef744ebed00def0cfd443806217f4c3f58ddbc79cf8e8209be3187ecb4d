/**
 * Types which may be represented by {@link NumericValue}.
 *
 * There is currently only one option, because BigInteger and Long should
 * use JS BigInt directly, and all other numeric types can be contained in JS Number.
 *
 * @public
 */
export type NumericType = "bigDecimal";
/**
 * Serialization container for Smithy simple types that do not have a
 * direct JavaScript runtime representation.
 *
 * This container does not perform numeric mathematical operations.
 * It is a container for discerning a value's true type.
 *
 * It allows storage of numeric types not representable in JS without
 * making a decision on what numeric library to use.
 *
 * @public
 */
export declare class NumericValue {
    readonly string: string;
    readonly type: NumericType;
    constructor(string: string, type: NumericType);
    toString(): string;
    static [Symbol.hasInstance](object: unknown): boolean;
}
/**
 * Serde shortcut.
 * @internal
 */
export declare function nv(input: string | unknown): NumericValue;
