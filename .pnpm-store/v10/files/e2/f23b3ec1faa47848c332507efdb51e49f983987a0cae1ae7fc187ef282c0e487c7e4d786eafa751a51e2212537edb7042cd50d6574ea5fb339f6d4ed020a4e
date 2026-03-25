/**
 * Methods for elliptic curve multiplication by scalars.
 * Contains wNAF, pippenger.
 * @module
 */
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
import { bitLen, bitMask, validateObject } from '../utils.ts';
import { Field, FpInvertBatch, nLength, validateField, type IField } from './modular.ts';

const _0n = BigInt(0);
const _1n = BigInt(1);

export type AffinePoint<T> = {
  x: T;
  y: T;
} & { Z?: never };

// This was initialy do this way to re-use montgomery ladder in field (add->mul,double->sqr), but
// that didn't happen and there is probably not much reason to have separate Group like this?
export interface Group<T extends Group<T>> {
  double(): T;
  negate(): T;
  add(other: T): T;
  subtract(other: T): T;
  equals(other: T): boolean;
  multiply(scalar: bigint): T;
  toAffine?(invertedZ?: any): AffinePoint<any>;
}

// We can't "abstract out" coordinates (X, Y, Z; and T in Edwards): argument names of constructor
// are not accessible. See Typescript gh-56093, gh-41594.
//
// We have to use recursive types, so it will return actual point, not constained `CurvePoint`.
// If, at any point, P is `any`, it will erase all types and replace it
// with `any`, because of recursion, `any implements CurvePoint`,
// but we lose all constrains on methods.

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

// Type inference helpers: PC - PointConstructor, P - Point, Fp - Field element
// Short names, because we use them a lot in result types:
// * we can't do 'P = GetCurvePoint<PC>': this is default value and doesn't constrain anything
// * we can't do 'type X = GetCurvePoint<PC>': it won't be accesible for arguments/return types
// * `CurvePointCons<P extends CurvePoint<any, P>>` constraints from interface definition
//   won't propagate, if `PC extends CurvePointCons<any>`: the P would be 'any', which is incorrect
// * PC could be super specific with super specific P, which implements CurvePoint<any, P>.
//   this means we need to do stuff like
//   `function test<P extends CurvePoint<any, P>, PC extends CurvePointCons<P>>(`
//   if we want type safety around P, otherwise PC_P<PC> will be any

/** Returns Fp type from Point (P_F<P> == P.F) */
export type P_F<P extends CurvePoint<any, P>> = P extends CurvePoint<infer F, P> ? F : never;
/** Returns Fp type from PointCons (PC_F<PC> == PC.P.F) */
export type PC_F<PC extends CurvePointCons<CurvePoint<any, any>>> = PC['Fp']['ZERO'];
/** Returns Point type from PointCons (PC_P<PC> == PC.P) */
export type PC_P<PC extends CurvePointCons<CurvePoint<any, any>>> = PC['ZERO'];

// Ugly hack to get proper type inference, because in typescript fails to infer resursively.
// The hack allows to do up to 10 chained operations without applying type erasure.
//
// Types which won't work:
// * `CurvePointCons<CurvePoint<any, any>>`, will return `any` after 1 operation
// * `CurvePointCons<any>: WeierstrassPointCons<bigint> extends CurvePointCons<any> = false`
// * `P extends CurvePoint, PC extends CurvePointCons<P>`
//     * It can't infer P from PC alone
//     * Too many relations between F, P & PC
//     * It will infer P/F if `arg: CurvePointCons<F, P>`, but will fail if PC is generic
//     * It will work correctly if there is an additional argument of type P
//     * But generally, we don't want to parametrize `CurvePointCons` over `F`: it will complicate
//       types, making them un-inferable
// prettier-ignore
export type PC_ANY = CurvePointCons<
  CurvePoint<any,
  CurvePoint<any,
  CurvePoint<any,
  CurvePoint<any,
  CurvePoint<any,
  CurvePoint<any,
  CurvePoint<any,
  CurvePoint<any,
  CurvePoint<any,
  CurvePoint<any, any>
  >>>>>>>>>
