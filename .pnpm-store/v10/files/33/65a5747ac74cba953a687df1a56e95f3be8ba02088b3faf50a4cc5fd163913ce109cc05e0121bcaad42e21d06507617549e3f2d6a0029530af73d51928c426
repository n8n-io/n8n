/**
 * Twisted Edwards curve. The formula is: ax² + y² = 1 + dx²y².
 * For design rationale of types / exports, see weierstrass module documentation.
 * Untwisted Edwards curves exist, but they aren't used in real-world protocols.
 * @module
 */
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
import {
  _validateObject,
  _abool2 as abool,
  _abytes2 as abytes,
  aInRange,
  bytesToHex,
  bytesToNumberLE,
  concatBytes,
  copyBytes,
  ensureBytes,
  isBytes,
  memoized,
  notImplemented,
  randomBytes as randomBytesWeb,
  type FHash,
  type Hex,
} from '../utils.ts';
import {
  _createCurveFields,
  normalizeZ,
  pippenger,
  wNAF,
  type AffinePoint,
  type BasicCurve,
  type CurveLengths,
  type CurvePoint,
  type CurvePointCons,
} from './curve.ts';
import { Field, type IField, type NLength } from './modular.ts';

// Be friendly to bad ECMAScript parsers by not using bigint literals
// prettier-ignore
const _0n = BigInt(0), _1n = BigInt(1), _2n = BigInt(2), _8n = BigInt(8);

export type UVRatio = (u: bigint, v: bigint) => { isValid: boolean; value: bigint };

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
  uvRatio: (u: bigint, v: bigint) => { isValid: boolean; value: bigint };
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
  keygen: (seed?: Uint8Array) => { secretKey: Uint8Array; publicKey: Uint8Array };
  getPublicKey: (secretKey: Hex) => Uint8Array;
  sign: (message: Hex, secretKey: Hex, options?: { context?: Hex }) => Uint8Array;
  verify: (
    sig: Hex,
    message: Hex,
    publicKey: Hex,
    options?: { context?: Hex; zip215: boolean }
  ) => boolean;
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

function isEdValidXY(Fp: IField<bigint>, CURVE: EdwardsOpts, x: bigint, y: bigint): boolean {
  const x2 = Fp.sqr(x);
  const y2 = Fp.sqr(y);
  const left = Fp.add(Fp.mul(CURVE.a, x2), y2);
  const right = Fp.add(Fp.ONE, Fp.mul(CURVE.d, Fp.mul(x2, y2)));
  return Fp.eql(left, right);
}

