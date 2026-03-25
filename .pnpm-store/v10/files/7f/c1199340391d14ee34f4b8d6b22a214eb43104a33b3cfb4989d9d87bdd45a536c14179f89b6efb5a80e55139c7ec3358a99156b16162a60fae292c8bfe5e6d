'use strict'
const _ = require('lodash')

/**
 * Gets the object that called the method in a CallExpression
 * @param {Object} node
 * @returns {Object|undefined}
 */
const getCaller = _.property(['callee', 'object'])

/**
 * Gets the name of a method in a CallExpression
 * @param {Object} node
 * @returns {string|undefined}
 */
const getMethodName = _.property(['callee', 'property', 'name'])

/**
 * Returns whether the node is a method call
 * @param {Object} node
 * @returns {boolean}
 */
const isMethodCall = _.matches({type: 'CallExpression', callee: {type: 'MemberExpression'}})

const isFunctionExpression = _.overSome(
    _.matchesProperty('type', 'FunctionExpression'),
    _.matchesProperty('type', 'FunctionDeclaration')
)
/**
 * Returns whether the node is a function declaration that has a block
 * @param {Object} node
 * @returns {boolean}
 */
const isFunctionDefinitionWithBlock = _.overSome(
    isFunctionExpression,
    _.matches({type: 'ArrowFunctionExpression', body: {type: 'BlockStatement'}})
)

/**
 * If the node specified is a function, returns the node corresponding with the first statement/expression in that function
 * @param {Object} node
 * @returns {node|undefined}
 */
const getFirstFunctionLine = _.cond([
    [isFunctionDefinitionWithBlock, _.property(['body', 'body', 0])],
    [_.matches({type: 'ArrowFunctionExpression'}), _.property('body')]
])

/**
 *
 * @param {Object} node
 * @returns {boolean|undefined}
 */
const isPropAccess = _.overSome(_.matches({computed: false}), _.matchesProperty(['property', 'type'], 'Literal'))

/**
 * Returns whether the node is a member expression starting with the same object, up to the specified length
 * @param {Object} node
 * @param {string} objectName
 * @param {Object} [options]
 * @param {number} [options.maxLength]
 * @param {boolean} [options.allowComputed]
 * @returns {boolean|undefined}
 */
function isMemberExpOf(node, objectName, {maxLength = Number.MAX_VALUE, allowComputed} = {}) {
    if (objectName) {
        let curr = node
        let depth = maxLength
        while (curr && depth) {
            if (allowComputed || isPropAccess(curr)) {
                if (curr.type === 'MemberExpression' && curr.object.name === objectName) {
                    return true
                }
                curr = curr.object
                depth--
            } else {
                return false
            }
        }
    }
}

/**
 * Returns the name of the first parameter of a function, if it exists
 * @param {Object} func
 * @returns {string|undefined}
 */
const getFirstParamName = _.property(['params', 0, 'name'])

/**
 * Returns whether or not the expression is a return statement
 * @param {Object} exp
 * @returns {boolean|undefined}
 */
const isReturnStatement = _.matchesProperty('type', 'ReturnStatement')

/**
 * Returns whether the node specified has only one statement
 * @param {Object} func
 * @returns {boolean}
 */
function hasOnlyOneStatement(func) {
    if (isFunctionDefinitionWithBlock(func)) {
        return _.get(func, 'body.body.length') === 1
    }
    if (func.type === 'ArrowFunctionExpression') {
        return !_.get(func, 'body.body')
    }
}

/**
 * Returns whether the node is an object of a method call
 * @param {Object} node
 * @returns {boolean}
 */
function isObjectOfMethodCall(node) {
    return _.get(node, 'parent.object') === node && _.get(node, 'parent.parent.type') === 'CallExpression'
}

/**
 * Returns whether the node is a literal
 * @param {Object} node
 * @returns {boolean}
 */
function isLiteral(node) {
    return node.type === 'Literal'
}

/**
 * Returns whether the expression specified is a binary expression with the specified operator and one of its sides is a member expression of the specified object name
 * @param {string} operator
 * @param {Object} exp
 * @param {string} objectName
 * @param {number} maxLength
 * @param {boolean} allowComputed
 * @param {boolean} onlyLiterals
 * @returns {boolean|undefined}
 */
function isBinaryExpWithMemberOf(operator, exp, objectName, {maxLength, allowComputed, onlyLiterals} = {}) {
    if (!_.isMatch(exp, {type: 'BinaryExpression', operator})) {
        return false
    }
    const [left, right] = [exp.left, exp.right].map(side => isMemberExpOf(side, objectName, {maxLength, allowComputed}))
    return (left === !right) && (!onlyLiterals || isLiteral(exp.left) || isLiteral(exp.right))
}


/**
 * Returns whether the specified expression is a negation.
 * @param {Object} exp
 * @returns {boolean|undefined}
 */
const isNegationExpression = _.matches({type: 'UnaryExpression', operator: '!'})

/**
 * Returns whether the expression is a negation of a member of objectName, in the specified depth.
 * @param {Object} exp
 * @param {string} objectName
 * @param {number} maxLength
 * @returns {boolean|undefined}
 */
function isNegationOfMemberOf(exp, objectName, {maxLength} = {}) {
    return isNegationExpression(exp) && isMemberExpOf(exp.argument, objectName, {maxLength, allowComputed: false})
}

