/**
 * @fileoverview require the component to be directly exported
 * @author Hiroki Osame <hiroki.osame@gmail.com>
 */
'use strict'

const utils = require('../utils')

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'require the component to be directly exported',
      categories: undefined,
      url: 'https://eslint.vuejs.org/rules/require-direct-export.html'
    },
    fixable: null,
    schema: [
      {
        type: 'object',
        properties: {
          disallowFunctionalComponentFunction: { type: 'boolean' }
        },
        additionalProperties: false
      }
    ],
    messages: {
      expectedDirectExport:
        'Expected the component literal to be directly exported.'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    const filePath = context.getFilename()
    if (!utils.isVueFile(filePath)) return {}

    const disallowFunctional = (context.options[0] || {})
      .disallowFunctionalComponentFunction

    /**
     * @typedef {object} ScopeStack
     * @property {ScopeStack | null} upper
     * @property {boolean} withinVue3FunctionalBody
     */

    /** @type { { body: BlockStatement, hasReturnArgument: boolean } } */
    let maybeVue3Functional
    /** @type {ScopeStack | null} */
    let scopeStack = null

    return {
      /** @param {Declaration | Expression} node */
      'ExportDefaultDeclaration > *'(node) {
        if (node.type === 'ObjectExpression') {
          // OK
          return
        }
        if (node.type === 'CallExpression') {
          const {
            callee,
            arguments: [firstArg]
          } = node
          if (
            firstArg &&
            firstArg.type === 'ObjectExpression' &&
            ((callee.type === 'Identifier' &&
              callee.name === 'defineComponent') ||
              (callee.type === 'MemberExpression' &&
                callee.object.type === 'Identifier' &&
                callee.object.name === 'Vue' &&
                callee.property.type === 'Identifier' &&
                callee.property.name === 'extend'))
          ) {
            return
          }
        }
        if (!disallowFunctional) {
          if (node.type === 'ArrowFunctionExpression') {
            if (node.body.type !== 'BlockStatement') {
              // OK
              return
            }
            maybeVue3Functional = {
              body: node.body,
              hasReturnArgument: false
            }
            return
          }
          if (
            node.type === 'FunctionExpression' ||
            node.type === 'FunctionDeclaration'
          ) {
            maybeVue3Functional = {
              body: node.body,
              hasReturnArgument: false
            }
            return
          }
        }

        context.report({
          node: node.parent,
          messageId: 'expectedDirectExport'
        })
      },
      ...(disallowFunctional
        ? {}
        : {
            /** @param {BlockStatement} node */
            ':function > BlockStatement'(node) {
              if (!maybeVue3Functional) {
                return
              }
              scopeStack = {
                upper: scopeStack,
                withinVue3FunctionalBody: maybeVue3Functional.body === node
              }
            },
            /** @param {ReturnStatement} node */
            ReturnStatement(node) {
              if (
                scopeStack &&
                scopeStack.withinVue3FunctionalBody &&
                node.argument
              ) {
                maybeVue3Functional.hasReturnArgument = true
              }
            },
            ':function > BlockStatement:exit'() {
              scopeStack = scopeStack && scopeStack.upper
            },
            /** @param {ExportDefaultDeclaration} node */
            'ExportDefaultDeclaration:exit'(node) {
              if (!maybeVue3Functional) {
                return
              }
              if (!maybeVue3Functional.hasReturnArgument) {
                context.report({
                  node,
                  messageId: 'expectedDirectExport'
                })
              }
            }
          })
    }
  }
}
