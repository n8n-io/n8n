/**
 * @author Yosuke Ota
 * See LICENSE file in root directory for full license.
 */
'use strict'

const utils = require('../utils')

/**
 * @typedef {NonNullable<VExpressionContainer['expression']>} VExpression
 */
/**
 * @typedef {object} OrOperands
 * @property {VExpression} OrOperands.node
 * @property {AndOperands[]} OrOperands.operands
 *
 * @typedef {object} AndOperands
 * @property {VExpression} AndOperands.node
 * @property {VExpression[]} AndOperands.operands
 */
/**
 * Splits the given node by the given logical operator.
 * @param {string} operator Logical operator `||` or `&&`.
 * @param {VExpression} node The node to split.
 * @returns {VExpression[]} Array of conditions that makes the node when joined by the operator.
 */
function splitByLogicalOperator(operator, node) {
  if (node.type === 'LogicalExpression' && node.operator === operator) {
    return [
      ...splitByLogicalOperator(operator, node.left),
      ...splitByLogicalOperator(operator, node.right)
    ]
  }
  return [node]
}

/**
 * @param {VExpression} node
 */
function splitByOr(node) {
  return splitByLogicalOperator('||', node)
}
/**
 * @param {VExpression} node
 */
function splitByAnd(node) {
  return splitByLogicalOperator('&&', node)
}

/**
 * @param {VExpression} node
 * @returns {OrOperands}
 */
function buildOrOperands(node) {
  const orOperands = splitByOr(node)
  return {
    node,
    operands: orOperands.map((orOperand) => {
      const andOperands = splitByAnd(orOperand)
      return {
        node: orOperand,
        operands: andOperands
      }
    })
  }
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'disallow duplicate conditions in `v-if` / `v-else-if` chains',
      categories: ['vue3-essential', 'vue2-essential'],
      url: 'https://eslint.vuejs.org/rules/no-dupe-v-else-if.html'
    },
    fixable: null,
    schema: [],
    messages: {
      unexpected:
        'This branch can never execute. Its condition is a duplicate or covered by previous conditions in the `v-if` / `v-else-if` chain.'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    const sourceCode = context.getSourceCode()
    const tokenStore =
      sourceCode.parserServices.getTemplateBodyTokenStore &&
      sourceCode.parserServices.getTemplateBodyTokenStore()
    /**
     * Determines whether the two given nodes are considered to be equal. In particular, given that the nodes
     * represent expressions in a boolean context, `||` and `&&` can be considered as commutative operators.
     * @param {VExpression} a First node.
     * @param {VExpression} b Second node.
     * @returns {boolean} `true` if the nodes are considered to be equal.
     */
    function equal(a, b) {
      if (a.type !== b.type) {
        return false
      }

      if (
        a.type === 'LogicalExpression' &&
        b.type === 'LogicalExpression' &&
        (a.operator === '||' || a.operator === '&&') &&
        a.operator === b.operator
      ) {
        return (
          (equal(a.left, b.left) && equal(a.right, b.right)) ||
          (equal(a.left, b.right) && equal(a.right, b.left))
        )
      }

      return utils.equalTokens(a, b, tokenStore)
    }

    /**
     * Determines whether the first given AndOperands is a subset of the second given AndOperands.
     *
     * e.g. A: (a && b), B: (a && b && c): B is a subset of A.
     *
     * @param {AndOperands} operandsA The AndOperands to compare from.
     * @param {AndOperands} operandsB The AndOperands to compare against.
     * @returns {boolean} `true` if the `andOperandsA` is a subset of the `andOperandsB`.
     */
    function isSubset(operandsA, operandsB) {
      return operandsA.operands.every((operandA) =>
        operandsB.operands.some((operandB) => equal(operandA, operandB))
      )
    }

    return utils.defineTemplateBodyVisitor(context, {
      "VAttribute[directive=true][key.name.name='else-if']"(node) {
        if (!node.value || !node.value.expression) {
          return
        }
        const test = node.value.expression
        const conditionsToCheck =
          test.type === 'LogicalExpression' && test.operator === '&&'
            ? [...splitByAnd(test), test]
            : [test]
        const listToCheck = conditionsToCheck.map(buildOrOperands)

        /** @type {VElement | null} */
        let current = node.parent.parent
        while (current && (current = utils.prevSibling(current))) {
          const vIf = utils.getDirective(current, 'if')
          const currentTestDir = vIf || utils.getDirective(current, 'else-if')
          if (!currentTestDir) {
            return
          }
          if (currentTestDir.value && currentTestDir.value.expression) {
            const currentOrOperands = buildOrOperands(
              currentTestDir.value.expression
            )

            for (const condition of listToCheck) {
              const operands = (condition.operands = condition.operands.filter(
                (orOperand) =>
                  !currentOrOperands.operands.some((currentOrOperand) =>
                    isSubset(currentOrOperand, orOperand)
                  )
              ))
              if (operands.length === 0) {
                context.report({
                  node: condition.node,
                  messageId: 'unexpected'
                })
                return
              }
            }
          }

          if (vIf) {
            return
          }
        }
      }
    })
  }
}
