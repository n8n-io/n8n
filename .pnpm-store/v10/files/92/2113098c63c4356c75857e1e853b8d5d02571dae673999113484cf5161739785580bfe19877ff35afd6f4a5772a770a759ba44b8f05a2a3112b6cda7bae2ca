'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var symbol = require('./symbol-9c439012.cjs');
var time = require('./time-d8438852.cjs');
var environment = require('./environment-1c97264d.cjs');
var _function = require('./function-314580f7.cjs');
var json = require('./json-092190a1.cjs');
require('./metric.cjs');
require('./math-96d5e8c4.cjs');
require('./map-24d263c0.cjs');
require('./string-fddc5f8b.cjs');
require('./array-78849c95.cjs');
require('./set-5b47859e.cjs');
require('./conditions-f5c0c102.cjs');
require('./storage.cjs');
require('./object-c0c9435b.cjs');
require('./equality.cjs');

const BOLD = symbol.create();
const UNBOLD = symbol.create();
const BLUE = symbol.create();
const GREY = symbol.create();
const GREEN = symbol.create();
const RED = symbol.create();
const PURPLE = symbol.create();
const ORANGE = symbol.create();
const UNCOLOR = symbol.create();

/* c8 ignore start */
/**
 * @param {Array<undefined|string|Symbol|Object|number|function():any>} args
 * @return {Array<string|object|number|undefined>}
 */
const computeNoColorLoggingArgs = args => {
  if (args.length === 1 && args[0]?.constructor === Function) {
    args = /** @type {Array<string|Symbol|Object|number>} */ (/** @type {[function]} */ (args)[0]());
  }
  const strBuilder = [];
  const logArgs = [];
  // try with formatting until we find something unsupported
  let i = 0;
  for (; i < args.length; i++) {
    const arg = args[i];
    if (arg === undefined) {
      break
    } else if (arg.constructor === String || arg.constructor === Number) {
      strBuilder.push(arg);
    } else if (arg.constructor === Object) {
      break
    }
  }
  if (i > 0) {
    // create logArgs with what we have so far
    logArgs.push(strBuilder.join(''));
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

const loggingColors = [GREEN, PURPLE, ORANGE, BLUE];
let nextColor = 0;
let lastLoggingTime = time.getUnixTime();

/* c8 ignore start */
/**
 * @param {function(...any):void} _print
 * @param {string} moduleName
 * @return {function(...any):void}
 */
const createModuleLogger = (_print, moduleName) => {
  const color = loggingColors[nextColor];
  const debugRegexVar = environment.getVariable('log');
  const doLogging = debugRegexVar !== null &&
    (debugRegexVar === '*' || debugRegexVar === 'true' ||
      new RegExp(debugRegexVar, 'gi').test(moduleName));
  nextColor = (nextColor + 1) % loggingColors.length;
  moduleName += ': ';
  return !doLogging
    ? _function.nop
    : (...args) => {
        if (args.length === 1 && args[0]?.constructor === Function) {
          args = args[0]();
        }
        const timeNow = time.getUnixTime();
        const timeDiff = timeNow - lastLoggingTime;
        lastLoggingTime = timeNow;
        _print(
          color,
          moduleName,
          UNCOLOR,
          ...args.map((arg) => {
            if (arg != null && arg.constructor === Uint8Array) {
              arg = Array.from(arg);
            }
            const t = typeof arg;
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
        );
      }
};
/* c8 ignore stop */

exports.BLUE = BLUE;
exports.BOLD = BOLD;
exports.GREEN = GREEN;
exports.GREY = GREY;
exports.ORANGE = ORANGE;
exports.PURPLE = PURPLE;
exports.RED = RED;
exports.UNBOLD = UNBOLD;
exports.UNCOLOR = UNCOLOR;
exports.computeNoColorLoggingArgs = computeNoColorLoggingArgs;
exports.createModuleLogger = createModuleLogger;
//# sourceMappingURL=logging.common.cjs.map
