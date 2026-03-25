/**
 * @author Yosuke Ota
 * See LICENSE file in root directory for full license.
 */
'use strict'

const utils = require('../utils')
const regexp = require('../utils/regexp')

/**
 * @typedef {object} ParsedOption
 * @property {Tester} test
 * @property {string|undefined} [message]
 */
/**
 * @typedef {object} MatchResult
 * @property {Tester | undefined} [next]
 * @property {boolean} [wildcard]
 * @property {string} keyName
 */
/**
 * @typedef { (name: string) => boolean } Matcher
 * @typedef { (node: Property | SpreadElement) => (MatchResult | null) } Tester
 */

/**
 * @param {string} str
 * @returns {Matcher}
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
 * @param {string | string[] | { name: string | string[], message?: string } } option
 * @returns {ParsedOption}
 */
function parseOption(option) {
  if (typeof option === 'string' || Array.isArray(option)) {
    return parseOption({
      name: option
    })
  }

  /**
   * @typedef {object} StepForTest
   * @property {Matcher} test
   * @property {undefined} [wildcard]
   * @typedef {object} StepForWildcard
   * @property {undefined} [test]
   * @property {true} wildcard
   * @typedef {StepForTest | StepForWildcard} Step
   */

  /** @type {Step[]} */
  const steps = []
  for (const name of Array.isArray(option.name) ? option.name : [option.name]) {
    if (name === '*') {
      steps.push({ wildcard: true })
    } else {
      steps.push({ test: buildMatcher(name) })
    }
  }
  const message = option.message

  return {
    test: buildTester(0),
    message
  }

  /**
   * @param {number} index
   * @returns {Tester}
   */
  function buildTester(index) {
    const step = steps[index]
    const next = index + 1
    const needNext = steps.length > next
    return (node) => {
      /** @type {string} */
      let keyName
      if (step.wildcard) {
        keyName = '*'
      } else {
        if (node.type !== 'Property') {
          return null
        }
        const name = utils.getStaticPropertyName(node)
        if (!name || !step.test(name)) {
          return null
        }
        keyName = name
      }

      return {
        next: needNext ? buildTester(next) : undefined,
        wildcard: step.wildcard,
        keyName
      }
    }
  }
}

/**
 * @param {string[]} path
 */
function defaultMessage(path) {
  return `Using \`${path.join('.')}\` is not allowed.`
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'disallow specific component option',
      categories: undefined,
      url: 'https://eslint.vuejs.org/rules/no-restricted-component-options.html'
    },
    fixable: null,
    schema: {
      type: 'array',
      items: {
        oneOf: [
          { type: 'string' },
          {
            type: 'array',
            items: {
              type: 'string'
            }
          },
          {
            type: 'object',
            properties: {
              name: {
                oneOf: [
                  { type: 'string' },
                  {
                    type: 'array',
                    items: {
                      type: 'string'
                    }
                  }
                ]
              },
              message: { type: 'string', minLength: 1 }
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
      restrictedOption: '{{message}}'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    if (!context.options || context.options.length === 0) {
      return {}
    }
    /** @type {ParsedOption[]} */
    const options = context.options.map(parseOption)

    return utils.compositingVisitors(
      utils.defineVueVisitor(context, {
        onVueObjectEnter(node) {
          for (const option of options) {
            verify(node, option.test, option.message)
          }
        }
      }),
      utils.defineScriptSetupVisitor(context, {
        onDefineOptionsEnter(node) {
          if (node.arguments.length === 0) return
          const define = node.arguments[0]
          if (define.type !== 'ObjectExpression') return
          for (const option of options) {
            verify(define, option.test, option.message)
          }
        }
      })
    )

    /**
     * @param {ObjectExpression} node
     * @param {Tester} test
     * @param {string | undefined} customMessage
     * @param {string[]} path
     */
    function verify(node, test, customMessage, path = []) {
      for (const prop of node.properties) {
        const result = test(prop)
        if (!result) {
          continue
        }
        if (result.next) {
          if (
            prop.type !== 'Property' ||
            prop.value.type !== 'ObjectExpression'
          ) {
            continue
          }
          verify(prop.value, result.next, customMessage, [
            ...path,
            result.keyName
          ])
        } else {
          const message =
            customMessage || defaultMessage([...path, result.keyName])
          context.report({
            node: prop.type === 'Property' ? prop.key : prop,
            messageId: 'restrictedOption',
            data: { message }
          })
        }
      }
    }
  }
}
