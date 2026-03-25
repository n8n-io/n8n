/**
 * @author Toru Nagashima
 * @copyright 2017 Toru Nagashima. All rights reserved.
 * See LICENSE file in root directory for full license.
 */
'use strict'

const utils = require('../utils')

const VALID_MODIFIERS = new Set(['lazy', 'number', 'trim'])

/**
 * Check whether the given node is valid or not.
 * @param {VElement} node The element node to check.
 * @returns {boolean} `true` if the node is valid.
 */
function isValidElement(node) {
  const name = node.name
  return (
    name === 'input' ||
    name === 'select' ||
    name === 'textarea' ||
    (name !== 'keep-alive' &&
      name !== 'slot' &&
      name !== 'transition' &&
      name !== 'transition-group' &&
      utils.isCustomComponent(node))
  )
}

/**
 * Check whether the given node is a MemberExpression containing an optional chaining.
 * e.g.
 * - `a?.b`
 * - `a?.b.c`
 * @param {ASTNode} node The node to check.
 * @returns {boolean} `true` if the node is a MemberExpression containing an optional chaining.
 */
function isOptionalChainingMemberExpression(node) {
  return (
    node.type === 'ChainExpression' &&
    node.expression.type === 'MemberExpression'
  )
}

/**
 * Check whether the given node can be LHS (left-hand side).
 * @param {ASTNode} node The node to check.
 * @returns {boolean} `true` if the node can be LHS.
 */
function isLhs(node) {
  if (node.type === 'TSAsExpression' || node.type === 'TSNonNullExpression') {
    return isLhs(node.expression)
  }

  return node.type === 'Identifier' || node.type === 'MemberExpression'
}

/**
 * Check whether the given node is a MemberExpression of a possibly null object.
 * e.g.
 * - `(a?.b).c`
 * - `(null).foo`
 * @param {ASTNode} node The node to check.
 * @returns {boolean} `true` if the node is a MemberExpression of a possibly null object.
 */
function maybeNullObjectMemberExpression(node) {
  if (node.type !== 'MemberExpression') {
    return false
  }
  const { object } = node
  if (object.type === 'ChainExpression') {
    // `(a?.b).c`
    return true
  }
  if (object.type === 'Literal' && object.value === null && !object.bigint) {
    // `(null).foo`
    return true
  }
  if (object.type === 'MemberExpression') {
    return maybeNullObjectMemberExpression(object)
  }
  return false
}

/**
 * Get the variable by names.
 * @param {string} name The variable name to find.
 * @param {VElement} leafNode The node to look up.
 * @returns {VVariable|null} The found variable or null.
 */
function getVariable(name, leafNode) {
  let node = leafNode

  while (node != null) {
    const variables = node.variables
    const variable = variables && variables.find((v) => v.id.name === name)

    if (variable != null) {
      return variable
    }

    if (node.parent.type === 'VDocumentFragment') {
      break
    }

    node = node.parent
  }

  return null
}

/** @type {RuleModule}  */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'enforce valid `v-model` directives',
      categories: ['vue3-essential', 'vue2-essential'],
      url: 'https://eslint.vuejs.org/rules/valid-v-model.html'
    },
    fixable: null,
    schema: [],
    messages: {
      unexpectedInvalidElement:
        "'v-model' directives aren't supported on <{{name}}> elements.",
      unexpectedInputFile:
        "'v-model' directives don't support 'file' input type.",
      unexpectedArgument: "'v-model' directives require no argument.",
      unexpectedModifier:
        "'v-model' directives don't support the modifier '{{name}}'.",
      missingValue: "'v-model' directives require that attribute value.",
      unexpectedOptionalChaining:
        "Optional chaining cannot appear in 'v-model' directives.",
      unexpectedNonLhsExpression:
        "'v-model' directives require the attribute value which is valid as LHS.",
      unexpectedNullObject:
        "'v-model' directive has potential null object property access.",
      unexpectedUpdateIterationVariable:
        "'v-model' directives cannot update the iteration variable '{{varName}}' itself."
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    return utils.defineTemplateBodyVisitor(context, {
      /** @param {VDirective} node */
      "VAttribute[directive=true][key.name.name='model']"(node) {
        const element = node.parent.parent
        const name = element.name

        if (!isValidElement(element)) {
          context.report({
            node,
            messageId: 'unexpectedInvalidElement',
            data: { name }
          })
        }

        if (name === 'input' && utils.hasAttribute(element, 'type', 'file')) {
          context.report({
            node,
            messageId: 'unexpectedInputFile'
          })
        }

        if (!utils.isCustomComponent(element)) {
          if (node.key.argument) {
            context.report({
              node: node.key.argument,
              messageId: 'unexpectedArgument'
            })
          }

          for (const modifier of node.key.modifiers) {
            if (!VALID_MODIFIERS.has(modifier.name)) {
              context.report({
                node: modifier,
                messageId: 'unexpectedModifier',
                data: { name: modifier.name }
              })
            }
          }
        }

        if (!node.value || utils.isEmptyValueDirective(node, context)) {
          context.report({
            node,
            messageId: 'missingValue'
          })
          return
        }
        const expression = node.value.expression
        if (!expression) {
          // Parsing error
          return
        }
        if (isOptionalChainingMemberExpression(expression)) {
          context.report({
            node: expression,
            messageId: 'unexpectedOptionalChaining'
          })
        } else if (!isLhs(expression)) {
          context.report({
            node: expression,
            messageId: 'unexpectedNonLhsExpression'
          })
        } else if (maybeNullObjectMemberExpression(expression)) {
          context.report({
            node: expression,
            messageId: 'unexpectedNullObject'
          })
        }

        for (const reference of node.value.references) {
          const id = reference.id
          if (id.parent.type !== 'VExpressionContainer') {
            continue
          }

          const variable = getVariable(id.name, element)
          if (variable != null) {
            context.report({
              node: expression,
              messageId: 'unexpectedUpdateIterationVariable',

              data: { varName: id.name }
            })
          }
        }
      }
    })
  }
}
