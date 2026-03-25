/**
 * @fileoverview disallow usage of `this` in template.
 * @author Armano
 */
'use strict'

const utils = require('../utils')
const RESERVED_NAMES = new Set(require('../utils/js-reserved.json'))

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'disallow usage of `this` in template',
      categories: ['vue3-recommended', 'vue2-recommended'],
      url: 'https://eslint.vuejs.org/rules/this-in-template.html'
    },
    fixable: 'code',
    schema: [
      {
        enum: ['always', 'never']
      }
    ],
    messages: {
      unexpected: "Unexpected usage of 'this'.",
      expected: "Expected 'this'."
    }
  },

  /**
   * Creates AST event handlers for this-in-template.
   *
   * @param {RuleContext} context - The rule context.
   * @returns {Object} AST event handlers.
   */
  create(context) {
    const options = context.options[0] === 'always' ? 'always' : 'never'
    /**
     * @typedef {object} ScopeStack
     * @property {ScopeStack | null} parent
     * @property {Identifier[]} nodes
     */

    /** @type {ScopeStack | null} */
    let scopeStack = null

    return utils.defineTemplateBodyVisitor(context, {
      /** @param {VElement} node */
      VElement(node) {
        scopeStack = {
          parent: scopeStack,
          nodes: scopeStack
            ? [...scopeStack.nodes] // make copy
            : []
        }
        if (node.variables) {
          for (const variable of node.variables) {
            const varNode = variable.id
            const name = varNode.name
            if (!scopeStack.nodes.some((node) => node.name === name)) {
              // Prevent adding duplicates
              scopeStack.nodes.push(varNode)
            }
          }
        }
      },
      'VElement:exit'() {
        scopeStack = scopeStack && scopeStack.parent
      },
      ...(options === 'never'
        ? {
            /** @param { ThisExpression & { parent: MemberExpression } } node */
            'VExpressionContainer MemberExpression > ThisExpression'(node) {
              if (!scopeStack) {
                return
              }
              const propertyName = utils.getStaticPropertyName(node.parent)
              if (
                !propertyName ||
                scopeStack.nodes.some((el) => el.name === propertyName) ||
                RESERVED_NAMES.has(propertyName) || // this.class | this['class']
                /^\d.*$|[^\w$]/.test(propertyName) // this['0aaaa'] | this['foo-bar bas']
              ) {
                return
              }

              context.report({
                node,
                loc: node.loc,
                fix(fixer) {
                  // node.parent should be some code like `this.test`, `this?.['result']`
                  return fixer.replaceText(node.parent, propertyName)
                },
                messageId: 'unexpected'
              })
            }
          }
        : {
            /** @param {VExpressionContainer} node */
            VExpressionContainer(node) {
              if (!scopeStack) {
                return
              }
              if (node.parent.type === 'VDirectiveKey') {
                // We cannot use `.` in dynamic arguments because the right of the `.` becomes a modifier.
                // For example, In `:[this.prop]` case, `:[this` is an argument and `prop]` is a modifier.
                return
              }
              if (node.references) {
                for (const reference of node.references) {
                  if (
                    !scopeStack.nodes.some(
                      (el) => el.name === reference.id.name
                    )
                  ) {
                    context.report({
                      node: reference.id,
                      loc: reference.id.loc,
                      messageId: 'expected',
                      fix(fixer) {
                        return fixer.insertTextBefore(reference.id, 'this.')
                      }
                    })
                  }
                }
              }
            }
          })
    })
  }
}
