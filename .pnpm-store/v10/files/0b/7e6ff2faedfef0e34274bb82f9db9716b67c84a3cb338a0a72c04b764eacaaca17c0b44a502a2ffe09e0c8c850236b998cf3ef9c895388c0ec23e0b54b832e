/**
 * @author Yosuke Ota
 * See LICENSE file in root directory for full license.
 */
'use strict'

const utils = require('../../utils')

module.exports = {
  supported: '>=3.4.0',
  /** @param {RuleContext} context @returns {TemplateListener} */
  createTemplateBodyVisitor(context) {
    /**
     * Verify the directive node
     * @param {VDirective} node The directive node to check
     * @returns {void}
     */
    function checkDirective(node) {
      if (utils.isVBindSameNameShorthand(node)) {
        context.report({
          node,
          messageId: 'forbiddenVBindSameNameShorthand',
          // fix to use `:x="x"` (downgrade)
          fix: (fixer) =>
            fixer.insertTextAfter(node, `="${node.value.expression.name}"`)
        })
      }
    }

    return {
      "VAttribute[directive=true][key.name.name='bind']": checkDirective
    }
  }
}
