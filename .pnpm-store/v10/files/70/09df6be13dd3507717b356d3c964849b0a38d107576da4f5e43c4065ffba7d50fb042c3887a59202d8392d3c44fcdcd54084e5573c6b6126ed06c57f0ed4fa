/**
 * @fileoverview Rule to check if a call to `_.filter` should be a call to `_.find`.
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
            url: getDocsUrl('prefer-find')
        }
    },

    create(context) {
        const {getLodashMethodVisitors, isCallToMethod, isCallToLodashMethod} = require('../util/lodashUtil')
        const {isAliasOfMethod} = require('../util/methodDataUtil')

        function isZeroIndexAccess(node) {
            return node.type === 'MemberExpression' && node.property.value === 0
        }

        function isChainedBeforeMethod(callType, node, version, method) {
            return callType === 'chained' && isCallToMethod(node.parent.parent, version, method)
        }

        return getLodashMethodVisitors(context, (node, iteratee, {method, version, callType, lodashContext}) => {
            if (isAliasOfMethod(version, 'filter', method) || isAliasOfMethod(version, 'reject', method)) {
                if (isZeroIndexAccess(node.parent) || isCallToLodashMethod(node.parent, 'head', lodashContext) || isChainedBeforeMethod(callType, node, version, 'head')) {
                    context.report({node, message: 'Prefer using `_.find` over selecting the first item of a filtered result'})
                }
                if (isCallToLodashMethod(node.parent, 'last', lodashContext) || isChainedBeforeMethod(callType, node, version, 'last')) {
                    context.report({node, message: 'Prefer using `_.findLast` over selecting the last item of a filtered result'})
                }
            }
        })
    }
}
