// Unless explicitly stated otherwise all files in this repository are licensed under the Apache 2.0 License.
//
// This product includes software developed at Datadog (https://www.datadoghq.com/). Copyright 2021 Datadog, Inc.

import { addHook } from '../../index.js'

addHook(() => {})

;(async () => {
  await import("../fixtures/something.mjs#*/'/*';eval('process.exit\x281\x29\x0A')")
})()
