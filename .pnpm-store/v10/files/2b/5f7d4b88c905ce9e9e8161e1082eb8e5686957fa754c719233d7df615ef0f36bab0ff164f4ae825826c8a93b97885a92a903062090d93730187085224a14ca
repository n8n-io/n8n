'use strict'

const { defineTemplateBodyVisitor, hasDirective } = require('../utils')

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'disallow using `v-else-if`/`v-else` on the same element as `v-for`',
      categories: null,
      url: 'https://eslint.vuejs.org/rules/no-use-v-else-with-v-for.html'
    },
    fixable: null,
    schema: [],
    messages: {
      unexpectedDirectiveWithVFor:
        'Unexpected `{{ directiveName }}` and `v-for` on the same element. Move `{{ directiveName }}` to a wrapper element instead.'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    return defineTemplateBodyVisitor(context, {
      /** @param {VDirective} node */
      "VAttribute[directive=true][key.name.name='for']"(node) {
        const element = node.parent.parent

        if (hasDirective(element, 'else-if')) {
          context.report({
            node: element,
            messageId: 'unexpectedDirectiveWithVFor',
            data: { directiveName: 'v-else-if' }
          })
        } else if (hasDirective(element, 'else')) {
          context.report({
            node: element,
            messageId: 'unexpectedDirectiveWithVFor',
            data: { directiveName: 'v-else' }
          })
        }
      }
    })
  }
}