export function edwards(params: EdwardsOpts, extraOpts: EdwardsExtraOpts = {}): EdwardsPointCons {
  const validated = _createCurveFields('edwards', params, extraOpts, extraOpts.FpFnLE);
  const { Fp, Fn } = validated;
  let CURVE = validated.CURVE as EdwardsOpts;
  const { h: cofactor } = CURVE;
  _validateObject(extraOpts, {}, { uvRatio: 'function' });

  // Important:
  // There are some places where Fp.BYTES is used instead of nByteLength.
  // So far, everything has been tested with curves of Fp.BYTES == nByteLength.
  // TODO: test and find curves which behave otherwise.
  const MASK = _2n << (BigInt(Fn.BYTES * 8) - _1n);
  const modP = (n: bigint) => Fp.create(n); // Function overrides

  // sqrt(u/v)
  const uvRatio =
    extraOpts.uvRatio ||
    ((u: bigint, v: bigint) => {
      try {
        return { isValid: true, value: Fp.sqrt(Fp.div(u, v)) };
      } catch (e) {
        return { isValid: false, value: _0n };
      }
    });

  // Validate whether the passed curve params are valid.
  // equation ax² + y² = 1 + dx²y² should work for generator point.
  if (!isEdValidXY(Fp, CURVE, CURVE.Gx, CURVE.Gy))
    throw new Error('bad curve params: generator point');

  /**
   * Asserts coordinate is valid: 0 <= n < MASK.
   * Coordinates >= Fp.ORDER are allowed for zip215.
   */
  function acoord(title: string, n: bigint, banZero = false) {
    const min = banZero ? _1n : _0n;
    aInRange('coordinate ' + title, n, min, MASK);
    return n;
  }

  function aextpoint(other: unknown) {
    if (!(other instanceof Point)) throw new Error('ExtendedPoint expected');
  }
  // Converts Extended point to default (x, y) coordinates.
  // Can accept precomputed Z^-1 - for example, from invertBatch.
  const toAffineMemo = memoized((p: Point, iz?: bigint): AffinePoint<bigint> => {
    const { X, Y, Z } = p;
    const is0 = p.is0();
    if (iz == null) iz = is0 ? _8n : (Fp.inv(Z) as bigint); // 8 was chosen arbitrarily
    const x = modP(X * iz);
    const y = modP(Y * iz);
    const zz = Fp.mul(Z, iz);
    if (is0) return { x: _0n, y: _1n };
    if (zz !== _1n) throw new Error('invZ was invalid');
    return { x, y };
  });
  const assertValidMemo = memoized((p: Point) => {
    const { a, d } = CURVE;
    if (p.is0()) throw new Error('bad point: ZERO'); // TODO: optimize, with vars below?
    // Equation in affine coordinates: ax² + y² = 1 + dx²y²
    // Equation in projective coordinates (X/Z, Y/Z, Z):  (aX² + Y²)Z² = Z⁴ + dX²Y²
    const { X, Y, Z, T } = p;
    const X2 = modP(X * X); // X²
    const Y2 = modP(Y * Y); // Y²
    const Z2 = modP(Z * Z); // Z²
    const Z4 = modP(Z2 * Z2); // Z⁴
    const aX2 = modP(X2 * a); // aX²
    const left = modP(Z2 * modP(aX2 + Y2)); // (aX² + Y²)Z²
    const right = modP(Z4 + modP(d * modP(X2 * Y2))); // Z⁴ + dX²Y²
    if (left !== right) throw new Error('bad point: equation left != right (1)');
    // In Extended coordinates we also have T, which is x*y=T/Z: check X*Y == Z*T
    const XY = modP(X * Y);
    const ZT = modP(Z * T);
    if (XY !== ZT) throw new Error('bad point: equation left != right (2)');
    return true;
  });

  // Extended Point works in extended coordinates: (X, Y, Z, T) ∋ (x=X/Z, y=Y/Z, T=xy).
  // https://en.wikipedia.org/wiki/Twisted_Edwards_curve#Extended_coordinates
  class Point implements EdwardsPoint {
    // base / generator point
    static readonly BASE = new Point(CURVE.Gx, CURVE.Gy, _1n, modP(CURVE.Gx * CURVE.Gy));
    // zero / infinity / identity point
    static readonly ZERO = new Point(_0n, _1n, _1n, _0n); // 0, 1, 1, 0
    // math field
    static readonly Fp = Fp;
    // scalar field
    static readonly Fn = Fn;

    readonly X: bigint;
    readonly Y: bigint;
    readonly Z: bigint;
    readonly T: bigint;

    constructor(X: bigint, Y: bigint, Z: bigint, T: bigint) {
      this.X = acoord('x', X);
      this.Y = acoord('y', Y);
      this.Z = acoord('z', Z, true);
      this.T = acoord('t', T);
      Object.freeze(this);
    }

    static CURVE(): EdwardsOpts {
      return CURVE;
    }

    static fromAffine(p: AffinePoint<bigint>): Point {
      if (p instanceof Point) throw new Error('extended point not allowed');
      const { x, y } = p || {};
      acoord('x', x);
      acoord('y', y);
      return new Point(x, y, _1n, modP(x * y));
    }

    // Uses algo from RFC8032 5.1.3.
    static fromBytes(bytes: Uint8Array, zip215 = false): Point {
      const len = Fp.BYTES;
      const { a, d } = CURVE;
      bytes = copyBytes(abytes(bytes, len, 'point'));
      abool(zip215, 'zip215');
      const normed = copyBytes(bytes); // copy again, we'll manipulate it
      const lastByte = bytes[len - 1]; // select last byte
      normed[len - 1] = lastByte & ~0x80; // clear last bit
      const y = bytesToNumberLE(normed);

      // zip215=true is good for consensus-critical apps. =false follows RFC8032 / NIST186-5.
      // RFC8032 prohibits >= p, but ZIP215 doesn't
      // zip215=true:  0 <= y < MASK (2^256 for ed25519)
      // zip215=false: 0 <= y < P (2^255-19 for ed25519)
      const max = zip215 ? MASK : Fp.ORDER;
      aInRange('point.y', y, _0n, max);

      // Ed25519: x² = (y²-1)/(dy²+1) mod p. Ed448: x² = (y²-1)/(dy²-1) mod p. Generic case:
      // ax²+y²=1+dx²y² => y²-1=dx²y²-ax² => y²-1=x²(dy²-a) => x²=(y²-1)/(dy²-a)
      const y2 = modP(y * y); // denominator is always non-0 mod p.
      const u = modP(y2 - _1n); // u = y² - 1
      const v = modP(d * y2 - a); // v = d y² + 1.
      let { isValid, value: x } = uvRatio(u, v); // √(u/v)
      if (!isValid) throw new Error('bad point: invalid y coordinate');
      const isXOdd = (x & _1n) === _1n; // There are 2 square roots. Use x_0 bit to select proper
      const isLastByteOdd = (lastByte & 0x80) !== 0; // x_0, last bit
      if (!zip215 && x === _0n && isLastByteOdd)
        // if x=0 and x_0 = 1, fail
        throw new Error('bad point: x=0 and x_0=1');
      if (isLastByteOdd !== isXOdd) x = modP(-x); // if x_0 != x mod 2, set x = p-x
      return Point.fromAffine({ x, y });
    }
    static fromHex(bytes: Uint8Array, zip215 = false): Point {
      return Point.fromBytes(ensureBytes('point', bytes), zip215);
    }

    get x(): bigint {
      return this.toAffine().x;
    }
    get y(): bigint {
      return this.toAffine().y;
    }

    precompute(windowSize: number = 8, isLazy = true) {
      wnaf.createCache(this, windowSize);
      if (!isLazy) this.multiply(_2n); // random number
      return this;
    }

    // Useful in fromAffine() - not for fromBytes(), which always created valid points.
    assertValidity(): void {
      assertValidMemo(this);
    }

    // Compare one point to another.
    equals(other: Point): boolean {
      aextpoint(other);
      const { X: X1, Y: Y1, Z: Z1 } = this;
      const { X: X2, Y: Y2, Z: Z2 } = other;
      const X1Z2 = modP(X1 * Z2);
      const X2Z1 = modP(X2 * Z1);
      const Y1Z2 = modP(Y1 * Z2);
      const Y2Z1 = modP(Y2 * Z1);
      return X1Z2 === X2Z1 && Y1Z2 === Y2Z1;
    }

    is0(): boolean {
      return this.equals(Point.ZERO);
    }

    negate(): Point {
      // Flips point sign to a negative one (-x, y in affine coords)
      return new Point(modP(-this.X), this.Y, this.Z, modP(-this.T));
    }

    // Fast algo for doubling Extended Point.
    // https://hyperelliptic.org/EFD/g1p/auto-twisted-extended.html#doubling-dbl-2008-hwcd
    // Cost: 4M + 4S + 1*a + 6add + 1*2.
    double(): Point {
      const { a } = CURVE;
      const { X: X1, Y: Y1, Z: Z1 } = this;
      const A = modP(X1 * X1); // A = X12
      const B = modP(Y1 * Y1); // B = Y12
      const C = modP(_2n * modP(Z1 * Z1)); // C = 2*Z12
      const D = modP(a * A); // D = a*A
      const x1y1 = X1 + Y1;
      const E = modP(modP(x1y1 * x1y1) - A - B); // E = (X1+Y1)2-A-B
      const G = D + B; // G = D+B
      const F = G - C; // F = G-C
      const H = D - B; // H = D-B
      const X3 = modP(E * F); // X3 = E*F
      const Y3 = modP(G * H); // Y3 = G*H
      const T3 = modP(E * H); // T3 = E*H
      const Z3 = modP(F * G); // Z3 = F*G
      return new Point(X3, Y3, Z3, T3);
    }

    // Fast algo for adding 2 Extended Points.
    // https://hyperelliptic.org/EFD/g1p/auto-twisted-extended.html#addition-add-2008-hwcd
    // Cost: 9M + 1*a + 1*d + 7add.
    add(other: Point) {
      aextpoint(other);
      const { a, d } = CURVE;
      const { X: X1, Y: Y1, Z: Z1, T: T1 } = this;
      const { X: X2, Y: Y2, Z: Z2, T: T2 } = other;
      const A = modP(X1 * X2); // A = X1*X2
      const B = modP(Y1 * Y2); // B = Y1*Y2
      const C = modP(T1 * d * T2); // C = T1*d*T2
      const D = modP(Z1 * Z2); // D = Z1*Z2
      const E = modP((X1 + Y1) * (X2 + Y2) - A - B); // E = (X1+Y1)*(X2+Y2)-A-B
      const F = D - C; // F = D-C
      const G = D + C; // G = D+C
      const H = modP(B - a * A); // H = B-a*A
      const X3 = modP(E * F); // X3 = E*F
      const Y3 = modP(G * H); // Y3 = G*H
      const T3 = modP(E * H); // T3 = E*H
      const Z3 = modP(F * G); // Z3 = F*G
      return new Point(X3, Y3, Z3, T3);
    }

    subtract(other: Point): Point {
      return this.add(other.negate());
    }

    // Constant-time multiplication.
    multiply(scalar: bigint): Point {
      // 1 <= scalar < L
      if (!Fn.isValidNot0(scalar)) throw new Error('invalid scalar: expected 1 <= sc < curve.n');
      const { p, f } = wnaf.cached(this, scalar, (p) => normalizeZ(Point, p));
      return normalizeZ(Point, [p, f])[0];
    }

    // Non-constant-time multiplication. Uses double-and-add algorithm.
    // It's faster, but should only be used when you don't care about
    // an exposed private key e.g. sig verification.
    // Does NOT allow scalars higher than CURVE.n.
    // Accepts optional accumulator to merge with multiply (important for sparse scalars)
    multiplyUnsafe(scalar: bigint, acc = Point.ZERO): Point {
      // 0 <= scalar < L
      if (!Fn.isValid(scalar)) throw new Error('invalid scalar: expected 0 <= sc < curve.n');
      if (scalar === _0n) return Point.ZERO;
      if (this.is0() || scalar === _1n) return this;
      return wnaf.unsafe(this, scalar, (p) => normalizeZ(Point, p), acc);
    }

    // Checks if point is of small order.
    // If you add something to small order point, you will have "dirty"
    // point with torsion component.
    // Multiplies point by cofactor and checks if the result is 0.
    isSmallOrder(): boolean {
      return this.multiplyUnsafe(cofactor).is0();
    }

    // Multiplies point by curve order and checks if the result is 0.
    // Returns `false` is the point is dirty.
    isTorsionFree(): boolean {
      return wnaf.unsafe(this, CURVE.n).is0();
    }

    // Converts Extended point to default (x, y) coordinates.
    // Can accept precomputed Z^-1 - for example, from invertBatch.
    toAffine(invertedZ?: bigint): AffinePoint<bigint> {
      return toAffineMemo(this, invertedZ);
    }

    clearCofactor(): Point {
      if (cofactor === _1n) return this;
      return this.multiplyUnsafe(cofactor);
    }

    toBytes(): Uint8Array {
      const { x, y } = this.toAffine();
      // Fp.toBytes() allows non-canonical encoding of y (>= p).
      const bytes = Fp.toBytes(y);
      // Each y has 2 valid points: (x, y), (x,-y).
      // When compressing, it's enough to store y and use the last byte to encode sign of x
      bytes[bytes.length - 1] |= x & _1n ? 0x80 : 0;
      return bytes;
    }
    toHex(): string {
      return bytesToHex(this.toBytes());
    }

    toString() {
      return `<Point ${this.is0() ? 'ZERO' : this.toHex()}>`;
    }

    // TODO: remove
    get ex(): bigint {
      return this.X;
    }
    get ey(): bigint {
      return this.Y;
    }
    get ez(): bigint {
      return this.Z;
    }
    get et(): bigint {
      return this.T;
    }
    static normalizeZ(points: Point[]): Point[] {
      return normalizeZ(Point, points);
    }
    static msm(points: Point[], scalars: bigint[]): Point {
      return pippenger(Point, Fn, points, scalars);
    }
    _setWindowSize(windowSize: number) {
      this.precompute(windowSize);
    }
    toRawBytes(): Uint8Array {
      return this.toBytes();
    }
  }
  const wnaf = new wNAF(Point, Fn.BITS);
  Point.BASE.precompute(8); // Enable precomputes. Slows down first publicKey computation by 20ms.
  return Point;
}

