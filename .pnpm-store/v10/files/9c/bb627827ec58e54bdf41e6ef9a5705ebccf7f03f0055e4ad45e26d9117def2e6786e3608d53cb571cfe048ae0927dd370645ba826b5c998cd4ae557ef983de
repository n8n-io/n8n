/**
 * @fileoverview Rule to check if an "&&" experssion should be a call to _.get or _.has
 */
'use strict'

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

const getDocsUrl = require('../util/getDocsUrl')

module.exports = {
    meta: {
        type: 'problem',
        docs: {
            url: getDocsUrl('prefer-get')
        },
        schema: [{
            type: 'integer',
            minimum: 2
        }]
    },

    create(context) {
        const DEFAULT_LENGTH = 3
        const {isComputed, isEquivalentMemberExp, isEqEqEq} = require('../util/astUtil')
        const ruleDepth = parseInt(context.options[0], 10) || DEFAULT_LENGTH

        const expStates = []
        function getState() {
            return expStates[expStates.length - 1] || {depth: 0}
        }

        function shouldCheckDeeper(node, nodeRight, toCompare) {
            return node.operator === '&&' && nodeRight && nodeRight.type === 'MemberExpression' && !isComputed(nodeRight) && (!toCompare || isEquivalentMemberExp(nodeRight, toCompare))
        }

        return {
            LogicalExpression(node) {
                const state = getState()
                const rightMemberExp = isEqEqEq(node.right) && state.depth === 0 ? node.right.left : node.right

                if (shouldCheckDeeper(node, rightMemberExp, state.node)) {
                    expStates.push({depth: state.depth + 1, node: rightMemberExp.object})
                    if (isEquivalentMemberExp(node.left, rightMemberExp.object) && state.depth >= ruleDepth - 2) {
                        context.report({node, message: "Prefer _.get or _.has over an '&&' chain"})
                    }
                }
            },
            'LogicalExpression:exit'(node) {
                const state = getState()
                if (state && state.node === node.right.object) {
                    expStates.pop()
                }
            }
        }
    }
}
