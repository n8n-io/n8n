/**
 * @fileoverview Rule to check if a call to _.forEach should be a call to _.filter
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
            url: getDocsUrl('prefer-map')
        }
    },

    create(context) {
        const {getLodashMethodVisitors} = require('../util/lodashUtil')
        const {getFirstFunctionLine, hasOnlyOneStatement, getMethodName, isFunctionDefinitionWithBlock, collectParameterValues} = require('../util/astUtil')
        const {isAliasOfMethod} = require('../util/methodDataUtil')
        const get = require('lodash/get')
        const includes = require('lodash/includes')

        function onlyHasPush(func) {
            const firstLine = getFirstFunctionLine(func)
            const firstParam = get(func, 'params[0]')
            const exp = func && !isFunctionDefinitionWithBlock(func) ? firstLine : firstLine && firstLine.expression
            return func && hasOnlyOneStatement(func) && getMethodName(exp) === 'push' && !includes(collectParameterValues(firstParam), get(exp, 'callee.object.name'))
        }

        return getLodashMethodVisitors(context, (node, iteratee, {method, version}) => {
            if (isAliasOfMethod(version, 'forEach', method) && onlyHasPush(iteratee)) {
                context.report({node, message: 'Prefer _.map over a _.forEach with a push to an array inside'})
            }
        })
    }
}
