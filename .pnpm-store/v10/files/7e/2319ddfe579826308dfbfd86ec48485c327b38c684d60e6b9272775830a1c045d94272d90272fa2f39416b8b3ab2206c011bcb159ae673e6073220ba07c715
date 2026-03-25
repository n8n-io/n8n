/**
 * @author Yosuke Ota
 * See LICENSE file in root directory for full license.
 */
'use strict'

module.exports = {
  supported: '>=3.0.0',
  /** @param {RuleContext} context @returns {TemplateListener} */
  createTemplateBodyVisitor(context) {
    return {
      /** @param {VDirectiveKey & { argument: VExpressionContainer | VIdentifier }} node */
      "VAttribute[directive=true] > VDirectiveKey[name.name='model'][argument!=null]"(
        node
      ) {
        context.report({
          node: node.argument,
          messageId: 'forbiddenVModelArgument'
        })
      }
    }
  }
}
