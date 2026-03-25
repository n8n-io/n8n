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
const { delay, result, removeResult, runAll, runPar } = require('./lib/util')

// ------------------------------------------------------------------------------
// Test
// ------------------------------------------------------------------------------

describe('[parallel]', () => {
  before(() => process.chdir('test-workspace'))
  after(() => process.chdir('..'))

  beforeEach(() => delay(1000).then(removeResult))

  describe('should run tasks on parallel when was given --parallel option:', () => {
    it('Node API', async () => {
      const results = await nodeApi(['test-task:append a', 'test-task:append b'], { parallel: true })
      assert(results.length === 2)
      assert(results[0].name === 'test-task:append a')
      assert(results[0].code === 0)
      assert(results[1].name === 'test-task:append b')
      assert(results[1].code === 0)
      assert(
        result() === 'abab' ||
                result() === 'baba' ||
                result() === 'abba' ||
                result() === 'baab'
      )
    })

    it('npm-run-all command', async () => {
      await runAll(['--parallel', 'test-task:append a', 'test-task:append b'])
      assert(
        result() === 'abab' ||
                result() === 'baba' ||
                result() === 'abba' ||
                result() === 'baab'
      )
    })

    it('run-p command', async () => {
      await runPar(['test-task:append a', 'test-task:append b'])
      assert(
        result() === 'abab' ||
                result() === 'baba' ||
                result() === 'abba' ||
                result() === 'baab'
      )
    })
  })

  describe('should kill all tasks when was given --parallel option if a task exited with a non-zero code:', () => {
    it('Node API', async () => {
      try {
        await nodeApi(['test-task:append2 a', 'test-task:error'], { parallel: true })
      } catch (err) {
        assert(err.results.length === 2)
        assert(err.results[0].name === 'test-task:append2 a')
        assert(err.results[0].code === undefined)
        assert(err.results[1].name === 'test-task:error')
        assert(err.results[1].code === 1)
        assert(result() == null || result() === 'a')
        return
      }
      assert(false, 'should fail')
    })

    it('npm-run-all command', async () => {
      try {
        await runAll(['--parallel', 'test-task:append2 a', 'test-task:error'])
      } catch (_err) {
        assert(result() == null || result() === 'a')
        return
      }
      assert(false, 'should fail')
    })

    it('run-p command', async () => {
      try {
        await runPar(['test-task:append2 a', 'test-task:error'])
      } catch (_err) {
        assert(result() == null || result() === 'a')
        return
      }
      assert(false, 'should fail')
    })
  })

  describe('should remove intersected tasks from two or more patterns:', () => {
    it('Node API', async () => {
      await nodeApi(['test-task:*:a', '*:append:a'], { parallel: true })
      assert(result() === 'aa')
    })

    it('npm-run-all command', async () => {
      await runAll(['--parallel', 'test-task:*:a', '*:append:a'])
      assert(result() === 'aa')
    })

    it('run-p command', async () => {
      await runPar(['test-task:*:a', '*:append:a'])
      assert(result() === 'aa')
    })
  })

  describe('should not remove duplicate tasks from two or more the same pattern:', () => {
    it('Node API', async () => {
      await nodeApi(['test-task:*:a', 'test-task:*:a'], { parallel: true })
      assert(result() === 'aaaa')
    })

    it('npm-run-all command', async () => {
      await runAll(['--parallel', 'test-task:*:a', 'test-task:*:a'])
      assert(result() === 'aaaa')
    })

    it('run-p command', async () => {
      await runPar(['test-task:*:a', 'test-task:*:a'])
      assert(result() === 'aaaa')
    })
  })

  describe("should kill child processes when it's killed", () => {
    it('npm-run-all command', async () => {
      await spawnWithKill(
        'node',
        ['../bin/npm-run-all/index.js', '--parallel', 'test-task:append2 a']
      )
      assert(result() == null || result() === 'a')
    })

    it('run-p command', async () => {
      await spawnWithKill(
        'node',
        ['../bin/run-p/index.js', 'test-task:append2 a']
      )
      assert(result() == null || result() === 'a')
    })
  })

  describe('should continue on error when --continue-on-error option was specified:', () => {
    it('Node API', async () => {
      try {
        await nodeApi(['test-task:append a', 'test-task:error', 'test-task:append b'], { parallel: true, continueOnError: true })
      } catch (_err) {
        console.log(result()) // TODO: This is randomly failing
        assert(
          result() === 'abab' ||
                    result() === 'baba' ||
                    result() === 'abba' ||
                    result() === 'baab'
        )
        return
      }
      assert(false, 'should fail.')
    })

    it('npm-run-all command (--continue-on-error)', async () => {
      try {
        await runAll(['--continue-on-error', '--parallel', 'test-task:append a', 'test-task:error', 'test-task:append b'])
      } catch (_err) {
        assert(
          result() === 'abab' ||
                    result() === 'baba' ||
                    result() === 'abba' ||
                    result() === 'baab'
        )
        return
      }
      assert(false, 'should fail.')
    })

    it('npm-run-all command (-c)', async () => {
      try {
        await runAll(['-cp', 'test-task:append a', 'test-task:error', 'test-task:append b'])
      } catch (_err) {
        assert(
          result() === 'abab' ||
                    result() === 'baba' ||
                    result() === 'abba' ||
                    result() === 'baab'
        )
        return
      }
      assert(false, 'should fail.')
    })

    it('run-p command (--continue-on-error)', async () => {
      try {
        await runPar(['--continue-on-error', 'test-task:append a', 'test-task:error', 'test-task:append b'])
      } catch (_err) {
        assert(
          result() === 'abab' ||
                    result() === 'baba' ||
                    result() === 'abba' ||
                    result() === 'baab'
        )
        return
      }
      assert(false, 'should fail.')
    })

    it('run-p command (-c)', async () => {
      try {
        await runPar(['-c', 'test-task:append a', 'test-task:error', 'test-task:append b'])
      } catch (_err) {
        assert(
          result() === 'abab' ||
                    result() === 'baba' ||
                    result() === 'abba' ||
                    result() === 'baab'
        )
        return
      }
      assert(false, 'should fail.')
    })
  })

  describe('should abort other tasks when a task finished, when --race option was specified:', () => {
    it('Node API', async () => {
      await nodeApi(['test-task:append1 a', 'test-task:append2 b'], { parallel: true, race: true })
      await delay(5000)
      assert(result() === 'a' || result() === 'ab' || result() === 'ba')
    })

    it('npm-run-all command (--race)', async () => {
      await runAll(['--race', '--parallel', 'test-task:append1 a', 'test-task:append2 b'])
      await delay(5000)
      assert(result() === 'a' || result() === 'ab' || result() === 'ba')
    })

    it('npm-run-all command (-r)', async () => {
      await runAll(['-rp', 'test-task:append1 a', 'test-task:append2 b'])
      await delay(5000)
      assert(result() === 'a' || result() === 'ab' || result() === 'ba')
    })

    it('run-p command (--race)', async () => {
      await runPar(['--race', 'test-task:append1 a', 'test-task:append2 b'])
      await delay(5000)
      assert(result() === 'a' || result() === 'ab' || result() === 'ba')
    })

    it('run-p command (-r)', async () => {
      await runPar(['-r', 'test-task:append1 a', 'test-task:append2 b'])
      await delay(5000)
      assert(result() === 'a' || result() === 'ab' || result() === 'ba')
    })

    it('run-p command (no -r)', async () => {
      await runPar(['test-task:append1 a', 'test-task:append2 b'])
      await delay(5000)
      assert(result() === 'abb' || result() === 'bab')
    })
  })

  describe('should run tasks in parallel-2 when was given --max-parallel 2 option:', () => {
    it('Node API', async () => {
      const results = await nodeApi(['test-task:append a', 'test-task:append b', 'test-task:append c'], { parallel: true, maxParallel: 2 })
      assert(results.length === 3)
      assert(results[0].name === 'test-task:append a')
      assert(results[0].code === 0)
      assert(results[1].name === 'test-task:append b')
      assert(results[1].code === 0)
      assert(results[2].name === 'test-task:append c')
      assert(results[2].code === 0)
      assert(
        result() === 'ababcc' ||
                result() === 'babacc' ||
                result() === 'abbacc' ||
                result() === 'baabcc'
      )
    })

    it('npm-run-all command', async () => {
      await runAll(['--parallel', 'test-task:append a', 'test-task:append b', 'test-task:append c', '--max-parallel', '2'])
      assert(
        result() === 'ababcc' ||
                result() === 'babacc' ||
                result() === 'abbacc' ||
                result() === 'baabcc'
      )
    })

    it('run-p command', async () => {
      await runPar(['test-task:append a', 'test-task:append b', 'test-task:append c', '--max-parallel', '2'])
      assert(
        result() === 'ababcc' ||
                result() === 'babacc' ||
                result() === 'abbacc' ||
                result() === 'baabcc'
      )
    })
  })
})
