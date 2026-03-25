/**
 * @exports Long
 * @class A Long class for representing a 64 bit int (BigInt)
 * @param {bigint} value The value of the 64 bit int
 * @constructor
 */
class Long {
  constructor(value) {
    this.value = value
  }

  /**
   * @function isLong
   * @param {*} obj Object
   * @returns {boolean}
   * @inner
   */
  static isLong(obj) {
    return typeof obj.value === 'bigint'
  }

  /**
   * @param {number} value
   * @returns {!Long}
   * @inner
   */
  static fromBits(value) {
    return new Long(BigInt(value))
  }

  /**
   * @param {number} value
   * @returns {!Long}
   * @inner
   */
  static fromInt(value) {
    if (isNaN(value)) return Long.ZERO

    return new Long(BigInt.asIntN(64, BigInt(value)))
  }

  /**
   * @param {number} value
   * @returns {!Long}
   * @inner
   */
  static fromNumber(value) {
    if (isNaN(value)) return Long.ZERO

    return new Long(BigInt(value))
  }

  /**
   * @function
   * @param {bigint|number|string|Long} val
   * @returns {!Long}
   * @inner
   */
  static fromValue(val) {
    if (typeof val === 'number') return this.fromNumber(val)
    if (typeof val === 'string') return this.fromString(val)
    if (typeof val === 'bigint') return new Long(val)
    if (this.isLong(val)) return new Long(BigInt(val.value))

    return new Long(BigInt(val))
  }

  /**
   * @param {string} str
   * @returns {!Long}
   * @inner
   */
  static fromString(str) {
    if (str.length === 0) throw Error('empty string')
    if (str === 'NaN' || str === 'Infinity' || str === '+Infinity' || str === '-Infinity')
      return Long.ZERO
    return new Long(BigInt(str))
  }

  /**
   * Tests if this Long's value equals zero.
   * @returns {boolean}
   */
  isZero() {
    return this.value === BigInt(0)
  }

  /**
   * Tests if this Long's value is negative.
   * @returns {boolean}
   */
  isNegative() {
    return this.value < BigInt(0)
  }

  /**
   * Converts the Long to a string.
   * @returns {string}
   * @override
   */
  toString() {
    return String(this.value)
  }

  /**
   * Converts the Long to the nearest floating-point representation (double, 53-bit mantissa)
   * @returns {number}
   * @override
   */
  toNumber() {
    return Number(this.value)
  }

  /**
   * Converts the Long to a 32 bit integer, assuming it is a 32 bit integer.
   * @returns {number}
   */
  toInt() {
    return Number(BigInt.asIntN(32, this.value))
  }

  /**
   * Converts the Long to JSON
   * @returns {string}
   * @override
   */
  toJSON() {
    return this.toString()
  }

  /**
   * Returns this Long with bits shifted to the left by the given amount.
   * @param {number|bigint} numBits Number of bits
   * @returns {!Long} Shifted bigint
   */
  shiftLeft(numBits) {
    return new Long(this.value << BigInt(numBits))
  }

  /**
   * Returns this Long with bits arithmetically shifted to the right by the given amount.
   * @param {number|bigint} numBits Number of bits
   * @returns {!Long} Shifted bigint
   */
  shiftRight(numBits) {
    return new Long(this.value >> BigInt(numBits))
  }

  /**
   * Returns the bitwise OR of this Long and the specified.
   * @param {bigint|number|string} other Other Long
   * @returns {!Long}
   */
  or(other) {
    if (!Long.isLong(other)) other = Long.fromValue(other)
    return Long.fromBits(this.value | other.value)
  }

  /**
   * Returns the bitwise XOR of this Long and the given one.
   * @param {bigint|number|string} other Other Long
   * @returns {!Long}
   */
  xor(other) {
    if (!Long.isLong(other)) other = Long.fromValue(other)
    return new Long(this.value ^ other.value)
  }

  /**
   * Returns the bitwise AND of this Long and the specified.
   * @param {bigint|number|string} other Other Long
   * @returns {!Long}
   */
  and(other) {
    if (!Long.isLong(other)) other = Long.fromValue(other)
    return new Long(this.value & other.value)
  }

  /**
   * Returns the bitwise NOT of this Long.
   * @returns {!Long}
   */
  not() {
    return new Long(~this.value)
  }

