/**
 * @author Yosuke Ota
 * See LICENSE file in root directory for full license.
 */
'use strict'

const utils = require('../utils')

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'disallow using deprecated the `is` attribute on HTML elements (in Vue.js 3.0.0+)',
      categories: ['vue3-essential'],
      url: 'https://eslint.vuejs.org/rules/no-deprecated-html-element-is.html'
    },
    fixable: null,
    schema: [],
    messages: {
      unexpected: 'The `is` attribute on HTML element are deprecated.'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    /** @param {VElement} node */
    function isValidElement(node) {
      return (
        !utils.isHtmlWellKnownElementName(node.rawName) &&
        !utils.isSvgWellKnownElementName(node.rawName) &&
        !utils.isMathWellKnownElementName(node.rawName)
      )
    }
    return utils.defineTemplateBodyVisitor(context, {
      /** @param {VDirective} node */
      "VAttribute[directive=true][key.name.name='bind'][key.argument.name='is']"(
        node
      ) {
        if (isValidElement(node.parent.parent)) {
          return
        }
        context.report({
          node,
          loc: node.loc,
          messageId: 'unexpected'
        })
      },
      /** @param {VAttribute} node */
      "VAttribute[directive=false][key.name='is']"(node) {
        if (isValidElement(node.parent.parent)) {
          return
        }
        if (node.value && node.value.value.startsWith('vue:')) {
          // Usage on native elements 3.1+
          return
        }
        context.report({
          node,
          loc: node.loc,
          messageId: 'unexpected'
        })
      }
    })
  }
}
