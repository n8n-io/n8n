import { type CHash, type Hex, type PrivKey } from '../utils.ts';
import { type AffinePoint, type BasicCurve, type CurveLengths, type CurvePoint, type CurvePointCons } from './curve.ts';
import { type IField, type NLength } from './modular.ts';
export type { AffinePoint };
export type HmacFnSync = (key: Uint8Array, ...messages: Uint8Array[]) => Uint8Array;
type EndoBasis = [[bigint, bigint], [bigint, bigint]];
/**
 * When Weierstrass curve has `a=0`, it becomes Koblitz curve.
 * Koblitz curves allow using **efficiently-computable GLV endomorphism ψ**.
 * Endomorphism uses 2x less RAM, speeds up precomputation by 2x and ECDH / key recovery by 20%.
 * For precomputed wNAF it trades off 1/2 init time & 1/3 ram for 20% perf hit.
 *
 * Endomorphism consists of beta, lambda and splitScalar:
 *
 * 1. GLV endomorphism ψ transforms a point: `P = (x, y) ↦ ψ(P) = (β·x mod p, y)`
 * 2. GLV scalar decomposition transforms a scalar: `k ≡ k₁ + k₂·λ (mod n)`
 * 3. Then these are combined: `k·P = k₁·P + k₂·ψ(P)`
 * 4. Two 128-bit point-by-scalar multiplications + one point addition is faster than
 *    one 256-bit multiplication.
 *
 * where
 * * beta: β ∈ Fₚ with β³ = 1, β ≠ 1
 * * lambda: λ ∈ Fₙ with λ³ = 1, λ ≠ 1
 * * splitScalar decomposes k ↦ k₁, k₂, by using reduced basis vectors.
 *   Gauss lattice reduction calculates them from initial basis vectors `(n, 0), (-λ, 0)`
 *
 * Check out `test/misc/endomorphism.js` and
 * [gist](https://gist.github.com/paulmillr/eb670806793e84df628a7c434a873066).
 */
export type EndomorphismOpts = {
    beta: bigint;
    basises?: EndoBasis;
    splitScalar?: (k: bigint) => {
        k1neg: boolean;
        k1: bigint;
        k2neg: boolean;
        k2: bigint;
    };
};
export type ScalarEndoParts = {
    k1neg: boolean;
    k1: bigint;
    k2neg: boolean;
    k2: bigint;
};
/**
 * Splits scalar for GLV endomorphism.
 */
