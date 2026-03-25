/**
 * @author Yosuke Ota
 */
'use strict'

const { wrapStylisticOrCoreRule } = require('../utils')

// eslint-disable-next-line internal/no-invalid-meta
module.exports = wrapStylisticOrCoreRule(
  {
    core: 'func-call-spacing',
    stylistic: 'function-call-spacing',
    vue: 'func-call-spacing'
  },
  {
    skipDynamicArguments: true,
    applyDocument: true
  }
)
