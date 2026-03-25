'use strict'

/**
 * Checks if the given value is a valid LastEventId.
 * @param {string} value
 * @returns {boolean}
 */
function isValidLastEventId (value) {
  // LastEventId should not contain U+0000 NULL
  return value.indexOf('\u0000') === -1
}

/**
 * Checks if the given value is a base 10 digit.
 * @param {string} value
 * @returns {boolean}
 */
function isASCIINumber (value) {
  if (value.length === 0) return false
  for (let i = 0; i < value.length; i++) {
    if (value.charCodeAt(i) < 0x30 || value.charCodeAt(i) > 0x39) return false
  }
  return true
}

module.exports = {
  isValidLastEventId,
  isASCIINumber
}
