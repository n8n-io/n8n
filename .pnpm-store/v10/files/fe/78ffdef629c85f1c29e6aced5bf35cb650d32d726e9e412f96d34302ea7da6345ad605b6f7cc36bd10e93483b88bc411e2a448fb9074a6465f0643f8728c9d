/**
 * @author Toru Nagashima
 * See LICENSE file in root directory for full license.
 */
'use strict'

const utils = require('../utils')

/**
 * @typedef { { expr: VForExpression, variables: VVariable[] } } VSlotVForVariables
 */

/**
 * Get all `v-slot` directives on a given element.
 * @param {VElement} node The VElement node to check.
 * @returns {VDirective[]} The array of `v-slot` directives.
 */
function getSlotDirectivesOnElement(node) {
  return utils.getDirectives(node, 'slot')
}

/**
 * Get all `v-slot` directives on the children of a given element.
 * @param {VElement} node The VElement node to check.
 * @returns {VDirective[][]}
 * The array of the group of `v-slot` directives.
 * The group bundles `v-slot` directives of element sequence which is connected
 * by `v-if`/`v-else-if`/`v-else`.
 */
function getSlotDirectivesOnChildren(node) {
  /** @type {VDirective[][]} */
  const groups = []
  for (const group of utils.iterateChildElementsChains(node)) {
    const slotDirs = group
      .map((childElement) =>
        childElement.name === 'template'
          ? utils.getDirective(childElement, 'slot')
          : null
      )
      .filter(utils.isDef)
    if (slotDirs.length > 0) {
      groups.push(slotDirs)
    }
  }

  return groups
}

/**
 * Get the normalized name of a given `v-slot` directive node with modifiers after `v-slot:` directive.
 * @param {VDirective} node The `v-slot` directive node.
 * @param {SourceCode} sourceCode The source code.
 * @returns {string} The normalized name.
 */
function getNormalizedName(node, sourceCode) {
  if (node.key.argument == null) {
    return 'default'
  }
  return node.key.modifiers.length === 0
    ? sourceCode.getText(node.key.argument)
    : sourceCode.text.slice(node.key.argument.range[0], node.key.range[1])
}

/**
 * Get all `v-slot` directives which are distributed to the same slot as a given `v-slot` directive node.
 * @param {VDirective[][]} vSlotGroups The result of `getAllNamedSlotElements()`.
 * @param {VDirective} currentVSlot The current `v-slot` directive node.
 * @param {VSlotVForVariables | null} currentVSlotVForVars The current `v-for` variables.
 * @param {SourceCode} sourceCode The source code.
 * @param {ParserServices.TokenStore} tokenStore The token store.
 * @returns {VDirective[][]} The array of the group of `v-slot` directives.
 */
function filterSameSlot(
  vSlotGroups,
  currentVSlot,
  currentVSlotVForVars,
  sourceCode,
  tokenStore
) {
  const currentName = getNormalizedName(currentVSlot, sourceCode)
  return vSlotGroups
    .map((vSlots) =>
      vSlots.filter((vSlot) => {
        if (getNormalizedName(vSlot, sourceCode) !== currentName) {
          return false
        }
        const vForExpr = getVSlotVForVariableIfUsingIterationVars(
          vSlot,
          utils.getDirective(vSlot.parent.parent, 'for')
        )
        if (!currentVSlotVForVars || !vForExpr) {
          return !currentVSlotVForVars && !vForExpr
        }
        if (
          !equalVSlotVForVariables(currentVSlotVForVars, vForExpr, tokenStore)
        ) {
          return false
        }
        //
        return true
      })
    )
    .filter((slots) => slots.length > 0)
}

/**
 * Determines whether the two given `v-slot` variables are considered to be equal.
 * @param {VSlotVForVariables} a First element.
 * @param {VSlotVForVariables} b Second element.
 * @param {ParserServices.TokenStore} tokenStore The token store.
 * @returns {boolean} `true` if the elements are considered to be equal.
 */
