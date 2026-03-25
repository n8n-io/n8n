const fsx = require('./../helpers/fsx')
const path = require('path')

const Errors = require('../helpers/errors')
const findEnvFiles = require('../helpers/findEnvFiles')
const replace = require('../helpers/replace')
const dotenvParse = require('../helpers/dotenvParse')

class Genexample {
  constructor (directory = '.', envFile) {
    this.directory = directory
    this.envFile = envFile || findEnvFiles(directory)

    this.exampleFilename = '.env.example'
    this.exampleFilepath = path.resolve(this.directory, this.exampleFilename)
  }

  run () {
    if (this.envFile.length < 1) {
      const code = 'MISSING_ENV_FILES'
      const message = 'no .env* files found'
      const help = '? add one with [echo "HELLO=World" > .env] and then run [dotenvx genexample]'

      const error = new Error(message)
      error.code = code
      error.help = help
      throw error
    }

    const keys = new Set()
    const addedKeys = new Set()
    const envFilepaths = this._envFilepaths()
    /** @type {Record<string, string>} */
    const injected = {}
    /** @type {Record<string, string>} */
    const preExisted = {}

    let exampleSrc = `# ${this.exampleFilename} - generated with dotenvx\n`

    for (const envFilepath of envFilepaths) {
      const filepath = path.resolve(this.directory, envFilepath)
      if (!fsx.existsSync(filepath)) {
        const error = new Errors({ envFilepath, filepath }).missingEnvFile()
        error.help = `? add it with [echo "HELLO=World" > ${envFilepath}] and then run [dotenvx genexample]`
        throw error
      }

      // get the original src
      let src = fsx.readFileX(filepath)
      const parsed = dotenvParse(src)
      for (const key in parsed) {
        // used later
        keys.add(key)

        // once newSrc is built write it out
        src = replace(src, key, '') // empty value
      }

      exampleSrc += `\n${src}`
    }

    if (!fsx.existsSync(this.exampleFilepath)) {
      // it doesn't exist so just write this first generated one
      // exampleSrc - already written to from the prior loop
      for (const key of [...keys]) {
        // every key is added since it's the first time generating .env.example
        addedKeys.add(key)

        injected[key] = ''
      }
    } else {
      // it already exists (which means the user might have it modified a way in which they prefer, so replace exampleSrc with their existing .env.example)
      exampleSrc = fsx.readFileX(this.exampleFilepath)

      const parsed = dotenvParse(exampleSrc)
      for (const key of [...keys]) {
        if (key in parsed) {
          preExisted[key] = parsed[key]
        } else {
          exampleSrc += `${key}=''\n`

          addedKeys.add(key)

          injected[key] = ''
        }
      }
    }

    return {
      envExampleFile: exampleSrc,
      envFile: this.envFile,
      exampleFilepath: this.exampleFilepath,
      addedKeys: [...addedKeys],
      injected,
      preExisted
    }
  }

  _envFilepaths () {
    if (!Array.isArray(this.envFile)) {
      return [this.envFile]
    }

    return this.envFile
  }
}

module.exports = Genexample
