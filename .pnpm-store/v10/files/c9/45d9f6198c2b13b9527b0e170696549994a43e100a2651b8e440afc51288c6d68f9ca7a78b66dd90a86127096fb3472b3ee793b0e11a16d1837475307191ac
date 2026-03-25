/**
 * @author ItMaga <https://github.com/ItMaga>
 * See LICENSE file in root directory for full license.
 */
'use strict'

const utils = require('../utils')
const casing = require('../utils/casing')
const { isRegExp, toRegExp } = require('../utils/regexp')

/**
 * @typedef {object} OptionParsed
 * @property { (name: string) => boolean } test
 * @property {string|undefined} [message]
 * @property {string|undefined} [suggest]
 */

/**
 * @param {string} str
 * @returns {(str: string) => boolean}
 * @private
 */
function buildMatcher(str) {
  if (isRegExp(str)) {
    const regex = toRegExp(str)
    return (s) => regex.test(s)
  }
  return (s) => s === casing.pascalCase(str) || s === casing.kebabCase(str)
}

/**
 * @param {string|{name: string, message?: string, suggest?: string}} option
 * @returns {OptionParsed}
 * @private
 * */
function parseOption(option) {
  if (typeof option === 'string') {
    const matcher = buildMatcher(option)
    return { test: matcher }
  }
  const parsed = parseOption(option.name)
  parsed.message = option.message
  parsed.suggest = option.suggest
  return parsed
}

/**
 * @param {Property | AssignmentProperty} property
 * @param {string | undefined} suggest
 * @returns {Rule.SuggestionReportDescriptor[]}
 * @private
 * */
function createSuggest(property, suggest) {
  if (!suggest) {
    return []
  }

  return [
    {
      fix(fixer) {
        return fixer.replaceText(property.value, JSON.stringify(suggest))
      },
      messageId: 'suggest',
      data: { suggest }
    }
  ]
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'disallow specific component names',
      categories: undefined,
      url: 'https://eslint.vuejs.org/rules/no-restricted-component-names.html'
    },
    fixable: null,
    hasSuggestions: true,
    schema: {
      type: 'array',
      items: {
        oneOf: [
          { type: 'string' },
          {
            type: 'object',
            properties: {
              name: { type: 'string' },
              message: { type: 'string', minLength: 1 },
              suggest: { type: 'string' }
            },
            required: ['name'],
            additionalProperties: false
          }
        ]
      },
      uniqueItems: true,
      minItems: 0
    },
    messages: {
      // eslint-disable-next-line eslint-plugin/report-message-format
      disallow: '{{message}}',
      suggest: 'Instead, change to `{{suggest}}`.'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    /** @type {OptionParsed[]} */
    const options = context.options.map(parseOption)

    /**
     * @param {ObjectExpression} node
     */
    function verify(node) {
      const property = utils.findProperty(node, 'name')
      if (!property) return

      const propertyName = utils.getStaticPropertyName(property)
      if (propertyName === 'name' && property.value.type === 'Literal') {
        const componentName = property.value.value?.toString()
        if (!componentName) {
          return
        }

        for (const option of options) {
          if (option.test(componentName)) {
            context.report({
              node: property.value,
              messageId: 'disallow',
              data: {
                message:
                  option.message ||
                  `Using component name \`${componentName}\` is not allowed.`
              },
              suggest: createSuggest(property, option.suggest)
            })
          }
        }
      }
    }

    return utils.compositingVisitors(
      utils.defineVueVisitor(context, {
        onVueObjectEnter(node) {
          verify(node)
        }
      }),
      utils.defineScriptSetupVisitor(context, {
        onDefineOptionsEnter(node) {
          const expression = node.arguments[0]
          if (expression.type === 'ObjectExpression') {
            verify(expression)
          }
        }
      })
    )
  }
}
