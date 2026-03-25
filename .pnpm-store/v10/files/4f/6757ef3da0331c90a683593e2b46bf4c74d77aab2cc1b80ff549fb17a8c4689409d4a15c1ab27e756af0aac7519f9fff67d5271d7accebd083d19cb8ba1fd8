/**
 * @fileoverview Rule to check if there's a method in the chain start that can be in the chain
 */
'use strict'

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

const getDocsUrl = require('../util/getDocsUrl')

module.exports = {
    meta: {
        type: 'problem',
        schema: [],
        docs: {
            url: getDocsUrl('prefer-wrapper-method')
        }
    },

    create(context) {
        const {isLodashWrapperMethod, getLodashContext} = require('../util/lodashUtil')
        const lodashContext = getLodashContext(context)
        const visitors = lodashContext.getImportVisitors()
        visitors.CallExpression = function (node) {
            if (lodashContext.isLodashChainStart(node) && isLodashWrapperMethod(node.arguments[0], lodashContext.version)) {
                context.report({node, message: 'Prefer {{name}} with wrapper method over inside the chain start.', data: {name: node.arguments[0].callee.property.name}})
            }
        }
        return visitors
    }
}
