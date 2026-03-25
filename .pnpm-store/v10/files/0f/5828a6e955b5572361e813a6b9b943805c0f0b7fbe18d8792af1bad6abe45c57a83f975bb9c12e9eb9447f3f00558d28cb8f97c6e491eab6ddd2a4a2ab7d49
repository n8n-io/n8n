/**
 * Utilities for hex, bytes, CSPRNG.
 * @module
 */
/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
/** Checks if something is Uint8Array. Be careful: nodejs Buffer will return true. */
export declare function isBytes(a: unknown): a is Uint8Array;
/** Asserts something is positive integer. */
export declare function anumber(n: number): void;
/** Asserts something is Uint8Array. */
export declare function abytes(b: Uint8Array | undefined, ...lengths: number[]): void;
/** Asserts something is hash */
export declare function ahash(h: IHash): void;
/** Asserts a hash instance has not been destroyed / finished */
export declare function aexists(instance: any, checkFinished?: boolean): void;
/** Asserts output is properly-sized byte array */
export declare function aoutput(out: any, instance: any): void;
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
/** The rotate right (circular right shift) operation for uint32 */
export declare function rotr(word: number, shift: number): number;
/** The rotate left (circular left shift) operation for uint32 */
export declare function rotl(word: number, shift: number): number;
/** Is current platform little-endian? Most are. Big-Endian platform: IBM */
export declare const isLE: boolean;
/** The byte swap operation for uint32 */
export declare function byteSwap(word: number): number;
/** Conditionally byte swap if on a big-endian platform */
export declare const swap8IfBE: (n: number) => number;
/** @deprecated */
export declare const byteSwapIfBE: typeof swap8IfBE;
/** In place byte swap for Uint32Array */
export declare function byteSwap32(arr: Uint32Array): Uint32Array;
export declare const swap32IfBE: (u: Uint32Array) => Uint32Array;
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
/**
 * There is no setImmediate in browser and setTimeout is slow.
 * Call of async fn will return Promise, which will be fullfiled only on
 * next scheduler queue processing step and this is exactly what we need.
 */
export declare const nextTick: () => Promise<void>;
/** Returns control to thread each 'tick' ms to avoid blocking. */
export declare function asyncLoop(iters: number, tick: number, cb: (i: number) => void): Promise<void>;
/**
 * Converts string to bytes using UTF8 encoding.
 * @example utf8ToBytes('abc') // Uint8Array.from([97, 98, 99])
 */
export declare function utf8ToBytes(str: string): Uint8Array;
/**
 * Converts bytes to string using UTF8 encoding.
 * @example bytesToUtf8(Uint8Array.from([97, 98, 99])) // 'abc'
 */
export declare function bytesToUtf8(bytes: Uint8Array): string;
/** Accepted input of hash functions. Strings are converted to byte arrays. */
export type Input = string | Uint8Array;
/**
 * Normalizes (non-hex) string or Uint8Array to Uint8Array.
 * Warning: when Uint8Array is passed, it would NOT get copied.
 * Keep in mind for future mutable operations.
 */
export declare function toBytes(data: Input): Uint8Array;
/** KDFs can accept string or Uint8Array for user convenience. */
export type KDFInput = string | Uint8Array;
/**
 * Helper for KDFs: consumes uint8array or string.
 * When string is passed, does utf8 decoding, using TextDecoder.
 */
export declare function kdfInputToBytes(data: KDFInput): Uint8Array;
/** Copies several Uint8Arrays into one. */
export declare function concatBytes(...arrays: Uint8Array[]): Uint8Array;
type EmptyObj = {};
export declare function checkOpts<T1 extends EmptyObj, T2 extends EmptyObj>(defaults: T1, opts?: T2): T1 & T2;
/** Hash interface. */
export type IHash = {
    (data: Uint8Array): Uint8Array;
    blockLen: number;
    outputLen: number;
    create: any;
};
/** For runtime check if class implements interface */
export declare abstract class Hash<T extends Hash<T>> {
    abstract blockLen: number;
    abstract outputLen: number;
    abstract update(buf: Input): this;
    abstract digestInto(buf: Uint8Array): void;
    abstract digest(): Uint8Array;
    /**
     * Resets internal state. Makes Hash instance unusable.
     * Reset is impossible for keyed hashes if key is consumed into state. If digest is not consumed
     * by user, they will need to manually call `destroy()` when zeroing is necessary.
     */
    abstract destroy(): void;
    /**
     * Clones hash instance. Unsafe: doesn't check whether `to` is valid. Can be used as `clone()`
     * when no options are passed.
     * Reasons to use `_cloneInto` instead of clone: 1) performance 2) reuse instance => all internal
     * buffers are overwritten => causes buffer overwrite which is used for digest in some cases.
     * There are no guarantees for clean-up because it's impossible in JS.
     */
    abstract _cloneInto(to?: T): T;
    abstract clone(): T;
}
/**
 * XOF: streaming API to read digest in chunks.
 * Same as 'squeeze' in keccak/k12 and 'seek' in blake3, but more generic name.
 * When hash used in XOF mode it is up to user to call '.destroy' afterwards, since we cannot
 * destroy state, next call can require more bytes.
 */
export type HashXOF<T extends Hash<T>> = Hash<T> & {
    xof(bytes: number): Uint8Array;
    xofInto(buf: Uint8Array): Uint8Array;
};
/** Hash function */
export type CHash = ReturnType<typeof createHasher>;
/** Hash function with output */
export type CHashO = ReturnType<typeof createOptHasher>;
/** XOF with output */
export type CHashXO = ReturnType<typeof createXOFer>;
/** Wraps hash function, creating an interface on top of it */
export declare function createHasher<T extends Hash<T>>(hashCons: () => Hash<T>): {
    (msg: Input): Uint8Array;
    outputLen: number;
    blockLen: number;
    create(): Hash<T>;
};
export declare function createOptHasher<H extends Hash<H>, T extends Object>(hashCons: (opts?: T) => Hash<H>): {
    (msg: Input, opts?: T): Uint8Array;
    outputLen: number;
    blockLen: number;
    create(opts?: T): Hash<H>;
};
export declare function createXOFer<H extends HashXOF<H>, T extends Object>(hashCons: (opts?: T) => HashXOF<H>): {
    (msg: Input, opts?: T): Uint8Array;
    outputLen: number;
    blockLen: number;
    create(opts?: T): HashXOF<H>;
};
export declare const wrapConstructor: typeof createHasher;
export declare const wrapConstructorWithOpts: typeof createOptHasher;
export declare const wrapXOFConstructorWithOpts: typeof createXOFer;
/** Cryptographically secure PRNG. Uses internal OS-level `crypto.getRandomValues`. */
export declare function randomBytes(bytesLength?: number): Uint8Array;
export {};
//# sourceMappingURL=utils.d.ts.map