// Unless explicitly stated otherwise all files in this repository are licensed under the Apache 2.0 License.
//
// This product includes software developed at Datadog (https://www.datadoghq.com/). Copyright 2021 Datadog, Inc.

const { addHook } = require('../../index.js')
const { strictEqual } = require('assert')

addHook((name, exports) => {
  if (name.match(/something\.m?js/)) {
    const orig = exports.default
    exports.default = function bar () {
      return orig() + 15
    }
  }
})

;(async () => {
  const { default: barMjs } = await import('../fixtures/something.mjs')
  const { default: barJs } = await import('../fixtures/something.js')

  strictEqual(barMjs(), 57)
  strictEqual(barJs(), 57)
})()
