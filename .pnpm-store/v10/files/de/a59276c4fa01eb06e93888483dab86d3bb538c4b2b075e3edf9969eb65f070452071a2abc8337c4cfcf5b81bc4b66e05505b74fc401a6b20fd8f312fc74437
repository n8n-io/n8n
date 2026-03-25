'use strict';

var map = require('./map-24d263c0.cjs');
var string = require('./string-fddc5f8b.cjs');
var conditions = require('./conditions-f5c0c102.cjs');
var storage = require('./storage.cjs');
var _function = require('./function-314580f7.cjs');

/**
 * Isomorphic module to work access the environment (query params, env variables).
 *
 * @module environment
 */

/* c8 ignore next 2 */
// @ts-ignore
const isNode = typeof process !== 'undefined' && process.release && /node|io\.js/.test(process.release.name) && Object.prototype.toString.call(typeof process !== 'undefined' ? process : 0) === '[object process]';

/* c8 ignore next */
const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined' && !isNode;
/* c8 ignore next 3 */
const isMac = typeof navigator !== 'undefined'
  ? /Mac/.test(navigator.platform)
  : false;

/**
 * @type {Map<string,string>}
 */
let params;

/* c8 ignore start */
const computeParams = () => {
  if (params === undefined) {
    if (isNode) {
      params = map.create();
      const pargs = process.argv;
      let currParamName = null;
      for (let i = 0; i < pargs.length; i++) {
        const parg = pargs[i];
        if (parg[0] === '-') {
          if (currParamName !== null) {
            params.set(currParamName, '');
          }
          currParamName = parg;
        } else {
          if (currParamName !== null) {
            params.set(currParamName, parg);
            currParamName = null;
          }
        }
      }
      if (currParamName !== null) {
        params.set(currParamName, '');
      }
      // in ReactNative for example this would not be true (unless connected to the Remote Debugger)
    } else if (typeof location === 'object') {
      params = map.create(); // eslint-disable-next-line no-undef
      (location.search || '?').slice(1).split('&').forEach((kv) => {
        if (kv.length !== 0) {
          const [key, value] = kv.split('=');
          params.set(`--${string.fromCamelCase(key, '-')}`, value);
          params.set(`-${string.fromCamelCase(key, '-')}`, value);
        }
      });
    } else {
      params = map.create();
    }
  }
  return params
};
/* c8 ignore stop */

/**
 * @param {string} name
 * @return {boolean}
 */
/* c8 ignore next */
const hasParam = (name) => computeParams().has(name);

/**
 * @param {string} name
 * @param {string} defaultVal
 * @return {string}
 */
/* c8 ignore next 2 */
const getParam = (name, defaultVal) =>
  computeParams().get(name) || defaultVal;

/**
 * @param {string} name
 * @return {string|null}
 */
/* c8 ignore next 4 */
const getVariable = (name) =>
  isNode
    ? conditions.undefinedToNull(process.env[name.toUpperCase().replaceAll('-', '_')])
    : conditions.undefinedToNull(storage.varStorage.getItem(name));

/**
 * @param {string} name
 * @return {string|null}
 */
/* c8 ignore next 2 */
const getConf = (name) =>
  computeParams().get('--' + name) || getVariable(name);

/**
 * @param {string} name
 * @return {string}
 */
/* c8 ignore next 5 */
const ensureConf = (name) => {
  const c = getConf(name);
  if (c == null) throw new Error(`Expected configuration "${name.toUpperCase().replaceAll('-', '_')}"`)
  return c
};

/**
 * @param {string} name
 * @return {boolean}
 */
/* c8 ignore next 2 */
const hasConf = (name) =>
  hasParam('--' + name) || getVariable(name) !== null;

/* c8 ignore next */
const production = hasConf('production');

/* c8 ignore next 2 */
const forceColor = isNode &&
  _function.isOneOf(process.env.FORCE_COLOR, ['true', '1', '2']);

/* c8 ignore start */
/**
 * Color is enabled by default if the terminal supports it.
 *
 * Explicitly enable color using `--color` parameter
 * Disable color using `--no-color` parameter or using `NO_COLOR=1` environment variable.
 * `FORCE_COLOR=1` enables color and takes precedence over all.
 */
const supportsColor = forceColor || (
  !hasParam('--no-colors') && // @todo deprecate --no-colors
  !hasConf('no-color') &&
  (!isNode || process.stdout.isTTY) && (
    !isNode ||
    hasParam('--color') ||
    getVariable('COLORTERM') !== null ||
    (getVariable('TERM') || '').includes('color')
  )
);
/* c8 ignore stop */

var environment = /*#__PURE__*/Object.freeze({
  __proto__: null,
  isNode: isNode,
  isBrowser: isBrowser,
  isMac: isMac,
  hasParam: hasParam,
  getParam: getParam,
  getVariable: getVariable,
  getConf: getConf,
  ensureConf: ensureConf,
  hasConf: hasConf,
  production: production,
  supportsColor: supportsColor
});

exports.ensureConf = ensureConf;
exports.environment = environment;
exports.getConf = getConf;
exports.getParam = getParam;
exports.getVariable = getVariable;
exports.hasConf = hasConf;
exports.hasParam = hasParam;
exports.isBrowser = isBrowser;
exports.isMac = isMac;
exports.isNode = isNode;
exports.production = production;
exports.supportsColor = supportsColor;
//# sourceMappingURL=environment-1c97264d.cjs.map
