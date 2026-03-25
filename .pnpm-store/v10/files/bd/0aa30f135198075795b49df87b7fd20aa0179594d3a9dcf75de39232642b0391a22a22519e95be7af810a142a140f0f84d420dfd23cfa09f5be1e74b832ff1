/**
 * @author Yosuke Ota
 * See LICENSE file in root directory for full license.
 */
'use strict'

const utils = require('../../../utils')
/**
 * @typedef {object} SlotVForVariables
 * @property {VForExpression} expr
 * @property {VVariable[]} variables
 */
/**
 * @typedef {object} SlotContext
 * @property {VElement} element
 * @property {VAttribute | VDirective | null} slot
 * @property {VDirective | null} vFor
 * @property {SlotVForVariables | null} slotVForVars
 * @property {string} normalizedName
 */
/**
 * Checks whether the given element can use v-slot.
 * @param {VElement} element
 * @param {SourceCode} sourceCode
 * @param {ParserServices.TokenStore} tokenStore
 */
module.exports = function canConvertToVSlot(element, sourceCode, tokenStore) {
  const ownerElement = element.parent
  if (
    ownerElement.type === 'VDocumentFragment' ||
    !utils.isCustomComponent(ownerElement) ||
    ownerElement.name === 'component'
  ) {
    return false
  }
  const slot = getSlotContext(element, sourceCode)
  if (slot.vFor && !slot.slotVForVars) {
    // E.g., <template v-for="x of xs" #one></template>
    return false
  }
  if (hasSameSlotDirective(ownerElement, slot, sourceCode, tokenStore)) {
    return false
  }
  return true
}
/**
 * @param {VElement} element
 * @param {SourceCode} sourceCode
 * @returns {SlotContext}
 */
function getSlotContext(element, sourceCode) {
  const slot =
    utils.getAttribute(element, 'slot') ||
    utils.getDirective(element, 'bind', 'slot')
  const vFor = utils.getDirective(element, 'for')
  const slotVForVars = getSlotVForVariableIfUsingIterationVars(slot, vFor)

  return {
    element,
    slot,
    vFor,
    slotVForVars,
    normalizedName: getNormalizedName(slot, sourceCode)
  }
}

/**
 * Gets the `v-for` directive and variable that provide the variables used by the given `slot` attribute.
 * @param {VAttribute | VDirective | null} slot The current `slot` attribute node.
 * @param {VDirective | null} [vFor] The current `v-for` directive node.
 * @returns { SlotVForVariables | null } The SlotVForVariables.
 */
function getSlotVForVariableIfUsingIterationVars(slot, vFor) {
  if (!slot || !slot.directive) {
    return null
  }
  const expr =
    vFor && vFor.value && /** @type {VForExpression} */ (vFor.value.expression)
  const variables =
    expr && getUsingIterationVars(slot.value, slot.parent.parent)
  return expr && variables && variables.length > 0 ? { expr, variables } : null
}

/**
 * Gets iterative variables if a given expression node is using iterative variables that the element defined.
 * @param {VExpressionContainer|null} expression The expression node to check.
 * @param {VElement} element The element node which has the expression.
 * @returns {VVariable[]} The expression node is using iteration variables.
 */
function getUsingIterationVars(expression, element) {
  const vars = []
  if (expression && expression.type === 'VExpressionContainer') {
    for (const { variable } of expression.references) {
      if (
        variable != null &&
        variable.kind === 'v-for' &&
        variable.id.range[0] > element.startTag.range[0] &&
        variable.id.range[1] < element.startTag.range[1]
      ) {
        vars.push(variable)
      }
    }
  }
  return vars
}

/**
 * Get the normalized name of a given `slot` attribute node.
 * @param {VAttribute | VDirective | null} slotAttr node of `slot`
 * @param {SourceCode} sourceCode The source code.
 * @returns {string} The normalized name.
 */
function getNormalizedName(slotAttr, sourceCode) {
  if (!slotAttr) {
    return 'default'
  }
  if (!slotAttr.directive) {
    return slotAttr.value ? slotAttr.value.value : 'default'
  }
  return slotAttr.value ? `[${sourceCode.getText(slotAttr.value)}]` : '[null]'
}

/**
 * Checks whether parent element has the same slot as the given slot.
 * @param {VElement} ownerElement The parent element.
 * @param {SlotContext} targetSlot The SlotContext with a slot to check if they are the same.
 * @param {SourceCode} sourceCode
 * @param {ParserServices.TokenStore} tokenStore
 */
function hasSameSlotDirective(
  ownerElement,
  targetSlot,
  sourceCode,
  tokenStore
) {
  for (const group of utils.iterateChildElementsChains(ownerElement)) {
    if (group.includes(targetSlot.element)) {
      continue
    }
    for (const childElement of group) {
      const slot = getSlotContext(childElement, sourceCode)
      if (!targetSlot.slotVForVars || !slot.slotVForVars) {
        if (
          !targetSlot.slotVForVars &&
          !slot.slotVForVars &&
          targetSlot.normalizedName === slot.normalizedName
        ) {
          return true
        }
        continue
      }
      if (
        equalSlotVForVariables(
          targetSlot.slotVForVars,
          slot.slotVForVars,
          tokenStore
        )
      ) {
        return true
      }
    }
  }
  return false
}

/**
 * Determines whether the two given `v-slot` variables are considered to be equal.
 * @param {SlotVForVariables} a First element.
 * @param {SlotVForVariables} b Second element.
 * @param {ParserServices.TokenStore} tokenStore The token store.
 * @returns {boolean} `true` if the elements are considered to be equal.
 */
function equalSlotVForVariables(a, b, tokenStore) {
  if (a.variables.length !== b.variables.length) {
    return false
  }
  if (!equal(a.expr.right, b.expr.right)) {
    return false
  }

  const checkedVarNames = new Set()
  const len = Math.min(a.expr.left.length, b.expr.left.length)
  for (let index = 0; index < len; index++) {
    const aPtn = a.expr.left[index]
    const bPtn = b.expr.left[index]

    const aVar = a.variables.find(
      (v) => aPtn.range[0] <= v.id.range[0] && v.id.range[1] <= aPtn.range[1]
    )
    const bVar = b.variables.find(
      (v) => bPtn.range[0] <= v.id.range[0] && v.id.range[1] <= bPtn.range[1]
    )
    if (aVar && bVar) {
      if (aVar.id.name !== bVar.id.name) {
        return false
      }
      if (!equal(aPtn, bPtn)) {
        return false
      }
      checkedVarNames.add(aVar.id.name)
    } else if (aVar || bVar) {
      return false
    }
  }
  return a.variables.every(
    (v) =>
      checkedVarNames.has(v.id.name) ||
      b.variables.some((bv) => v.id.name === bv.id.name)
  )

  /**
   * Determines whether the two given nodes are considered to be equal.
   * @param {ASTNode} a First node.
   * @param {ASTNode} b Second node.
   * @returns {boolean} `true` if the nodes are considered to be equal.
   */
  function equal(a, b) {
    if (a.type !== b.type) {
      return false
    }
    return utils.equalTokens(a, b, tokenStore)
  }
}
