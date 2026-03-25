/**
 * Experimental implementation of NTT / FFT (Fast Fourier Transform) over finite fields.
 * API may change at any time. The code has not been audited. Feature requests are welcome.
 * @module
 */
import type { IField } from './modular.ts';

export interface MutableArrayLike<T> {
  [index: number]: T;
  length: number;
  slice(start?: number, end?: number): this;
  [Symbol.iterator](): Iterator<T>;
}

function checkU32(n: number) {
  // 0xff_ff_ff_ff
  if (!Number.isSafeInteger(n) || n < 0 || n > 0xffffffff)
    throw new Error('wrong u32 integer:' + n);
  return n;
}

/** Checks if integer is in form of `1 << X` */
export function isPowerOfTwo(x: number): boolean {
  checkU32(x);
  return (x & (x - 1)) === 0 && x !== 0;
}

export function nextPowerOfTwo(n: number): number {
  checkU32(n);
  if (n <= 1) return 1;
  return (1 << (log2(n - 1) + 1)) >>> 0;
}

export function reverseBits(n: number, bits: number): number {
  checkU32(n);
  let reversed = 0;
  for (let i = 0; i < bits; i++, n >>>= 1) reversed = (reversed << 1) | (n & 1);
  return reversed;
}

/** Similar to `bitLen(x)-1` but much faster for small integers, like indices */
export function log2(n: number): number {
  checkU32(n);
  return 31 - Math.clz32(n);
}

/**
 * Moves lowest bit to highest position, which at first step splits
 * array on even and odd indices, then it applied again to each part,
 * which is core of fft
 */
export function bitReversalInplace<T extends MutableArrayLike<any>>(values: T): T {
  const n = values.length;
  if (n < 2 || !isPowerOfTwo(n))
    throw new Error('n must be a power of 2 and greater than 1. Got ' + n);
  const bits = log2(n);
  for (let i = 0; i < n; i++) {
    const j = reverseBits(i, bits);
    if (i < j) {
      const tmp = values[i];
      values[i] = values[j];
      values[j] = tmp;
    }
  }
  return values;
}

export function bitReversalPermutation<T>(values: T[]): T[] {
  return bitReversalInplace(values.slice()) as T[];
}

const _1n = /** @__PURE__ */ BigInt(1);
function findGenerator(field: IField<bigint>) {
  let G = BigInt(2);
  for (; field.eql(field.pow(G, field.ORDER >> _1n), field.ONE); G++);
  return G;
}

export type RootsOfUnity = {
  roots: (bits: number) => bigint[];
  brp(bits: number): bigint[];
  inverse(bits: number): bigint[];
  omega: (bits: number) => bigint;
  clear: () => void;
};
/** We limit roots up to 2**31, which is a lot: 2-billion polynomimal should be rare. */
export function rootsOfUnity(field: IField<bigint>, generator?: bigint): RootsOfUnity {
  // Factor field.ORDER-1 as oddFactor * 2^powerOfTwo
  let oddFactor = field.ORDER - _1n;
  let powerOfTwo = 0;
  for (; (oddFactor & _1n) !== _1n; powerOfTwo++, oddFactor >>= _1n);

  // Find non quadratic residue
  let G = generator !== undefined ? BigInt(generator) : findGenerator(field);
  // Powers of generator
  const omegas: bigint[] = new Array(powerOfTwo + 1);
  omegas[powerOfTwo] = field.pow(G, oddFactor);
  for (let i = powerOfTwo; i > 0; i--) omegas[i - 1] = field.sqr(omegas[i]);
  // Compute all roots of unity for powers up to maxPower
  const rootsCache: bigint[][] = [];
  const checkBits = (bits: number) => {
    checkU32(bits);
    if (bits > 31 || bits > powerOfTwo)
      throw new Error('rootsOfUnity: wrong bits ' + bits + ' powerOfTwo=' + powerOfTwo);
    return bits;
  };
  const precomputeRoots = (maxPower: number) => {
    checkBits(maxPower);
    for (let power = maxPower; power >= 0; power--) {
      if (rootsCache[power]) continue; // Skip if we've already computed roots for this power
      const rootsAtPower: bigint[] = [];
      for (let j = 0, cur = field.ONE; j < 2 ** power; j++, cur = field.mul(cur, omegas[power]))
        rootsAtPower.push(cur);
      rootsCache[power] = rootsAtPower;
    }
    return rootsCache[maxPower];
  };
  const brpCache = new Map<number, bigint[]>();
  const inverseCache = new Map<number, bigint[]>();

  // NOTE: we use bits instead of power, because power = 2**bits,
  // but power is not neccesary isPowerOfTwo(power)!
  return {
    roots: (bits: number): bigint[] => {
      const b = checkBits(bits);
      return precomputeRoots(b);
    },
    brp(bits: number): bigint[] {
      const b = checkBits(bits);
      if (brpCache.has(b)) return brpCache.get(b)!;
      else {
        const res = bitReversalPermutation(this.roots(b));
        brpCache.set(b, res);
        return res;
      }
    },
    inverse(bits: number): bigint[] {
      const b = checkBits(bits);
      if (inverseCache.has(b)) return inverseCache.get(b)!;
      else {
        const res = field.invertBatch(this.roots(b));
        inverseCache.set(b, res);
        return res;
      }
    },
    omega: (bits: number): bigint => omegas[checkBits(bits)],
    clear: (): void => {
      rootsCache.splice(0, rootsCache.length);
      brpCache.clear();
    },
  };
}

