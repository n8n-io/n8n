// Copied from https://raw.githubusercontent.com/nodejs/node/v15.3.0/lib/internal/modules/esm/get_format.js

'use strict';
const {
  RegExpPrototypeExec,
  StringPrototypeStartsWith,
} = require('./node-primordials');
const { extname } = require('path');
const { getOptionValue } = require('./node-options');

const [nodeMajor, nodeMinor] = process.versions.node.split('.').map(s => parseInt(s, 10));
const experimentalJsonModules =
  nodeMajor > 17
  || (nodeMajor === 17 && nodeMinor >= 5)
  || (nodeMajor === 16 && nodeMinor >= 15)
  || getOptionValue('--experimental-json-modules');
const experimentalWasmModules = getOptionValue('--experimental-wasm-modules');
const { URL, fileURLToPath } = require('url');
const { ERR_UNKNOWN_FILE_EXTENSION } = require('./node-internal-errors').codes;

const extensionFormatMap = {
  '__proto__': null,
  '.cjs': 'commonjs',
  '.js': 'module',
  '.mjs': 'module'
};

const legacyExtensionFormatMap = {
  '__proto__': null,
  '.cjs': 'commonjs',
  '.js': 'commonjs',
  '.json': 'commonjs',
  '.mjs': 'module',
  '.node': 'commonjs'
};

if (experimentalWasmModules)
  extensionFormatMap['.wasm'] = legacyExtensionFormatMap['.wasm'] = 'wasm';

if (experimentalJsonModules)
  extensionFormatMap['.json'] = legacyExtensionFormatMap['.json'] = 'json';

/**
 *
 * @param {'node' | 'explicit'} [tsNodeExperimentalSpecifierResolution]
 * @param {ReturnType<
 *  typeof import('../dist-raw/node-internal-modules-esm-resolve').createResolve
 * >} nodeEsmResolver
 */
function createGetFormat(tsNodeExperimentalSpecifierResolution, nodeEsmResolver) {
// const experimentalSpeciferResolution = tsNodeExperimentalSpecifierResolution ?? getOptionValue('--experimental-specifier-resolution');
let experimentalSpeciferResolution = tsNodeExperimentalSpecifierResolution != null ? tsNodeExperimentalSpecifierResolution : getOptionValue('--experimental-specifier-resolution');
const { getPackageType } = nodeEsmResolver;

/**
 * @param {string} url
 * @param {{}} context
 * @param {any} defaultGetFormatUnused
 * @returns {ReturnType<import('../src/esm').NodeLoaderHooksAPI1.GetFormatHook>}
 */
function defaultGetFormat(url, context, defaultGetFormatUnused) {
  if (StringPrototypeStartsWith(url, 'node:')) {
    return { format: 'builtin' };
  }
  const parsed = new URL(url);
  if (parsed.protocol === 'data:') {
    const [ , mime ] = RegExpPrototypeExec(
      /^([^/]+\/[^;,]+)(?:[^,]*?)(;base64)?,/,
      parsed.pathname,
    ) || [ null, null, null ];
    const format = ({
      '__proto__': null,
      'text/javascript': 'module',
      'application/json': experimentalJsonModules ? 'json' : null,
      'application/wasm': experimentalWasmModules ? 'wasm' : null
    })[mime] || null;
    return { format };
  } else if (parsed.protocol === 'file:') {
    const ext = extname(parsed.pathname);
    let format;
    if (ext === '.js') {
      format = getPackageType(parsed.href) === 'module' ? 'module' : 'commonjs';
    } else {
      format = extensionFormatMap[ext];
    }
    if (!format) {
      if (experimentalSpeciferResolution === 'node') {
        process.emitWarning(
          'The Node.js specifier resolution in ESM is experimental.',
          'ExperimentalWarning');
        format = legacyExtensionFormatMap[ext];
      } else {
        throw new ERR_UNKNOWN_FILE_EXTENSION(ext, fileURLToPath(url));
      }
    }
    return { format: format || null };
  }
  return { format: null };
}

return {defaultGetFormat};
}

module.exports = {
  createGetFormat
};
