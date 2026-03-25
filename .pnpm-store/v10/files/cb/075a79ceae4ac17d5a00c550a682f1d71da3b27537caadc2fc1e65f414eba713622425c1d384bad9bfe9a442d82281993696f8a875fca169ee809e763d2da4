/* istanbul ignore file */
const fsx = require('./../helpers/fsx')
const path = require('path')
const ignore = require('ignore')

const Ls = require('../services/ls')

const isFullyEncrypted = require('./../helpers/isFullyEncrypted')
const packageJson = require('./../helpers/packageJson')
const InstallPrecommitHook = require('./../helpers/installPrecommitHook')
const childProcess = require('child_process')
const MISSING_GITIGNORE = '.env.keys' // by default only ignore .env.keys. all other .env* files COULD be included - as long as they are encrypted

class Precommit {
  constructor (directory = './', options = {}) {
    // args
    this.directory = directory
    // options
    this.install = options.install
    this.excludeEnvFile = ['test/**', 'tests/**', 'spec/**', 'specs/**', 'pytest/**', 'test_suite/**']
  }

  run () {
    if (this.install) {
      const {
        successMessage
      } = this._installPrecommitHook()

      return {
        successMessage,
        warnings: []
      }
    } else {
      let count = 0
      const warnings = []
      let gitignore = MISSING_GITIGNORE

      // 1. check for .gitignore file
      if (!fsx.existsSync('.gitignore')) {
        const warning = new Error(`[dotenvx@${packageJson.version}][precommit] .gitignore missing`)
        warnings.push(warning)
      } else {
        gitignore = fsx.readFileX('.gitignore')
      }

      // 2. check .env* files against .gitignore file
      const ig = ignore().add(gitignore)

      const lsService = new Ls(this.directory, undefined, this.excludeEnvFile)
      const dotenvFiles = lsService.run()
      dotenvFiles.forEach(_file => {
        count += 1

        const file = path.join(this.directory, _file) // to handle when directory argument passed

        // check if file is going to be committed
        if (this._isFileToBeCommitted(file)) {
          // check if that file is being ignored
          if (ig.ignores(file)) {
            if (file === '.env.example' || file === '.env.vault' || file === '.env.x') {
              const warning = new Error(`[dotenvx@${packageJson.version}][precommit] ${file} (currently ignored but should not be)`)
              warning.help = `[dotenvx@${packageJson.version}][precommit] ⮕  run [dotenvx ext gitignore --pattern !${file}]`
              warnings.push(warning)
            }
          } else {
            if (file !== '.env.example' && file !== '.env.vault' && file !== '.env.x') {
              const src = fsx.readFileX(file)
              const encrypted = isFullyEncrypted(src)

              // if contents are encrypted don't raise an error
              if (!encrypted) {
                let errorMsg = `[dotenvx@${packageJson.version}][precommit] ${file} not protected (encrypted or gitignored)`
                let errorHelp = `[dotenvx@${packageJson.version}][precommit] ⮕  run [dotenvx encrypt -f ${file}] or [dotenvx ext gitignore --pattern ${file}]`
                if (file.includes('.env.keys')) {
                  errorMsg = `[dotenvx@${packageJson.version}][precommit] ${file} not protected (gitignored)`
                  errorHelp = `[dotenvx@${packageJson.version}][precommit] ⮕  run [dotenvx ext gitignore --pattern ${file}]`
                }

                const error = new Error(errorMsg)
                error.help = errorHelp
                throw error
              }
            }
          }
        }
      })

      let successMessage = `[dotenvx@${packageJson.version}][precommit] .env files (${count}) protected (encrypted or gitignored)`
      if (count === 0) {
        successMessage = `[dotenvx@${packageJson.version}][precommit] zero .env files`
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

  _isInGitRepo () {
    try {
      childProcess.execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' })
      return true
    } catch {
      return false
    }
  }

  _isFileToBeCommitted (filePath) {
    try {
      if (!this._isInGitRepo()) {
        // consider file to be committed if there is an error (not a git repo)
        return true
      }

      const output = childProcess.execSync('git diff HEAD --name-only').toString()
      const files = output.split('\n')
      return files.includes(filePath)
    } catch (error) {
      // consider file to be committed if there is an error (not using git)
      return true
    }
  }

  _installPrecommitHook () {
    return new InstallPrecommitHook().run()
  }
}

module.exports = Precommit
