'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var log = require('lib0/logging');
var diff = require('./diff-9d236524.cjs');
var object = require('./object-c0c9435b.cjs');
var string = require('./string-fddc5f8b.cjs');
var math = require('./math-96d5e8c4.cjs');
var random = require('./random.cjs');
var prng = require('./prng-37d48618.cjs');
var statistics = require('./statistics-65f6114b.cjs');
var array = require('./array-78849c95.cjs');
var environment = require('./environment-1c97264d.cjs');
var json = require('./json-092190a1.cjs');
var time = require('./time-d8438852.cjs');
var promise = require('./promise-cda7b9bb.cjs');
var performance = require('lib0/performance');
var equality = require('./equality.cjs');
require('./function-314580f7.cjs');
require('./binary-ac8e39e2.cjs');
require('lib0/webcrypto');
require('./buffer-3e750729.cjs');
require('./encoding-1a745c43.cjs');
require('./number-1fb57bba.cjs');
require('./decoding-76e75827.cjs');
require('./error-0c1f634f.cjs');
require('./set-5b47859e.cjs');
require('./map-24d263c0.cjs');
require('./conditions-f5c0c102.cjs');
require('./storage.cjs');
require('./metric.cjs');

function _interopNamespace(e) {
  if (e && e.__esModule) return e;
  var n = Object.create(null);
  if (e) {
    Object.keys(e).forEach(function (k) {
      if (k !== 'default') {
        var d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: function () { return e[k]; }
        });
      }
    });
  }
  n["default"] = e;
  return Object.freeze(n);
}

var log__namespace = /*#__PURE__*/_interopNamespace(log);
var performance__namespace = /*#__PURE__*/_interopNamespace(performance);

/**
 * Testing framework with support for generating tests.
 *
 * ```js
 * // test.js template for creating a test executable
 * import { runTests } from 'lib0/testing'
 * import * as log from 'lib0/logging'
 * import * as mod1 from './mod1.test.js'
 * import * as mod2 from './mod2.test.js'

 * import { isBrowser, isNode } from 'lib0/environment.js'
 *
 * if (isBrowser) {
 *   // optional: if this is ran in the browser, attach a virtual console to the dom
 *   log.createVConsole(document.body)
 * }
 *
 * runTests({
 *  mod1,
 *  mod2,
 * }).then(success => {
 *   if (isNode) {
 *     process.exit(success ? 0 : 1)
 *   }
 * })
 * ```
 *
 * ```js
 * // mod1.test.js
 * /**
 *  * runTests automatically tests all exported functions that start with "test".
 *  * The name of the function should be in camelCase and is used for the logging output.
 *  *
 *  * @ param {t.TestCase} tc
 *  *\/
 * export const testMyFirstTest = tc => {
 *   t.compare({ a: 4 }, { a: 4 }, 'objects are equal')
 * }
 * ```
 *
 * Now you can simply run `node test.js` to run your test or run test.js in the browser.
 *
 * @module testing
 */
const extensive = environment.hasConf('extensive');

/* c8 ignore next */
const envSeed = environment.hasParam('--seed') ? Number.parseInt(environment.getParam('--seed', '0')) : null;

class TestCase {
  /**
   * @param {string} moduleName
   * @param {string} testName
   */
  constructor (moduleName, testName) {
    /**
     * @type {string}
     */
    this.moduleName = moduleName;
    /**
     * @type {string}
     */
    this.testName = testName;
    /**
     * This type can store custom information related to the TestCase
     *
     * @type {Map<string,any>}
     */
    this.meta = new Map();
    this._seed = null;
    this._prng = null;
  }

  resetSeed () {
    this._seed = null;
    this._prng = null;
  }

  /**
   * @type {number}
   */
  /* c8 ignore next */
  get seed () {
    /* c8 ignore else */
    if (this._seed === null) {
      /* c8 ignore next */
      this._seed = envSeed === null ? random.uint32() : envSeed;
    }
    return this._seed
  }

  /**
   * A PRNG for this test case. Use only this PRNG for randomness to make the test case reproducible.
   *
   * @type {prng.PRNG}
   */
  get prng () {
    /* c8 ignore else */
    if (this._prng === null) {
      this._prng = prng.create(this.seed);
    }
    return this._prng
  }
}

