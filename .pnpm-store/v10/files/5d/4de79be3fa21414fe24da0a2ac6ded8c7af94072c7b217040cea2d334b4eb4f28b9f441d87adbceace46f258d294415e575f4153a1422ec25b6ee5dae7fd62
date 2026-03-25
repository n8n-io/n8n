const { fdir: Fdir } = require('fdir')
const path = require('path')
const picomatch = require('picomatch')

class Ls {
  constructor (directory = './', envFile = ['.env*'], excludeEnvFile = []) {
    this.ignore = ['node_modules/**', '.git/**']

    this.cwd = path.resolve(directory)
    this.envFile = envFile
    this.excludeEnvFile = excludeEnvFile
  }

  run () {
    return this._filepaths()
  }

  _filepaths () {
    const exclude = picomatch(this._exclude())
    const include = picomatch(this._patterns(), {
      ignore: this._exclude()
    })

    return new Fdir()
      .withRelativePaths()
      .exclude((dir, path) => exclude(path))
      .filter((path) => include(path))
      .crawl(this.cwd)
      .sync()
  }

  _patterns () {
    if (!Array.isArray(this.envFile)) {
      return [`**/${this.envFile}`]
    }

    return this.envFile.map(part => `**/${part}`)
  }

  _excludePatterns () {
    if (!Array.isArray(this.excludeEnvFile)) {
      return [`**/${this.excludeEnvFile}`]
    }

    return this.excludeEnvFile.map(part => `**/${part}`)
  }

  _exclude () {
    if (this._excludePatterns().length > 0) {
      return this.ignore.concat(this._excludePatterns())
    } else {
      return this.ignore
    }
  }
}

module.exports = Ls
