/**
 * @author Toru Nagashima
 * @copyright 2017 Toru Nagashima. All rights reserved.
 * See LICENSE file in root directory for full license.
 */
'use strict'

const utils = require('../utils')

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'enforce valid template root',
      categories: ['vue3-essential', 'vue2-essential'],
      url: 'https://eslint.vuejs.org/rules/valid-template-root.html'
    },
    fixable: null,
    schema: [],
    messages: {
      emptySrc:
        "The template root with 'src' attribute is required to be empty.",
      noChild: 'The template requires child element.'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    const sourceCode = context.getSourceCode()

    return {
      /** @param {Program} program */
      Program(program) {
        const element = program.templateBody
        if (element == null) {
          return
        }

        const hasSrc = utils.hasAttribute(element, 'src')
        const rootElements = []

        for (const child of element.children) {
          if (sourceCode.getText(child).trim() !== '') {
            rootElements.push(child)
          }
        }

        if (hasSrc && rootElements.length > 0) {
          for (const element of rootElements) {
            context.report({
              node: element,
              loc: element.loc,
              messageId: 'emptySrc'
            })
          }
        } else if (rootElements.length === 0 && !hasSrc) {
          context.report({
            node: element,
            loc: element.loc,
            messageId: 'noChild'
          })
        }
      }
    }
  }
}