/**
 * Base class for prime-order points like Ristretto255 and Decaf448.
 * These points eliminate cofactor issues by representing equivalence classes
 * of Edwards curve points.
 */
export abstract class PrimeEdwardsPoint<T extends PrimeEdwardsPoint<T>>
  implements CurvePoint<bigint, T>
{
  static BASE: PrimeEdwardsPoint<any>;
  static ZERO: PrimeEdwardsPoint<any>;
  static Fp: IField<bigint>;
  static Fn: IField<bigint>;

  protected readonly ep: EdwardsPoint;

  constructor(ep: EdwardsPoint) {
    this.ep = ep;
  }

  // Abstract methods that must be implemented by subclasses
  abstract toBytes(): Uint8Array;
  abstract equals(other: T): boolean;

  // Static methods that must be implemented by subclasses
  static fromBytes(_bytes: Uint8Array): any {
    notImplemented();
  }

  static fromHex(_hex: Hex): any {
    notImplemented();
  }

  get x(): bigint {
    return this.toAffine().x;
  }
  get y(): bigint {
    return this.toAffine().y;
  }

  // Common implementations
  clearCofactor(): T {
    // no-op for prime-order groups
    return this as any;
  }

  assertValidity(): void {
    this.ep.assertValidity();
  }

  toAffine(invertedZ?: bigint): AffinePoint<bigint> {
    return this.ep.toAffine(invertedZ);
  }

  toHex(): string {
    return bytesToHex(this.toBytes());
  }

  toString(): string {
    return this.toHex();
  }

  isTorsionFree(): boolean {
    return true;
  }

  isSmallOrder(): boolean {
    return false;
  }

  add(other: T): T {
    this.assertSame(other);
    return this.init(this.ep.add(other.ep));
  }

  subtract(other: T): T {
    this.assertSame(other);
    return this.init(this.ep.subtract(other.ep));
  }

  multiply(scalar: bigint): T {
    return this.init(this.ep.multiply(scalar));
  }

  multiplyUnsafe(scalar: bigint): T {
    return this.init(this.ep.multiplyUnsafe(scalar));
  }

  double(): T {
    return this.init(this.ep.double());
  }

  negate(): T {
    return this.init(this.ep.negate());
  }

  precompute(windowSize?: number, isLazy?: boolean): T {
    return this.init(this.ep.precompute(windowSize, isLazy));
  }

  // Helper methods
  abstract is0(): boolean;
  protected abstract assertSame(other: T): void;
  protected abstract init(ep: EdwardsPoint): T;

  /** @deprecated use `toBytes` */
  toRawBytes(): Uint8Array {
    return this.toBytes();
  }
}

