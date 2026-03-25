/**
 * @fileoverview Rule to ensure consistency of aliases of lodash methods
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
            url: getDocsUrl('preferred-alias')
        },
        schema: [{
            type: 'object',
            properties: {
                ingoreMethods: {
                    type: 'array',
                    items: {
                        type: 'string'
                    }
                }
            }
        }]
    },

    create(context) {
        const {getLodashMethodVisitors} = require('../util/lodashUtil')
        const {isMainAlias, getMainAlias} = require('../util/methodDataUtil')
        const [{ignoreMethods = []} = {}] = context.options
        const includes = require('lodash/includes')

        return getLodashMethodVisitors(context, (node, iteratee, {method, version}) => {
            if (!includes(ignoreMethods, method) && !isMainAlias(version, method)) {
                const mainAlias = getMainAlias(version, method)
                if (mainAlias) {
                    context.report({
                        node,
                        message: `Method '${method}' is an alias, for consistency prefer using '${mainAlias}'`
                    })
                }
            }
        })
    }
}
