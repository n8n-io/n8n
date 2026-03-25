/**
 * @author Yosuke Ota
 * See LICENSE file in root directory for full license.
 */
'use strict'

module.exports = {
  supported: '>=3.2.0',
  /** @param {RuleContext} context @returns {TemplateListener} */
  createTemplateBodyVisitor(context) {
    /**
     * Reports `v-bind.attr` node
     * @param { VIdentifier } mod node of `v-bind.attr`
     * @returns {void}
     */
    function report(mod) {
      context.report({
        node: mod,
        messageId: 'forbiddenVBindAttrModifier'
      })
    }

    return {
      "VAttribute[directive=true][key.name.name='bind']"(node) {
        const attrMod = node.key.modifiers.find((m) => m.name === 'attr')
        if (attrMod) {
          report(attrMod)
        }
      }
    }
  }
}
