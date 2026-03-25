/**
 * @fileoverview Require `expose` in Vue components
 * @author Yosuke Ota <https://github.com/ota-meshi>
 */
'use strict'

const {
  findVariable,
  isOpeningBraceToken,
  isClosingBraceToken
} = require('@eslint-community/eslint-utils')
const utils = require('../utils')
const { getVueComponentDefinitionType } = require('../utils')

const FIX_EXPOSE_BEFORE_OPTIONS = new Set([
  'name',
  'components',
  'directives',
  'extends',
  'mixins',
  'provide',
  'inject',
  'inheritAttrs',
  'props',
  'emits'
])

/**
 * @param {Property | SpreadElement} node
 * @returns {node is ObjectExpressionProperty}
 */
function isExposeProperty(node) {
  return (
    node.type === 'Property' &&
    utils.getStaticPropertyName(node) === 'expose' &&
    !node.computed
  )
}

/**
 * Get the callee member node from the given CallExpression
 * @param {CallExpression} node CallExpression
 */
function getCalleeMemberNode(node) {
  const callee = utils.skipChainExpression(node.callee)

  if (callee.type === 'MemberExpression') {
    const name = utils.getStaticPropertyName(callee)
    if (name) {
      return { name, member: callee }
    }
  }
  return null
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'require declare public properties using `expose`',
      categories: undefined,
      url: 'https://eslint.vuejs.org/rules/require-expose.html'
    },
    fixable: null,
    hasSuggestions: true,
    schema: [],
    messages: {
      requireExpose:
        'The public properties of the component must be explicitly declared using `expose`. If the component does not have public properties, declare it empty.',
      addExposeOptionForEmpty:
        'Add the `expose` option to give an empty array.',
      addExposeOptionForAll:
        'Add the `expose` option to declare all properties.'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    if (utils.isScriptSetup(context)) {
      return {}
    }

    /**
     * @typedef {object} SetupContext
     * @property {Set<Identifier>} exposeReferenceIds
     * @property {Set<Identifier>} contextReferenceIds
     */

    /** @type {Map<ObjectExpression, SetupContext>} */
    const setupContexts = new Map()
    /** @type {Set<ObjectExpression>} */
    const calledExpose = new Set()

    /**
     * @typedef {FunctionExpression | FunctionDeclaration | ArrowFunctionExpression} FunctionNode
     */
    /**
     * @typedef {object} ScopeStack
     * @property {ScopeStack | null} upper
     * @property {FunctionNode} functionNode
     * @property {boolean} returnFunction
     */
    /**
     * @type {ScopeStack | null}
     */
    let scopeStack = null
    /** @type {Map<FunctionNode, ObjectExpression>} */
    const setupFunctions = new Map()
    /** @type {Set<ObjectExpression>} */
    const setupRender = new Set()

    /**
     * @param {Expression} node
     * @returns {boolean}
     */
    function isFunction(node) {
      if (
        node.type === 'ArrowFunctionExpression' ||
        node.type === 'FunctionExpression'
      ) {
        return true
      }
      if (node.type === 'Identifier') {
        const variable = findVariable(utils.getScope(context, node), node)
        if (variable) {
          for (const def of variable.defs) {
            if (def.type === 'FunctionName') {
              return true
            }
            if (def.type === 'Variable' && def.node.init) {
              return isFunction(def.node.init)
            }
          }
        }
      }
      return false
    }
    return utils.defineVueVisitor(context, {
      onSetupFunctionEnter(node, { node: vueNode }) {
        setupFunctions.set(node, vueNode)
        const contextParam = node.params[1]
        if (!contextParam) {
          // no arguments
          return
        }
        if (contextParam.type === 'RestElement') {
          // cannot check
          return
        }
        if (contextParam.type === 'ArrayPattern') {
          // cannot check
          return
        }
        /** @type {Set<Identifier>} */
        const contextReferenceIds = new Set()
        /** @type {Set<Identifier>} */
        const exposeReferenceIds = new Set()
        if (contextParam.type === 'ObjectPattern') {
          const exposeProperty = utils.findAssignmentProperty(
            contextParam,
            'expose'
          )
          if (!exposeProperty) {
            return
          }
          const exposeParam = exposeProperty.value
          // `setup(props, {emit})`
          const variable =
            exposeParam.type === 'Identifier'
              ? findVariable(utils.getScope(context, exposeParam), exposeParam)
              : null
          if (!variable) {
            return
          }
          for (const reference of variable.references) {
            if (!reference.isRead()) {
              continue
            }
            exposeReferenceIds.add(reference.identifier)
          }
        } else if (contextParam.type === 'Identifier') {
          // `setup(props, context)`
          const variable = findVariable(
            utils.getScope(context, contextParam),
            contextParam
          )
          if (!variable) {
            return
          }
          for (const reference of variable.references) {
            if (!reference.isRead()) {
              continue
            }
            contextReferenceIds.add(reference.identifier)
          }
        }
        setupContexts.set(vueNode, {
          contextReferenceIds,
          exposeReferenceIds
        })
      },
      CallExpression(node, { node: vueNode }) {
        if (calledExpose.has(vueNode)) {
          // already called
          return
        }
        // find setup context
        const setupContext = setupContexts.get(vueNode)
        if (setupContext) {
          const { contextReferenceIds, exposeReferenceIds } = setupContext
          if (
            node.callee.type === 'Identifier' &&
            exposeReferenceIds.has(node.callee)
          ) {
            // setup(props,{expose}) {expose()}
            calledExpose.add(vueNode)
          } else {
            const expose = getCalleeMemberNode(node)
            if (
              expose &&
              expose.name === 'expose' &&
              expose.member.object.type === 'Identifier' &&
              contextReferenceIds.has(expose.member.object)
            ) {
              // setup(props,context) {context.emit()}
              calledExpose.add(vueNode)
            }
          }
        }
      },
      /** @param {FunctionNode} node */
      ':function'(node) {
        scopeStack = {
          upper: scopeStack,
          functionNode: node,
          returnFunction: false
        }

        if (
          node.type === 'ArrowFunctionExpression' &&
          node.expression &&
          isFunction(node.body)
        ) {
          scopeStack.returnFunction = true
        }
      },
      ReturnStatement(node) {
        if (!scopeStack) {
          return
        }
        if (
          !scopeStack.returnFunction &&
          node.argument &&
          isFunction(node.argument)
        ) {
          scopeStack.returnFunction = true
        }
      },
      ':function:exit'(node) {
        if (scopeStack && scopeStack.returnFunction) {
          const vueNode = setupFunctions.get(node)
          if (vueNode) {
            setupRender.add(vueNode)
          }
        }
        scopeStack = scopeStack && scopeStack.upper
      },
      onVueObjectExit(component, { type }) {
        if (calledExpose.has(component)) {
          // `expose` function is called
          return
        }
        if (setupRender.has(component)) {
          // `setup` function is render function
          return
        }
        if (type === 'definition') {
          const defType = getVueComponentDefinitionType(component)
          if (defType === 'mixin') {
            return
          }
        }

        if (component.properties.some(isExposeProperty)) {
          // has `expose`
          return
        }

        context.report({
          node: component,
          messageId: 'requireExpose',
          suggest: buildSuggest(component, context)
        })
      }
    })
  }
}

