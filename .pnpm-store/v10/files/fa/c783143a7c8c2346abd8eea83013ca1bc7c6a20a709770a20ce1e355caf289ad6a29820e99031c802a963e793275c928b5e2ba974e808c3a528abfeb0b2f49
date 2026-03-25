/**
 * @fileoverview Rule to check if there's a JS native method in the lodash chain
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
            url: getDocsUrl('path-style')
        },
        schema: [{
            enum: ['as-needed', 'array', 'string']
        }],
        fixable: 'code',
        messages: {
            stringForSimple: 'Use a string for simple paths',
            arrayForVars: 'Use an array for paths with variables',
            array: 'Use an array for paths',
            string: 'Use a string for paths'
        }
    },

    create(context) {
        const {getLodashMethodVisitors} = require('../util/lodashUtil')
        const {isAliasOfMethod} = require('../util/methodDataUtil')
        const objectPathMethods = {
            regular: {methods: ['get', 'has', 'hasIn', 'set', 'unset', 'invoke'], index: 1},
            higherOrder: {methods: ['property', 'matchesProperty'], index: 0}
        }
        const find = require('lodash/find')
        const findIndex = require('lodash/findIndex')
        const some = require('lodash/some')
        const every = require('lodash/every')
        const matches = require('lodash/matches')
        const toPath = require('lodash/toPath')
        const isPropAccess = x => x === '.' || x === '['

        function endsWithPropAccess(str) {
            return isPropAccess(str[str.length - 1])
        }

        function startsWithPropAccess(str) {
            return isPropAccess(str[0])
        }

        function getIndexByMethodName(method, version) {
            const isAliasOfSuspect = m => isAliasOfMethod(version, m, method)
            const pathMethodGroup = find(objectPathMethods, type => some(type.methods, isAliasOfSuspect))
            return pathMethodGroup ? pathMethodGroup.index : -1
        }

        function getPropertyPathNode(node, method, version, callType) {
            const index = getIndexByMethodName(method, version)
            return node.arguments[callType === 'chained' ? index - 1 : index]
        }

        const isArrayExpression = matches({type: 'ArrayExpression'})
        const isLiteral = matches({type: 'Literal'})
        const isAddition = matches({type: 'BinaryExpression', operator: '+'})
        const isTemplateLiteral = matches({type: 'TemplateLiteral'})

        function isArrayOfLiterals(node) {
            return isArrayExpression(node) && every(node.elements, isLiteral)
        }

        function isAdjacentToPropAccessInTemplate(exp, literal) {
            const quasiAfterIndex = findIndex(literal.quasis, quasi => quasi.range[0] >= exp.range[1])
            const quasiBefore = literal.quasis[quasiAfterIndex - 1]
            const quasiAfter = literal.quasis[quasiAfterIndex]
            return (quasiBefore && endsWithPropAccess(quasiBefore.value.raw)) ||
                (quasiAfter && startsWithPropAccess(quasiAfter.value.raw))
        }

        function isTemplateStringWithVariableProps(node) {
            return isTemplateLiteral(node) && some(node.expressions, exp => isAdjacentToPropAccessInTemplate(exp, node))
        }

        function isStringConcatWithVariableProps(node) {
            return isAddition(node) &&
                ((isLiteral(node.left) && endsWithPropAccess(node.left.value)) ||
                (isLiteral(node.right) && startsWithPropAccess(node.right.value)))
        }

        function canBeDotNotation(node) {
            return node.value && /^[a-zA-z0-9_$][\w\$]*$/.test(node.value)
        }

        function convertToStringStyleWithoutVariables(node) {
            return `'${node.elements
                .map(el => canBeDotNotation(el) ? `.${el.value}` : `[${el.value}]`)
                .join('')
                .replace(/^\./, '')}'`
        }

        function convertToStringStyleWithVariables(node) {
            return `\`${node.elements
                .map(el => {
                    if (el.type === 'MemberExpression') {
                        return `.\$\{${context.getSourceCode().getText(el)}\}`
                    }
                    if (canBeDotNotation(el)) {
                        return `.${el.value}`
                    }
                    if (isLiteral(el)) {
                        return `[${el.value}]`
                    }
                    return `\$\{${context.getSourceCode().getText(el)}\}`
                })
                .join('')
                .replace(/^\./, '')}\``
        }

        function convertToStringStyle(node, hasVariables) {
            if (!hasVariables || isArrayOfLiterals(node)) {
                return convertToStringStyleWithoutVariables(node)
            }
            return convertToStringStyleWithVariables(node)
        }

        const reportIfViolates = {
            'as-needed'(node) {
                if (isArrayOfLiterals(node)) {
                    context.report({
                        node,
                        messageId: 'stringForSimple',
                        fix(fixer) {
                            return fixer.replaceText(node, convertToStringStyle(node, false))
                        }
                    })
                } else if (isStringConcatWithVariableProps(node)) {
                    context.report({
                        node,
                        messageId: 'arrayForVars'
                    })
                } else if (isTemplateStringWithVariableProps(node)) {
                    context.report({
                        node,
                        messageId: 'arrayForVars'
                    })
                }
            },
            array(node) {
                if (isLiteral(node)) {
                    context.report({
                        node,
                        messageId: 'array',
                        fix(fixer) {
                            return fixer.replaceText(node, `[${toPath(node.value)
                                .map(x => `'${x}'`)
                                .join(', ')}]`)
                        }
                    })
                } else if (isTemplateLiteral(node)) {
                    context.report({
                        node,
                        messageId: 'array'
                    })
                }
            },
            string(node) {
                if (isArrayExpression(node)) {
                    context.report({
                        node,
                        messageId: 'string',
                        fix(fixer) {
                            return fixer.replaceText(node, convertToStringStyle(node, true))
                        }
                    })
                }
            }
        }


        return getLodashMethodVisitors(context, (node, iteratee, {method, version, callType}) => {
            const propertyPathNode = getPropertyPathNode(node, method, version, callType)
            if (propertyPathNode) {
                reportIfViolates[context.options[0] || 'as-needed'](propertyPathNode)
            }
        })
    }
}