/**
 * Initializes EdDSA signatures over given Edwards curve.
 */
export function eddsa(Point: EdwardsPointCons, cHash: FHash, eddsaOpts: EdDSAOpts = {}): EdDSA {
  if (typeof cHash !== 'function') throw new Error('"hash" function param is required');
  _validateObject(
    eddsaOpts,
    {},
    {
      adjustScalarBytes: 'function',
      randomBytes: 'function',
      domain: 'function',
      prehash: 'function',
      mapToCurve: 'function',
    }
  );

  const { prehash } = eddsaOpts;
  const { BASE, Fp, Fn } = Point;

  const randomBytes = eddsaOpts.randomBytes || randomBytesWeb;
  const adjustScalarBytes = eddsaOpts.adjustScalarBytes || ((bytes: Uint8Array) => bytes);
  const domain =
    eddsaOpts.domain ||
    ((data: Uint8Array, ctx: Uint8Array, phflag: boolean) => {
      abool(phflag, 'phflag');
      if (ctx.length || phflag) throw new Error('Contexts/pre-hash are not supported');
      return data;
    }); // NOOP

  // Little-endian SHA512 with modulo n
  function modN_LE(hash: Uint8Array): bigint {
    return Fn.create(bytesToNumberLE(hash)); // Not Fn.fromBytes: it has length limit
  }

  // Get the hashed private scalar per RFC8032 5.1.5
  function getPrivateScalar(key: Hex) {
    const len = lengths.secretKey;
    key = ensureBytes('private key', key, len);
    // Hash private key with curve's hash function to produce uniformingly random input
    // Check byte lengths: ensure(64, h(ensure(32, key)))
    const hashed = ensureBytes('hashed private key', cHash(key), 2 * len);
    const head = adjustScalarBytes(hashed.slice(0, len)); // clear first half bits, produce FE
    const prefix = hashed.slice(len, 2 * len); // second half is called key prefix (5.1.6)
    const scalar = modN_LE(head); // The actual private scalar
    return { head, prefix, scalar };
  }

  /** Convenience method that creates public key from scalar. RFC8032 5.1.5 */
  function getExtendedPublicKey(secretKey: Hex) {
    const { head, prefix, scalar } = getPrivateScalar(secretKey);
    const point = BASE.multiply(scalar); // Point on Edwards curve aka public key
    const pointBytes = point.toBytes();
    return { head, prefix, scalar, point, pointBytes };
  }

  /** Calculates EdDSA pub key. RFC8032 5.1.5. */
  function getPublicKey(secretKey: Hex): Uint8Array {
    return getExtendedPublicKey(secretKey).pointBytes;
  }

  // int('LE', SHA512(dom2(F, C) || msgs)) mod N
  function hashDomainToScalar(context: Hex = Uint8Array.of(), ...msgs: Uint8Array[]) {
    const msg = concatBytes(...msgs);
    return modN_LE(cHash(domain(msg, ensureBytes('context', context), !!prehash)));
  }

  /** Signs message with privateKey. RFC8032 5.1.6 */
  function sign(msg: Hex, secretKey: Hex, options: { context?: Hex } = {}): Uint8Array {
    msg = ensureBytes('message', msg);
    if (prehash) msg = prehash(msg); // for ed25519ph etc.
    const { prefix, scalar, pointBytes } = getExtendedPublicKey(secretKey);
    const r = hashDomainToScalar(options.context, prefix, msg); // r = dom2(F, C) || prefix || PH(M)
    const R = BASE.multiply(r).toBytes(); // R = rG
    const k = hashDomainToScalar(options.context, R, pointBytes, msg); // R || A || PH(M)
    const s = Fn.create(r + k * scalar); // S = (r + k * s) mod L
    if (!Fn.isValid(s)) throw new Error('sign failed: invalid s'); // 0 <= s < L
    const rs = concatBytes(R, Fn.toBytes(s));
    return abytes(rs, lengths.signature, 'result');
  }

  // verification rule is either zip215 or rfc8032 / nist186-5. Consult fromHex:
  const verifyOpts: { context?: Hex; zip215?: boolean } = { zip215: true };

  /**
   * Verifies EdDSA signature against message and public key. RFC8032 5.1.7.
   * An extended group equation is checked.
   */
  function verify(sig: Hex, msg: Hex, publicKey: Hex, options = verifyOpts): boolean {
    const { context, zip215 } = options;
    const len = lengths.signature;
    sig = ensureBytes('signature', sig, len);
    msg = ensureBytes('message', msg);
    publicKey = ensureBytes('publicKey', publicKey, lengths.publicKey);
    if (zip215 !== undefined) abool(zip215, 'zip215');
    if (prehash) msg = prehash(msg); // for ed25519ph, etc

    const mid = len / 2;
    const r = sig.subarray(0, mid);
    const s = bytesToNumberLE(sig.subarray(mid, len));
    let A, R, SB;
    try {
      // zip215=true is good for consensus-critical apps. =false follows RFC8032 / NIST186-5.
      // zip215=true:  0 <= y < MASK (2^256 for ed25519)
      // zip215=false: 0 <= y < P (2^255-19 for ed25519)
      A = Point.fromBytes(publicKey, zip215);
      R = Point.fromBytes(r, zip215);
      SB = BASE.multiplyUnsafe(s); // 0 <= s < l is done inside
    } catch (error) {
      return false;
    }
    if (!zip215 && A.isSmallOrder()) return false; // zip215 allows public keys of small order

    const k = hashDomainToScalar(context, R.toBytes(), A.toBytes(), msg);
    const RkA = R.add(A.multiplyUnsafe(k));
    // Extended group equation
    // [8][S]B = [8]R + [8][k]A'
    return RkA.subtract(SB).clearCofactor().is0();
  }

  const _size = Fp.BYTES; // 32 for ed25519, 57 for ed448
  const lengths = {
    secretKey: _size,
    publicKey: _size,
    signature: 2 * _size,
    seed: _size,
  };
  function randomSecretKey(seed = randomBytes(lengths.seed)): Uint8Array {
    return abytes(seed, lengths.seed, 'seed');
  }
  function keygen(seed?: Uint8Array) {
    const secretKey = utils.randomSecretKey(seed);
    return { secretKey, publicKey: getPublicKey(secretKey) };
  }
  function isValidSecretKey(key: Uint8Array): boolean {
    return isBytes(key) && key.length === Fn.BYTES;
  }
  function isValidPublicKey(key: Uint8Array, zip215?: boolean): boolean {
    try {
      return !!Point.fromBytes(key, zip215);
    } catch (error) {
      return false;
    }
  }

  const utils = {
    getExtendedPublicKey,
    randomSecretKey,
    isValidSecretKey,
    isValidPublicKey,
    /**
     * Converts ed public key to x public key. Uses formula:
     * - ed25519:
     *   - `(u, v) = ((1+y)/(1-y), sqrt(-486664)*u/x)`
     *   - `(x, y) = (sqrt(-486664)*u/v, (u-1)/(u+1))`
     * - ed448:
     *   - `(u, v) = ((y-1)/(y+1), sqrt(156324)*u/x)`
     *   - `(x, y) = (sqrt(156324)*u/v, (1+u)/(1-u))`
     */
    toMontgomery(publicKey: Uint8Array): Uint8Array {
      const { y } = Point.fromBytes(publicKey);
      const size = lengths.publicKey;
      const is25519 = size === 32;
      if (!is25519 && size !== 57) throw new Error('only defined for 25519 and 448');
      const u = is25519 ? Fp.div(_1n + y, _1n - y) : Fp.div(y - _1n, y + _1n);
      return Fp.toBytes(u);
    },

    toMontgomerySecret(secretKey: Uint8Array): Uint8Array {
      const size = lengths.secretKey;
      abytes(secretKey, size);
      const hashed = cHash(secretKey.subarray(0, size));
      return adjustScalarBytes(hashed).subarray(0, size);
    },

    /** @deprecated */
    randomPrivateKey: randomSecretKey,
    /** @deprecated */
    precompute(windowSize = 8, point: EdwardsPoint = Point.BASE): EdwardsPoint {
      return point.precompute(windowSize, false);
    },
  };

  return Object.freeze({
    keygen,
    getPublicKey,
    sign,
    verify,
    utils,
    Point,
    lengths,
  });
}

