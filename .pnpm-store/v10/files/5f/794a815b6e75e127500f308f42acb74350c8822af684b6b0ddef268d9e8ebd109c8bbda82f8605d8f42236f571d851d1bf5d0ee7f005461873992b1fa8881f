/**
 * @fileoverview Rule to enforce usage of collection method values
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
            url: getDocsUrl('collection-method-value')
        }
    },

    create(context) {
        const {isChainBreaker, getLodashMethodVisitors, isCallToMethod} = require('../util/lodashUtil')
        const {getMethodName} = require('../util/astUtil')
        const {isCollectionMethod, isAliasOfMethod, getSideEffectIterationMethods} = require('../util/methodDataUtil')
        const includes = require('lodash/includes')

        function parentUsesValue(node, callType, version) {
            const isBeforeChainBreaker = callType === 'chained' && isChainBreaker(node.parent.parent, version)
            return (isBeforeChainBreaker ? node.parent.parent : node).parent.type !== 'ExpressionStatement'
        }

        function isPureLodashCollectionMethod(method, version) {
            return isCollectionMethod(version, method) && !isAliasOfMethod(version, 'remove', method)
        }

        function isSideEffectIterationMethod(method, version) {
            return includes(getSideEffectIterationMethods(version), method)
        }

        function isParentCommit(node, callType, version) {
            return callType === 'chained' && isCallToMethod(node.parent.parent, version, 'commit')
        }

        return getLodashMethodVisitors(context, (node, iteratee, {method, version, callType}) => {
            if (isPureLodashCollectionMethod(method, version) && !parentUsesValue(node, callType, version)) {
                context.report({node, message: `Use value returned from _.${method}`})
            } else if (isSideEffectIterationMethod(method, version) && parentUsesValue(node, callType, version) && !isParentCommit(node, callType, version)) {
                context.report({node, message: `Do not use value returned from _.${getMethodName(node)}`})
            }
        })
    }
}
