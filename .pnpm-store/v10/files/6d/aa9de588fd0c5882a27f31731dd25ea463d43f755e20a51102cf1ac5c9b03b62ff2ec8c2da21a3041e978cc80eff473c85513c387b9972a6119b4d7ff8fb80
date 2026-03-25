'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var environment = require('./environment-1c97264d.cjs');
var set = require('./set-5b47859e.cjs');
var pair = require('./pair-ab022bc3.cjs');
var dom = require('./dom-7e625b09.cjs');
var json = require('./json-092190a1.cjs');
var map = require('./map-24d263c0.cjs');
var eventloop = require('./eventloop-a0168106.cjs');
var math = require('./math-96d5e8c4.cjs');
var logging_common = require('./logging.common.cjs');
require('./string-fddc5f8b.cjs');
require('./array-78849c95.cjs');
require('./conditions-f5c0c102.cjs');
require('./storage.cjs');
require('./function-314580f7.cjs');
require('./object-c0c9435b.cjs');
require('./equality.cjs');
require('./schema.cjs');
require('./error-0c1f634f.cjs');
require('./prng-37d48618.cjs');
require('./binary-ac8e39e2.cjs');
require('./buffer-3e750729.cjs');
require('./encoding-1a745c43.cjs');
require('./number-1fb57bba.cjs');
require('./decoding-76e75827.cjs');
require('./time-d8438852.cjs');
require('./metric.cjs');
require('./symbol-9c439012.cjs');

/**
 * Isomorphic logging module with support for colors!
 *
 * @module logging
 */

/**
 * @type {Object<Symbol,pair.Pair<string,string>>}
 */
const _browserStyleMap = {
  [logging_common.BOLD]: pair.create('font-weight', 'bold'),
  [logging_common.UNBOLD]: pair.create('font-weight', 'normal'),
  [logging_common.BLUE]: pair.create('color', 'blue'),
  [logging_common.GREEN]: pair.create('color', 'green'),
  [logging_common.GREY]: pair.create('color', 'grey'),
  [logging_common.RED]: pair.create('color', 'red'),
  [logging_common.PURPLE]: pair.create('color', 'purple'),
  [logging_common.ORANGE]: pair.create('color', 'orange'), // not well supported in chrome when debugging node with inspector - TODO: deprecate
  [logging_common.UNCOLOR]: pair.create('color', 'black')
};

/**
 * @param {Array<string|Symbol|Object|number|function():any>} args
 * @return {Array<string|object|number>}
 */
/* c8 ignore start */
const computeBrowserLoggingArgs = (args) => {
  if (args.length === 1 && args[0]?.constructor === Function) {
    args = /** @type {Array<string|Symbol|Object|number>} */ (/** @type {[function]} */ (args)[0]());
  }
  const strBuilder = [];
  const styles = [];
  const currentStyle = map.create();
  /**
   * @type {Array<string|Object|number>}
   */
  let logArgs = [];
  // try with formatting until we find something unsupported
  let i = 0;
  for (; i < args.length; i++) {
    const arg = args[i];
    // @ts-ignore
    const style = _browserStyleMap[arg];
    if (style !== undefined) {
      currentStyle.set(style.left, style.right);
    } else {
      if (arg === undefined) {
        break
      }
      if (arg.constructor === String || arg.constructor === Number) {
        const style = dom.mapToStyleString(currentStyle);
        if (i > 0 || style.length > 0) {
          strBuilder.push('%c' + arg);
          styles.push(style);
        } else {
          strBuilder.push(arg);
        }
      } else {
        break
      }
    }
  }
  if (i > 0) {
    // create logArgs with what we have so far
    logArgs = styles;
    logArgs.unshift(strBuilder.join(''));
  }
  // append the rest
  for (; i < args.length; i++) {
    const arg = args[i];
    if (!(arg instanceof Symbol)) {
      logArgs.push(arg);
    }
  }
  return logArgs
};
/* c8 ignore stop */

