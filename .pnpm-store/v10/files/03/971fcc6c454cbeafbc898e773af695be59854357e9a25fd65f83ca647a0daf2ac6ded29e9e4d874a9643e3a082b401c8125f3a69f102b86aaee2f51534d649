/**
 * @fileoverview enforce specific casing for component definition name
 * @author Armano
 */
'use strict'

const utils = require('../utils')
const casing = require('../utils/casing')
const allowedCaseOptions = ['PascalCase', 'kebab-case']

/**
 * @param {Expression | SpreadElement} node
 * @returns {node is (Literal | TemplateLiteral)}
 */
function canConvert(node) {
  return (
    node.type === 'Literal' ||
    (node.type === 'TemplateLiteral' &&
      node.expressions.length === 0 &&
      node.quasis.length === 1)
  )
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'enforce specific casing for component definition name',
      categories: ['vue3-strongly-recommended', 'vue2-strongly-recommended'],
      url: 'https://eslint.vuejs.org/rules/component-definition-name-casing.html'
    },
    fixable: 'code',
    schema: [
      {
        enum: allowedCaseOptions
      }
    ],
    messages: {
      incorrectCase: 'Property name "{{value}}" is not {{caseType}}.'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    const options = context.options[0]
    const caseType = allowedCaseOptions.includes(options)
      ? options
      : 'PascalCase'

    /**
     * @param {Literal | TemplateLiteral} node
     */
    function convertName(node) {
      /** @type {string} */
      let nodeValue
      /** @type {Range} */
      let range
      if (node.type === 'TemplateLiteral') {
        const quasis = node.quasis[0]
        nodeValue = quasis.value.cooked
        range = quasis.range
      } else {
        nodeValue = `${node.value}`
        range = node.range
      }

      if (!casing.getChecker(caseType)(nodeValue)) {
        context.report({
          node,
          messageId: 'incorrectCase',
          data: {
            value: nodeValue,
            caseType
          },
          fix: (fixer) =>
            fixer.replaceTextRange(
              [range[0] + 1, range[1] - 1],
              casing.getExactConverter(caseType)(nodeValue)
            )
        })
      }
    }

    return utils.compositingVisitors(
      utils.executeOnCallVueComponent(context, (node) => {
        if (node.arguments.length === 2) {
          const argument = node.arguments[0]

          if (canConvert(argument)) {
            convertName(argument)
          }
        }
      }),
      utils.executeOnVue(context, (obj) => {
        const node = utils.findProperty(obj, 'name')

        if (!node) return
        if (!canConvert(node.value)) return
        convertName(node.value)
      }),
      utils.defineScriptSetupVisitor(context, {
        onDefineOptionsEnter(node) {
          if (node.arguments.length === 0) return
          const define = node.arguments[0]
          if (define.type !== 'ObjectExpression') return
          const nameNode = utils.findProperty(define, 'name')
          if (!nameNode) return
          if (!canConvert(nameNode.value)) return
          convertName(nameNode.value)
        }
      })
    )
  }
}
