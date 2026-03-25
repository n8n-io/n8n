/**
 * @fileoverview Disallow unused properties, data and computed properties.
 * @author Learning Equality
 */
'use strict'

const utils = require('../utils')
const eslintUtils = require('@eslint-community/eslint-utils')
const { isJSDocComment } = require('../utils/comments.js')
const { getStyleVariablesContext } = require('../utils/style-variables')
const {
  definePropertyReferenceExtractor,
  mergePropertyReferences
} = require('../utils/property-references')

/**
 * @typedef {import('../utils').GroupName} GroupName
 * @typedef {import('../utils').VueObjectData} VueObjectData
 * @typedef {import('../utils/property-references').IPropertyReferences} IPropertyReferences
 */

/**
 * @typedef {object} ComponentObjectPropertyData
 * @property {string} name
 * @property {GroupName} groupName
 * @property {'object'} type
 * @property {ASTNode} node
 * @property {Property} property
 *
 * @typedef {object} ComponentNonObjectPropertyData
 * @property {string} name
 * @property {GroupName} groupName
 * @property {'array' | 'type' | 'infer-type' | 'model' } type
 * @property {ASTNode} node
 *
 * @typedef { ComponentNonObjectPropertyData | ComponentObjectPropertyData } ComponentPropertyData
 */

/**
 * @typedef {object} TemplatePropertiesContainer
 * @property {IPropertyReferences[]} propertyReferences
 * @property {Set<string>} refNames
 * @typedef {object} VueComponentPropertiesContainer
 * @property {ComponentPropertyData[]} properties
 * @property {IPropertyReferences[]} propertyReferences
 * @property {IPropertyReferences[]} propertyReferencesForProps
 */

const GROUP_PROPERTY = 'props'
const GROUP_DATA = 'data'
const GROUP_ASYNC_DATA = 'asyncData'
const GROUP_COMPUTED_PROPERTY = 'computed'
const GROUP_METHODS = 'methods'
const GROUP_SETUP = 'setup'
const GROUP_WATCHER = 'watch'
const GROUP_EXPOSE = 'expose'

const UNREFERENCED_UNKNOWN_MEMBER = 'unknownMemberAsUnreferenced'
const UNREFERENCED_RETURN = 'returnAsUnreferenced'

const PROPERTY_LABEL = {
  props: 'property',
  data: 'data',
  asyncData: 'async data',
  computed: 'computed property',
  methods: 'method',
  setup: 'property returned from `setup()`',

  // not use
  watch: 'watch',
  provide: 'provide',
  inject: 'inject',
  expose: 'expose'
}

/**
 * @param {RuleContext} context
 * @param {Identifier} id
 * @returns {Expression}
 */
function findExpression(context, id) {
  const variable = utils.findVariableByIdentifier(context, id)
  if (!variable) {
    return id
  }
  if (variable.defs.length === 1) {
    const def = variable.defs[0]
    if (
      def.type === 'Variable' &&
      def.parent.kind === 'const' &&
      def.node.init
    ) {
      if (def.node.init.type === 'Identifier') {
        return findExpression(context, def.node.init)
      }
      return def.node.init
    }
  }
  return id
}

/**
 * Check if the given component property is marked as `@public` in JSDoc comments.
 * @param {ComponentPropertyData} property
 * @param {SourceCode} sourceCode
 */
function isPublicMember(property, sourceCode) {
  if (
    property.type === 'object' &&
    // Props do not support @public.
    property.groupName !== 'props'
  ) {
    return isPublicProperty(property.property, sourceCode)
  }
  return false
}

/**
 * Check if the given property node is marked as `@public` in JSDoc comments.
 * @param {Property} node
 * @param {SourceCode} sourceCode
 */
function isPublicProperty(node, sourceCode) {
  const jsdoc = getJSDocFromProperty(node, sourceCode)
  if (jsdoc) {
    return /(?:^|\s|\*)@public\b/u.test(jsdoc.value)
  }
  return false
}