  /**
   * Returns this Long with bits logically shifted to the right by the given amount.
   * @param {number|bigint} numBits Number of bits
   * @returns {!Long} Shifted bigint
   */
  shiftRightUnsigned(numBits) {
    return new Long(this.value >> BigInt.asUintN(64, BigInt(numBits)))
  }

  /**
   * Tests if this Long's value equals the specified's.
   * @param {bigint|number|string} other Other value
   * @returns {boolean}
   */
  equals(other) {
    if (!Long.isLong(other)) other = Long.fromValue(other)
    return this.value === other.value
  }

  /**
   * Tests if this Long's value is greater than or equal the specified's.
   * @param {!Long|number|string} other Other value
   * @returns {boolean}
   */
  greaterThanOrEqual(other) {
    if (!Long.isLong(other)) other = Long.fromValue(other)
    return this.value >= other.value
  }

  gte(other) {
    return this.greaterThanOrEqual(other)
  }

  notEquals(other) {
    if (!Long.isLong(other)) other = Long.fromValue(other)
    return !this.equals(/* validates */ other)
  }

  /**
   * Returns the sum of this and the specified Long.
   * @param {!Long|number|string} addend Addend
   * @returns {!Long} Sum
   */
  add(addend) {
    if (!Long.isLong(addend)) addend = Long.fromValue(addend)
    return new Long(this.value + addend.value)
  }

  /**
   * Returns the difference of this and the specified Long.
   * @param {!Long|number|string} subtrahend Subtrahend
   * @returns {!Long} Difference
   */
  subtract(subtrahend) {
    if (!Long.isLong(subtrahend)) subtrahend = Long.fromValue(subtrahend)
    return this.add(subtrahend.negate())
  }

  /**
   * Returns the product of this and the specified Long.
   * @param {!Long|number|string} multiplier Multiplier
   * @returns {!Long} Product
   */
  multiply(multiplier) {
    if (this.isZero()) return Long.ZERO
    if (!Long.isLong(multiplier)) multiplier = Long.fromValue(multiplier)
    return new Long(this.value * multiplier.value)
  }

  /**
   * Returns this Long divided by the specified. The result is signed if this Long is signed or
   *  unsigned if this Long is unsigned.
   * @param {!Long|number|string} divisor Divisor
   * @returns {!Long} Quotient
   */
  divide(divisor) {
    if (!Long.isLong(divisor)) divisor = Long.fromValue(divisor)
    if (divisor.isZero()) throw Error('division by zero')
    return new Long(this.value / divisor.value)
  }

  /**
   * Compares this Long's value with the specified's.
   * @param {!Long|number|string} other Other value
   * @returns {number} 0 if they are the same, 1 if the this is greater and -1
   *  if the given one is greater
   */
  compare(other) {
    if (!Long.isLong(other)) other = Long.fromValue(other)
    if (this.value === other.value) return 0
    if (this.value > other.value) return 1
    if (other.value > this.value) return -1
  }

  /**
   * Tests if this Long's value is less than the specified's.
   * @param {!Long|number|string} other Other value
   * @returns {boolean}
   */
  lessThan(other) {
    if (!Long.isLong(other)) other = Long.fromValue(other)
    return this.value < other.value
  }

  /**
   * Negates this Long's value.
   * @returns {!Long} Negated Long
   */
  negate() {
    if (this.equals(Long.MIN_VALUE)) {
      return Long.MIN_VALUE
    }
    return this.not().add(Long.ONE)
  }

  /**
   * Gets the high 32 bits as a signed integer.
   * @returns {number} Signed high bits
   */
  getHighBits() {
    return Number(BigInt.asIntN(32, this.value >> BigInt(32)))
  }

  /**
   * Gets the low 32 bits as a signed integer.
   * @returns {number} Signed low bits
   */
  getLowBits() {
    return Number(BigInt.asIntN(32, this.value))
  }
}

/**
 * Minimum signed value.
 * @type {bigint}
 */
Long.MIN_VALUE = new Long(BigInt('-9223372036854775808'))

/**
 * Maximum signed value.
 * @type {bigint}
 */
Long.MAX_VALUE = new Long(BigInt('9223372036854775807'))

/**
 * Signed zero.
 * @type {Long}
 */
Long.ZERO = Long.fromInt(0)

/**
 * Signed one.
 * @type {!Long}
 */
Long.ONE = Long.fromInt(1)

module.exports = Long
