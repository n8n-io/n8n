/**
 * This is a GF2 Polynomial abstraction that is not meant for production!
 *
 * It is easy to understand and it's correctness is as obvious as possible. It can be used to verify
 * efficient implementations of algorithms on GF2.
 */
export class GF2Polynomial {
    /**
      * @type {Set<number>}
      */
    degrees: Set<number>;
}
export function createFromBytes(bytes: Uint8Array): GF2Polynomial;
export function toUint8Array(p: GF2Polynomial, byteLength?: number): Uint8Array<ArrayBuffer>;
export function createFromUint(uint: number): GF2Polynomial;
export function createRandom(degree: number): GF2Polynomial;
export function getHighestDegree(p: GF2Polynomial): number;
export function addInto(p1: GF2Polynomial, p2: GF2Polynomial): void;
export function orInto(p1: GF2Polynomial, p2: GF2Polynomial): void;
export function add(p1: GF2Polynomial, p2: GF2Polynomial): GF2Polynomial;
export function clone(p: GF2Polynomial): GF2Polynomial;
export function addDegreeInto(p: GF2Polynomial, degree: number): void;
export function multiply(p1: GF2Polynomial, p2: GF2Polynomial): GF2Polynomial;
export function shiftLeft(p: GF2Polynomial, shift: number): GF2Polynomial;
export function mod(p1: GF2Polynomial, p2: GF2Polynomial): GF2Polynomial;
export function modPow(p: GF2Polynomial, e: number, m: GF2Polynomial): GF2Polynomial;
export function gcd(p1: GF2Polynomial, p2: GF2Polynomial): GF2Polynomial;
export function equals(p1: GF2Polynomial, p2: GF2Polynomial): boolean;
export function isIrreducibleBenOr(p: GF2Polynomial): boolean;
export function createIrreducible(degree: number): GF2Polynomial;
export function fingerprint(buf: Uint8Array, m: GF2Polynomial): Uint8Array<ArrayBuffer>;
export class RabinPolynomialEncoder {
    /**
     * @param {GF2Polynomial} m The irreducible polynomial
     */
    constructor(m: GF2Polynomial);
    fingerprint: GF2Polynomial;
    m: GF2Polynomial;
    /**
     * @param {number} b
     */
    write(b: number): void;
    getFingerprint(): Uint8Array<ArrayBuffer>;
}
//# sourceMappingURL=rabin-gf2-polynomial.d.ts.map