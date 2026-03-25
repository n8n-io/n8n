/**
 * @author Toru Nagashima
 * @copyright 2017 Toru Nagashima. All rights reserved.
 * See LICENSE file in root directory for full license.
 */
'use strict'

const utils = require('../utils')
const keyAliases = require('../utils/key-aliases.json')

const VALID_MODIFIERS = new Set([
  'stop',
  'prevent',
  'capture',
  'self',
  'ctrl',
  'shift',
  'alt',
  'meta',
  'native',
  'once',
  'left',
  'right',
  'middle',
  'passive',
  'esc',
  'tab',
  'enter',
  'space',
  'up',
  'left',
  'right',
  'down',
  'delete',
  'exact'
])
const VERB_MODIFIERS = new Set(['stop', 'prevent'])
// https://www.w3.org/TR/uievents-key/
const KEY_ALIASES = new Set(keyAliases)

/**
 * @param {VIdentifier} modifierNode
 * @param {Set<string>} customModifiers
 */
function isValidModifier(modifierNode, customModifiers) {
  const modifier = modifierNode.name
  return (
    // built-in aliases
    VALID_MODIFIERS.has(modifier) ||
    // keyCode
    Number.isInteger(Number.parseInt(modifier, 10)) ||
    // keyAlias (an Unicode character)
    [...modifier].length === 1 ||
    // keyAlias (special keys)
    KEY_ALIASES.has(modifier) ||
    // custom modifiers
    customModifiers.has(modifier)
  )
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'enforce valid `v-on` directives',
      categories: ['vue3-essential', 'vue2-essential'],
      url: 'https://eslint.vuejs.org/rules/valid-v-on.html'
    },
    fixable: null,
    schema: [
      {
        type: 'object',
        properties: {
          modifiers: {
            type: 'array'
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      unsupportedModifier:
        "'v-on' directives don't support the modifier '{{modifier}}'.",
      avoidKeyword:
        'Avoid using JavaScript keyword as "v-on" value: {{value}}.',
      expectedValueOrVerb:
        "'v-on' directives require a value or verb modifier (like 'stop' or 'prevent')."
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    const options = context.options[0] || {}
    /** @type {Set<string>} */
    const customModifiers = new Set(options.modifiers || [])
    const sourceCode = context.getSourceCode()

    return utils.defineTemplateBodyVisitor(context, {
      /** @param {VDirective} node */
      "VAttribute[directive=true][key.name.name='on']"(node) {
        for (const modifier of node.key.modifiers) {
          if (!isValidModifier(modifier, customModifiers)) {
            context.report({
              node: modifier,
              messageId: 'unsupportedModifier',
              data: { modifier: modifier.name }
            })
          }
        }

        if (
          (!node.value || !node.value.expression) &&
          !node.key.modifiers.some((modifier) =>
            VERB_MODIFIERS.has(modifier.name)
          )
        ) {
          if (node.value && !utils.isEmptyValueDirective(node, context)) {
            const valueText = sourceCode.getText(node.value)
            let innerText = valueText
            if (
              (valueText[0] === '"' || valueText[0] === "'") &&
              valueText[0] === valueText[valueText.length - 1]
            ) {
              // quoted
              innerText = valueText.slice(1, -1)
            }
            if (/^\w+$/.test(innerText)) {
              context.report({
                node: node.value,
                messageId: 'avoidKeyword',
                data: { value: valueText }
              })
            }
          } else {
            context.report({
              node,
              messageId: 'expectedValueOrVerb'
            })
          }
        }
      }
    })
  }
}