export declare function _splitEndoScalar(k: bigint, basis: EndoBasis, n: bigint): ScalarEndoParts;
export type ECDSASigFormat = 'compact' | 'recovered' | 'der';
export type ECDSARecoverOpts = {
    prehash?: boolean;
};
export type ECDSAVerifyOpts = {
    prehash?: boolean;
    lowS?: boolean;
    format?: ECDSASigFormat;
};
export type ECDSASignOpts = {
    prehash?: boolean;
    lowS?: boolean;
    format?: ECDSASigFormat;
    extraEntropy?: Uint8Array | boolean;
};
/** Instance methods for 3D XYZ projective points. */
export interface WeierstrassPoint<T> extends CurvePoint<T, WeierstrassPoint<T>> {
    /** projective X coordinate. Different from affine x. */
    readonly X: T;
    /** projective Y coordinate. Different from affine y. */
    readonly Y: T;
    /** projective z coordinate */
    readonly Z: T;
    /** affine x coordinate. Different from projective X. */
    get x(): T;
    /** affine y coordinate. Different from projective Y. */
    get y(): T;
    /** Encodes point using IEEE P1363 (DER) encoding. First byte is 2/3/4. Default = isCompressed. */
    toBytes(isCompressed?: boolean): Uint8Array;
    toHex(isCompressed?: boolean): string;
    /** @deprecated use `.X` */
    readonly px: T;
    /** @deprecated use `.Y` */
    readonly py: T;
    /** @deprecated use `.Z` */
    readonly pz: T;
    /** @deprecated use `toBytes` */
    toRawBytes(isCompressed?: boolean): Uint8Array;
    /** @deprecated use `multiplyUnsafe` */
    multiplyAndAddUnsafe(Q: WeierstrassPoint<T>, a: bigint, b: bigint): WeierstrassPoint<T> | undefined;
    /** @deprecated use `p.y % 2n === 0n` */
    hasEvenY(): boolean;
    /** @deprecated use `p.precompute(windowSize)` */
    _setWindowSize(windowSize: number): void;
}
/** Static methods for 3D XYZ projective points. */
export interface WeierstrassPointCons<T> extends CurvePointCons<WeierstrassPoint<T>> {
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    new (X: T, Y: T, Z: T): WeierstrassPoint<T>;
    CURVE(): WeierstrassOpts<T>;
    /** @deprecated use `Point.BASE.multiply(Point.Fn.fromBytes(privateKey))` */
    fromPrivateKey(privateKey: PrivKey): WeierstrassPoint<T>;
    /** @deprecated use `import { normalizeZ } from '@noble/curves/abstract/curve.js';` */
    normalizeZ(points: WeierstrassPoint<T>[]): WeierstrassPoint<T>[];
    /** @deprecated use `import { pippenger } from '@noble/curves/abstract/curve.js';` */
    msm(points: WeierstrassPoint<T>[], scalars: bigint[]): WeierstrassPoint<T>;
}
/**
 * Weierstrass curve options.
 *
 * * p: prime characteristic (order) of finite field, in which arithmetics is done
 * * n: order of prime subgroup a.k.a total amount of valid curve points
 * * h: cofactor, usually 1. h*n is group order; n is subgroup order
 * * a: formula param, must be in field of p
 * * b: formula param, must be in field of p
 * * Gx: x coordinate of generator point a.k.a. base point
 * * Gy: y coordinate of generator point
 */
export type WeierstrassOpts<T> = Readonly<{
    p: bigint;
    n: bigint;
    h: bigint;
    a: T;
    b: T;
    Gx: T;
    Gy: T;
}>;
export type WeierstrassExtraOpts<T> = Partial<{
    Fp: IField<T>;
    Fn: IField<bigint>;
    allowInfinityPoint: boolean;
    endo: EndomorphismOpts;
    isTorsionFree: (c: WeierstrassPointCons<T>, point: WeierstrassPoint<T>) => boolean;
    clearCofactor: (c: WeierstrassPointCons<T>, point: WeierstrassPoint<T>) => WeierstrassPoint<T>;
    fromBytes: (bytes: Uint8Array) => AffinePoint<T>;
    toBytes: (c: WeierstrassPointCons<T>, point: WeierstrassPoint<T>, isCompressed: boolean) => Uint8Array;
}>;
/**
 * Options for ECDSA signatures over a Weierstrass curve.
 *
 * * lowS: (default: true) whether produced / verified signatures occupy low half of ecdsaOpts.p. Prevents malleability.
 * * hmac: (default: noble-hashes hmac) function, would be used to init hmac-drbg for k generation.
 * * randomBytes: (default: webcrypto os-level CSPRNG) custom method for fetching secure randomness.
 * * bits2int, bits2int_modN: used in sigs, sometimes overridden by curves
 */
export type ECDSAOpts = Partial<{
    lowS: boolean;
    hmac: HmacFnSync;
    randomBytes: (bytesLength?: number) => Uint8Array;
    bits2int: (bytes: Uint8Array) => bigint;
    bits2int_modN: (bytes: Uint8Array) => bigint;
}>;
/**
 * Elliptic Curve Diffie-Hellman interface.
 * Provides keygen, secret-to-public conversion, calculating shared secrets.
 */
