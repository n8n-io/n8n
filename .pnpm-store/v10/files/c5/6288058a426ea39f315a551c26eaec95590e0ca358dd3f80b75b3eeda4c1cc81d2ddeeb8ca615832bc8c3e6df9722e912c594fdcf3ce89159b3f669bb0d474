/**
 * @author Yosuke Ota
 * See LICENSE file in root directory for full license.
 */
'use strict'

const canConvertToVSlot = require('./utils/can-convert-to-v-slot')
const casing = require('../../utils/casing')

module.exports = {
  deprecated: '2.6.0',
  supported: '<3.0.0',
  /** @param {RuleContext} context @returns {TemplateListener} */
  createTemplateBodyVisitor(context) {
    const options = context.options[0] || {}
    /** @type {Set<string>} */
    const ignore = new Set(options.ignore)

    const sourceCode = context.getSourceCode()
    const tokenStore =
      sourceCode.parserServices.getTemplateBodyTokenStore &&
      sourceCode.parserServices.getTemplateBodyTokenStore()

    /**
     * Checks whether the given node can convert to the `v-slot`.
     * @param {VAttribute} slotAttr node of `slot`
     * @returns {boolean} `true` if the given node can convert to the `v-slot`
     */
    function canConvertFromSlotToVSlot(slotAttr) {
      if (!canConvertToVSlot(slotAttr.parent.parent, sourceCode, tokenStore)) {
        return false
      }
      if (!slotAttr.value) {
        return true
      }
      const slotName = slotAttr.value.value
      // If other than alphanumeric, underscore and hyphen characters are included it can not be converted.
      return !/[^\w\-]/u.test(slotName)
    }

    /**
     * Checks whether the given node can convert to the `v-slot`.
     * @param {VDirective} slotAttr node of `v-bind:slot`
     * @returns {boolean} `true` if the given node can convert to the `v-slot`
     */
    function canConvertFromVBindSlotToVSlot(slotAttr) {
      if (!canConvertToVSlot(slotAttr.parent.parent, sourceCode, tokenStore)) {
        return false
      }

      if (!slotAttr.value) {
        return true
      }

      if (!slotAttr.value.expression) {
        // parse error or empty expression
        return false
      }

      return slotAttr.value.expression.type === 'Identifier'
    }

    /**
     * Convert to `v-slot`.
     * @param {RuleFixer} fixer fixer
     * @param {VAttribute|VDirective} slotAttr node of `slot`
     * @param {string | null} slotName name of `slot`
     * @param {boolean} vBind `true` if `slotAttr` is `v-bind:slot`
     * @returns {IterableIterator<Fix>} fix data
     */
    function* fixSlotToVSlot(fixer, slotAttr, slotName, vBind) {
      const startTag = slotAttr.parent
      const scopeAttr = startTag.attributes.find(
        (attr) =>
          attr.directive === true &&
          attr.key.name &&
          (attr.key.name.name === 'slot-scope' ||
            attr.key.name.name === 'scope')
      )
      let nameArgument = ''
      if (slotName) {
        nameArgument = vBind ? `:[${slotName}]` : `:${slotName}`
      }
      const scopeValue =
        scopeAttr && scopeAttr.value
          ? `=${sourceCode.getText(scopeAttr.value)}`
          : ''

      const replaceText = `v-slot${nameArgument}${scopeValue}`

      const element = startTag.parent
      if (element.name === 'template') {
        yield fixer.replaceText(slotAttr || scopeAttr, replaceText)
        if (slotAttr && scopeAttr) {
          yield fixer.remove(scopeAttr)
        }
      } else {
        yield fixer.remove(slotAttr || scopeAttr)
        if (slotAttr && scopeAttr) {
          yield fixer.remove(scopeAttr)
        }

        const vFor = startTag.attributes.find(
          (attr) => attr.directive && attr.key.name.name === 'for'
        )
        const vForText = vFor ? `${sourceCode.getText(vFor)} ` : ''
        if (vFor) {
          yield fixer.remove(vFor)
        }

        yield fixer.insertTextBefore(
          element,
          `<template ${vForText}${replaceText}>\n`
        )
        yield fixer.insertTextAfter(element, `\n</template>`)
      }
    }
    /**
     * Reports `slot` node
     * @param {VAttribute} slotAttr node of `slot`
     * @returns {void}
     */
    function reportSlot(slotAttr) {
      const componentName = slotAttr.parent.parent.rawName
      if (
        ignore.has(componentName) ||
        ignore.has(casing.pascalCase(componentName)) ||
        ignore.has(casing.kebabCase(componentName))
      ) {
        return
      }

      context.report({
        node: slotAttr.key,
        messageId: 'forbiddenSlotAttribute',
        // fix to use `v-slot`
        *fix(fixer) {
          if (!canConvertFromSlotToVSlot(slotAttr)) {
            return
          }
          const slotName = slotAttr.value && slotAttr.value.value
          yield* fixSlotToVSlot(fixer, slotAttr, slotName, false)
        }
      })
    }
    /**
     * Reports `v-bind:slot` node
     * @param {VDirective} slotAttr node of `v-bind:slot`
     * @returns {void}
     */
    function reportVBindSlot(slotAttr) {
      context.report({
        node: slotAttr.key,
        messageId: 'forbiddenSlotAttribute',
        // fix to use `v-slot`
        *fix(fixer) {
          if (!canConvertFromVBindSlotToVSlot(slotAttr)) {
            return
          }
          const slotName =
            slotAttr.value &&
            slotAttr.value.expression &&
            sourceCode.getText(slotAttr.value.expression).trim()
          yield* fixSlotToVSlot(fixer, slotAttr, slotName, true)
        }
      })
    }

    return {
      "VAttribute[directive=false][key.name='slot']": reportSlot,
      "VAttribute[directive=true][key.name.name='bind'][key.argument.name='slot']":
        reportVBindSlot
    }
  }
}