const repetitionTime = Number(environment.getParam('--repetition-time', '50'));
/* c8 ignore next */
const testFilter = environment.hasParam('--filter') ? environment.getParam('--filter', '') : null;

/* c8 ignore next */
const testFilterRegExp = testFilter !== null ? new RegExp(testFilter) : /.*/;

const repeatTestRegex = /^(repeat|repeating)\s/;

/**
 * @param {string} moduleName
 * @param {string} name
 * @param {function(TestCase):void|Promise<any>} f
 * @param {number} i
 * @param {number} numberOfTests
 */
const run = async (moduleName, name, f, i, numberOfTests) => {
  const uncamelized = string.fromCamelCase(name.slice(4), ' ');
  const filtered = !testFilterRegExp.test(`[${i + 1}/${numberOfTests}] ${moduleName}: ${uncamelized}`);
  /* c8 ignore next 3 */
  if (filtered) {
    return true
  }
  const tc = new TestCase(moduleName, name);
  const repeat = repeatTestRegex.test(uncamelized);
  const groupArgs = [log__namespace.GREY, `[${i + 1}/${numberOfTests}] `, log__namespace.PURPLE, `${moduleName}: `, log__namespace.BLUE, uncamelized];
  /* c8 ignore next 5 */
  if (testFilter === null) {
    log__namespace.groupCollapsed(...groupArgs);
  } else {
    log__namespace.group(...groupArgs);
  }
  const times = [];
  const start = performance__namespace.now();
  let lastTime = start;
  /**
   * @type {any}
   */
  let err = null;
  performance__namespace.mark(`${name}-start`);
  do {
    try {
      const p = f(tc);
      if (promise.isPromise(p)) {
        await p;
      }
    } catch (_err) {
      err = _err;
    }
    const currTime = performance__namespace.now();
    times.push(currTime - lastTime);
    lastTime = currTime;
    if (repeat && err === null && (lastTime - start) < repetitionTime) {
      tc.resetSeed();
    } else {
      break
    }
  } while (err === null && (lastTime - start) < repetitionTime)
  performance__namespace.mark(`${name}-end`);
  /* c8 ignore next 3 */
  if (err !== null && err.constructor !== SkipError) {
    log__namespace.printError(err);
  }
  performance__namespace.measure(name, `${name}-start`, `${name}-end`);
  log__namespace.groupEnd();
  const duration = lastTime - start;
  let success = true;
  times.sort((a, b) => a - b);
  /* c8 ignore next 3 */
  const againMessage = environment.isBrowser
    ? `     - ${window.location.host + window.location.pathname}?filter=\\[${i + 1}/${tc._seed === null ? '' : `&seed=${tc._seed}`}`
    : `\nrepeat: npm run test -- --filter "\\[${i + 1}/" ${tc._seed === null ? '' : `--seed ${tc._seed}`}`;
  const timeInfo = (repeat && err === null)
    ? ` - ${times.length} repetitions in ${time.humanizeDuration(duration)} (best: ${time.humanizeDuration(times[0])}, worst: ${time.humanizeDuration(array.last(times))}, median: ${time.humanizeDuration(statistics.median(times))}, average: ${time.humanizeDuration(statistics.average(times))})`
    : ` in ${time.humanizeDuration(duration)}`;
  if (err !== null) {
    /* c8 ignore start */
    if (err.constructor === SkipError) {
      log__namespace.print(log__namespace.GREY, log__namespace.BOLD, 'Skipped: ', log__namespace.UNBOLD, uncamelized);
    } else {
      success = false;
      log__namespace.print(log__namespace.RED, log__namespace.BOLD, 'Failure: ', log__namespace.UNBOLD, log__namespace.UNCOLOR, uncamelized, log__namespace.GREY, timeInfo, againMessage);
    }
    /* c8 ignore stop */
  } else {
    log__namespace.print(log__namespace.GREEN, log__namespace.BOLD, 'Success: ', log__namespace.UNBOLD, log__namespace.UNCOLOR, uncamelized, log__namespace.GREY, timeInfo, againMessage);
  }
  return success
};

