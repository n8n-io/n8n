import { type IField } from './modular.ts';
export type AffinePoint<T> = {
    x: T;
    y: T;
} & {
    Z?: never;
};
export interface Group<T extends Group<T>> {
    double(): T;
    negate(): T;
    add(other: T): T;
    subtract(other: T): T;
    equals(other: T): boolean;
    multiply(scalar: bigint): T;
    toAffine?(invertedZ?: any): AffinePoint<any>;
}
/** Base interface for all elliptic curve Points. */
export interface CurvePoint<F, P extends CurvePoint<F, P>> extends Group<P> {
    /** Affine x coordinate. Different from projective / extended X coordinate. */
    x: F;
    /** Affine y coordinate. Different from projective / extended Y coordinate. */
    y: F;
    Z?: F;
    double(): P;
    negate(): P;
    add(other: P): P;
    subtract(other: P): P;
    equals(other: P): boolean;
    multiply(scalar: bigint): P;
    assertValidity(): void;
    clearCofactor(): P;
    is0(): boolean;
    isTorsionFree(): boolean;
    isSmallOrder(): boolean;
    multiplyUnsafe(scalar: bigint): P;
    /**
     * Massively speeds up `p.multiply(n)` by using precompute tables (caching). See {@link wNAF}.
     * @param isLazy calculate cache now. Default (true) ensures it's deferred to first `multiply()`
     */
    precompute(windowSize?: number, isLazy?: boolean): P;
    /** Converts point to 2D xy affine coordinates */
    toAffine(invertedZ?: F): AffinePoint<F>;
    toBytes(): Uint8Array;
    toHex(): string;
}
/** Base interface for all elliptic curve Point constructors. */
export interface CurvePointCons<P extends CurvePoint<any, P>> {
    [Symbol.hasInstance]: (item: unknown) => boolean;
    BASE: P;
    ZERO: P;
    /** Field for basic curve math */
    Fp: IField<P_F<P>>;
    /** Scalar field, for scalars in multiply and others */
    Fn: IField<bigint>;
    /** Creates point from x, y. Does NOT validate if the point is valid. Use `.assertValidity()`. */
    fromAffine(p: AffinePoint<P_F<P>>): P;
    fromBytes(bytes: Uint8Array): P;
    fromHex(hex: Uint8Array | string): P;
}
/** Returns Fp type from Point (P_F<P> == P.F) */
export type P_F<P extends CurvePoint<any, P>> = P extends CurvePoint<infer F, P> ? F : never;
/** Returns Fp type from PointCons (PC_F<PC> == PC.P.F) */
export type PC_F<PC extends CurvePointCons<CurvePoint<any, any>>> = PC['Fp']['ZERO'];
/** Returns Point type from PointCons (PC_P<PC> == PC.P) */
export type PC_P<PC extends CurvePointCons<CurvePoint<any, any>>> = PC['ZERO'];
export type PC_ANY = CurvePointCons<CurvePoint<any, CurvePoint<any, CurvePoint<any, CurvePoint<any, CurvePoint<any, CurvePoint<any, CurvePoint<any, CurvePoint<any, CurvePoint<any, CurvePoint<any, any>>>>>>>>>>>;
export interface CurveLengths {
    secretKey?: number;
    publicKey?: number;
    publicKeyUncompressed?: number;
    publicKeyHasPrefix?: boolean;
    signature?: number;
    seed?: number;
}
export type GroupConstructor<T> = {
    BASE: T;
    ZERO: T;
};
/** @deprecated */
export type ExtendedGroupConstructor<T> = GroupConstructor<T> & {
    Fp: IField<any>;
    Fn: IField<bigint>;
    fromAffine(ap: AffinePoint<any>): T;
};
export type Mapper<T> = (i: T[]) => T[];
export declare function negateCt<T extends {
    negate: () => T;
}>(condition: boolean, item: T): T;
/**
 * Takes a bunch of Projective Points but executes only one
 * inversion on all of them. Inversion is very slow operation,
 * so this improves performance massively.
 * Optimization: converts a list of projective points to a list of identical points with Z=1.
 */
export declare function normalizeZ<P extends CurvePoint<any, P>, PC extends CurvePointCons<P>>(c: PC, points: P[]): P[];
/** Internal wNAF opts for specific W and scalarBits */
export type WOpts = {
    windows: number;
    windowSize: number;
    mask: bigint;
    maxNumber: number;
    shiftBy: bigint;
};
/**
 * Elliptic curve multiplication of Point by scalar. Fragile.
 * Table generation takes **30MB of ram and 10ms on high-end CPU**,
 * but may take much longer on slow devices. Actual generation will happen on
 * first call of `multiply()`. By default, `BASE` point is precomputed.
 *
 * Scalars should always be less than curve order: this should be checked inside of a curve itself.
 * Creates precomputation tables for fast multiplication:
 * - private scalar is split by fixed size windows of W bits
 * - every window point is collected from window's table & added to accumulator
 * - since windows are different, same point inside tables won't be accessed more than once per calc
 * - each multiplication is 'Math.ceil(CURVE_ORDER / 𝑊) + 1' point additions (fixed for any scalar)
 * - +1 window is neccessary for wNAF
 * - wNAF reduces table size: 2x less memory + 2x faster generation, but 10% slower multiplication
 *
 * @todo Research returning 2d JS array of windows, instead of a single window.
 * This would allow windows to be in different memory locations
 */