export interface ECDH {
    keygen: (seed?: Uint8Array) => {
        secretKey: Uint8Array;
        publicKey: Uint8Array;
    };
    getPublicKey: (secretKey: PrivKey, isCompressed?: boolean) => Uint8Array;
    getSharedSecret: (secretKeyA: PrivKey, publicKeyB: Hex, isCompressed?: boolean) => Uint8Array;
    Point: WeierstrassPointCons<bigint>;
    utils: {
        isValidSecretKey: (secretKey: PrivKey) => boolean;
        isValidPublicKey: (publicKey: Uint8Array, isCompressed?: boolean) => boolean;
        randomSecretKey: (seed?: Uint8Array) => Uint8Array;
        /** @deprecated use `randomSecretKey` */
        randomPrivateKey: (seed?: Uint8Array) => Uint8Array;
        /** @deprecated use `isValidSecretKey` */
        isValidPrivateKey: (secretKey: PrivKey) => boolean;
        /** @deprecated use `Point.Fn.fromBytes()` */
        normPrivateKeyToScalar: (key: PrivKey) => bigint;
        /** @deprecated use `point.precompute()` */
        precompute: (windowSize?: number, point?: WeierstrassPoint<bigint>) => WeierstrassPoint<bigint>;
    };
    lengths: CurveLengths;
}
/**
 * ECDSA interface.
 * Only supported for prime fields, not Fp2 (extension fields).
 */
export interface ECDSA extends ECDH {
    sign: (message: Hex, secretKey: PrivKey, opts?: ECDSASignOpts) => ECDSASigRecovered;
    verify: (signature: Uint8Array, message: Uint8Array, publicKey: Uint8Array, opts?: ECDSAVerifyOpts) => boolean;
    recoverPublicKey(signature: Uint8Array, message: Uint8Array, opts?: ECDSARecoverOpts): Uint8Array;
    Signature: ECDSASignatureCons;
}
export declare class DERErr extends Error {
    constructor(m?: string);
}
export type IDER = {
    Err: typeof DERErr;
    _tlv: {
        encode: (tag: number, data: string) => string;
        decode(tag: number, data: Uint8Array): {
            v: Uint8Array;
            l: Uint8Array;
        };
    };
    _int: {
        encode(num: bigint): string;
        decode(data: Uint8Array): bigint;
    };
    toSig(hex: string | Uint8Array): {
        r: bigint;
        s: bigint;
    };
    hexFromSig(sig: {
        r: bigint;
        s: bigint;
    }): string;
};
/**
 * ASN.1 DER encoding utilities. ASN is very complex & fragile. Format:
 *
 *     [0x30 (SEQUENCE), bytelength, 0x02 (INTEGER), intLength, R, 0x02 (INTEGER), intLength, S]
 *
 * Docs: https://letsencrypt.org/docs/a-warm-welcome-to-asn1-and-der/, https://luca.ntop.org/Teaching/Appunti/asn1.html
 */
export declare const DER: IDER;
export declare function _normFnElement(Fn: IField<bigint>, key: PrivKey): bigint;
/**
 * Creates weierstrass Point constructor, based on specified curve options.
 *
 * @example
```js
const opts = {
  p: BigInt('0xffffffff00000001000000000000000000000000ffffffffffffffffffffffff'),
  n: BigInt('0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551'),
  h: BigInt(1),
  a: BigInt('0xffffffff00000001000000000000000000000000fffffffffffffffffffffffc'),
  b: BigInt('0x5ac635d8aa3a93e7b3ebbd55769886bc651d06b0cc53b0f63bce3c3e27d2604b'),
  Gx: BigInt('0x6b17d1f2e12c4247f8bce6e563a440f277037d812deb33a0f4a13945d898c296'),
  Gy: BigInt('0x4fe342e2fe1a7f9b8ee7eb4a7c0f9e162bce33576b315ececbb6406837bf51f5'),
};
const p256_Point = weierstrass(opts);
```
 */
