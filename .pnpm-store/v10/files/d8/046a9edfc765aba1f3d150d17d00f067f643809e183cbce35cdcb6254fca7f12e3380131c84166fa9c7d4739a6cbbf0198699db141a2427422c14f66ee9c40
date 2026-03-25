// Unless explicitly stated otherwise all files in this repository are licensed under the Apache 2.0 License.
//
// This product includes software developed at Datadog (https://www.datadoghq.com/). Copyright 2021 Datadog, Inc.

import { spawn } from 'child_process'
import { strictEqual } from 'assert'

const nodeProcess = spawn('node', [
  '--loader',
  './hook.mjs',
  './test/fixtures/cyclical-a.mjs'
])

// expected output should be 'testB\ntestA' but the hook fails when running against files
// with cylical dependencies
const expectedOutput = 'testB\ntestA'
let stdout = ''
let stderr = ''

nodeProcess.stdout.on('data', (data) => {
  stdout += data.toString()
})

nodeProcess.stderr.on('data', (data) => {
  stderr += data.toString()
})

nodeProcess.on('close', (code) => {
  // assert that the hook fails with a non-zero exit code
  strictEqual(code === 1 || code === 13, true)

  // satisfy linter complaining about unused variables
  strictEqual(expectedOutput, expectedOutput)
  strictEqual(typeof stdout, 'string')
  strictEqual(typeof stderr, 'string')
})
