/**
 * @fileoverview Rule to prefer immutable methods over methods that mutate their arguments
 */
'use strict'

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

const getDocsUrl = require('../util/getDocsUrl')

const mutatingMethods = {
    pull: 'without',
    pullAll: 'difference',
    pullAllBy: 'differenceBy',
    pullAllWith: 'differenceWith',
    pullAt: 'filter',
    remove: 'filter'
}

const forEach = require('lodash/forEach')

module.exports = {
    meta: {
        type: 'problem',
        schema: [],
        docs: {
            url: getDocsUrl('prefer-immutable-method')
        }
    },

    create(context) {
        const {getLodashMethodVisitors} = require('../util/lodashUtil')
        const {isAliasOfMethod} = require('../util/methodDataUtil')

        const visitors = getLodashMethodVisitors(context, (node, iteratee, {method, version}) => {
            forEach(mutatingMethods, (preferred, mutatingMethod) => {
                if (isAliasOfMethod(version, mutatingMethod, method)) {
                    context.report({
                        node,
                        message: `Prefer _.${preferred} instead of _.${mutatingMethod}`
                    })
                }
            })
        })
        return visitors
    }
}
