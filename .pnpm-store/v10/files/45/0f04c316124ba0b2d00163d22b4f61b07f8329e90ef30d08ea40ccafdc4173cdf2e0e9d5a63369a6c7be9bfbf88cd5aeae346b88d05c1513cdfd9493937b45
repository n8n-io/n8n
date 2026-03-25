/**
 * @author Yosuke Ota
 * See LICENSE file in root directory for full license.
 */
'use strict'

const utils = require('../utils')

/**
 * @typedef {import('@typescript-eslint/types').TSESTree.ExportAllDeclaration} TSESTreeExportAllDeclaration
 * @typedef {import('@typescript-eslint/types').TSESTree.ExportDefaultDeclaration} TSESTreeExportDefaultDeclaration
 * @typedef {import('@typescript-eslint/types').TSESTree.ExportNamedDeclaration} TSESTreeExportNamedDeclaration
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'disallow `export` in `<script setup>`',
      categories: ['vue3-essential', 'vue2-essential'],
      url: 'https://eslint.vuejs.org/rules/no-export-in-script-setup.html'
    },
    fixable: null,
    schema: [],
    messages: {
      forbidden: '`<script setup>` cannot contain ES module exports.'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    /**
     * @param {ExportAllDeclaration | ExportDefaultDeclaration | ExportNamedDeclaration} node
     * @param {SourceLocation} loc
     */
    function verify(node, loc) {
      const tsNode =
        /** @type {TSESTreeExportAllDeclaration | TSESTreeExportDefaultDeclaration | TSESTreeExportNamedDeclaration} */ (
          node
        )
      if (tsNode.exportKind === 'type') {
        return
      }
      if (
        tsNode.type === 'ExportNamedDeclaration' &&
        tsNode.specifiers.length > 0 &&
        tsNode.specifiers.every((spec) => spec.exportKind === 'type')
      ) {
        return
      }
      context.report({
        node,
        loc,
        messageId: 'forbidden'
      })
    }

    return utils.defineScriptSetupVisitor(context, {
      ExportAllDeclaration: (node) => verify(node, node.loc),
      ExportDefaultDeclaration: (node) => verify(node, node.loc),
      ExportNamedDeclaration: (node) => {
        // export let foo = 'foo', export class Foo {}, export function foo() {}
        if (node.declaration) {
          verify(node, context.getSourceCode().getFirstToken(node).loc)
        }
        // export { foo }, export { foo } from 'bar'
        else {
          verify(node, node.loc)
        }
      }
    })
  }
}
