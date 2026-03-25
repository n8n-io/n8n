const {
  isTypeNode,
  extractRuntimeProps,
  isTSTypeLiteral,
  isTSTypeLiteralOrTSFunctionType,
  extractRuntimeEmits,
  flattenTypeNodes,
  isTSInterfaceBody,
  extractRuntimeSlots
} = require('./ts-ast')
const {
  getComponentPropsFromTypeDefineTypes,
  getComponentEmitsFromTypeDefineTypes,
  getComponentSlotsFromTypeDefineTypes
} = require('./ts-types')

/**
 * @typedef {import('@typescript-eslint/types').TSESTree.TypeNode} TSESTreeTypeNode
 */
/**
 * @typedef {import('../index').ComponentTypeProp} ComponentTypeProp
 * @typedef {import('../index').ComponentInferTypeProp} ComponentInferTypeProp
 * @typedef {import('../index').ComponentUnknownProp} ComponentUnknownProp
 * @typedef {import('../index').ComponentTypeEmit} ComponentTypeEmit
 * @typedef {import('../index').ComponentInferTypeEmit} ComponentInferTypeEmit
 * @typedef {import('../index').ComponentUnknownEmit} ComponentUnknownEmit
 * @typedef {import('../index').ComponentTypeSlot} ComponentTypeSlot
 * @typedef {import('../index').ComponentInferTypeSlot} ComponentInferTypeSlot
 * @typedef {import('../index').ComponentUnknownSlot} ComponentUnknownSlot
 */

module.exports = {
  isTypeNode,
  getComponentPropsFromTypeDefine,
  getComponentEmitsFromTypeDefine,
  getComponentSlotsFromTypeDefine
}

/**
 * Get all props by looking at all component's properties
 * @param {RuleContext} context The ESLint rule context object.
 * @param {TypeNode} propsNode Type with props definition
 * @return {(ComponentTypeProp|ComponentInferTypeProp|ComponentUnknownProp)[]} Array of component props
 */
function getComponentPropsFromTypeDefine(context, propsNode) {
  /** @type {(ComponentTypeProp|ComponentInferTypeProp|ComponentUnknownProp)[]} */
  const result = []
  for (const defNode of flattenTypeNodes(
    context,
    /** @type {TSESTreeTypeNode} */ (propsNode)
  )) {
    if (isTSInterfaceBody(defNode) || isTSTypeLiteral(defNode)) {
      result.push(...extractRuntimeProps(context, defNode))
    } else {
      result.push(
        ...getComponentPropsFromTypeDefineTypes(
          context,
          /** @type {TypeNode} */ (defNode)
        )
      )
    }
  }
  return result
}

/**
 * Get all emits by looking at all component's properties
 * @param {RuleContext} context The ESLint rule context object.
 * @param {TypeNode} emitsNode Type with emits definition
 * @return {(ComponentTypeEmit|ComponentInferTypeEmit|ComponentUnknownEmit)[]} Array of component emits
 */
function getComponentEmitsFromTypeDefine(context, emitsNode) {
  /** @type {(ComponentTypeEmit|ComponentInferTypeEmit|ComponentUnknownEmit)[]} */
  const result = []
  for (const defNode of flattenTypeNodes(
    context,
    /** @type {TSESTreeTypeNode} */ (emitsNode)
  )) {
    if (
      isTSInterfaceBody(defNode) ||
      isTSTypeLiteralOrTSFunctionType(defNode)
    ) {
      result.push(...extractRuntimeEmits(defNode))
    } else {
      result.push(
        ...getComponentEmitsFromTypeDefineTypes(
          context,
          /** @type {TypeNode} */ (defNode)
        )
      )
    }
  }
  return result
}

/**
 * Get all slots by looking at all component's properties
 * @param {RuleContext} context The ESLint rule context object.
 * @param {TypeNode} slotsNode Type with slots definition
 * @return {(ComponentTypeSlot|ComponentInferTypeSlot|ComponentUnknownSlot)[]} Array of component slots
 */
function getComponentSlotsFromTypeDefine(context, slotsNode) {
  /** @type {(ComponentTypeSlot|ComponentInferTypeSlot|ComponentUnknownSlot)[]} */
  const result = []
  for (const defNode of flattenTypeNodes(
    context,
    /** @type {TSESTreeTypeNode} */ (slotsNode)
  )) {
    if (isTSInterfaceBody(defNode) || isTSTypeLiteral(defNode)) {
      result.push(...extractRuntimeSlots(defNode))
    } else {
      result.push(
        ...getComponentSlotsFromTypeDefineTypes(
          context,
          /** @type {TypeNode} */ (defNode)
        )
      )
    }
  }
  return result
}
