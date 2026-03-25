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
      description: 'enforce properties of `$slots` to be used as a function',
      categories: ['vue3-essential'],
      url: 'https://eslint.vuejs.org/rules/require-slots-as-functions.html'
    },
    fixable: null,
    schema: [],
    messages: {
      unexpected: 'Property in `$slots` should be used as function.'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    /**
     * Verify the given node
     * @param {MemberExpression | Identifier | ChainExpression} node The node to verify
     * @param {Expression} reportNode The node to report
     */
    function verify(node, reportNode) {
      const parent = node.parent

      if (
        parent.type === 'VariableDeclarator' &&
        parent.id.type === 'Identifier'
      ) {
        // const children = this.$slots.foo
        verifyReferences(parent.id, reportNode)
        return
      }

      if (
        parent.type === 'AssignmentExpression' &&
        parent.right === node &&
        parent.left.type === 'Identifier'
      ) {
        // children = this.$slots.foo
        verifyReferences(parent.left, reportNode)
        return
      }

      if (parent.type === 'ChainExpression') {
        // (this.$slots?.foo).x
        verify(parent, reportNode)
        return
      }

      if (
        // this.$slots.foo.xxx
        parent.type === 'MemberExpression' ||
        // var [foo] = this.$slots.foo
        parent.type === 'VariableDeclarator' ||
        // [...this.$slots.foo]
        parent.type === 'SpreadElement' ||
        // [this.$slots.foo]
        parent.type === 'ArrayExpression'
      ) {
        context.report({
          node: reportNode,
          messageId: 'unexpected'
        })
      }
    }
    /**
     * Verify the references of the given node.
     * @param {Identifier} node The node to verify
     * @param {Expression} reportNode The node to report
     */
    function verifyReferences(node, reportNode) {
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
        verify(id, reportNode)
      }
    }

    return utils.defineVueVisitor(context, {
      /** @param {MemberExpression} node */
      MemberExpression(node) {
        const object = utils.skipChainExpression(node.object)
        if (object.type !== 'MemberExpression') {
          return
        }
        if (utils.getStaticPropertyName(object) !== '$slots') {
          return
        }
        if (!utils.isThis(object.object, context)) {
          return
        }
        if (node.property.type === 'PrivateIdentifier') {
          // Unreachable
          return
        }
        verify(node, node.property)
      }
    })
  }
}