/* c8 ignore start */
const computeLoggingArgs = environment.supportsColor
  ? computeBrowserLoggingArgs
  : logging_common.computeNoColorLoggingArgs;
/* c8 ignore stop */

/**
 * @param {Array<string|Symbol|Object|number>} args
 */
const print = (...args) => {
  console.log(...computeLoggingArgs(args));
  /* c8 ignore next */
  vconsoles.forEach((vc) => vc.print(args));
};

/* c8 ignore start */
/**
 * @param {Array<string|Symbol|Object|number>} args
 */
const warn = (...args) => {
  console.warn(...computeLoggingArgs(args));
  args.unshift(logging_common.ORANGE);
  vconsoles.forEach((vc) => vc.print(args));
};
/* c8 ignore stop */

/**
 * @param {Error} err
 */
/* c8 ignore start */
const printError = (err) => {
  console.error(err);
  vconsoles.forEach((vc) => vc.printError(err));
};
/* c8 ignore stop */

/**
 * @param {string} url image location
 * @param {number} height height of the image in pixel
 */
/* c8 ignore start */
const printImg = (url, height) => {
  if (environment.isBrowser) {
    console.log(
      '%c                      ',
      `font-size: ${height}px; background-size: contain; background-repeat: no-repeat; background-image: url(${url})`
    );
    // console.log('%c                ', `font-size: ${height}x; background: url(${url}) no-repeat;`)
  }
  vconsoles.forEach((vc) => vc.printImg(url, height));
};
/* c8 ignore stop */

/**
 * @param {string} base64
 * @param {number} height
 */
/* c8 ignore next 2 */
const printImgBase64 = (base64, height) =>
  printImg(`data:image/gif;base64,${base64}`, height);

/**
 * @param {Array<string|Symbol|Object|number>} args
 */
const group = (...args) => {
  console.group(...computeLoggingArgs(args));
  /* c8 ignore next */
  vconsoles.forEach((vc) => vc.group(args));
};

/**
 * @param {Array<string|Symbol|Object|number>} args
 */
const groupCollapsed = (...args) => {
  console.groupCollapsed(...computeLoggingArgs(args));
  /* c8 ignore next */
  vconsoles.forEach((vc) => vc.groupCollapsed(args));
};

const groupEnd = () => {
  console.groupEnd();
  /* c8 ignore next */
  vconsoles.forEach((vc) => vc.groupEnd());
};

/**
 * @param {function():Node} createNode
 */
/* c8 ignore next 2 */
const printDom = (createNode) =>
  vconsoles.forEach((vc) => vc.printDom(createNode()));

/**
 * @param {HTMLCanvasElement} canvas
 * @param {number} height
 */
/* c8 ignore next 2 */
const printCanvas = (canvas, height) =>
  printImg(canvas.toDataURL(), height);

const vconsoles = set.create();

/**
 * @param {Array<string|Symbol|Object|number>} args
 * @return {Array<Element>}
 */
/* c8 ignore start */
const _computeLineSpans = (args) => {
  const spans = [];
  const currentStyle = new Map();
  // try with formatting until we find something unsupported
  let i = 0;
  for (; i < args.length; i++) {
    let arg = args[i];
    // @ts-ignore
    const style = _browserStyleMap[arg];
    if (style !== undefined) {
      currentStyle.set(style.left, style.right);
    } else {
      if (arg === undefined) {
        arg = 'undefined ';
      }
      if (arg.constructor === String || arg.constructor === Number) {
        // @ts-ignore
        const span = dom.element('span', [
          pair.create('style', dom.mapToStyleString(currentStyle))
        ], [dom.text(arg.toString())]);
        if (span.innerHTML === '') {
          span.innerHTML = '&nbsp;';
        }
        spans.push(span);
      } else {
        break
      }
    }
  }
  // append the rest
  for (; i < args.length; i++) {
    let content = args[i];
    if (!(content instanceof Symbol)) {
      if (content.constructor !== String && content.constructor !== Number) {
        content = ' ' + json.stringify(content) + ' ';
      }
      spans.push(
        dom.element('span', [], [dom.text(/** @type {string} */ (content))])
      );
    }
  }
  return spans
};
/* c8 ignore stop */

