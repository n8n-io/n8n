/**
 * @fileoverview Rule to prefer _.noop over an empty function
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
            url: getDocsUrl('prefer-noop')
        }
    },

    create(context) {
        const {getFirstFunctionLine} = require('../util/astUtil')

        function reportIfEmptyFunction(node) {
            if (!getFirstFunctionLine(node) && node.parent.type !== 'MethodDefinition' && !node.generator && !node.async) {
                context.report({node, message: 'Prefer _.noop over an empty function'})
            }
        }

        return {
            FunctionExpression: reportIfEmptyFunction,
            ArrowFunctionExpression: reportIfEmptyFunction
        }
    }
}
