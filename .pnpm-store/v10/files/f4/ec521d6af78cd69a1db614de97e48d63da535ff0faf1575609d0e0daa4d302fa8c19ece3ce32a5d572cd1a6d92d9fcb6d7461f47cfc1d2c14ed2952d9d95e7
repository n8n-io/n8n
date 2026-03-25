/**
 * @fileoverview Rule to check if the expression could be better expressed as a chain
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
            url: getDocsUrl('chaining')
        },
        schema: [{
            enum: ['always', 'never', 'implicit']
        }, {
            type: 'integer',
            minimum: 2
        }],
        messages: {
            single: 'Do not use chain syntax for single method',
            never: 'Prefer composition to Lodash chaining',
            always: 'Prefer chaining to composition'
        }
    },

    create(context) {
        const {getLodashContext, isChainBreaker} = require('../util/lodashUtil')
        const {isMethodCall, isObjectOfMethodCall, getMethodName} = require('../util/astUtil')
        const {isChainable} = require('../util/methodDataUtil')
        const DEFAULT_LENGTH = 3
        const lodashContext = getLodashContext(context)
        const {version} = lodashContext
        const negate = require('lodash/negate')

        const mode = context.options[0] || 'never'
        const ruleDepth = parseInt(context.options[1], 10) || DEFAULT_LENGTH

        const isEndOfChain = negate(isObjectOfMethodCall)

        function isBeforeChainBreaker(node) {
            return isChainBreaker(node.parent.parent, version)
        }

        function isNestedNLevelsInner(node, n, includeUnchainable) {
            if (n === 0) {
                return true
            }
            if (lodashContext.isLodashCall(node) && (includeUnchainable || isChainable(version, getMethodName(node)))) {
                return isNestedNLevelsInner(node.arguments[0], n - 1)
            }
            const importedLodashMethod = lodashContext.getImportedLodashMethod(node)
            if (importedLodashMethod && (includeUnchainable || isChainable(version, importedLodashMethod))) {
                return isNestedNLevelsInner(node.arguments[0], n - 1)
            }
        }

        function isNestedNLevels(node, n, includeUnchainable) {
            if (includeUnchainable) {
                return isNestedNLevelsInner(node, n, includeUnchainable)
            }
            if (lodashContext.isLodashCall(node) || lodashContext.getImportedLodashMethod(node)) {
                return isNestedNLevelsInner(node.arguments[0], n - 1, false)
            }
        }

        function reportOnSingleChain(node) {
            if (isMethodCall(node) && (isEndOfChain(node) || isBeforeChainBreaker(node))) {
                context.report({node, messageId: 'single'})
            }
        }

        const callExpressionVisitors = {
            always: node => {
                if (isNestedNLevels(node, ruleDepth, true)) {
                    context.report({node, messageId: 'always'})
                } else if (lodashContext.isLodashChainStart(node)) {
                    reportOnSingleChain(node.parent.parent)
                }
            },
            never: node => {
                if (lodashContext.isLodashChainStart(node)) {
                    context.report({node, messageId: 'never'})
                }
            },
            implicit: node => {
                if (isNestedNLevels(node, ruleDepth, false)) {
                    context.report({node, messageId: 'always'})
                } else if (lodashContext.isLodashChainStart(node)) {
                    reportOnSingleChain(node.parent.parent)
                }
            }
        }

        const visitors = lodashContext.getImportVisitors()
        visitors.CallExpression = callExpressionVisitors[mode]
        return visitors
    }
}
