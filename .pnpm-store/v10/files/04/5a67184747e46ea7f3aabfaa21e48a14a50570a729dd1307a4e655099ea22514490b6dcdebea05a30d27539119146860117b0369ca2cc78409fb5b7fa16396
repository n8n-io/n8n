'use strict'

/**
 * Check whether the given token is a wildcard.
 * @param {Token|undefined|null} token The token to check.
 * @returns {boolean} `true` if the token is a wildcard.
 */
function isWildcard(token) {
  return token != null && token.type === 'Punctuator' && token.value === '*'
}

/**
 * Check whether the given token is a question.
 * @param {Token|undefined|null} token The token to check.
 * @returns {boolean} `true` if the token is a question.
 */
function isQuestion(token) {
  return token != null && token.type === 'Punctuator' && token.value === '?'
}

/**
 * Check whether the given token is an extends keyword.
 * @param {Token|undefined|null} token The token to check.
 * @returns {boolean} `true` if the token is an extends keywordn.
 */
function isExtendsKeyword(token) {
  return token != null && token.type === 'Keyword' && token.value === 'extends'
}

/**
 * Check whether the given token is a whitespace.
 * @param {Token|undefined|null} token The token to check.
 * @returns {boolean} `true` if the token is a whitespace.
 */
function isNotWhitespace(token) {
  return (
    token != null &&
    token.type !== 'HTMLWhitespace' &&
    (token.type !== 'JSXText' || !!token.value.trim())
  )
}

/**
 * Check whether the given token is a comment.
 * @param {Token|undefined|null} token The token to check.
 * @returns {boolean} `true` if the token is a comment.
 */
function isComment(token) {
  return (
    token != null &&
    (token.type === 'Block' ||
      token.type === 'Line' ||
      token.type === 'Shebang' ||
      (typeof token.type ===
        'string' /* Although acorn supports new tokens, espree may not yet support new tokens.*/ &&
        token.type.endsWith('Comment')))
  )
}

/**
 * Check whether the given token is a comment.
 * @param {Token|undefined|null} token The token to check.
 * @returns {boolean} `false` if the token is a comment.
 */
function isNotComment(token) {
  return (
    token != null &&
    token.type !== 'Block' &&
    token.type !== 'Line' &&
    token.type !== 'Shebang' &&
    !(
      typeof token.type ===
        'string' /* Although acorn supports new tokens, espree may not yet support new tokens.*/ &&
      token.type.endsWith('Comment')
    )
  )
}

/**
 * Check whether the given node is not an empty text node.
 * @param {ASTNode} node The node to check.
 * @returns {boolean} `false` if the token is empty text node.
 */
function isNotEmptyTextNode(node) {
  return !(node.type === 'VText' && node.value.trim() === '')
}

/**
 * Check whether the given token is a pipe operator.
 * @param {Token|undefined|null} token The token to check.
 * @returns {boolean} `true` if the token is a pipe operator.
 */
function isPipeOperator(token) {
  return token != null && token.type === 'Punctuator' && token.value === '|'
}

/**
 * Get the last element.
 * @template T
 * @param {T[]} xs The array to get the last element.
 * @returns {T | undefined} The last element or undefined.
 */
function last(xs) {
  return xs.length === 0 ? undefined : xs[xs.length - 1]
}

module.exports = {
  isWildcard,
  isQuestion,
  isExtendsKeyword,
  isNotWhitespace,
  isComment,
  isNotComment,
  isNotEmptyTextNode,
  isPipeOperator,
  last
}
