/**
 * @author Toru Nagashima
 * @copyright 2017 Toru Nagashima. All rights reserved.
 * See LICENSE file in root directory for full license.
 */
'use strict'

const utils = require('../utils')

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'enforce end tag style',
      categories: ['vue3-strongly-recommended', 'vue2-strongly-recommended'],
      url: 'https://eslint.vuejs.org/rules/html-end-tags.html'
    },
    fixable: 'code',
    schema: [],
    messages: {
      missingEndTag: "'<{{name}}>' should have end tag."
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    let hasInvalidEOF = false

    return utils.defineTemplateBodyVisitor(
      context,
      {
        VElement(node) {
          if (hasInvalidEOF) {
            return
          }

          const name = node.name
          const isVoid = utils.isHtmlVoidElementName(name)
          const isSelfClosing = node.startTag.selfClosing
          const hasEndTag = node.endTag != null

          if (!isVoid && !hasEndTag && !isSelfClosing) {
            context.report({
              node: node.startTag,
              loc: node.startTag.loc,
              messageId: 'missingEndTag',
              data: { name },
              fix: (fixer) => fixer.insertTextAfter(node, `</${name}>`)
            })
          }
        }
      },
      {
        Program(node) {
          hasInvalidEOF = utils.hasInvalidEOF(node)
        }
      }
    )
  }
}
