/**
 * @fileoverview Enforces props default values to be valid.
 * @author Armano
 */
'use strict'
const utils = require('../utils')
const { capitalize } = require('../utils/casing')

/**
 * @typedef {import('../utils').ComponentProp} ComponentProp
 * @typedef {import('../utils').ComponentObjectProp} ComponentObjectProp
 * @typedef {import('../utils').ComponentArrayProp} ComponentArrayProp
 * @typedef {import('../utils').ComponentTypeProp} ComponentTypeProp
 * @typedef {import('../utils').ComponentInferTypeProp} ComponentInferTypeProp
 * @typedef {import('../utils').ComponentUnknownProp} ComponentUnknownProp
 * @typedef {import('../utils').VueObjectData} VueObjectData
 */

const NATIVE_TYPES = new Set([
  'String',
  'Number',
  'Boolean',
  'Function',
  'Object',
  'Array',
  'Symbol',
  'BigInt'
])

const FUNCTION_VALUE_TYPES = new Set(['Function', 'Object', 'Array'])

/**
 * @param {ObjectExpression} obj
 * @param {string} name
 * @returns {Property | null}
 */
function getPropertyNode(obj, name) {
  for (const p of obj.properties) {
    if (
      p.type === 'Property' &&
      !p.computed &&
      p.key.type === 'Identifier' &&
      p.key.name === name
    ) {
      return p
    }
  }
  return null
}

/**
 * @param {Expression} targetNode
 * @returns {string[]}
 */