/**
 * Describe what you are currently testing. The message will be logged.
 *
 * ```js
 * export const testMyFirstTest = tc => {
 *   t.describe('crunching numbers', 'already crunched 4 numbers!') // the optional second argument can describe the state.
 * }
 * ```
 *
 * @param {string} description
 * @param {string} info
 */
const describe = (description, info = '') => log__namespace.print(log__namespace.BLUE, description, ' ', log__namespace.GREY, info);

/**
 * Describe the state of the current computation.
 * ```js
 * export const testMyFirstTest = tc => {
 *   t.info(already crunched 4 numbers!') // the optional second argument can describe the state.
 * }
 * ```
 *
 * @param {string} info
 */
const info = info => describe('', info);

const printDom = log__namespace.printDom;

const printCanvas = log__namespace.printCanvas;

/**
 * Group outputs in a collapsible category.
 *
 * ```js
 * export const testMyFirstTest = tc => {
 *   t.group('subtest 1', () => {
 *     t.describe('this message is part of a collapsible section')
 *   })
 *   await t.groupAsync('subtest async 2', async () => {
 *     await someaction()
 *     t.describe('this message is part of a collapsible section')
 *   })
 * }
 * ```
 *
 * @param {string} description
 * @param {function(...any):void} f
 */
const group = (description, f) => {
  log__namespace.group(log__namespace.BLUE, description);
  try {
    f();
  } finally {
    log__namespace.groupEnd();
  }
};

/**
 * Group outputs in a collapsible category.
 *
 * ```js
 * export const testMyFirstTest = async tc => {
 *   t.group('subtest 1', () => {
 *     t.describe('this message is part of a collapsible section')
 *   })
 *   await t.groupAsync('subtest async 2', async () => {
 *     await someaction()
 *     t.describe('this message is part of a collapsible section')
 *   })
 * }
 * ```
 *
 * @param {string} description
 * @param {function(...any):Promise<any>} f
 */
const groupAsync = async (description, f) => {
  log__namespace.group(log__namespace.BLUE, description);
  try {
    await f();
  } finally {
    log__namespace.groupEnd();
  }
};

/**
 * Measure the time that it takes to calculate something.
 *
 * ```js
 * export const testMyFirstTest = async tc => {
 *   t.measureTime('measurement', () => {
 *     heavyCalculation()
 *   })
 *   await t.groupAsync('async measurement', async () => {
 *     await heavyAsyncCalculation()
 *   })
 * }
 * ```
 *
 * @param {string} message
 * @param {function(...any):void} f
 * @return {number} Returns a promise that resolves the measured duration to apply f
 */
const measureTime = (message, f) => {
  let duration;
  const start = performance__namespace.now();
  try {
    f();
  } finally {
    duration = performance__namespace.now() - start;
    log__namespace.print(log__namespace.PURPLE, message, log__namespace.GREY, ` ${time.humanizeDuration(duration)}`);
  }
  return duration
};

/**
 * Measure the time that it takes to calculate something.
 *
 * ```js
 * export const testMyFirstTest = async tc => {
 *   t.measureTimeAsync('measurement', async () => {
 *     await heavyCalculation()
 *   })
 *   await t.groupAsync('async measurement', async () => {
 *     await heavyAsyncCalculation()
 *   })
 * }
 * ```
 *
 * @param {string} message
 * @param {function(...any):Promise<any>} f
 * @return {Promise<number>} Returns a promise that resolves the measured duration to apply f
 */
const measureTimeAsync = async (message, f) => {
  let duration;
  const start = performance__namespace.now();
  try {
    await f();
  } finally {
    duration = performance__namespace.now() - start;
    log__namespace.print(log__namespace.PURPLE, message, log__namespace.GREY, ` ${time.humanizeDuration(duration)}`);
  }
  return duration
};

/**
 * @template T
 * @param {Array<T>} as
 * @param {Array<T>} bs
 * @param {string} [m]
 * @return {boolean}
 */
const compareArrays = (as, bs, m = 'Arrays match') => {
  if (as.length !== bs.length) {
    fail(m);
  }
  for (let i = 0; i < as.length; i++) {
    if (as[i] !== bs[i]) {
      fail(m);
    }
  }
  return true
};

/**
 * @param {string} a
 * @param {string} b
 * @param {string} [m]
 * @throws {TestError} Throws if tests fails
 */
