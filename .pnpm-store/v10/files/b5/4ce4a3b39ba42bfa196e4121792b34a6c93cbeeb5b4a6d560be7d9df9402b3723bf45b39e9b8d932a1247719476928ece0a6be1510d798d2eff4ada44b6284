/**
 * @author Yosuke Ota
 * See LICENSE file in root directory for full license.
 */
'use strict'

const utils = require('../utils')
const regexp = require('../utils/regexp')

/**
 * @typedef {object} ParsedOption
 * @property { (key: VAttribute) => boolean } test
 * @property {boolean} [useValue]
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
      test({ key }) {
        return matcher(key.rawName)
      }
    }
  }
  const parsed = parseOption(option.key)
  if (option.value) {
    const keyTest = parsed.test
    if (option.value === true) {
      parsed.test = (node) => {
        if (!keyTest(node)) {
          return false
        }
        return node.value == null || node.value.value === node.key.rawName
      }
    } else {
      const valueMatcher = buildMatcher(option.value)
      parsed.test = (node) => {
        if (!keyTest(node)) {
          return false
        }
        return node.value != null && valueMatcher(node.value.value)
      }
    }
    parsed.useValue = true
  }
  if (option.element) {
    const argTest = parsed.test
    const tagMatcher = buildMatcher(option.element)
    parsed.test = (node) => {
      if (!argTest(node)) {
        return false
      }
      const element = node.parent.parent
      return tagMatcher(element.rawName)
    }
    parsed.useElement = true
  }
  parsed.message = option.message
  return parsed
}

/**
 * @param {VAttribute} node
 * @param {ParsedOption} option
 */
function defaultMessage(node, option) {
  const key = node.key.rawName
  let value = ''
  if (option.useValue) {
    value = node.value == null ? '` set to `true' : `="${node.value.value}"`
  }

  let on = ''
  if (option.useElement) {
    on = ` on \`<${node.parent.parent.rawName}>\``
  }
  return `Using \`${key + value}\`${on} is not allowed.`
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'disallow specific attribute',
      categories: undefined,
      url: 'https://eslint.vuejs.org/rules/no-restricted-static-attribute.html'
    },
    fixable: null,
    schema: {
      type: 'array',
      items: {
        oneOf: [
          { type: 'string' },
          {
            type: 'object',
            properties: {
              key: { type: 'string' },
              value: { oneOf: [{ type: 'string' }, { enum: [true] }] },
              element: { type: 'string' },
              message: { type: 'string', minLength: 1 }
            },
            required: ['key'],
            additionalProperties: false
          }
        ]
      },
      uniqueItems: true,
      minItems: 0
    },

    messages: {
      // eslint-disable-next-line eslint-plugin/report-message-format
      restrictedAttr: '{{message}}'
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
       * @param {VAttribute} node
       */
      'VAttribute[directive=false]'(node) {
        for (const option of options) {
          if (option.test(node)) {
            const message = option.message || defaultMessage(node, option)
            context.report({
              node,
              messageId: 'restrictedAttr',
              data: { message }
            })
            return
          }
        }
      }
    })
  }
}
