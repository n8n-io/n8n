import type { Int64 as IInt64 } from "@smithy/types";
export interface Int64 extends IInt64 {
}
/**
 * A lossless representation of a signed, 64-bit integer. Instances of this
 * class may be used in arithmetic expressions as if they were numeric
 * primitives, but the binary representation will be preserved unchanged as the
 * `bytes` property of the object. The bytes should be encoded as big-endian,
 * two's complement integers.
 */
export declare class Int64 {
    readonly bytes: Uint8Array;
    constructor(bytes: Uint8Array);
    static fromNumber(number: number): Int64;
    /**
     * Called implicitly by infix arithmetic operators.
     */
    valueOf(): number;
    toString(): string;
}
