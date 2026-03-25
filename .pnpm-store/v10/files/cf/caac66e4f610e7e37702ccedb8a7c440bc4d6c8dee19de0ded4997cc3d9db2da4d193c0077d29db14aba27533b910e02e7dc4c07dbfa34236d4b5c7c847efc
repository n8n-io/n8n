/**
 * Internal Merkle-Damgard hash utils.
 * @module
 */
import { type Input, Hash } from './utils.ts';
/** Polyfill for Safari 14. https://caniuse.com/mdn-javascript_builtins_dataview_setbiguint64 */
export declare function setBigUint64(view: DataView, byteOffset: number, value: bigint, isLE: boolean): void;
/** Choice: a ? b : c */
export declare function Chi(a: number, b: number, c: number): number;
/** Majority function, true if any two inputs is true. */
export declare function Maj(a: number, b: number, c: number): number;
/**
 * Merkle-Damgard hash construction base class.
 * Could be used to create MD5, RIPEMD, SHA1, SHA2.
 */
export declare abstract class HashMD<T extends HashMD<T>> extends Hash<T> {
    protected abstract process(buf: DataView, offset: number): void;
    protected abstract get(): number[];
    protected abstract set(...args: number[]): void;
    abstract destroy(): void;
    protected abstract roundClean(): void;
    readonly blockLen: number;
    readonly outputLen: number;
    readonly padOffset: number;
    readonly isLE: boolean;
    protected buffer: Uint8Array;
    protected view: DataView;
    protected finished: boolean;
    protected length: number;
    protected pos: number;
    protected destroyed: boolean;
    constructor(blockLen: number, outputLen: number, padOffset: number, isLE: boolean);
    update(data: Input): this;
    digestInto(out: Uint8Array): void;
    digest(): Uint8Array;
    _cloneInto(to?: T): T;
    clone(): T;
}
/**
 * Initial SHA-2 state: fractional parts of square roots of first 16 primes 2..53.
 * Check out `test/misc/sha2-gen-iv.js` for recomputation guide.
 */
/** Initial SHA256 state. Bits 0..32 of frac part of sqrt of primes 2..19 */
export declare const SHA256_IV: Uint32Array;
/** Initial SHA224 state. Bits 32..64 of frac part of sqrt of primes 23..53 */
export declare const SHA224_IV: Uint32Array;
/** Initial SHA384 state. Bits 0..64 of frac part of sqrt of primes 23..53 */
export declare const SHA384_IV: Uint32Array;
/** Initial SHA512 state. Bits 0..64 of frac part of sqrt of primes 2..19 */
export declare const SHA512_IV: Uint32Array;
//# sourceMappingURL=_md.d.ts.map