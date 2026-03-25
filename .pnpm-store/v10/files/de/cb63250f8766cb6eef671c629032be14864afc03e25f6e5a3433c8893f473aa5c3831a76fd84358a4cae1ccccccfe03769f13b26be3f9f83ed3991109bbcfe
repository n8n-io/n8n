/**
 * @author Yosuke Ota
 * See LICENSE file in root directory for full license.
 */
'use strict'

const utils = require('../utils')

/**
 * @param {VDirective} vBindAppear
 */
function isValidBindAppear(vBindAppear) {
  if (
    vBindAppear.value?.expression &&
    vBindAppear.value.expression.type === 'Literal'
  ) {
    return vBindAppear.value.expression?.value !== false
  }

  return true
}

/**
 * @param {string[]} directives
 */
function createDirectiveList(directives) {
  let str = ''

  for (const [index, directive] of directives.entries()) {
    if (index === 0) {
      str += `\`v-${directive}\``
    } else if (index < directives.length - 1) {
      str += `, \`v-${directive}\``
    } else {
      str += ` or \`v-${directive}\``
    }
  }

  return str
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'require control the display of the content inside `<transition>`',
      categories: ['vue3-essential'],
      url: 'https://eslint.vuejs.org/rules/require-toggle-inside-transition.html'
    },
    fixable: null,
    schema: [
      {
        type: 'object',
        properties: {
          additionalDirectives: {
            type: 'array',
            items: {
              type: 'string'
            },
            uniqueItems: true
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      expected:
        'The element inside `<transition>` is expected to have a {{allowedDirectives}} directive.'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    /** @type {Array<string>} */
    const additionalDirectives =
      (context.options[0] && context.options[0].additionalDirectives) || []
    const allowedDirectives = ['if', 'show', ...additionalDirectives]
    const allowedDirectivesString = createDirectiveList(allowedDirectives)

    /**
     * Check if the given element has display control.
     * @param {VElement} element The element node to check.
     */
    function verifyInsideElement(element) {
      if (utils.isCustomComponent(element)) {
        return
      }

      /** @type VElement */ // @ts-expect-error
      const parent = element.parent
      const vBindAppear = utils.getDirective(parent, 'bind', 'appear')
      if (
        utils.hasAttribute(parent, 'appear') ||
        (vBindAppear && isValidBindAppear(vBindAppear))
      ) {
        return
      }

      if (
        element.name !== 'slot' &&
        !allowedDirectives.some((directive) =>
          utils.hasDirective(element, directive)
        ) &&
        !utils.hasDirective(element, 'bind', 'key')
      ) {
        context.report({
          node: element.startTag,
          loc: element.startTag.loc,
          messageId: 'expected',
          data: {
            allowedDirectives: allowedDirectivesString
          }
        })
      }
    }

    return utils.defineTemplateBodyVisitor(context, {
      /** @param {VElement} node */
      "VElement[name='transition'] > VElement"(node) {
        const child = node.parent.children.find(utils.isVElement)
        if (child !== node) {
          return
        }

        verifyInsideElement(node)
      }
    })
  }
}