/**
 *
 * @param {Object} exp
 * @param {string} paramName
 * @returns {boolean|undefined}
 */
function isIdentifierWithName(exp, paramName) {
    return exp && paramName && exp.type === 'Identifier' && exp.name === paramName
}

/**
 * Returns the node of the value returned in the first line, if any
 * @param {Object} func
 * @returns {Object|undefined}
 */
function getValueReturnedInFirstStatement(func) {
    const firstLine = getFirstFunctionLine(func)
    if (func) {
        if (isFunctionDefinitionWithBlock(func)) {
            return isReturnStatement(firstLine) ? firstLine.argument : undefined
        }
        if (func.type === 'ArrowFunctionExpression') {
            return firstLine
        }
    }
}

/**
 * Returns whether the node is a call from the specified object name
 * @param {Object} node
 * @param {string} objName
 * @returns {boolean|undefined}
 */
function isCallFromObject(node, objName) {
    return node && objName && node.type === 'CallExpression' && _.get(node, 'callee.object.name') === objName
}

/**
 * Returns whether the node is actually computed (x['ab'] does not count, x['a' + 'b'] does
 * @param {Object} node
 * @returns {boolean|undefined}
 */
function isComputed(node) {
    return _.get(node, 'computed') && node.property.type !== 'Literal'
}

/**
 * Returns whether the two expressions refer to the same object (e.g. a['b'].c and a.b.c)
 * @param {Object} a
 * @param {Object} b
 * @returns {boolean}
 */
function isEquivalentMemberExp(a, b) {
    return _.isEqualWith(a, b, (left, right, key) => {
        if (_.includes(['loc', 'range', 'computed', 'start', 'end', 'parent'], key)) {
            return true
        }
        if (isComputed(left) || isComputed(right)) {
            return false
        }
        if (key === 'property') {
            const leftValue = left.name || left.value
            const rightValue = right.name || right.value
            return leftValue === rightValue
        }
    })
}

/**
 * Returns whether the expression is a strict equality comparison, ===
 * @param {Object} node
 * @returns {boolean}
 */
const isEqEqEq = _.matches({type: 'BinaryExpression', operator: '==='})


const isMinus = node => node.type === 'UnaryExpression' && node.operator === '-'

/**
 * Enum for type of comparison to int literal
 * @readonly
 * @enum {number}
 */
const comparisonType = {
    exact: 0,
    over: 1,
    under: 2,
    any: 3
}
const comparisonOperators = ['==', '!=', '===', '!==']

function getIsValue(value) {
    return value < 0 ? _.overEvery(isMinus, _.matches({argument: {value: -value}})) : _.matches({value})
}

/**
 * Returns the expression compared to the value in a binary expression, or undefined if there isn't one
 * @param {Object} node
 * @param {number} value
 * @param {boolean} [checkOver=false]
 * @returns {Object|undefined}
 */
function getExpressionComparedToInt(node, value, checkOver) {
    const isValue = getIsValue(value)
    if (_.includes(comparisonOperators, node.operator)) {
        if (isValue(node.right)) {
            return node.left
        }
        if (isValue(node.left)) {
            return node.right
        }
    }
    if (checkOver) {
        if (node.operator === '>' && isValue(node.right)) {
            return node.left
        }
        if (node.operator === '<' && isValue(node.left)) {
            return node.right
        }
        const isNext = getIsValue(value + 1)
        if ((node.operator === '>=' || node.operator === '<') && isNext(node.right)) {
            return node.left
        }
        if ((node.operator === '<=' || node.operator === '>') && isNext(node.left)) {
            return node.right
        }
    }
}

/**
 * Returns whether the node is a call to indexOf
 * @param {Object} node
 * @returns {boolean}
 */
const isIndexOfCall = node => isMethodCall(node) && getMethodName(node) === 'indexOf'

/**
 * Returns whether the node is a call to findIndex
 * @param {Object} node
 * @returns {boolean}
 */
const isFindIndexCall = node => isMethodCall(node) && getMethodName(node) === 'findIndex'

/**
 * Returns an array of identifier names returned in a parameter or variable definition
 * @param node an AST node which is a parameter or variable declaration
 * @returns {string[]} List of names defined in the parameter
 */
function collectParameterValues(node) {
    switch (node && node.type) {
        case 'Identifier':
            return [node.name]
        case 'ObjectPattern':
            return _.flatMap(node.properties, prop => collectParameterValues(prop.value))
        case 'ArrayPattern':
            return _.flatMap(node.elements, collectParameterValues)
        default:
            return []
    }
}

module.exports = {
    getCaller,
    getMethodName,
    isMethodCall,
    getFirstFunctionLine,
    isMemberExpOf,
    getFirstParamName,
    hasOnlyOneStatement,
    isObjectOfMethodCall,
    isEqEqEqToMemberOf: isBinaryExpWithMemberOf.bind(null, '==='),
    isNotEqEqToMemberOf: isBinaryExpWithMemberOf.bind(null, '!=='),
    isNegationOfMemberOf,
    isIdentifierWithName,
    isNegationExpression,
    getValueReturnedInFirstStatement,
    isCallFromObject,
    isComputed,
    isEquivalentMemberExp,
    isEqEqEq,
    comparisonType,
    getExpressionComparedToInt,
    isIndexOfCall,
    isFindIndexCall,
    isFunctionExpression,
    isFunctionDefinitionWithBlock,
    collectParameterValues
}