export declare function weierstrassN<T>(params: WeierstrassOpts<T>, extraOpts?: WeierstrassExtraOpts<T>): WeierstrassPointCons<T>;
/** Methods of ECDSA signature instance. */
export interface ECDSASignature {
    readonly r: bigint;
    readonly s: bigint;
    readonly recovery?: number;
    addRecoveryBit(recovery: number): ECDSASigRecovered;
    hasHighS(): boolean;
    toBytes(format?: string): Uint8Array;
    toHex(format?: string): string;
    /** @deprecated */
    assertValidity(): void;
    /** @deprecated */
    normalizeS(): ECDSASignature;
    /** @deprecated use standalone method `curve.recoverPublicKey(sig.toBytes('recovered'), msg)` */
    recoverPublicKey(msgHash: Hex): WeierstrassPoint<bigint>;
    /** @deprecated use `.toBytes('compact')` */
    toCompactRawBytes(): Uint8Array;
    /** @deprecated use `.toBytes('compact')` */
    toCompactHex(): string;
    /** @deprecated use `.toBytes('der')` */
    toDERRawBytes(): Uint8Array;
    /** @deprecated use `.toBytes('der')` */
    toDERHex(): string;
}
export type ECDSASigRecovered = ECDSASignature & {
    readonly recovery: number;
};
/** Methods of ECDSA signature constructor. */
export type ECDSASignatureCons = {
    new (r: bigint, s: bigint, recovery?: number): ECDSASignature;
    fromBytes(bytes: Uint8Array, format?: ECDSASigFormat): ECDSASignature;
    fromHex(hex: string, format?: ECDSASigFormat): ECDSASignature;
    /** @deprecated use `.fromBytes(bytes, 'compact')` */
    fromCompact(hex: Hex): ECDSASignature;
    /** @deprecated use `.fromBytes(bytes, 'der')` */
    fromDER(hex: Hex): ECDSASignature;
};
/**
 * Implementation of the Shallue and van de Woestijne method for any weierstrass curve.
 * TODO: check if there is a way to merge this with uvRatio in Edwards; move to modular.
 * b = True and y = sqrt(u / v) if (u / v) is square in F, and
 * b = False and y = sqrt(Z * (u / v)) otherwise.
 * @param Fp
 * @param Z
 * @returns
 */
export declare function SWUFpSqrtRatio<T>(Fp: IField<T>, Z: T): (u: T, v: T) => {
    isValid: boolean;
    value: T;
};
/**
 * Simplified Shallue-van de Woestijne-Ulas Method
 * https://www.rfc-editor.org/rfc/rfc9380#section-6.6.2
 */
export declare function mapToCurveSimpleSWU<T>(Fp: IField<T>, opts: {
    A: T;
    B: T;
    Z: T;
}): (u: T) => {
    x: T;
    y: T;
};
/**
 * Sometimes users only need getPublicKey, getSharedSecret, and secret key handling.
 * This helper ensures no signature functionality is present. Less code, smaller bundle size.
 */
export declare function ecdh(Point: WeierstrassPointCons<bigint>, ecdhOpts?: {
    randomBytes?: (bytesLength?: number) => Uint8Array;
}): ECDH;
/**
 * Creates ECDSA signing interface for given elliptic curve `Point` and `hash` function.
 * We need `hash` for 2 features:
 * 1. Message prehash-ing. NOT used if `sign` / `verify` are called with `prehash: false`
 * 2. k generation in `sign`, using HMAC-drbg(hash)
 *
 * ECDSAOpts are only rarely needed.
 *
 * @example
 * ```js
 * const p256_Point = weierstrass(...);
 * const p256_sha256 = ecdsa(p256_Point, sha256);
 * const p256_sha224 = ecdsa(p256_Point, sha224);
 * const p256_sha224_r = ecdsa(p256_Point, sha224, { randomBytes: (length) => { ... } });
 * ```
 */
