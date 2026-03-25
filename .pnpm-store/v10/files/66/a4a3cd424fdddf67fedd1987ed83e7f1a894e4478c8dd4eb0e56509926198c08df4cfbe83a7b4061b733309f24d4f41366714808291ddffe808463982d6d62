/**
 * @author Flo Edelmann
 * See LICENSE file in root directory for full license.
 */
'use strict'

const utils = require('../utils')

const allowedPropNames = new Set(['modelValue', 'model-value'])
const allowedEventNames = new Set(['update:modelValue', 'update:model-value'])

/**
 * @param {ObjectExpression} node
 * @param {string} key
 * @returns {Literal | TemplateLiteral | undefined}
 */
function findPropertyValue(node, key) {
  const property = node.properties.find(
    (property) =>
      property.type === 'Property' &&
      property.key.type === 'Identifier' &&
      property.key.name === key
  )
  if (
    !property ||
    property.type !== 'Property' ||
    !utils.isStringLiteral(property.value)
  ) {
    return undefined
  }
  return property.value
}

/**
 * @param {RuleFixer} fixer
 * @param {Literal | TemplateLiteral} node
 * @param {string} text
 */
function replaceLiteral(fixer, node, text) {
  return fixer.replaceTextRange([node.range[0] + 1, node.range[1] - 1], text)
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'disallow deprecated `model` definition (in Vue.js 3.0.0+)',
      categories: ['vue3-essential'],
      url: 'https://eslint.vuejs.org/rules/no-deprecated-model-definition.html'
    },
    fixable: null,
    hasSuggestions: true,
    schema: [
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          allowVue3Compat: {
            type: 'boolean'
          }
        }
      }
    ],
    messages: {
      deprecatedModel: '`model` definition is deprecated.',
      vue3Compat:
        '`model` definition is deprecated. You may use the Vue 3-compatible `modelValue`/`update:modelValue` though.',
      changeToModelValue: 'Change to `modelValue`/`update:modelValue`.',
      changeToKebabModelValue: 'Change to `model-value`/`update:model-value`.'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    const allowVue3Compat = Boolean(context.options[0]?.allowVue3Compat)

    return utils.executeOnVue(context, (obj) => {
      const modelProperty = utils.findProperty(obj, 'model')
      if (!modelProperty || modelProperty.value.type !== 'ObjectExpression') {
        return
      }

      if (!allowVue3Compat) {
        context.report({
          node: modelProperty,
          messageId: 'deprecatedModel'
        })
        return
      }

      const propName = findPropertyValue(modelProperty.value, 'prop')
      const eventName = findPropertyValue(modelProperty.value, 'event')

      if (
        !propName ||
        !eventName ||
        !allowedPropNames.has(
          utils.getStringLiteralValue(propName, true) ?? ''
        ) ||
        !allowedEventNames.has(
          utils.getStringLiteralValue(eventName, true) ?? ''
        )
      ) {
        context.report({
          node: modelProperty,
          messageId: 'vue3Compat',
          suggest:
            propName && eventName
              ? [
                  {
                    messageId: 'changeToModelValue',
                    *fix(fixer) {
                      const newPropName = 'modelValue'
                      const newEventName = 'update:modelValue'
                      yield replaceLiteral(fixer, propName, newPropName)
                      yield replaceLiteral(fixer, eventName, newEventName)
                    }
                  },
                  {
                    messageId: 'changeToKebabModelValue',
                    *fix(fixer) {
                      const newPropName = 'model-value'
                      const newEventName = 'update:model-value'
                      yield replaceLiteral(fixer, propName, newPropName)
                      yield replaceLiteral(fixer, eventName, newEventName)
                    }
                  }
                ]
              : []
        })
      }
    })
  }
}
