const packageJson = require('../lib/helpers/packageJson')
const { getColor, bold } = require('./colors')

const levels = {
  error: 0,
  warn: 1,
  success: 2,
  successv: 2,
  info: 2,
  help: 2,
  verbose: 4,
  debug: 5,
  silly: 6
}

const error = (m) => bold(getColor('red')(m))
const warn = getColor('orangered')
const success = getColor('green')
const successv = getColor('olive') // yellow-ish tint that 'looks' like dotenv
const help = getColor('dodgerblue')
const verbose = getColor('plum')
const debug = getColor('plum')

let currentLevel = levels.info // default log level
let currentName = 'dotenvx' // default logger name
let currentVersion = packageJson.version // default logger version

function stderr (level, message) {
  const formattedMessage = formatMessage(level, message)
  console.error(formattedMessage)
}

function stdout (level, message) {
  if (levels[level] === undefined) {
    throw new Error(`MISSING_LOG_LEVEL: '${level}'. implement in logger.`)
  }

  if (levels[level] <= currentLevel) {
    const formattedMessage = formatMessage(level, message)
    console.log(formattedMessage)
  }
}

function formatMessage (level, message) {
  const formattedMessage = typeof message === 'object' ? JSON.stringify(message) : message

  switch (level.toLowerCase()) {
    // errors
    case 'error':
      return error(formattedMessage)
    // warns
    case 'warn':
      return warn(formattedMessage)
    // successes
    case 'success':
      return success(formattedMessage)
    case 'successv': // success with 'version'
      return successv(`[${currentName}@${currentVersion}] ${formattedMessage}`)
    // info
    case 'info':
      return formattedMessage
    // help
    case 'help':
      return help(formattedMessage)
    // verbose
    case 'verbose':
      return verbose(formattedMessage)
    // debug
    case 'debug':
      return debug(formattedMessage)
  }
}

const logger = {
  // track level
  level: 'info',

  // errors
  error: (msg) => stderr('error', msg),
  // warns
  warn: (msg) => stdout('warn', msg),
  // success
  success: (msg) => stdout('success', msg),
  successv: (msg) => stdout('successv', msg),
  // info
  info: (msg) => stdout('info', msg),
  // help
  help: (msg) => stdout('help', msg),
  // verbose
  verbose: (msg) => stdout('verbose', msg),
  // debug
  debug: (msg) => stdout('debug', msg),
  setLevel: (level) => {
    if (levels[level] !== undefined) {
      currentLevel = levels[level]
      logger.level = level
    }
  },
  setName: (name) => {
    currentName = name
    logger.name = name
  },
  setVersion: (version) => {
    currentVersion = version
    logger.version = version
  }
}

function setLogLevel (options) {
  const logLevel = options.debug
    ? 'debug'
    : options.verbose
      ? 'verbose'
      : options.quiet
        ? 'error'
        : options.logLevel

  if (!logLevel) return
  logger.setLevel(logLevel)
  // Only log which level it's setting if it's not set to quiet mode
  if (!options.quiet || (options.quiet && logLevel !== 'error')) {
    logger.debug(`Setting log level to ${logLevel}`)
  }
}

function setLogName (options) {
  const logName = options.logName
  if (!logName) return
  logger.setName(logName)
}

function setLogVersion (options) {
  const logVersion = options.logVersion
  if (!logVersion) return
  logger.setVersion(logVersion)
}

module.exports = {
  logger,
  getColor,
  setLogLevel,
  setLogName,
  setLogVersion,
  levels
}