/**
 * @param {ObjectExpression} object
 * @param {RuleContext} context
 * @returns {Rule.SuggestionReportDescriptor[]}
 */
function buildSuggest(object, context) {
  const propertyNodes = object.properties.filter(utils.isProperty)

  const sourceCode = context.getSourceCode()
  const beforeOptionNode = propertyNodes.find((p) =>
    FIX_EXPOSE_BEFORE_OPTIONS.has(utils.getStaticPropertyName(p) || '')
  )
  const allProps = [
    ...new Set(
      utils.iterateProperties(
        object,
        new Set(['props', 'data', 'computed', 'setup', 'methods', 'watch'])
      )
    )
  ]
  return [
    {
      messageId: 'addExposeOptionForEmpty',
      fix: buildFix('expose: []')
    },
    ...(allProps.length > 0
      ? [
          {
            messageId: 'addExposeOptionForAll',
            fix: buildFix(
              `expose: [${allProps
                .map((p) => JSON.stringify(p.name))
                .join(', ')}]`
            )
          }
        ]
      : [])
  ]

  /**
   * @param {string} text
   */
  function buildFix(text) {
    /**
     * @param {RuleFixer} fixer
     */
    return (fixer) => {
      if (beforeOptionNode) {
        return fixer.insertTextAfter(beforeOptionNode, `,\n${text}`)
      } else if (object.properties.length > 0) {
        const after = propertyNodes[0] || object.properties[0]
        return fixer.insertTextAfter(
          sourceCode.getTokenBefore(after),
          `\n${text},`
        )
      } else {
        const objectLeftBrace = /** @type {Token} */ (
          sourceCode.getFirstToken(object, isOpeningBraceToken)
        )
        const objectRightBrace = /** @type {Token} */ (
          sourceCode.getLastToken(object, isClosingBraceToken)
        )
        return fixer.insertTextAfter(
          objectLeftBrace,
          `\n${text}${
            objectLeftBrace.loc.end.line < objectRightBrace.loc.start.line
              ? ''
              : '\n'
          }`
        )
      }
    }
  }
}
