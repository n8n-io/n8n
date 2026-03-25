import { type AffinePoint } from './abstract/curve.ts';
import { PrimeEdwardsPoint, type CurveFn, type EdwardsPoint } from './abstract/edwards.ts';
import { type H2CHasher, type H2CHasherBase, type H2CMethod, type htfBasicOpts } from './abstract/hash-to-curve.ts';
import { type IField } from './abstract/modular.ts';
import { type MontgomeryECDH as XCurveFn } from './abstract/montgomery.ts';
import { type Hex } from './utils.ts';
/**
 * ed25519 curve with EdDSA signatures.
 * @example
 * import { ed25519 } from '@noble/curves/ed25519';
 * const { secretKey, publicKey } = ed25519.keygen();
 * const msg = new TextEncoder().encode('hello');
 * const sig = ed25519.sign(msg, priv);
 * ed25519.verify(sig, msg, pub); // Default mode: follows ZIP215
 * ed25519.verify(sig, msg, pub, { zip215: false }); // RFC8032 / FIPS 186-5
 */
export declare const ed25519: CurveFn;
/** Context of ed25519. Uses context for domain separation. */
export declare const ed25519ctx: CurveFn;
/** Prehashed version of ed25519. Accepts already-hashed messages in sign() and verify(). */
export declare const ed25519ph: CurveFn;
/**
 * ECDH using curve25519 aka x25519.
 * @example
 * import { x25519 } from '@noble/curves/ed25519';
 * const priv = 'a546e36bf0527c9d3b16154b82465edd62144c0ac1fc5a18506a2244ba449ac4';
 * const pub = 'e6db6867583030db3594c1a424b15f7c726624ec26b3353b10a903a6d0ab1c4c';
 * x25519.getSharedSecret(priv, pub) === x25519.scalarMult(priv, pub); // aliases
 * x25519.getPublicKey(priv) === x25519.scalarMultBase(priv);
 * x25519.getPublicKey(x25519.utils.randomSecretKey());
 */
export declare const x25519: XCurveFn;
/** Hashing to ed25519 points / field. RFC 9380 methods. */
export declare const ed25519_hasher: H2CHasher<bigint>;
type ExtendedPoint = EdwardsPoint;
/**
 * Wrapper over Edwards Point for ristretto255.
 *
 * Each ed25519/ExtendedPoint has 8 different equivalent points. This can be
 * a source of bugs for protocols like ring signatures. Ristretto was created to solve this.
 * Ristretto point operates in X:Y:Z:T extended coordinates like ExtendedPoint,
 * but it should work in its own namespace: do not combine those two.
 * See [RFC9496](https://www.rfc-editor.org/rfc/rfc9496).
 */
declare class _RistrettoPoint extends PrimeEdwardsPoint<_RistrettoPoint> {
    static BASE: _RistrettoPoint;
    static ZERO: _RistrettoPoint;
    static Fp: IField<bigint>;
    static Fn: IField<bigint>;
    constructor(ep: ExtendedPoint);
    static fromAffine(ap: AffinePoint<bigint>): _RistrettoPoint;
    protected assertSame(other: _RistrettoPoint): void;
    protected init(ep: EdwardsPoint): _RistrettoPoint;
    /** @deprecated use `import { ristretto255_hasher } from '@noble/curves/ed25519.js';` */
    static hashToCurve(hex: Hex): _RistrettoPoint;
    static fromBytes(bytes: Uint8Array): _RistrettoPoint;
    /**
     * Converts ristretto-encoded string to ristretto point.
     * Described in [RFC9496](https://www.rfc-editor.org/rfc/rfc9496#name-decode).
     * @param hex Ristretto-encoded 32 bytes. Not every 32-byte string is valid ristretto encoding
     */
    static fromHex(hex: Hex): _RistrettoPoint;
    static msm(points: _RistrettoPoint[], scalars: bigint[]): _RistrettoPoint;
    /**
     * Encodes ristretto point to Uint8Array.
     * Described in [RFC9496](https://www.rfc-editor.org/rfc/rfc9496#name-encode).
     */
    toBytes(): Uint8Array;
    /**
     * Compares two Ristretto points.
     * Described in [RFC9496](https://www.rfc-editor.org/rfc/rfc9496#name-equals).
     */
    equals(other: _RistrettoPoint): boolean;
    is0(): boolean;
}
export declare const ristretto255: {
    Point: typeof _RistrettoPoint;
};
/** Hashing to ristretto255 points / field. RFC 9380 methods. */
export declare const ristretto255_hasher: H2CHasherBase<bigint>;
/**
 * Weird / bogus points, useful for debugging.
 * All 8 ed25519 points of 8-torsion subgroup can be generated from the point
 * T = `26e8958fc2b227b045c3f489f2ef98f0d5dfac05d3c63339b13802886d53fc05`.
 * ⟨T⟩ = { O, T, 2T, 3T, 4T, 5T, 6T, 7T }
 */
export declare const ED25519_TORSION_SUBGROUP: string[];
/** @deprecated use `ed25519.utils.toMontgomery` */
export declare function edwardsToMontgomeryPub(edwardsPub: Hex): Uint8Array;
/** @deprecated use `ed25519.utils.toMontgomery` */
export declare const edwardsToMontgomery: typeof edwardsToMontgomeryPub;
/** @deprecated use `ed25519.utils.toMontgomerySecret` */
export declare function edwardsToMontgomeryPriv(edwardsPriv: Uint8Array): Uint8Array;
/** @deprecated use `ristretto255.Point` */
export declare const RistrettoPoint: typeof _RistrettoPoint;
/** @deprecated use `import { ed25519_hasher } from '@noble/curves/ed25519.js';` */
export declare const hashToCurve: H2CMethod<bigint>;
/** @deprecated use `import { ed25519_hasher } from '@noble/curves/ed25519.js';` */
export declare const encodeToCurve: H2CMethod<bigint>;
type RistHasher = (msg: Uint8Array, options: htfBasicOpts) => _RistrettoPoint;
/** @deprecated use `import { ristretto255_hasher } from '@noble/curves/ed25519.js';` */
export declare const hashToRistretto255: RistHasher;
/** @deprecated use `import { ristretto255_hasher } from '@noble/curves/ed25519.js';` */
export declare const hash_to_ristretto255: RistHasher;
export {};
//# sourceMappingURL=ed25519.d.ts.map