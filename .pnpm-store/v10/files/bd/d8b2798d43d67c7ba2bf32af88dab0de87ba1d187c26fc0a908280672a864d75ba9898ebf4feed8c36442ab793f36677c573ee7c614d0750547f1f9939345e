/**
 * @author Yosuke Ota
 * See LICENSE file in root directory for full license.
 */
'use strict'

const { getStyleVariablesContext } = require('../../utils/style-variables')

module.exports = {
  supported: '>=3.0.3 || >=2.7.0 <3.0.0',
  /** @param {RuleContext} context @returns {TemplateListener} */
  createScriptVisitor(context) {
    const styleVars = getStyleVariablesContext(context)
    if (!styleVars) {
      return {}
    }
    return {
      Program() {
        for (const vBind of styleVars.vBinds) {
          context.report({
            node: vBind,
            messageId: 'forbiddenStyleCssVarsInjection'
          })
        }
      }
    }
  }
}
