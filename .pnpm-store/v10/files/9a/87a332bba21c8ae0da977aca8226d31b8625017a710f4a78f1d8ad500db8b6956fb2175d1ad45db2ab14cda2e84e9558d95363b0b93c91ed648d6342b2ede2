const { isVElement } = require('..')

class StyleVariablesContext {
  /**
   * @param {RuleContext} context
   * @param {VElement[]} styles
   */
  constructor(context, styles) {
    this.context = context
    this.styles = styles
    /** @type {VReference[]} */
    this.references = []
    /** @type {VExpressionContainer[]} */
    this.vBinds = []
    for (const style of styles) {
      for (const node of style.children) {
        if (node.type === 'VExpressionContainer') {
          this.vBinds.push(node)
          for (const ref of node.references.filter(
            (ref) => ref.variable == null
          )) {
            this.references.push(ref)
          }
        }
      }
    }
  }
}

module.exports = {
  getStyleVariablesContext,
  StyleVariablesContext
}

/** @type {WeakMap<VElement, StyleVariablesContext>} */
const cache = new WeakMap()
/**
 * Get the style vars context
 * @param {RuleContext} context
 * @returns {StyleVariablesContext | null}
 */
function getStyleVariablesContext(context) {
  const sourceCode = context.getSourceCode()
  const df =
    sourceCode.parserServices.getDocumentFragment &&
    sourceCode.parserServices.getDocumentFragment()
  if (!df) {
    return null
  }
  const styles = df.children.filter(
    /** @returns {e is VElement} */
    (e) => isVElement(e) && e.name === 'style'
  )
  if (styles.length === 0) {
    return null
  }
  let ctx = cache.get(styles[0])
  if (ctx) {
    return ctx
  }
  ctx = new StyleVariablesContext(context, styles)
  cache.set(styles[0], ctx)
  return ctx
}
