const RE_REGEXP_CHAR = /[\\^$.*+?()[\]{}|]/gu
const RE_HAS_REGEXP_CHAR = new RegExp(RE_REGEXP_CHAR.source)

const RE_REGEXP_STR = /^\/(.+)\/(.*)$/u

/**
 * Escapes the `RegExp` special characters "^", "$", "\", ".", "*", "+",
 * "?", "(", ")", "[", "]", "{", "}", and "|" in `string`.
 *
 * @param {string} string The string to escape.
 * @returns {string} Returns the escaped string.
 */
function escape(string) {
  return string && RE_HAS_REGEXP_CHAR.test(string)
    ? string.replace(RE_REGEXP_CHAR, String.raw`\$&`)
    : string
}

/**
 * Convert a string to the `RegExp`.
 * Normal strings (e.g. `"foo"`) is converted to `/^foo$/` of `RegExp`.
 * Strings like `"/^foo/i"` are converted to `/^foo/i` of `RegExp`.
 *
 * @param {string} string The string to convert.
 * @returns {RegExp} Returns the `RegExp`.
 */
function toRegExp(string) {
  const parts = RE_REGEXP_STR.exec(string)
  if (parts) {
    return new RegExp(parts[1], parts[2])
  }
  return new RegExp(`^${escape(string)}$`)
}

/**
 * Checks whether given string is regexp string
 * @param {string} string
 * @returns {boolean}
 */
function isRegExp(string) {
  return RE_REGEXP_STR.test(string)
}

module.exports = {
  escape,
  toRegExp,
  isRegExp
}
