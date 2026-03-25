/**
 * @author Perry Song
 * @copyright 2023 Perry Song. All rights reserved.
 * See LICENSE file in root directory for full license.
 */
'use strict'

const utils = require('../utils')

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'disallow `v-if` directives on root element',
      categories: undefined,
      url: 'https://eslint.vuejs.org/rules/no-root-v-if.html'
    },
    fixable: null,
    schema: [],
    messages: {
      noRootVIf: '`v-if` should not be used on root element without `v-else`.'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    return {
      /** @param {Program} program */
      Program(program) {
        const element = program.templateBody
        if (element == null) {
          return
        }

        const rootElements = element.children.filter(utils.isVElement)
        if (
          rootElements.length === 1 &&
          utils.hasDirective(rootElements[0], 'if')
        ) {
          context.report({
            node: element,
            loc: element.loc,
            messageId: 'noRootVIf'
          })
        }
      }
    }
  }
}
