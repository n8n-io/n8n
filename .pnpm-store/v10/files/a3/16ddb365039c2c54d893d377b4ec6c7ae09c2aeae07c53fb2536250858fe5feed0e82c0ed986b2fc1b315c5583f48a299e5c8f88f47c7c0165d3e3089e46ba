/**
 * @author Yosuke Ota
 * @copyright 2021 Yosuke Ota. All rights reserved.
 * See LICENSE file in root directory for full license.
 */
'use strict'

const utils = require('./index')
const eslintUtils = require('@eslint-community/eslint-utils')

/**
 * @typedef {import('./style-variables').StyleVariablesContext} StyleVariablesContext
 */
/**
 * @typedef {object} IHasPropertyOption
 * @property {boolean} [unknownCallAsAny]
 */
/**
 * @typedef {object} NestPropertyNodeForExpression
 * @property {'expression'} type
 * @property {MemberExpression} node
 *
 * @typedef {object} NestPropertyNodeForPattern
 * @property {'pattern'} type
 * @property {MemberExpression | Identifier | ObjectPattern | ArrayPattern} node
 *
 * @typedef {NestPropertyNodeForExpression | NestPropertyNodeForPattern} NestPropertyNode
 */
/**
 * @typedef {object} IPropertyReferences
 * @property { (name: string, option?: IHasPropertyOption) => boolean } hasProperty
 * @property { () => Map<string, {nodes:ASTNode[]}> } allProperties Get all properties.
 * @property { (name: string) => IPropertyReferences } getNest Get the nesting property references.
 * @property { (name: string) => Iterable<NestPropertyNode> } getNestNodes Get the nesting property nodes.
 */

/** @type {IPropertyReferences} */
const ANY = {
  hasProperty: () => true,
  allProperties: () => new Map(),
  getNest: () => ANY,
  getNestNodes: () => []
}

/** @type {IPropertyReferences} */
const NEVER = {
  hasProperty: () => false,
  allProperties: () => new Map(),
  getNest: () => NEVER,
  getNestNodes: () => []
}

/**
 * @param {RuleContext} context
 * @param {Identifier} id
 * @returns {FunctionExpression | ArrowFunctionExpression | FunctionDeclaration | null}
 */
function findFunction(context, id) {
  const calleeVariable = utils.findVariableByIdentifier(context, id)
  if (!calleeVariable) {
    return null
  }
  if (calleeVariable.defs.length === 1) {
    const def = calleeVariable.defs[0]
    if (def.node.type === 'FunctionDeclaration') {
      return def.node
    }
    if (
      def.type === 'Variable' &&
      def.parent.kind === 'const' &&
      def.node.init
    ) {
      if (
        def.node.init.type === 'FunctionExpression' ||
        def.node.init.type === 'ArrowFunctionExpression'
      ) {
        return def.node.init
      }
      if (def.node.init.type === 'Identifier') {
        return findFunction(context, def.node.init)
      }
    }
  }
  return null
}

module.exports = {
  definePropertyReferenceExtractor,
  mergePropertyReferences
}

/**
 * @param {RuleContext} context The rule context.
 */
