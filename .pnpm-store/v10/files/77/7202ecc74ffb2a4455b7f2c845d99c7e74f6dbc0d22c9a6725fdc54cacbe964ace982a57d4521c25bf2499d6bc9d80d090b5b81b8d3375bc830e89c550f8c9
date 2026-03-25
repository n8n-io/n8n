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
/** Checks if integer is in form of `1 << X` */
export declare function isPowerOfTwo(x: number): boolean;
export declare function nextPowerOfTwo(n: number): number;
export declare function reverseBits(n: number, bits: number): number;
/** Similar to `bitLen(x)-1` but much faster for small integers, like indices */
export declare function log2(n: number): number;
/**
 * Moves lowest bit to highest position, which at first step splits
 * array on even and odd indices, then it applied again to each part,
 * which is core of fft
 */
export declare function bitReversalInplace<T extends MutableArrayLike<any>>(values: T): T;
export declare function bitReversalPermutation<T>(values: T[]): T[];
export type RootsOfUnity = {
    roots: (bits: number) => bigint[];
    brp(bits: number): bigint[];
    inverse(bits: number): bigint[];
    omega: (bits: number) => bigint;
    clear: () => void;
};
/** We limit roots up to 2**31, which is a lot: 2-billion polynomimal should be rare. */
export declare function rootsOfUnity(field: IField<bigint>, generator?: bigint): RootsOfUnity;
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
export declare const FFTCore: <T, R>(F: FFTOpts<T, R>, coreOpts: FFTCoreOpts<R>) => FFTCoreLoop<T>;
export type FFTMethods<T> = {
    direct<P extends Polynomial<T>>(values: P, brpInput?: boolean, brpOutput?: boolean): P;
    inverse<P extends Polynomial<T>>(values: P, brpInput?: boolean, brpOutput?: boolean): P;
};
/**
 * NTT aka FFT over finite field (NOT over complex numbers).
 * Naming mirrors other libraries.
 */
export declare function FFT<T>(roots: RootsOfUnity, opts: FFTOpts<T, bigint>): FFTMethods<T>;
export type CreatePolyFn<P extends Polynomial<T>, T> = (len: number, elm?: T) => P;
export type PolyFn<P extends Polynomial<T>, T> = {
    roots: RootsOfUnity;
    create: CreatePolyFn<P, T>;
    length?: number;
    degree: (a: P) => number;
    extend: (a: P, len: number) => P;
    add: (a: P, b: P) => P;
    sub: (a: P, b: P) => P;
    mul: (a: P, b: P | T) => P;
    dot: (a: P, b: P) => P;
    convolve: (a: P, b: P) => P;
    shift: (p: P, factor: bigint) => P;
    clone: (a: P) => P;
    eval: (a: P, basis: P) => T;
    monomial: {
        basis: (x: T, n: number) => P;
        eval: (a: P, x: T) => T;
    };
    lagrange: {
        basis: (x: T, n: number, brp?: boolean) => P;
        eval: (a: P, x: T, brp?: boolean) => T;
    };
    vanishing: (roots: P) => P;
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
export declare function poly<T>(field: IField<T>, roots: RootsOfUnity, create?: undefined, fft?: FFTMethods<T>, length?: number): PolyFn<T[], T>;
export declare function poly<T, P extends Polynomial<T>>(field: IField<T>, roots: RootsOfUnity, create: CreatePolyFn<P, T>, fft?: FFTMethods<T>, length?: number): PolyFn<P, T>;
//# sourceMappingURL=fft.d.ts.map