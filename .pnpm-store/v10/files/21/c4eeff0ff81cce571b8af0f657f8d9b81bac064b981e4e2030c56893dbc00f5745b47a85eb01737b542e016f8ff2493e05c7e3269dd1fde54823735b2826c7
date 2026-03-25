/**
 * A BinaryEncoder handles the encoding to an Uint8Array.
 */
export class Encoder {
    cpos: number;
    cbuf: Uint8Array<ArrayBuffer>;
    /**
     * @type {Array<Uint8Array>}
     */
    bufs: Array<Uint8Array>;
}
export function createEncoder(): Encoder;
export function encode(f: (arg0: Encoder) => void): Uint8Array<ArrayBuffer>;
export function length(encoder: Encoder): number;
export function hasContent(encoder: Encoder): boolean;
export function toUint8Array(encoder: Encoder): Uint8Array<ArrayBuffer>;
export function verifyLen(encoder: Encoder, len: number): void;
export function write(encoder: Encoder, num: number): void;
export function set(encoder: Encoder, pos: number, num: number): void;
export function writeUint8(encoder: Encoder, num: number): void;
export function setUint8(encoder: Encoder, pos: number, num: number): void;
export function writeUint16(encoder: Encoder, num: number): void;
export function setUint16(encoder: Encoder, pos: number, num: number): void;
export function writeUint32(encoder: Encoder, num: number): void;
export function writeUint32BigEndian(encoder: Encoder, num: number): void;
export function setUint32(encoder: Encoder, pos: number, num: number): void;
export function writeVarUint(encoder: Encoder, num: number): void;
export function writeVarInt(encoder: Encoder, num: number): void;
export function _writeVarStringNative(encoder: Encoder, str: string): void;
export function _writeVarStringPolyfill(encoder: Encoder, str: string): void;
export function writeVarString(encoder: Encoder, str: string): void;
export function writeTerminatedString(encoder: Encoder, str: string): void;
export function writeTerminatedUint8Array(encoder: Encoder, buf: Uint8Array): void;
export function writeBinaryEncoder(encoder: Encoder, append: Encoder): void;
export function writeUint8Array(encoder: Encoder, uint8Array: Uint8Array): void;
export function writeVarUint8Array(encoder: Encoder, uint8Array: Uint8Array): void;
export function writeOnDataView(encoder: Encoder, len: number): DataView;
export function writeFloat32(encoder: Encoder, num: number): void;
export function writeFloat64(encoder: Encoder, num: number): void;
export function writeBigInt64(encoder: Encoder, num: bigint): any;
export function writeBigUint64(encoder: Encoder, num: bigint): any;
export function writeAny(encoder: Encoder, data: AnyEncodable): void;
/**
 * Now come a few stateful encoder that have their own classes.
 */
/**
 * Basic Run Length Encoder - a basic compression implementation.
 *
 * Encodes [1,1,1,7] to [1,3,7,1] (3 times 1, 1 time 7). This encoder might do more harm than good if there are a lot of values that are not repeated.
 *
 * It was originally used for image compression. Cool .. article http://csbruce.com/cbm/transactor/pdfs/trans_v7_i06.pdf
 *
 * @note T must not be null!
 *
 * @template T
 */
export class RleEncoder<T> extends Encoder {
    /**
     * @param {function(Encoder, T):void} writer
     */
    constructor(writer: (arg0: Encoder, arg1: T) => void);
    /**
     * The writer
     */
    w: (arg0: Encoder, arg1: T) => void;
    /**
     * Current state
     * @type {T|null}
     */
    s: T | null;
    count: number;
    /**
     * @param {T} v
     */
    write(v: T): void;
}
/**
 * Basic diff decoder using variable length encoding.
 *
 * Encodes the values [3, 1100, 1101, 1050, 0] to [3, 1097, 1, -51, -1050] using writeVarInt.
 */
export class IntDiffEncoder extends Encoder {
    /**
     * @param {number} start
     */
    constructor(start: number);
    /**
     * Current state
     * @type {number}
     */
    s: number;
    /**
     * @param {number} v
     */
    write(v: number): void;
}
/**
 * A combination of IntDiffEncoder and RleEncoder.
 *
 * Basically first writes the IntDiffEncoder and then counts duplicate diffs using RleEncoding.
 *
 * Encodes the values [1,1,1,2,3,4,5,6] as [1,1,0,2,1,5] (RLE([1,0,0,1,1,1,1,1]) ⇒ RleIntDiff[1,1,0,2,1,5])
 */
