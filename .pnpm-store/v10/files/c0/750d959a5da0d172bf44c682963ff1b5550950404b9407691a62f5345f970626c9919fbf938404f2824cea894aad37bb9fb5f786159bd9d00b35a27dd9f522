/**
 * @author Yosuke Ota
 * See LICENSE file in root directory for full license.
 */
'use strict'
const fs = require('fs')
const path = require('path')
const { ReferenceTracker } = require('@eslint-community/eslint-utils')
const utils = require('../utils')

/**
 * @typedef {import('@eslint-community/eslint-utils').TYPES.TraceMap} TraceMap
 * @typedef {import('@eslint-community/eslint-utils').TYPES.TraceKind} TraceKind
 */

/**
 * @param {string} id
 */
function safeRequireResolve(id) {
  try {
    if (fs.statSync(id).isDirectory()) {
      return require.resolve(id)
    }
  } catch (_error) {
    // ignore
  }
  return id
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'disallow asynchronously called restricted methods',
      categories: undefined,
      url: 'https://eslint.vuejs.org/rules/no-restricted-call-after-await.html'
    },
    fixable: null,
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          module: { type: 'string' },
          path: {
            oneOf: [
              { type: 'string' },
              {
                type: 'array',
                items: {
                  type: 'string'
                }
              }
            ]
          },
          message: { type: 'string', minLength: 1 }
        },
        required: ['module'],
        additionalProperties: false
      },
      uniqueItems: true,
      minItems: 0
    },
    messages: {
      // eslint-disable-next-line eslint-plugin/report-message-format
      restricted: '{{message}}'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    /**
     * @typedef {object} SetupScopeData
     * @property {boolean} afterAwait
     * @property {[number,number]} range
     */

    /** @type {Map<ESNode, string>} */
    const restrictedCallNodes = new Map()
    /** @type {Map<FunctionExpression | ArrowFunctionExpression | FunctionDeclaration, SetupScopeData>} */
    const setupScopes = new Map()

    /**x
     * @typedef {object} ScopeStack
     * @property {ScopeStack | null} upper
     * @property {FunctionExpression | ArrowFunctionExpression | FunctionDeclaration} scopeNode
     */
    /** @type {ScopeStack | null} */
    let scopeStack = null

    /** @type {Record<string, string[]> | null} */
    let allLocalImports = null

    /**
     * @param {Program} ast
     */
    function getAllLocalImports(ast) {
      if (!allLocalImports) {
        allLocalImports = {}
        const dir = path.dirname(context.getFilename())
        for (const body of ast.body) {
          if (body.type !== 'ImportDeclaration') {
            continue
          }
          const source = String(body.source.value)
          if (!source.startsWith('.')) {
            continue
          }
          const modulePath = safeRequireResolve(path.join(dir, source))
          const list =
            allLocalImports[modulePath] || (allLocalImports[modulePath] = [])
          list.push(source)
        }
      }

      return allLocalImports
    }

    function getCwd() {
      if (context.getCwd) {
        return context.getCwd()
      }
      return path.resolve('')
    }

    /**
     * @param {string} moduleName
     * @param {Program} ast
     * @returns {string[]}
     */
    function normalizeModules(moduleName, ast) {
      /** @type {string} */
      let modulePath
      if (moduleName.startsWith('.')) {
        modulePath = safeRequireResolve(path.join(getCwd(), moduleName))
      } else if (path.isAbsolute(moduleName)) {
        modulePath = safeRequireResolve(moduleName)
      } else {
        return [moduleName]
      }
      return getAllLocalImports(ast)[modulePath] || []
    }

    return utils.compositingVisitors(
      {
        /** @param {Program} node */
        Program(node) {
          const tracker = new ReferenceTracker(utils.getScope(context, node))

          for (const option of context.options) {
            const modules = normalizeModules(option.module, node)

            for (const module of modules) {
              /** @type {TraceMap} */
              const traceMap = {
                [module]: {
                  [ReferenceTracker.ESM]: true
                }
              }

              /** @type {TraceKind & TraceMap} */
              const mod = traceMap[module]
              let local = mod
              const paths = Array.isArray(option.path)
                ? option.path
                : [option.path || 'default']
              for (const path of paths) {
                local = local[path] || (local[path] = {})
              }
              local[ReferenceTracker.CALL] = true
              const message =
                option.message ||
                `\`${[`import("${module}")`, ...paths].join(
                  '.'
                )}\` is forbidden after an \`await\` expression.`

              for (const { node } of tracker.iterateEsmReferences(traceMap)) {
                restrictedCallNodes.set(node, message)
              }
            }
          }
        }
      },
      utils.defineVueVisitor(context, {
        onSetupFunctionEnter(node) {
          setupScopes.set(node, {
            afterAwait: false,
            range: node.range
          })
        },
        /** @param {FunctionExpression | ArrowFunctionExpression | FunctionDeclaration} node */
        ':function'(node) {
          scopeStack = {
            upper: scopeStack,
            scopeNode: node
          }
        },
        ':function:exit'() {
          scopeStack = scopeStack && scopeStack.upper
        },
        /** @param {AwaitExpression} node */
        AwaitExpression(node) {
          if (!scopeStack) {
            return
          }
          const setupScope = setupScopes.get(scopeStack.scopeNode)
          if (!setupScope || !utils.inRange(setupScope.range, node)) {
            return
          }
          setupScope.afterAwait = true
        },
        /** @param {CallExpression} node */
        CallExpression(node) {
          if (!scopeStack) {
            return
          }
          const setupScope = setupScopes.get(scopeStack.scopeNode)
          if (
            !setupScope ||
            !setupScope.afterAwait ||
            !utils.inRange(setupScope.range, node)
          ) {
            return
          }

          const message = restrictedCallNodes.get(node)
          if (message) {
            context.report({
              node,
              messageId: 'restricted',
              data: { message }
            })
          }
        },
        onSetupFunctionExit(node) {
          setupScopes.delete(node)
        }
      })
    )
  }
}