export declare class wNAF<PC extends PC_ANY> {
    private readonly BASE;
    private readonly ZERO;
    private readonly Fn;
    readonly bits: number;
    constructor(Point: PC, bits: number);
    _unsafeLadder(elm: PC_P<PC>, n: bigint, p?: PC_P<PC>): PC_P<PC>;
    /**
     * Creates a wNAF precomputation window. Used for caching.
     * Default window size is set by `utils.precompute()` and is equal to 8.
     * Number of precomputed points depends on the curve size:
     * 2^(𝑊−1) * (Math.ceil(𝑛 / 𝑊) + 1), where:
     * - 𝑊 is the window size
     * - 𝑛 is the bitlength of the curve order.
     * For a 256-bit curve and window size 8, the number of precomputed points is 128 * 33 = 4224.
     * @param point Point instance
     * @param W window size
     * @returns precomputed point tables flattened to a single array
     */
    private precomputeWindow;
    /**
     * Implements ec multiplication using precomputed tables and w-ary non-adjacent form.
     * More compact implementation:
     * https://github.com/paulmillr/noble-secp256k1/blob/47cb1669b6e506ad66b35fe7d76132ae97465da2/index.ts#L502-L541
     * @returns real and fake (for const-time) points
     */
    private wNAF;
    /**
     * Implements ec unsafe (non const-time) multiplication using precomputed tables and w-ary non-adjacent form.
     * @param acc accumulator point to add result of multiplication
     * @returns point
     */
    private wNAFUnsafe;
    private getPrecomputes;
    cached(point: PC_P<PC>, scalar: bigint, transform?: Mapper<PC_P<PC>>): {
        p: PC_P<PC>;
        f: PC_P<PC>;
    };
    unsafe(point: PC_P<PC>, scalar: bigint, transform?: Mapper<PC_P<PC>>, prev?: PC_P<PC>): PC_P<PC>;
    createCache(P: PC_P<PC>, W: number): void;
    hasCache(elm: PC_P<PC>): boolean;
}
/**
 * Endomorphism-specific multiplication for Koblitz curves.
 * Cost: 128 dbl, 0-256 adds.
 */
export declare function mulEndoUnsafe<P extends CurvePoint<any, P>, PC extends CurvePointCons<P>>(Point: PC, point: P, k1: bigint, k2: bigint): {
    p1: P;
    p2: P;
};
/**
 * Pippenger algorithm for multi-scalar multiplication (MSM, Pa + Qb + Rc + ...).
 * 30x faster vs naive addition on L=4096, 10x faster than precomputes.
 * For N=254bit, L=1, it does: 1024 ADD + 254 DBL. For L=5: 1536 ADD + 254 DBL.
 * Algorithmically constant-time (for same L), even when 1 point + scalar, or when scalar = 0.
 * @param c Curve Point constructor
 * @param fieldN field over CURVE.N - important that it's not over CURVE.P
 * @param points array of L curve points
 * @param scalars array of L scalars (aka secret keys / bigints)
 */
export declare function pippenger<P extends CurvePoint<any, P>, PC extends CurvePointCons<P>>(c: PC, fieldN: IField<bigint>, points: P[], scalars: bigint[]): P;
/**
 * Precomputed multi-scalar multiplication (MSM, Pa + Qb + Rc + ...).
 * @param c Curve Point constructor
 * @param fieldN field over CURVE.N - important that it's not over CURVE.P
 * @param points array of L curve points
 * @returns function which multiplies points with scaars
 */
export declare function precomputeMSMUnsafe<P extends CurvePoint<any, P>, PC extends CurvePointCons<P>>(c: PC, fieldN: IField<bigint>, points: P[], windowSize: number): (scalars: bigint[]) => P;
/**
 * Generic BasicCurve interface: works even for polynomial fields (BLS): P, n, h would be ok.
 * Though generator can be different (Fp2 / Fp6 for BLS).
 */
export type BasicCurve<T> = {
    Fp: IField<T>;
    n: bigint;
    nBitLength?: number;
    nByteLength?: number;
    h: bigint;
    hEff?: bigint;
    Gx: T;
    Gy: T;
    allowInfinityPoint?: boolean;
};
/** @deprecated */
export declare function validateBasic<FP, T>(curve: BasicCurve<FP> & T): Readonly<{
    readonly nBitLength: number;
    readonly nByteLength: number;
} & BasicCurve<FP> & T & {
    p: bigint;
}>;
export type ValidCurveParams<T> = {
    p: bigint;
    n: bigint;
    h: bigint;
    a: T;
    b?: T;
    d?: T;
    Gx: T;
    Gy: T;
};
export type FpFn<T> = {
    Fp: IField<T>;
    Fn: IField<bigint>;
};
/** Validates CURVE opts and creates fields */
export declare function _createCurveFields<T>(type: 'weierstrass' | 'edwards', CURVE: ValidCurveParams<T>, curveOpts?: Partial<FpFn<T>>, FpFnLE?: boolean): FpFn<T> & {
    CURVE: ValidCurveParams<T>;
};
//# sourceMappingURL=curve.d.ts.map