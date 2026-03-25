/**
 * @author Yosuke Ota
 * See LICENSE file in root directory for full license.
 */
'use strict'

const { findVariable } = require('@eslint-community/eslint-utils')
const { extractRefObjectReferences } = require('../utils/ref-object-references')
const utils = require('../utils')

/**
 * @typedef {import('../utils/ref-object-references').RefObjectReferences} RefObjectReferences
 * @typedef {import('../utils/ref-object-references').RefObjectReferenceForIdentifier} RefObjectReferenceForIdentifier
 */

/**
 * Checks whether the given identifier reference has been initialized with a ref object.
 * @param {RefObjectReferenceForIdentifier | null} data
 * @returns {data is RefObjectReferenceForIdentifier}
 */
function isRefInit(data) {
  const init = data && data.variableDeclarator && data.variableDeclarator.init
  if (!init) {
    return false
  }
  return data.defineChain.includes(/** @type {any} */ (init))
}

/**
 * Get the callee member node from the given CallExpression
 * @param {CallExpression} node CallExpression
 */
function getNameParamNode(node) {
  const nameLiteralNode = node.arguments[0]
  if (nameLiteralNode && utils.isStringLiteral(nameLiteralNode)) {
    const name = utils.getStringLiteralValue(nameLiteralNode)
    if (name != null) {
      return { name, loc: nameLiteralNode.loc }
    }
  }

  // cannot check
  return null
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
      description:
        'disallow use of value wrapped by `ref()` (Composition API) as an operand',
      categories: ['vue3-essential', 'vue2-essential'],
      url: 'https://eslint.vuejs.org/rules/no-ref-as-operand.html'
    },
    fixable: 'code',
    schema: [],
    messages: {
      requireDotValue:
        'Must use `.value` to read or write the value wrapped by `{{method}}()`.'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    /** @type {RefObjectReferences} */
    let refReferences
    const setupContexts = new Map()

    /**
     * Collect identifier id
     * @param {Identifier} node
     * @param {Set<Identifier>} referenceIds
     */
    function collectReferenceIds(node, referenceIds) {
      const variable = findVariable(utils.getScope(context, node), node)
      if (!variable) {
        return
      }
      for (const reference of variable.references) {
        referenceIds.add(reference.identifier)
      }
    }

    /**
     * @param {Identifier} node
     */
    function reportIfRefWrapped(node) {
      const data = refReferences.get(node)
      if (!isRefInit(data)) {
        return
      }
      context.report({
        node,
        messageId: 'requireDotValue',
        data: {
          method: data.method
        },
        fix(fixer) {
          return fixer.insertTextAfter(node, '.value')
        }
      })
    }

    /**
     * @param {CallExpression} node
     */
    function reportWrappedIdentifiers(node) {
      const nodes = node.arguments.filter((node) => node.type === 'Identifier')
      for (const node of nodes) {
        reportIfRefWrapped(node)
      }
    }

    const programNode = context.getSourceCode().ast

    const callVisitor = {
      /**
       * @param {CallExpression} node
       * @param {import('../utils').VueObjectData} [info]
       */
      CallExpression(node, info) {
        const nameWithLoc = getNameParamNode(node)
        if (!nameWithLoc) {
          // cannot check
          return
        }

        // verify setup context
        const setupContext = setupContexts.get(info ? info.node : programNode)
        if (!setupContext) {
          return
        }

        const { contextReferenceIds, emitReferenceIds } = setupContext
        if (
          node.callee.type === 'Identifier' &&
          emitReferenceIds.has(node.callee)
        ) {
          // verify setup(props,{emit}) {emit()}
          reportWrappedIdentifiers(node)
        } else {
          const emit = getCalleeMemberNode(node)
          if (
            emit &&
            emit.name === 'emit' &&
            emit.member.object.type === 'Identifier' &&
            contextReferenceIds.has(emit.member.object)
          ) {
            // verify setup(props,context) {context.emit()}
            reportWrappedIdentifiers(node)
          }
        }
      }
    }

    return utils.compositingVisitors(
      {
        Program() {
          refReferences = extractRefObjectReferences(context)
        },
        // if (refValue)
        /** @param {Identifier} node */
        'IfStatement>Identifier'(node) {
          reportIfRefWrapped(node)
        },
        // switch (refValue)
        /** @param {Identifier} node */
        'SwitchStatement>Identifier'(node) {
          reportIfRefWrapped(node)
        },
        // -refValue, +refValue, !refValue, ~refValue, typeof refValue
        /** @param {Identifier} node */
        'UnaryExpression>Identifier'(node) {
          reportIfRefWrapped(node)
        },
        // refValue++, refValue--
        /** @param {Identifier} node */
        'UpdateExpression>Identifier'(node) {
          reportIfRefWrapped(node)
        },
        // refValue+1, refValue-1
        /** @param {Identifier} node */
        'BinaryExpression>Identifier'(node) {
          reportIfRefWrapped(node)
        },
        // refValue+=1, refValue-=1, foo+=refValue, foo-=refValue
        /** @param {Identifier & {parent: AssignmentExpression}} node */
        'AssignmentExpression>Identifier'(node) {
          if (node.parent.operator === '=' && node.parent.left !== node) {
            return
          }
          reportIfRefWrapped(node)
        },
        // refValue || other, refValue && other. ignore: other || refValue
        /** @param {Identifier & {parent: LogicalExpression}} node */
        'LogicalExpression>Identifier'(node) {
          if (node.parent.left !== node) {
            return
          }
          // Report only constants.
          const data = refReferences.get(node)
          if (
            !data ||
            !data.variableDeclaration ||
            data.variableDeclaration.kind !== 'const'
          ) {
            return
          }
          reportIfRefWrapped(node)
        },
        // refValue ? x : y
        /** @param {Identifier & {parent: ConditionalExpression}} node */
        'ConditionalExpression>Identifier'(node) {
          if (node.parent.test !== node) {
            return
          }
          reportIfRefWrapped(node)
        },
        // `${refValue}`
        /** @param {Identifier} node */
        ':not(TaggedTemplateExpression)>TemplateLiteral>Identifier'(node) {
          reportIfRefWrapped(node)
        },
        // refValue.x
        /** @param {Identifier & {parent: MemberExpression}} node */
        'MemberExpression>Identifier'(node) {
          if (node.parent.object !== node) {
            return
          }
          const name = utils.getStaticPropertyName(node.parent)
          if (
            name === 'value' ||
            name == null ||
            // WritableComputedRef
            name === 'effect'
          ) {
            return
          }
          reportIfRefWrapped(node)
        }
      },
      utils.defineScriptSetupVisitor(context, {
        onDefineEmitsEnter(node) {
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

          // const emit = defineEmits()
          const emitReferenceIds = new Set()
          collectReferenceIds(emitParam, emitReferenceIds)

          setupContexts.set(programNode, {
            contextReferenceIds: new Set(),
            emitReferenceIds
          })
        },
        ...callVisitor
      }),
      utils.defineVueVisitor(context, {
        onSetupFunctionEnter(node, { node: vueNode }) {
          const contextParam = utils.skipDefaultParamValue(node.params[1])
          if (!contextParam) {
            // no arguments
            return
          }
          if (
            contextParam.type === 'RestElement' ||
            contextParam.type === 'ArrayPattern'
          ) {
            // cannot check
            return
          }

          const contextReferenceIds = new Set()
          const emitReferenceIds = new Set()
          if (contextParam.type === 'ObjectPattern') {
            const emitProperty = utils.findAssignmentProperty(
              contextParam,
              'emit'
            )
            if (!emitProperty || emitProperty.value.type !== 'Identifier') {
              return
            }

            // `setup(props, {emit})`
            collectReferenceIds(emitProperty.value, emitReferenceIds)
          } else {
            // `setup(props, context)`
            collectReferenceIds(contextParam, contextReferenceIds)
          }
          setupContexts.set(vueNode, {
            contextReferenceIds,
            emitReferenceIds
          })
        },
        ...callVisitor,
        onVueObjectExit(node) {
          setupContexts.delete(node)
        }
      })
    )
  }
}
