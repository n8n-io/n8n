/**
 * @author ItMaga
 * See LICENSE file in root directory for full license.
 */
'use strict'

const utils = require('../utils')

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'require components to be the default export',
      categories: undefined,
      url: 'https://eslint.vuejs.org/rules/require-default-export.html'
    },
    fixable: null,
    schema: [],
    messages: {
      missing: 'Missing default export.',
      mustBeDefaultExport: 'Component must be the default export.'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    const sourceCode = context.getSourceCode()
    const documentFragment = sourceCode.parserServices.getDocumentFragment?.()

    const hasScript =
      documentFragment &&
      documentFragment.children.some(
        (e) => utils.isVElement(e) && e.name === 'script'
      )

    if (utils.isScriptSetup(context) || !hasScript) {
      return {}
    }

    let hasDefaultExport = false
    let hasDefinedComponent = false

    return utils.compositingVisitors(
      utils.defineVueVisitor(context, {
        onVueObjectExit() {
          hasDefinedComponent = true
        }
      }),

      {
        'Program > ExportDefaultDeclaration'() {
          hasDefaultExport = true
        },

        /**
         * @param {Program} node
         */
        'Program:exit'(node) {
          if (!hasDefaultExport && node.body.length > 0) {
            context.report({
              loc: node.tokens[node.tokens.length - 1].loc,
              messageId: hasDefinedComponent ? 'mustBeDefaultExport' : 'missing'
            })
          }
        }
      }
    )
  }
}