export type Polynomial<T> = MutableArrayLike<T>;

/**
 * Maps great to Field<bigint>, but not to Group (EC points):
 * - inv from scalar field
 * - we need multiplyUnsafe here, instead of multiply for speed
 * - multiplyUnsafe is safe in the context: we do mul(rootsOfUnity), which are public and sparse
 */
export type FFTOpts<T, R> = {
  add: (a: T, b: T) => T;
  sub: (a: T, b: T) => T;
  mul: (a: T, scalar: R) => T;
  inv: (a: R) => R;
};

export type FFTCoreOpts<R> = {
  N: number;
  roots: Polynomial<R>;
  dit: boolean;
  invertButterflies?: boolean;
  skipStages?: number;
  brp?: boolean;
};

export type FFTCoreLoop<T> = <P extends Polynomial<T>>(values: P) => P;

/**
 * Constructs different flavors of FFT. radix2 implementation of low level mutating API. Flavors:
 *
 * - DIT (Decimation-in-Time): Bottom-Up (leaves -> root), Cool-Turkey
 * - DIF (Decimation-in-Frequency): Top-Down (root -> leaves), Gentleman–Sande
 *
 * DIT takes brp input, returns natural output.
 * DIF takes natural input, returns brp output.
 *
 * The output is actually identical. Time / frequence distinction is not meaningful
 * for Polynomial multiplication in fields.
 * Which means if protocol supports/needs brp output/inputs, then we can skip this step.
 *
 * Cyclic NTT: Rq = Zq[x]/(x^n-1). butterfly_DIT+loop_DIT OR butterfly_DIF+loop_DIT, roots are omega
 * Negacyclic NTT: Rq = Zq[x]/(x^n+1). butterfly_DIT+loop_DIF, at least for mlkem / mldsa
 */
