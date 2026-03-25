/**
 * Twisted Edwards curve. The formula is: ax² + y² = 1 + dx²y².
 * For design rationale of types / exports, see weierstrass module documentation.
 * Untwisted Edwards curves exist, but they aren't used in real-world protocols.
 * @module
 */
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
import { type FHash, type Hex } from '../utils.ts';
import { type AffinePoint, type BasicCurve, type CurveLengths, type CurvePoint, type CurvePointCons } from './curve.ts';
import { type IField, type NLength } from './modular.ts';
export type UVRatio = (u: bigint, v: bigint) => {
    isValid: boolean;
    value: bigint;
};
/** Instance of Extended Point with coordinates in X, Y, Z, T. */
export interface EdwardsPoint extends CurvePoint<bigint, EdwardsPoint> {
    /** extended X coordinate. Different from affine x. */
    readonly X: bigint;
    /** extended Y coordinate. Different from affine y. */
    readonly Y: bigint;
    /** extended Z coordinate */
    readonly Z: bigint;
    /** extended T coordinate */
    readonly T: bigint;
    /** @deprecated use `toBytes` */
    toRawBytes(): Uint8Array;
    /** @deprecated use `p.precompute(windowSize)` */
    _setWindowSize(windowSize: number): void;
    /** @deprecated use .X */
    readonly ex: bigint;
    /** @deprecated use .Y */
    readonly ey: bigint;
    /** @deprecated use .Z */
    readonly ez: bigint;
    /** @deprecated use .T */
    readonly et: bigint;
}
/** Static methods of Extended Point with coordinates in X, Y, Z, T. */
export interface EdwardsPointCons extends CurvePointCons<EdwardsPoint> {
    new (X: bigint, Y: bigint, Z: bigint, T: bigint): EdwardsPoint;
    CURVE(): EdwardsOpts;
    fromBytes(bytes: Uint8Array, zip215?: boolean): EdwardsPoint;
    fromHex(hex: Hex, zip215?: boolean): EdwardsPoint;
    /** @deprecated use `import { pippenger } from '@noble/curves/abstract/curve.js';` */
    msm(points: EdwardsPoint[], scalars: bigint[]): EdwardsPoint;
}
/** @deprecated use EdwardsPoint */
export type ExtPointType = EdwardsPoint;
/** @deprecated use EdwardsPointCons */
export type ExtPointConstructor = EdwardsPointCons;
/**
 * Twisted Edwards curve options.
 *
 * * a: formula param
 * * d: formula param
 * * p: prime characteristic (order) of finite field, in which arithmetics is done
 * * n: order of prime subgroup a.k.a total amount of valid curve points
 * * h: cofactor. h*n is group order; n is subgroup order
 * * Gx: x coordinate of generator point a.k.a. base point
 * * Gy: y coordinate of generator point
 */
export type EdwardsOpts = Readonly<{
    p: bigint;
    n: bigint;
    h: bigint;
    a: bigint;
    d: bigint;
    Gx: bigint;
    Gy: bigint;
}>;
/**
 * Extra curve options for Twisted Edwards.
 *
 * * Fp: redefined Field over curve.p
 * * Fn: redefined Field over curve.n
 * * uvRatio: helper function for decompression, calculating √(u/v)
 */
export type EdwardsExtraOpts = Partial<{
    Fp: IField<bigint>;
    Fn: IField<bigint>;
    FpFnLE: boolean;
    uvRatio: (u: bigint, v: bigint) => {
        isValid: boolean;
        value: bigint;
    };
}>;
/**
 * EdDSA (Edwards Digital Signature algorithm) options.
 *
 * * hash: hash function used to hash secret keys and messages
 * * adjustScalarBytes: clears bits to get valid field element
 * * domain: Used for hashing
 * * mapToCurve: for hash-to-curve standard
 * * prehash: RFC 8032 pre-hashing of messages to sign() / verify()
 * * randomBytes: function generating random bytes, used for randomSecretKey
 */
export type EdDSAOpts = Partial<{
    adjustScalarBytes: (bytes: Uint8Array) => Uint8Array;
    domain: (data: Uint8Array, ctx: Uint8Array, phflag: boolean) => Uint8Array;
    mapToCurve: (scalar: bigint[]) => AffinePoint<bigint>;
    prehash: FHash;
    randomBytes: (bytesLength?: number) => Uint8Array;
}>;
/**
 * EdDSA (Edwards Digital Signature algorithm) interface.
 *
 * Allows to create and verify signatures, create public and secret keys.
 */
