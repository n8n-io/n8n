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

describe('[common]', () => {
  before(() => process.chdir('test-workspace'))
  after(() => process.chdir('..'))

  beforeEach(removeResult)

  describe('should print a help text if arguments are nothing.', () => {
    it('npm-run-all command', async () => {
      const buf = new BufferStream()
      await runAll([], buf)
      assert(/Usage:/.test(buf.value))
    })

    it('run-s command', async () => {
      const buf = new BufferStream()
      await runSeq([], buf)
      assert(/Usage:/.test(buf.value))
    })

    it('run-p command', async () => {
      const buf = new BufferStream()
      await runPar([], buf)
      assert(/Usage:/.test(buf.value))
    })
  })

  describe('should print a help text if the first argument is --help (-h)', () => {
    it('npm-run-all command (-h)', async () => {
      const buf = new BufferStream()
      await runAll(['-h'], buf)
      assert(/Usage:/.test(buf.value))
    })

    it('run-s command (-h)', async () => {
      const buf = new BufferStream()
      await runSeq(['-h'], buf)
      assert(/Usage:/.test(buf.value))
    })

    it('run-p command (-h)', async () => {
      const buf = new BufferStream()
      await runPar(['-h'], buf)
      assert(/Usage:/.test(buf.value))
    })

    it('npm-run-all command (--help)', async () => {
      const buf = new BufferStream()
      await runAll(['--help'], buf)
      assert(/Usage:/.test(buf.value))
    })

    it('run-s command (--help)', async () => {
      const buf = new BufferStream()
      await runSeq(['--help'], buf)
      assert(/Usage:/.test(buf.value))
    })

    it('run-p command (--help)', async () => {
      const buf = new BufferStream()
      await runPar(['--help'], buf)
      assert(/Usage:/.test(buf.value))
    })
  })

  describe('should print a version number if the first argument is --version (-v)', () => {
    it('npm-run-all command (-v)', async () => {
      const buf = new BufferStream()
      await runAll(['-v'], buf)
      assert(/v[0-9]+\.[0-9]+\.[0-9]+/.test(buf.value))
    })

    it('run-s command (-v)', async () => {
      const buf = new BufferStream()
      await runSeq(['-v'], buf)
      assert(/v[0-9]+\.[0-9]+\.[0-9]+/.test(buf.value))
    })

    it('run-p command (-v)', async () => {
      const buf = new BufferStream()
      await runPar(['-v'], buf)
      assert(/v[0-9]+\.[0-9]+\.[0-9]+/.test(buf.value))
    })

    it('npm-run-all command (--version)', async () => {
      const buf = new BufferStream()
      await runAll(['--version'], buf)
      assert(/v[0-9]+\.[0-9]+\.[0-9]+/.test(buf.value))
    })

    it('run-s command (--version)', async () => {
      const buf = new BufferStream()
      await runSeq(['--version'], buf)
      assert(/v[0-9]+\.[0-9]+\.[0-9]+/.test(buf.value))
    })

    it('run-p command (--version)', async () => {
      const buf = new BufferStream()
      await runPar(['--version'], buf)
      assert(/v[0-9]+\.[0-9]+\.[0-9]+/.test(buf.value))
    })
  })

  describe('should do nothing if a task list is empty.', () => {
    it('Node API', async () => {
      await nodeApi(null)
      assert(result() == null)
    })
  })

  describe('should run a task by npm (check an environment variable):', () => {
    it('Node API', async () => {
      await nodeApi('test-task:package-config')
      assert(result() === 'OK')
    })

    it('npm-run-all command', async () => {
      await runAll(['test-task:package-config'])
      assert(result() === 'OK')
    })

    it('run-s command', async () => {
      await runSeq(['test-task:package-config'])
      assert(result() === 'OK')
    })

    it('run-p command', async () => {
      await runPar(['test-task:package-config'])
      assert(result() === 'OK')
    })
  })

  describe('stdin can be used in tasks:', () => {
    it('Node API', async () => {
      await nodeApi('test-task:stdin')
      assert(result().trim() === 'STDIN')
    })

    it('npm-run-all command', async () => {
      await runAll(['test-task:stdin'])
      assert(result().trim() === 'STDIN')
    })

    it('run-s command', async () => {
      await runSeq(['test-task:stdin'])
      assert(result().trim() === 'STDIN')
    })

    it('run-p command', async () => {
      await runPar(['test-task:stdin'])
      assert(result().trim() === 'STDIN')
    })
  })

  describe('stdout can be used in tasks:', () => {
    it('Node API', async () => {
      await nodeApi('test-task:stdout')
      assert(result() === 'STDOUT')
    })

    it('npm-run-all command', async () => {
      await runAll(['test-task:stdout'])
      assert(result() === 'STDOUT')
    })

    it('run-s command', async () => {
      await runSeq(['test-task:stdout'])
      assert(result() === 'STDOUT')
    })

    it('run-p command', async () => {
      await runPar(['test-task:stdout'])
      assert(result() === 'STDOUT')
    })
  })

  describe('stderr can be used in tasks:', () => {
    it('Node API', async () => {
      await nodeApi('test-task:stderr')
      assert(result() === 'STDERR')
    })

    it('npm-run-all command', async () => {
      await runAll(['test-task:stderr'])
      assert(result() === 'STDERR')
    })

    it('run-s command', async () => {
      await runSeq(['test-task:stderr'])
      assert(result() === 'STDERR')
    })

    it('run-p command', async () => {
      await runPar(['test-task:stderr'])
      assert(result() === 'STDERR')
    })
  })

  describe('should be able to use `restart` built-in task:', () => {
    it('Node API', () => nodeApi('restart'))
    it('npm-run-all command', () => runAll(['restart']))
    it('run-s command', () => runSeq(['restart']))
    it('run-p command', () => runPar(['restart']))
  })

  describe('should be able to use `env` built-in task:', () => {
    it('Node API', () => nodeApi('env'))
    it('npm-run-all command', () => runAll(['env']))
    it('run-s command', () => runSeq(['env']))
    it('run-p command', () => runPar(['env']))
  })

  if (process.platform === 'win32') {
    describe('issue14', () => {
      it('Node API', () => nodeApi('test-task:issue14:win32'))
      it('npm-run-all command', () => runAll(['test-task:issue14:win32']))
      it('run-s command', () => runSeq(['test-task:issue14:win32']))
      it('run-p command', () => runPar(['test-task:issue14:win32']))
    })
  } else {
    describe('issue14', () => {
      it('Node API', () => nodeApi('test-task:issue14:posix'))
      it('npm-run-all command', () => runAll(['test-task:issue14:posix']))
      it('run-s command', () => runSeq(['test-task:issue14:posix']))
      it('run-p command', () => runPar(['test-task:issue14:posix']))
    })
  }

  describe('should not print log if silent option was given:', () => {
    it('Node API', async () => {
      const stdout = new BufferStream()
      const stderr = new BufferStream()
      try {
        await nodeApi('test-task:error', { silent: true, stdout, stderr })
      } catch (_err) {
        assert(stdout.value === '' && stderr.value === '')
        return
      }
      assert(false, 'Should fail.')
    })

    /**
         * Strip unknown istanbul's warnings.
         * @param {string} str - The string to be stripped.
         * @returns {string} The stripped string.
         */
    function stripIstanbulWarnings (str) {
      return str.replace(/File \[.+?] ignored, nothing could be mapped\r?\n/, '')
    }

    it('npm-run-all command', async () => {
      const stdout = new BufferStream()
      const stderr = new BufferStream()
      try {
        await runAll(['--silent', 'test-task:error'], stdout, stderr)
      } catch (_err) {
        assert(stdout.value === '' && stripIstanbulWarnings(stderr.value) === '')
        return
      }
      assert(false, 'Should fail.')
    })

    it('run-s command', async () => {
      const stdout = new BufferStream()
      const stderr = new BufferStream()
      try {
        await runSeq(['--silent', 'test-task:error'], stdout, stderr)
      } catch (_err) {
        assert(stdout.value === '' && stripIstanbulWarnings(stderr.value) === '')
        return
      }
      assert(false, 'Should fail.')
    })

    it('run-p command', async () => {
      const stdout = new BufferStream()
      const stderr = new BufferStream()
      try {
        await runPar(['--silent', 'test-task:error'], stdout, stderr)
      } catch (_err) {
        assert(stdout.value === '' && stripIstanbulWarnings(stderr.value) === '')
        return
      }
      assert(false, 'Should fail.')
    })
  })

  // https://github.com/mysticatea/npm-run-all/issues/105
  describe('should not print MaxListenersExceededWarning when it runs 10 tasks:', () => {
    const tasks = Array.from({ length: 10 }, () => 'test-task:append:a')

    it('npm-run-all command', async () => {
      const buf = new BufferStream()
      await runAll(tasks, null, buf)
      assert(buf.value.indexOf('MaxListenersExceededWarning') === -1)
    })

    it('run-s command', async () => {
      const buf = new BufferStream()
      await runSeq(tasks, null, buf)
      assert(buf.value.indexOf('MaxListenersExceededWarning') === -1)
    })

    it('run-p command', async () => {
      const buf = new BufferStream()
      await runPar(tasks, null, buf)
      assert(buf.value.indexOf('MaxListenersExceededWarning') === -1)
    })
  })
})
