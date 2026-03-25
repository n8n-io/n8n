import type { AffinePoint } from './abstract/curve.ts';
import { PrimeEdwardsPoint, type CurveFn, type EdwardsPoint, type EdwardsPointCons } from './abstract/edwards.ts';
import { type H2CHasher, type H2CHasherBase, type H2CMethod, type htfBasicOpts } from './abstract/hash-to-curve.ts';
import { type IField } from './abstract/modular.ts';
import { type MontgomeryECDH as XCurveFn } from './abstract/montgomery.ts';
import { type Hex } from './utils.ts';
/**
 * ed448 EdDSA curve and methods.
 * @example
 * import { ed448 } from '@noble/curves/ed448';
 * const { secretKey, publicKey } = ed448.keygen();
 * const msg = new TextEncoder().encode('hello');
 * const sig = ed448.sign(msg, secretKey);
 * const isValid = ed448.verify(sig, msg, publicKey);
 */
export declare const ed448: CurveFn;
/** Prehashed version of ed448. Accepts already-hashed messages in sign() and verify(). */
export declare const ed448ph: CurveFn;
/**
 * E448 curve, defined by NIST.
 * E448 != edwards448 used in ed448.
 * E448 is birationally equivalent to edwards448.
 */
export declare const E448: EdwardsPointCons;
/**
 * ECDH using curve448 aka x448.
 * x448 has 56-byte keys as per RFC 7748, while
 * ed448 has 57-byte keys as per RFC 8032.
 */
export declare const x448: XCurveFn;
/** Hashing / encoding to ed448 points / field. RFC 9380 methods. */
export declare const ed448_hasher: H2CHasher<bigint>;
/**
 * Each ed448/EdwardsPoint has 4 different equivalent points. This can be
 * a source of bugs for protocols like ring signatures. Decaf was created to solve this.
 * Decaf point operates in X:Y:Z:T extended coordinates like EdwardsPoint,
 * but it should work in its own namespace: do not combine those two.
 * See [RFC9496](https://www.rfc-editor.org/rfc/rfc9496).
 */
declare class _DecafPoint extends PrimeEdwardsPoint<_DecafPoint> {
    static BASE: _DecafPoint;
    static ZERO: _DecafPoint;
    static Fp: IField<bigint>;
    static Fn: IField<bigint>;
    constructor(ep: EdwardsPoint);
    static fromAffine(ap: AffinePoint<bigint>): _DecafPoint;
    protected assertSame(other: _DecafPoint): void;
    protected init(ep: EdwardsPoint): _DecafPoint;
    /** @deprecated use `import { decaf448_hasher } from '@noble/curves/ed448.js';` */
    static hashToCurve(hex: Hex): _DecafPoint;
    static fromBytes(bytes: Uint8Array): _DecafPoint;
    /**
     * Converts decaf-encoded string to decaf point.
     * Described in [RFC9496](https://www.rfc-editor.org/rfc/rfc9496#name-decode-2).
     * @param hex Decaf-encoded 56 bytes. Not every 56-byte string is valid decaf encoding
     */
    static fromHex(hex: Hex): _DecafPoint;
    /** @deprecated use `import { pippenger } from '@noble/curves/abstract/curve.js';` */
    static msm(points: _DecafPoint[], scalars: bigint[]): _DecafPoint;
    /**
     * Encodes decaf point to Uint8Array.
     * Described in [RFC9496](https://www.rfc-editor.org/rfc/rfc9496#name-encode-2).
     */
    toBytes(): Uint8Array;
    /**
     * Compare one point to another.
     * Described in [RFC9496](https://www.rfc-editor.org/rfc/rfc9496#name-equals-2).
     */
    equals(other: _DecafPoint): boolean;
    is0(): boolean;
}
export declare const decaf448: {
    Point: typeof _DecafPoint;
};
/** Hashing to decaf448 points / field. RFC 9380 methods. */
export declare const decaf448_hasher: H2CHasherBase<bigint>;
/**
 * Weird / bogus points, useful for debugging.
 * Unlike ed25519, there is no ed448 generator point which can produce full T subgroup.
 * Instead, there is a Klein four-group, which spans over 2 independent 2-torsion points:
 * (0, 1), (0, -1), (-1, 0), (1, 0).
 */
export declare const ED448_TORSION_SUBGROUP: string[];
type DcfHasher = (msg: Uint8Array, options: htfBasicOpts) => _DecafPoint;
/** @deprecated use `decaf448.Point` */
export declare const DecafPoint: typeof _DecafPoint;
/** @deprecated use `import { ed448_hasher } from '@noble/curves/ed448.js';` */
export declare const hashToCurve: H2CMethod<bigint>;
/** @deprecated use `import { ed448_hasher } from '@noble/curves/ed448.js';` */
export declare const encodeToCurve: H2CMethod<bigint>;
/** @deprecated use `import { decaf448_hasher } from '@noble/curves/ed448.js';` */
export declare const hashToDecaf448: DcfHasher;
/** @deprecated use `import { decaf448_hasher } from '@noble/curves/ed448.js';` */
export declare const hash_to_decaf448: DcfHasher;
/** @deprecated use `ed448.utils.toMontgomery` */
export declare function edwardsToMontgomeryPub(edwardsPub: string | Uint8Array): Uint8Array;
/** @deprecated use `ed448.utils.toMontgomery` */
export declare const edwardsToMontgomery: typeof edwardsToMontgomeryPub;
export {};
//# sourceMappingURL=ed448.d.ts.map