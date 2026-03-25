/**
 * @fileoverview Prevents duplication of field names.
 * @author Armano
 */
'use strict'

const { findVariable } = require('@eslint-community/eslint-utils')
const utils = require('../utils')

/**
 * @typedef {import('../utils').GroupName} GroupName
 * @typedef {import('eslint').Scope.Variable} Variable
 * @typedef {import('../utils').ComponentProp} ComponentProp
 */

/** @type {GroupName[]} */
const GROUP_NAMES = ['props', 'computed', 'data', 'methods', 'setup']

/**
 * Gets the props pattern node from given `defineProps()` node
 * @param {CallExpression} node
 * @returns {Pattern|null}
 */
function getPropsPattern(node) {
  let target = node
  if (
    target.parent &&
    target.parent.type === 'CallExpression' &&
    target.parent.arguments[0] === target &&
    target.parent.callee.type === 'Identifier' &&
    target.parent.callee.name === 'withDefaults'
  ) {
    target = target.parent
  }

  if (
    !target.parent ||
    target.parent.type !== 'VariableDeclarator' ||
    target.parent.init !== target
  ) {
    return null
  }
  return target.parent.id
}

/**
 * Checks whether the initialization of the given variable declarator node contains one of the references.
 * @param {VariableDeclarator} node
 * @param {ESNode[]} references
 */
function isInsideInitializer(node, references) {
  const init = node.init
  if (!init) {
    return false
  }
  return references.some(
    (id) => init.range[0] <= id.range[0] && id.range[1] <= init.range[1]
  )
}

/**
 * Collects all renamed props from a pattern
 * @param {Pattern | null} pattern - The destructuring pattern
 * @returns {Set<string>} - Set of prop names that have been renamed
 */
function collectRenamedProps(pattern) {
  const renamedProps = new Set()

  if (!pattern || pattern.type !== 'ObjectPattern') {
    return renamedProps
  }

  for (const prop of pattern.properties) {
    if (prop.type !== 'Property') continue

    if (
      prop.key.type === 'Identifier' &&
      prop.value.type === 'Identifier' &&
      prop.key.name !== prop.value.name
    ) {
      renamedProps.add(prop.key.name)
    }
  }

  return renamedProps
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'disallow duplication of field names',
      categories: ['vue3-essential', 'vue2-essential'],
      url: 'https://eslint.vuejs.org/rules/no-dupe-keys.html'
    },
    fixable: null,
    schema: [
      {
        type: 'object',
        properties: {
          groups: {
            type: 'array'
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      duplicateKey:
        "Duplicate key '{{name}}'. May cause name collision in script or template tag."
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    const options = context.options[0] || {}
    const groups = new Set([...GROUP_NAMES, ...(options.groups || [])])

    return utils.compositingVisitors(
      utils.executeOnVue(context, (obj) => {
        const properties = utils.iterateProperties(obj, groups)
        /** @type {Set<string>} */
        const usedNames = new Set()
        for (const o of properties) {
          if (usedNames.has(o.name)) {
            context.report({
              node: o.node,
              messageId: 'duplicateKey',
              data: {
                name: o.name
              }
            })
          }

          usedNames.add(o.name)
        }
      }),
      utils.defineScriptSetupVisitor(context, {
        onDefinePropsEnter(node, props) {
          const propsNode = getPropsPattern(node)
          const propReferences = [
            ...(propsNode ? extractReferences(propsNode) : []),
            node
          ]

          const renamedProps = collectRenamedProps(propsNode)

          for (const prop of props) {
            if (!prop.propName) continue

            if (renamedProps.has(prop.propName)) {
              continue
            }

            const variable = findVariable(
              utils.getScope(context, node),
              prop.propName
            )
            if (!variable || variable.defs.length === 0) continue

            if (
              variable.defs.some((def) => {
                if (def.type !== 'Variable') return false
                return isInsideInitializer(def.node, propReferences)
              })
            ) {
              continue
            }

            context.report({
              node: variable.defs[0].node,
              messageId: 'duplicateKey',
              data: {
                name: prop.propName
              }
            })
          }
        }
      })
    )

    /**
     * Extracts references from the given node.
     * @param {Pattern} node
     * @returns {Identifier[]} References
     */
    function extractReferences(node) {
      if (node.type === 'Identifier') {
        const variable = findVariable(utils.getScope(context, node), node)
        if (!variable) {
          return []
        }
        return variable.references.map((ref) => ref.identifier)
      }
      if (node.type === 'ObjectPattern') {
        return node.properties.flatMap((prop) =>
          extractReferences(prop.type === 'Property' ? prop.value : prop)
        )
      }
      if (node.type === 'AssignmentPattern') {
        return extractReferences(node.left)
      }
      if (node.type === 'RestElement') {
        return extractReferences(node.argument)
      }
      return []
    }
  }
}