const compareStrings = (a, b, m = 'Strings match') => {
  if (a !== b) {
    const diff$1 = diff.simpleDiffString(a, b);
    log__namespace.print(log__namespace.GREY, a.slice(0, diff$1.index), log__namespace.RED, a.slice(diff$1.index, diff$1.remove), log__namespace.GREEN, diff$1.insert, log__namespace.GREY, a.slice(diff$1.index + diff$1.remove));
    fail(m);
  }
};

/**
 * @template K,V
 * @param {Object<K,V>} a
 * @param {Object<K,V>} b
 * @param {string} [m]
 * @throws {TestError} Throws if test fails
 */
const compareObjects = (a, b, m = 'Objects match') => { object.equalFlat(a, b) || fail(m); };

/**
 * @param {any} _constructor
 * @param {any} a
 * @param {any} b
 * @param {string} path
 * @throws {TestError}
 */
const compareValues = (_constructor, a, b, path) => {
  if (a !== b) {
    fail(`Values ${json.stringify(a)} and ${json.stringify(b)} don't match (${path})`);
  }
  return true
};

/**
 * @param {string?} message
 * @param {string} reason
 * @param {string} path
 * @throws {TestError}
 */
const _failMessage = (message, reason, path) => fail(
  message === null
    ? `${reason} ${path}`
    : `${message} (${reason}) ${path}`
);

/**
 * @param {any} a
 * @param {any} b
 * @param {string} path
 * @param {string?} message
 * @param {function(any,any,any,string,any):boolean} customCompare
 */
const _compare = (a, b, path, message, customCompare) => {
  // we don't use assert here because we want to test all branches (istanbul errors if one branch is not tested)
  if (a == null || b == null) {
    return compareValues(null, a, b, path)
  }
  if (a[equality.EqualityTraitSymbol] != null) {
    if (a[equality.EqualityTraitSymbol](b)) {
      return true
    } else {
      _failMessage(message, 'Not equal by equality trait', path);
    }
  }
  if (a.constructor !== b.constructor) {
    _failMessage(message, 'Constructors don\'t match', path);
  }
  let success = true;
  switch (a.constructor) {
    case ArrayBuffer:
      a = new Uint8Array(a);
      b = new Uint8Array(b);
    // eslint-disable-next-line no-fallthrough
    case Uint8Array: {
      if (a.byteLength !== b.byteLength) {
        _failMessage(message, 'ArrayBuffer lengths match', path);
      }
      for (let i = 0; success && i < a.length; i++) {
        success = success && a[i] === b[i];
      }
      break
    }
    case Set: {
      if (a.size !== b.size) {
        _failMessage(message, 'Sets have different number of attributes', path);
      }
      // @ts-ignore
      a.forEach(value => {
        if (!b.has(value)) {
          _failMessage(message, `b.${path} does have ${value}`, path);
        }
      });
      break
    }
    case Map: {
      if (a.size !== b.size) {
        _failMessage(message, 'Maps have different number of attributes', path);
      }
      // @ts-ignore
      a.forEach((value, key) => {
        if (!b.has(key)) {
          _failMessage(message, `Property ${path}["${key}"] does not exist on second argument`, path);
        }
        _compare(value, b.get(key), `${path}["${key}"]`, message, customCompare);
      });
      break
    }
    case undefined: // undefined is often set as a constructor for objects
    case Object:
      if (object.length(a) !== object.length(b)) {
        _failMessage(message, 'Objects have a different number of attributes', path);
      }
      object.forEach(a, (value, key) => {
        if (!object.hasProperty(b, key)) {
          _failMessage(message, `Property ${path} does not exist on second argument`, path);
        }
        _compare(value, b[key], `${path}["${key}"]`, message, customCompare);
      });
      break
    case Array:
      if (a.length !== b.length) {
        _failMessage(message, 'Arrays have a different number of attributes', path);
      }
      // @ts-ignore
      a.forEach((value, i) => _compare(value, b[i], `${path}[${i}]`, message, customCompare));
      break
    /* c8 ignore next 4 */
    default:
      if (!customCompare(a.constructor, a, b, path, compareValues)) {
        _failMessage(message, `Values ${json.stringify(a)} and ${json.stringify(b)} don't match`, path);
      }
  }
  assert(success, message);
  return true
};

