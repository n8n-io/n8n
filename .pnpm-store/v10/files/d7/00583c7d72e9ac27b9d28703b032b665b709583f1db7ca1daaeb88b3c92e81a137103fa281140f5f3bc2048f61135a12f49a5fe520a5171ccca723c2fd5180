/**
 * @author Yosuke Ota
 * See LICENSE file in root directory for full license.
 */
'use strict'

const utils = require('../../utils/index')

module.exports = {
  supported: '>=3.3.0',
  /** @param {RuleContext} context @returns {RuleListener} */
  createScriptVisitor(context) {
    return utils.defineScriptSetupVisitor(context, {
      onDefineSlotsEnter(node) {
        context.report({
          node,
          messageId: 'forbiddenDefineSlots'
        })
      }
    })
  }
}
