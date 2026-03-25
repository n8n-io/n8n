const Run = require('./run')
const Errors = require('./../helpers/errors')

class Get {
  constructor (key, envs = [], overload = false, DOTENV_KEY = '', all = false, envKeysFilepath = null) {
    this.key = key
    this.envs = envs
    this.overload = overload
    this.DOTENV_KEY = DOTENV_KEY
    this.all = all
    this.envKeysFilepath = envKeysFilepath
  }

  run () {
    const processEnv = { ...process.env }
    const { processedEnvs } = new Run(this.envs, this.overload, this.DOTENV_KEY, processEnv, this.envKeysFilepath).run()

    const errors = []
    for (const processedEnv of processedEnvs) {
      for (const error of processedEnv.errors) {
        errors.push(error)
      }
    }

    if (this.key) {
      const parsed = {}
      const value = processEnv[this.key]
      parsed[this.key] = value

      if (value === undefined) {
        errors.push(new Errors({ key: this.key }).missingKey())
      }

      return { parsed, errors }
    } else {
      // if user wants to return ALL envs (even prior set on machine)
      if (this.all) {
        return { parsed: processEnv, errors }
      }

      // typical scenario - return only envs that were identified in the .env file
      // iterate over all processedEnvs.parsed and grab from processEnv
      /** @type {Record<string, string>} */
      const parsed = {}
      for (const processedEnv of processedEnvs) {
        // parsed means we saw the key in a file or --env flag. this effectively filters out any preset machine envs - while still respecting complex evaluating, expansion, and overload. in other words, the value might be the machine value because the key was displayed in a .env file
        if (processedEnv.parsed) {
          for (const key of Object.keys(processedEnv.parsed)) {
            parsed[key] = processEnv[key]
          }
        }
      }

      return { parsed, errors }
    }
  }
}

module.exports = Get
