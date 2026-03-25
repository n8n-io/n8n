import * as symbol from './symbol.js'
import * as time from './time.js'
import * as env from './environment.js'
import * as func from './function.js'
import * as json from './json.js'

export const BOLD = symbol.create()
export const UNBOLD = symbol.create()
export const BLUE = symbol.create()
export const GREY = symbol.create()
export const GREEN = symbol.create()
export const RED = symbol.create()
export const PURPLE = symbol.create()
export const ORANGE = symbol.create()
export const UNCOLOR = symbol.create()

/* c8 ignore start */
/**
 * @param {Array<undefined|string|Symbol|Object|number|function():any>} args
 * @return {Array<string|object|number|undefined>}
 */
export const computeNoColorLoggingArgs = args => {
  if (args.length === 1 && args[0]?.constructor === Function) {
    args = /** @type {Array<string|Symbol|Object|number>} */ (/** @type {[function]} */ (args)[0]())
  }
  const strBuilder = []
  const logArgs = []
  // try with formatting until we find something unsupported
  let i = 0
  for (; i < args.length; i++) {
    const arg = args[i]
    if (arg === undefined) {
      break
    } else if (arg.constructor === String || arg.constructor === Number) {
      strBuilder.push(arg)
    } else if (arg.constructor === Object) {
      break
    }
  }
  if (i > 0) {
    // create logArgs with what we have so far
    logArgs.push(strBuilder.join(''))
  }
  // append the rest
  for (; i < args.length; i++) {
    const arg = args[i]
    if (!(arg instanceof Symbol)) {
      logArgs.push(arg)
    }
  }
  return logArgs
}
/* c8 ignore stop */

const loggingColors = [GREEN, PURPLE, ORANGE, BLUE]
let nextColor = 0
let lastLoggingTime = time.getUnixTime()

/* c8 ignore start */
/**
 * @param {function(...any):void} _print
 * @param {string} moduleName
 * @return {function(...any):void}
 */
export const createModuleLogger = (_print, moduleName) => {
  const color = loggingColors[nextColor]
  const debugRegexVar = env.getVariable('log')
  const doLogging = debugRegexVar !== null &&
    (debugRegexVar === '*' || debugRegexVar === 'true' ||
      new RegExp(debugRegexVar, 'gi').test(moduleName))
  nextColor = (nextColor + 1) % loggingColors.length
  moduleName += ': '
  return !doLogging
    ? func.nop
    : (...args) => {
        if (args.length === 1 && args[0]?.constructor === Function) {
          args = args[0]()
        }
        const timeNow = time.getUnixTime()
        const timeDiff = timeNow - lastLoggingTime
        lastLoggingTime = timeNow
        _print(
          color,
          moduleName,
          UNCOLOR,
          ...args.map((arg) => {
            if (arg != null && arg.constructor === Uint8Array) {
              arg = Array.from(arg)
            }
            const t = typeof arg
            switch (t) {
              case 'string':
              case 'symbol':
                return arg
              default: {
                return json.stringify(arg)
              }
            }
          }),
          color,
          ' +' + timeDiff + 'ms'
        )
      }
}
/* c8 ignore stop */
