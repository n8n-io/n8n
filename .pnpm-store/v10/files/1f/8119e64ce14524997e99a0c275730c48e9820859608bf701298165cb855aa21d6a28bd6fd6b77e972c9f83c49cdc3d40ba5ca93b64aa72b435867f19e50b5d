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
const util = require('./lib/util')
const runAll = util.runAll
const runPar = util.runPar
const runSeq = util.runSeq

// ------------------------------------------------------------------------------
// Test
// ------------------------------------------------------------------------------

describe('[print-label] npm-run-all', () => {
  before(() => process.chdir('test-workspace'))
  after(() => process.chdir('..'))

  describe('should print labels at the head of every line:', () => {
    const EXPECTED_TEXT = [
      '[test-task:echo abc] abcabc',
      '[test-task:echo abc] abc',
      '[test-task:echo abc] abcabc',
      '[test-task:echo abc] abc',
      '[test-task:echo abc] abc',
      '[test-task:echo abc] abc',
      '[test-task:echo abc] abc',
      '[test-task:echo abc] abc',
      '[test-task:echo abc] ',
      '[test-task:echo abc] abc',
      '[test-task:echo abc] abcabc',
      '[test-task:echo abc] ',
      '[test-task:echo abc] ',
      '[test-task:echo abc] ',
      '[test-task:echo abc] abc',
    ].join('\n')

    it('Node API', async () => {
      const stdout = new BufferStream()
      await nodeApi('test-task:echo abc', { stdout, silent: true, printLabel: true })
      assert.equal(stdout.value, EXPECTED_TEXT)
    })

    it('npm-run-all command (--print-label)', async () => {
      const stdout = new BufferStream()
      await runAll(['test-task:echo abc', '--silent', '--print-label'], stdout)
      assert.equal(stdout.value, EXPECTED_TEXT)
    })

    it('run-s command (--print-label)', async () => {
      const stdout = new BufferStream()
      await runSeq(['test-task:echo abc', '--silent', '--print-label'], stdout)
      assert.equal(stdout.value, EXPECTED_TEXT)
    })

    it('run-p command (--print-label)', async () => {
      const stdout = new BufferStream()
      await runPar(['test-task:echo abc', '--silent', '--print-label'], stdout)
      assert.equal(stdout.value, EXPECTED_TEXT)
    })

    it('npm-run-all command (-l)', async () => {
      const stdout = new BufferStream()
      await runAll(['test-task:echo abc', '--silent', '-l'], stdout)
      assert.equal(stdout.value, EXPECTED_TEXT)
    })

    it('run-s command (-l)', async () => {
      const stdout = new BufferStream()
      await runSeq(['test-task:echo abc', '--silent', '-l'], stdout)
      assert.equal(stdout.value, EXPECTED_TEXT)
    })

    it('run-p command (-l)', async () => {
      const stdout = new BufferStream()
      await runPar(['test-task:echo abc', '--silent', '-l'], stdout)
      assert.equal(stdout.value, EXPECTED_TEXT)
    })
  })

  describe('should print all labels with the same width:', () => {
    const EXPECTED_TEXT = [
      '[test-task:echo a   ] aa',
      '[test-task:echo a   ] a',
      '[test-task:echo a   ] aa',
      '[test-task:echo a   ] a',
      '[test-task:echo a   ] a',
      '[test-task:echo a   ] a',
      '[test-task:echo a   ] a',
      '[test-task:echo a   ] a',
      '[test-task:echo a   ] ',
      '[test-task:echo a   ] a',
      '[test-task:echo a   ] aa',
      '[test-task:echo a   ] ',
      '[test-task:echo a   ] ',
      '[test-task:echo a   ] ',
      '[test-task:echo a   ] a',
      '[test-task:echo abcd] abcdabcd',
      '[test-task:echo abcd] abcd',
      '[test-task:echo abcd] abcdabcd',
      '[test-task:echo abcd] abcd',
      '[test-task:echo abcd] abcd',
      '[test-task:echo abcd] abcd',
      '[test-task:echo abcd] abcd',
      '[test-task:echo abcd] abcd',
      '[test-task:echo abcd] ',
      '[test-task:echo abcd] abcd',
      '[test-task:echo abcd] abcdabcd',
      '[test-task:echo abcd] ',
      '[test-task:echo abcd] ',
      '[test-task:echo abcd] ',
      '[test-task:echo abcd] abcd',
      '[test-task:echo ab  ] abab',
      '[test-task:echo ab  ] ab',
      '[test-task:echo ab  ] abab',
      '[test-task:echo ab  ] ab',
      '[test-task:echo ab  ] ab',
      '[test-task:echo ab  ] ab',
      '[test-task:echo ab  ] ab',
      '[test-task:echo ab  ] ab',
      '[test-task:echo ab  ] ',
      '[test-task:echo ab  ] ab',
      '[test-task:echo ab  ] abab',
      '[test-task:echo ab  ] ',
      '[test-task:echo ab  ] ',
      '[test-task:echo ab  ] ',
      '[test-task:echo ab  ] ab',
    ].join('\n')

    it('Node API', async () => {
      const stdout = new BufferStream()
      await nodeApi(
        ['test-task:echo a', 'test-task:echo abcd', 'test-task:echo ab'],
        { stdout, silent: true, printLabel: true }
      )
      assert.equal(stdout.value, EXPECTED_TEXT)
    })

    it('npm-run-all command', async () => {
      const stdout = new BufferStream()
      await runAll(
        ['test-task:echo a', 'test-task:echo abcd', 'test-task:echo ab', '--silent', '--print-label'],
        stdout
      )
      assert.equal(stdout.value, EXPECTED_TEXT)
    })

    it('run-s command', async () => {
      const stdout = new BufferStream()
      await runSeq(
        ['test-task:echo a', 'test-task:echo abcd', 'test-task:echo ab', '--silent', '--print-label'],
        stdout
      )
      assert.equal(stdout.value, EXPECTED_TEXT)
    })
  })

  describe('should work printing labels in parallel:', () => {
    const EXPECTED_LINES = [
      '\n[test-task:echo a   ] ',
      '\n[test-task:echo a   ] a',
      '\n[test-task:echo ab  ] ',
      '\n[test-task:echo ab  ] ab',
      '\n[test-task:echo abcd] ',
      '\n[test-task:echo abcd] abcd',
    ]
    const UNEXPECTED_PATTERNS = [
      /aab(cd)?/,
      /ab(cd)?a\b/,
      /\n\n/,
    ]

    it('Node API', async () => {
      const stdout = new BufferStream()
      await nodeApi(
        ['test-task:echo a', 'test-task:echo abcd', 'test-task:echo ab'],
        { stdout, parallel: true, printLabel: true }
      )
      for (const line of EXPECTED_LINES) {
        assert(stdout.value.indexOf(line) !== -1)
      }
      for (const pattern of UNEXPECTED_PATTERNS) {
        assert(!pattern.test(stdout.value))
      }
    })

    it('npm-run-all command', async () => {
      const stdout = new BufferStream()
      await runAll(
        ['--parallel', 'test-task:echo a', 'test-task:echo abcd', 'test-task:echo ab', '--print-label'],
        stdout
      )
      for (const line of EXPECTED_LINES) {
        assert(stdout.value.indexOf(line) !== -1)
      }
      for (const pattern of UNEXPECTED_PATTERNS) {
        assert(!pattern.test(stdout.value))
      }
    })

    it('run-p command', async () => {
      const stdout = new BufferStream()
      await runPar(
        ['test-task:echo a', 'test-task:echo abcd', 'test-task:echo ab', '--print-label'],
        stdout
      )
      for (const line of EXPECTED_LINES) {
        assert(stdout.value.indexOf(line) !== -1)
      }
      for (const pattern of UNEXPECTED_PATTERNS) {
        assert(!pattern.test(stdout.value))
      }
    })
  })
})
