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
  if (isInteger(value)) {
    return Number.isSafeInteger(Number.parseInt(value, 10));
  }
  const num = Number.parseFloat(value);
  const parsed = String(num);
  if (value === parsed) {
    return true;
  }
  const valueDigits = extractSignificantDigits(value);
  const parsedDigits = extractSignificantDigits(parsed);
  if (valueDigits === parsedDigits) {
    return true;
  }
  if (config?.approx === true) {
    // A value is approximately equal when:
    // 1. it is a floating point number, not an integer
    // 2. it has at least 14 digits
    // 3. the first 14 digits are equal
    const requiredDigits = 14;
    if (!isInteger(value) && parsedDigits.length >= requiredDigits && valueDigits.startsWith(parsedDigits.substring(0, requiredDigits))) {
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
 * Split a number into sign, digits, and exponent.
 * The value can be constructed again from a split number by inserting a dot
 * at the second character of the digits if there is more than one digit,
 * prepending it with the sign, and appending the exponent like `e${exponent}`
 */
export function splitNumber(value) {
  const match = value.match(/^(-?)(\d+\.?\d*)([eE]([+-]?\d+))?$/);
  if (!match) {
    throw new SyntaxError(`Invalid number: ${value}`);
  }
  const sign = match[1];
  const digitsStr = match[2];
  let exponent = match[4] !== undefined ? Number.parseInt(match[4], 10) : 0;
  const dot = digitsStr.indexOf('.');
  exponent += dot !== -1 ? dot - 1 : digitsStr.length - 1;
  const digits = digitsStr.replace('.', '') // remove the dot (must be removed before removing leading zeros)
  .replace(/^0*/, zeros => {
    // remove leading zeros, add their count to the exponent
    exponent -= zeros.length;
    return '';
  }).replace(/0*$/, ''); // remove trailing zeros

  return digits.length > 0 ? {
    sign,
    digits,
    exponent
  } : {
    sign,
    digits: '0',
    exponent: exponent + 1
  };
}

/**
 * Compare two strings containing a numeric value
 * Returns 1 when a is larger than b, 0 when they are equal,
 * and -1 when a is smaller than b.
 */
export function compareNumber(a, b) {
  if (a === b) {
    return 0;
  }
  const aa = splitNumber(a);
  const bb = splitNumber(b);
  const sign = aa.sign === '-' ? -1 : 1;
  if (aa.sign !== bb.sign) {
    if (aa.digits === '0' && bb.digits === '0') {
      return 0;
    }
    return sign;
  }
  if (aa.exponent !== bb.exponent) {
    return aa.exponent > bb.exponent ? sign : aa.exponent < bb.exponent ? -sign : 0;
  }
  return aa.digits > bb.digits ? sign : aa.digits < bb.digits ? -sign : 0;
}

/**
 * Count the significant digits of a number.
 *
 * For example:
 *   '2.34' returns 3
 *   '-77' returns 2
 *   '0.003400' returns 2
 *   '120.5e+30' returns 4
 **/
export function countSignificantDigits(value) {
  const {
    start,
    end
  } = getSignificantDigitRange(value);
  const dot = value.indexOf('.');
  if (dot === -1 || dot < start || dot > end) {
    return end - start;
  }
  return end - start - 1;
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
  const {
    start,
    end
  } = getSignificantDigitRange(value);
  const digits = value.substring(start, end);
  const dot = digits.indexOf('.');
  if (dot === -1) {
    return digits;
  }
  return digits.substring(0, dot) + digits.substring(dot + 1);
}

/**
 * Returns the range (start to end) of the significant digits of a value.
 * Note that this range _may_ contain the decimal dot.
 *
 * For example:
 *
 *     getSignificantDigitRange('0.0325900') // { start: 3, end: 7 }
 *     getSignificantDigitRange('2.0300')    // { start: 0, end: 3 }
 *     getSignificantDigitRange('0.0')       // { start: 3, end: 3 }
 *
 */
function getSignificantDigitRange(value) {
  let start = 0;
  if (value[0] === '-') {
    start++;
  }
  while (value[start] === '0' || value[start] === '.') {
    start++;
  }
  let end = value.lastIndexOf('e');
  if (end === -1) {
    end = value.lastIndexOf('E');
  }
  if (end === -1) {
    end = value.length;
  }
  while ((value[end - 1] === '0' || value[end - 1] === '.') && end > start) {
    end--;
  }
  return {
    start,
    end
  };
}
//# sourceMappingURL=utils.js.map