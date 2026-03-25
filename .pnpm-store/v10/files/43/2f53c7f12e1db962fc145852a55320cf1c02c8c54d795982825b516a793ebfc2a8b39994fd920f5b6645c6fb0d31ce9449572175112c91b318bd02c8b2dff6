/**
 * @author Yosuke Ota
 * See LICENSE file in root directory for full license.
 */
'use strict'

/**
 * Checks whether the given node can convert to the `slot`.
 * @param {VDirective} vSlotAttr node of `v-slot`
 * @returns {boolean} `true` if the given node can convert to the `slot`
 */
function canConvertToSlot(vSlotAttr) {
  return vSlotAttr.parent.parent.name === 'template'
}

module.exports = {
  supported: '>=2.6.0',
  /** @param {RuleContext} context @returns {TemplateListener} */
  createTemplateBodyVisitor(context) {
    const sourceCode = context.getSourceCode()

    /**
     * Convert to `slot` and `slot-scope`.
     * @param {RuleFixer} fixer fixer
     * @param {VDirective} vSlotAttr node of `v-slot`
     * @returns {null|Fix} fix data
     */
    function fixVSlotToSlot(fixer, vSlotAttr) {
      const key = vSlotAttr.key
      if (key.modifiers.length > 0) {
        // unknown modifiers
        return null
      }

      const attrs = []
      const argument = key.argument
      if (argument) {
        if (argument.type === 'VIdentifier') {
          const name = argument.rawName
          attrs.push(`slot="${name}"`)
        } else if (
          argument.type === 'VExpressionContainer' &&
          argument.expression
        ) {
          const expression = sourceCode.getText(argument.expression)
          attrs.push(`:slot="${expression}"`)
        } else {
          // unknown or syntax error
          return null
        }
      }
      const scopedValueNode = vSlotAttr.value
      if (scopedValueNode) {
        attrs.push(`slot-scope=${sourceCode.getText(scopedValueNode)}`)
      }
      if (attrs.length === 0) {
        attrs.push('slot') // useless
      }
      return fixer.replaceText(vSlotAttr, attrs.join(' '))
    }
    /**
     * Reports `v-slot` node
     * @param {VDirective} vSlotAttr node of `v-slot`
     * @returns {void}
     */
    function reportVSlot(vSlotAttr) {
      context.report({
        node: vSlotAttr.key,
        messageId: 'forbiddenVSlot',
        // fix to use `slot` (downgrade)
        fix(fixer) {
          if (!canConvertToSlot(vSlotAttr)) {
            return null
          }
          return fixVSlotToSlot(fixer, vSlotAttr)
        }
      })
    }

    return {
      "VAttribute[directive=true][key.name.name='slot']": reportVSlot
    }
  }
}
