/**
 * Utilities for hex, bytes, CSPRNG.
 * @module
 */
/*! noble-ciphers - MIT License (c) 2023 Paul Miller (paulmillr.com) */
/** Checks if something is Uint8Array. Be careful: nodejs Buffer will return true. */
export declare function isBytes(a: unknown): a is Uint8Array;
/** Asserts something is boolean. */
export declare function abool(b: boolean): void;
/** Asserts something is positive integer. */
export declare function anumber(n: number): void;
/** Asserts something is Uint8Array. */
export declare function abytes(b: Uint8Array | undefined, ...lengths: number[]): void;
/**
 * Asserts something is hash
 * TODO: remove
 * @deprecated
 */
export declare function ahash(h: IHash): void;
/** Asserts a hash instance has not been destroyed / finished */
export declare function aexists(instance: any, checkFinished?: boolean): void;
/** Asserts output is properly-sized byte array */
export declare function aoutput(out: any, instance: any): void;
export type IHash = {
    (data: string | Uint8Array): Uint8Array;
    blockLen: number;
    outputLen: number;
    create: any;
};
/** Generic type encompassing 8/16/32-byte arrays - but not 64-byte. */
export type TypedArray = Int8Array | Uint8ClampedArray | Uint8Array | Uint16Array | Int16Array | Uint32Array | Int32Array;
/** Cast u8 / u16 / u32 to u8. */
export declare function u8(arr: TypedArray): Uint8Array;
/** Cast u8 / u16 / u32 to u32. */
export declare function u32(arr: TypedArray): Uint32Array;
/** Zeroize a byte array. Warning: JS provides no guarantees. */
export declare function clean(...arrays: TypedArray[]): void;
/** Create DataView of an array for easy byte-level manipulation. */
export declare function createView(arr: TypedArray): DataView;
/** Is current platform little-endian? Most are. Big-Endian platform: IBM */
export declare const isLE: boolean;
/**
 * Convert byte array to hex string. Uses built-in function, when available.
 * @example bytesToHex(Uint8Array.from([0xca, 0xfe, 0x01, 0x23])) // 'cafe0123'
 */
export declare function bytesToHex(bytes: Uint8Array): string;
/**
 * Convert hex string to byte array. Uses built-in function, when available.
 * @example hexToBytes('cafe0123') // Uint8Array.from([0xca, 0xfe, 0x01, 0x23])
 */
export declare function hexToBytes(hex: string): Uint8Array;
export declare function hexToNumber(hex: string): bigint;
export declare function bytesToNumberBE(bytes: Uint8Array): bigint;
export declare function numberToBytesBE(n: number | bigint, len: number): Uint8Array;
export declare const nextTick: () => Promise<void>;
/**
 * Converts string to bytes using UTF8 encoding.
 * @example utf8ToBytes('abc') // new Uint8Array([97, 98, 99])
 */
export declare function utf8ToBytes(str: string): Uint8Array;
/**
 * Converts bytes to string using UTF8 encoding.
 * @example bytesToUtf8(new Uint8Array([97, 98, 99])) // 'abc'
 */
export declare function bytesToUtf8(bytes: Uint8Array): string;
export type Input = Uint8Array | string;
/**
 * Normalizes (non-hex) string or Uint8Array to Uint8Array.
 * Warning: when Uint8Array is passed, it would NOT get copied.
 * Keep in mind for future mutable operations.
 */
export declare function toBytes(data: string | Uint8Array): Uint8Array;
/**
 * Checks if two U8A use same underlying buffer and overlaps.
 * This is invalid and can corrupt data.
 */
export declare function overlapBytes(a: Uint8Array, b: Uint8Array): boolean;
/**
 * If input and output overlap and input starts before output, we will overwrite end of input before
 * we start processing it, so this is not supported for most ciphers (except chacha/salse, which designed with this)
 */
export declare function complexOverlapBytes(input: Uint8Array, output: Uint8Array): void;
/**
 * Copies several Uint8Arrays into one.
 */
export declare function concatBytes(...arrays: Uint8Array[]): Uint8Array;
type EmptyObj = {};
export declare function checkOpts<T1 extends EmptyObj, T2 extends EmptyObj>(defaults: T1, opts: T2): T1 & T2;
/** Compares 2 uint8array-s in kinda constant time. */
export declare function equalBytes(a: Uint8Array, b: Uint8Array): boolean;
/** For runtime check if class implements interface. */
export declare abstract class Hash<T extends Hash<T>> {
    abstract blockLen: number;
    abstract outputLen: number;
    abstract update(buf: string | Uint8Array): this;
    abstract digestInto(buf: Uint8Array): void;
    abstract digest(): Uint8Array;
    /**
     * Resets internal state. Makes Hash instance unusable.
     * Reset is impossible for keyed hashes if key is consumed into state. If digest is not consumed
     * by user, they will need to manually call `destroy()` when zeroing is necessary.
     */
    abstract destroy(): void;
}
/** Sync cipher: takes byte array and returns byte array. */
export type Cipher = {
    encrypt(plaintext: Uint8Array): Uint8Array;
    decrypt(ciphertext: Uint8Array): Uint8Array;
};
/** Async cipher e.g. from built-in WebCrypto. */
export type AsyncCipher = {
    encrypt(plaintext: Uint8Array): Promise<Uint8Array>;
    decrypt(ciphertext: Uint8Array): Promise<Uint8Array>;
};
/** Cipher with `output` argument which can optimize by doing 1 less allocation. */
export type CipherWithOutput = Cipher & {
    encrypt(plaintext: Uint8Array, output?: Uint8Array): Uint8Array;
    decrypt(ciphertext: Uint8Array, output?: Uint8Array): Uint8Array;
};
/**
 * Params are outside of return type, so it is accessible before calling constructor.
 * If function support multiple nonceLength's, we return the best one.
 */
export type CipherParams = {
    blockSize: number;
    nonceLength?: number;
    tagLength?: number;
    varSizeNonce?: boolean;
};
/** ARX cipher, like salsa or chacha. */
export type ARXCipher = ((key: Uint8Array, nonce: Uint8Array, AAD?: Uint8Array) => CipherWithOutput) & {
    blockSize: number;
    nonceLength: number;
    tagLength: number;
};
export type CipherCons<T extends any[]> = (key: Uint8Array, ...args: T) => Cipher;
/**
 * Wraps a cipher: validates args, ensures encrypt() can only be called once.
 * @__NO_SIDE_EFFECTS__
 */
export declare const wrapCipher: <C extends CipherCons<any>, P extends CipherParams>(params: P, constructor: C) => C & P;
/** Represents salsa / chacha stream. */
export type XorStream = (key: Uint8Array, nonce: Uint8Array, data: Uint8Array, output?: Uint8Array, counter?: number) => Uint8Array;
/**
 * By default, returns u8a of length.
 * When out is available, it checks it for validity and uses it.
 */
export declare function getOutput(expectedLength: number, out?: Uint8Array, onlyAligned?: boolean): Uint8Array;
/** Polyfill for Safari 14. */
export declare function setBigUint64(view: DataView, byteOffset: number, value: bigint, isLE: boolean): void;
export declare function u64Lengths(dataLength: number, aadLength: number, isLE: boolean): Uint8Array;
export declare function isAligned32(bytes: Uint8Array): boolean;
export declare function copyBytes(bytes: Uint8Array): Uint8Array;
export {};
//# sourceMappingURL=utils.d.ts.map