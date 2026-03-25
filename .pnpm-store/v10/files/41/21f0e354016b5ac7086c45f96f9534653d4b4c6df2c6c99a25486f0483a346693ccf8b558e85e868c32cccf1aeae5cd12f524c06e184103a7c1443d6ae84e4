/**
 * @author Yosuke Ota
 */
'use strict'

const { wrapStylisticOrCoreRule } = require('../utils')

// eslint-disable-next-line internal/no-invalid-meta
module.exports = wrapStylisticOrCoreRule('comma-style', {
  create(_context, { baseHandlers }) {
    return {
      VSlotScopeExpression(node) {
        if (baseHandlers.FunctionExpression) {
          // @ts-expect-error -- Process params of VSlotScopeExpression as FunctionExpression.
          baseHandlers.FunctionExpression(node)
        }
      }
    }
  }
})