>;

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

export function negateCt<T extends { negate: () => T }>(condition: boolean, item: T): T {
  const neg = item.negate();
  return condition ? neg : item;
}

/**
 * Takes a bunch of Projective Points but executes only one
 * inversion on all of them. Inversion is very slow operation,
 * so this improves performance massively.
 * Optimization: converts a list of projective points to a list of identical points with Z=1.
 */
export function normalizeZ<P extends CurvePoint<any, P>, PC extends CurvePointCons<P>>(
  c: PC,
  points: P[]
): P[] {
  const invertedZs = FpInvertBatch(
    c.Fp,
    points.map((p) => p.Z!)
  );
  return points.map((p, i) => c.fromAffine(p.toAffine(invertedZs[i])));
}

function validateW(W: number, bits: number) {
  if (!Number.isSafeInteger(W) || W <= 0 || W > bits)
    throw new Error('invalid window size, expected [1..' + bits + '], got W=' + W);
}

/** Internal wNAF opts for specific W and scalarBits */
export type WOpts = {
  windows: number;
  windowSize: number;
  mask: bigint;
  maxNumber: number;
  shiftBy: bigint;
};

function calcWOpts(W: number, scalarBits: number): WOpts {
  validateW(W, scalarBits);
  const windows = Math.ceil(scalarBits / W) + 1; // W=8 33. Not 32, because we skip zero
  const windowSize = 2 ** (W - 1); // W=8 128. Not 256, because we skip zero
  const maxNumber = 2 ** W; // W=8 256
  const mask = bitMask(W); // W=8 255 == mask 0b11111111
  const shiftBy = BigInt(W); // W=8 8
  return { windows, windowSize, mask, maxNumber, shiftBy };
}

function calcOffsets(n: bigint, window: number, wOpts: WOpts) {
  const { windowSize, mask, maxNumber, shiftBy } = wOpts;
  let wbits = Number(n & mask); // extract W bits.
  let nextN = n >> shiftBy; // shift number by W bits.

  // What actually happens here:
  // const highestBit = Number(mask ^ (mask >> 1n));
  // let wbits2 = wbits - 1; // skip zero
  // if (wbits2 & highestBit) { wbits2 ^= Number(mask); // (~);

  // split if bits > max: +224 => 256-32
  if (wbits > windowSize) {
    // we skip zero, which means instead of `>= size-1`, we do `> size`
    wbits -= maxNumber; // -32, can be maxNumber - wbits, but then we need to set isNeg here.
    nextN += _1n; // +256 (carry)
  }
  const offsetStart = window * windowSize;
  const offset = offsetStart + Math.abs(wbits) - 1; // -1 because we skip zero
  const isZero = wbits === 0; // is current window slice a 0?
  const isNeg = wbits < 0; // is current window slice negative?
  const isNegF = window % 2 !== 0; // fake random statement for noise
  const offsetF = offsetStart; // fake offset for noise
  return { nextN, offset, isZero, isNeg, isNegF, offsetF };
}

function validateMSMPoints(points: any[], c: any) {
  if (!Array.isArray(points)) throw new Error('array expected');
  points.forEach((p, i) => {
    if (!(p instanceof c)) throw new Error('invalid point at index ' + i);
  });
}
function validateMSMScalars(scalars: any[], field: any) {
  if (!Array.isArray(scalars)) throw new Error('array of scalars expected');
  scalars.forEach((s, i) => {
    if (!field.isValid(s)) throw new Error('invalid scalar at index ' + i);
  });
}

// Since points in different groups cannot be equal (different object constructor),
// we can have single place to store precomputes.
// Allows to make points frozen / immutable.
const pointPrecomputes = new WeakMap<any, any[]>();
const pointWindowSizes = new WeakMap<any, number>();

