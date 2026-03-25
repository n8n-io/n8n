/**
 * @fileoverview Alphabetizes static class names.
 * @author Maciej Chmurski
 */
'use strict'

const { defineTemplateBodyVisitor } = require('../utils')

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      url: 'https://eslint.vuejs.org/rules/static-class-names-order.html',
      description: 'enforce static class names order',
      categories: undefined
    },
    fixable: 'code',
    schema: [],
    messages: {
      shouldBeOrdered: 'Classes should be ordered alphabetically.'
    }
  },
  /** @param {RuleContext} context */
  create: (context) =>
    defineTemplateBodyVisitor(context, {
      /** @param {VAttribute} node */
      "VAttribute[directive=false][key.name='class']"(node) {
        const value = node.value
        if (!value) {
          return
        }
        const classList = value.value
        const classListWithWhitespace = classList.split(/(\s+)/)

        // Detect and reuse any type of whitespace.
        let divider = ''
        if (classListWithWhitespace.length > 1) {
          divider = classListWithWhitespace[1]
        }

        const classListNoWhitespace = classListWithWhitespace.filter(
          (className) => className.trim() !== ''
        )
        const classListSorted = classListNoWhitespace.sort().join(divider)

        if (classList !== classListSorted) {
          context.report({
            node,
            loc: node.loc,
            messageId: 'shouldBeOrdered',
            fix: (fixer) => fixer.replaceText(value, `"${classListSorted}"`)
          })
        }
      }
    })
}
