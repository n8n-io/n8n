/**
 * @author Kamogelo Moalusi <github.com/thesheppard>
 * See LICENSE file in root directory for full license.
 */
'use strict'

const utils = require('../utils')
const regexp = require('../utils/regexp')

/**
 * @typedef {object} ParsedOption
 * @property { (key: VDirectiveKey) => boolean } test
 * @property {string[]} [modifiers]
 * @property {boolean} [useElement]
 * @property {string} [message]
 */

/**
 * @param {string} str
 * @returns {(str: string) => boolean}
 */
function buildMatcher(str) {
  if (regexp.isRegExp(str)) {
    const re = regexp.toRegExp(str)
    return (s) => {
      re.lastIndex = 0
      return re.test(s)
    }
  }
  return (s) => s === str
}

/**
 * @param {any} option
 * @returns {ParsedOption}
 */
function parseOption(option) {
  if (typeof option === 'string') {
    const matcher = buildMatcher(option)
    return {
      test(key) {
        return Boolean(
          key.argument &&
            key.argument.type === 'VIdentifier' &&
            matcher(key.argument.rawName)
        )
      }
    }
  }
  if (option === null) {
    return {
      test(key) {
        return key.argument === null
      }
    }
  }
  const parsed = parseOption(option.argument)

  if (option.modifiers) {
    const argTest = parsed.test
    parsed.test = (key) => {
      if (!argTest(key)) {
        return false
      }
      return /** @type {string[]} */ (option.modifiers).every((modName) =>
        key.modifiers.some((mid) => mid.name === modName)
      )
    }
    parsed.modifiers = option.modifiers
  }
  if (option.element) {
    const argTest = parsed.test
    const tagMatcher = buildMatcher(option.element)
    parsed.test = (key) => {
      if (!argTest(key)) {
        return false
      }
      return tagMatcher(key.parent.parent.parent.rawName)
    }
    parsed.useElement = true
  }
  parsed.message = option.message
  return parsed
}

/**
 * @param {VDirectiveKey} key
 * @param {ParsedOption} option
 */
function defaultMessage(key, option) {
  const von = key.name.rawName === '@' ? '' : 'v-on'
  const arg =
    key.argument != null && key.argument.type === 'VIdentifier'
      ? `${key.name.rawName === '@' ? '@' : ':'}${key.argument.rawName}`
      : ''
  const mod =
    option.modifiers != null && option.modifiers.length > 0
      ? `.${option.modifiers.join('.')}`
      : ''
  let element = 'element'
  if (option.useElement) {
    element = `<${key.parent.parent.parent.rawName}>`
  }
  return `Using \`${von + arg + mod}\` is not allowed on this ${element}.`
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'disallow specific argument in `v-on`',
      categories: undefined,
      url: 'https://eslint.vuejs.org/rules/no-restricted-v-on.html'
    },
    fixable: null,
    schema: {
      type: 'array',
      items: {
        oneOf: [
          { type: ['string', 'null'] },
          {
            type: 'object',
            properties: {
              argument: { type: ['string', 'null'] },
              element: { type: 'string' },
              message: { type: 'string', minLength: 1 },
              modifiers: {
                type: 'array',
                items: {
                  type: 'string',
                  enum: [
                    'prevent',
                    'stop',
                    'capture',
                    'self',
                    'once',
                    'passive'
                  ]
                },
                uniqueItems: true,
                minItems: 1
              }
            },
            required: ['argument'],
            additionalProperties: false
          }
        ]
      },
      uniqueItems: true
    },
    messages: {
      // eslint-disable-next-line eslint-plugin/report-message-format
      restrictedVOn: '{{message}}'
    }
  },

  /** @param {RuleContext} context */
  create(context) {
    if (context.options.length === 0) {
      return {}
    }
    /** @type {ParsedOption[]} */
    const options = context.options.map(parseOption)

    return utils.defineTemplateBodyVisitor(context, {
      /**
       * @param {VDirectiveKey} node
       */
      "VAttribute[directive=true][key.name.name='on'] > VDirectiveKey"(node) {
        for (const option of options) {
          if (option.test(node)) {
            const message = option.message || defaultMessage(node, option)
            context.report({
              node,
              messageId: 'restrictedVOn',
              data: { message }
            })
            return
          }
        }
      }
    })
  }
}
