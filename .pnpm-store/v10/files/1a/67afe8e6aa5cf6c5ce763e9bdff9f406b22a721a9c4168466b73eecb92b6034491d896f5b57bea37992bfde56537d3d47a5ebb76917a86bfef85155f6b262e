export declare function mod(a: bigint, b: bigint): bigint;
/**
 * Efficiently raise num to power and do modular division.
 * Unsafe in some contexts: uses ladder, so can expose bigint bits.
 * @example
 * pow(2n, 6n, 11n) // 64n % 11n == 9n
 */
export declare function pow(num: bigint, power: bigint, modulo: bigint): bigint;
/** Does `x^(2^power)` mod p. `pow2(30, 4)` == `30^(2^4)` */
export declare function pow2(x: bigint, power: bigint, modulo: bigint): bigint;
/**
 * Inverses number over modulo.
 * Implemented using [Euclidean GCD](https://brilliant.org/wiki/extended-euclidean-algorithm/).
 */
export declare function invert(number: bigint, modulo: bigint): bigint;
/**
 * Tonelli-Shanks square root search algorithm.
 * 1. https://eprint.iacr.org/2012/685.pdf (page 12)
 * 2. Square Roots from 1; 24, 51, 10 to Dan Shanks
 * @param P field order
 * @returns function that takes field Fp (created from P) and number n
 */
export declare function tonelliShanks(P: bigint): <T>(Fp: IField<T>, n: T) => T;
/**
 * Square root for a finite field. Will try optimized versions first:
 *
 * 1. P ≡ 3 (mod 4)
 * 2. P ≡ 5 (mod 8)
 * 3. P ≡ 9 (mod 16)
 * 4. Tonelli-Shanks algorithm
 *
 * Different algorithms can give different roots, it is up to user to decide which one they want.
 * For example there is FpSqrtOdd/FpSqrtEven to choice root based on oddness (used for hash-to-curve).
 */
export declare function FpSqrt(P: bigint): <T>(Fp: IField<T>, n: T) => T;
export declare const isNegativeLE: (num: bigint, modulo: bigint) => boolean;
/** Field is not always over prime: for example, Fp2 has ORDER(q)=p^m. */
export interface IField<T> {
    ORDER: bigint;
    isLE: boolean;
    BYTES: number;
    BITS: number;
    MASK: bigint;
    ZERO: T;
    ONE: T;
    create: (num: T) => T;
    isValid: (num: T) => boolean;
    is0: (num: T) => boolean;
    isValidNot0: (num: T) => boolean;
    neg(num: T): T;
    inv(num: T): T;
    sqrt(num: T): T;
    sqr(num: T): T;
    eql(lhs: T, rhs: T): boolean;
    add(lhs: T, rhs: T): T;
    sub(lhs: T, rhs: T): T;
    mul(lhs: T, rhs: T | bigint): T;
    pow(lhs: T, power: bigint): T;
    div(lhs: T, rhs: T | bigint): T;
    addN(lhs: T, rhs: T): T;
    subN(lhs: T, rhs: T): T;
    mulN(lhs: T, rhs: T | bigint): T;
    sqrN(num: T): T;
    isOdd?(num: T): boolean;
    allowedLengths?: number[];
    invertBatch: (lst: T[]) => T[];
    toBytes(num: T): Uint8Array;
    fromBytes(bytes: Uint8Array, skipValidation?: boolean): T;
    cmov(a: T, b: T, c: boolean): T;
}
export declare function validateField<T>(field: IField<T>): IField<T>;
/**
 * Same as `pow` but for Fp: non-constant-time.
 * Unsafe in some contexts: uses ladder, so can expose bigint bits.
 */
export declare function FpPow<T>(Fp: IField<T>, num: T, power: bigint): T;
/**
 * Efficiently invert an array of Field elements.
 * Exception-free. Will return `undefined` for 0 elements.
 * @param passZero map 0 to 0 (instead of undefined)
 */
export declare function FpInvertBatch<T>(Fp: IField<T>, nums: T[], passZero?: boolean): T[];
export declare function FpDiv<T>(Fp: IField<T>, lhs: T, rhs: T | bigint): T;
/**
 * Legendre symbol.
 * Legendre constant is used to calculate Legendre symbol (a | p)
 * which denotes the value of a^((p-1)/2) (mod p).
 *
 * * (a | p) ≡ 1    if a is a square (mod p), quadratic residue
 * * (a | p) ≡ -1   if a is not a square (mod p), quadratic non residue
 * * (a | p) ≡ 0    if a ≡ 0 (mod p)
 */
