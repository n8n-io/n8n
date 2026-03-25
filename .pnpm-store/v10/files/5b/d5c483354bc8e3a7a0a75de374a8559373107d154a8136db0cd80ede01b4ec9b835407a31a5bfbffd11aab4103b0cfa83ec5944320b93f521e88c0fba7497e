/**
 * @author kevsommer Kevin Sommer
 * See LICENSE file in root directory for full license.
 */
'use strict'

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'enforce maximum depth of template',
      categories: undefined,
      url: 'https://eslint.vuejs.org/rules/max-template-depth.html'
    },
    fixable: null,
    schema: [
      {
        type: 'object',
        properties: {
          maxDepth: {
            type: 'integer',
            minimum: 1
          }
        },
        additionalProperties: false,
        minProperties: 1
      }
    ],
    messages: {
      templateTooDeep:
        'Element is nested too deeply (depth of {{depth}}, maximum allowed is {{limit}}).'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    const option = context.options[0] || {}

    /**
     * @param {VElement} element
     * @param {number} curDepth
     */
    function checkMaxDepth(element, curDepth) {
      if (curDepth > option.maxDepth) {
        context.report({
          node: element,
          messageId: 'templateTooDeep',
          data: {
            depth: curDepth,
            limit: option.maxDepth
          }
        })
      }

      if (!element.children) {
        return
      }

      for (const child of element.children) {
        if (child.type === 'VElement') {
          checkMaxDepth(child, curDepth + 1)
        }
      }
    }

    return {
      /** @param {Program} program */
      Program(program) {
        const element = program.templateBody

        if (element == null) {
          return
        }

        if (element.type !== 'VElement') {
          return
        }

        checkMaxDepth(element, 0)
      }
    }
  }
}
