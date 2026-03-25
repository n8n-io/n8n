'use strict';

/**
 * Check if a character is a delimiter as defined in section 3.2.6 of RFC 7230.
 *
 *
 * @param {number} code The code of the character to check.
 * @returns {boolean} `true` if the character is a delimiter, else `false`.
 * @public
 */
function isDelimiter(code) {
  return code === 0x22                // '"'
    || code === 0x28                  // '('
    || code === 0x29                  // ')'
    || code === 0x2C                  // ','
    || code === 0x2F                  // '/'
    || code >= 0x3A && code <= 0x40   // ':', ';', '<', '=', '>', '?' '@'
    || code >= 0x5B && code <= 0x5D   // '[', '\', ']'
    || code === 0x7B                  // '{'
    || code === 0x7D;                 // '}'
}

/**
 * Check if a character is allowed in a token as defined in section 3.2.6
 * of RFC 7230.
 *
 * @param {number} code The code of the character to check.
 * @returns {boolean} `true` if the character is allowed, else `false`.
 * @public
 */
function isTokenChar(code) {
  return code === 0x21                // '!'
    || code >= 0x23 && code <= 0x27   // '#', '$', '%', '&', '''
    || code === 0x2A                  // '*'
    || code === 0x2B                  // '+'
    || code === 0x2D                  // '-'
    || code === 0x2E                  // '.'
    || code >= 0x30 && code <= 0x39   // 0-9
    || code >= 0x41 && code <= 0x5A   // A-Z
    || code >= 0x5E && code <= 0x7A   // '^', '_', '`', a-z
    || code === 0x7C                  // '|'
    || code === 0x7E;                 // '~'
}

/**
 * Check if a character is a printable ASCII character.
 *
 * @param {number} code The code of the character to check.
 * @returns {boolean} `true` if `code` is in the %x20-7E range, else `false`.
 * @public
 */
function isPrint(code) {
  return code >= 0x20 && code <= 0x7E;
}

/**
 * Check if a character is an extended ASCII character.
 *
 * @param {number} code The code of the character to check.
 * @returns {boolean} `true` if `code` is in the %x80-FF range, else `false`.
 * @public
 */
function isExtended(code) {
  return code >= 0x80 && code <= 0xFF;
}

module.exports = {
  isDelimiter: isDelimiter,
  isTokenChar: isTokenChar,
  isExtended: isExtended,
  isPrint: isPrint
};
