/**
 * @fileoverview Rule to check if a call to _.indexOf === 0 should be a call to _.startsWith
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
            url: getDocsUrl('prefer-startswith')
        }
    },

    create(context) {
        const {isIndexOfCall, getExpressionComparedToInt} = require('../util/astUtil')
        return {
            BinaryExpression(node) {
                if (isIndexOfCall(getExpressionComparedToInt(node, 0))) {
                    context.report({node, message: 'Prefer _.startsWith instead of comparing indexOf() to 0'})
                }
            }
        }
    }
}