function definePropertyReferenceExtractor(
  context,
  { unknownMemberAsUnreferenced = false, returnAsUnreferenced = false } = {}
) {
  /** @type {Map<Expression, IPropertyReferences>} */
  const cacheForExpression = new Map()
  /** @type {Map<Pattern, IPropertyReferences>} */
  const cacheForPattern = new Map()
  /** @type {Map<FunctionExpression | ArrowFunctionExpression | FunctionDeclaration, Map<number, IPropertyReferences>>} */
  const cacheForFunction = new Map()
  /** @type {{ toRefNodes: Set<ESNode>, toRefsNodes: Set<ESNode>} | null} */
  let toRefSet = null

  let isFunctionalTemplate = false
  const templateBody = context.getSourceCode().ast.templateBody
  if (templateBody) {
    isFunctionalTemplate = utils.hasAttribute(templateBody, 'functional')
  }

  function getToRefSet() {
    if (toRefSet) {
      return toRefSet
    }
    const tracker = new eslintUtils.ReferenceTracker(
      context.getSourceCode().scopeManager.scopes[0]
    )
    const toRefNodes = new Set()
    for (const { node } of utils.iterateReferencesTraceMap(tracker, {
      [eslintUtils.ReferenceTracker.ESM]: true,
      toRef: {
        [eslintUtils.ReferenceTracker.CALL]: true
      }
    })) {
      toRefNodes.add(node)
    }
    const toRefsNodes = new Set()
    for (const { node } of utils.iterateReferencesTraceMap(tracker, {
      [eslintUtils.ReferenceTracker.ESM]: true,
      toRefs: {
        [eslintUtils.ReferenceTracker.CALL]: true
      }
    })) {
      toRefsNodes.add(node)
    }

    return (toRefSet = { toRefNodes, toRefsNodes })
  }

  /**
   * Collects the property references for member expr.
   * @implements {IPropertyReferences}
   */
  class PropertyReferencesForMember {
    /**
     *
     * @param {MemberExpression} node
     * @param {string} name
     * @param {boolean} withInTemplate
     */
    constructor(node, name, withInTemplate) {
      this.node = node
      this.name = name
      this.withInTemplate = withInTemplate
    }

    /**
     * @param {string} name
     */
    hasProperty(name) {
      return name === this.name
    }

    allProperties() {
      return new Map([[this.name, { nodes: [this.node.property] }]])
    }

    /**
     * @param {string} name
     * @returns {IPropertyReferences}
     */
    getNest(name) {
      return name === this.name
        ? extractFromExpression(this.node, this.withInTemplate)
        : NEVER
    }

    /**
     * @param {string} name
     * @returns {Iterable<NestPropertyNodeForExpression>}
     */
    *getNestNodes(name) {
      if (name === this.name) {
        yield {
          type: 'expression',
          node: this.node
        }
      }
    }
  }
  /**
   * Collects the property references for object.
   * @implements {IPropertyReferences}
   */
  class PropertyReferencesForObject {
    constructor() {
      /** @type {Record<string, AssignmentProperty[]>} */
      this.properties = Object.create(null)
    }

    /**
     * @param {string} name
     */
    hasProperty(name) {
      return Boolean(this.properties[name])
    }

    allProperties() {
      const result = new Map()
      for (const [name, nodes] of Object.entries(this.properties)) {
        result.set(name, { nodes: nodes.map((node) => node.key) })
      }
      return result
    }

    /**
     * @param {string} name
     * @returns {IPropertyReferences}
     */
    getNest(name) {
      const properties = this.properties[name]
      return properties
        ? mergePropertyReferences(
            properties.map((property) => getNestFromPattern(property.value))
          )
        : NEVER
    }

    /**
     * @param {string} name
     * @returns {Iterable<NestPropertyNodeForPattern>}
     */
    *getNestNodes(name) {
      const properties = this.properties[name]
      if (!properties) {
        return
      }
      const values = properties.map((property) => property.value)
      let node
      while ((node = values.shift())) {
        if (
          node.type === 'Identifier' ||
          node.type === 'MemberExpression' ||
          node.type === 'ObjectPattern' ||
          node.type === 'ArrayPattern'
        ) {
          yield {
            type: 'pattern',
            node
          }
        } else if (node.type === 'AssignmentPattern') {
          values.unshift(node.left)
        }
      }
      return properties ? properties.map((p) => p.value) : []
    }
  }

  /**
   * @param {Pattern} pattern
   * @returns {IPropertyReferences}
   */
  function getNestFromPattern(pattern) {
    if (pattern.type === 'ObjectPattern') {
      return extractFromObjectPattern(pattern)
    }
    if (pattern.type === 'Identifier') {
      return extractFromIdentifier(pattern)
    } else if (pattern.type === 'AssignmentPattern') {
      return getNestFromPattern(pattern.left)
    }
    return ANY
  }

  /**
   * Extract the property references from Expression.
   * @param {Identifier | MemberExpression | ChainExpression | ThisExpression | CallExpression} node
   * @param {boolean} withInTemplate
   * @returns {IPropertyReferences}
   */
  function extractFromExpression(node, withInTemplate) {
    const ref = cacheForExpression.get(node)
    if (ref) {
      return ref
    }
    cacheForExpression.set(node, ANY)
    const result = extractWithoutCache()
    cacheForExpression.set(node, result)
    return result

    function extractWithoutCache() {
      const parent = node.parent
      switch (parent.type) {
        case 'AssignmentExpression': {
          // `({foo} = arg)`
          return !withInTemplate &&
            parent.right === node &&
            parent.operator === '='
            ? extractFromPattern(parent.left)
            : NEVER
        }
        case 'VariableDeclarator': {
          // `const {foo} = arg`
          // `const foo = arg`
          return !withInTemplate && parent.init === node
            ? extractFromPattern(parent.id)
            : NEVER
        }
        case 'MemberExpression': {
          if (parent.object === node) {
            // `arg.foo`
            const name = utils.getStaticPropertyName(parent)

            if (
              name === '$props' &&
              parent.parent.type === 'MemberExpression'
            ) {
              // `$props.arg`
              const propName = utils.getStaticPropertyName(parent.parent)

              if (!propName) return unknownMemberAsUnreferenced ? NEVER : ANY

              return new PropertyReferencesForMember(
                parent.parent,
                propName,
                withInTemplate
              )
            } else if (name) {
              return new PropertyReferencesForMember(
                parent,
                name,
                withInTemplate
              )
            } else {
              return unknownMemberAsUnreferenced ? NEVER : ANY
            }
          }
          return NEVER
        }
        case 'CallExpression': {
          const argIndex = parent.arguments.indexOf(node)
          // `foo(arg)`
          return !withInTemplate && argIndex !== -1
            ? extractFromCall(parent, argIndex)
            : NEVER
        }
        case 'ChainExpression': {
          return extractFromExpression(parent, withInTemplate)
        }
        case 'ArrowFunctionExpression':
        case 'VExpressionContainer':
        case 'Property':
        case 'ArrayExpression': {
          return maybeExternalUsed(parent) ? ANY : NEVER
        }
        case 'ReturnStatement': {
          if (returnAsUnreferenced) {
            return NEVER
          } else {
            return maybeExternalUsed(parent) ? ANY : NEVER
          }
        }
      }
      return NEVER
    }

    /**
     * @param {ASTNode} parentTarget
     * @returns {boolean}
     */
    function maybeExternalUsed(parentTarget) {
      if (
        parentTarget.type === 'ReturnStatement' ||
        parentTarget.type === 'VExpressionContainer'
      ) {
        return true
      }
      if (parentTarget.type === 'ArrayExpression') {
        return maybeExternalUsed(parentTarget.parent)
      }
      if (parentTarget.type === 'Property') {
        return maybeExternalUsed(parentTarget.parent.parent)
      }
      if (parentTarget.type === 'ArrowFunctionExpression') {
        return parentTarget.body === node
      }
      return false
    }
  }

  /**
   * Extract the property references from one parameter of the function.
   * @param {Pattern} node
   * @returns {IPropertyReferences}
   */
  function extractFromPattern(node) {
    const ref = cacheForPattern.get(node)
    if (ref) {
      return ref
    }
    cacheForPattern.set(node, ANY)
    const result = extractWithoutCache()
    cacheForPattern.set(node, result)
    return result

    function extractWithoutCache() {
      while (node.type === 'AssignmentPattern') {
        node = node.left
      }
      if (node.type === 'RestElement' || node.type === 'ArrayPattern') {
        // cannot check
        return NEVER
      }
      if (node.type === 'ObjectPattern') {
        return extractFromObjectPattern(node)
      }
      if (node.type === 'Identifier') {
        return extractFromIdentifier(node)
      }
      return NEVER
    }
  }

  /**
   * Extract the property references from ObjectPattern.
   * @param {ObjectPattern} node
   * @returns {IPropertyReferences}
   */
  function extractFromObjectPattern(node) {
    const refs = new PropertyReferencesForObject()
    for (const prop of node.properties) {
      if (prop.type === 'Property') {
        const name = utils.getStaticPropertyName(prop)
        if (name) {
          const list = refs.properties[name] || (refs.properties[name] = [])
          list.push(prop)
        } else {
          // If cannot trace name, everything is used!
          return ANY
        }
      } else {
        // If use RestElement, everything is used!
        return ANY
      }
    }
    return refs
  }

  /**
   * Extract the property references from id.
   * @param {Identifier} node
   * @returns {IPropertyReferences}
   */
  function extractFromIdentifier(node) {
    const variable = utils.findVariableByIdentifier(context, node)
    if (!variable) {
      return NEVER
    }
    return mergePropertyReferences(
      variable.references.map((reference) => {
        const id = reference.identifier
        return extractFromExpression(id, false)
      })
    )
  }

  /**
   * Extract the property references from call.
   * @param {CallExpression} node
   * @param {number} argIndex
   * @returns {IPropertyReferences}
   */
  function extractFromCall(node, argIndex) {
    if (node.callee.type !== 'Identifier') {
      return {
        hasProperty(_name, options) {
          return Boolean(options && options.unknownCallAsAny)
        },
        allProperties: () => new Map(),
        getNest: () => ANY,
        getNestNodes: () => []
      }
    }

    const fnNode = findFunction(context, node.callee)
    if (!fnNode) {
      if (argIndex === 0) {
        if (getToRefSet().toRefNodes.has(node)) {
          return extractFromToRef(node)
        } else if (getToRefSet().toRefsNodes.has(node)) {
          return extractFromToRefs(node)
        }
      }
      return {
        hasProperty(_name, options) {
          return Boolean(options && options.unknownCallAsAny)
        },
        allProperties: () => new Map(),
        getNest: () => ANY,
        getNestNodes: () => []
      }
    }

    return extractFromFunctionParam(fnNode, argIndex)
  }

  /**
   * Extract the property references from function param.
   * @param {FunctionExpression | ArrowFunctionExpression | FunctionDeclaration} node
   * @param {number} argIndex
   * @returns {IPropertyReferences}
   */
  function extractFromFunctionParam(node, argIndex) {
    let cacheForIndexes = cacheForFunction.get(node)
    if (!cacheForIndexes) {
      cacheForIndexes = new Map()
      cacheForFunction.set(node, cacheForIndexes)
    }
    const ref = cacheForIndexes.get(argIndex)
    if (ref) {
      return ref
    }
    cacheForIndexes.set(argIndex, NEVER)
    const arg = node.params[argIndex]
    if (!arg) {
      return NEVER
    }
    const result = extractFromPattern(arg)
    cacheForIndexes.set(argIndex, result)
    return result
  }

  /**
   * Extract the property references from path.
   * @param {string} pathString
   * @param {Identifier | Literal | TemplateLiteral} node
   * @returns {IPropertyReferences}
   */
  function extractFromPath(pathString, node) {
    return extractFromSegments(pathString.split('.'))

    /**
     * @param {string[]} segments
     * @returns {IPropertyReferences}
     */
    function extractFromSegments(segments) {
      if (segments.length === 0) {
        return ANY
      }
      const segmentName = segments[0]
      return {
        hasProperty: (name) => name === segmentName,
        allProperties: () => new Map([[segmentName, { nodes: [node] }]]),
        getNest: (name) =>
          name === segmentName ? extractFromSegments(segments.slice(1)) : NEVER,
        getNestNodes: () => []
      }
    }
  }

  /**
   * Extract the property references from name literal.
   * @param {Expression} node
   * @returns {IPropertyReferences}
   */
  function extractFromNameLiteral(node) {
    const referenceName =
      node.type === 'Literal' || node.type === 'TemplateLiteral'
        ? utils.getStringLiteralValue(node)
        : null
    return referenceName
      ? {
          hasProperty: (name) => name === referenceName,
          allProperties: () => new Map([[referenceName, { nodes: [node] }]]),
          getNest: (name) => (name === referenceName ? ANY : NEVER),
          getNestNodes: () => []
        }
      : NEVER
  }

  /**
   * Extract the property references from name.
   * @param {string} referenceName
   * @param {Expression|SpreadElement} nameNode
   * @param { () => IPropertyReferences } [getNest]
   * @returns {IPropertyReferences}
   */
  function extractFromName(referenceName, nameNode, getNest) {
    return {
      hasProperty: (name) => name === referenceName,
      allProperties: () => new Map([[referenceName, { nodes: [nameNode] }]]),
      getNest: (name) =>
        name === referenceName ? (getNest ? getNest() : ANY) : NEVER,
      getNestNodes: () => []
    }
  }

  /**
   * Extract the property references from toRef call.
   * @param {CallExpression} node
   * @returns {IPropertyReferences}
   */
  function extractFromToRef(node) {
    const nameNode = node.arguments[1]
    const refName =
      nameNode &&
      (nameNode.type === 'Literal' || nameNode.type === 'TemplateLiteral')
        ? utils.getStringLiteralValue(nameNode)
        : null
    if (!refName) {
      // unknown name
      return ANY
    }
    return extractFromName(refName, nameNode, () =>
      extractFromExpression(node, false).getNest('value')
    )
  }

  /**
   * Extract the property references from toRefs call.
   * @param {CallExpression} node
   * @returns {IPropertyReferences}
   */
  function extractFromToRefs(node) {
    const base = extractFromExpression(node, false)
    return {
      hasProperty: (name, option) => base.hasProperty(name, option),
      allProperties: () => base.allProperties(),
      getNest: (name) => base.getNest(name).getNest('value'),
      getNestNodes: (name) => base.getNest(name).getNestNodes('value')
    }
  }

  /**
   * Extract the property references from VExpressionContainer.
   * @param {VExpressionContainer} node
   * @param {object} [options]
   * @param {boolean} [options.ignoreGlobals]
   * @returns {IPropertyReferences}
   */
  function extractFromVExpressionContainer(node, options) {
    const ignoreGlobals = options && options.ignoreGlobals

    /** @type { (name:string)=>boolean } */
    let ignoreRef = () => false
    if (ignoreGlobals) {
      const globalScope =
        context.getSourceCode().scopeManager.globalScope ||
        context.getSourceCode().scopeManager.scopes[0]

      ignoreRef = (name) => globalScope.set.has(name)
    }
    /** @type {IPropertyReferences[]} */
    const references = []
    for (const id of node.references
      .filter((ref) => ref.variable == null)
      .map((ref) => ref.id)) {
      if (ignoreRef(id.name)) {
        continue
      }
      if (isFunctionalTemplate) {
        if (id.name === 'props') {
          references.push(extractFromExpression(id, true))
        }
      } else {
        const referenceId =
          id.name === '$props' &&
          id.parent.type === 'MemberExpression' &&
          id.parent.property.type === 'Identifier'
            ? id.parent.property
            : id

        references.push(
          extractFromName(referenceId.name, referenceId, () =>
            extractFromExpression(referenceId, true)
          )
        )
      }
    }
    return mergePropertyReferences(references)
  }
  /**
   * Extract the property references from StyleVariablesContext.
   * @param {StyleVariablesContext} ctx
   * @returns {IPropertyReferences}
   */
  function extractFromStyleVariablesContext(ctx) {
    const references = []
    for (const { id } of ctx.references) {
      references.push(
        extractFromName(id.name, id, () => extractFromExpression(id, true))
      )
    }
    return mergePropertyReferences(references)
  }

  return {
    extractFromExpression,
    extractFromPattern,
    extractFromFunctionParam,
    extractFromPath,
    extractFromName,
    extractFromNameLiteral,
    extractFromVExpressionContainer,
    extractFromStyleVariablesContext
  }
}

