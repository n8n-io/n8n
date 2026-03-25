/**
 * @author Yosuke Ota
 * See LICENSE file in root directory for full license.
 */
'use strict'
module.exports = {
  supported: '>=3.1.0',
  /** @param {RuleContext} context @returns {TemplateListener} */
  createTemplateBodyVisitor(context) {
    return {
      /** @param {VAttribute} node */
      "VAttribute[directive=false][key.name='is']"(node) {
        if (!node.value) {
          return
        }
        if (node.value.value.startsWith('vue:')) {
          context.report({
            node: node.value,
            messageId: 'forbiddenIsAttributeWithVuePrefix'
          })
        }
      }
    }
  }
}
