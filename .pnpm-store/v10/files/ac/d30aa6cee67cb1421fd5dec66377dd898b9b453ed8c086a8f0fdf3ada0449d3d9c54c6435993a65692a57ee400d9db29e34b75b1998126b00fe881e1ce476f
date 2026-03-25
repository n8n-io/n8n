/**
 * A Decoder handles the decoding of an Uint8Array.
 * @template {ArrayBufferLike} [Buf=ArrayBufferLike]
 */
export class Decoder<Buf extends ArrayBufferLike = ArrayBufferLike> {
    /**
     * @param {Uint8Array<Buf>} uint8Array Binary data to decode
     */
    constructor(uint8Array: Uint8Array<Buf>);
    /**
     * Decoding target.
     *
     * @type {Uint8Array<Buf>}
     */
    arr: Uint8Array<Buf>;
    /**
     * Current decoding position.
     *
     * @type {number}
     */
    pos: number;
}
export function createDecoder<Buf extends ArrayBufferLike>(uint8Array: Uint8Array<Buf>): Decoder<Buf>;
export function hasContent(decoder: Decoder): boolean;
export function clone(decoder: Decoder, newPos?: number): Decoder;
export function readUint8Array<Buf extends ArrayBufferLike>(decoder: Decoder<Buf>, len: number): Uint8Array<Buf>;
export function readVarUint8Array<Buf extends ArrayBufferLike>(decoder: Decoder<Buf>): Uint8Array<Buf>;
export function readTailAsUint8Array(decoder: Decoder): Uint8Array;
export function skip8(decoder: Decoder): number;
export function readUint8(decoder: Decoder): number;
export function readUint16(decoder: Decoder): number;
export function readUint32(decoder: Decoder): number;
export function readUint32BigEndian(decoder: Decoder): number;
export function peekUint8(decoder: Decoder): number;
export function peekUint16(decoder: Decoder): number;
export function peekUint32(decoder: Decoder): number;
export function readVarUint(decoder: Decoder): number;
export function readVarInt(decoder: Decoder): number;
export function peekVarUint(decoder: Decoder): number;
export function peekVarInt(decoder: Decoder): number;
export function _readVarStringPolyfill(decoder: Decoder): string;
export function _readVarStringNative(decoder: Decoder): string;
export function readVarString(decoder: Decoder): string;
export function readTerminatedUint8Array(decoder: Decoder): Uint8Array;
export function readTerminatedString(decoder: Decoder): string;
export function peekVarString(decoder: Decoder): string;
export function readFromDataView(decoder: Decoder, len: number): DataView;
export function readFloat32(decoder: Decoder): number;
export function readFloat64(decoder: Decoder): number;
export function readBigInt64(decoder: Decoder): any;
export function readBigUint64(decoder: Decoder): any;
export function readAny(decoder: Decoder): any;
/**
 * T must not be null.
 *
 * @template T
 */
export class RleDecoder<T> extends Decoder<ArrayBufferLike> {
    /**
     * @param {Uint8Array} uint8Array
     * @param {function(Decoder):T} reader
     */
    constructor(uint8Array: Uint8Array, reader: (arg0: Decoder) => T);
    /**
     * The reader
     */
    reader: (arg0: Decoder) => T;
    /**
     * Current state
     * @type {T|null}
     */
    s: T | null;
    count: number;
    read(): T;
}
export class IntDiffDecoder extends Decoder<ArrayBufferLike> {
    /**
     * @param {Uint8Array} uint8Array
     * @param {number} start
     */
    constructor(uint8Array: Uint8Array, start: number);
    /**
     * Current state
     * @type {number}
     */
    s: number;
    /**
     * @return {number}
     */
    read(): number;
}
export class RleIntDiffDecoder extends Decoder<ArrayBufferLike> {
    /**
     * @param {Uint8Array} uint8Array
     * @param {number} start
     */
    constructor(uint8Array: Uint8Array, start: number);
    /**
     * Current state
     * @type {number}
     */
    s: number;
    count: number;
    /**
     * @return {number}
     */
    read(): number;
}
export class UintOptRleDecoder extends Decoder<ArrayBufferLike> {
    /**
     * @param {Uint8Array} uint8Array
     */
    constructor(uint8Array: Uint8Array);
    /**
     * @type {number}
     */
    s: number;
    count: number;
    read(): number;
}
export class IncUintOptRleDecoder extends Decoder<ArrayBufferLike> {
    /**
     * @param {Uint8Array} uint8Array
     */
    constructor(uint8Array: Uint8Array);
    /**
     * @type {number}
     */
    s: number;
    count: number;
    read(): number;
}
export class IntDiffOptRleDecoder extends Decoder<ArrayBufferLike> {
    /**
     * @param {Uint8Array} uint8Array
     */
    constructor(uint8Array: Uint8Array);
    /**
     * @type {number}
     */
    s: number;
    count: number;
    diff: number;
    /**
     * @return {number}
     */
    read(): number;
}
export class StringDecoder {
    /**
     * @param {Uint8Array} uint8Array
     */
    constructor(uint8Array: Uint8Array);
    decoder: UintOptRleDecoder;
    str: string;
    /**
     * @type {number}
     */
    spos: number;
    /**
     * @return {string}
     */
    read(): string;
}
//# sourceMappingURL=decoding.d.ts.map