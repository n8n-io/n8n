/**
 * @author Wayne Zhang
 * See LICENSE file in root directory for full license.
 */
'use strict'

const utils = require('../utils')
const { ReferenceTracker } = require('@eslint-community/eslint-utils')

/**
 * @typedef {import('@eslint-community/eslint-utils').TYPES.TraceMap} TraceMap
 */

/** @type {TraceMap} */
const deletedImportApisMap = {
  set: {
    [ReferenceTracker.CALL]: true
  },
  del: {
    [ReferenceTracker.CALL]: true
  }
}
const deprecatedApis = new Set(['set', 'delete'])
const deprecatedDollarApis = new Set(['$set', '$delete'])

/**
 * @param {Expression|Super} node
 */
function isVue(node) {
  return node.type === 'Identifier' && node.name === 'Vue'
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'disallow using deprecated `$delete` and `$set` (in Vue.js 3.0.0+)',
      categories: ['vue3-essential'],
      url: 'https://eslint.vuejs.org/rules/no-deprecated-delete-set.html'
    },
    fixable: null,
    schema: [],
    messages: {
      deprecated: 'The `$delete`, `$set` is deprecated.'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    /**
     * @param {Identifier} identifier
     * @param {RuleContext} context
     * @returns {CallExpression|undefined}
     */
    function getVueDeprecatedCallExpression(identifier, context) {
      // Instance API: this.$set()
      if (
        deprecatedDollarApis.has(identifier.name) &&
        identifier.parent.type === 'MemberExpression' &&
        utils.isThis(identifier.parent.object, context) &&
        identifier.parent.parent.type === 'CallExpression' &&
        identifier.parent.parent.callee === identifier.parent
      ) {
        return identifier.parent.parent
      }

      // Vue 2 Global API: Vue.set()
      if (
        deprecatedApis.has(identifier.name) &&
        identifier.parent.type === 'MemberExpression' &&
        isVue(identifier.parent.object) &&
        identifier.parent.parent.type === 'CallExpression' &&
        identifier.parent.parent.callee === identifier.parent
      ) {
        return identifier.parent.parent
      }

      return undefined
    }

    const nodeVisitor = {
      /** @param {Identifier} node */
      Identifier(node) {
        const callExpression = getVueDeprecatedCallExpression(node, context)
        if (!callExpression) {
          return
        }

        context.report({
          node,
          messageId: 'deprecated'
        })
      }
    }

    return utils.compositingVisitors(
      utils.defineVueVisitor(context, nodeVisitor),
      utils.defineScriptSetupVisitor(context, nodeVisitor),
      {
        /** @param {Program} node */
        Program(node) {
          const tracker = new ReferenceTracker(utils.getScope(context, node))

          // import { set } from 'vue'; set()
          const esmTraceMap = {
            vue: {
              [ReferenceTracker.ESM]: true,
              ...deletedImportApisMap
            }
          }
          // const { set } = require('vue'); set()
          const cjsTraceMap = {
            vue: {
              ...deletedImportApisMap
            }
          }

          for (const { node } of [
            ...tracker.iterateEsmReferences(esmTraceMap),
            ...tracker.iterateCjsReferences(cjsTraceMap)
          ]) {
            const refNode = /** @type {CallExpression} */ (node)
            context.report({
              node: refNode.callee,
              messageId: 'deprecated'
            })
          }
        }
      }
    )
  }
}
