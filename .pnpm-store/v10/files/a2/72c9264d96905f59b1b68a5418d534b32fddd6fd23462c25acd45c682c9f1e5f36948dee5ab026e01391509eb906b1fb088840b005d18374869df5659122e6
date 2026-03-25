/**
 * @author Toru Nagashima
 * @copyright 2016 Toru Nagashima. All rights reserved.
 * See LICENSE file in root directory for full license.
 */
'use strict'

// ------------------------------------------------------------------------------
// Requirements
// ------------------------------------------------------------------------------

const assert = require('assert').strict
const nodeApi = require('../lib')
const spawnWithKill = require('./lib/spawn-with-kill')
const { delay, result, removeResult, runAll, runSeq } = require('./lib/util')

// ------------------------------------------------------------------------------
// Test
// ------------------------------------------------------------------------------

describe('[sequencial] npm-run-all', () => {
  before(() => process.chdir('test-workspace'))
  after(() => process.chdir('..'))

  beforeEach(() => delay(1000).then(removeResult))

  describe('should run tasks sequentially:', () => {
    it('Node API', async () => {
      const results = await nodeApi(['test-task:append a', 'test-task:append b'], { parallel: false })
      assert(results.length === 2)
      assert(results[0].name === 'test-task:append a')
      assert(results[0].code === 0)
      assert(results[1].name === 'test-task:append b')
      assert(results[1].code === 0)
      assert(result() === 'aabb')
    })

    it('npm-run-all command', async () => {
      await runAll(['test-task:append a', 'test-task:append b'])
      assert(result() === 'aabb')
    })

    it('run-s command', async () => {
      await runSeq(['test-task:append a', 'test-task:append b'])
      assert(result() === 'aabb')
    })
  })

  describe('should not run subsequent tasks if a task exited with a non-zero code:', () => {
    it('Node API', async () => {
      try {
        await nodeApi(['test-task:append2 a', 'test-task:error', 'test-task:append2 b'])
      } catch (err) {
        assert(err.results.length === 3)
        assert(err.results[0].name === 'test-task:append2 a')
        assert(err.results[0].code === 0)
        assert(err.results[1].name === 'test-task:error')
        assert(err.results[1].code === 1)
        assert(err.results[2].name === 'test-task:append2 b')
        assert(err.results[2].code === undefined)
        assert(result() === 'aa')
        return
      }
      assert(false, 'should fail')
    })

    it('npm-run-all command', async () => {
      try {
        await runAll(['test-task:append2 a', 'test-task:error', 'test-task:append2 b'])
      } catch (_err) {
        assert(result() === 'aa')
        return
      }
      assert(false, 'should fail')
    })

    it('run-s command', async () => {
      try {
        await runSeq(['test-task:append2 a', 'test-task:error', 'test-task:append2 b'])
      } catch (_err) {
        assert(result() === 'aa')
        return
      }
      assert(false, 'should fail')
    })
  })

  describe('should remove intersected tasks from two or more patterns:', () => {
    it('Node API', async () => {
      await nodeApi(['test-task:*:a', '*:append:a'], { parallel: false })
      assert(result() === 'aa')
    })

    it('npm-run-all command', async () => {
      await runAll(['test-task:*:a', '*:append:a'])
      assert(result() === 'aa')
    })

    it('run-s command', async () => {
      await runSeq(['test-task:*:a', '*:append:a'])
      assert(result() === 'aa')
    })
  })

  describe('should not remove duplicate tasks from two or more the same pattern:', () => {
    it('Node API', async () => {
      await nodeApi(['test-task:*:a', 'test-task:*:a'], { parallel: false })
      assert(result() === 'aaaa')
    })

    it('npm-run-all command', async () => {
      await runAll(['test-task:*:a', 'test-task:*:a'])
      assert(result() === 'aaaa')
    })

    it('run-s command', async () => {
      await runSeq(['test-task:*:a', 'test-task:*:a'])
      assert(result() === 'aaaa')
    })
  })

  describe("should kill child processes when it's killed", () => {
    it('npm-run-all command', async () => {
      await spawnWithKill(
        'node',
        ['../bin/npm-run-all.js', 'test-task:append2 a']
      )
      assert(result() == null || result() === 'a')
    })

    it('run-s command', async () => {
      await spawnWithKill(
        'node',
        ['../bin/run-s/index.js', 'test-task:append2 a']
      )
      assert(result() == null || result() === 'a')
    })
  })

  describe('should continue on error when --continue-on-error option was specified:', () => {
    it('Node API', async () => {
      try {
        await nodeApi(['test-task:append a', 'test-task:error', 'test-task:append b'], { continueOnError: true })
      } catch (_err) {
        console.log(result()) // TODO: Spurious failures windows
        assert(result() === 'aabb')
        return
      }
      assert(false, 'should fail')
    })

    it('npm-run-all command (--continue-on-error)', async () => {
      try {
        await runAll(['--continue-on-error', 'test-task:append a', 'test-task:error', 'test-task:append b'])
      } catch (_err) {
        assert(result() === 'aabb')
        return
      }
      assert(false, 'should fail')
    })

    it('run-s command (--continue-on-error)', async () => {
      try {
        await runSeq(['--continue-on-error', 'test-task:append a', 'test-task:error', 'test-task:append b'])
      } catch (_err) {
        assert(result() === 'aabb')
        return
      }
      assert(false, 'should fail')
    })

    it('npm-run-all command (-c)', async () => {
      try {
        await runAll(['-c', 'test-task:append a', 'test-task:error', 'test-task:append b'])
      } catch (_err) {
        assert(result() === 'aabb')
        return
      }
      assert(false, 'should fail')
    })

    it('run-s command (-c)', async () => {
      try {
        await runSeq(['-c', 'test-task:append a', 'test-task:error', 'test-task:append b'])
      } catch (_err) {
        assert(result() === 'aabb')
        return
      }
      assert(false, 'should fail')
    })
  })
})