export interface EdDSA {
    keygen: (seed?: Uint8Array) => {
        secretKey: Uint8Array;
        publicKey: Uint8Array;
    };
    getPublicKey: (secretKey: Hex) => Uint8Array;
    sign: (message: Hex, secretKey: Hex, options?: {
        context?: Hex;
    }) => Uint8Array;
    verify: (sig: Hex, message: Hex, publicKey: Hex, options?: {
        context?: Hex;
        zip215: boolean;
    }) => boolean;
    Point: EdwardsPointCons;
    utils: {
        randomSecretKey: (seed?: Uint8Array) => Uint8Array;
        isValidSecretKey: (secretKey: Uint8Array) => boolean;
        isValidPublicKey: (publicKey: Uint8Array, zip215?: boolean) => boolean;
        /**
         * Converts ed public key to x public key.
         *
         * There is NO `fromMontgomery`:
         * - There are 2 valid ed25519 points for every x25519, with flipped coordinate
         * - Sometimes there are 0 valid ed25519 points, because x25519 *additionally*
         *   accepts inputs on the quadratic twist, which can't be moved to ed25519
         *
         * @example
         * ```js
         * const someonesPub = ed25519.getPublicKey(ed25519.utils.randomSecretKey());
         * const aPriv = x25519.utils.randomSecretKey();
         * x25519.getSharedSecret(aPriv, ed25519.utils.toMontgomery(someonesPub))
         * ```
         */
        toMontgomery: (publicKey: Uint8Array) => Uint8Array;
        /**
         * Converts ed secret key to x secret key.
         * @example
         * ```js
         * const someonesPub = x25519.getPublicKey(x25519.utils.randomSecretKey());
         * const aPriv = ed25519.utils.randomSecretKey();
         * x25519.getSharedSecret(ed25519.utils.toMontgomerySecret(aPriv), someonesPub)
         * ```
         */
        toMontgomerySecret: (privateKey: Uint8Array) => Uint8Array;
        getExtendedPublicKey: (key: Hex) => {
            head: Uint8Array;
            prefix: Uint8Array;
            scalar: bigint;
            point: EdwardsPoint;
            pointBytes: Uint8Array;
        };
        /** @deprecated use `randomSecretKey` */
        randomPrivateKey: (seed?: Uint8Array) => Uint8Array;
        /** @deprecated use `point.precompute()` */
        precompute: (windowSize?: number, point?: EdwardsPoint) => EdwardsPoint;
    };
    lengths: CurveLengths;
}
export declare function edwards(params: EdwardsOpts, extraOpts?: EdwardsExtraOpts): EdwardsPointCons;
/**
 * Base class for prime-order points like Ristretto255 and Decaf448.
 * These points eliminate cofactor issues by representing equivalence classes
 * of Edwards curve points.
 */
export declare abstract class PrimeEdwardsPoint<T extends PrimeEdwardsPoint<T>> implements CurvePoint<bigint, T> {
    static BASE: PrimeEdwardsPoint<any>;
    static ZERO: PrimeEdwardsPoint<any>;
    static Fp: IField<bigint>;
    static Fn: IField<bigint>;
    protected readonly ep: EdwardsPoint;
    constructor(ep: EdwardsPoint);
    abstract toBytes(): Uint8Array;
    abstract equals(other: T): boolean;
    static fromBytes(_bytes: Uint8Array): any;
    static fromHex(_hex: Hex): any;
    get x(): bigint;
    get y(): bigint;
    clearCofactor(): T;
    assertValidity(): void;
    toAffine(invertedZ?: bigint): AffinePoint<bigint>;
    toHex(): string;
    toString(): string;
    isTorsionFree(): boolean;
    isSmallOrder(): boolean;
    add(other: T): T;
    subtract(other: T): T;
    multiply(scalar: bigint): T;
    multiplyUnsafe(scalar: bigint): T;
    double(): T;
    negate(): T;
    precompute(windowSize?: number, isLazy?: boolean): T;
    abstract is0(): boolean;
    protected abstract assertSame(other: T): void;
    protected abstract init(ep: EdwardsPoint): T;
    /** @deprecated use `toBytes` */
    toRawBytes(): Uint8Array;
}
/**
 * Initializes EdDSA signatures over given Edwards curve.
 */
export declare function eddsa(Point: EdwardsPointCons, cHash: FHash, eddsaOpts?: EdDSAOpts): EdDSA;
export type CurveType = BasicCurve<bigint> & {
    a: bigint;
    d: bigint;
    /** @deprecated the property will be removed in next release */
    hash: FHash;
    randomBytes?: (bytesLength?: number) => Uint8Array;
    adjustScalarBytes?: (bytes: Uint8Array) => Uint8Array;
    domain?: (data: Uint8Array, ctx: Uint8Array, phflag: boolean) => Uint8Array;
    uvRatio?: UVRatio;
    prehash?: FHash;
    mapToCurve?: (scalar: bigint[]) => AffinePoint<bigint>;
};
export type CurveTypeWithLength = Readonly<CurveType & Partial<NLength>>;
export type CurveFn = {
    /** @deprecated the property will be removed in next release */
    CURVE: CurveType;
    keygen: EdDSA['keygen'];
    getPublicKey: EdDSA['getPublicKey'];
    sign: EdDSA['sign'];
    verify: EdDSA['verify'];
    Point: EdwardsPointCons;
    /** @deprecated use `Point` */
    ExtendedPoint: EdwardsPointCons;
    utils: EdDSA['utils'];
    lengths: CurveLengths;
};
export type EdComposed = {
    CURVE: EdwardsOpts;
    curveOpts: EdwardsExtraOpts;
    hash: FHash;
    eddsaOpts: EdDSAOpts;
};
export declare function twistedEdwards(c: CurveTypeWithLength): CurveFn;
//# sourceMappingURL=edwards.d.ts.map