/**
 * @template T
 * @param {T} a
 * @param {T} b
 * @param {string?} [message]
 * @param {function(any,T,T,string,any):boolean} [customCompare]
 */
const compare = (a, b, message = null, customCompare = compareValues) => _compare(a, b, 'obj', message, customCompare);

/**
 * @template T
 * @param {T} property
 * @param {string?} [message]
 * @return {asserts property is NonNullable<T>}
 * @throws {TestError}
 */
/* c8 ignore next */
const assert = (property, message = null) => { property || fail(`Assertion failed${message !== null ? `: ${message}` : ''}`); };

/**
 * @param {function(...any):Promise<any>} f
 */
const promiseRejected = async f => {
  try {
    await f();
  } catch (err) {
    return
  }
  fail('Expected promise to fail');
};

/**
 * @param {function(...any):void} f
 * @throws {TestError}
 */
const fails = f => {
  try {
    f();
  } catch (_err) {
    log__namespace.print(log__namespace.GREEN, '⇖ This Error was expected');
    return
  }
  fail('Expected this to fail');
};

/**
 * @param {function(...any):Promise<any>} f
 * @throws {TestError}
 */
const failsAsync = async f => {
  try {
    await f();
  } catch (_err) {
    log__namespace.print(log__namespace.GREEN, '⇖ This Error was expected');
    return
  }
  fail('Expected this to fail');
};

/**
 * @param {Object<string, Object<string, function(TestCase):void|Promise<any>>>} tests
 */
const runTests = async tests => {
  /**
   * @param {string} testname
   */
  const filterTest = testname => testname.startsWith('test') || testname.startsWith('benchmark');
  const numberOfTests = object.map(tests, mod => object.map(mod, (f, fname) => /* c8 ignore next */ f && filterTest(fname) ? 1 : 0).reduce(math.add, 0)).reduce(math.add, 0);
  let successfulTests = 0;
  let testnumber = 0;
  const start = performance__namespace.now();
  for (const modName in tests) {
    const mod = tests[modName];
    for (const fname in mod) {
      const f = mod[fname];
      /* c8 ignore else */
      if (f && filterTest(fname)) {
        const repeatEachTest = 1;
        let success = true;
        for (let i = 0; success && i < repeatEachTest; i++) {
          success = await run(modName, fname, f, testnumber, numberOfTests);
        }
        testnumber++;
        /* c8 ignore else */
        if (success) {
          successfulTests++;
        }
      }
    }
  }
  const end = performance__namespace.now();
  log__namespace.print('');
  const success = successfulTests === numberOfTests;
  /* c8 ignore start */
  if (success) {
    log__namespace.print(log__namespace.GREEN, log__namespace.BOLD, 'All tests successful!', log__namespace.GREY, log__namespace.UNBOLD, ` in ${time.humanizeDuration(end - start)}`);
    log__namespace.printImgBase64(nyanCatImage, 50);
  } else {
    const failedTests = numberOfTests - successfulTests;
    log__namespace.print(log__namespace.RED, log__namespace.BOLD, `> ${failedTests} test${failedTests > 1 ? 's' : ''} failed`);
  }
  /* c8 ignore stop */
  return success
};

class TestError extends Error {}

/**
 * @param {string} reason
 * @throws {TestError}
 */
const fail = reason => {
  log__namespace.print(log__namespace.RED, log__namespace.BOLD, 'X ', log__namespace.UNBOLD, reason);
  throw new TestError('Test Failed')
};

class SkipError extends Error {}

/**
 * @param {boolean} cond If true, this tests will be skipped
 * @throws {SkipError}
 */
const skip = (cond = true) => {
  if (cond) {
    throw new SkipError('skipping..')
  }
};

