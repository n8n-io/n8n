'use strict'

const _ = require('lodash')

const getMethodData = _.memoize(version => require(`./methodDataByVersion/${version}`))

/**
 * Gets a major version number and method name and returns all its aliases including itself.
 * @param {Number} version
 * @param {string} method
 * @returns {string[]}
 */
const expandAlias = (version, method) => {
    const methodAliases = _.get(getMethodData(version), [method, 'aliases'], [])
    return [method, ...methodAliases]
}

/**
 * Gets a major version number and a list of methods and returns a list of methods and all their aliases
 * @param version
 * @param methods
 * @returns {string[]}
 */
function expandAliases(version, methods) {
    return _.flatMap(methods, method => expandAlias(version, method))
}

/**
 * Returns whether the method is the main alias
 * @param version
 * @param method
 * @returns {Boolean}
 */
function isMainAlias(version, method) {
    return Boolean(getMethodData(version)[method])
}

/**
 * Gets a list of all chainable methods and their aliases for a given version
 * @param {Number} version
 * @param {string} method
 * @returns {boolean}
 */
function isChainable(version, method) {
    const data = getMethodData(version)
    return _.get(data, [getMainAlias(version, method), 'chainable'], false)
}

/**
 * Gets whether the method is a collection method
 * @param {Number} version
 * @param {string} method
 * @returns {Boolean}
 */
function isCollectionMethod(version, method) {
    return methodSupportsShorthand(version, method) || _.includes(expandAliases(version, ['reduce', 'reduceRight']), method)
}


/**
 * Returns whether the node's method call supports using shorthands in the specified version
 * @param {Number} version
 * @param {string} method
 * @param [shorthandType]
 * @returns {boolean}
 */
function methodSupportsShorthand(version, method, shorthandType) {
    const mainAlias = getMainAlias(version, method)
    const methodShorthandData = _.get(getMethodData(version), [mainAlias, 'shorthand'])
    return _.isObject(methodShorthandData) ? Boolean(shorthandType && methodShorthandData[shorthandType]) : Boolean(methodShorthandData)
}

/**
 * Gets whether the method is a wrapper method
 * @param {Number} version
 * @param {string} method
 * @returns {boolean}
 */
function isWrapperMethod(version, method) {
    return _.get(getMethodData(version), [method, 'wrapper'], false)
}

/**
 * Gets whether the suspect is an alias of the method in a given version
 * @param {Number} version
 * @param {string} method
 * @param {string} suspect
 * @returns {boolean}
 */
function isAliasOfMethod(version, method, suspect) {
    return method === suspect || _.includes(_.get(getMethodData(version), [method, 'aliases']), suspect)
}

/**
 * Returns the main alias for the method in the specified version.
 * @param {number} version
 * @param {string} method
 * @returns {string}
 */
function getMainAlias(version, method) {
    const data = getMethodData(version)
    return data[method] ? method : _.findKey(data, methodData => _.includes(methodData.aliases, method))
}

/**
 * Gets the index of the iteratee of a method when it isn't chained, or -1 if it doesn't have one.
 * @param {number} version
 * @param {string} method
 * @returns {number}
 */
function getIterateeIndex(version, method) {
    const mainAlias = getMainAlias(version, method)
    const methodData = getMethodData(version)[mainAlias]
    if (_.has(methodData, 'iterateeIndex')) {
        return methodData.iterateeIndex
    }
    if (methodData && methodData.iteratee) {
        return 1
    }
    return -1
}

/**
 * Gets the maximum number of arguments to be given to the function in the specified version
 * @param {number} version
 * @param {string} name
 * @returns {number}
 */
function getFunctionMaxArity(version, name) {
    return _.get(getMethodData(version), [name, 'args'], Infinity)
}

const sideEffectIterationMethods = ['forEach', 'forEachRight', 'forIn', 'forInRight', 'forOwn', 'forOwnRight']

/**
 * Gets a list of side effect iteration methods by version
 * @param {number} version
 * @returns {string[]}
 */
function getSideEffectIterationMethods(version) {
    return expandAliases(version, sideEffectIterationMethods)
}

/**
 * Returns whether the method exists in the specified version
 * @param {number} version
 * @param {string} method
 * @returns {boolean}
 */
function methodExists(version, method) {
    return Boolean(getMethodData(version)[method])
}

module.exports = {
    isAliasOfMethod,
    isChainable,
    methodSupportsShorthand,
    isWrapperMethod,
    isCollectionMethod,
    isMainAlias,
    getMainAlias,
    getIterateeIndex,
    getFunctionMaxArity,
    getSideEffectIterationMethods,
    methodExists
}

/**
 * A JSON object containing method info for a specific lodash major version
 @typedef {Object} VersionInfo
 @property {Aliases} aliases
 @property {[string]} wrapper
 @property {Object.<string, [string]>} wrapperAliases
 @property {[string]} property
 @property {[string]} chainable
 */