function equalVSlotVForVariables(a, b, tokenStore) {
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

/**
 * Gets the `v-for` directive and variable that provide the variables used by the given` v-slot` directive.
 * @param {VDirective} vSlot The current `v-slot` directive node.
 * @param {VDirective | null} [vFor] The current `v-for` directive node.
 * @returns { VSlotVForVariables | null } The VSlotVForVariable.
 */
function getVSlotVForVariableIfUsingIterationVars(vSlot, vFor) {
  const expr =
    vFor && vFor.value && /** @type {VForExpression} */ (vFor.value.expression)
  const variables =
    expr && getUsingIterationVars(vSlot.key.argument, vSlot.parent.parent)
  return expr && variables && variables.length > 0 ? { expr, variables } : null
}

/**
 * Gets iterative variables if a given argument node is using iterative variables that the element defined.
 * @param {VExpressionContainer|VIdentifier|null} argument The argument node to check.
 * @param {VElement} element The element node which has the argument.
 * @returns {VVariable[]} The argument node is using iteration variables.
 */
function getUsingIterationVars(argument, element) {
  const vars = []
  if (argument && argument.type === 'VExpressionContainer') {
    for (const { variable } of argument.references) {
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
 * Check whether a given argument node is using an scope variable that the directive defined.
 * @param {VDirective} vSlot The `v-slot` directive to check.
 * @returns {boolean} `true` if that argument node is using a scope variable the directive defined.
 */
function isUsingScopeVar(vSlot) {
  const argument = vSlot.key.argument
  const value = vSlot.value

  if (argument && value && argument.type === 'VExpressionContainer') {
    for (const { variable } of argument.references) {
      if (
        variable != null &&
        variable.kind === 'scope' &&
        variable.id.range[0] > value.range[0] &&
        variable.id.range[1] < value.range[1]
      ) {
        return true
      }
    }
  }
  return false
}

/**
 * If `allowModifiers` option is set to `true`, check whether a given argument node has invalid modifiers like `v-slot.foo`.
 * Otherwise, check whether a given argument node has at least one modifier.
 * @param {VDirective} vSlot The `v-slot` directive to check.
 * @param {boolean} allowModifiers `allowModifiers` option in context.
 * @return {boolean} `true` if that argument node has invalid modifiers like `v-slot.foo`.
 */
function hasInvalidModifiers(vSlot, allowModifiers) {
  return allowModifiers
    ? vSlot.key.argument == null && vSlot.key.modifiers.length > 0
    : vSlot.key.modifiers.length > 0
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'enforce valid `v-slot` directives',
      categories: ['vue3-essential', 'vue2-essential'],
      url: 'https://eslint.vuejs.org/rules/valid-v-slot.html'
    },
    fixable: null,
    schema: [
      {
        type: 'object',
        properties: {
          allowModifiers: {
            type: 'boolean'
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      ownerMustBeCustomElement:
        "'v-slot' directive must be owned by a custom element, but '{{name}}' is not.",
      namedSlotMustBeOnTemplate:
        "Named slots must use '<template>' on a custom element.",
      defaultSlotMustBeOnTemplate:
        "Default slot must use '<template>' on a custom element when there are other named slots.",
      disallowDuplicateSlotsOnElement:
        "An element cannot have multiple 'v-slot' directives.",
      disallowDuplicateSlotsOnChildren:
        "An element cannot have multiple '<template>' elements which are distributed to the same slot.",
      disallowArgumentUseSlotParams:
        "Dynamic argument of 'v-slot' directive cannot use that slot parameter.",
      disallowAnyModifier: "'v-slot' directive doesn't support any modifier.",
      requireAttributeValue:
        "'v-slot' directive on a custom element requires that attribute value."
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    const sourceCode = context.getSourceCode()
    const tokenStore =
      sourceCode.parserServices.getTemplateBodyTokenStore &&
      sourceCode.parserServices.getTemplateBodyTokenStore()
    const options = context.options[0] || {}
    const allowModifiers = options.allowModifiers === true

    return utils.defineTemplateBodyVisitor(context, {
      /** @param {VDirective} node */
      "VAttribute[directive=true][key.name.name='slot']"(node) {
        const isDefaultSlot =
          node.key.argument == null ||
          (node.key.argument.type === 'VIdentifier' &&
            node.key.argument.name === 'default')
        const element = node.parent.parent
        const parentElement = element.parent
        const ownerElement =
          element.name === 'template' ? parentElement : element
        if (ownerElement.type === 'VDocumentFragment') {
          return
        }
        const vSlotsOnElement = getSlotDirectivesOnElement(element)
        const vSlotGroupsOnChildren = getSlotDirectivesOnChildren(ownerElement)

        // Verify location.
        if (!utils.isCustomComponent(ownerElement)) {
          context.report({
            node,
            messageId: 'ownerMustBeCustomElement',
            data: { name: ownerElement.rawName }
          })
        }
        if (!isDefaultSlot && element.name !== 'template') {
          context.report({
            node,
            messageId: 'namedSlotMustBeOnTemplate'
          })
        }
        if (ownerElement === element && vSlotGroupsOnChildren.length > 0) {
          context.report({
            node,
            messageId: 'defaultSlotMustBeOnTemplate'
          })
        }

        // Verify duplication.
        if (vSlotsOnElement.length >= 2 && vSlotsOnElement[0] !== node) {
          // E.g., <my-component #one #two>
          context.report({
            node,
            messageId: 'disallowDuplicateSlotsOnElement'
          })
        }
        if (ownerElement === parentElement) {
          const vFor = utils.getDirective(element, 'for')
          const vSlotVForVar = getVSlotVForVariableIfUsingIterationVars(
            node,
            vFor
          )
          const vSlotGroupsOfSameSlot = filterSameSlot(
            vSlotGroupsOnChildren,
            node,
            vSlotVForVar,
            sourceCode,
            tokenStore
          )
          if (
            vSlotGroupsOfSameSlot.length >= 2 &&
            !vSlotGroupsOfSameSlot[0].includes(node)
          ) {
            // E.g., <template #one></template>
            //       <template #one></template>
            context.report({
              node,
              messageId: 'disallowDuplicateSlotsOnChildren'
            })
          }
          if (vFor && !vSlotVForVar) {
            // E.g., <template v-for="x of xs" #one></template>
            context.report({
              node,
              messageId: 'disallowDuplicateSlotsOnChildren'
            })
          }
        }

        // Verify argument.
        if (isUsingScopeVar(node)) {
          context.report({
            node,
            messageId: 'disallowArgumentUseSlotParams'
          })
        }

        // Verify modifiers.
        if (hasInvalidModifiers(node, allowModifiers)) {
          // E.g., <template v-slot.foo>
          context.report({
            node,
            loc: {
              start: node.key.modifiers[0].loc.start,
              end: node.key.modifiers[node.key.modifiers.length - 1].loc.end
            },
            messageId: 'disallowAnyModifier'
          })
        }

        // Verify value.
        if (
          ownerElement === element &&
          isDefaultSlot &&
          (!node.value ||
            utils.isEmptyValueDirective(node, context) ||
            utils.isEmptyExpressionValueDirective(node, context))
        ) {
          context.report({
            node,
            messageId: 'requireAttributeValue'
          })
        }
      }
    })
  }
}