function getW(P: any): number {
  // To disable precomputes:
  // return 1;
  return pointWindowSizes.get(P) || 1;
}

function assert0(n: bigint): void {
  if (n !== _0n) throw new Error('invalid wNAF');
}

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
export class wNAF<PC extends PC_ANY> {
  private readonly BASE: PC_P<PC>;
  private readonly ZERO: PC_P<PC>;
  private readonly Fn: PC['Fn'];
  readonly bits: number;

  // Parametrized with a given Point class (not individual point)
  constructor(Point: PC, bits: number) {
    this.BASE = Point.BASE;
    this.ZERO = Point.ZERO;
    this.Fn = Point.Fn;
    this.bits = bits;
  }

  // non-const time multiplication ladder
  _unsafeLadder(elm: PC_P<PC>, n: bigint, p: PC_P<PC> = this.ZERO): PC_P<PC> {
    let d: PC_P<PC> = elm;
    while (n > _0n) {
      if (n & _1n) p = p.add(d);
      d = d.double();
      n >>= _1n;
    }
    return p;
  }

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
  private precomputeWindow(point: PC_P<PC>, W: number): PC_P<PC>[] {
    const { windows, windowSize } = calcWOpts(W, this.bits);
    const points: PC_P<PC>[] = [];
    let p: PC_P<PC> = point;
    let base = p;
    for (let window = 0; window < windows; window++) {
      base = p;
      points.push(base);
      // i=1, bc we skip 0
      for (let i = 1; i < windowSize; i++) {
        base = base.add(p);
        points.push(base);
      }
      p = base.double();
    }
    return points;
  }

  /**
   * Implements ec multiplication using precomputed tables and w-ary non-adjacent form.
   * More compact implementation:
   * https://github.com/paulmillr/noble-secp256k1/blob/47cb1669b6e506ad66b35fe7d76132ae97465da2/index.ts#L502-L541
   * @returns real and fake (for const-time) points
   */
  private wNAF(W: number, precomputes: PC_P<PC>[], n: bigint): { p: PC_P<PC>; f: PC_P<PC> } {
    // Scalar should be smaller than field order
    if (!this.Fn.isValid(n)) throw new Error('invalid scalar');
    // Accumulators
    let p = this.ZERO;
    let f = this.BASE;
    // This code was first written with assumption that 'f' and 'p' will never be infinity point:
    // since each addition is multiplied by 2 ** W, it cannot cancel each other. However,
    // there is negate now: it is possible that negated element from low value
    // would be the same as high element, which will create carry into next window.
    // It's not obvious how this can fail, but still worth investigating later.
    const wo = calcWOpts(W, this.bits);
    for (let window = 0; window < wo.windows; window++) {
      // (n === _0n) is handled and not early-exited. isEven and offsetF are used for noise
      const { nextN, offset, isZero, isNeg, isNegF, offsetF } = calcOffsets(n, window, wo);
      n = nextN;
      if (isZero) {
        // bits are 0: add garbage to fake point
        // Important part for const-time getPublicKey: add random "noise" point to f.
        f = f.add(negateCt(isNegF, precomputes[offsetF]));
      } else {
        // bits are 1: add to result point
        p = p.add(negateCt(isNeg, precomputes[offset]));
      }
    }
    assert0(n);
    // Return both real and fake points: JIT won't eliminate f.
    // At this point there is a way to F be infinity-point even if p is not,
    // which makes it less const-time: around 1 bigint multiply.
    return { p, f };
  }

