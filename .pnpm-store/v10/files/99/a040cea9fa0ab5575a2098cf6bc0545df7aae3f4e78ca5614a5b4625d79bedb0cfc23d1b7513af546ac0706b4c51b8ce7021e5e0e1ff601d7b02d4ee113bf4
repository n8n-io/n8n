/**
 * @author ItMaga
 * See LICENSE file in root directory for full license.
 */
'use strict'

const { findVariable } = require('@eslint-community/eslint-utils')
const utils = require('../utils')

/**
 * @typedef {import('../utils').ComponentEmit} ComponentEmit
 * @typedef {import('../utils').VueObjectData} VueObjectData
 */

/**
 * @typedef {object} SetupContext
 * @property {Set<Identifier>} contextReferenceIds
 * @property {Set<Identifier>} emitReferenceIds
 */

/**
 * @typedef {object} NameWithLoc
 * @property {string} name
 * @property {SourceLocation} loc
 * @property {Range} range
 */

/**
 * Get the name param node from the given CallExpression
 * @param {CallExpression} node CallExpression
 * @returns {NameWithLoc | null}
 */
function getNameParamNode(node) {
  const nameLiteralNode = node.arguments[0]
  if (nameLiteralNode && utils.isStringLiteral(nameLiteralNode)) {
    const name = utils.getStringLiteralValue(nameLiteralNode)
    if (name != null) {
      return { name, loc: nameLiteralNode.loc, range: nameLiteralNode.range }
    }
  }

  return null
}

/**
 * Check if the given node is a reference of setup context
 * @param {Expression | Super | SpreadElement} value
 * @param {SetupContext} setupContext
 * @returns {boolean}
 * */
