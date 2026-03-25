// Unless explicitly stated otherwise all files in this repository are licensed under the Apache 2.0 License.
//
// This product includes software developed at Datadog (https://www.datadoghq.com/). Copyright 2021 Datadog, Inc.

const Hook = require('../../index.js')
const { rejects } = require('assert')

Hook((exports, name) => {
  if (name === 'os') {
    Object.defineProperty(exports, 'freemem', {
      get: () => () => 47
    })
  }
})

;(async () => {
  rejects(async () => {
    await import('os')
  })
})()
