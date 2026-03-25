'use strict'
const _ = require('lodash')
const methodDataUtil = require('./methodDataUtil')
const astUtil = require('./astUtil')
const LodashContext = require('./LodashContext')

/**
 * Returns whether or not a node is a chainable method call in the specified version
 * @param {Object} node
 * @param {number} version
 * @returns {boolean}
 */
function isChainable(node, version) {
    return methodDataUtil.isChainable(version, astUtil.getMethodName(node))
}

/**
 * Returns whether the node is a chain breaker method in the specified version
 * @param {Object} node
 * @param {number} version
 * @returns {boolean}
 */
function isChainBreaker(node, version) {
    return methodDataUtil.isAliasOfMethod(version, 'value', astUtil.getMethodName(node))
}

/**
 * Returns whether the node is a call to the specified method or one of its aliases in the version
 * @param {Object} node
 * @param {number} version
 * @param {string} method
 * @returns {boolean}
 */
function isCallToMethod(node, version, method) {
    return methodDataUtil.isAliasOfMethod(version, method, astUtil.getMethodName(node))
}

/**
 * Returns whether or not the node is a call to a lodash wrapper method
 * @param {Object} node
 * @param {number} version
 * @returns {boolean}
 */
function isLodashWrapperMethod(node, version) {
    return methodDataUtil.isWrapperMethod(version, astUtil.getMethodName(node))
}

/**
 * Gets the 'isX' method for a specified type, e.g. isObject
 * @param {string} name
 * @returns {string|null}
 */
function getIsTypeMethod(name) {
    const types = ['number', 'boolean', 'function', 'Function', 'string', 'object', 'undefined', 'Date', 'Array', 'Error', 'Element']
    return _.includes(types, name) ? `is${_.capitalize(name)}` : null
}

/**
 * Returns whether or not the node is a call to a native collection method
 * @param {Object} node
 * @returns {boolean}
 */
function isNativeCollectionMethodCall(node) {
    return _.includes(['every', 'fill', 'filter', 'find', 'findIndex', 'forEach', 'includes', 'map', 'reduce', 'reduceRight', 'some'], astUtil.getMethodName(node))
}

/**
 * Gets the context's Lodash settings and a function and returns a visitor that calls the function for every Lodash or chain call
 * @param {LodashContext} lodashContext
 * @param {LodashReporter} reporter
 * @returns {NodeTypeVisitor}
 */
function getLodashMethodCallExpVisitor(lodashContext, reporter) {
    return function (node) {
        const {version} = lodashContext
        let iterateeIndex
        if (lodashContext.isLodashChainStart(node)) {
            let prevNode = node
            node = node.parent.parent
            while (astUtil.getCaller(node) === prevNode && astUtil.isMethodCall(node) && !isChainBreaker(node, version)) {
                const method = astUtil.getMethodName(node)
                iterateeIndex = methodDataUtil.getIterateeIndex(version, method)
                reporter(node, node.arguments[iterateeIndex - 1], {callType: 'chained', method, version, lodashContext})
                prevNode = node
                node = node.parent.parent
            }
        } else if (lodashContext.isLodashCall(node)) {
            const method = astUtil.getMethodName(node)
            iterateeIndex = methodDataUtil.getIterateeIndex(version, method)
            reporter(node, node.arguments[iterateeIndex], {callType: 'method', method, version, lodashContext})
        } else if (version !== 3) {
            const method = lodashContext.getImportedLodashMethod(node)
            if (method) {
                iterateeIndex = methodDataUtil.getIterateeIndex(version, method)
                reporter(node, node.arguments[iterateeIndex], {method, callType: 'single', version, lodashContext})
            }
        }
    }
}

function isLodashCallToMethod(node, method, lodashContext) {
    return lodashContext.isLodashCall(node) && isCallToMethod(node, lodashContext.version, method)
}

function isCallToLodashMethod(node, method, lodashContext) {
    if (!node || node.type !== 'CallExpression') {
        return false
    }
    return isLodashCallToMethod(node, method, lodashContext) ||
        methodDataUtil.isAliasOfMethod(lodashContext.version, method, lodashContext.getImportedLodashMethod(node))
}

function getLodashMethodVisitors(context, lodashCallExpVisitor) {
    const lodashContext = new LodashContext(context)
    const visitors = lodashContext.getImportVisitors()
    visitors.CallExpression = getLodashMethodCallExpVisitor(lodashContext, lodashCallExpVisitor)
    return visitors
}

/**
 * @param context
 * @param checks
 * @param messages
 * @param [shorthandType]
 * @returns {{ImportDeclaration({source: *, specifiers: *}): void, VariableDeclarator({init: *, id: *}): void}}
 */
function getShorthandVisitors(context, checks, messages, shorthandType) {
    const lodashContext = new LodashContext(context)
    const visitors = lodashContext.getImportVisitors()
    visitors.CallExpression = getLodashMethodCallExpVisitor(lodashContext, {
        always(node, iteratee, {method, version}) {
            if (methodDataUtil.methodSupportsShorthand(version, method, shorthandType) && checks.canUseShorthand(iteratee, lodashContext)) {
                context.report(iteratee, messages.always)
            }
        },
        never(node, iteratee, {method}) {
            if (checks.usesShorthand(node, iteratee, method)) {
                context.report(iteratee || node.callee.property, messages.never)
            }
        }
    }[context.options[0] || 'always'])
    return visitors
}

/**
 *
 * @param context
 * @returns {LodashContext} a LodashContext for a given context
 */
function getLodashContext(context) {
    return new LodashContext(context)
}

module.exports = {
    isChainable,
    isChainBreaker,
    isCallToMethod,
    isLodashWrapperMethod,
    getIsTypeMethod,
    isNativeCollectionMethodCall,
    getLodashMethodCallExpVisitor,
    isCallToLodashMethod,
    getShorthandVisitors,
    getLodashMethodVisitors,
    getLodashContext
}

/**
 @callback LodashReporter
 @param {Object} node
 @param {Object} iteratee
 @param {Object?} options
 */

/**
 @callback NodeTypeVisitor
 @param {Object} node
 */

/**
 * @typedef {Object} ShorthandChecks
 * @property {function} canUseShorthand
 * @property {function} usesShorthand
 */

/**
 * @typedef {object} ShorthandMessages
 * @property {string} always
 * @property {string} never
 */
