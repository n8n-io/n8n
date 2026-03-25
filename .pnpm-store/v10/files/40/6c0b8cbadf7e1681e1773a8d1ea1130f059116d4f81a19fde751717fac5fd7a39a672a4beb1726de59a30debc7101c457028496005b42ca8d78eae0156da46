import parser from 'postcss-selector-parser'

/**
 * @template {string | import('postcss-selector-parser').Root} T
 *
 * Prefix all classes in the selector with the given prefix
 *
 * It can take either a string or a selector AST and will return the same type
 *
 * @param {string} prefix
 * @param {T} selector
 * @param {boolean} prependNegative
 * @returns {T}
 */
export default function (prefix, selector, prependNegative = false) {
  if (prefix === '') {
    return selector
  }

  /** @type {import('postcss-selector-parser').Root} */
  let ast = typeof selector === 'string' ? parser().astSync(selector) : selector

  ast.walkClasses((classSelector) => {
    let baseClass = classSelector.value
    let shouldPlaceNegativeBeforePrefix = prependNegative && baseClass.startsWith('-')

    classSelector.value = shouldPlaceNegativeBeforePrefix
      ? `-${prefix}${baseClass.slice(1)}`
      : `${prefix}${baseClass}`
  })

  return typeof selector === 'string' ? ast.toString() : ast
}
