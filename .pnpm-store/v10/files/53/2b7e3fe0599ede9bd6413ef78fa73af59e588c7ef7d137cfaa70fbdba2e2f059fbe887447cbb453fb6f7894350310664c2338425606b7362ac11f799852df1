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
const { delay, removeResult, runAll, runPar, runSeq } = require('./lib/util')

// ------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------

/**
 * Throws an assertion error if a given promise comes to be fulfilled.
 *
 * @param {Promise} p - A promise to check.
 * @returns {Promise} A promise which is checked.
 */
function shouldFail (p) {
  return p.then(
    () => assert(false, 'should fail'),
    () => null // OK!
  )
}

// ------------------------------------------------------------------------------
// Test
// ------------------------------------------------------------------------------

describe('[fail] it should fail', () => {
  before(() => process.chdir('test-workspace'))
  after(() => process.chdir('..'))

  beforeEach(removeResult)
  afterEach(() => delay(1000))

  describe('if an invalid option exists.', () => {
    it('npm-run-all command', () => shouldFail(runAll(['--invalid'])))
    it('run-s command', () => shouldFail(runSeq(['--parallel'])))
    it('run-p command', () => shouldFail(runPar(['--sequential'])))

    it('npm-run-all command with --race without --parallel', () => shouldFail(runAll(['--race'])))
    it('npm-run-all command with --r without --parallel', () => shouldFail(runAll(['--r'])))
    it('run-s command with --race', () => shouldFail(runSeq(['--race'])))
    it('run-s command with --r', () => shouldFail(runSeq(['--r'])))
  })

  describe('if invalid `options.taskList` is given.', () => {
    it('Node API', () => shouldFail(nodeApi('test-task:append a', { taskList: { invalid: 0 } })))
  })

  describe('if unknown tasks are given:', () => {
    it('Node API', () => shouldFail(nodeApi('unknown-task')))
    it('npm-run-all command', () => shouldFail(runAll(['unknown-task'])))
    it('run-s command', () => shouldFail(runSeq(['unknown-task'])))
    it('run-p command', () => shouldFail(runPar(['unknown-task'])))
  })

  describe('if unknown tasks are given (2):', () => {
    it('Node API', () => shouldFail(nodeApi(['test-task:append:a', 'unknown-task'])))
    it('npm-run-all command', () => shouldFail(runAll(['test-task:append:a', 'unknown-task'])))
    it('run-s command', () => shouldFail(runSeq(['test-task:append:a', 'unknown-task'])))
    it('run-p command', () => shouldFail(runPar(['test-task:append:a', 'unknown-task'])))
  })

  describe('if package.json is not found:', () => {
    before(() => process.chdir('no-package-json'))
    after(() => process.chdir('..'))

    it('Node API', () => shouldFail(nodeApi(['test-task:append:a'])))
    it('npm-run-all command', () => shouldFail(runAll(['test-task:append:a'])))
    it('run-s command', () => shouldFail(runSeq(['test-task:append:a'])))
    it('run-p command', () => shouldFail(runPar(['test-task:append:a'])))
  })

  describe('if package.json does not have scripts field:', () => {
    before(() => process.chdir('no-scripts'))
    after(() => process.chdir('..'))

    it('Node API', () => shouldFail(nodeApi(['test-task:append:a'])))
    it('npm-run-all command', () => shouldFail(runAll(['test-task:append:a'])))
    it('run-s command', () => shouldFail(runSeq(['test-task:append:a'])))
    it('run-p command', () => shouldFail(runPar(['test-task:append:a'])))
  })

  describe('if tasks exited with non-zero code:', () => {
    it('Node API', () => shouldFail(nodeApi('test-task:error')))
    it('npm-run-all command', () => shouldFail(runAll(['test-task:error'])))
    it('run-s command', () => shouldFail(runSeq(['test-task:error'])))
    it('run-p command', () => shouldFail(runPar(['test-task:error'])))
  })

  describe('if tasks exited via a signal:', () => {
    it('Node API', () => shouldFail(nodeApi('test-task:abort')))
    it('npm-run-all command', () => shouldFail(runAll(['test-task:abort'])))
    it('run-s command', () => shouldFail(runSeq(['test-task:abort'])))
    it('run-p command', () => shouldFail(runPar(['test-task:abort'])))
    it('with correct exit code', () => nodeApi('test-task:abort').then(() =>
      assert(false, 'should fail')).catch(err => {
      // In NodeJS versions > 6, the child process correctly sends back
      // the signal + code of null. In NodeJS versions <= 6, the child
      // process does not set the signal, and sets the code to 1.
      const code = Number(process.version.match(/^v(\d+)/)[1]) > 6 ? 134 : 1
      assert(err.code === code, 'should have correct exit code')
    }))
  })
})
