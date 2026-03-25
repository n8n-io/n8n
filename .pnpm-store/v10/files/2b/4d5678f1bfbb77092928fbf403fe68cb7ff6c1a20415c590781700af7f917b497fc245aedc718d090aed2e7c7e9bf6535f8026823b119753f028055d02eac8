/**
 * @fileoverview Rule to ensure a lodash chain ends
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
            url: getDocsUrl('unwrap')
        }
    },

    create(context) {
        const {getLodashContext, isChainable, isCallToMethod, isChainBreaker} = require('../util/lodashUtil')
        const {getCaller} = require('../util/astUtil')
        const negate = require('lodash/negate')
        const lodashContext = getLodashContext(context)
        const {version} = lodashContext
        function isCommit(node) {
            return isCallToMethod(node, version, 'commit')
        }

        function getEndOfChain(node, isExplicit) {
            const stillInChain = isExplicit ? negate(isChainBreaker) : isChainable
            let curr = node.parent.parent
            while (curr.parent && curr === getCaller(curr.parent.parent) && stillInChain(curr, version)) {
                curr = curr.parent.parent
            }
            return curr
        }

        const visitors = lodashContext.getImportVisitors()
        visitors.CallExpression = function (node) {
            if (lodashContext.isImplicitChainStart(node)) {
                const end = getEndOfChain(node, false)
                if (!isCommit(end) && isChainable(end, version)) {
                    context.report({node: end, message: 'Missing unwrapping at end of chain'})
                }
            } else if (lodashContext.isExplicitChainStart(node)) {
                const end = getEndOfChain(node, true)
                if (!isCommit(end) && !isChainBreaker(end, version)) {
                    context.report({node: end, message: 'Missing unwrapping at end of chain'})
                }
            }
        }
        return visitors
    }
}
