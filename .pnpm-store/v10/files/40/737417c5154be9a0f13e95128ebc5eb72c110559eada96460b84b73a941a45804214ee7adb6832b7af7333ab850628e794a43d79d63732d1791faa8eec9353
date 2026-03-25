/**
 * SHA2 hash function. A.k.a. sha256, sha384, sha512, sha512_224, sha512_256.
 * SHA256 is the fastest hash implementable in JS, even faster than Blake3.
 * Check out [RFC 4634](https://datatracker.ietf.org/doc/html/rfc4634) and
 * [FIPS 180-4](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.180-4.pdf).
 * @module
 */
import { HashMD } from './_md.ts';
import { type CHash } from './utils.ts';
export declare class SHA256 extends HashMD<SHA256> {
    protected A: number;
    protected B: number;
    protected C: number;
    protected D: number;
    protected E: number;
    protected F: number;
    protected G: number;
    protected H: number;
    constructor(outputLen?: number);
    protected get(): [number, number, number, number, number, number, number, number];
    protected set(A: number, B: number, C: number, D: number, E: number, F: number, G: number, H: number): void;
    protected process(view: DataView, offset: number): void;
    protected roundClean(): void;
    destroy(): void;
}
export declare class SHA224 extends SHA256 {
    protected A: number;
    protected B: number;
    protected C: number;
    protected D: number;
    protected E: number;
    protected F: number;
    protected G: number;
    protected H: number;
    constructor();
}
export declare class SHA512 extends HashMD<SHA512> {
    protected Ah: number;
    protected Al: number;
    protected Bh: number;
    protected Bl: number;
    protected Ch: number;
    protected Cl: number;
    protected Dh: number;
    protected Dl: number;
    protected Eh: number;
    protected El: number;
    protected Fh: number;
    protected Fl: number;
    protected Gh: number;
    protected Gl: number;
    protected Hh: number;
    protected Hl: number;
    constructor(outputLen?: number);
    protected get(): [
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number
    ];
    protected set(Ah: number, Al: number, Bh: number, Bl: number, Ch: number, Cl: number, Dh: number, Dl: number, Eh: number, El: number, Fh: number, Fl: number, Gh: number, Gl: number, Hh: number, Hl: number): void;
    protected process(view: DataView, offset: number): void;
    protected roundClean(): void;
    destroy(): void;
}
export declare class SHA384 extends SHA512 {
    protected Ah: number;
    protected Al: number;
    protected Bh: number;
    protected Bl: number;
    protected Ch: number;
    protected Cl: number;
    protected Dh: number;
    protected Dl: number;
    protected Eh: number;
    protected El: number;
    protected Fh: number;
    protected Fl: number;
    protected Gh: number;
    protected Gl: number;
    protected Hh: number;
    protected Hl: number;
    constructor();
}
export declare class SHA512_224 extends SHA512 {
    protected Ah: number;
    protected Al: number;
    protected Bh: number;
    protected Bl: number;
    protected Ch: number;
    protected Cl: number;
    protected Dh: number;
    protected Dl: number;
    protected Eh: number;
    protected El: number;
    protected Fh: number;
    protected Fl: number;
    protected Gh: number;
    protected Gl: number;
    protected Hh: number;
    protected Hl: number;
    constructor();
}
export declare class SHA512_256 extends SHA512 {
    protected Ah: number;
    protected Al: number;
    protected Bh: number;
    protected Bl: number;
    protected Ch: number;
    protected Cl: number;
    protected Dh: number;
    protected Dl: number;
    protected Eh: number;
    protected El: number;
    protected Fh: number;
    protected Fl: number;
    protected Gh: number;
    protected Gl: number;
    protected Hh: number;
    protected Hl: number;
    constructor();
}
/**
 * SHA2-256 hash function from RFC 4634.
 *
 * It is the fastest JS hash, even faster than Blake3.
 * To break sha256 using birthday attack, attackers need to try 2^128 hashes.
 * BTC network is doing 2^70 hashes/sec (2^95 hashes/year) as per 2025.
 */
export declare const sha256: CHash;
/** SHA2-224 hash function from RFC 4634 */
export declare const sha224: CHash;
/** SHA2-512 hash function from RFC 4634. */
export declare const sha512: CHash;
/** SHA2-384 hash function from RFC 4634. */
export declare const sha384: CHash;
/**
 * SHA2-512/256 "truncated" hash function, with improved resistance to length extension attacks.
 * See the paper on [truncated SHA512](https://eprint.iacr.org/2010/548.pdf).
 */
export declare const sha512_256: CHash;
/**
 * SHA2-512/224 "truncated" hash function, with improved resistance to length extension attacks.
 * See the paper on [truncated SHA512](https://eprint.iacr.org/2010/548.pdf).
 */
export declare const sha512_224: CHash;
//# sourceMappingURL=sha2.d.ts.map