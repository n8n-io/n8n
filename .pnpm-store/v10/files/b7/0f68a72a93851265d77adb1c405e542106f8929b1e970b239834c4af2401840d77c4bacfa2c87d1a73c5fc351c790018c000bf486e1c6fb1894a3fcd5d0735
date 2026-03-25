/**
 * @author Yosuke Ota
 * See LICENSE file in root directory for full license.
 */
'use strict'

const utils = require('../utils')
const regexp = require('../utils/regexp')
/**
 * @typedef {object} ParsedOption
 * @property { (block: VElement) => boolean } test
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
      test(block) {
        return matcher(block.rawName)
      }
    }
  }
  const parsed = parseOption(option.element)
  parsed.message = option.message
  return parsed
}

/**
 * @param {VElement} block
 */
function defaultMessage(block) {
  return `Using \`<${block.rawName}>\` is not allowed.`
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'disallow specific block',
      categories: undefined,
      url: 'https://eslint.vuejs.org/rules/no-restricted-block.html'
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
              element: { type: 'string' },
              message: { type: 'string', minLength: 1 }
            },
            required: ['element'],
            additionalProperties: false
          }
        ]
      },
      uniqueItems: true,
      minItems: 0
    },

    messages: {
      // eslint-disable-next-line eslint-plugin/report-message-format
      restrictedBlock: '{{message}}'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    /** @type {ParsedOption[]} */
    const options = context.options.map(parseOption)

    const sourceCode = context.getSourceCode()
    const documentFragment =
      sourceCode.parserServices.getDocumentFragment &&
      sourceCode.parserServices.getDocumentFragment()

    function getTopLevelHTMLElements() {
      if (documentFragment) {
        return documentFragment.children.filter(utils.isVElement)
      }
      return []
    }

    return {
      /** @param {Program} node */
      Program(node) {
        if (utils.hasInvalidEOF(node)) {
          return
        }
        for (const block of getTopLevelHTMLElements()) {
          for (const option of options) {
            if (option.test(block)) {
              const message = option.message || defaultMessage(block)
              context.report({
                node: block.startTag,
                messageId: 'restrictedBlock',
                data: { message }
              })
              break
            }
          }
        }
      }
    }
  }
}