export const FFTCore = <T, R>(F: FFTOpts<T, R>, coreOpts: FFTCoreOpts<R>): FFTCoreLoop<T> => {
  const { N, roots, dit, invertButterflies = false, skipStages = 0, brp = true } = coreOpts;
  const bits = log2(N);
  if (!isPowerOfTwo(N)) throw new Error('FFT: Polynomial size should be power of two');
  const isDit = dit !== invertButterflies;
  isDit;
  return <P extends Polynomial<T>>(values: P): P => {
    if (values.length !== N) throw new Error('FFT: wrong Polynomial length');
    if (dit && brp) bitReversalInplace(values);
    for (let i = 0, g = 1; i < bits - skipStages; i++) {
      // For each stage s (sub-FFT length m = 2^s)
      const s = dit ? i + 1 + skipStages : bits - i;
      const m = 1 << s;
      const m2 = m >> 1;
      const stride = N >> s;
      // Loop over each subarray of length m
      for (let k = 0; k < N; k += m) {
        // Loop over each butterfly within the subarray
        for (let j = 0, grp = g++; j < m2; j++) {
          const rootPos = invertButterflies ? (dit ? N - grp : grp) : j * stride;
          const i0 = k + j;
          const i1 = k + j + m2;
          const omega = roots[rootPos];
          const b = values[i1];
          const a = values[i0];
          // Inlining gives us 10% perf in kyber vs functions
          if (isDit) {
            const t = F.mul(b, omega); // Standard DIT butterfly
            values[i0] = F.add(a, t);
            values[i1] = F.sub(a, t);
          } else if (invertButterflies) {
            values[i0] = F.add(b, a); // DIT loop + inverted butterflies (Kyber decode)
            values[i1] = F.mul(F.sub(b, a), omega);
          } else {
            values[i0] = F.add(a, b); // Standard DIF butterfly
            values[i1] = F.mul(F.sub(a, b), omega);
          }
        }
      }
    }
    if (!dit && brp) bitReversalInplace(values);
    return values;
  };
};

export type FFTMethods<T> = {
  direct<P extends Polynomial<T>>(values: P, brpInput?: boolean, brpOutput?: boolean): P;
  inverse<P extends Polynomial<T>>(values: P, brpInput?: boolean, brpOutput?: boolean): P;
};

/**
 * NTT aka FFT over finite field (NOT over complex numbers).
 * Naming mirrors other libraries.
 */
export function FFT<T>(roots: RootsOfUnity, opts: FFTOpts<T, bigint>): FFTMethods<T> {
  const getLoop = (
    N: number,
    roots: Polynomial<bigint>,
    brpInput = false,
    brpOutput = false
  ): (<P extends Polynomial<T>>(values: P) => P) => {
    if (brpInput && brpOutput) {
      // we cannot optimize this case, but lets support it anyway
      return (values) =>
        FFTCore(opts, { N, roots, dit: false, brp: false })(bitReversalInplace(values));
    }
    if (brpInput) return FFTCore(opts, { N, roots, dit: true, brp: false });
    if (brpOutput) return FFTCore(opts, { N, roots, dit: false, brp: false });
    return FFTCore(opts, { N, roots, dit: true, brp: true }); // all natural
  };
  return {
    direct<P extends Polynomial<T>>(values: P, brpInput = false, brpOutput = false): P {
      const N = values.length;
      if (!isPowerOfTwo(N)) throw new Error('FFT: Polynomial size should be power of two');
      const bits = log2(N);
      return getLoop(N, roots.roots(bits), brpInput, brpOutput)<P>(values.slice());
    },
    inverse<P extends Polynomial<T>>(values: P, brpInput = false, brpOutput = false): P {
      const N = values.length;
      const bits = log2(N);
      const res = getLoop(N, roots.inverse(bits), brpInput, brpOutput)(values.slice());
      const ivm = opts.inv(BigInt(values.length)); // scale
      // we can get brp output if we use dif instead of dit!
      for (let i = 0; i < res.length; i++) res[i] = opts.mul(res[i], ivm);
      // Allows to re-use non-inverted roots, but is VERY fragile
      // return [res[0]].concat(res.slice(1).reverse());
      // inverse calculated as pow(-1), which transforms into ω^{-kn} (-> reverses indices)
      return res;
    },
  };
}

export type CreatePolyFn<P extends Polynomial<T>, T> = (len: number, elm?: T) => P;

export type PolyFn<P extends Polynomial<T>, T> = {
  roots: RootsOfUnity;
  create: CreatePolyFn<P, T>;
  length?: number; // optional enforced size

  degree: (a: P) => number;
  extend: (a: P, len: number) => P;
  add: (a: P, b: P) => P; // fc(x) = fa(x) + fb(x)
  sub: (a: P, b: P) => P; // fc(x) = fa(x) - fb(x)
  mul: (a: P, b: P | T) => P; // fc(x) = fa(x) * fb(x) OR fc(x) = fa(x) * scalar (same as field)
  dot: (a: P, b: P) => P; // point-wise coeff multiplication
  convolve: (a: P, b: P) => P;
  shift: (p: P, factor: bigint) => P; // point-wise coeffcient shift
  clone: (a: P) => P;
  // Eval
  eval: (a: P, basis: P) => T; // y = fc(x)
  monomial: {
    basis: (x: T, n: number) => P;
    eval: (a: P, x: T) => T;
  };
  lagrange: {
    basis: (x: T, n: number, brp?: boolean) => P;
    eval: (a: P, x: T, brp?: boolean) => T;
  };
  // Complex
  vanishing: (roots: P) => P; // f(x) = 0 for every x in roots
};

