/**
 * @author Yosuke Ota
 * See LICENSE file in root directory for full license.
 */
'use strict'
module.exports = {
  deprecated: '3.1.0',
  supported: '>=3.0.0',
  /** @param {RuleContext} context @returns {TemplateListener} */
  createTemplateBodyVisitor(context) {
    /**
     * Reports `v-is` node
     * @param {VDirective} vIsAttr node of `v-is`
     * @returns {void}
     */
    function reportVIs(vIsAttr) {
      context.report({
        node: vIsAttr.key,
        messageId: 'forbiddenVIs'
      })
    }

    return {
      "VAttribute[directive=true][key.name.name='is']": reportVIs
    }
  }
}
