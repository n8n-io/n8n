/**
 * @fileoverview Rule to enforce usage of collection method values
 */
'use strict'

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------
const _ = require('lodash')
const getDocsUrl = require('../util/getDocsUrl')
const {getLodashMethodVisitors} = require('../util/lodashUtil')
const {getMainAlias} = require('../util/methodDataUtil')

function isAsc(node) {
    return node.type === 'Literal' && node.value === 'asc'
}

function allAsc(node) {
    return node.type === 'ArrayExpression' && _.every(node.elements, isAsc)
}

function canOmitOrders(orderingNode) {
    return orderingNode && (isAsc(orderingNode) || allAsc(orderingNode))
}

function ordersAreOmitted(orderingNode) {
    return !orderingNode
}

function getNonCollectionArgs(node, callType) {
    return callType === 'chained' ? node.arguments.slice(0, 2) : node.arguments.slice(1, 3)
}

function canUseSortBy(orderingNode) {
    return !orderingNode || isAsc(orderingNode) || allAsc(orderingNode)
}

function enforceArraysOption(node, useArray, method, context) {
    if (node && !_.isUndefined(useArray)) {
        if (useArray === 'always' && node.type !== 'ArrayExpression') {
            context.report({node, messageId: 'useArrayAlways', data: {method}})
        } else if (useArray === 'as-needed' && node.type === 'ArrayExpression' && node.elements.length === 1) {
            context.report({node, messageId: 'useArrayAsNeeded', data: {method}})
        }
    }
}

module.exports = {
    meta: {
        type: 'problem',
        docs: {
            url: getDocsUrl('collection-ordering')
        },
        schema: [{
            type: 'object',
            properties: {
                method: {
                    enum: ['sortBy', 'orderBy', 'orderByExplicit']
                },
                useArray: {
                    enum: ['always', 'as-needed']
                }
            }
        }],
        messages: {
            sortBy: 'Use _.sortBy for sorting only in ascending order.',
            orderBy: 'Use _.orderBy for ordering in ascending order.',
            omitOrders: 'Omit the order when all orders are ascending.',
            orderByExplicit: 'Use _.orderBy and specify the orders.',
            useArrayAlways: 'Wrap ordering iteratees with arrays in _.{{method}}.',
            useArrayAsNeeded: 'Do not wrap a single ordering iteratee with array in _.{{method}}.'
        }
    },
    create(context) {
        const {method: mode = 'sortBy', useArray} = context.options[0] || {}

        return getLodashMethodVisitors(context, (node, iteratee, {version, method, callType}) => {
            const mainAlias = getMainAlias(version, method)
            if (mainAlias === 'sortBy') {
                const [iteratees] = getNonCollectionArgs(node, callType)
                if (mode === 'orderBy' || mode === 'orderByExplicit') {
                    context.report({node, messageId: mode})
                }
                enforceArraysOption(iteratees, useArray, method, context)
            } else if (mainAlias === 'orderBy') {
                const [iteratees, ordering] = getNonCollectionArgs(node, callType)
                if (mode === 'sortBy' && canUseSortBy(ordering)) {
                    context.report({node, messageId: 'sortBy'})
                } else if (mode === 'orderBy' && canOmitOrders(ordering)) {
                    context.report({node, messageId: 'omitOrders'})
                } else if (mode === 'orderByExplicit' && ordersAreOmitted(ordering)) {
                    context.report({node, messageId: 'orderByExplicit'})
                }
                enforceArraysOption(iteratees, useArray, method, context)
                enforceArraysOption(ordering, useArray, method, context)
            }
        })
    }
}
