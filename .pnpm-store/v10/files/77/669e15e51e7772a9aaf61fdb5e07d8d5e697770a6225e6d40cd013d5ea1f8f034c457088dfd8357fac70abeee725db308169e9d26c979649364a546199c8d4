/**
 * @fileoverview Rule to check if the identity shorthand can be used
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
            url: getDocsUrl('identity-shorthand')
        },
        schema: [{
            enum: ['always', 'never']
        }]
    },

    create(context) {
        const get = require('lodash/get')
        const matches = require('lodash/matches')
        const overSome = require('lodash/overSome')
        const {methodSupportsShorthand} = require('../util/methodDataUtil')
        const {getShorthandVisitors} = require('../util/lodashUtil')
        const {getFirstParamName, getValueReturnedInFirstStatement} = require('../util/astUtil')
        const settings = require('../util/settingsUtil').getSettings(context)


        function isExplicitIdentityFunction(iteratee) {
            const firstParamName = getFirstParamName(iteratee)
            return firstParamName && get(getValueReturnedInFirstStatement(iteratee), 'name') === firstParamName
        }

        const isLodashIdentityFunction = matches({
            type: 'MemberExpression',
            object: {name: settings.pragma},
            property: {name: 'identity'}
        })

        const canUseShorthand = overSome(isExplicitIdentityFunction, isLodashIdentityFunction)

        function usesShorthand(node, iteratee, method) {
            return methodSupportsShorthand(settings.version, method) && !iteratee
        }

        return getShorthandVisitors(context, {
            canUseShorthand,
            usesShorthand
        }, {
            always: 'Prefer omitting the iteratee over a function that returns its argument',
            never: 'Do not use the identity shorthand syntax'
        })
    }
}
