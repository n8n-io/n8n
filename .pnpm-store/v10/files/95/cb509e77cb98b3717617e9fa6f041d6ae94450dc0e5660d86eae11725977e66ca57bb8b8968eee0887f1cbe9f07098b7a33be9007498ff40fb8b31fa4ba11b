// Unless explicitly stated otherwise all files in this repository are licensed under the Apache 2.0 License.
//
// This product includes software developed at Datadog (https://www.datadoghq.com/). Copyright 2021 Datadog, Inc.

import { addHook, removeHook } from '../../index.js'
import { strictEqual } from 'assert'

const hook = (name, exports) => {
  if (name.match(/something\.m?js/)) {
    exports.foo += 15
  }
}

addHook(hook)

;(async () => {
  const { foo: fooMjs } = await import('../fixtures/something.mjs')

  removeHook(hook)

  const { foo: fooJs } = await import('../fixtures/something.js')

  strictEqual(fooMjs, 57)
  strictEqual(fooJs, 42)
})()