/**
 * @param {IPropertyReferences[]} references
 * @returns {IPropertyReferences}
 */
function mergePropertyReferences(references) {
  if (references.length === 0) {
    return NEVER
  }
  if (references.length === 1) {
    return references[0]
  }
  return new PropertyReferencesForMerge(references)
}

/**
 * Collects the property references for merge.
 * @implements {IPropertyReferences}
 */
class PropertyReferencesForMerge {
  /**
   * @param {IPropertyReferences[]} references
   */
  constructor(references) {
    this.references = references
  }

  /**
   * @param {string} name
   * @param {IHasPropertyOption} [option]
   */
  hasProperty(name, option) {
    return this.references.some((ref) => ref.hasProperty(name, option))
  }

  allProperties() {
    const result = new Map()
    for (const reference of this.references) {
      for (const [name, { nodes }] of reference.allProperties()) {
        const r = result.get(name)
        if (r) {
          r.nodes = [...new Set([...r.nodes, ...nodes])]
        } else {
          result.set(name, { nodes: [...nodes] })
        }
      }
    }
    return result
  }

  /**
   * @param {string} name
   * @returns {IPropertyReferences}
   */
  getNest(name) {
    /** @type {IPropertyReferences[]} */
    const nest = []
    for (const ref of this.references) {
      if (ref.hasProperty(name)) {
        nest.push(ref.getNest(name))
      }
    }
    return mergePropertyReferences(nest)
  }

  /**
   * @param {string} name
   * @returns {Iterable<NestPropertyNode>}
   */
  *getNestNodes(name) {
    for (const ref of this.references) {
      if (ref.hasProperty(name)) {
        yield* ref.getNestNodes(name)
      }
    }
  }
}
