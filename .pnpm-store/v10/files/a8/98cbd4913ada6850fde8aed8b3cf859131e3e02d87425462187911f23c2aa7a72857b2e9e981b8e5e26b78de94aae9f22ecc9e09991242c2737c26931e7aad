/**
 * @author Yosuke Ota
 * See LICENSE file in root directory for full license.
 */
'use strict'

const utils = require('../utils')
const { findVariable } = require('@eslint-community/eslint-utils')

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'disallow passing multiple arguments to scoped slots',
      categories: ['vue3-recommended', 'vue2-recommended'],
      url: 'https://eslint.vuejs.org/rules/no-multiple-slot-args.html'
    },
    fixable: null,
    schema: [],
    messages: {
      unexpected: 'Unexpected multiple arguments.',
      unexpectedSpread: 'Unexpected spread argument.'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    /**
     * Verify the given node
     * @param {MemberExpression | Identifier} node The node to verify
     */
    function verify(node) {
      const parent = node.parent

      if (
        parent.type === 'VariableDeclarator' &&
        parent.id.type === 'Identifier'
      ) {
        // const foo = this.$scopedSlots.foo
        verifyReferences(parent.id)
        return
      }

      if (
        parent.type === 'AssignmentExpression' &&
        parent.right === node &&
        parent.left.type === 'Identifier'
      ) {
        // foo = this.$scopedSlots.foo
        verifyReferences(parent.left)
        return
      }

      if (parent.type !== 'CallExpression' || parent.arguments.includes(node)) {
        return
      }

      if (parent.arguments.length === 0) {
        return
      }
      if (parent.arguments.length > 1) {
        context.report({
          node: parent.arguments[1],
          messageId: 'unexpected'
        })
      }
      if (parent.arguments[0].type === 'SpreadElement') {
        context.report({
          node: parent.arguments[0],
          messageId: 'unexpectedSpread'
        })
      }
    }
    /**
     * Verify the references of the given node.
     * @param {Identifier} node The node to verify
     */
    function verifyReferences(node) {
      const variable = findVariable(utils.getScope(context, node), node)
      if (!variable) {
        return
      }
      for (const reference of variable.references) {
        if (!reference.isRead()) {
          continue
        }
        /** @type {Identifier} */
        const id = reference.identifier
        verify(id)
      }
    }

    return utils.defineVueVisitor(context, {
      /** @param {MemberExpression} node */
      MemberExpression(node) {
        const object = utils.skipChainExpression(node.object)
        if (object.type !== 'MemberExpression') {
          return
        }
        const name = utils.getStaticPropertyName(object)
        if (!name || (name !== '$slots' && name !== '$scopedSlots')) {
          return
        }
        if (!utils.isThis(object.object, context)) {
          return
        }
        verify(node)
      }
    })
  }
}
