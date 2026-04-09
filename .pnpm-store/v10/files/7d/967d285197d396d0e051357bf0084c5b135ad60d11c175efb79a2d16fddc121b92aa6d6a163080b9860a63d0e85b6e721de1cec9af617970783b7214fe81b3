import { test, describe } from 'node:test'
import assert from 'node:assert'

import DefaultFastifyOtelInstrumentation, { FastifyOtelInstrumentation } from '../index.js'

describe('Interface', () => {
  test('should Have a default export', t => {
    assert.equal(DefaultFastifyOtelInstrumentation.name, 'FastifyOtelInstrumentation', 'Default export works')
    assert.equal(FastifyOtelInstrumentation.name, 'FastifyOtelInstrumentation', 'Named export works')
  })
})
