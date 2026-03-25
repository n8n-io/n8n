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
        docs: {
            url: getDocsUrl('prefer-filter')
        },
        schema: [{
            type: 'integer'
        }]
    },

    create(context) {
        const {getLodashMethodVisitors} = require('../util/lodashUtil')
        const {
            isIdentifierWithName,
            isMemberExpOf,
            isNegationOfMemberOf,
            isEqEqEqToMemberOf,
            isNotEqEqToMemberOf,
            getFirstFunctionLine,
            hasOnlyOneStatement,
            getFirstParamName
        } = require('../util/astUtil')
        const {isAliasOfMethod} = require('../util/methodDataUtil')
        const DEFAULT_MAX_PROPERTY_PATH_LENGTH = 3
        const maxLength = parseInt(context.options[0], 10) || DEFAULT_MAX_PROPERTY_PATH_LENGTH

        function isIfWithoutElse(statement) {
            return statement && statement.type === 'IfStatement' && !statement.alternate
        }

        function canBeShorthand(exp, paramName) {
            return isIdentifierWithName(exp, paramName) ||
                isMemberExpOf(exp, paramName, {maxLength}) || isNegationOfMemberOf(exp, paramName, {maxLength}) ||
                isEqEqEqToMemberOf(exp, paramName, {maxLength}) || isNotEqEqToMemberOf(exp, paramName, {maxLength})
        }

        function onlyHasSimplifiableIf(func) {
            const firstLine = getFirstFunctionLine(func)
            return func && hasOnlyOneStatement(func) && func.params.length === 1 && isIfWithoutElse(firstLine) && canBeShorthand(firstLine.test, getFirstParamName(func))
        }

        return getLodashMethodVisitors(context, (node, iteratee, {method, version}) => {
            if (isAliasOfMethod(version, 'forEach', method) && onlyHasSimplifiableIf(iteratee)) {
                context.report({node, message: 'Prefer _.filter or _.some over an if statement inside a _.forEach'})
            }
        })
    }
}
