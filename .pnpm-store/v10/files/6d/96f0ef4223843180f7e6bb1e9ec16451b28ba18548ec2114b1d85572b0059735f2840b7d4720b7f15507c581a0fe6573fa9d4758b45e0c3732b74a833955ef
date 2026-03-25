/**
 * @author tyankatsu <https://github.com/tyankatsu0105>
 * See LICENSE file in root directory for full license.
 */
'use strict'

const { defineTemplateBodyVisitor } = require('../utils')

/**
 * count ObjectExpression element
 * @param {VDirective & {value: VExpressionContainer & {expression: ArrayExpression}}} node
 * @return {number}
 */
function countObjectExpression(node) {
  return node.value.expression.elements.filter(
    (element) => element && element.type === 'ObjectExpression'
  ).length
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'disallow passing multiple objects in an array to class',
      categories: undefined,
      url: 'https://eslint.vuejs.org/rules/no-multiple-objects-in-class.html'
    },
    fixable: null,
    schema: [],
    messages: {
      unexpected: 'Unexpected multiple objects. Merge objects.'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    return defineTemplateBodyVisitor(context, {
      /** @param {VDirective & {value: VExpressionContainer & {expression: ArrayExpression}}} node */
      'VAttribute[directive=true][key.argument.name="class"][key.name.name="bind"][value.expression.type="ArrayExpression"]'(
        node
      ) {
        if (countObjectExpression(node) > 1) {
          context.report({
            node,
            loc: node.loc,
            messageId: 'unexpected'
          })
        }
      }
    })
  }
}
