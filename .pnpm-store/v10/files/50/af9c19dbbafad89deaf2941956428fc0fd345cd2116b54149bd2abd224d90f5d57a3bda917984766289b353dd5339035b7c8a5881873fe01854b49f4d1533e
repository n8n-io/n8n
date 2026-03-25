/**
 * @fileoverview Rule to check if an indexOfComparison should be a call to _.includes
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
            url: getDocsUrl('prefer-includes')
        },
        schema: [{
            type: 'object',
            properties: {
                includeNative: {
                    type: 'boolean'
                }
            }
        }]
    },

    create(context) {
        const includeNative = context.options[0] && context.options[0].includeNative
        const {getExpressionComparedToInt, isIndexOfCall} = require('../util/astUtil')
        const {getLodashMethodVisitors} = require('../util/lodashUtil')
        const {isAliasOfMethod} = require('../util/methodDataUtil')

        const visitors = getLodashMethodVisitors(context, (node, iteratee, {method, version}) => {
            if (isAliasOfMethod(version, 'indexOf', method) && node === getExpressionComparedToInt(node.parent, -1, true)) {
                context.report({node, message: 'Prefer _.includes over indexOf comparison to -1'})
            }
        })
        if (includeNative) {
            visitors.BinaryExpression = node => {
                if (isIndexOfCall(getExpressionComparedToInt(node, -1, true))) {
                    context.report({node, message: 'Prefer _.includes over indexOf comparison to -1'})
                }
            }
        }
        return visitors
    }
}
