/**
 * @author Wayne Zhang
 * See LICENSE file in root directory for full license.
 */
'use strict'

const utils = require('../utils')
const { toRegExp } = require('../utils/regexp')

const htmlElements = require('../utils/html-elements.json')
const deprecatedHtmlElements = require('../utils/deprecated-html-elements.json')
const svgElements = require('../utils/svg-elements.json')
const vue2builtinComponents = require('../utils/vue2-builtin-components')
const vue3builtinComponents = require('../utils/vue3-builtin-components')

const reservedNames = new Set([
  ...htmlElements,
  ...deprecatedHtmlElements,
  ...svgElements,
  ...vue2builtinComponents,
  ...vue3builtinComponents
])

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'enforce using only specific component names',
      categories: undefined,
      url: 'https://eslint.vuejs.org/rules/restricted-component-names.html'
    },
    fixable: null,
    schema: [
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          allow: {
            type: 'array',
            items: { type: 'string' },
            uniqueItems: true,
            additionalItems: false
          }
        }
      }
    ],
    messages: {
      invalidName: 'Component name "{{name}}" is not allowed.'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    const options = context.options[0] || {}
    /** @type {RegExp[]} */
    const allow = (options.allow || []).map(toRegExp)

    /** @param {string} name  */
    function isAllowedTarget(name) {
      return reservedNames.has(name) || allow.some((re) => re.test(name))
    }

    return utils.defineTemplateBodyVisitor(context, {
      VElement(node) {
        const name = node.rawName
        if (isAllowedTarget(name)) {
          return
        }

        context.report({
          node,
          loc: node.loc,
          messageId: 'invalidName',
          data: {
            name
          }
        })
      }
    })
  }
}