  /**
   * Implements ec unsafe (non const-time) multiplication using precomputed tables and w-ary non-adjacent form.
   * @param acc accumulator point to add result of multiplication
   * @returns point
   */
  private wNAFUnsafe(
    W: number,
    precomputes: PC_P<PC>[],
    n: bigint,
    acc: PC_P<PC> = this.ZERO
  ): PC_P<PC> {
    const wo = calcWOpts(W, this.bits);
    for (let window = 0; window < wo.windows; window++) {
      if (n === _0n) break; // Early-exit, skip 0 value
      const { nextN, offset, isZero, isNeg } = calcOffsets(n, window, wo);
      n = nextN;
      if (isZero) {
        // Window bits are 0: skip processing.
        // Move to next window.
        continue;
      } else {
        const item = precomputes[offset];
        acc = acc.add(isNeg ? item.negate() : item); // Re-using acc allows to save adds in MSM
      }
    }
    assert0(n);
    return acc;
  }

  private getPrecomputes(W: number, point: PC_P<PC>, transform?: Mapper<PC_P<PC>>): PC_P<PC>[] {
    // Calculate precomputes on a first run, reuse them after
    let comp = pointPrecomputes.get(point);
    if (!comp) {
      comp = this.precomputeWindow(point, W) as PC_P<PC>[];
      if (W !== 1) {
        // Doing transform outside of if brings 15% perf hit
        if (typeof transform === 'function') comp = transform(comp);
        pointPrecomputes.set(point, comp);
      }
    }
    return comp;
  }

  cached(
    point: PC_P<PC>,
    scalar: bigint,
    transform?: Mapper<PC_P<PC>>
  ): { p: PC_P<PC>; f: PC_P<PC> } {
    const W = getW(point);
    return this.wNAF(W, this.getPrecomputes(W, point, transform), scalar);
  }

  unsafe(point: PC_P<PC>, scalar: bigint, transform?: Mapper<PC_P<PC>>, prev?: PC_P<PC>): PC_P<PC> {
    const W = getW(point);
    if (W === 1) return this._unsafeLadder(point, scalar, prev); // For W=1 ladder is ~x2 faster
    return this.wNAFUnsafe(W, this.getPrecomputes(W, point, transform), scalar, prev);
  }

  // We calculate precomputes for elliptic curve point multiplication
  // using windowed method. This specifies window size and
  // stores precomputed values. Usually only base point would be precomputed.
  createCache(P: PC_P<PC>, W: number): void {
    validateW(W, this.bits);
    pointWindowSizes.set(P, W);
    pointPrecomputes.delete(P);
  }

  hasCache(elm: PC_P<PC>): boolean {
    return getW(elm) !== 1;
  }
}

/**
 * Endomorphism-specific multiplication for Koblitz curves.
 * Cost: 128 dbl, 0-256 adds.
 */
export function mulEndoUnsafe<P extends CurvePoint<any, P>, PC extends CurvePointCons<P>>(
  Point: PC,
  point: P,
  k1: bigint,
  k2: bigint
): { p1: P; p2: P } {
  let acc = point;
  let p1 = Point.ZERO;
  let p2 = Point.ZERO;
  while (k1 > _0n || k2 > _0n) {
    if (k1 & _1n) p1 = p1.add(acc);
    if (k2 & _1n) p2 = p2.add(acc);
    acc = acc.double();
    k1 >>= _1n;
    k2 >>= _1n;
  }
  return { p1, p2 };
}

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
export function pippenger<P extends CurvePoint<any, P>, PC extends CurvePointCons<P>>(
  c: PC,
  fieldN: IField<bigint>,
  points: P[],
  scalars: bigint[]
): P {
  // If we split scalars by some window (let's say 8 bits), every chunk will only
  // take 256 buckets even if there are 4096 scalars, also re-uses double.
  // TODO:
  // - https://eprint.iacr.org/2024/750.pdf
  // - https://tches.iacr.org/index.php/TCHES/article/view/10287
  // 0 is accepted in scalars
  validateMSMPoints(points, c);
  validateMSMScalars(scalars, fieldN);
  const plength = points.length;
  const slength = scalars.length;
  if (plength !== slength) throw new Error('arrays of points and scalars must have equal length');
  // if (plength === 0) throw new Error('array must be of length >= 2');
  const zero = c.ZERO;
  const wbits = bitLen(BigInt(plength));
  let windowSize = 1; // bits
  if (wbits > 12) windowSize = wbits - 3;
  else if (wbits > 4) windowSize = wbits - 2;
  else if (wbits > 0) windowSize = 2;
  const MASK = bitMask(windowSize);
  const buckets = new Array(Number(MASK) + 1).fill(zero); // +1 for zero array
  const lastBits = Math.floor((fieldN.BITS - 1) / windowSize) * windowSize;
  let sum = zero;
  for (let i = lastBits; i >= 0; i -= windowSize) {
    buckets.fill(zero);
    for (let j = 0; j < slength; j++) {
      const scalar = scalars[j];
      const wbits = Number((scalar >> BigInt(i)) & MASK);
      buckets[wbits] = buckets[wbits].add(points[j]);
    }
    let resI = zero; // not using this will do small speed-up, but will lose ct
    // Skip first bucket, because it is zero
    for (let j = buckets.length - 1, sumI = zero; j > 0; j--) {
      sumI = sumI.add(buckets[j]);
      resI = resI.add(sumI);
    }
    sum = sum.add(resI);
    if (i !== 0) for (let j = 0; j < windowSize; j++) sum = sum.double();
  }
  return sum as P;
}
/**
 * Precomputed multi-scalar multiplication (MSM, Pa + Qb + Rc + ...).
 * @param c Curve Point constructor
 * @param fieldN field over CURVE.N - important that it's not over CURVE.P
 * @param points array of L curve points
 * @returns function which multiplies points with scaars
 */
