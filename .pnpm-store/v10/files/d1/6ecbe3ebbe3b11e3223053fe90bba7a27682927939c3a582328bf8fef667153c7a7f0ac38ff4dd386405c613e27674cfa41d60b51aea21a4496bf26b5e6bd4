/**
 * @author Doug Wade <douglas.b.wade@gmail.com>
 * See LICENSE file in root directory for full license.
 */
'use strict'

const utils = require('../utils')
const xnv = require('xml-name-validator')

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'require valid attribute names',
      categories: ['vue3-essential', 'vue2-essential'],
      url: 'https://eslint.vuejs.org/rules/valid-attribute-name.html'
    },
    fixable: null,
    schema: [],
    messages: {
      attribute: 'Attribute name {{name}} is not valid.'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    /**
     * @param {string | VIdentifier} key
     * @return {string}
     */
    const getName = (key) => (typeof key === 'string' ? key : key.name)

    return utils.defineTemplateBodyVisitor(context, {
      /** @param {VDirective | VAttribute} node */
      VAttribute(node) {
        if (utils.isCustomComponent(node.parent.parent)) {
          return
        }

        const name = getName(node.key.name)

        if (
          node.directive &&
          name === 'bind' &&
          node.key.argument &&
          node.key.argument.type === 'VIdentifier' &&
          !xnv.name(node.key.argument.name)
        ) {
          context.report({
            node,
            messageId: 'attribute',
            data: {
              name: node.key.argument.name
            }
          })
        }

        if (!node.directive && !xnv.name(name)) {
          context.report({
            node,
            messageId: 'attribute',
            data: {
              name
            }
          })
        }
      }
    })
  }
}
