/**
 * @fileoverview Rule to check if the macthesProperty shorthand can be used
 */
'use strict'

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

const getDocsUrl = require('../util/getDocsUrl')

module.exports = {
    meta: {
        type: 'problem',
        docs: {
            url: getDocsUrl('matches-prop-shorthand')
        },
        schema: [{
            enum: ['always', 'never']
        }, {
            type: 'object',
            properties: {
                onlyLiterals: {
                    type: 'boolean'
                }
            }
        }]
    },

    create(context) {
        const {isCallToLodashMethod, getShorthandVisitors} = require('../util/lodashUtil')
        const {isEqEqEqToMemberOf, getValueReturnedInFirstStatement, getFirstParamName} = require('../util/astUtil')
        const {version} = require('../util/settingsUtil').getSettings(context)
        const onlyLiterals = context.options[1] && context.options[1].onlyLiterals

        function isFunctionDeclarationThatCanUseShorthand(func) {
            return isEqEqEqToMemberOf(getValueReturnedInFirstStatement(func), getFirstParamName(func), {onlyLiterals})
        }

        function canUseShorthand(iteratee, lodashContext) {
            return isFunctionDeclarationThatCanUseShorthand(iteratee) || isCallToLodashMethod(iteratee, 'matchesProperty', lodashContext)
        }

        function callHasExtraParamAfterIteratee(node, iteratee) {
            return node.arguments[node.arguments.indexOf(iteratee) + 1]
        }

        const matchesPropertyChecks = {
            3(node, iteratee) {
                return iteratee && iteratee.type === 'Literal' && callHasExtraParamAfterIteratee(node, iteratee)
            },
            4(node, iteratee) {
                return iteratee && iteratee.type === 'ArrayExpression'
            }
        }

        return getShorthandVisitors(context, {
            canUseShorthand,
            usesShorthand: matchesPropertyChecks[version]
        }, {
            always: 'Prefer matches property syntax',
            never: 'Do not use matches property syntax'
        })
    }
}
