/**
 * @param {Comment} node
 * @returns {boolean}
 */
const isJSDocComment = (node) =>
  node.type === 'Block' &&
  node.value.charAt(0) === '*' &&
  node.value.charAt(1) !== '*'

/**
 * @param {Comment} node
 * @returns {boolean}
 */
const isBlockComment = (node) =>
  node.type === 'Block' &&
  (node.value.charAt(0) !== '*' || node.value.charAt(1) === '*')

module.exports = {
  isJSDocComment,
  isBlockComment
}
