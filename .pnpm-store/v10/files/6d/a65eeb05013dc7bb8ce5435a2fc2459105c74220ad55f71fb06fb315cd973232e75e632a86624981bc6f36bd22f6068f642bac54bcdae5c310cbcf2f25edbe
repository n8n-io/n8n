/**
 * Capitalize a string.
 * @param {string} str
 */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
/**
 * Checks whether the given string has symbols.
 * @param {string} str
 */
function hasSymbols(str) {
  return /[!"#%&'()*+,./:;<=>?@[\\\]^`{|}]/u.exec(str) // without " ", "$", "-" and "_"
}
/**
 * Checks whether the given string has upper.
 * @param {string} str
 */
function hasUpper(str) {
  return /[A-Z]/u.exec(str)
}

/**
 * Convert text to kebab-case
 * @param {string} str Text to be converted
 * @return {string}
 */
function kebabCase(str) {
  return str
    .replace(/_/gu, '-')
    .replace(/\B([A-Z])/gu, '-$1')
    .toLowerCase()
}

/**
 * Checks whether the given string is kebab-case.
 * @param {string} str
 */
function isKebabCase(str) {
  return (
    !hasUpper(str) &&
    !hasSymbols(str) &&
    !str.startsWith('-') && // starts with hyphen is not kebab-case
    !/_|--|\s/u.test(str)
  )
}

/**
 * Convert text to snake_case
 * @param {string} str Text to be converted
 * @return {string}
 */
function snakeCase(str) {
  return str
    .replace(/\B([A-Z])/gu, '_$1')
    .replace(/-/gu, '_')
    .toLowerCase()
}

/**
 * Checks whether the given string is snake_case.
 * @param {string} str
 */
function isSnakeCase(str) {
  return !hasUpper(str) && !hasSymbols(str) && !/-|__|\s/u.test(str)
}

/**
 * Convert text to camelCase
 * @param {string} str Text to be converted
 * @return {string} Converted string
 */
function camelCase(str) {
  if (isPascalCase(str)) {
    return str.charAt(0).toLowerCase() + str.slice(1)
  }
  return str.replace(/[-_](\w)/gu, (_, c) => (c ? c.toUpperCase() : ''))
}

/**
 * Checks whether the given string is camelCase.
 * @param {string} str
 */
function isCamelCase(str) {
  return !hasSymbols(str) && !/^[A-Z]/u.test(str) && !/-|_|\s/u.test(str)
}

/**
 * Convert text to PascalCase
 * @param {string} str Text to be converted
 * @return {string} Converted string
 */
function pascalCase(str) {
  return capitalize(camelCase(str))
}

/**
 * Checks whether the given string is PascalCase.
 * @param {string} str
 */
function isPascalCase(str) {
  return !hasSymbols(str) && !/^[a-z]/u.test(str) && !/-|_|\s/u.test(str)
}

const convertersMap = {
  'kebab-case': kebabCase,
  snake_case: snakeCase,
  camelCase,
  PascalCase: pascalCase
}

const checkersMap = {
  'kebab-case': isKebabCase,
  snake_case: isSnakeCase,
  camelCase: isCamelCase,
  PascalCase: isPascalCase
}
/**
 * Return case checker
 * @param { 'camelCase' | 'kebab-case' | 'PascalCase' | 'snake_case' } name type of checker to return ('camelCase', 'kebab-case', 'PascalCase')
 * @return {isKebabCase|isCamelCase|isPascalCase|isSnakeCase}
 */
function getChecker(name) {
  return checkersMap[name] || isPascalCase
}

/**
 * Return case converter
 * @param { 'camelCase' | 'kebab-case' | 'PascalCase' | 'snake_case' } name type of converter to return ('camelCase', 'kebab-case', 'PascalCase')
 * @return {kebabCase|camelCase|pascalCase|snakeCase}
 */
function getConverter(name) {
  return convertersMap[name] || pascalCase
}

module.exports = {
  allowedCaseOptions: ['camelCase', 'kebab-case', 'PascalCase'],

  /**
   * Return case converter
   * @param {string} name type of converter to return ('camelCase', 'kebab-case', 'PascalCase')
   * @return {kebabCase|camelCase|pascalCase|snakeCase}
   */
  getConverter,

  /**
   * Return case checker
   * @param {string} name type of checker to return ('camelCase', 'kebab-case', 'PascalCase')
   * @return {isKebabCase|isCamelCase|isPascalCase|isSnakeCase}
   */
  getChecker,

  /**
   * Return case exact converter.
   * If the converted result is not the correct case, the original value is returned.
   * @param { 'camelCase' | 'kebab-case' | 'PascalCase' | 'snake_case' } name type of converter to return ('camelCase', 'kebab-case', 'PascalCase')
   * @return {kebabCase|camelCase|pascalCase|snakeCase}
   */
  getExactConverter(name) {
    const converter = getConverter(name)
    const checker = getChecker(name)
    return (str) => {
      const result = converter(str)
      return checker(result) ? result : str /* cannot convert */
    }
  },

  camelCase,
  pascalCase,
  kebabCase,
  snakeCase,

  isCamelCase,
  isPascalCase,
  isKebabCase,
  isSnakeCase,

  capitalize
}
