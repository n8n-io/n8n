/**
 * @fileoverview Rule to check if the expression could be better expressed as a _.constant
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
            url: getDocsUrl('prefer-constant')
        },
        schema: [{
            type: 'boolean'
        }, {
            type: 'boolean'
        }]
    },

    create(context) {
        const {getValueReturnedInFirstStatement} = require('../util/astUtil')
        const shouldCheckArrowFunctions = context.options[0] !== undefined ? context.options[0] : true
        const shouldCheckFunctionDeclarations = context.options[1] !== undefined ? context.options[1] : false

        function isCompletelyLiteral(node) {
            switch (node.type) {
                case 'Literal':
                    return true
                case 'BinaryExpression':
                    return isCompletelyLiteral(node.left) && isCompletelyLiteral(node.right)
                case 'UnaryExpression':
                    return isCompletelyLiteral(node.argument)
                case 'ConditionalExpression':
                    return isCompletelyLiteral(node.test) && isCompletelyLiteral(node.consequent) && isCompletelyLiteral(node.alternate)
                default:
                    return false
            }
        }

        function reportIfLikeConstant(func, node) {
            const valueReturnedInFirstLine = func(node)
            if (valueReturnedInFirstLine && isCompletelyLiteral(valueReturnedInFirstLine)) {
                context.report({node, message: 'Prefer _.constant over a function returning a literal'})
            }
        }

        function handleFunctionDefinition(node) {
            reportIfLikeConstant(getValueReturnedInFirstStatement, node)
        }

        return {
            FunctionExpression: handleFunctionDefinition,
            FunctionDeclaration(node) {
                if (shouldCheckFunctionDeclarations) {
                    handleFunctionDefinition(node)
                }
            },
            ArrowFunctionExpression(node) {
                if (shouldCheckArrowFunctions) {
                    handleFunctionDefinition(node)
                }
            }
        }
    }
}
