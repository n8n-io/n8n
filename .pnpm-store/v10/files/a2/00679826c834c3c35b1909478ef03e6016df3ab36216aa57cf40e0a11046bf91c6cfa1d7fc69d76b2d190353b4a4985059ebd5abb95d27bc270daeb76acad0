/**
 * @fileoverview Rule to make sure value() wasn't called on a lodash chain twice
 */
'use strict'

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

const getDocsUrl = require('../util/getDocsUrl')

module.exports = {
    meta: {
        type: 'problem',
        schema: [],
        docs: {
            url: getDocsUrl('no-double-unwrap')
        },
        fixable: 'code'
    },

    create(context) {
        const {getLodashContext, isChainBreaker, isChainable} = require('../util/lodashUtil')
        const {isMethodCall, getCaller, getMethodName} = require('../util/astUtil')
        const lodashContext = getLodashContext(context)
        const {version} = lodashContext
        const visitors = lodashContext.getImportVisitors()
        visitors.CallExpression = function (node) {
            if (lodashContext.isImplicitChainStart(node)) {
                do {
                    node = node.parent.parent
                } while (isMethodCall(node) && !isChainBreaker(node, version))
                const caller = getCaller(node)
                if (isMethodCall(node) && !isChainable(caller, version)) {
                    context.report({
                        node,
                        message: 'Do not use .value() after chain-ending method {{method}}',
                        data: {method: getMethodName(caller)},
                        fix(fixer) {
                            return fixer.removeRange([caller.range[1], node.range[1]])
                        }
                    })
                }
            }
        }
        return visitors
    }
}