/**
 * Poly wants a cracker.
 *
 * Polynomials are functions like `y=f(x)`, which means when we multiply two polynomials, result is
 * function `f3(x) = f1(x) * f2(x)`, we don't multiply values. Key takeaways:
 *
 * - **Polynomial** is an array of coefficients: `f(x) = sum(coeff[i] * basis[i](x))`
 * - **Basis** is array of functions
 * - **Monominal** is Polynomial where `basis[i](x) == x**i` (powers)
 * - **Array size** is domain size
 * - **Lattice** is matrix (Polynomial of Polynomials)
 */
export function poly<T>(
  field: IField<T>,
  roots: RootsOfUnity,
  create?: undefined,
  fft?: FFTMethods<T>,
  length?: number
): PolyFn<T[], T>;
export function poly<T, P extends Polynomial<T>>(
  field: IField<T>,
  roots: RootsOfUnity,
  create: CreatePolyFn<P, T>,
  fft?: FFTMethods<T>,
  length?: number
): PolyFn<P, T>;
export function poly<T, P extends Polynomial<T>>(
  field: IField<T>,
  roots: RootsOfUnity,
  create?: CreatePolyFn<P, T>,
  fft?: FFTMethods<T>,
  length?: number
): PolyFn<any, T> {
  const F = field;
  const _create =
    create ||
    (((len: number, elm?: T): Polynomial<T> => new Array(len).fill(elm ?? F.ZERO)) as CreatePolyFn<
      P,
      T
    >);

  const isPoly = (x: any): x is P => Array.isArray(x) || ArrayBuffer.isView(x);
  const checkLength = (...lst: P[]): number => {
    if (!lst.length) return 0;
    for (const i of lst) if (!isPoly(i)) throw new Error('poly: not polynomial: ' + i);
    const L = lst[0].length;
    for (let i = 1; i < lst.length; i++)
      if (lst[i].length !== L) throw new Error(`poly: mismatched lengths ${L} vs ${lst[i].length}`);
    if (length !== undefined && L !== length)
      throw new Error(`poly: expected fixed length ${length}, got ${L}`);
    return L;
  };
  function findOmegaIndex(x: T, n: number, brp = false): number {
    const bits = log2(n);
    const omega = brp ? roots.brp(bits) : roots.roots(bits);
    for (let i = 0; i < n; i++) if (F.eql(x, omega[i] as T)) return i;
    return -1;
  }
  // TODO: mutating versions for mlkem/mldsa
  return {
    roots,
    create: _create,
    length,
    extend: (a: P, len: number): P => {
      checkLength(a);
      const out = _create(len, F.ZERO);
      for (let i = 0; i < a.length; i++) out[i] = a[i];
      return out;
    },
    degree: (a: P): number => {
      checkLength(a);
      for (let i = a.length - 1; i >= 0; i--) if (!F.is0(a[i])) return i;
      return -1;
    },
    add: (a: P, b: P): P => {
      const len = checkLength(a, b);
      const out = _create(len);
      for (let i = 0; i < len; i++) out[i] = F.add(a[i], b[i]);
      return out;
    },
    sub: (a: P, b: P): P => {
      const len = checkLength(a, b);
      const out = _create(len);
      for (let i = 0; i < len; i++) out[i] = F.sub(a[i], b[i]);
      return out;
    },
    dot: (a: P, b: P): P => {
      const len = checkLength(a, b);
      const out = _create(len);
      for (let i = 0; i < len; i++) out[i] = F.mul(a[i], b[i]);
      return out;
    },
    mul: (a: P, b: P | T): P => {
      if (isPoly(b)) {
        const len = checkLength(a, b);
        if (fft) {
          const A = fft.direct(a, false, true);
          const B = fft.direct(b, false, true);
          for (let i = 0; i < A.length; i++) A[i] = F.mul(A[i], B[i]);
          return fft.inverse(A, true, false) as P;
        } else {
          // NOTE: this is quadratic and mostly for compat tests with FFT
          const res = _create(len);
          for (let i = 0; i < len; i++) {
            for (let j = 0; j < len; j++) {
              const k = (i + j) % len; // wrap mod length
              res[k] = F.add(res[k], F.mul(a[i], b[j]));
            }
          }
          return res;
        }
      } else {
        const out = _create(checkLength(a));
        for (let i = 0; i < out.length; i++) out[i] = F.mul(a[i], b);
        return out;
      }
    },
    convolve(a: P, b: P): P {
      const len = nextPowerOfTwo(a.length + b.length - 1);
      return this.mul(this.extend(a, len), this.extend(b, len));
    },
    shift(p: P, factor: bigint): P {
      const out = _create(checkLength(p));
      out[0] = p[0];
      for (let i = 1, power = F.ONE; i < p.length; i++) {
        power = F.mul(power, factor);
        out[i] = F.mul(p[i], power);
      }
      return out;
    },
    clone: (a: P): P => {
      checkLength(a);
      const out = _create(a.length);
      for (let i = 0; i < a.length; i++) out[i] = a[i];
      return out;
    },
    eval: (a: P, basis: P): T => {
      checkLength(a);
      let acc = F.ZERO;
      for (let i = 0; i < a.length; i++) acc = F.add(acc, F.mul(a[i], basis[i]));
      return acc;
    },
    monomial: {
      basis: (x: T, n: number): P => {
        const out = _create(n);
        let pow = F.ONE;
        for (let i = 0; i < n; i++) {
          out[i] = pow;
          pow = F.mul(pow, x);
        }
        return out;
      },
      eval: (a: P, x: T): T => {
        checkLength(a);
        // Same as eval(a, monomialBasis(x, a.length)), but it is faster this way
        let acc = F.ZERO;
        for (let i = a.length - 1; i >= 0; i--) acc = F.add(F.mul(acc, x), a[i]);
        return acc;
      },
    },
    lagrange: {
      basis: (x: T, n: number, brp = false, weights?: P): P => {
        const bits = log2(n);
        const cache = weights || brp ? roots.brp(bits) : roots.roots(bits); // [ω⁰, ω¹, ..., ωⁿ⁻¹]
        const out = _create(n);
        // Fast Kronecker-δ shortcut
        const idx = findOmegaIndex(x, n, brp);
        if (idx !== -1) {
          out[idx] = F.ONE;
          return out;
        }
        const tm = F.pow(x, BigInt(n));
        const c = F.mul(F.sub(tm, F.ONE), F.inv(BigInt(n) as T)); // c = (xⁿ - 1)/n
        const denom = _create(n);
        for (let i = 0; i < n; i++) denom[i] = F.sub(x, cache[i] as T);
        const inv = F.invertBatch(denom as any as T[]);
        for (let i = 0; i < n; i++) out[i] = F.mul(c, F.mul(cache[i] as T, inv[i]));
        return out;
      },
      eval(a: P, x: T, brp = false): T {
        checkLength(a);
        const idx = findOmegaIndex(x, a.length, brp);
        if (idx !== -1) return a[idx]; // fast path
        const L = this.basis(x, a.length, brp); // Lᵢ(x)
        let acc = F.ZERO;
        for (let i = 0; i < a.length; i++) if (!F.is0(a[i])) acc = F.add(acc, F.mul(a[i], L[i]));
        return acc;
      },
    },
    vanishing(roots: P): P {
      checkLength(roots);
      const out = _create(roots.length + 1, F.ZERO);
      out[0] = F.ONE;
      for (const r of roots) {
        const neg = F.neg(r);
        for (let j = out.length - 1; j > 0; j--) out[j] = F.add(F.mul(out[j], neg), out[j - 1]);
        out[0] = F.mul(out[0], neg);
      }
      return out;
    },
  };
}
