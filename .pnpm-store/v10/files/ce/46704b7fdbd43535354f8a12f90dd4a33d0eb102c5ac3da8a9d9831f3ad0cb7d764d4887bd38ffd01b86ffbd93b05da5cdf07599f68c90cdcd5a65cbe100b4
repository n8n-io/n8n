// Unless explicitly stated otherwise all files in this repository are licensed under the Apache 2.0 License.
//
// This product includes software developed at Datadog (https://www.datadoghq.com/). Copyright 2021 Datadog, Inc.

const Hook = require('../../index.js')
const { strictEqual } = require('assert')

Hook((exports, name) => {
  if (name.match(/something.js/)) {
    const orig = exports.default
    exports.default = function bar () {
      return orig() + 15
    }
  }
  if (name.match(/something.mjs/)) {
    const orig = exports.default
    return function bar () {
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
