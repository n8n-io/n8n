const fsx = require('./../../../lib/helpers/fsx')

const DEFAULT_PATTERNS = ['.env*']
const { logger } = require('./../../../shared/logger')

class Generic {
  constructor (filename, patterns = DEFAULT_PATTERNS, touchFile = false) {
    this.filename = filename
    this.patterns = patterns
    this.touchFile = touchFile
  }

  append (str) {
    fsx.appendFileSync(this.filename, `\n${str}`)
  }

  run () {
    const changedPatterns = []
    if (!fsx.existsSync(this.filename)) {
      if (this.touchFile === true && this.patterns.length > 0) {
        fsx.writeFileX(this.filename, '')
      } else {
        return
      }
    }

    const lines = fsx.readFileX(this.filename).split(/\r?\n/)
    this.patterns.forEach(pattern => {
      if (!lines.includes(pattern.trim())) {
        this.append(pattern)

        changedPatterns.push(pattern.trim())
      }
    })

    if (changedPatterns.length > 0) {
      logger.success(`✔ ignored ${this.patterns} (${this.filename})`)
    } else {
      logger.info(`no changes (${this.filename})`)
    }
  }
}

class Git {
  constructor (patterns = DEFAULT_PATTERNS) {
    this.patterns = patterns
  }

  run () {
    logger.verbose('add to .gitignore')
    new Generic('.gitignore', this.patterns, true).run()
  }
}

class Docker {
  constructor (patterns = DEFAULT_PATTERNS) {
    this.patterns = patterns
  }

  run () {
    logger.verbose('add to .dockerignore (if exists)')
    new Generic('.dockerignore', this.patterns).run()
  }
}

class Npm {
  constructor (patterns = DEFAULT_PATTERNS) {
    this.patterns = patterns
  }

  run () {
    logger.verbose('add to .npmignore (if existing)')
    new Generic('.npmignore', this.patterns).run()
  }
}

class Vercel {
  constructor (patterns = DEFAULT_PATTERNS) {
    this.patterns = patterns
  }

  run () {
    logger.verbose('add to .vercelignore (if existing)')
    new Generic('.vercelignore', this.patterns).run()
  }
}

function gitignore () {
  const options = this.opts()
  logger.debug(`options: ${JSON.stringify(options)}`)

  const patterns = options.pattern

  new Git(patterns).run()
  new Docker(patterns).run()
  new Npm(patterns).run()
  new Vercel(patterns).run()
}

module.exports = gitignore
module.exports.Git = Git
module.exports.Docker = Docker
module.exports.Npm = Npm
module.exports.Vercel = Vercel
module.exports.Generic = Generic
