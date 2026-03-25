/**
 * @fileoverview Rule to check if there's a method in the chain start that can be in the chain
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
            url: getDocsUrl('prefer-lodash-method')
        },
        schema: [{
            type: 'object',
            properties: {
                ignoredMethods: {
                    type: 'array',
                    items: {
                        type: 'string'
                    }
                },
                ignoredObjects: {
                    type: 'array',
                    items: {
                        type: 'string'
                    }
                }
            }
        }]
    },

    create(context) {
        const {getLodashContext, isNativeCollectionMethodCall, getLodashMethodCallExpVisitor} = require('../util/lodashUtil')
        const {getMethodName, getCaller} = require('../util/astUtil')
        const {methodExists} = require('../util/methodDataUtil')
        const get = require('lodash/get')
        const includes = require('lodash/includes')
        const some = require('lodash/some')
        const assign = require('lodash/assign')
        const ignoredMethods = get(context, ['options', 0, 'ignoreMethods'], [])
        const ignoredObjects = get(context, ['options', 0, 'ignoreObjects'], [])
        const usingLodash = new Set()

        const nativeStringMap = {
            endsWith: 'endsWith',
            includes: 'includes',
            padEnd: 'padEnd',
            padStart: 'padStart',
            repeat: 'repeat',
            replace: 'replace',
            split: 'split',
            startsWith: 'startsWith',
            toLowerCase: 'toLower',
            toUpperCase: 'toUpper',
            trim: 'trim'
        }

        const lodashContext = getLodashContext(context)

        function isNonNullObjectCreate(callerName, methodName, arg) {
            return callerName === 'Object' && methodName === 'create' && get(arg, 'value') !== null
        }

        function isStaticNativeMethodCall(node) {
            const staticMethods = {
                Object: ['assign', 'keys', 'values'],
                Array: ['isArray']
            }
            const callerName = get(node, 'callee.object.name')
            const methodName = getMethodName(node)
            return (callerName in staticMethods) && includes(staticMethods[callerName], methodName) || isNonNullObjectCreate(callerName, methodName, node.arguments[0])
        }

        function isNativeStringMethodCall(node) {
            const lodashFunction = nativeStringMap[getMethodName(node)]
            return Boolean(lodashFunction) && methodExists(lodashContext.version, lodashFunction)
        }

        function canUseLodash(node) {
            return isNativeCollectionMethodCall(node) || isStaticNativeMethodCall(node) || isNativeStringMethodCall(node)
        }

        function getTextOfNode(node) {
            if (node) {
                if (node.type === 'Identifier') {
                    return node.name
                }
                return context.getSourceCode().getText(node)
            }
        }

        function someMatch(patterns, str) {
            return str && some(patterns, pattern => str.match(pattern))
        }

        function shouldIgnore(node) {
            return someMatch(ignoredMethods, getMethodName(node)) || someMatch(ignoredObjects, getTextOfNode(getCaller(node)))
        }
        return assign({
            CallExpression: getLodashMethodCallExpVisitor(lodashContext, node => {
                usingLodash.add(node)
            }),
            'CallExpression:exit'(node) {
                if (!usingLodash.has(node) && !shouldIgnore(node) && canUseLodash(node)) {
                    let lodashMethodName = getMethodName(node)
                    if (isNativeStringMethodCall(node)) {
                        lodashMethodName = nativeStringMap[lodashMethodName]
                    }
                    context.report({node, message: `Prefer '_.${lodashMethodName}' over the native function.`})
                }
            }
        }, lodashContext.getImportVisitors())
    }
}
