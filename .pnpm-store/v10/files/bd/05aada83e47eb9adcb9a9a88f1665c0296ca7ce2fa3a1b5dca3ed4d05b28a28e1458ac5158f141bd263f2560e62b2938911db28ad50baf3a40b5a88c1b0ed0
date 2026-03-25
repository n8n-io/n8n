// Unless explicitly stated otherwise all files in this repository are licensed under the Apache 2.0 License.
//
// This product includes software developed at Datadog (https://www.datadoghq.com/). Copyright 2021 Datadog, Inc.

import Hook from '../../index.js'
import { foo as fooMjs } from '../fixtures/something.mjs'
import { foo as fooJs } from '../fixtures/something.js'
import { freemem } from 'os'
import { strictEqual } from 'assert'

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

strictEqual(fooMjs, 57)
strictEqual(fooJs, 57)
strictEqual(freemem(), 47)
