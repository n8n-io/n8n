/**
 * @author Yosuke Ota
 * See LICENSE file in root directory for full license.
 */
'use strict'
module.exports = {
  supported: '>=2.6.0',
  /** @param {RuleContext} context @returns {TemplateListener} */
  createTemplateBodyVisitor(context) {
    /**
     * Reports dynamic argument node
     * @param {VExpressionContainer} dynamicArgument node of dynamic argument
     * @returns {void}
     */
    function reportDynamicArgument(dynamicArgument) {
      context.report({
        node: dynamicArgument,
        messageId: 'forbiddenDynamicDirectiveArguments'
      })
    }

    return {
      'VAttribute[directive=true] > VDirectiveKey > VExpressionContainer':
        reportDynamicArgument
    }
  }
}
