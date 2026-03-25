// Unless explicitly stated otherwise all files in this repository are licensed under the Apache 2.0 License.
//
// This product includes software developed at Datadog (https://www.datadoghq.com/). Copyright 2021 Datadog, Inc.

import Hook from '../../index.js'
import jsonMjs from '../fixtures/json.mjs'
import { strictEqual } from 'assert'

Hook((exports, name) => {
  if (name.match(/json\.mjs/)) {
    exports.default.data += '-dawg'
  }
})

strictEqual(jsonMjs.data, 'dog-dawg')
