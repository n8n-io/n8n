/**
 * Isomorphic logging module with support for colors!
 *
 * @module logging
 */

import * as env from './environment.js'
import * as set from './set.js'
import * as pair from './pair.js'
import * as dom from './dom.js'
import * as json from './json.js'
import * as map from './map.js'
import * as eventloop from './eventloop.js'
import * as math from './math.js'
import * as common from './logging.common.js'

export { BOLD, UNBOLD, BLUE, GREY, GREEN, RED, PURPLE, ORANGE, UNCOLOR } from './logging.common.js'

/**
 * @type {Object<Symbol,pair.Pair<string,string>>}
 */
const _browserStyleMap = {
  [common.BOLD]: pair.create('font-weight', 'bold'),
  [common.UNBOLD]: pair.create('font-weight', 'normal'),
  [common.BLUE]: pair.create('color', 'blue'),
  [common.GREEN]: pair.create('color', 'green'),
  [common.GREY]: pair.create('color', 'grey'),
  [common.RED]: pair.create('color', 'red'),
  [common.PURPLE]: pair.create('color', 'purple'),
  [common.ORANGE]: pair.create('color', 'orange'), // not well supported in chrome when debugging node with inspector - TODO: deprecate
  [common.UNCOLOR]: pair.create('color', 'black')
}

/**
 * @param {Array<string|Symbol|Object|number|function():any>} args
 * @return {Array<string|object|number>}
 */
