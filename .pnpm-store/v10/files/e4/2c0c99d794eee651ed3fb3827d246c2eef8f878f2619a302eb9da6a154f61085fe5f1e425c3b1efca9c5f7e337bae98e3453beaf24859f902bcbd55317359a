/**
 * @fileoverview disallow using deprecated number (keycode) modifiers
 * @author yoyo930021
 */
'use strict'

const utils = require('../utils')
const keyCodeToKey = require('../utils/keycode-to-key')

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'disallow using deprecated number (keycode) modifiers (in Vue.js 3.0.0+)',
      categories: ['vue3-essential'],
      url: 'https://eslint.vuejs.org/rules/no-deprecated-v-on-number-modifiers.html'
    },
    fixable: 'code',
    schema: [],
    messages: {
      numberModifierIsDeprecated:
        "'KeyboardEvent.keyCode' modifier on 'v-on' directive is deprecated. Using 'KeyboardEvent.key' instead."
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    return utils.defineTemplateBodyVisitor(context, {
      /** @param {VDirectiveKey} node */
      "VAttribute[directive=true][key.name.name='on'] > VDirectiveKey"(node) {
        const modifier = node.modifiers.find((mod) =>
          Number.isInteger(Number.parseInt(mod.name, 10))
        )
        if (!modifier) return

        const keyCodes = Number.parseInt(modifier.name, 10)
        if (keyCodes > 9 || keyCodes < 0) {
          context.report({
            node: modifier,
            messageId: 'numberModifierIsDeprecated',
            fix(fixer) {
              const key = keyCodeToKey[keyCodes]
              if (!key) return null

              return fixer.replaceText(modifier, `${key}`)
            }
          })
        }
      }
    })
  }
}