// TODO: remove everything below
export type CurveType = BasicCurve<bigint> & {
  a: bigint; // curve param a
  d: bigint; // curve param d
  /** @deprecated the property will be removed in next release */
  hash: FHash; // Hashing
  randomBytes?: (bytesLength?: number) => Uint8Array; // CSPRNG
  adjustScalarBytes?: (bytes: Uint8Array) => Uint8Array; // clears bits to get valid field elemtn
  domain?: (data: Uint8Array, ctx: Uint8Array, phflag: boolean) => Uint8Array; // Used for hashing
  uvRatio?: UVRatio; // Ratio √(u/v)
  prehash?: FHash; // RFC 8032 pre-hashing of messages to sign() / verify()
  mapToCurve?: (scalar: bigint[]) => AffinePoint<bigint>; // for hash-to-curve standard
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
function _eddsa_legacy_opts_to_new(c: CurveTypeWithLength): EdComposed {
  const CURVE: EdwardsOpts = {
    a: c.a,
    d: c.d,
    p: c.Fp.ORDER,
    n: c.n,
    h: c.h,
    Gx: c.Gx,
    Gy: c.Gy,
  };
  const Fp = c.Fp;
  const Fn = Field(CURVE.n, c.nBitLength, true);
  const curveOpts: EdwardsExtraOpts = { Fp, Fn, uvRatio: c.uvRatio };
  const eddsaOpts: EdDSAOpts = {
    randomBytes: c.randomBytes,
    adjustScalarBytes: c.adjustScalarBytes,
    domain: c.domain,
    prehash: c.prehash,
    mapToCurve: c.mapToCurve,
  };
  return { CURVE, curveOpts, hash: c.hash, eddsaOpts };
}
function _eddsa_new_output_to_legacy(c: CurveTypeWithLength, eddsa: EdDSA): CurveFn {
  const Point = eddsa.Point;
  const legacy = Object.assign({}, eddsa, {
    ExtendedPoint: Point,
    CURVE: c,
    nBitLength: Point.Fn.BITS,
    nByteLength: Point.Fn.BYTES,
  });
  return legacy;
}
// TODO: remove. Use eddsa
export function twistedEdwards(c: CurveTypeWithLength): CurveFn {
  const { CURVE, curveOpts, hash, eddsaOpts } = _eddsa_legacy_opts_to_new(c);
  const Point = edwards(CURVE, curveOpts);
  const EDDSA = eddsa(Point, hash, eddsaOpts);
  return _eddsa_new_output_to_legacy(c, EDDSA);
}
