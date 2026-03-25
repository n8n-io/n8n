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
            url: getDocsUrl('prefer-matches')
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
        const get = require('lodash/get')

        const expStates = []
        function getState() {
            return expStates[expStates.length - 1] || {depth: 0}
        }

        function isMemberExpOfNodeOrRightmost(node, toCompare) {
            return node.type === 'MemberExpression' && !isComputed(node) &&
            (!toCompare || isEquivalentMemberExp(node.object, toCompare))
        }

        function shouldCheckDeeper(node, toCompare) {
            return node.operator === '&&' && isEqEqEq(node.right) && isMemberExpOfNodeOrRightmost(node.right.left, toCompare)
        }

        return {
            LogicalExpression(node) {
                const state = getState()
                if (shouldCheckDeeper(node, state.node)) {
                    expStates.push({depth: state.depth + 1, node: node.right.left.object})
                    if (isEquivalentMemberExp(get(node, 'left.left.object'), get(node, 'right.left.object')) && state.depth >= ruleDepth - 2) {
                        context.report({node, message: 'Prefer _.isMatch over conditions on the same object'})
                    }
                }
            },
            'LogicalExpression:exit'(node) {
                const state = getState()
                if (state && state.node === get(node, 'right.left.object')) {
                    expStates.pop()
                }
            }
        }
    }
}
