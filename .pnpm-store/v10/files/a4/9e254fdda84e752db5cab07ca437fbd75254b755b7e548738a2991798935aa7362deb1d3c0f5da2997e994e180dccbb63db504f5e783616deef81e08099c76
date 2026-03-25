/**
 * @fileoverview Rule to enforce a consistent composition method
 */
'use strict'

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

const getDocsUrl = require('../util/getDocsUrl')

const possibleDirections = ['pipe', 'compose', 'flow', 'flowRight']

module.exports = {
    meta: {
        type: 'problem',
        docs: {
            url: getDocsUrl('consistent-compose')
        },
        schema: [{
            enum: possibleDirections
        }]
    },

    create(context) {
        const includes = require('lodash/includes')
        const {getLodashMethodVisitors} = require('../util/lodashUtil')
        const {version} = require('../util/settingsUtil').getSettings(context)
        const {getMainAlias} = require('../util/methodDataUtil')

        const direction = context.options[0] || 'flow'
        const mainDirectionMethod = getMainAlias(version, direction)

        function isOtherDirection(method) {
            if (includes(possibleDirections, method)) {
                const methodDirection = getMainAlias(version, method)
                return methodDirection !== mainDirectionMethod
            }
        }

        return getLodashMethodVisitors(context, (node, iteratee, {method}) => {
            if (isOtherDirection(method)) {
                context.report({node, message: `Use _.${direction} for composition`})
            }
        })
    }
}
