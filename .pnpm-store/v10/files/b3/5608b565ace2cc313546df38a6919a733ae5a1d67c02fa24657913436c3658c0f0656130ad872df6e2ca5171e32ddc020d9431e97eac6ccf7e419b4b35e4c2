/**
 * @fileoverview Rule to check if a call to map should be a call to times
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
            url: getDocsUrl('prefer-times')
        }
    },

    create(context) {
        const {getLodashMethodVisitors} = require('../util/lodashUtil')
        const {isAliasOfMethod} = require('../util/methodDataUtil')
        const get = require('lodash/get')
        return getLodashMethodVisitors(context, (node, iteratee, {method, version}) => {
            if (isAliasOfMethod(version, 'map', method) && get(iteratee, 'params.length') === 0) {
                context.report({node, message: 'Prefer _.times over _.map without using arguments'})
            }
        })
    }
}
