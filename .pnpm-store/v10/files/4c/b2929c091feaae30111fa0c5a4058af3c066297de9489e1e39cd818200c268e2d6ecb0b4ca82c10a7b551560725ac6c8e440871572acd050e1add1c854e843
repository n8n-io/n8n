// Unless explicitly stated otherwise all files in this repository are licensed under the Apache 2.0 License.
//
// This product includes software developed at Datadog (https://www.datadoghq.com/). Copyright 2021 Datadog, Inc.

import { addHook } from '../../index.js'
import { foo as fooMjs } from '../fixtures/something.mjs'
import { foo as fooJs } from '../fixtures/something.js'
import { freemem } from 'os'
import { strictEqual } from 'assert'

addHook((name, exports) => {
  if (name.match(/something\.m?js/)) {
    exports.foo += 15
  }
  if (name === 'node:os') {
    Object.defineProperty(exports, 'freemem', {
      value: () => 47
    })
  }
})

strictEqual(fooMjs, 57)
strictEqual(fooJs, 57)
strictEqual(freemem(), 47)
