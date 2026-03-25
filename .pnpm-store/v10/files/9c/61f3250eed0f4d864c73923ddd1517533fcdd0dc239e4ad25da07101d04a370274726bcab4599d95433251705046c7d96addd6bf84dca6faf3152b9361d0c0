// Common type definitions for both the ESM and UMD variants. The ESM variant
// reexports the Long class as its default export, whereas the UMD variant makes
// the Long class a whole-module export with a global variable fallback.

type LongLike =
  | Long
  | number
  | bigint
  | string
  | { low: number; high: number; unsigned: boolean };

export declare class Long {
  /**
   * Constructs a 64 bit two's-complement integer, given its low and high 32 bit values as signed integers. See the from* functions below for more convenient ways of constructing Longs.
   */
  constructor(low: number, high?: number, unsigned?: boolean);

  /**
   * Maximum unsigned value.
   */
  static MAX_UNSIGNED_VALUE: Long;

  /**
   * Maximum signed value.
   */
  static MAX_VALUE: Long;

  /**
   * Minimum signed value.
   */
  static MIN_VALUE: Long;

  /**
   * Signed negative one.
   */
  static NEG_ONE: Long;

  /**
   * Signed one.
   */
  static ONE: Long;

  /**
   * Unsigned one.
   */
  static UONE: Long;

  /**
   * Unsigned zero.
   */
  static UZERO: Long;

  /**
   * Signed zero
   */
  static ZERO: Long;

  /**
   * The high 32 bits as a signed value.
   */
  high: number;

  /**
   * The low 32 bits as a signed value.
   */
  low: number;

  /**
   * Whether unsigned or not.
   */
  unsigned: boolean;

  /**
   * Returns a Long representing the 64 bit integer that comes by concatenating the given low and high bits. Each is assumed to use 32 bits.
   */
  static fromBits(lowBits: number, highBits: number, unsigned?: boolean): Long;

  /**
   * Returns a Long representing the given 32 bit integer value.
   */
  static fromInt(value: number, unsigned?: boolean): Long;

  /**
   * Returns a Long representing the given value, provided that it is a finite number. Otherwise, zero is returned.
   */
  static fromNumber(value: number, unsigned?: boolean): Long;

  /**
   * Returns a Long representing the given big integer value.
   */
  static fromBigInt(value: bigint, unsigned?: boolean): Long;

  /**
   * Returns a Long representation of the given string, written using the specified radix.
   */
  static fromString(
    str: string,
    unsigned?: boolean | number,
    radix?: number,
  ): Long;

  /**
   * Creates a Long from its byte representation.
   */
  static fromBytes(bytes: number[], unsigned?: boolean, le?: boolean): Long;

  /**
   * Creates a Long from its little endian byte representation.
   */
  static fromBytesLE(bytes: number[], unsigned?: boolean): Long;

  /**
   * Creates a Long from its big endian byte representation.
   */
  static fromBytesBE(bytes: number[], unsigned?: boolean): Long;

  /**
   * Tests if the specified object is a Long.
   */
  static isLong(obj: any): obj is Long;

  /**
   * Converts the specified value to a Long.
   */
  static fromValue(val: LongLike, unsigned?: boolean): Long;

  /**
   * Returns the sum of this and the specified Long.
   */
  add(addend: LongLike): Long;

  /**
   * Returns the bitwise AND of this Long and the specified.
   */
  and(other: LongLike): Long;

  /**
   * Compares this Long's value with the specified's.
   */
  compare(other: LongLike): number;

  /**
   * Compares this Long's value with the specified's.
   */
  comp(other: LongLike): number;

  /**
   * Returns this Long divided by the specified.
   */
  divide(divisor: LongLike): Long;

  /**
   * Returns this Long divided by the specified.
   */
  div(divisor: LongLike): Long;

  /**
   * Tests if this Long's value equals the specified's.
   */
  equals(other: LongLike): boolean;

  /**
   * Tests if this Long's value equals the specified's.
   */
  eq(other: LongLike): boolean;

  /**
   * Gets the high 32 bits as a signed integer.
   */
  getHighBits(): number;

  /**
   * Gets the high 32 bits as an unsigned integer.
   */
  getHighBitsUnsigned(): number;

  /**
   * Gets the low 32 bits as a signed integer.
   */
  getLowBits(): number;

  /**
   * Gets the low 32 bits as an unsigned integer.
   */
  getLowBitsUnsigned(): number;

  /**
   * Gets the number of bits needed to represent the absolute value of this Long.
   */
  getNumBitsAbs(): number;

  /**
   * Tests if this Long's value is greater than the specified's.
   */
  greaterThan(other: LongLike): boolean;

  /**
   * Tests if this Long's value is greater than the specified's.
   */
  gt(other: LongLike): boolean;

  /**
   * Tests if this Long's value is greater than or equal the specified's.
   */
  greaterThanOrEqual(other: LongLike): boolean;

  /**
   * Tests if this Long's value is greater than or equal the specified's.
   */
  gte(other: LongLike): boolean;

  /**
   * Tests if this Long's value is greater than or equal the specified's.
   */
  ge(other: LongLike): boolean;

  /**
   * Tests if this Long's value is even.
   */
  isEven(): boolean;

  /**
   * Tests if this Long's value is negative.
   */
  isNegative(): boolean;