/* c8 ignore start */
const computeBrowserLoggingArgs = (args) => {
  if (args.length === 1 && args[0]?.constructor === Function) {
    args = /** @type {Array<string|Symbol|Object|number>} */ (/** @type {[function]} */ (args)[0]())
  }
  const strBuilder = []
  const styles = []
  const currentStyle = map.create()
  /**
   * @type {Array<string|Object|number>}
   */
  let logArgs = []
  // try with formatting until we find something unsupported
  let i = 0
  for (; i < args.length; i++) {
    const arg = args[i]
    // @ts-ignore
    const style = _browserStyleMap[arg]
    if (style !== undefined) {
      currentStyle.set(style.left, style.right)
    } else {
      if (arg === undefined) {
        break
      }
      if (arg.constructor === String || arg.constructor === Number) {
        const style = dom.mapToStyleString(currentStyle)
        if (i > 0 || style.length > 0) {
          strBuilder.push('%c' + arg)
          styles.push(style)
        } else {
          strBuilder.push(arg)
        }
      } else {
        break
      }
    }
  }
  if (i > 0) {
    // create logArgs with what we have so far
    logArgs = styles
    logArgs.unshift(strBuilder.join(''))
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
  ? computeBrowserLoggingArgs
  : common.computeNoColorLoggingArgs
/* c8 ignore stop */

/**
 * @param {Array<string|Symbol|Object|number>} args
 */
export const print = (...args) => {
  console.log(...computeLoggingArgs(args))
  /* c8 ignore next */
  vconsoles.forEach((vc) => vc.print(args))
}

/* c8 ignore start */
/**
 * @param {Array<string|Symbol|Object|number>} args
 */
export const warn = (...args) => {
  console.warn(...computeLoggingArgs(args))
  args.unshift(common.ORANGE)
  vconsoles.forEach((vc) => vc.print(args))
}
/* c8 ignore stop */

/**
 * @param {Error} err
 */
/* c8 ignore start */
export const printError = (err) => {
  console.error(err)
  vconsoles.forEach((vc) => vc.printError(err))
}
/* c8 ignore stop */

/**
 * @param {string} url image location
 * @param {number} height height of the image in pixel
 */
/* c8 ignore start */
export const printImg = (url, height) => {
  if (env.isBrowser) {
    console.log(
      '%c                      ',
      `font-size: ${height}px; background-size: contain; background-repeat: no-repeat; background-image: url(${url})`
    )
    // console.log('%c                ', `font-size: ${height}x; background: url(${url}) no-repeat;`)
  }
  vconsoles.forEach((vc) => vc.printImg(url, height))
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
export const group = (...args) => {
  console.group(...computeLoggingArgs(args))
  /* c8 ignore next */
  vconsoles.forEach((vc) => vc.group(args))
}

/**
 * @param {Array<string|Symbol|Object|number>} args
 */
export const groupCollapsed = (...args) => {
  console.groupCollapsed(...computeLoggingArgs(args))
  /* c8 ignore next */
  vconsoles.forEach((vc) => vc.groupCollapsed(args))
}

export const groupEnd = () => {
  console.groupEnd()
  /* c8 ignore next */
  vconsoles.forEach((vc) => vc.groupEnd())
}

/**
 * @param {function():Node} createNode
 */
/* c8 ignore next 2 */
export const printDom = (createNode) =>
  vconsoles.forEach((vc) => vc.printDom(createNode()))

/**
 * @param {HTMLCanvasElement} canvas
 * @param {number} height
 */
/* c8 ignore next 2 */
export const printCanvas = (canvas, height) =>
  printImg(canvas.toDataURL(), height)

export const vconsoles = set.create()

/**
 * @param {Array<string|Symbol|Object|number>} args
 * @return {Array<Element>}
 */
/* c8 ignore start */
const _computeLineSpans = (args) => {
  const spans = []
  const currentStyle = new Map()
  // try with formatting until we find something unsupported
  let i = 0
  for (; i < args.length; i++) {
    let arg = args[i]
    // @ts-ignore
    const style = _browserStyleMap[arg]
    if (style !== undefined) {
      currentStyle.set(style.left, style.right)
    } else {
      if (arg === undefined) {
        arg = 'undefined '
      }
      if (arg.constructor === String || arg.constructor === Number) {
        // @ts-ignore
        const span = dom.element('span', [
          pair.create('style', dom.mapToStyleString(currentStyle))
        ], [dom.text(arg.toString())])
        if (span.innerHTML === '') {
          span.innerHTML = '&nbsp;'
        }
        spans.push(span)
      } else {
        break
      }
    }
  }
  // append the rest
  for (; i < args.length; i++) {
    let content = args[i]
    if (!(content instanceof Symbol)) {
      if (content.constructor !== String && content.constructor !== Number) {
        content = ' ' + json.stringify(content) + ' '
      }
      spans.push(
        dom.element('span', [], [dom.text(/** @type {string} */ (content))])
      )
    }
  }
  return spans
}
/* c8 ignore stop */

const lineStyle =
  'font-family:monospace;border-bottom:1px solid #e2e2e2;padding:2px;'

/* c8 ignore start */
export class VConsole {
  /**
   * @param {Element} dom
   */
  constructor (dom) {
    this.dom = dom
    /**
     * @type {Element}
     */
    this.ccontainer = this.dom
    this.depth = 0
    vconsoles.add(this)
  }

  /**
   * @param {Array<string|Symbol|Object|number>} args
   * @param {boolean} collapsed
   */
  group (args, collapsed = false) {
    eventloop.enqueue(() => {
      const triangleDown = dom.element('span', [
        pair.create('hidden', collapsed),
        pair.create('style', 'color:grey;font-size:120%;')
      ], [dom.text('▼')])
      const triangleRight = dom.element('span', [
        pair.create('hidden', !collapsed),
        pair.create('style', 'color:grey;font-size:125%;')
      ], [dom.text('▶')])
      const content = dom.element(
        'div',
        [pair.create(
          'style',
          `${lineStyle};padding-left:${this.depth * 10}px`
        )],
        [triangleDown, triangleRight, dom.text(' ')].concat(
          _computeLineSpans(args)
        )
      )
      const nextContainer = dom.element('div', [
        pair.create('hidden', collapsed)
      ])
      const nextLine = dom.element('div', [], [content, nextContainer])
      dom.append(this.ccontainer, [nextLine])
      this.ccontainer = nextContainer
      this.depth++
      // when header is clicked, collapse/uncollapse container
      dom.addEventListener(content, 'click', (_event) => {
        nextContainer.toggleAttribute('hidden')
        triangleDown.toggleAttribute('hidden')
        triangleRight.toggleAttribute('hidden')
      })
    })
  }

  /**
   * @param {Array<string|Symbol|Object|number>} args
   */
  groupCollapsed (args) {
    this.group(args, true)
  }

  groupEnd () {
    eventloop.enqueue(() => {
      if (this.depth > 0) {
        this.depth--
        // @ts-ignore
        this.ccontainer = this.ccontainer.parentElement.parentElement
      }
    })
  }

  /**
   * @param {Array<string|Symbol|Object|number>} args
   */
  print (args) {
    eventloop.enqueue(() => {
      dom.append(this.ccontainer, [
        dom.element('div', [
          pair.create(
            'style',
            `${lineStyle};padding-left:${this.depth * 10}px`
          )
        ], _computeLineSpans(args))
      ])
    })
  }

  /**
   * @param {Error} err
   */
  printError (err) {
    this.print([common.RED, common.BOLD, err.toString()])
  }

  /**
   * @param {string} url
   * @param {number} height
   */
  printImg (url, height) {
    eventloop.enqueue(() => {
      dom.append(this.ccontainer, [
        dom.element('img', [
          pair.create('src', url),
          pair.create('height', `${math.round(height * 1.5)}px`)
        ])
      ])
    })
  }

  /**
   * @param {Node} node
   */
  printDom (node) {
    eventloop.enqueue(() => {
      dom.append(this.ccontainer, [node])
    })
  }

  destroy () {
    eventloop.enqueue(() => {
      vconsoles.delete(this)
    })
  }
}
/* c8 ignore stop */

/**
 * @param {Element} dom
 */
/* c8 ignore next */
export const createVConsole = (dom) => new VConsole(dom)

/**
 * @param {string} moduleName
 * @return {function(...any):void}
 */
export const createModuleLogger = (moduleName) => common.createModuleLogger(print, moduleName)
