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
     * Reports `v-is` node
     * @param {VDirective} vMemoAttr node of `v-is`
     * @returns {void}
     */
    function reportVMemo(vMemoAttr) {
      context.report({
        node: vMemoAttr.key,
        messageId: 'forbiddenVMemo'
      })
    }

    return {
      "VAttribute[directive=true][key.name.name='memo']": reportVMemo
    }
  }
}
