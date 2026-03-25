/**
 * @fileoverview disallow using deprecated events api
 * @author yoyo930021
 */
'use strict'

const utils = require('../utils')

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'disallow using deprecated events api (in Vue.js 3.0.0+)',
      categories: ['vue3-essential'],
      url: 'https://eslint.vuejs.org/rules/no-deprecated-events-api.html'
    },
    fixable: null,
    schema: [],
    messages: {
      noDeprecatedEventsApi:
        'The Events api `$on`, `$off` `$once` is deprecated. Using external library instead, for example mitt.'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    return utils.defineVueVisitor(context, {
      /** @param {MemberExpression & ({parent: CallExpression} | {parent: ChainExpression & {parent: CallExpression}})} node */
      'CallExpression > MemberExpression, CallExpression > ChainExpression > MemberExpression'(
        node
      ) {
        const call =
          node.parent.type === 'ChainExpression'
            ? node.parent.parent
            : node.parent

        if (call.optional) {
          // It is OK because checking whether it is deprecated.
          // e.g. `this.$on?.()`
          return
        }

        if (
          utils.skipChainExpression(call.callee) !== node ||
          !['$on', '$off', '$once'].includes(
            utils.getStaticPropertyName(node) || ''
          )
        ) {
          return
        }
        if (!utils.isThis(node.object, context)) {
          return
        }

        context.report({
          node: node.property,
          messageId: 'noDeprecatedEventsApi'
        })
      }
    })
  }
}
