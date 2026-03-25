/**
 * @author Yosuke Ota <https://github.com/ota-meshi>
 * See LICENSE file in root directory for full license.
 */
'use strict'

const utils = require('../utils')

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'enforce valid `v-memo` directives',
      categories: ['vue3-essential'],
      url: 'https://eslint.vuejs.org/rules/valid-v-memo.html'
    },
    fixable: null,
    schema: [],
    messages: {
      unexpectedArgument: "'v-memo' directives require no argument.",
      unexpectedModifier: "'v-memo' directives require no modifier.",
      expectedValue: "'v-memo' directives require that attribute value.",
      expectedArray:
        "'v-memo' directives require the attribute value to be an array.",
      insideVFor: "'v-memo' directive does not work inside 'v-for'."
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    /** @type {VElement | null} */
    let vForElement = null
    return utils.defineTemplateBodyVisitor(context, {
      VElement(node) {
        if (!vForElement && utils.hasDirective(node, 'for')) {
          vForElement = node
        }
      },
      'VElement:exit'(node) {
        if (vForElement === node) {
          vForElement = null
        }
      },
      /** @param {VDirective} node */
      "VAttribute[directive=true][key.name.name='memo']"(node) {
        if (vForElement && vForElement !== node.parent.parent) {
          context.report({
            node: node.key,
            messageId: 'insideVFor'
          })
        }
        if (node.key.argument) {
          context.report({
            node: node.key.argument,
            messageId: 'unexpectedArgument'
          })
        }
        if (node.key.modifiers.length > 0) {
          context.report({
            node,
            loc: {
              start: node.key.modifiers[0].loc.start,
              end: node.key.modifiers[node.key.modifiers.length - 1].loc.end
            },
            messageId: 'unexpectedModifier'
          })
        }
        if (!node.value || utils.isEmptyValueDirective(node, context)) {
          context.report({
            node,
            messageId: 'expectedValue'
          })
          return
        }
        if (!node.value.expression) {
          return
        }
        const expressions = [node.value.expression]
        let expression
        while ((expression = expressions.pop())) {
          switch (expression.type) {
            case 'ObjectExpression':
            case 'ClassExpression':
            case 'ArrowFunctionExpression':
            case 'FunctionExpression':
            case 'Literal':
            case 'TemplateLiteral':
            case 'UnaryExpression':
            case 'BinaryExpression':
            case 'UpdateExpression': {
              context.report({
                node: expression,
                messageId: 'expectedArray'
              })
              break
            }
            case 'AssignmentExpression': {
              expressions.push(expression.right)
              break
            }
            case 'TSAsExpression': {
              expressions.push(expression.expression)
              break
            }
            case 'SequenceExpression': {
              expressions.push(
                expression.expressions[expression.expressions.length - 1]
              )
              break
            }
            case 'ConditionalExpression': {
              expressions.push(expression.consequent, expression.alternate)
              break
            }
          }
        }
      }
    })
  }
}
