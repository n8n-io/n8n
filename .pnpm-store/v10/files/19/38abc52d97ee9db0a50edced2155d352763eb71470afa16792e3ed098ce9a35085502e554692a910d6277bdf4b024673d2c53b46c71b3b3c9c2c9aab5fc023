'use strict'

const decamelize = require('decamelize')
const schema = require('@istanbuljs/schema')

/* These options still need to be connected to the instrumenter
 * Disabling them for now also avoids the issue with OSX cutting
 * off the error help screen at 8192 characters.
 */
const blockOptions = [
  'coverageVariable',
  'coverageGlobalScope',
  'coverageGlobalScopeFunc'
]

module.exports = {
  setupOptions (yargs, command, cwd) {
    Object.entries(schema.nyc.properties).forEach(([name, setup]) => {
      if (blockOptions.includes(name)) {
        return
      }

      const option = {
        description: setup.description,
        default: setup.default,
        type: setup.type
      }

      if (name === 'cwd') {
        if (command !== null) {
          return
        }

        option.default = cwd
        option.global = true
      }

      if (option.type === 'array') {
        option.type = 'string'
      }

      if ('nycAlias' in setup) {
        option.alias = setup.nycAlias
      }

      const optionName = decamelize(name, '-')
      yargs.option(optionName, option)
      if (!setup.nycCommands.includes(command)) {
        yargs.hide(optionName)
      }
    })
  },
  /* istanbul ignore next: unsure how to test this */
  suppressEPIPE (error) {
    /* Prevent dumping error when `nyc npm t|head` causes stdout to
     * be closed when reporting runs. */
    if (error.code !== 'EPIPE') {
      throw error
    }
  },
  cliWrapper (execute) {
    return argv => {
      execute(argv).catch(error => {
        try {
          console.error(error.message)
        } catch (_) {
          /* We need to run process.exit(1) even if stderr is destroyed */
        }

        process.exit(1)
      })
    }
  }
}
