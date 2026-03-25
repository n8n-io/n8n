// Unless explicitly stated otherwise all files in this repository are licensed under the Apache 2.0 License.
//
// This product includes software developed at Datadog (https://www.datadoghq.com/). Copyright 2021 Datadog, Inc.

const { Hook } = require('../../index.js')
const { strictEqual } = require('assert')

Hook((exports, name) => {
  if (name.match(/something\.m?js/)) {
    exports.foo += 15
  }
  if (name === 'os') {
    Object.defineProperty(exports, 'freemem', {
      value: () => 47
    })
  }
})

;(async () => {
  const { foo: fooMjs } = await import('../fixtures/something.mjs')
  const { foo: fooJs } = await import('../fixtures/something.js')
  const { freemem } = await import('os')

  strictEqual(fooMjs, 57)
  strictEqual(fooJs, 57)
  strictEqual(freemem(), 47)
})()