export function precomputeMSMUnsafe<P extends CurvePoint<any, P>, PC extends CurvePointCons<P>>(
  c: PC,
  fieldN: IField<bigint>,
  points: P[],
  windowSize: number
): (scalars: bigint[]) => P {
  /**
   * Performance Analysis of Window-based Precomputation
   *
   * Base Case (256-bit scalar, 8-bit window):
   * - Standard precomputation requires:
   *   - 31 additions per scalar × 256 scalars = 7,936 ops
   *   - Plus 255 summary additions = 8,191 total ops
   *   Note: Summary additions can be optimized via accumulator
   *
   * Chunked Precomputation Analysis:
   * - Using 32 chunks requires:
   *   - 255 additions per chunk
   *   - 256 doublings
   *   - Total: (255 × 32) + 256 = 8,416 ops
   *
   * Memory Usage Comparison:
   * Window Size | Standard Points | Chunked Points
   * ------------|-----------------|---------------
   *     4-bit   |     520         |      15
   *     8-bit   |    4,224        |     255
   *    10-bit   |   13,824        |   1,023
   *    16-bit   |  557,056        |  65,535
   *
   * Key Advantages:
   * 1. Enables larger window sizes due to reduced memory overhead
   * 2. More efficient for smaller scalar counts:
   *    - 16 chunks: (16 × 255) + 256 = 4,336 ops
   *    - ~2x faster than standard 8,191 ops
   *
   * Limitations:
   * - Not suitable for plain precomputes (requires 256 constant doublings)
   * - Performance degrades with larger scalar counts:
   *   - Optimal for ~256 scalars
   *   - Less efficient for 4096+ scalars (Pippenger preferred)
   */
  validateW(windowSize, fieldN.BITS);
  validateMSMPoints(points, c);
  const zero = c.ZERO;
  const tableSize = 2 ** windowSize - 1; // table size (without zero)
  const chunks = Math.ceil(fieldN.BITS / windowSize); // chunks of item
  const MASK = bitMask(windowSize);
  const tables = points.map((p: P) => {
    const res = [];
    for (let i = 0, acc = p; i < tableSize; i++) {
      res.push(acc);
      acc = acc.add(p);
    }
    return res;
  });
  return (scalars: bigint[]): P => {
    validateMSMScalars(scalars, fieldN);
    if (scalars.length > points.length)
      throw new Error('array of scalars must be smaller than array of points');
    let res = zero;
    for (let i = 0; i < chunks; i++) {
      // No need to double if accumulator is still zero.
      if (res !== zero) for (let j = 0; j < windowSize; j++) res = res.double();
      const shiftBy = BigInt(chunks * windowSize - (i + 1) * windowSize);
      for (let j = 0; j < scalars.length; j++) {
        const n = scalars[j];
        const curr = Number((n >> shiftBy) & MASK);
        if (!curr) continue; // skip zero scalars chunks
        res = res.add(tables[j][curr - 1]);
      }
    }
    return res;
  };
}

