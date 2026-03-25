const { logger } = require('./../../shared/logger')

const conventions = require('./../../lib/helpers/conventions')
const escape = require('./../../lib/helpers/escape')

const Get = require('./../../lib/services/get')

function get (key) {
  if (key) {
    logger.debug(`key: ${key}`)
  }

  const options = this.opts()
  logger.debug(`options: ${JSON.stringify(options)}`)

  const ignore = options.ignore || []

  let envs = []
  // handle shorthand conventions - like --convention=nextjs
  if (options.convention) {
    envs = conventions(options.convention).concat(this.envs)
  } else {
    envs = this.envs
  }

  try {
    const { parsed, errors } = new Get(key, envs, options.overload, process.env.DOTENV_KEY, options.all, options.envKeysFile).run()

    for (const error of errors || []) {
      if (options.strict) throw error // throw immediately if strict

      if (ignore.includes(error.code)) {
        continue // ignore error
      }

      logger.error(error.message)
      if (error.help) {
        logger.error(error.help)
      }
    }

    if (key) {
      const single = parsed[key]
      if (single === undefined) {
        console.log('')
      } else {
        console.log(single)
      }
    } else {
      if (options.format === 'eval') {
        let inline = ''
        for (const [key, value] of Object.entries(parsed)) {
          inline += `${key}=${escape(value)}\n`
        }
        inline = inline.trim()

        console.log(inline)
      } else if (options.format === 'shell') {
        let inline = ''
        for (const [key, value] of Object.entries(parsed)) {
          inline += `${key}=${value} `
        }
        inline = inline.trim()

        console.log(inline)
      } else {
        let space = 0
        if (options.prettyPrint) {
          space = 2
        }

        console.log(JSON.stringify(parsed, null, space))
      }
    }
  } catch (error) {
    logger.error(error.message)
    if (error.help) {
      logger.error(error.help)
    }
    process.exit(1)
  }
}

module.exports = get