export declare function ecdsa(Point: WeierstrassPointCons<bigint>, hash: CHash, ecdsaOpts?: ECDSAOpts): ECDSA;
/** @deprecated use ECDSASignature */
export type SignatureType = ECDSASignature;
/** @deprecated use ECDSASigRecovered */
export type RecoveredSignatureType = ECDSASigRecovered;
/** @deprecated switch to Uint8Array signatures in format 'compact' */
export type SignatureLike = {
    r: bigint;
    s: bigint;
};
export type ECDSAExtraEntropy = Hex | boolean;
/** @deprecated use `ECDSAExtraEntropy` */
export type Entropy = Hex | boolean;
export type BasicWCurve<T> = BasicCurve<T> & {
    a: T;
    b: T;
    allowedPrivateKeyLengths?: readonly number[];
    wrapPrivateKey?: boolean;
    endo?: EndomorphismOpts;
    isTorsionFree?: (c: WeierstrassPointCons<T>, point: WeierstrassPoint<T>) => boolean;
    clearCofactor?: (c: WeierstrassPointCons<T>, point: WeierstrassPoint<T>) => WeierstrassPoint<T>;
};
/** @deprecated use ECDSASignOpts */
export type SignOpts = ECDSASignOpts;
/** @deprecated use ECDSASignOpts */
export type VerOpts = ECDSAVerifyOpts;
/** @deprecated use WeierstrassPoint */
export type ProjPointType<T> = WeierstrassPoint<T>;
/** @deprecated use WeierstrassPointCons */
export type ProjConstructor<T> = WeierstrassPointCons<T>;
/** @deprecated use ECDSASignatureCons */
export type SignatureConstructor = ECDSASignatureCons;
export type CurvePointsType<T> = BasicWCurve<T> & {
    fromBytes?: (bytes: Uint8Array) => AffinePoint<T>;
    toBytes?: (c: WeierstrassPointCons<T>, point: WeierstrassPoint<T>, isCompressed: boolean) => Uint8Array;
};
export type CurvePointsTypeWithLength<T> = Readonly<CurvePointsType<T> & Partial<NLength>>;
export type CurvePointsRes<T> = {
    Point: WeierstrassPointCons<T>;
    /** @deprecated use `Point.CURVE()` */
    CURVE: CurvePointsType<T>;
    /** @deprecated use `Point` */
    ProjectivePoint: WeierstrassPointCons<T>;
    /** @deprecated use `Point.Fn.fromBytes(privateKey)` */
    normPrivateKeyToScalar: (key: PrivKey) => bigint;
    /** @deprecated */
    weierstrassEquation: (x: T) => T;
    /** @deprecated use `Point.Fn.isValidNot0(num)` */
    isWithinCurveOrder: (num: bigint) => boolean;
};
/** @deprecated use `Uint8Array` */
export type PubKey = Hex | WeierstrassPoint<bigint>;
export type CurveType = BasicWCurve<bigint> & {
    hash: CHash;
    hmac?: HmacFnSync;
    randomBytes?: (bytesLength?: number) => Uint8Array;
    lowS?: boolean;
    bits2int?: (bytes: Uint8Array) => bigint;
    bits2int_modN?: (bytes: Uint8Array) => bigint;
};
export type CurveFn = {
    /** @deprecated use `Point.CURVE()` */
    CURVE: CurvePointsType<bigint>;
    keygen: ECDSA['keygen'];
    getPublicKey: ECDSA['getPublicKey'];
    getSharedSecret: ECDSA['getSharedSecret'];
    sign: ECDSA['sign'];
    verify: ECDSA['verify'];
    Point: WeierstrassPointCons<bigint>;
    /** @deprecated use `Point` */
    ProjectivePoint: WeierstrassPointCons<bigint>;
    Signature: ECDSASignatureCons;
    utils: ECDSA['utils'];
    lengths: ECDSA['lengths'];
};
/** @deprecated use `weierstrass` in newer releases */
export declare function weierstrassPoints<T>(c: CurvePointsTypeWithLength<T>): CurvePointsRes<T>;
export type WsPointComposed<T> = {
    CURVE: WeierstrassOpts<T>;
    curveOpts: WeierstrassExtraOpts<T>;
};
export type WsComposed = {
    /** @deprecated use `Point.CURVE()` */
    CURVE: WeierstrassOpts<bigint>;
    hash: CHash;
    curveOpts: WeierstrassExtraOpts<bigint>;
    ecdsaOpts: ECDSAOpts;
};
export declare function _legacyHelperEquat<T>(Fp: IField<T>, a: T, b: T): (x: T) => T;
export declare function weierstrass(c: CurveType): CurveFn;
//# sourceMappingURL=weierstrass.d.ts.map