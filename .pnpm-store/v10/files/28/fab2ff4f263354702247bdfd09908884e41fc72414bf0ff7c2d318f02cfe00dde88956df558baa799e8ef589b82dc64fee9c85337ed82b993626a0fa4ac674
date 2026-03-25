/**
 * Isomorphic logging module with support for colors!
 *
 * @module logging
 */

import * as env from './environment.js'
import * as common from './logging.common.js'

export { BOLD, UNBOLD, BLUE, GREY, GREEN, RED, PURPLE, ORANGE, UNCOLOR } from './logging.common.js'

const _nodeStyleMap = {
  [common.BOLD]: '\u001b[1m',
  [common.UNBOLD]: '\u001b[2m',
  [common.BLUE]: '\x1b[34m',
  [common.GREEN]: '\x1b[32m',
  [common.GREY]: '\u001b[37m',
  [common.RED]: '\x1b[31m',
  [common.PURPLE]: '\x1b[35m',
  [common.ORANGE]: '\x1b[38;5;208m',
  [common.UNCOLOR]: '\x1b[0m'
}

/* c8 ignore start */
/**
 * @param {Array<string|undefined|Symbol|Object|number|function():Array<any>>} args
 * @return {Array<string|object|number|undefined>}
 */
const computeNodeLoggingArgs = (args) => {
  if (args.length === 1 && args[0]?.constructor === Function) {
    args = /** @type {Array<string|Symbol|Object|number>} */ (/** @type {[function]} */ (args)[0]())
  }
  const strBuilder = []
  const logArgs = []
  // try with formatting until we find something unsupported
  let i = 0
  for (; i < args.length; i++) {
    const arg = args[i]
    // @ts-ignore
    const style = _nodeStyleMap[arg]
    if (style !== undefined) {
      strBuilder.push(style)
    } else {
      if (arg === undefined) {
        break
      } else if (arg.constructor === String || arg.constructor === Number) {
        strBuilder.push(arg)
      } else {
        break
      }
    }
  }
  if (i > 0) {
    // create logArgs with what we have so far
    strBuilder.push('\x1b[0m')
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

/* c8 ignore start */
const computeLoggingArgs = env.supportsColor
  ? computeNodeLoggingArgs
  : common.computeNoColorLoggingArgs
/* c8 ignore stop */

/**
 * @param {Array<string|Symbol|Object|number|undefined>} args
 */
export const print = (...args) => {
  console.log(...computeLoggingArgs(args))
}

/* c8 ignore start */
/**
 * @param {Array<string|Symbol|Object|number>} args
 */
export const warn = (...args) => {
  console.warn(...computeLoggingArgs(args))
}
/* c8 ignore stop */

/**
 * @param {Error} err
 */
/* c8 ignore start */
export const printError = (err) => {
  console.error(err)
}
/* c8 ignore stop */

/**
 * @param {string} _url image location
 * @param {number} _height height of the image in pixel
 */
/* c8 ignore start */
export const printImg = (_url, _height) => {
  // console.log('%c                ', `font-size: ${height}x; background: url(${url}) no-repeat;`)
}
/* c8 ignore stop */

/**
 * @param {string} base64
 * @param {number} height
 */
/* c8 ignore next 2 */
export const printImgBase64 = (base64, height) =>
  printImg(`data:image/gif;base64,${base64}`, height)

/**
 * @param {Array<string|Symbol|Object|number>} args
 */
/* c8 ignore next 3 */
export const group = (...args) => {
  console.group(...computeLoggingArgs(args))
}

/**
 * @param {Array<string|Symbol|Object|number>} args
 */
/* c8 ignore next 3 */
export const groupCollapsed = (...args) => {
  console.groupCollapsed(...computeLoggingArgs(args))
}

/* c8 ignore next 3 */
export const groupEnd = () => {
  console.groupEnd()
}

/**
 * @param {function():Node} _createNode
 */
/* c8 ignore next 2 */
export const printDom = (_createNode) => {}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {number} height
 */
/* c8 ignore next 2 */
export const printCanvas = (canvas, height) =>
  printImg(canvas.toDataURL(), height)

/**
 * @param {Element} _dom
 */
/* c8 ignore next */
export const createVConsole = (_dom) => {}

/**
 * @param {string} moduleName
 * @return {function(...any):void}
 */
/* c8 ignore next */
export const createModuleLogger = (moduleName) => common.createModuleLogger(print, moduleName)