// eslint-disable-next-line
const nyanCatImage = 'R0lGODlhjABMAPcAAMiSE0xMTEzMzUKJzjQ0NFsoKPc7//FM/9mH/z9x0HIiIoKCgmBHN+frGSkZLdDQ0LCwsDk71g0KCUzDdrQQEOFz/8yYdelmBdTiHFxcXDU2erR/mLrTHCgoKK5szBQUFNgSCTk6ymfpCB9VZS2Bl+cGBt2N8kWm0uDcGXhZRUvGq94NCFPhDiwsLGVlZTgqIPMDA1g3aEzS5D6xAURERDtG9JmBjJsZGWs2AD1W6Hp6eswyDeJ4CFNTU1LcEoJRmTMzSd14CTg5ser2GmDzBd17/xkZGUzMvoSMDiEhIfKruCwNAJaWlvRzA8kNDXDrCfi0pe1U/+GS6SZrAB4eHpZwVhoabsx9oiYmJt/TGHFxcYyMjOid0+Zl/0rF6j09PeRr/0zU9DxO6j+z0lXtBtp8qJhMAEssLGhoaPL/GVn/AAsWJ/9/AE3Z/zs9/3cAAOlf/+aa2RIyADo85uhh/0i84WtrazQ0UyMlmDMzPwUFBe16BTMmHau0E03X+g8pMEAoS1MBAf++kkzO8pBaqSZoe9uB/zE0BUQ3Sv///4WFheuiyzo880gzNDIyNissBNqF/8RiAOF2qG5ubj0vL1z6Avl5ASsgGkgUSy8vL/8n/z4zJy8lOv96uEssV1csAN5ZCDQ0Wz1a3tbEGHLeDdYKCg4PATE7PiMVFSoqU83eHEi43gUPAOZ8reGogeKU5dBBC8faHEez2lHYF4bQFMukFtl4CzY3kkzBVJfMGZkAAMfSFf27mP0t//g4/9R6Dfsy/1DRIUnSAPRD/0fMAFQ0Q+l7rnbaD0vEntCDD6rSGtO8GNpUCU/MK07LPNEfC7RaABUWWkgtOst+71v9AfD7GfDw8P19ATtA/NJpAONgB9yL+fm6jzIxMdnNGJxht1/2A9x//9jHGOSX3+5tBP27l35+fk5OTvZ9AhYgTjo0PUhGSDs9+LZjCFf2Aw0IDwcVAA8PD5lwg9+Q7YaChC0kJP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACH/C05FVFNDQVBFMi4wAwEAAAAh/wtYTVAgRGF0YVhNUDw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMC1jMDYwIDYxLjEzNDc3NywgMjAxMC8wMi8xMi0xNzozMjowMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDpGNEM2MUEyMzE0QTRFMTExOUQzRkE3QTBCRDNBMjdBQyIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDpERjQ0NEY0QkI2MTcxMUUxOUJEQkUzNUNGQTkwRTU2MiIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDpERjQ0NEY0QUI2MTcxMUUxOUJEQkUzNUNGQTkwRTU2MiIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ1M1IFdpbmRvd3MiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo1OEE3RTIwRjcyQTlFMTExOTQ1QkY2QTU5QzVCQjJBOSIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDpGNEM2MUEyMzE0QTRFMTExOUQzRkE3QTBCRDNBMjdBQyIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PgH//v38+/r5+Pf29fTz8vHw7+7t7Ovq6ejn5uXk4+Lh4N/e3dzb2tnY19bV1NPS0dDPzs3My8rJyMfGxcTDwsHAv769vLu6ubi3trW0s7KxsK+urayrqqmop6alpKOioaCfnp2cm5qZmJeWlZSTkpGQj46NjIuKiYiHhoWEg4KBgH9+fXx7enl4d3Z1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';

exports.production = environment.production;
exports.TestCase = TestCase;
exports.assert = assert;
exports.compare = compare;
exports.compareArrays = compareArrays;
exports.compareObjects = compareObjects;
exports.compareStrings = compareStrings;
exports.describe = describe;
exports.envSeed = envSeed;
exports.extensive = extensive;
exports.fail = fail;
exports.fails = fails;
exports.failsAsync = failsAsync;
exports.group = group;
exports.groupAsync = groupAsync;
exports.info = info;
exports.measureTime = measureTime;
exports.measureTimeAsync = measureTimeAsync;
exports.printCanvas = printCanvas;
exports.printDom = printDom;
exports.promiseRejected = promiseRejected;
exports.repetitionTime = repetitionTime;
exports.run = run;
exports.runTests = runTests;
exports.skip = skip;
//# sourceMappingURL=testing.cjs.map
