/**
 * @author Toru Nagashima
 * See LICENSE file in root directory for full license.
 */
'use strict'

const { pascalCase } = require('../utils/casing')
const utils = require('../utils')

/**
 * @typedef {Object} Options
 * @property {"shorthand" | "longform" | "v-slot"} atComponent The style for the default slot at a custom component directly.
 * @property {"shorthand" | "longform" | "v-slot"} default The style for the default slot at a template wrapper.
 * @property {"shorthand" | "longform"} named The style for named slots at a template wrapper.
 */

/**
 * Normalize options.
 * @param {any} options The raw options to normalize.
 * @returns {Options} The normalized options.
 */
function normalizeOptions(options) {
  /** @type {Options} */
  const normalized = {
    atComponent: 'v-slot',
    default: 'shorthand',
    named: 'shorthand'
  }

  if (typeof options === 'string') {
    normalized.atComponent =
      normalized.default =
      normalized.named =
        /** @type {"shorthand" | "longform"} */ (options)
  } else if (options != null) {
    /** @type {(keyof Options)[]} */
    const keys = ['atComponent', 'default', 'named']
    for (const key of keys) {
      if (options[key] != null) {
        normalized[key] = options[key]
      }
    }
  }

  return normalized
}

/**
 * Get the expected style.
 * @param {Options} options The options that defined expected types.
 * @param {VDirective} node The `v-slot` node to check.
 * @returns {"shorthand" | "longform" | "v-slot"} The expected style.
 */
function getExpectedStyle(options, node) {
  const { argument } = node.key

  if (
    argument == null ||
    (argument.type === 'VIdentifier' && argument.name === 'default')
  ) {
    const element = node.parent.parent
    return element.name === 'template' ? options.default : options.atComponent
  }
  return options.named
}

/**
 * Get the expected style.
 * @param {VDirective} node The `v-slot` node to check.
 * @returns {"shorthand" | "longform" | "v-slot"} The expected style.
 */
function getActualStyle(node) {
  const { name, argument } = node.key

  if (name.rawName === '#') {
    return 'shorthand'
  }
  if (argument != null) {
    return 'longform'
  }
  return 'v-slot'
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'enforce `v-slot` directive style',
      categories: ['vue3-strongly-recommended', 'vue2-strongly-recommended'],
      url: 'https://eslint.vuejs.org/rules/v-slot-style.html'
    },
    fixable: 'code',
    schema: [
      {
        oneOf: [
          { enum: ['shorthand', 'longform'] },
          {
            type: 'object',
            properties: {
              atComponent: { enum: ['shorthand', 'longform', 'v-slot'] },
              default: { enum: ['shorthand', 'longform', 'v-slot'] },
              named: { enum: ['shorthand', 'longform'] }
            },
            additionalProperties: false
          }
        ]
      }
    ],
    messages: {
      expectedShorthand: "Expected '#{{argument}}' instead of '{{actual}}'.",
      expectedLongform:
        "Expected 'v-slot:{{argument}}' instead of '{{actual}}'.",
      expectedVSlot: "Expected 'v-slot' instead of '{{actual}}'."
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    const sourceCode = context.getSourceCode()
    const options = normalizeOptions(context.options[0])

    return utils.defineTemplateBodyVisitor(context, {
      /** @param {VDirective} node */
      "VAttribute[directive=true][key.name.name='slot']"(node) {
        const expected = getExpectedStyle(options, node)
        const actual = getActualStyle(node)
        if (actual === expected) {
          return
        }

        const { name, argument } = node.key
        /** @type {Range} */
        const range = [name.range[0], (argument || name).range[1]]
        const argumentText = argument ? sourceCode.getText(argument) : 'default'
        context.report({
          node,
          messageId: `expected${pascalCase(expected)}`,
          data: {
            actual: sourceCode.text.slice(range[0], range[1]),
            argument: argumentText
          },

          fix(fixer) {
            switch (expected) {
              case 'shorthand': {
                return fixer.replaceTextRange(range, `#${argumentText}`)
              }
              case 'longform': {
                return fixer.replaceTextRange(range, `v-slot:${argumentText}`)
              }
              case 'v-slot': {
                return fixer.replaceTextRange(range, 'v-slot')
              }
              default: {
                return null
              }
            }
          }
        })
      }
    })
  }
}