  /**
   * Tests if this Long's value is odd.
   */
  isOdd(): boolean;

  /**
   * Tests if this Long's value is positive or zero.
   */
  isPositive(): boolean;

  /**
   * Tests if this Long can be safely represented as a JavaScript number.
   */
  isSafeInteger(): boolean;

  /**
   * Tests if this Long's value equals zero.
   */
  isZero(): boolean;

  /**
   * Tests if this Long's value equals zero.
   */
  eqz(): boolean;

  /**
   * Tests if this Long's value is less than the specified's.
   */
  lessThan(other: LongLike): boolean;

  /**
   * Tests if this Long's value is less than the specified's.
   */
  lt(other: LongLike): boolean;

  /**
   * Tests if this Long's value is less than or equal the specified's.
   */
  lessThanOrEqual(other: LongLike): boolean;

  /**
   * Tests if this Long's value is less than or equal the specified's.
   */
  lte(other: LongLike): boolean;

  /**
   * Tests if this Long's value is less than or equal the specified's.
   */
  le(other: LongLike): boolean;

  /**
   * Returns this Long modulo the specified.
   */
  modulo(other: LongLike): Long;

  /**
   * Returns this Long modulo the specified.
   */
  mod(other: LongLike): Long;

  /**
   * Returns this Long modulo the specified.
   */
  rem(other: LongLike): Long;

  /**
   * Returns the product of this and the specified Long.
   */
  multiply(multiplier: LongLike): Long;

  /**
   * Returns the product of this and the specified Long.
   */
  mul(multiplier: LongLike): Long;

  /**
   * Negates this Long's value.
   */
  negate(): Long;

  /**
   * Negates this Long's value.
   */
  neg(): Long;

  /**
   * Returns the bitwise NOT of this Long.
   */
  not(): Long;

  /**
   * Returns count leading zeros of this Long.
   */
  countLeadingZeros(): number;

  /**
   * Returns count leading zeros of this Long.
   */
  clz(): number;

  /**
   * Returns count trailing zeros of this Long.
   */
  countTrailingZeros(): number;

  /**
   * Returns count trailing zeros of this Long.
   */
  ctz(): number;

  /**
   * Tests if this Long's value differs from the specified's.
   */
  notEquals(other: LongLike): boolean;

  /**
   * Tests if this Long's value differs from the specified's.
   */
  neq(other: LongLike): boolean;

  /**
   * Tests if this Long's value differs from the specified's.
   */
  ne(other: LongLike): boolean;

  /**
   * Returns the bitwise OR of this Long and the specified.
   */
  or(other: LongLike): Long;

  /**
   * Returns this Long with bits shifted to the left by the given amount.
   */
  shiftLeft(numBits: number | Long): Long;

  /**
   * Returns this Long with bits shifted to the left by the given amount.
   */
  shl(numBits: number | Long): Long;

  /**
   * Returns this Long with bits arithmetically shifted to the right by the given amount.
   */
  shiftRight(numBits: number | Long): Long;

  /**
   * Returns this Long with bits arithmetically shifted to the right by the given amount.
   */
  shr(numBits: number | Long): Long;

  /**
   * Returns this Long with bits logically shifted to the right by the given amount.
   */
  shiftRightUnsigned(numBits: number | Long): Long;

  /**
   * Returns this Long with bits logically shifted to the right by the given amount.
   */
  shru(numBits: number | Long): Long;

  /**
   * Returns this Long with bits logically shifted to the right by the given amount.
   */
  shr_u(numBits: number | Long): Long;

  /**
   * Returns this Long with bits rotated to the left by the given amount.
   */
  rotateLeft(numBits: number | Long): Long;

  /**
   * Returns this Long with bits rotated to the left by the given amount.
   */
  rotl(numBits: number | Long): Long;

  /**
   * Returns this Long with bits rotated to the right by the given amount.
   */
  rotateRight(numBits: number | Long): Long;

  /**
   * Returns this Long with bits rotated to the right by the given amount.
   */
  rotr(numBits: number | Long): Long;

  /**
   * Returns the difference of this and the specified Long.
   */
  subtract(subtrahend: LongLike): Long;

  /**
   * Returns the difference of this and the specified Long.
   */
  sub(subtrahend: LongLike): Long;

  /**
   * Converts the Long to a big integer.
   */
  toBigInt(): bigint;

  /**
   * Converts the Long to a 32 bit integer, assuming it is a 32 bit integer.
   */
  toInt(): number;

  /**
   * Converts the Long to a the nearest floating-point representation of this value (double, 53 bit mantissa).
   */
  toNumber(): number;

  /**
   * Converts this Long to its byte representation.
   */

  toBytes(le?: boolean): number[];

  /**
   * Converts this Long to its little endian byte representation.
   */

  toBytesLE(): number[];

  /**
   * Converts this Long to its big endian byte representation.
   */

  toBytesBE(): number[];

  /**
   * Converts this Long to signed.
   */
  toSigned(): Long;

  /**
   * Converts the Long to a string written in the specified radix.
   */
  toString(radix?: number): string;

  /**
   * Converts this Long to unsigned.
   */
  toUnsigned(): Long;

  /**
   * Returns the bitwise XOR of this Long and the given one.
   */
  xor(other: LongLike): Long;
}