export declare function FpLegendre<T>(Fp: IField<T>, n: T): -1 | 0 | 1;
export declare function FpIsSquare<T>(Fp: IField<T>, n: T): boolean;
export type NLength = {
    nByteLength: number;
    nBitLength: number;
};
export declare function nLength(n: bigint, nBitLength?: number): NLength;
type FpField = IField<bigint> & Required<Pick<IField<bigint>, 'isOdd'>>;
type SqrtFn = (n: bigint) => bigint;
type FieldOpts = Partial<{
    sqrt: SqrtFn;
    isLE: boolean;
    BITS: number;
    modFromBytes: boolean;
    allowedLengths?: readonly number[];
}>;
/**
 * Creates a finite field. Major performance optimizations:
 * * 1. Denormalized operations like mulN instead of mul.
 * * 2. Identical object shape: never add or remove keys.
 * * 3. `Object.freeze`.
 * Fragile: always run a benchmark on a change.
 * Security note: operations don't check 'isValid' for all elements for performance reasons,
 * it is caller responsibility to check this.
 * This is low-level code, please make sure you know what you're doing.
 *
 * Note about field properties:
 * * CHARACTERISTIC p = prime number, number of elements in main subgroup.
 * * ORDER q = similar to cofactor in curves, may be composite `q = p^m`.
 *
 * @param ORDER field order, probably prime, or could be composite
 * @param bitLen how many bits the field consumes
 * @param isLE (default: false) if encoding / decoding should be in little-endian
 * @param redef optional faster redefinitions of sqrt and other methods
 */
export declare function Field(ORDER: bigint, bitLenOrOpts?: number | FieldOpts, // TODO: use opts only in v2?
isLE?: boolean, opts?: {
    sqrt?: SqrtFn;
}): Readonly<FpField>;
export declare function FpSqrtOdd<T>(Fp: IField<T>, elm: T): T;
export declare function FpSqrtEven<T>(Fp: IField<T>, elm: T): T;
/**
 * "Constant-time" private key generation utility.
 * Same as mapKeyToField, but accepts less bytes (40 instead of 48 for 32-byte field).
 * Which makes it slightly more biased, less secure.
 * @deprecated use `mapKeyToField` instead
 */
export declare function hashToPrivateScalar(hash: string | Uint8Array, groupOrder: bigint, isLE?: boolean): bigint;
/**
 * Returns total number of bytes consumed by the field element.
 * For example, 32 bytes for usual 256-bit weierstrass curve.
 * @param fieldOrder number of field elements, usually CURVE.n
 * @returns byte length of field
 */
export declare function getFieldBytesLength(fieldOrder: bigint): number;
/**
 * Returns minimal amount of bytes that can be safely reduced
 * by field order.
 * Should be 2^-128 for 128-bit curve such as P256.
 * @param fieldOrder number of field elements, usually CURVE.n
 * @returns byte length of target hash
 */
export declare function getMinHashLength(fieldOrder: bigint): number;
/**
 * "Constant-time" private key generation utility.
 * Can take (n + n/2) or more bytes of uniform input e.g. from CSPRNG or KDF
 * and convert them into private scalar, with the modulo bias being negligible.
 * Needs at least 48 bytes of input for 32-byte private key.
 * https://research.kudelskisecurity.com/2020/07/28/the-definitive-guide-to-modulo-bias-and-how-to-avoid-it/
 * FIPS 186-5, A.2 https://csrc.nist.gov/publications/detail/fips/186/5/final
 * RFC 9380, https://www.rfc-editor.org/rfc/rfc9380#section-5
 * @param hash hash output from SHA3 or a similar function
 * @param groupOrder size of subgroup - (e.g. secp256k1.CURVE.n)
 * @param isLE interpret hash bytes as LE num
 * @returns valid private scalar
 */
export declare function mapHashToField(key: Uint8Array, fieldOrder: bigint, isLE?: boolean): Uint8Array;
export {};
//# sourceMappingURL=modular.d.ts.map