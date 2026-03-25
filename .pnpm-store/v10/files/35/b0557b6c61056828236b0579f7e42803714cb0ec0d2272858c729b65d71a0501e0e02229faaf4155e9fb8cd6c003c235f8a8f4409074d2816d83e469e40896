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
const BufferStream = require('./lib/buffer-stream')
const { result, removeResult, runAll, runPar, runSeq } = require('./lib/util')

// ------------------------------------------------------------------------------
// Test
// ------------------------------------------------------------------------------

describe('[pattern] it should run matched tasks if glob like patterns are given.', () => {
  before(() => process.chdir('test-workspace'))
  after(() => process.chdir('..'))
  beforeEach(removeResult)

  describe('"test-task:append:*" to "test-task:append:a" and "test-task:append:b"', () => {
    it('Node API', async () => {
      await nodeApi('test-task:append:*')
      assert(result() === 'aabb')
    })

    it('npm-run-all command', async () => {
      await runAll(['test-task:append:*'])
      assert(result() === 'aabb')
    })

    it('run-s command', async () => {
      await runSeq(['test-task:append:*'])
      assert(result() === 'aabb')
    })

    it('run-p command', async () => {
      await runPar(['test-task:append:*'])
      assert(
        result() === 'abab' ||
                result() === 'abba' ||
                result() === 'baba' ||
                result() === 'baab'
      )
    })
  })

  describe('"test-task:append:**:*" to "test-task:append:a", "test-task:append:a:c", "test-task:append:a:d", and "test-task:append:b"', () => {
    it('Node API', async () => {
      await nodeApi('test-task:append:**:*')
      assert(result() === 'aaacacadadbb')
    })

    it('npm-run-all command', async () => {
      await runAll(['test-task:append:**:*'])
      assert(result() === 'aaacacadadbb')
    })

    it('run-s command', async () => {
      await runSeq(['test-task:append:**:*'])
      assert(result() === 'aaacacadadbb')
    })
  })

  describe('(should ignore duplications) "test-task:append:b" "test-task:append:*" to "test-task:append:b", "test-task:append:a"', () => {
    it('Node API', async () => {
      await nodeApi(['test-task:append:b', 'test-task:append:*'])
      assert(result() === 'bbaa')
    })

    it('npm-run-all command', async () => {
      await runAll(['test-task:append:b', 'test-task:append:*'])
      assert(result() === 'bbaa')
    })

    it('run-s command', async () => {
      await runSeq(['test-task:append:b', 'test-task:append:*'])
      assert(result() === 'bbaa')
    })

    it('run-p command', async () => {
      await runPar(['test-task:append:b', 'test-task:append:*'])
      assert(
        result() === 'baba' ||
                result() === 'baab' ||
                result() === 'abab' ||
                result() === 'abba'
      )
    })
  })

  describe('"a" should not match to "test-task:append:a"', () => {
    it('Node API', async () => {
      try {
        await nodeApi('a')
        assert(false, 'should not match')
      } catch (err) {
        assert((/not found/i).test(err.message))
      }
    })

    it('npm-run-all command', async () => {
      const stderr = new BufferStream()
      try {
        await runAll(['a'], null, stderr)
        assert(false, 'should not match')
      } catch (_err) {
        assert((/not found/i).test(stderr.value))
      }
    })

    it('run-s command', async () => {
      const stderr = new BufferStream()
      try {
        await runSeq(['a'], null, stderr)
        assert(false, 'should not match')
      } catch (_err) {
        assert((/not found/i).test(stderr.value))
      }
    })

    it('run-p command', async () => {
      const stderr = new BufferStream()
      try {
        await runPar(['a'], null, stderr)
        assert(false, 'should not match')
      } catch (_err) {
        assert((/not found/i).test(stderr.value))
      }
    })
  })

  describe('"!test-task:**" should not match to anything', () => {
    it('Node API', async () => {
      try {
        await nodeApi('!test-task:**')
        assert(false, 'should not match')
      } catch (err) {
        assert((/not found/i).test(err.message))
      }
    })

    it('npm-run-all command', async () => {
      const stderr = new BufferStream()
      try {
        await runAll(['!test-task:**'], null, stderr)
        assert(false, 'should not match')
      } catch (_err) {
        assert((/not found/i).test(stderr.value))
      }
    })

    it('run-s command', async () => {
      const stderr = new BufferStream()
      try {
        await runSeq(['!test-task:**'], null, stderr)
        assert(false, 'should not match')
      } catch (_err) {
        assert((/not found/i).test(stderr.value))
      }
    })

    it('run-p command', async () => {
      const stderr = new BufferStream()
      try {
        await runPar(['!test-task:**'], null, stderr)
        assert(false, 'should not match')
      } catch (_err) {
        assert((/not found/i).test(stderr.value))
      }
    })
  })

  describe('"!test" "?test" to "!test", "?test"', () => {
    it('Node API', async () => {
      await nodeApi(['!test', '?test'])
      assert(result().trim() === 'XQ')
    })

    it('npm-run-all command', async () => {
      await runAll(['!test', '?test'])
      assert(result().trim() === 'XQ')
    })

    it('run-s command', async () => {
      await runSeq(['!test', '?test'])
      assert(result().trim() === 'XQ')
    })

    it('run-p command', async () => {
      await runPar(['!test', '?test'])
      assert(result().trim() === 'XQ' || result().trim() === 'QX')
    })
  })
})