const lineStyle =
  'font-family:monospace;border-bottom:1px solid #e2e2e2;padding:2px;';

/* c8 ignore start */
class VConsole {
  /**
   * @param {Element} dom
   */
  constructor (dom) {
    this.dom = dom;
    /**
     * @type {Element}
     */
    this.ccontainer = this.dom;
    this.depth = 0;
    vconsoles.add(this);
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
      ], [dom.text('▼')]);
      const triangleRight = dom.element('span', [
        pair.create('hidden', !collapsed),
        pair.create('style', 'color:grey;font-size:125%;')
      ], [dom.text('▶')]);
      const content = dom.element(
        'div',
        [pair.create(
          'style',
          `${lineStyle};padding-left:${this.depth * 10}px`
        )],
        [triangleDown, triangleRight, dom.text(' ')].concat(
          _computeLineSpans(args)
        )
      );
      const nextContainer = dom.element('div', [
        pair.create('hidden', collapsed)
      ]);
      const nextLine = dom.element('div', [], [content, nextContainer]);
      dom.append(this.ccontainer, [nextLine]);
      this.ccontainer = nextContainer;
      this.depth++;
      // when header is clicked, collapse/uncollapse container
      dom.addEventListener(content, 'click', (_event) => {
        nextContainer.toggleAttribute('hidden');
        triangleDown.toggleAttribute('hidden');
        triangleRight.toggleAttribute('hidden');
      });
    });
  }

  /**
   * @param {Array<string|Symbol|Object|number>} args
   */
  groupCollapsed (args) {
    this.group(args, true);
  }

  groupEnd () {
    eventloop.enqueue(() => {
      if (this.depth > 0) {
        this.depth--;
        // @ts-ignore
        this.ccontainer = this.ccontainer.parentElement.parentElement;
      }
    });
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
      ]);
    });
  }

  /**
   * @param {Error} err
   */
  printError (err) {
    this.print([logging_common.RED, logging_common.BOLD, err.toString()]);
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
      ]);
    });
  }

  /**
   * @param {Node} node
   */
  printDom (node) {
    eventloop.enqueue(() => {
      dom.append(this.ccontainer, [node]);
    });
  }

  destroy () {
    eventloop.enqueue(() => {
      vconsoles.delete(this);
    });
  }
}
/* c8 ignore stop */

/**
 * @param {Element} dom
 */
/* c8 ignore next */
const createVConsole = (dom) => new VConsole(dom);

/**
 * @param {string} moduleName
 * @return {function(...any):void}
 */
const createModuleLogger = (moduleName) => logging_common.createModuleLogger(print, moduleName);

exports.BLUE = logging_common.BLUE;
exports.BOLD = logging_common.BOLD;
exports.GREEN = logging_common.GREEN;
exports.GREY = logging_common.GREY;
exports.ORANGE = logging_common.ORANGE;
exports.PURPLE = logging_common.PURPLE;
exports.RED = logging_common.RED;
exports.UNBOLD = logging_common.UNBOLD;
exports.UNCOLOR = logging_common.UNCOLOR;
exports.VConsole = VConsole;
exports.createModuleLogger = createModuleLogger;
exports.createVConsole = createVConsole;
exports.group = group;
exports.groupCollapsed = groupCollapsed;
exports.groupEnd = groupEnd;
exports.print = print;
exports.printCanvas = printCanvas;
exports.printDom = printDom;
exports.printError = printError;
exports.printImg = printImg;
exports.printImgBase64 = printImgBase64;
exports.vconsoles = vconsoles;
exports.warn = warn;
//# sourceMappingURL=logging.cjs.map
