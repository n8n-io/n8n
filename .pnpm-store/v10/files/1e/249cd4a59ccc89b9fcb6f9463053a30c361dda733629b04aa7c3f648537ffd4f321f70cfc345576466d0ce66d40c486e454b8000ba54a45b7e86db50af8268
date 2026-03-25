/**
 * @fileoverview Rule to check that iteratees for all collection functions except forEach return a value;
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
            url: getDocsUrl('collection-return')
        }
    },

    create(context) {
        const {getLodashMethodCallExpVisitor, getLodashContext} = require('../util/lodashUtil')
        const {isCollectionMethod} = require('../util/methodDataUtil')
        const {isFunctionDefinitionWithBlock} = require('../util/astUtil')
        const assign = require('lodash/assign')
        const funcInfos = new Map()
        let currFuncInfo = {}
        const lodashContext = getLodashContext(context)
        return assign({
            'CallExpression:exit': getLodashMethodCallExpVisitor(lodashContext, (node, iteratee, {method, version}) => {
                if (isCollectionMethod(version, method) && funcInfos.has(iteratee)) {
                    const {hasReturn} = funcInfos.get(iteratee)
                    if (isFunctionDefinitionWithBlock(iteratee) && !hasReturn && !iteratee.async && !iteratee.generator) {
                        context.report({node, message: `Do not use _.${method} without returning a value`})
                    }
                }
            }),
            ReturnStatement() {
                currFuncInfo.hasReturn = true
            },
            onCodePathStart(codePath, node) {
                currFuncInfo = {
                    upper: currFuncInfo,
                    codePath,
                    hasReturn: false
                }
                funcInfos.set(node, currFuncInfo)
            },
            onCodePathEnd() {
                currFuncInfo = currFuncInfo.upper
            }
        }, lodashContext.getImportVisitors())
    }
}
