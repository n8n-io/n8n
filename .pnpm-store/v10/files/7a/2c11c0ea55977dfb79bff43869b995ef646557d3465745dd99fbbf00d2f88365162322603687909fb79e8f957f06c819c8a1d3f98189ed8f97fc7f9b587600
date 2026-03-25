/**
 * @fileoverview Rule to enforce a specific chain style
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
            url: getDocsUrl('chain-style')
        },
        schema: [{
            enum: ['as-needed', 'implicit', 'explicit']
        }]
    },

    create(context) {
        const {getLodashContext, isChainable, isChainBreaker} = require('../util/lodashUtil')
        const {isMethodCall} = require('../util/astUtil')
        const lodashContext = getLodashContext(context)
        const {version} = lodashContext
        const callExpressionVisitors = {
            'as-needed'(node) {
                if (lodashContext.isExplicitChainStart(node)) {
                    let curr = node.parent.parent
                    let needed = false
                    while (isMethodCall(curr) && !isChainBreaker(curr, version)) {
                        if (!isChainable(curr, version) && !isChainBreaker(curr.parent.parent, version)) {
                            needed = true
                        }
                        curr = curr.parent.parent
                    }
                    if (isMethodCall(curr) && !needed) {
                        context.report({node, message: 'Unnecessary explicit chaining'})
                    }
                }
            },
            implicit(node) {
                if (lodashContext.isExplicitChainStart(node)) {
                    context.report({node, message: 'Do not use explicit chaining'})
                }
            },
            explicit(node) {
                if (lodashContext.isImplicitChainStart(node)) {
                    context.report({node, message: 'Do not use implicit chaining'})
                }
            }
        }

        const visitors = lodashContext.getImportVisitors()
        visitors.CallExpression = callExpressionVisitors[context.options[0] || 'as-needed']
        return visitors
    }
}