function hasReferenceId(value, setupContext) {
  const { contextReferenceIds, emitReferenceIds } = setupContext
  return (
    value.type === 'Identifier' &&
    (emitReferenceIds.has(value) || contextReferenceIds.has(value))
  )
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'disallow unused emit declarations',
      categories: undefined,
      url: 'https://eslint.vuejs.org/rules/no-unused-emit-declarations.html'
    },
    fixable: null,
    schema: [],
    messages: {
      unused: '`{{name}}` is defined as emit but never used.'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    /** @type {Map<string, ComponentEmit>} */
    const emitDeclarations = new Map()
    /** @type {Map<string, Expression>} */
    const emitCalls = new Map()
    /** @type {Map<ObjectExpression | Program, SetupContext>} */
    const setupContexts = new Map()
    const programNode = context.getSourceCode().ast
    let emitParamName = ''

    /**
     * @param {CallExpression} node
     * */
    function addEmitCall(node) {
      const nameParamNode = getNameParamNode(node)
      if (nameParamNode) {
        emitCalls.set(nameParamNode.name, node)
      }
    }
    function clearEmits() {
      emitCalls.clear()
      emitDeclarations.clear()
    }

    /**
     * @param {Expression | SpreadElement} expression
     * @param {SetupContext} setupContext
     * @returns {boolean}
     * */
    function checkExpressionReference(expression, setupContext) {
      if (expression.type === 'MemberExpression') {
        const memObject = utils.skipChainExpression(expression.object)
        if (hasReferenceId(memObject, setupContext)) {
          clearEmits()
          return true
        }
      }
      if (hasReferenceId(expression, setupContext)) {
        clearEmits()
        return true
      }
      return false
    }

    /**
     *
     * @param {Array<Expression | SpreadElement>} args
     * @param {SetupContext} setupContext
     * @returns {boolean}
     */
    function verifyArgumentsReferences(args, setupContext) {
      for (const argument of args) {
        if (argument.type === 'ObjectExpression') {
          for (const property of argument.properties) {
            if (
              property.type === 'Property' &&
              checkExpressionReference(property.value, setupContext)
            ) {
              return true
            }
          }
        }

        if (argument.type === 'ArrayExpression') {
          for (const element of argument.elements) {
            if (!element) {
              continue
            }
            if (checkExpressionReference(element, setupContext)) {
              return true
            }
          }
        }

        if (checkExpressionReference(argument, setupContext)) {
          return true
        }
      }
      return false
    }

    /**
     * @param {Expression | Super} callee
     * @param {Set<Identifier>} referenceIds
     * @param {CallExpression} node
     * */
    function addEmitCallByReference(callee, referenceIds, node) {
      if (callee.type === 'Identifier' && referenceIds.has(callee)) {
        addEmitCall(node)
      }
    }

    const callVisitor = {
      /**
       * @param {CallExpression} node
       * @param {VueObjectData} [info]
       */
      CallExpression(node, info) {
        const callee = utils.skipChainExpression(node.callee)

        let emit = null
        if (callee.type === 'MemberExpression') {
          const name = utils.getStaticPropertyName(callee)
          if (name === 'emit' || name === '$emit') {
            emit = { name, member: callee }
          }
        }

        const vueDefineNode = info ? info.node : programNode
        const setupContext = setupContexts.get(vueDefineNode)
        if (setupContext) {
          if (
            callee.parent.type === 'CallExpression' &&
            callee.parent.arguments &&
            verifyArgumentsReferences(callee.parent.arguments, setupContext)
          ) {
            // skip if the emit passed as argument
            return
          }

          const { contextReferenceIds, emitReferenceIds } = setupContext

          // verify setup(props,{emit}) {emit()}
          addEmitCallByReference(callee, emitReferenceIds, node)
          if (emit && emit.name === 'emit') {
            const memObject = utils.skipChainExpression(emit.member.object)
            // verify setup(props,context) {context.emit()}
            addEmitCallByReference(memObject, contextReferenceIds, node)
          }
        }

        if (emit && emit.name === '$emit') {
          const memObject = utils.skipChainExpression(emit.member.object)
          // verify this.$emit()
          if (utils.isThis(memObject, context)) {
            addEmitCall(node)
          }
        }

        // verify $emit() and defineEmits variable in template
        if (
          callee.type === 'Identifier' &&
          (callee.name === '$emit' || callee.name === emitParamName)
        ) {
          addEmitCall(node)
        }
      }
    }

    return utils.compositingVisitors(
      utils.defineTemplateBodyVisitor(context, callVisitor),
      utils.defineVueVisitor(context, {
        ...callVisitor,
        onVueObjectEnter(node) {
          for (const emit of utils.getComponentEmitsFromOptions(node)) {
            if (emit.emitName) {
              emitDeclarations.set(emit.emitName, emit)
            }
          }
        },
        onSetupFunctionEnter(node, { node: vueNode }) {
          const contextParam = node.params[1]
          if (
            !contextParam ||
            contextParam.type === 'RestElement' ||
            contextParam.type === 'ArrayPattern'
          ) {
            // no arguments or cannot check
            return
          }

          /** @type {Set<Identifier>} */
          const contextReferenceIds = new Set()
          /** @type {Set<Identifier>} */
          const emitReferenceIds = new Set()
          if (contextParam.type === 'ObjectPattern') {
            const emitProperty = utils.findAssignmentProperty(
              contextParam,
              'emit'
            )
            if (!emitProperty) {
              return
            }
            const emitParam = emitProperty.value
            // `setup(props, {emit})`
            const variable =
              emitParam.type === 'Identifier'
                ? findVariable(utils.getScope(context, emitParam), emitParam)
                : null
            if (!variable) {
              return
            }
            for (const reference of variable.references) {
              emitReferenceIds.add(reference.identifier)
            }
          } else if (contextParam.type === 'Identifier') {
            // `setup(props, context)`
            const variable = findVariable(
              utils.getScope(context, contextParam),
              contextParam
            )
            for (const reference of variable.references) {
              contextReferenceIds.add(reference.identifier)
            }
          }

          setupContexts.set(vueNode, {
            contextReferenceIds,
            emitReferenceIds
          })
        }
      }),
      utils.defineScriptSetupVisitor(context, {
        onDefineEmitsEnter(node, emits) {
          for (const emit of emits) {
            if (emit.emitName) {
              emitDeclarations.set(emit.emitName, emit)
            }
          }

          if (
            !node.parent ||
            node.parent.type !== 'VariableDeclarator' ||
            node.parent.init !== node
          ) {
            return
          }

          const emitParam = node.parent.id
          if (emitParam.type !== 'Identifier') {
            return
          }

          emitParamName = emitParam.name
          const variable = findVariable(
            utils.getScope(context, emitParam),
            emitParam
          )
          if (!variable) {
            return
          }
          /** @type {Set<Identifier>} */
          const emitReferenceIds = new Set()
          for (const reference of variable.references) {
            emitReferenceIds.add(reference.identifier)
          }
          setupContexts.set(programNode, {
            contextReferenceIds: new Set(),
            emitReferenceIds
          })
        },
        onDefineModelEnter(node, model) {
          if (
            node.parent &&
            node.parent.type === 'VariableDeclarator' &&
            node.parent.init === node
          ) {
            // If the return value of defineModel() is stored in a variable, we can mark the 'update:modelName' event as used if that that variable is used.
            // If that variable is unused, it will already be reported by `no-unused-var` rule.
            emitCalls.set(`update:${model.name.modelName}`, node)
          }
        },
        ...callVisitor
      }),
      {
        'Program:exit'() {
          for (const [name, emit] of emitDeclarations) {
            if (!emitCalls.has(name) && emit.node) {
              context.report({
                node: emit.node,
                loc: emit.node.loc,
                messageId: 'unused',
                data: { name }
              })
            }
          }
        }
      }
    )
  }
}
