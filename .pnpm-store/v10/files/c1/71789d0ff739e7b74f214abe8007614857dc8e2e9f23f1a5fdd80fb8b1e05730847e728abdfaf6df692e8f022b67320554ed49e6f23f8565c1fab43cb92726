/**
 * @fileoverview Rule to check that all uses of `this` inside collection methods are bound
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
            url: getDocsUrl('no-unbound-this')
        }
    },

    create(context) {
        const {getLodashMethodCallExpVisitor, getLodashContext} = require('../util/lodashUtil')
        const {isCollectionMethod} = require('../util/methodDataUtil')
        const {isFunctionExpression} = require('../util/astUtil')
        const assign = require('lodash/assign')
        const funcInfos = new Map()
        let currFuncInfo = {
            thisUses: []
        }
        const lodashContext = getLodashContext(context)
        return assign({
            'CallExpression:exit': getLodashMethodCallExpVisitor(lodashContext, (node, iteratee, {method, version}) => {
                if ((isCollectionMethod(version, method) || /^forEach(Right)?$/.test(method)) && funcInfos.has(iteratee)) {
                    const {thisUses} = funcInfos.get(iteratee)
                    if (isFunctionExpression(iteratee) && thisUses.length) {
                        thisUses.forEach(thisNode => {context.report({node: thisNode, message: 'Do not use `this` without binding in collection methods'})})
                    }
                }
            }),
            ThisExpression(node) {
                currFuncInfo.thisUses.push(node)
            },
            onCodePathStart(codePath, node) {
                currFuncInfo = {
                    upper: currFuncInfo,
                    codePath,
                    thisUses: []
                }
                funcInfos.set(node, currFuncInfo)
            },
            onCodePathEnd() {
                currFuncInfo = currFuncInfo.upper
            }
        }, lodashContext.getImportVisitors())
    }
}
