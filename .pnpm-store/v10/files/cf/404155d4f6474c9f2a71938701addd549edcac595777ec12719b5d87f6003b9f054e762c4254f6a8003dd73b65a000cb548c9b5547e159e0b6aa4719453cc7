/**
 * @fileoverview Requires valid keys in model option.
 * @author Alex Sokolov
 */
'use strict'

const utils = require('../utils')

const VALID_MODEL_KEYS = new Set(['prop', 'event'])

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'require valid keys in model option',
      categories: ['vue2-essential'],
      url: 'https://eslint.vuejs.org/rules/valid-model-definition.html'
    },
    fixable: null,
    deprecated: true,
    schema: [],
    messages: {
      invalidKey: "Invalid key '{{name}}' in model option."
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    return utils.executeOnVue(context, (obj) => {
      const modelProperty = utils.findProperty(obj, 'model')
      if (!modelProperty || modelProperty.value.type !== 'ObjectExpression') {
        return
      }

      for (const p of modelProperty.value.properties) {
        if (p.type !== 'Property') {
          continue
        }
        const name = utils.getStaticPropertyName(p)
        if (!name) {
          continue
        }
        if (!VALID_MODEL_KEYS.has(name)) {
          context.report({
            node: p,
            messageId: 'invalidKey',
            data: {
              name
            }
          })
        }
      }
    })
  }
}
