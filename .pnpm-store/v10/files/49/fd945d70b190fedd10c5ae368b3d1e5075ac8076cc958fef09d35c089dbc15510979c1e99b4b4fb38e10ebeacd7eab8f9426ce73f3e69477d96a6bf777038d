import { UnsafeNumberReason, extractSignificantDigits, getUnsafeNumberReason, isInteger, isNumber } from './utils.js';

/**
 * A lossless number. Stores its numeric value as string
 */
export class LosslessNumber {
  // numeric value as string

  // type information
  isLosslessNumber = true;
  constructor(value) {
    if (!isNumber(value)) {
      throw new Error(`Invalid number (value: "${value}")`);
    }
    this.value = value;
  }

  /**
   * Get the value of the LosslessNumber as number or bigint.
   *
   * - a number is returned for safe numbers and decimal values that only lose some insignificant digits
   * - a bigint is returned for big integer numbers
   * - an Error is thrown for values that will overflow or underflow
   *
   * Note that you can implement your own strategy for conversion by just getting the value as string
   * via .toString(), and using util functions like isInteger, isSafeNumber, getUnsafeNumberReason,
   * and toSafeNumberOrThrow to convert it to a numeric value.
   */
  valueOf() {
    const unsafeReason = getUnsafeNumberReason(this.value);

    // safe or truncate_float
    if (unsafeReason === undefined || unsafeReason === UnsafeNumberReason.truncate_float) {
      return Number.parseFloat(this.value);
    }

    // truncate_integer
    if (isInteger(this.value)) {
      return BigInt(this.value);
    }

    // overflow or underflow
    throw new Error(`Cannot safely convert to number: the value '${this.value}' would ${unsafeReason} and become ${Number.parseFloat(this.value)}`);
  }

  /**
   * Get the value of the LosslessNumber as string.
   */
  toString() {
    return this.value;
  }

  // Note: we do NOT implement a .toJSON() method, and you should not implement
  // or use that, it cannot safely turn the numeric value in the string into
  // stringified JSON since it has to be parsed into a number first.
}

/**
 * Test whether a value is a LosslessNumber
 */
export function isLosslessNumber(value) {
  // @ts-ignore
  return value && typeof value === 'object' && value.isLosslessNumber === true || false;
}

/**
 * Convert a number into a LosslessNumber if this is possible in a safe way
 * If the value has too many digits, or is NaN or Infinity, an error will be thrown
 */
export function toLosslessNumber(value) {
  if (extractSignificantDigits(String(value)).length > 15) {
    throw new Error(`Invalid number: contains more than 15 digits and is most likely truncated and unsafe by itself (value: ${value})`);
  }
  if (Number.isNaN(value)) {
    throw new Error('Invalid number: NaN');
  }
  if (!Number.isFinite(value)) {
    throw new Error(`Invalid number: ${value}`);
  }
  return new LosslessNumber(String(value));
}
//# sourceMappingURL=LosslessNumber.js.map