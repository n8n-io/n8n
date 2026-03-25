/**
 * @author Yosuke Ota
 * See LICENSE file in root directory for full license.
 */
'use strict'

const { wrapStylisticOrCoreRule, flatten } = require('../utils')

// eslint-disable-next-line internal/no-invalid-meta
module.exports = wrapStylisticOrCoreRule('quote-props', {
  skipDynamicArguments: true,
  preprocess(context, { wrapContextToOverrideProperties, defineVisitor }) {
    const sourceCode = context.getSourceCode()
    /**
     * @type {'"' | "'" | null}
     */
    let htmlQuote = null
    defineVisitor({
      /** @param {VExpressionContainer} node */
      'VAttribute > VExpressionContainer.value'(node) {
        const text = sourceCode.getText(node)
        const firstChar = text[0]
        htmlQuote = firstChar === "'" || firstChar === '"' ? firstChar : null
      },
      'VAttribute > VExpressionContainer.value:exit'() {
        htmlQuote = null
      }
    })

    wrapContextToOverrideProperties({
      // Override the report method and replace the quotes in the fixed text with safe quotes.
      report(descriptor) {
        if (htmlQuote) {
          const expectedQuote = htmlQuote === '"' ? "'" : '"'
          context.report({
            ...descriptor,
            *fix(fixer) {
              for (const fix of flatten(
                descriptor.fix && descriptor.fix(fixer)
              )) {
                yield fixer.replaceTextRange(
                  fix.range,
                  fix.text.replace(/["']/gu, expectedQuote)
                )
              }
            }
          })
        } else {
          context.report(descriptor)
        }
      }
    })
  }
})