// TODO: remove
/**
 * Generic BasicCurve interface: works even for polynomial fields (BLS): P, n, h would be ok.
 * Though generator can be different (Fp2 / Fp6 for BLS).
 */
export type BasicCurve<T> = {
  Fp: IField<T>; // Field over which we'll do calculations (Fp)
  n: bigint; // Curve order, total count of valid points in the field
  nBitLength?: number; // bit length of curve order
  nByteLength?: number; // byte length of curve order
  h: bigint; // cofactor. we can assign default=1, but users will just ignore it w/o validation
  hEff?: bigint; // Number to multiply to clear cofactor
  Gx: T; // base point X coordinate
  Gy: T; // base point Y coordinate
  allowInfinityPoint?: boolean; // bls12-381 requires it. ZERO point is valid, but invalid pubkey
};

// TODO: remove
/** @deprecated */
export function validateBasic<FP, T>(
  curve: BasicCurve<FP> & T
): Readonly<
  {
    readonly nBitLength: number;
    readonly nByteLength: number;
  } & BasicCurve<FP> &
    T & {
      p: bigint;
    }
> {
  validateField(curve.Fp);
  validateObject(
    curve,
    {
      n: 'bigint',
      h: 'bigint',
      Gx: 'field',
      Gy: 'field',
    },
    {
      nBitLength: 'isSafeInteger',
      nByteLength: 'isSafeInteger',
    }
  );
  // Set defaults
  return Object.freeze({
    ...nLength(curve.n, curve.nBitLength),
    ...curve,
    ...{ p: curve.Fp.ORDER },
  } as const);
}

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

function createField<T>(order: bigint, field?: IField<T>, isLE?: boolean): IField<T> {
  if (field) {
    if (field.ORDER !== order) throw new Error('Field.ORDER must match order: Fp == p, Fn == n');
    validateField(field);
    return field;
  } else {
    return Field(order, { isLE }) as unknown as IField<T>;
  }
}
export type FpFn<T> = { Fp: IField<T>; Fn: IField<bigint> };

/** Validates CURVE opts and creates fields */
export function _createCurveFields<T>(
  type: 'weierstrass' | 'edwards',
  CURVE: ValidCurveParams<T>,
  curveOpts: Partial<FpFn<T>> = {},
  FpFnLE?: boolean
): FpFn<T> & { CURVE: ValidCurveParams<T> } {
  if (FpFnLE === undefined) FpFnLE = type === 'edwards';
  if (!CURVE || typeof CURVE !== 'object') throw new Error(`expected valid ${type} CURVE object`);
  for (const p of ['p', 'n', 'h'] as const) {
    const val = CURVE[p];
    if (!(typeof val === 'bigint' && val > _0n))
      throw new Error(`CURVE.${p} must be positive bigint`);
  }
  const Fp = createField(CURVE.p, curveOpts.Fp, FpFnLE);
  const Fn = createField(CURVE.n, curveOpts.Fn, FpFnLE);
  const _b: 'b' | 'd' = type === 'weierstrass' ? 'b' : 'd';
  const params = ['Gx', 'Gy', 'a', _b] as const;
  for (const p of params) {
    // @ts-ignore
    if (!Fp.isValid(CURVE[p]))
      throw new Error(`CURVE.${p} must be valid field element of CURVE.Fp`);
  }
  CURVE = Object.freeze(Object.assign({}, CURVE));
  return { CURVE, Fp, Fn };
}