/**
 * Get the JSDoc comment for a given property node.
 * @param {Property} node
 * @param {SourceCode} sourceCode
 */
function getJSDocFromProperty(node, sourceCode) {
  const jsdoc = findJSDocComment(node, sourceCode)
  if (jsdoc) {
    return jsdoc
  }
  if (
    node.value.type === 'FunctionExpression' ||
    node.value.type === 'ArrowFunctionExpression'
  ) {
    return findJSDocComment(node.value, sourceCode)
  }

  return null
}

/**
 * Finds a JSDoc comment for the given node.
 * @param {ASTNode} node
 * @param {SourceCode} sourceCode
 * @returns {Comment | null}
 */
function findJSDocComment(node, sourceCode) {
  /** @type {ASTNode | Token} */
  let currentNode = node
  let tokenBefore = null

  while (currentNode) {
    tokenBefore = sourceCode.getTokenBefore(currentNode, {
      includeComments: true
    })
    if (!tokenBefore || !eslintUtils.isCommentToken(tokenBefore)) {
      return null
    }
    if (tokenBefore.type === 'Line') {
      currentNode = tokenBefore
      continue
    }
    break
  }

  if (tokenBefore && isJSDocComment(tokenBefore)) {
    return tokenBefore
  }

  return null
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'disallow unused properties',
      categories: undefined,
      url: 'https://eslint.vuejs.org/rules/no-unused-properties.html'
    },
    fixable: null,
    schema: [
      {
        type: 'object',
        properties: {
          groups: {
            type: 'array',
            items: {
              enum: [
                GROUP_PROPERTY,
                GROUP_DATA,
                GROUP_ASYNC_DATA,
                GROUP_COMPUTED_PROPERTY,
                GROUP_METHODS,
                GROUP_SETUP
              ]
            },
            additionalItems: false,
            uniqueItems: true
          },
          deepData: { type: 'boolean' },
          ignorePublicMembers: { type: 'boolean' },
          unreferencedOptions: {
            type: 'array',
            items: {
              enum: [UNREFERENCED_UNKNOWN_MEMBER, UNREFERENCED_RETURN]
            },
            additionalItems: false,
            uniqueItems: true
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      unused: "'{{name}}' of {{group}} found, but never used."
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    const options = context.options[0] || {}
    const groups = new Set(options.groups || [GROUP_PROPERTY])
    const deepData = Boolean(options.deepData)
    const ignorePublicMembers = Boolean(options.ignorePublicMembers)
    const unreferencedOptions = new Set(options.unreferencedOptions || [])
    /** @type {null | Pattern} */
    let propsReferencePattern = null

    const propertyReferenceExtractor = definePropertyReferenceExtractor(
      context,
      {
        unknownMemberAsUnreferenced: unreferencedOptions.has(
          UNREFERENCED_UNKNOWN_MEMBER
        ),
        returnAsUnreferenced: unreferencedOptions.has(UNREFERENCED_RETURN)
      }
    )

    /** @type {TemplatePropertiesContainer} */
    const templatePropertiesContainer = {
      propertyReferences: [],
      refNames: new Set()
    }
    /** @type {Map<ASTNode, VueComponentPropertiesContainer>} */
    const vueComponentPropertiesContainerMap = new Map()

    /**
     * @param {ASTNode} node
     * @returns {VueComponentPropertiesContainer}
     */
    function getVueComponentPropertiesContainer(node) {
      let container = vueComponentPropertiesContainerMap.get(node)
      if (!container) {
        container = {
          properties: [],
          propertyReferences: [],
          propertyReferencesForProps: []
        }
        vueComponentPropertiesContainerMap.set(node, container)
      }
      return container
    }

    /**
     * @param {string[]} segments
     * @param {Expression} propertyValue
     * @param {IPropertyReferences} propertyReferences
     */
    function verifyDataOptionDeepProperties(
      segments,
      propertyValue,
      propertyReferences
    ) {
      let targetExpr = propertyValue
      if (targetExpr.type === 'Identifier') {
        targetExpr = findExpression(context, targetExpr)
      }
      if (targetExpr.type === 'ObjectExpression') {
        for (const prop of targetExpr.properties) {
          if (prop.type !== 'Property') {
            continue
          }
          const name = utils.getStaticPropertyName(prop)
          if (name == null) {
            continue
          }
          if (
            !propertyReferences.hasProperty(name, { unknownCallAsAny: true })
          ) {
            // report
            context.report({
              node: prop.key,
              messageId: 'unused',
              data: {
                group: PROPERTY_LABEL.data,
                name: [...segments, name].join('.')
              }
            })
            continue
          }
          // next
          verifyDataOptionDeepProperties(
            [...segments, name],
            prop.value,
            propertyReferences.getNest(name)
          )
        }
      }
    }

    /**
     * Report all unused properties.
     */
    function reportUnusedProperties() {
      for (const container of vueComponentPropertiesContainerMap.values()) {
        const propertyReferences = mergePropertyReferences([
          ...container.propertyReferences,
          ...templatePropertiesContainer.propertyReferences
        ])

        const propertyReferencesForProps = mergePropertyReferences(
          container.propertyReferencesForProps
        )

        for (const property of container.properties) {
          if (
            (property.groupName === 'props' &&
              propertyReferencesForProps.hasProperty(property.name)) ||
            propertyReferences.hasProperty('$props')
          ) {
            // used props
            continue
          }
          if (
            property.groupName === 'setup' &&
            templatePropertiesContainer.refNames.has(property.name)
          ) {
            // used template refs
            continue
          }
          if (
            ignorePublicMembers &&
            isPublicMember(property, context.getSourceCode())
          ) {
            continue
          }

          if (propertyReferences.hasProperty(property.name)) {
            // used
            if (
              deepData &&
              (property.groupName === 'data' ||
                property.groupName === 'asyncData') &&
              property.type === 'object'
            ) {
              // Check the deep properties of the data option.
              verifyDataOptionDeepProperties(
                [property.name],
                property.property.value,
                propertyReferences.getNest(property.name)
              )
            }
            continue
          }

          context.report({
            node: property.node,
            messageId: 'unused',
            data: {
              group: PROPERTY_LABEL[property.groupName],
              name: property.name
            }
          })
        }
      }
    }

    /**
     * @param {Expression} node
     * @returns {Property|null}
     */
    function getParentProperty(node) {
      if (
        !node.parent ||
        node.parent.type !== 'Property' ||
        node.parent.value !== node
      ) {
        return null
      }
      const property = node.parent
      if (!utils.isProperty(property)) {
        return null
      }
      return property
    }

    const scriptVisitor = utils.compositingVisitors(
      utils.defineScriptSetupVisitor(context, {
        onDefinePropsEnter(node, props) {
          if (!groups.has('props')) {
            return
          }
          const container = getVueComponentPropertiesContainer(
            context.getSourceCode().ast
          )

          for (const prop of props) {
            if (!prop.propName) {
              continue
            }
            if (prop.type === 'object') {
              container.properties.push({
                type: prop.type,
                name: prop.propName,
                groupName: 'props',
                node: prop.key,
                property: prop.node
              })
            } else {
              container.properties.push({
                type: prop.type,
                name: prop.propName,
                groupName: 'props',
                node: prop.type === 'infer-type' ? prop.node : prop.key
              })
            }
          }
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
            return
          }

          propsReferencePattern = target.parent.id
          const propertyReferences =
            propertyReferenceExtractor.extractFromPattern(propsReferencePattern)
          container.propertyReferencesForProps.push(propertyReferences)
        },
        onDefineModelEnter(node, model) {
          if (!groups.has('props')) {
            return
          }
          const container = getVueComponentPropertiesContainer(
            context.getSourceCode().ast
          )
          if (
            node.parent &&
            node.parent.type === 'VariableDeclarator' &&
            node.parent.init === node
          ) {
            // If the return value of defineModel() is stored in a variable, we can mark the model prop as used if that that variable is used.
            // If that variable is unused, it will already be reported by `no-unused-var` rule.
            container.propertyReferences.push(
              propertyReferenceExtractor.extractFromName(
                model.name.modelName,
                model.name.node || node
              )
            )
            return
          }
          container.properties.push({
            type: 'model',
            name: model.name.modelName,
            groupName: 'props',
            node: model.name.node || node
          })
        }
      }),
      utils.defineVueVisitor(context, {
        /**
         * @param {CallExpression} node
         * @param {VueObjectData} vueData
         */
        CallExpression(node, vueData) {
          if (node.callee.type !== 'Identifier') return
          /** @type {'methods'|'computed'|null} */
          let groupName = null
          if (/^mapMutations|mapActions$/u.test(node.callee.name)) {
            groupName = 'methods'
          } else if (
            /^mapState|mapGetters|mapWritableState$/u.test(node.callee.name)
          ) {
            groupName = 'computed'
          }

          if (!groupName || node.arguments.length === 0) return
          // On Pinia the store is always the first argument
          const arg =
            node.arguments.length === 2 ? node.arguments[1] : node.arguments[0]
          if (arg.type === 'ObjectExpression') {
            // e.g.
            // `mapMutations({ add: 'increment' })`
            // `mapState({ count: state => state.todosCount })`
            const container = getVueComponentPropertiesContainer(vueData.node)
            for (const prop of arg.properties) {
              const name =
                prop.type === 'SpreadElement'
                  ? null
                  : utils.getStaticPropertyName(prop)
              if (name) {
                container.properties.push({
                  type: 'array',
                  name,
                  groupName,
                  node: prop
                })
              }
            }
          } else if (arg.type === 'ArrayExpression') {
            // e.g. `mapMutations(['add'])`
            const container = getVueComponentPropertiesContainer(vueData.node)
            for (const element of arg.elements) {
              if (
                !element ||
                (element.type !== 'Literal' &&
                  element.type !== 'TemplateLiteral')
              ) {
                continue
              }
              const name = utils.getStringLiteralValue(element)
              if (name) {
                container.properties.push({
                  type: 'array',
                  name,
                  groupName,
                  node: element
                })
              }
            }
          }
        },

        onVueObjectEnter(node, vueNode) {
          const container = getVueComponentPropertiesContainer(vueNode.node)

          for (const watcherOrExpose of utils.iterateProperties(
            node,
            new Set([GROUP_WATCHER, GROUP_EXPOSE])
          )) {
            if (watcherOrExpose.groupName === GROUP_WATCHER) {
              const watcher = watcherOrExpose
              // Process `watch: { foo /* <- this */ () {} }`
              container.propertyReferences.push(
                propertyReferenceExtractor.extractFromPath(
                  watcher.name,
                  watcher.node
                )
              )

              // Process `watch: { x: 'foo' /* <- this */  }`
              if (watcher.type === 'object') {
                const property = watcher.property
                if (property.kind === 'init') {
                  for (const handlerValueNode of utils.iterateWatchHandlerValues(
                    property
                  )) {
                    container.propertyReferences.push(
                      propertyReferenceExtractor.extractFromNameLiteral(
                        handlerValueNode
                      )
                    )
                  }
                }
              }
            } else if (watcherOrExpose.groupName === GROUP_EXPOSE) {
              const expose = watcherOrExpose
              container.propertyReferences.push(
                propertyReferenceExtractor.extractFromName(
                  expose.name,
                  expose.node
                )
              )
            }
          }

          container.properties.push(...utils.iterateProperties(node, groups))
        },

        /** @param { (FunctionExpression | ArrowFunctionExpression) & { parent: Property }} node */
        'ObjectExpression > Property > :function[params.length>0]'(
          node,
          vueData
        ) {
          const property = getParentProperty(node)
          if (!property) {
            return
          }
          if (property.parent === vueData.node) {
            if (utils.getStaticPropertyName(property) !== 'data') {
              return
            }
            // check { data: (vm) => vm.prop }
          } else {
            const parentProperty = getParentProperty(property.parent)
            if (!parentProperty) {
              return
            }
            if (parentProperty.parent === vueData.node) {
              if (utils.getStaticPropertyName(parentProperty) !== 'computed') {
                return
              }
              // check { computed: { foo: (vm) => vm.prop } }
            } else {
              const parentParentProperty = getParentProperty(
                parentProperty.parent
              )
              if (!parentParentProperty) {
                return
              }
              if (parentParentProperty.parent === vueData.node) {
                if (
                  utils.getStaticPropertyName(parentParentProperty) !==
                    'computed' ||
                  utils.getStaticPropertyName(property) !== 'get'
                ) {
                  return
                }
                // check { computed: { foo: { get: (vm) => vm.prop } } }
              } else {
                return
              }
            }
          }

          const propertyReferences =
            propertyReferenceExtractor.extractFromFunctionParam(node, 0)
          const container = getVueComponentPropertiesContainer(vueData.node)
          container.propertyReferences.push(propertyReferences)
        },
        onSetupFunctionEnter(node, vueData) {
          const container = getVueComponentPropertiesContainer(vueData.node)
          const propertyReferences =
            propertyReferenceExtractor.extractFromFunctionParam(node, 0)
          container.propertyReferencesForProps.push(propertyReferences)
        },
        onRenderFunctionEnter(node, vueData) {
          const container = getVueComponentPropertiesContainer(vueData.node)

          // Check for Vue 3.x render
          const propertyReferences =
            propertyReferenceExtractor.extractFromFunctionParam(node, 0)
          container.propertyReferencesForProps.push(propertyReferences)

          if (vueData.functional) {
            // Check for Vue 2.x render & functional
            const propertyReferencesForV2 =
              propertyReferenceExtractor.extractFromFunctionParam(node, 1)

            container.propertyReferencesForProps.push(
              propertyReferencesForV2.getNest('props')
            )
          }
        },
        /**
         * @param {ThisExpression | Identifier} node
         * @param {VueObjectData} vueData
         */
        'ThisExpression, Identifier'(node, vueData) {
          if (!utils.isThis(node, context)) {
            return
          }
          const container = getVueComponentPropertiesContainer(vueData.node)
          const propertyReferences =
            propertyReferenceExtractor.extractFromExpression(node, false)
          container.propertyReferences.push(propertyReferences)
        }
      }),
      {
        Program() {
          const styleVars = getStyleVariablesContext(context)
          if (styleVars) {
            templatePropertiesContainer.propertyReferences.push(
              propertyReferenceExtractor.extractFromStyleVariablesContext(
                styleVars
              )
            )
          }
        },
        /** @param {Program} node */
        'Program:exit'(node) {
          if (!node.templateBody) {
            reportUnusedProperties()
          }
        }
      }
    )

    const templateVisitor = {
      /**
       * @param {VExpressionContainer} node
       */
      VExpressionContainer(node) {
        const property =
          propertyReferenceExtractor.extractFromVExpressionContainer(node)

        templatePropertiesContainer.propertyReferences.push(property)

        if (!propsReferencePattern) {
          return
        }

        // props.prop in template
        for (const key of property.allProperties().keys()) {
          if (
            propsReferencePattern.type === 'Identifier' &&
            propsReferencePattern.name === key
          ) {
            templatePropertiesContainer.propertyReferences.push(
              property.getNest(key)
            )
          }
        }
      },
      /**
       * @param {VAttribute} node
       */
      'VAttribute[directive=false]'(node) {
        if (node.key.name === 'ref' && node.value != null) {
          templatePropertiesContainer.refNames.add(node.value.value)
        }
      },
      "VElement[parent.type!='VElement']:exit"() {
        reportUnusedProperties()
      }
    }

    return utils.defineTemplateBodyVisitor(
      context,
      templateVisitor,
      scriptVisitor
    )
  }
}
