/**
 * GHash from AES-GCM and its little-endian "mirror image" Polyval from AES-SIV.
 *
 * Implemented in terms of GHash with conversion function for keys
 * GCM GHASH from
 * [NIST SP800-38d](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38d.pdf),
 * SIV from
 * [RFC 8452](https://datatracker.ietf.org/doc/html/rfc8452).
 *
 * GHASH   modulo: x^128 + x^7   + x^2   + x     + 1
 * POLYVAL modulo: x^128 + x^127 + x^126 + x^121 + 1
 *
 * @module
 */
import { Hash, type Input } from './utils.ts';
/**
 * `mulX_POLYVAL(ByteReverse(H))` from spec
 * @param k mutated in place
 */
export declare function _toGHASHKey(k: Uint8Array): Uint8Array;
export type CHashPV = ReturnType<typeof wrapConstructorWithKey>;
declare function wrapConstructorWithKey<H extends Hash<H>>(hashCons: (key: Input, expectedLength?: number) => Hash<H>): {
    (msg: Input, key: Input): Uint8Array;
    outputLen: number;
    blockLen: number;
    create(key: Input, expectedLength?: number): Hash<H>;
};
/** GHash MAC for AES-GCM. */
export declare const ghash: CHashPV;
/** Polyval MAC for AES-SIV. */
export declare const polyval: CHashPV;
export {};
//# sourceMappingURL=_polyval.d.ts.map