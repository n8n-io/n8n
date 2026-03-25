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
const createHeader = require('../lib/create-header')
const readPackageJson = require('../lib/read-package-json')
const BufferStream = require('./lib/buffer-stream')
const util = require('./lib/util')
const ansiStylesPromise = import('ansi-styles')
const runAll = util.runAll
const runPar = util.runPar
const runSeq = util.runSeq

// ------------------------------------------------------------------------------
// Test
// ------------------------------------------------------------------------------

describe('[print-name] npm-run-all', () => {
  let packageInfo = null

  before(() => {
    process.chdir('test-workspace')
    return readPackageJson().then(info => {
      packageInfo = info.packageInfo
    })
  })
  after(() => process.chdir('..'))

  describe('should print names before running tasks:', () => {
    it('Node API', async () => {
      const ansiStyles = (await ansiStylesPromise).default
      const stdout = new BufferStream()
      await nodeApi('test-task:echo abc', { stdout, silent: true, printName: true })
      const header = createHeader('test-task:echo abc', packageInfo, false, ansiStyles)
      assert.equal(stdout.value.slice(0, header.length), header)
    })

    it('npm-run-all command (--print-name)', async () => {
      const ansiStyles = (await ansiStylesPromise).default
      const stdout = new BufferStream()
      await runAll(['test-task:echo abc', '--silent', '--print-name'], stdout)
      const header = createHeader('test-task:echo abc', packageInfo, false, ansiStyles)
      assert.equal(stdout.value.slice(0, header.length), header)
    })

    it('run-s command (--print-name)', async () => {
      const ansiStyles = (await ansiStylesPromise).default
      const stdout = new BufferStream()
      await runSeq(['test-task:echo abc', '--silent', '--print-name'], stdout)
      const header = createHeader('test-task:echo abc', packageInfo, false, ansiStyles)
      assert.equal(stdout.value.slice(0, header.length), header)
    })

    it('run-p command (--print-name)', async () => {
      const ansiStyles = (await ansiStylesPromise).default
      const stdout = new BufferStream()
      await runPar(['test-task:echo abc', '--silent', '--print-name'], stdout)
      const header = createHeader('test-task:echo abc', packageInfo, false, ansiStyles)
      assert.equal(stdout.value.slice(0, header.length), header)
    })

    it('npm-run-all command (-n)', async () => {
      const ansiStyles = (await ansiStylesPromise).default
      const stdout = new BufferStream()
      await runAll(['test-task:echo abc', '--silent', '-n'], stdout)
      const header = createHeader('test-task:echo abc', packageInfo, false, ansiStyles)
      assert.equal(stdout.value.slice(0, header.length), header)
    })

    it('run-s command (-n)', async () => {
      const ansiStyles = (await ansiStylesPromise).default
      const stdout = new BufferStream()
      await runSeq(['test-task:echo abc', '--silent', '-n'], stdout)
      const header = createHeader('test-task:echo abc', packageInfo, false, ansiStyles)
      assert.equal(stdout.value.slice(0, header.length), header)
    })

    it('run-p command (-n)', async () => {
      const ansiStyles = (await ansiStylesPromise).default
      const stdout = new BufferStream()
      await runPar(['test-task:echo abc', '--silent', '-n'], stdout)
      const header = createHeader('test-task:echo abc', packageInfo, false, ansiStyles)
      assert.equal(stdout.value.slice(0, header.length), header)
    })
  })
})