function getTypes(targetNode) {
  const node = utils.skipTSAsExpression(targetNode)
  if (node.type === 'Identifier') {
    return [node.name]
  } else if (node.type === 'ArrayExpression') {
    return node.elements
      .filter(
        /**
         * @param {Expression | SpreadElement | null} item
         * @returns {item is Identifier}
         */
        (item) => item != null && item.type === 'Identifier'
      )
      .map((item) => item.name)
  }
  return []
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'enforce props default values to be valid',
      categories: ['vue3-essential', 'vue2-essential'],
      url: 'https://eslint.vuejs.org/rules/require-valid-default-prop.html'
    },
    fixable: null,
    schema: [],
    messages: {
      invalidType:
        "Type of the default value for '{{name}}' prop must be a {{types}}."
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    /**
     * @typedef {object} StandardValueType
     * @property {string} type
     * @property {false} function
     */
    /**
     * @typedef {object} FunctionExprValueType
     * @property {'Function'} type
     * @property {true} function
     * @property {true} expression
     * @property {Expression} functionBody
     * @property {string | null} returnType
     */
    /**
     * @typedef {object} FunctionValueType
     * @property {'Function'} type
     * @property {true} function
     * @property {false} expression
     * @property {BlockStatement} functionBody
     * @property {ReturnType[]} returnTypes
     */
    /**
     * @typedef { ComponentObjectProp & { value: ObjectExpression } } ComponentObjectDefineProp
     * @typedef { { type: string, node: Expression } } ReturnType
     */
    /**
     * @typedef {object} PropDefaultFunctionContext
     * @property {ComponentObjectProp | ComponentTypeProp | ComponentInferTypeProp} prop
     * @property {Set<string>} types
     * @property {FunctionValueType} default
     */

    /**
     * @type {Map<ObjectExpression, PropDefaultFunctionContext[]>}
     */
    const vueObjectPropsContexts = new Map()
    /**
     * @type { {node: CallExpression, props:PropDefaultFunctionContext[]}[] }
     */
    const scriptSetupPropsContexts = []

    /**
     * @typedef {object} ScopeStack
     * @property {ScopeStack | null} upper
     * @property {BlockStatement | Expression} body
     * @property {null | ReturnType[]} [returnTypes]
     */
    /**
     * @type {ScopeStack | null}
     */
    let scopeStack = null

    function onFunctionExit() {
      scopeStack = scopeStack && scopeStack.upper
    }

    /**
     * @param {Expression} targetNode
     * @returns { StandardValueType | FunctionExprValueType | FunctionValueType | null }
     */
    function getValueType(targetNode) {
      const node = utils.skipChainExpression(targetNode)
      switch (node.type) {
        case 'CallExpression': {
          // Symbol(), Number() ...
          if (
            node.callee.type === 'Identifier' &&
            NATIVE_TYPES.has(node.callee.name)
          ) {
            return {
              function: false,
              type: node.callee.name
            }
          }
          break
        }
        case 'TemplateLiteral': {
          // String
          return {
            function: false,
            type: 'String'
          }
        }
        case 'Literal': {
          // String, Boolean, Number
          if (node.value === null && !node.bigint) return null
          const type = node.bigint ? 'BigInt' : capitalize(typeof node.value)
          if (NATIVE_TYPES.has(type)) {
            return {
              function: false,
              type
            }
          }
          break
        }
        case 'ArrayExpression': {
          // Array
          return {
            function: false,
            type: 'Array'
          }
        }
        case 'ObjectExpression': {
          // Object
          return {
            function: false,
            type: 'Object'
          }
        }
        case 'FunctionExpression': {
          return {
            function: true,
            expression: false,
            type: 'Function',
            functionBody: node.body,
            returnTypes: []
          }
        }
        case 'ArrowFunctionExpression': {
          if (node.expression) {
            const valueType = getValueType(node.body)
            return {
              function: true,
              expression: true,
              type: 'Function',
              functionBody: node.body,
              returnType: valueType ? valueType.type : null
            }
          }

          return {
            function: true,
            expression: false,
            type: 'Function',
            functionBody: node.body,
            returnTypes: []
          }
        }
      }
      return null
    }

    /**
     * @param {Expression} node
     * @param {ComponentObjectProp | ComponentTypeProp | ComponentInferTypeProp} prop
     * @param {Iterable<string>} expectedTypeNames
     */
    function report(node, prop, expectedTypeNames) {
      const propName =
        prop.propName == null
          ? `[${context.getSourceCode().getText(prop.node.key)}]`
          : prop.propName
      context.report({
        node,
        messageId: 'invalidType',
        data: {
          name: propName,
          types: [...expectedTypeNames].join(' or ').toLowerCase()
        }
      })
    }

    /**
     * @typedef {object} DefaultDefine
     * @property {Expression} expression
     * @property {'assignment'|'withDefaults'|'defaultProperty'} src
     */
    /**
     * @param {(ComponentObjectProp | ComponentTypeProp | ComponentInferTypeProp)[]} props
     * @param {(propName: string) => Iterable<DefaultDefine>} otherDefaultProvider
     */
    function processPropDefs(props, otherDefaultProvider) {
      /** @type {PropDefaultFunctionContext[]} */
      const propContexts = []
      for (const prop of props) {
        let typeList
        /** @type {DefaultDefine[]} */
        const defaultList = []
        if (prop.type === 'object') {
          if (prop.value.type === 'ObjectExpression') {
            const type = getPropertyNode(prop.value, 'type')
            if (!type) continue

            typeList = getTypes(type.value)

            const def = getPropertyNode(prop.value, 'default')
            if (def) {
              defaultList.push({
                src: 'defaultProperty',
                expression: def.value
              })
            }
          } else {
            typeList = getTypes(prop.value)
          }
        } else {
          typeList = prop.types
        }
        if (prop.propName != null) {
          defaultList.push(...otherDefaultProvider(prop.propName))
        }

        if (defaultList.length === 0) continue

        const typeNames = new Set(
          typeList.filter((item) => NATIVE_TYPES.has(item))
        )
        // There is no native types detected
        if (typeNames.size === 0) continue

        for (const defaultDef of defaultList) {
          const defType = getValueType(defaultDef.expression)

          if (!defType) continue

          if (defType.function) {
            if (typeNames.has('Function')) {
              continue
            }
            if (defaultDef.src === 'assignment') {
              // Factory functions cannot be used in default definitions with initial value assignments.
              report(defaultDef.expression, prop, typeNames)
              continue
            }
            if (defType.expression) {
              if (!defType.returnType || typeNames.has(defType.returnType)) {
                continue
              }
              report(defType.functionBody, prop, typeNames)
            } else {
              propContexts.push({
                prop,
                types: typeNames,
                default: defType
              })
            }
          } else {
            if (typeNames.has(defType.type)) {
              if (defaultDef.src === 'assignment') {
                continue
              }
              if (!FUNCTION_VALUE_TYPES.has(defType.type)) {
                // For Array and Object, defaults must be defined in the factory function.
                continue
              }
            }
            report(
              defaultDef.expression,
              prop,
              defaultDef.src === 'assignment'
                ? typeNames
                : [...typeNames].map((type) =>
                    FUNCTION_VALUE_TYPES.has(type) ? 'Function' : type
                  )
            )
          }
        }
      }
      return propContexts
    }

    return utils.compositingVisitors(
      {
        /**
         * @param {FunctionExpression | FunctionDeclaration | ArrowFunctionExpression} node
         */
        ':function'(node) {
          scopeStack = {
            upper: scopeStack,
            body: node.body,
            returnTypes: null
          }
        },
        /**
         * @param {ReturnStatement} node
         */
        ReturnStatement(node) {
          if (!scopeStack) {
            return
          }
          if (scopeStack.returnTypes && node.argument) {
            const type = getValueType(node.argument)
            if (type) {
              scopeStack.returnTypes.push({
                type: type.type,
                node: node.argument
              })
            }
          }
        },
        ':function:exit': onFunctionExit
      },
      utils.defineVueVisitor(context, {
        onVueObjectEnter(obj) {
          /** @type {ComponentObjectDefineProp[]} */
          const props = utils.getComponentPropsFromOptions(obj).filter(
            /**
             * @param {ComponentObjectProp | ComponentArrayProp | ComponentUnknownProp} prop
             * @returns {prop is ComponentObjectDefineProp}
             */
            (prop) =>
              Boolean(
                prop.type === 'object' && prop.value.type === 'ObjectExpression'
              )
          )
          const propContexts = processPropDefs(props, () => [])
          vueObjectPropsContexts.set(obj, propContexts)
        },
        /**
         * @param {FunctionExpression | FunctionDeclaration | ArrowFunctionExpression} node
         * @param {VueObjectData} data
         */
        ':function'(node, { node: vueNode }) {
          const data = vueObjectPropsContexts.get(vueNode)
          if (!data || !scopeStack) {
            return
          }

          for (const { default: defType } of data) {
            if (node.body === defType.functionBody) {
              scopeStack.returnTypes = defType.returnTypes
            }
          }
        },
        onVueObjectExit(obj) {
          const data = vueObjectPropsContexts.get(obj)
          if (!data) {
            return
          }
          for (const { prop, types: typeNames, default: defType } of data) {
            for (const returnType of defType.returnTypes) {
              if (typeNames.has(returnType.type)) continue

              report(returnType.node, prop, typeNames)
            }
          }
        }
      }),
      utils.defineScriptSetupVisitor(context, {
        onDefinePropsEnter(node, baseProps) {
          const props = baseProps.filter(
            /**
             * @param {ComponentProp} prop
             * @returns {prop is ComponentObjectProp | ComponentInferTypeProp | ComponentTypeProp}
             */
            (prop) =>
              Boolean(
                prop.type === 'type' ||
                  prop.type === 'infer-type' ||
                  prop.type === 'object'
              )
          )
          const defaultsByWithDefaults =
            utils.getWithDefaultsPropExpressions(node)
          const defaultsByAssignmentPatterns =
            utils.getDefaultPropExpressionsForPropsDestructure(node)
          const propContexts = processPropDefs(props, function* (propName) {
            const withDefaults = defaultsByWithDefaults[propName]
            if (withDefaults) {
              yield { src: 'withDefaults', expression: withDefaults }
            }
            const assignmentPattern = defaultsByAssignmentPatterns[propName]
            if (assignmentPattern) {
              yield {
                src: 'assignment',
                expression: assignmentPattern.expression
              }
            }
          })
          scriptSetupPropsContexts.push({ node, props: propContexts })
        },
        /**
         * @param {FunctionExpression | FunctionDeclaration | ArrowFunctionExpression} node
         */
        ':function'(node) {
          const data =
            scriptSetupPropsContexts[scriptSetupPropsContexts.length - 1]
          if (!data || !scopeStack) {
            return
          }

          for (const { default: defType } of data.props) {
            if (node.body === defType.functionBody) {
              scopeStack.returnTypes = defType.returnTypes
            }
          }
        },
        onDefinePropsExit() {
          const data = scriptSetupPropsContexts.pop()
          if (!data) {
            return
          }
          for (const {
            prop,
            types: typeNames,
            default: defType
          } of data.props) {
            for (const returnType of defType.returnTypes) {
              if (typeNames.has(returnType.type)) continue

              report(returnType.node, prop, typeNames)
            }
          }
        }
      })
    )
  }
}
