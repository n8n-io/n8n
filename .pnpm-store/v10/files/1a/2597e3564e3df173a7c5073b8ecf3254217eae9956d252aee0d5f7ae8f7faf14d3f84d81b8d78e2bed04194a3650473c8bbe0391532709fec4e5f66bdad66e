/**
 * @author Yosuke Ota
 * See LICENSE file in root directory for full license.
 */
'use strict'

module.exports = {
  supported: '>=3.2.0 || >=2.6.0-beta.1 <=2.6.0-beta.3',
  /** @param {RuleContext} context @returns {TemplateListener} */
  createTemplateBodyVisitor(context) {
    /**
     * Reports `.prop` shorthand node
     * @param { VDirectiveKey & { argument: VIdentifier } } bindPropKey node of `.prop` shorthand
     * @returns {void}
     */
    function reportPropModifierShorthand(bindPropKey) {
      context.report({
        node: bindPropKey,
        messageId: 'forbiddenVBindPropModifierShorthand',
        // fix to use `:x.prop` (downgrade)
        fix: (fixer) =>
          fixer.replaceText(
            bindPropKey,
            `:${bindPropKey.argument.rawName}.prop`
          )
      })
    }

    return {
      "VAttribute[directive=true] > VDirectiveKey[name.name='bind'][name.rawName='.']":
        reportPropModifierShorthand
    }
  }
}
