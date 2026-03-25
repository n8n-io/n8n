// Unless explicitly stated otherwise all files in this repository are licensed under the Apache 2.0 License.
//
// This product includes software developed at Datadog (https://www.datadoghq.com/). Copyright 2021 Datadog, Inc.

import { addHook } from '../../index.js'
import barMjs from '../fixtures/something.mjs'
import barJs from '../fixtures/something.js'
import { strictEqual } from 'assert'

addHook((name, exports) => {
  if (name.match(/something\.m?js/)) {
    const orig = exports.default
    exports.default = function bar () {
      return orig() + 15
    }
  }
})

strictEqual(barMjs(), 57)
strictEqual(barJs(), 57)