export class RleIntDiffEncoder extends Encoder {
    /**
     * @param {number} start
     */
    constructor(start: number);
    /**
     * Current state
     * @type {number}
     */
    s: number;
    count: number;
    /**
     * @param {number} v
     */
    write(v: number): void;
}
/**
 * Optimized Rle encoder that does not suffer from the mentioned problem of the basic Rle encoder.
 *
 * Internally uses VarInt encoder to write unsigned integers. If the input occurs multiple times, we write
 * write it as a negative number. The UintOptRleDecoder then understands that it needs to read a count.
 *
 * Encodes [1,2,3,3,3] as [1,2,-3,3] (once 1, once 2, three times 3)
 */
export class UintOptRleEncoder {
    encoder: Encoder;
    /**
     * @type {number}
     */
    s: number;
    count: number;
    /**
     * @param {number} v
     */
    write(v: number): void;
    /**
     * Flush the encoded state and transform this to a Uint8Array.
     *
     * Note that this should only be called once.
     */
    toUint8Array(): Uint8Array<ArrayBuffer>;
}
/**
 * Increasing Uint Optimized RLE Encoder
 *
 * The RLE encoder counts the number of same occurences of the same value.
 * The IncUintOptRle encoder counts if the value increases.
 * I.e. 7, 8, 9, 10 will be encoded as [-7, 4]. 1, 3, 5 will be encoded
 * as [1, 3, 5].
 */
export class IncUintOptRleEncoder {
    encoder: Encoder;
    /**
     * @type {number}
     */
    s: number;
    count: number;
    /**
     * @param {number} v
     */
    write(v: number): void;
    /**
     * Flush the encoded state and transform this to a Uint8Array.
     *
     * Note that this should only be called once.
     */
    toUint8Array(): Uint8Array<ArrayBuffer>;
}
/**
 * A combination of the IntDiffEncoder and the UintOptRleEncoder.
 *
 * The count approach is similar to the UintDiffOptRleEncoder, but instead of using the negative bitflag, it encodes
 * in the LSB whether a count is to be read. Therefore this Encoder only supports 31 bit integers!
 *
 * Encodes [1, 2, 3, 2] as [3, 1, 6, -1] (more specifically [(1 << 1) | 1, (3 << 0) | 0, -1])
 *
 * Internally uses variable length encoding. Contrary to normal UintVar encoding, the first byte contains:
 * * 1 bit that denotes whether the next value is a count (LSB)
 * * 1 bit that denotes whether this value is negative (MSB - 1)
 * * 1 bit that denotes whether to continue reading the variable length integer (MSB)
 *
 * Therefore, only five bits remain to encode diff ranges.
 *
 * Use this Encoder only when appropriate. In most cases, this is probably a bad idea.
 */
export class IntDiffOptRleEncoder {
    encoder: Encoder;
    /**
     * @type {number}
     */
    s: number;
    count: number;
    diff: number;
    /**
     * @param {number} v
     */
    write(v: number): void;
    /**
     * Flush the encoded state and transform this to a Uint8Array.
     *
     * Note that this should only be called once.
     */
    toUint8Array(): Uint8Array<ArrayBuffer>;
}
/**
 * Optimized String Encoder.
 *
 * Encoding many small strings in a simple Encoder is not very efficient. The function call to decode a string takes some time and creates references that must be eventually deleted.
 * In practice, when decoding several million small strings, the GC will kick in more and more often to collect orphaned string objects (or maybe there is another reason?).
 *
 * This string encoder solves the above problem. All strings are concatenated and written as a single string using a single encoding call.
 *
 * The lengths are encoded using a UintOptRleEncoder.
 */
export class StringEncoder {
    /**
     * @type {Array<string>}
     */
    sarr: Array<string>;
    s: string;
    lensE: UintOptRleEncoder;
    /**
     * @param {string} string
     */
    write(string: string): void;
    toUint8Array(): Uint8Array<ArrayBuffer>;
}
export type AnyEncodableArray = Array<AnyEncodable>;
export type AnyEncodable = undefined | null | number | bigint | boolean | string | {
    [k: string]: AnyEncodable;
} | AnyEncodableArray | Uint8Array;
//# sourceMappingURL=encoding.d.ts.map