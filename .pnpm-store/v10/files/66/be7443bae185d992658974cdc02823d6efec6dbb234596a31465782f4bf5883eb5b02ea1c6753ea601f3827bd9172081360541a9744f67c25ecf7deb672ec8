/**
 * Test whether a string contains an integer number
 */
export function isInteger(value) {
  return INTEGER_REGEX.test(value);
}
const INTEGER_REGEX = /^-?[0-9]+$/;

/**
 * Test whether a string contains a number
 * http://stackoverflow.com/questions/13340717/json-numbers-regular-expression
 */
export function isNumber(value) {
  return NUMBER_REGEX.test(value);
}
const NUMBER_REGEX = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/;

/**
 * Test whether a string can be safely represented with a number
 * without information loss.
 *
 * When approx is true, floating point numbers that lose a few digits but
 * are still approximately equal in value are considered safe too.
 * Integer numbers must still be exactly equal.
 */
export function isSafeNumber(value, config) {
  const num = Number.parseFloat(value);
  const str = String(num);
  const v = extractSignificantDigits(value);
  const s = extractSignificantDigits(str);
  if (v === s) {
    return true;
  }
  if (config?.approx === true) {
    // A value is approximately equal when:
    // 1. it is a floating point number, not an integer
    // 2. it has at least 14 digits
    // 3. the first 14 digits are equal
    const requiredDigits = 14;
    if (!isInteger(value) && s.length >= requiredDigits && v.startsWith(s.substring(0, requiredDigits))) {
      return true;
    }
  }
  return false;
}
export let UnsafeNumberReason = /*#__PURE__*/function (UnsafeNumberReason) {
  UnsafeNumberReason["underflow"] = "underflow";
  UnsafeNumberReason["overflow"] = "overflow";
  UnsafeNumberReason["truncate_integer"] = "truncate_integer";
  UnsafeNumberReason["truncate_float"] = "truncate_float";
  return UnsafeNumberReason;
}({});

/**
 * When the provided value is an unsafe number, describe what the reason is:
 * overflow, underflow, truncate_integer, or truncate_float.
 * Returns undefined when the value is safe.
 */
export function getUnsafeNumberReason(value) {
  if (isSafeNumber(value, {
    approx: false
  })) {
    return undefined;
  }
  if (isInteger(value)) {
    return UnsafeNumberReason.truncate_integer;
  }
  const num = Number.parseFloat(value);
  if (!Number.isFinite(num)) {
    return UnsafeNumberReason.overflow;
  }
  if (num === 0) {
    return UnsafeNumberReason.underflow;
  }
  return UnsafeNumberReason.truncate_float;
}

/**
 * Convert a string into a number when it is safe to do so.
 * Throws an error otherwise, explaining the reason.
 */
export function toSafeNumberOrThrow(value, config) {
  const number = Number.parseFloat(value);
  const unsafeReason = getUnsafeNumberReason(value);
  if (config?.approx === true ? unsafeReason && unsafeReason !== UnsafeNumberReason.truncate_float : unsafeReason) {
    const unsafeReasonText = unsafeReason?.replace(/_\w+$/, '');
    throw new Error(`Cannot safely convert to number: the value '${value}' would ${unsafeReasonText} and become ${number}`);
  }
  return number;
}

/**
 * Get the significant digits of a number.
 *
 * For example:
 *   '2.34' returns '234'
 *   '-77' returns '77'
 *   '0.003400' returns '34'
 *   '120.5e+30' returns '1205'
 **/
export function extractSignificantDigits(value) {
  return value
  // from "-0.250e+30" to "-0.250"
  .replace(EXPONENTIAL_PART_REGEX, '')

  // from "-0.250" to "-0250"
  .replace(DOT_REGEX, '')

  // from "-0250" to "-025"
  .replace(TRAILING_ZEROS_REGEX, '')

  // from "-025" to "25"
  .replace(LEADING_MINUS_AND_ZEROS_REGEX, '');
}
const EXPONENTIAL_PART_REGEX = /[eE][+-]?\d+$/;
const LEADING_MINUS_AND_ZEROS_REGEX = /^-?(0*)?/;
const DOT_REGEX = /\./;
const TRAILING_ZEROS_REGEX = /0+$/;
//# sourceMappingURL=utils.js.map