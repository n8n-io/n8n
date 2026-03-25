/* istanbul ignore file */
const fsx = require('./../helpers/fsx')
const path = require('path')
const ignore = require('ignore')

const Ls = require('../services/ls')

const isFullyEncrypted = require('./../helpers/isFullyEncrypted')
const packageJson = require('./../helpers/packageJson')
const MISSING_DOCKERIGNORE = '.env.keys' // by default only ignore .env.keys. all other .env* files COULD be included - as long as they are encrypted

class Prebuild {
  constructor (directory = './') {
    // args
    this.directory = directory

    this.excludeEnvFile = ['test/**', 'tests/**', 'spec/**', 'specs/**', 'pytest/**', 'test_suite/**']
  }

  run () {
    let count = 0
    const warnings = []
    let dockerignore = MISSING_DOCKERIGNORE

    // 1. check for .dockerignore file
    if (!fsx.existsSync('.dockerignore')) {
      const warning = new Error(`[dotenvx@${packageJson.version}][prebuild] .dockerignore missing`)
      warnings.push(warning)
    } else {
      dockerignore = fsx.readFileX('.dockerignore')
    }

    // 2. check .env* files against .dockerignore file
    const ig = ignore().add(dockerignore)
    const lsService = new Ls(this.directory, undefined, this.excludeEnvFile)
    const dotenvFiles = lsService.run()
    dotenvFiles.forEach(_file => {
      count += 1

      const file = path.join(this.directory, _file) // to handle when directory argument passed

      // check if that file is being ignored
      if (ig.ignores(file)) {
        if (file === '.env.example' || file === '.env.vault' || file === '.env.x') {
          const warning = new Error(`[dotenvx@${packageJson.version}][prebuild] ${file} (currently ignored but should not be)`)
          warning.help = `[dotenvx@${packageJson.version}][prebuild] ⮕  run [dotenvx ext gitignore --pattern !${file}]`
          warnings.push(warning)
        }
      } else {
        if (file !== '.env.example' && file !== '.env.vault' && file !== '.env.x') {
          const src = fsx.readFileX(file)
          const encrypted = isFullyEncrypted(src)

          // if contents are encrypted don't raise an error
          if (!encrypted) {
            let errorMsg = `[dotenvx@${packageJson.version}][prebuild] ${file} not protected (encrypted or dockerignored)`
            let errorHelp = `[dotenvx@${packageJson.version}][prebuild] ⮕  run [dotenvx encrypt -f ${file}] or [dotenvx ext gitignore --pattern ${file}]`
            if (file.includes('.env.keys')) {
              errorMsg = `[dotenvx@${packageJson.version}][prebuild] ${file} not protected (dockerignored)`
              errorHelp = `[dotenvx@${packageJson.version}][prebuild] ⮕  run [dotenvx ext gitignore --pattern ${file}]`
            }

            const error = new Error(errorMsg)
            error.help = errorHelp
            throw error
          }
        }
      }
    })

    let successMessage = `[dotenvx@${packageJson.version}][prebuild] .env files (${count}) protected (encrypted or dockerignored)`

    if (count === 0) {
      successMessage = `[dotenvx@${packageJson.version}][prebuild] zero .env files`
    }
    if (warnings.length > 0) {
      successMessage += ` with warnings (${warnings.length})`
    }

    return {
      successMessage,
      warnings
    }
  }
}

module.exports = Prebuild
