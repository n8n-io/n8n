import fs, { statSync, realpathSync, existsSync, promises, readdirSync, writeFileSync } from 'node:fs';
import path, { win32, dirname, join } from 'node:path';
import { slash, shuffle, toArray } from '@vitest/utils/helpers';
import { isAbsolute, resolve, relative, normalize } from 'pathe';
import pm from 'picomatch';
import { glob } from 'tinyglobby';
import c from 'tinyrainbow';
import { c as configDefaults, e as benchmarkConfigDefaults, a as coverageConfigDefaults } from './defaults.BOqNVLsY.js';
import crypto from 'node:crypto';
import { fileURLToPath as fileURLToPath$1, pathToFileURL as pathToFileURL$1, URL as URL$1 } from 'node:url';
import { builtinModules, createRequire } from 'node:module';
import process$1 from 'node:process';
import fs$1 from 'node:fs/promises';
import assert from 'node:assert';
import v8 from 'node:v8';
import { format, inspect } from 'node:util';
import { mergeConfig } from 'vite';
import { c as configFiles, d as defaultBrowserPort, b as defaultInspectPort, a as defaultPort } from './constants.D_Q9UYh-.js';
import './env.D4Lgay0q.js';
import nodeos__default from 'node:os';
import { isCI, provider } from 'std-env';
import { r as resolveCoverageProviderModule } from './coverage.D_JHT54q.js';

const hash = crypto.hash ?? ((algorithm, data, outputEncoding) => crypto.createHash(algorithm).update(data).digest(outputEncoding));

const JOIN_LEADING_SLASH_RE = /^\.?\//;
function withTrailingSlash(input = "", respectQueryAndFragment) {
  {
    return input.endsWith("/") ? input : input + "/";
  }
}
function isNonEmptyURL(url) {
  return url && url !== "/";
}
function joinURL(base, ...input) {
  let url = base || "";
  for (const segment of input.filter((url2) => isNonEmptyURL(url2))) {
    if (url) {
      const _segment = segment.replace(JOIN_LEADING_SLASH_RE, "");
      url = withTrailingSlash(url) + _segment;
    } else {
      url = segment;
    }
  }
  return url;
}

const BUILTIN_MODULES = new Set(builtinModules);
function normalizeSlash(path) {
  return path.replace(/\\/g, "/");
}

/**
 * @typedef ErrnoExceptionFields
 * @property {number | undefined} [errnode]
 * @property {string | undefined} [code]
 * @property {string | undefined} [path]
 * @property {string | undefined} [syscall]
 * @property {string | undefined} [url]
 *
 * @typedef {Error & ErrnoExceptionFields} ErrnoException
 */


const own$1 = {}.hasOwnProperty;

const classRegExp = /^([A-Z][a-z\d]*)+$/;
// Sorted by a rough estimate on most frequently used entries.
const kTypes = new Set([
  'string',
  'function',
  'number',
  'object',
  // Accept 'Function' and 'Object' as alternative to the lower cased version.
  'Function',
  'Object',
  'boolean',
  'bigint',
  'symbol'
]);

const codes = {};

/**
 * Create a list string in the form like 'A and B' or 'A, B, ..., and Z'.
 * We cannot use Intl.ListFormat because it's not available in
 * --without-intl builds.
 *
 * @param {Array<string>} array
 *   An array of strings.
 * @param {string} [type]
 *   The list type to be inserted before the last element.
 * @returns {string}
 */
function formatList(array, type = 'and') {
  return array.length < 3
    ? array.join(` ${type} `)
    : `${array.slice(0, -1).join(', ')}, ${type} ${array[array.length - 1]}`
}

/** @type {Map<string, MessageFunction | string>} */
const messages = new Map();
const nodeInternalPrefix = '__node_internal_';
/** @type {number} */
let userStackTraceLimit;

codes.ERR_INVALID_ARG_TYPE = createError(
  'ERR_INVALID_ARG_TYPE',
  /**
   * @param {string} name
   * @param {Array<string> | string} expected
   * @param {unknown} actual
   */
  (name, expected, actual) => {
    assert(typeof name === 'string', "'name' must be a string");
    if (!Array.isArray(expected)) {
      expected = [expected];
    }

    let message = 'The ';
    if (name.endsWith(' argument')) {
      // For cases like 'first argument'
      message += `${name} `;
    } else {
      const type = name.includes('.') ? 'property' : 'argument';
      message += `"${name}" ${type} `;
    }

    message += 'must be ';

    /** @type {Array<string>} */
    const types = [];
    /** @type {Array<string>} */
    const instances = [];
    /** @type {Array<string>} */
    const other = [];

    for (const value of expected) {
      assert(
        typeof value === 'string',
        'All expected entries have to be of type string'
      );

      if (kTypes.has(value)) {
        types.push(value.toLowerCase());
      } else if (classRegExp.exec(value) === null) {
        assert(
          value !== 'object',
          'The value "object" should be written as "Object"'
        );
        other.push(value);
      } else {
        instances.push(value);
      }
    }

    // Special handle `object` in case other instances are allowed to outline
    // the differences between each other.
    if (instances.length > 0) {
      const pos = types.indexOf('object');
      if (pos !== -1) {
        types.slice(pos, 1);
        instances.push('Object');
      }
    }

    if (types.length > 0) {
      message += `${types.length > 1 ? 'one of type' : 'of type'} ${formatList(
        types,
        'or'
      )}`;
      if (instances.length > 0 || other.length > 0) message += ' or ';
    }

    if (instances.length > 0) {
      message += `an instance of ${formatList(instances, 'or')}`;
      if (other.length > 0) message += ' or ';
    }

    if (other.length > 0) {
      if (other.length > 1) {
        message += `one of ${formatList(other, 'or')}`;
      } else {
        if (other[0].toLowerCase() !== other[0]) message += 'an ';
        message += `${other[0]}`;
      }
    }

    message += `. Received ${determineSpecificType(actual)}`;

    return message
  },
  TypeError
);

codes.ERR_INVALID_MODULE_SPECIFIER = createError(
  'ERR_INVALID_MODULE_SPECIFIER',
  /**
   * @param {string} request
   * @param {string} reason
   * @param {string} [base]
   */
  (request, reason, base = undefined) => {
    return `Invalid module "${request}" ${reason}${
      base ? ` imported from ${base}` : ''
    }`
  },
  TypeError
);

codes.ERR_INVALID_PACKAGE_CONFIG = createError(
  'ERR_INVALID_PACKAGE_CONFIG',
  /**
   * @param {string} path
   * @param {string} [base]
   * @param {string} [message]
   */
  (path, base, message) => {
    return `Invalid package config ${path}${
      base ? ` while importing ${base}` : ''
    }${message ? `. ${message}` : ''}`
  },
  Error
);

codes.ERR_INVALID_PACKAGE_TARGET = createError(
  'ERR_INVALID_PACKAGE_TARGET',
  /**
   * @param {string} packagePath
   * @param {string} key
   * @param {unknown} target
   * @param {boolean} [isImport=false]
   * @param {string} [base]
   */
  (packagePath, key, target, isImport = false, base = undefined) => {
    const relatedError =
      typeof target === 'string' &&
      !isImport &&
      target.length > 0 &&
      !target.startsWith('./');
    if (key === '.') {
      assert(isImport === false);
      return (
        `Invalid "exports" main target ${JSON.stringify(target)} defined ` +
        `in the package config ${packagePath}package.json${
          base ? ` imported from ${base}` : ''
        }${relatedError ? '; targets must start with "./"' : ''}`
      )
    }

    return `Invalid "${
      isImport ? 'imports' : 'exports'
    }" target ${JSON.stringify(
      target
    )} defined for '${key}' in the package config ${packagePath}package.json${
      base ? ` imported from ${base}` : ''
    }${relatedError ? '; targets must start with "./"' : ''}`
  },
  Error
);

codes.ERR_MODULE_NOT_FOUND = createError(
  'ERR_MODULE_NOT_FOUND',
  /**
   * @param {string} path
   * @param {string} base
   * @param {boolean} [exactUrl]
   */
  (path, base, exactUrl = false) => {
    return `Cannot find ${
      exactUrl ? 'module' : 'package'
    } '${path}' imported from ${base}`
  },
  Error
);

codes.ERR_NETWORK_IMPORT_DISALLOWED = createError(
  'ERR_NETWORK_IMPORT_DISALLOWED',
  "import of '%s' by %s is not supported: %s",
  Error
);

codes.ERR_PACKAGE_IMPORT_NOT_DEFINED = createError(
  'ERR_PACKAGE_IMPORT_NOT_DEFINED',
  /**
   * @param {string} specifier
   * @param {string} packagePath
   * @param {string} base
   */
  (specifier, packagePath, base) => {
    return `Package import specifier "${specifier}" is not defined${
      packagePath ? ` in package ${packagePath}package.json` : ''
    } imported from ${base}`
  },
  TypeError
);

codes.ERR_PACKAGE_PATH_NOT_EXPORTED = createError(
  'ERR_PACKAGE_PATH_NOT_EXPORTED',
  /**
   * @param {string} packagePath
   * @param {string} subpath
   * @param {string} [base]
   */
  (packagePath, subpath, base = undefined) => {
    if (subpath === '.')
      return `No "exports" main defined in ${packagePath}package.json${
        base ? ` imported from ${base}` : ''
      }`
    return `Package subpath '${subpath}' is not defined by "exports" in ${packagePath}package.json${
      base ? ` imported from ${base}` : ''
    }`
  },
  Error
);

codes.ERR_UNSUPPORTED_DIR_IMPORT = createError(
  'ERR_UNSUPPORTED_DIR_IMPORT',
  "Directory import '%s' is not supported " +
    'resolving ES modules imported from %s',
  Error
);

codes.ERR_UNSUPPORTED_RESOLVE_REQUEST = createError(
  'ERR_UNSUPPORTED_RESOLVE_REQUEST',
  'Failed to resolve module specifier "%s" from "%s": Invalid relative URL or base scheme is not hierarchical.',
  TypeError
);

codes.ERR_UNKNOWN_FILE_EXTENSION = createError(
  'ERR_UNKNOWN_FILE_EXTENSION',
  /**
   * @param {string} extension
   * @param {string} path
   */
  (extension, path) => {
    return `Unknown file extension "${extension}" for ${path}`
  },
  TypeError
);

codes.ERR_INVALID_ARG_VALUE = createError(
  'ERR_INVALID_ARG_VALUE',
  /**
   * @param {string} name
   * @param {unknown} value
   * @param {string} [reason='is invalid']
   */
  (name, value, reason = 'is invalid') => {
    let inspected = inspect(value);

    if (inspected.length > 128) {
      inspected = `${inspected.slice(0, 128)}...`;
    }

    const type = name.includes('.') ? 'property' : 'argument';

    return `The ${type} '${name}' ${reason}. Received ${inspected}`
  },
  TypeError
  // Note: extra classes have been shaken out.
  // , RangeError
);

/**
 * Utility function for registering the error codes. Only used here. Exported
 * *only* to allow for testing.
 * @param {string} sym
 * @param {MessageFunction | string} value
 * @param {ErrorConstructor} constructor
 * @returns {new (...parameters: Array<any>) => Error}
 */
function createError(sym, value, constructor) {
  // Special case for SystemError that formats the error message differently
  // The SystemErrors only have SystemError as their base classes.
  messages.set(sym, value);

  return makeNodeErrorWithCode(constructor, sym)
}

/**
 * @param {ErrorConstructor} Base
 * @param {string} key
 * @returns {ErrorConstructor}
 */
function makeNodeErrorWithCode(Base, key) {
  // @ts-expect-error It’s a Node error.
  return NodeError
  /**
   * @param {Array<unknown>} parameters
   */
  function NodeError(...parameters) {
    const limit = Error.stackTraceLimit;
    if (isErrorStackTraceLimitWritable()) Error.stackTraceLimit = 0;
    const error = new Base();
    // Reset the limit and setting the name property.
    if (isErrorStackTraceLimitWritable()) Error.stackTraceLimit = limit;
    const message = getMessage(key, parameters, error);
    Object.defineProperties(error, {
      // Note: no need to implement `kIsNodeError` symbol, would be hard,
      // probably.
      message: {
        value: message,
        enumerable: false,
        writable: true,
        configurable: true
      },
      toString: {
        /** @this {Error} */
        value() {
          return `${this.name} [${key}]: ${this.message}`
        },
        enumerable: false,
        writable: true,
        configurable: true
      }
    });

    captureLargerStackTrace(error);
    // @ts-expect-error It’s a Node error.
    error.code = key;
    return error
  }
}

/**
 * @returns {boolean}
 */
function isErrorStackTraceLimitWritable() {
  // Do no touch Error.stackTraceLimit as V8 would attempt to install
  // it again during deserialization.
  try {
    if (v8.startupSnapshot.isBuildingSnapshot()) {
      return false
    }
  } catch {}

  const desc = Object.getOwnPropertyDescriptor(Error, 'stackTraceLimit');
  if (desc === undefined) {
    return Object.isExtensible(Error)
  }

  return own$1.call(desc, 'writable') && desc.writable !== undefined
    ? desc.writable
    : desc.set !== undefined
}

/**
 * This function removes unnecessary frames from Node.js core errors.
 * @template {(...parameters: unknown[]) => unknown} T
 * @param {T} wrappedFunction
 * @returns {T}
 */
function hideStackFrames(wrappedFunction) {
  // We rename the functions that will be hidden to cut off the stacktrace
  // at the outermost one
  const hidden = nodeInternalPrefix + wrappedFunction.name;
  Object.defineProperty(wrappedFunction, 'name', {value: hidden});
  return wrappedFunction
}

const captureLargerStackTrace = hideStackFrames(
  /**
   * @param {Error} error
   * @returns {Error}
   */
  // @ts-expect-error: fine
  function (error) {
    const stackTraceLimitIsWritable = isErrorStackTraceLimitWritable();
    if (stackTraceLimitIsWritable) {
      userStackTraceLimit = Error.stackTraceLimit;
      Error.stackTraceLimit = Number.POSITIVE_INFINITY;
    }

    Error.captureStackTrace(error);

    // Reset the limit
    if (stackTraceLimitIsWritable) Error.stackTraceLimit = userStackTraceLimit;

    return error
  }
);

/**
 * @param {string} key
 * @param {Array<unknown>} parameters
 * @param {Error} self
 * @returns {string}
 */
function getMessage(key, parameters, self) {
  const message = messages.get(key);
  assert(message !== undefined, 'expected `message` to be found');

  if (typeof message === 'function') {
    assert(
      message.length <= parameters.length, // Default options do not count.
      `Code: ${key}; The provided arguments length (${parameters.length}) does not ` +
        `match the required ones (${message.length}).`
    );
    return Reflect.apply(message, self, parameters)
  }

  const regex = /%[dfijoOs]/g;
  let expectedLength = 0;
  while (regex.exec(message) !== null) expectedLength++;
  assert(
    expectedLength === parameters.length,
    `Code: ${key}; The provided arguments length (${parameters.length}) does not ` +
      `match the required ones (${expectedLength}).`
  );
  if (parameters.length === 0) return message

  parameters.unshift(message);
  return Reflect.apply(format, null, parameters)
}

/**
 * Determine the specific type of a value for type-mismatch errors.
 * @param {unknown} value
 * @returns {string}
 */
function determineSpecificType(value) {
  if (value === null || value === undefined) {
    return String(value)
  }

  if (typeof value === 'function' && value.name) {
    return `function ${value.name}`
  }

  if (typeof value === 'object') {
    if (value.constructor && value.constructor.name) {
      return `an instance of ${value.constructor.name}`
    }

    return `${inspect(value, {depth: -1})}`
  }

  let inspected = inspect(value, {colors: false});

  if (inspected.length > 28) {
    inspected = `${inspected.slice(0, 25)}...`;
  }

  return `type ${typeof value} (${inspected})`
}

// Manually “tree shaken” from:
// <https://github.com/nodejs/node/blob/7c3dce0/lib/internal/modules/package_json_reader.js>
// Last checked on: Apr 29, 2023.
// Removed the native dependency.
// Also: no need to cache, we do that in resolve already.


const hasOwnProperty$1 = {}.hasOwnProperty;

const {ERR_INVALID_PACKAGE_CONFIG: ERR_INVALID_PACKAGE_CONFIG$1} = codes;

/** @type {Map<string, PackageConfig>} */
const cache = new Map();

/**
 * @param {string} jsonPath
 * @param {{specifier: URL | string, base?: URL}} options
 * @returns {PackageConfig}
 */
function read(jsonPath, {base, specifier}) {
  const existing = cache.get(jsonPath);

  if (existing) {
    return existing
  }

  /** @type {string | undefined} */
  let string;

  try {
    string = fs.readFileSync(path.toNamespacedPath(jsonPath), 'utf8');
  } catch (error) {
    const exception = /** @type {ErrnoException} */ (error);

    if (exception.code !== 'ENOENT') {
      throw exception
    }
  }

  /** @type {PackageConfig} */
  const result = {
    exists: false,
    pjsonPath: jsonPath,
    main: undefined,
    name: undefined,
    type: 'none', // Ignore unknown types for forwards compatibility
    exports: undefined,
    imports: undefined
  };

  if (string !== undefined) {
    /** @type {Record<string, unknown>} */
    let parsed;

    try {
      parsed = JSON.parse(string);
    } catch (error_) {
      const cause = /** @type {ErrnoException} */ (error_);
      const error = new ERR_INVALID_PACKAGE_CONFIG$1(
        jsonPath,
        (base ? `"${specifier}" from ` : '') + fileURLToPath$1(base || specifier),
        cause.message
      );
      error.cause = cause;
      throw error
    }

    result.exists = true;

    if (
      hasOwnProperty$1.call(parsed, 'name') &&
      typeof parsed.name === 'string'
    ) {
      result.name = parsed.name;
    }

    if (
      hasOwnProperty$1.call(parsed, 'main') &&
      typeof parsed.main === 'string'
    ) {
      result.main = parsed.main;
    }

    if (hasOwnProperty$1.call(parsed, 'exports')) {
      // @ts-expect-error: assume valid.
      result.exports = parsed.exports;
    }

    if (hasOwnProperty$1.call(parsed, 'imports')) {
      // @ts-expect-error: assume valid.
      result.imports = parsed.imports;
    }

    // Ignore unknown types for forwards compatibility
    if (
      hasOwnProperty$1.call(parsed, 'type') &&
      (parsed.type === 'commonjs' || parsed.type === 'module')
    ) {
      result.type = parsed.type;
    }
  }

  cache.set(jsonPath, result);

  return result
}

/**
 * @param {URL | string} resolved
 * @returns {PackageConfig}
 */
function getPackageScopeConfig(resolved) {
  // Note: in Node, this is now a native module.
  let packageJSONUrl = new URL('package.json', resolved);

  while (true) {
    const packageJSONPath = packageJSONUrl.pathname;
    if (packageJSONPath.endsWith('node_modules/package.json')) {
      break
    }

    const packageConfig = read(fileURLToPath$1(packageJSONUrl), {
      specifier: resolved
    });

    if (packageConfig.exists) {
      return packageConfig
    }

    const lastPackageJSONUrl = packageJSONUrl;
    packageJSONUrl = new URL('../package.json', packageJSONUrl);

    // Terminates at root where ../package.json equals ../../package.json
    // (can't just check "/package.json" for Windows support).
    if (packageJSONUrl.pathname === lastPackageJSONUrl.pathname) {
      break
    }
  }

  const packageJSONPath = fileURLToPath$1(packageJSONUrl);
  // ^^ Note: in Node, this is now a native module.

  return {
    pjsonPath: packageJSONPath,
    exists: false,
    type: 'none'
  }
}

/**
 * Returns the package type for a given URL.
 * @param {URL} url - The URL to get the package type for.
 * @returns {PackageType}
 */
function getPackageType(url) {
  // To do @anonrig: Write a C++ function that returns only "type".
  return getPackageScopeConfig(url).type
}

// Manually “tree shaken” from:
// <https://github.com/nodejs/node/blob/7c3dce0/lib/internal/modules/esm/get_format.js>
// Last checked on: Apr 29, 2023.


const {ERR_UNKNOWN_FILE_EXTENSION} = codes;

const hasOwnProperty = {}.hasOwnProperty;

/** @type {Record<string, string>} */
const extensionFormatMap = {
  // @ts-expect-error: hush.
  __proto__: null,
  '.cjs': 'commonjs',
  '.js': 'module',
  '.json': 'json',
  '.mjs': 'module'
};

/**
 * @param {string | null} mime
 * @returns {string | null}
 */
function mimeToFormat(mime) {
  if (
    mime &&
    /\s*(text|application)\/javascript\s*(;\s*charset=utf-?8\s*)?/i.test(mime)
  )
    return 'module'
  if (mime === 'application/json') return 'json'
  return null
}

/**
 * @callback ProtocolHandler
 * @param {URL} parsed
 * @param {{parentURL: string, source?: Buffer}} context
 * @param {boolean} ignoreErrors
 * @returns {string | null | void}
 */

/**
 * @type {Record<string, ProtocolHandler>}
 */
const protocolHandlers = {
  // @ts-expect-error: hush.
  __proto__: null,
  'data:': getDataProtocolModuleFormat,
  'file:': getFileProtocolModuleFormat,
  'http:': getHttpProtocolModuleFormat,
  'https:': getHttpProtocolModuleFormat,
  'node:'() {
    return 'builtin'
  }
};

/**
 * @param {URL} parsed
 */
function getDataProtocolModuleFormat(parsed) {
  const {1: mime} = /^([^/]+\/[^;,]+)[^,]*?(;base64)?,/.exec(
    parsed.pathname
  ) || [null, null, null];
  return mimeToFormat(mime)
}

/**
 * Returns the file extension from a URL.
 *
 * Should give similar result to
 * `require('node:path').extname(require('node:url').fileURLToPath(url))`
 * when used with a `file:` URL.
 *
 * @param {URL} url
 * @returns {string}
 */
function extname(url) {
  const pathname = url.pathname;
  let index = pathname.length;

  while (index--) {
    const code = pathname.codePointAt(index);

    if (code === 47 /* `/` */) {
      return ''
    }

    if (code === 46 /* `.` */) {
      return pathname.codePointAt(index - 1) === 47 /* `/` */
        ? ''
        : pathname.slice(index)
    }
  }

  return ''
}

/**
 * @type {ProtocolHandler}
 */
function getFileProtocolModuleFormat(url, _context, ignoreErrors) {
  const value = extname(url);

  if (value === '.js') {
    const packageType = getPackageType(url);

    if (packageType !== 'none') {
      return packageType
    }

    return 'commonjs'
  }

  if (value === '') {
    const packageType = getPackageType(url);

    // Legacy behavior
    if (packageType === 'none' || packageType === 'commonjs') {
      return 'commonjs'
    }

    // Note: we don’t implement WASM, so we don’t need
    // `getFormatOfExtensionlessFile` from `formats`.
    return 'module'
  }

  const format = extensionFormatMap[value];
  if (format) return format

  // Explicit undefined return indicates load hook should rerun format check
  if (ignoreErrors) {
    return undefined
  }

  const filepath = fileURLToPath$1(url);
  throw new ERR_UNKNOWN_FILE_EXTENSION(value, filepath)
}

function getHttpProtocolModuleFormat() {
  // To do: HTTPS imports.
}

/**
 * @param {URL} url
 * @param {{parentURL: string}} context
 * @returns {string | null}
 */
function defaultGetFormatWithoutErrors(url, context) {
  const protocol = url.protocol;

  if (!hasOwnProperty.call(protocolHandlers, protocol)) {
    return null
  }

  return protocolHandlers[protocol](url, context, true) || null
}

// Manually “tree shaken” from:
// <https://github.com/nodejs/node/blob/81a9a97/lib/internal/modules/esm/resolve.js>
// Last checked on: Apr 29, 2023.


const RegExpPrototypeSymbolReplace = RegExp.prototype[Symbol.replace];

const {
  ERR_INVALID_MODULE_SPECIFIER,
  ERR_INVALID_PACKAGE_CONFIG,
  ERR_INVALID_PACKAGE_TARGET,
  ERR_MODULE_NOT_FOUND,
  ERR_PACKAGE_IMPORT_NOT_DEFINED,
  ERR_PACKAGE_PATH_NOT_EXPORTED,
  ERR_UNSUPPORTED_DIR_IMPORT,
  ERR_UNSUPPORTED_RESOLVE_REQUEST
} = codes;

const own = {}.hasOwnProperty;

const invalidSegmentRegEx =
  /(^|\\|\/)((\.|%2e)(\.|%2e)?|(n|%6e|%4e)(o|%6f|%4f)(d|%64|%44)(e|%65|%45)(_|%5f)(m|%6d|%4d)(o|%6f|%4f)(d|%64|%44)(u|%75|%55)(l|%6c|%4c)(e|%65|%45)(s|%73|%53))?(\\|\/|$)/i;
const deprecatedInvalidSegmentRegEx =
  /(^|\\|\/)((\.|%2e)(\.|%2e)?|(n|%6e|%4e)(o|%6f|%4f)(d|%64|%44)(e|%65|%45)(_|%5f)(m|%6d|%4d)(o|%6f|%4f)(d|%64|%44)(u|%75|%55)(l|%6c|%4c)(e|%65|%45)(s|%73|%53))(\\|\/|$)/i;
const invalidPackageNameRegEx = /^\.|%|\\/;
const patternRegEx = /\*/g;
const encodedSeparatorRegEx = /%2f|%5c/i;
/** @type {Set<string>} */
const emittedPackageWarnings = new Set();

const doubleSlashRegEx = /[/\\]{2}/;

/**
 *
 * @param {string} target
 * @param {string} request
 * @param {string} match
 * @param {URL} packageJsonUrl
 * @param {boolean} internal
 * @param {URL} base
 * @param {boolean} isTarget
 */
function emitInvalidSegmentDeprecation(
  target,
  request,
  match,
  packageJsonUrl,
  internal,
  base,
  isTarget
) {
  // @ts-expect-error: apparently it does exist, TS.
  if (process$1.noDeprecation) {
    return
  }

  const pjsonPath = fileURLToPath$1(packageJsonUrl);
  const double = doubleSlashRegEx.exec(isTarget ? target : request) !== null;
  process$1.emitWarning(
    `Use of deprecated ${
      double ? 'double slash' : 'leading or trailing slash matching'
    } resolving "${target}" for module ` +
      `request "${request}" ${
        request === match ? '' : `matched to "${match}" `
      }in the "${
        internal ? 'imports' : 'exports'
      }" field module resolution of the package at ${pjsonPath}${
        base ? ` imported from ${fileURLToPath$1(base)}` : ''
      }.`,
    'DeprecationWarning',
    'DEP0166'
  );
}

/**
 * @param {URL} url
 * @param {URL} packageJsonUrl
 * @param {URL} base
 * @param {string} [main]
 * @returns {void}
 */
function emitLegacyIndexDeprecation(url, packageJsonUrl, base, main) {
  // @ts-expect-error: apparently it does exist, TS.
  if (process$1.noDeprecation) {
    return
  }

  const format = defaultGetFormatWithoutErrors(url, {parentURL: base.href});
  if (format !== 'module') return
  const urlPath = fileURLToPath$1(url.href);
  const packagePath = fileURLToPath$1(new URL$1('.', packageJsonUrl));
  const basePath = fileURLToPath$1(base);
  if (!main) {
    process$1.emitWarning(
      `No "main" or "exports" field defined in the package.json for ${packagePath} resolving the main entry point "${urlPath.slice(
        packagePath.length
      )}", imported from ${basePath}.\nDefault "index" lookups for the main are deprecated for ES modules.`,
      'DeprecationWarning',
      'DEP0151'
    );
  } else if (path.resolve(packagePath, main) !== urlPath) {
    process$1.emitWarning(
      `Package ${packagePath} has a "main" field set to "${main}", ` +
        `excluding the full filename and extension to the resolved file at "${urlPath.slice(
          packagePath.length
        )}", imported from ${basePath}.\n Automatic extension resolution of the "main" field is ` +
        'deprecated for ES modules.',
      'DeprecationWarning',
      'DEP0151'
    );
  }
}

/**
 * @param {string} path
 * @returns {Stats | undefined}
 */
function tryStatSync(path) {
  // Note: from Node 15 onwards we can use `throwIfNoEntry: false` instead.
  try {
    return statSync(path)
  } catch {
    // Note: in Node code this returns `new Stats`,
    // but in Node 22 that’s marked as a deprecated internal API.
    // Which, well, we kinda are, but still to prevent that warning,
    // just yield `undefined`.
  }
}

/**
 * Legacy CommonJS main resolution:
 * 1. let M = pkg_url + (json main field)
 * 2. TRY(M, M.js, M.json, M.node)
 * 3. TRY(M/index.js, M/index.json, M/index.node)
 * 4. TRY(pkg_url/index.js, pkg_url/index.json, pkg_url/index.node)
 * 5. NOT_FOUND
 *
 * @param {URL} url
 * @returns {boolean}
 */
function fileExists(url) {
  const stats = statSync(url, {throwIfNoEntry: false});
  const isFile = stats ? stats.isFile() : undefined;
  return isFile === null || isFile === undefined ? false : isFile
}

/**
 * @param {URL} packageJsonUrl
 * @param {PackageConfig} packageConfig
 * @param {URL} base
 * @returns {URL}
 */
function legacyMainResolve(packageJsonUrl, packageConfig, base) {
  /** @type {URL | undefined} */
  let guess;
  if (packageConfig.main !== undefined) {
    guess = new URL$1(packageConfig.main, packageJsonUrl);
    // Note: fs check redundances will be handled by Descriptor cache here.
    if (fileExists(guess)) return guess

    const tries = [
      `./${packageConfig.main}.js`,
      `./${packageConfig.main}.json`,
      `./${packageConfig.main}.node`,
      `./${packageConfig.main}/index.js`,
      `./${packageConfig.main}/index.json`,
      `./${packageConfig.main}/index.node`
    ];
    let i = -1;

    while (++i < tries.length) {
      guess = new URL$1(tries[i], packageJsonUrl);
      if (fileExists(guess)) break
      guess = undefined;
    }

    if (guess) {
      emitLegacyIndexDeprecation(
        guess,
        packageJsonUrl,
        base,
        packageConfig.main
      );
      return guess
    }
    // Fallthrough.
  }

  const tries = ['./index.js', './index.json', './index.node'];
  let i = -1;

  while (++i < tries.length) {
    guess = new URL$1(tries[i], packageJsonUrl);
    if (fileExists(guess)) break
    guess = undefined;
  }

  if (guess) {
    emitLegacyIndexDeprecation(guess, packageJsonUrl, base, packageConfig.main);
    return guess
  }

  // Not found.
  throw new ERR_MODULE_NOT_FOUND(
    fileURLToPath$1(new URL$1('.', packageJsonUrl)),
    fileURLToPath$1(base)
  )
}

/**
 * @param {URL} resolved
 * @param {URL} base
 * @param {boolean} [preserveSymlinks]
 * @returns {URL}
 */
function finalizeResolution(resolved, base, preserveSymlinks) {
  if (encodedSeparatorRegEx.exec(resolved.pathname) !== null) {
    throw new ERR_INVALID_MODULE_SPECIFIER(
      resolved.pathname,
      'must not include encoded "/" or "\\" characters',
      fileURLToPath$1(base)
    )
  }

  /** @type {string} */
  let filePath;

  try {
    filePath = fileURLToPath$1(resolved);
  } catch (error) {
    const cause = /** @type {ErrnoException} */ (error);
    Object.defineProperty(cause, 'input', {value: String(resolved)});
    Object.defineProperty(cause, 'module', {value: String(base)});
    throw cause
  }

  const stats = tryStatSync(
    filePath.endsWith('/') ? filePath.slice(-1) : filePath
  );

  if (stats && stats.isDirectory()) {
    const error = new ERR_UNSUPPORTED_DIR_IMPORT(filePath, fileURLToPath$1(base));
    // @ts-expect-error Add this for `import.meta.resolve`.
    error.url = String(resolved);
    throw error
  }

  if (!stats || !stats.isFile()) {
    const error = new ERR_MODULE_NOT_FOUND(
      filePath || resolved.pathname,
      base && fileURLToPath$1(base),
      true
    );
    // @ts-expect-error Add this for `import.meta.resolve`.
    error.url = String(resolved);
    throw error
  }

  {
    const real = realpathSync(filePath);
    const {search, hash} = resolved;
    resolved = pathToFileURL$1(real + (filePath.endsWith(path.sep) ? '/' : ''));
    resolved.search = search;
    resolved.hash = hash;
  }

  return resolved
}

/**
 * @param {string} specifier
 * @param {URL | undefined} packageJsonUrl
 * @param {URL} base
 * @returns {Error}
 */
function importNotDefined(specifier, packageJsonUrl, base) {
  return new ERR_PACKAGE_IMPORT_NOT_DEFINED(
    specifier,
    packageJsonUrl && fileURLToPath$1(new URL$1('.', packageJsonUrl)),
    fileURLToPath$1(base)
  )
}

/**
 * @param {string} subpath
 * @param {URL} packageJsonUrl
 * @param {URL} base
 * @returns {Error}
 */
function exportsNotFound(subpath, packageJsonUrl, base) {
  return new ERR_PACKAGE_PATH_NOT_EXPORTED(
    fileURLToPath$1(new URL$1('.', packageJsonUrl)),
    subpath,
    base && fileURLToPath$1(base)
  )
}

/**
 * @param {string} request
 * @param {string} match
 * @param {URL} packageJsonUrl
 * @param {boolean} internal
 * @param {URL} [base]
 * @returns {never}
 */
function throwInvalidSubpath(request, match, packageJsonUrl, internal, base) {
  const reason = `request is not a valid match in pattern "${match}" for the "${
    internal ? 'imports' : 'exports'
  }" resolution of ${fileURLToPath$1(packageJsonUrl)}`;
  throw new ERR_INVALID_MODULE_SPECIFIER(
    request,
    reason,
    base && fileURLToPath$1(base)
  )
}

/**
 * @param {string} subpath
 * @param {unknown} target
 * @param {URL} packageJsonUrl
 * @param {boolean} internal
 * @param {URL} [base]
 * @returns {Error}
 */
function invalidPackageTarget(subpath, target, packageJsonUrl, internal, base) {
  target =
    typeof target === 'object' && target !== null
      ? JSON.stringify(target, null, '')
      : `${target}`;

  return new ERR_INVALID_PACKAGE_TARGET(
    fileURLToPath$1(new URL$1('.', packageJsonUrl)),
    subpath,
    target,
    internal,
    base && fileURLToPath$1(base)
  )
}

/**
 * @param {string} target
 * @param {string} subpath
 * @param {string} match
 * @param {URL} packageJsonUrl
 * @param {URL} base
 * @param {boolean} pattern
 * @param {boolean} internal
 * @param {boolean} isPathMap
 * @param {Set<string> | undefined} conditions
 * @returns {URL}
 */
function resolvePackageTargetString(
  target,
  subpath,
  match,
  packageJsonUrl,
  base,
  pattern,
  internal,
  isPathMap,
  conditions
) {
  if (subpath !== '' && !pattern && target[target.length - 1] !== '/')
    throw invalidPackageTarget(match, target, packageJsonUrl, internal, base)

  if (!target.startsWith('./')) {
    if (internal && !target.startsWith('../') && !target.startsWith('/')) {
      let isURL = false;

      try {
        new URL$1(target);
        isURL = true;
      } catch {
        // Continue regardless of error.
      }

      if (!isURL) {
        const exportTarget = pattern
          ? RegExpPrototypeSymbolReplace.call(
              patternRegEx,
              target,
              () => subpath
            )
          : target + subpath;

        return packageResolve(exportTarget, packageJsonUrl, conditions)
      }
    }

    throw invalidPackageTarget(match, target, packageJsonUrl, internal, base)
  }

  if (invalidSegmentRegEx.exec(target.slice(2)) !== null) {
    if (deprecatedInvalidSegmentRegEx.exec(target.slice(2)) === null) {
      if (!isPathMap) {
        const request = pattern
          ? match.replace('*', () => subpath)
          : match + subpath;
        const resolvedTarget = pattern
          ? RegExpPrototypeSymbolReplace.call(
              patternRegEx,
              target,
              () => subpath
            )
          : target;
        emitInvalidSegmentDeprecation(
          resolvedTarget,
          request,
          match,
          packageJsonUrl,
          internal,
          base,
          true
        );
      }
    } else {
      throw invalidPackageTarget(match, target, packageJsonUrl, internal, base)
    }
  }

  const resolved = new URL$1(target, packageJsonUrl);
  const resolvedPath = resolved.pathname;
  const packagePath = new URL$1('.', packageJsonUrl).pathname;

  if (!resolvedPath.startsWith(packagePath))
    throw invalidPackageTarget(match, target, packageJsonUrl, internal, base)

  if (subpath === '') return resolved

  if (invalidSegmentRegEx.exec(subpath) !== null) {
    const request = pattern
      ? match.replace('*', () => subpath)
      : match + subpath;
    if (deprecatedInvalidSegmentRegEx.exec(subpath) === null) {
      if (!isPathMap) {
        const resolvedTarget = pattern
          ? RegExpPrototypeSymbolReplace.call(
              patternRegEx,
              target,
              () => subpath
            )
          : target;
        emitInvalidSegmentDeprecation(
          resolvedTarget,
          request,
          match,
          packageJsonUrl,
          internal,
          base,
          false
        );
      }
    } else {
      throwInvalidSubpath(request, match, packageJsonUrl, internal, base);
    }
  }

  if (pattern) {
    return new URL$1(
      RegExpPrototypeSymbolReplace.call(
        patternRegEx,
        resolved.href,
        () => subpath
      )
    )
  }

  return new URL$1(subpath, resolved)
}

/**
 * @param {string} key
 * @returns {boolean}
 */
function isArrayIndex(key) {
  const keyNumber = Number(key);
  if (`${keyNumber}` !== key) return false
  return keyNumber >= 0 && keyNumber < 0xff_ff_ff_ff
}

/**
 * @param {URL} packageJsonUrl
 * @param {unknown} target
 * @param {string} subpath
 * @param {string} packageSubpath
 * @param {URL} base
 * @param {boolean} pattern
 * @param {boolean} internal
 * @param {boolean} isPathMap
 * @param {Set<string> | undefined} conditions
 * @returns {URL | null}
 */
function resolvePackageTarget(
  packageJsonUrl,
  target,
  subpath,
  packageSubpath,
  base,
  pattern,
  internal,
  isPathMap,
  conditions
) {
  if (typeof target === 'string') {
    return resolvePackageTargetString(
      target,
      subpath,
      packageSubpath,
      packageJsonUrl,
      base,
      pattern,
      internal,
      isPathMap,
      conditions
    )
  }

  if (Array.isArray(target)) {
    /** @type {Array<unknown>} */
    const targetList = target;
    if (targetList.length === 0) return null

    /** @type {ErrnoException | null | undefined} */
    let lastException;
    let i = -1;

    while (++i < targetList.length) {
      const targetItem = targetList[i];
      /** @type {URL | null} */
      let resolveResult;
      try {
        resolveResult = resolvePackageTarget(
          packageJsonUrl,
          targetItem,
          subpath,
          packageSubpath,
          base,
          pattern,
          internal,
          isPathMap,
          conditions
        );
      } catch (error) {
        const exception = /** @type {ErrnoException} */ (error);
        lastException = exception;
        if (exception.code === 'ERR_INVALID_PACKAGE_TARGET') continue
        throw error
      }

      if (resolveResult === undefined) continue

      if (resolveResult === null) {
        lastException = null;
        continue
      }

      return resolveResult
    }

    if (lastException === undefined || lastException === null) {
      return null
    }

    throw lastException
  }

  if (typeof target === 'object' && target !== null) {
    const keys = Object.getOwnPropertyNames(target);
    let i = -1;

    while (++i < keys.length) {
      const key = keys[i];
      if (isArrayIndex(key)) {
        throw new ERR_INVALID_PACKAGE_CONFIG(
          fileURLToPath$1(packageJsonUrl),
          base,
          '"exports" cannot contain numeric property keys.'
        )
      }
    }

    i = -1;

    while (++i < keys.length) {
      const key = keys[i];
      if (key === 'default' || (conditions && conditions.has(key))) {
        // @ts-expect-error: indexable.
        const conditionalTarget = /** @type {unknown} */ (target[key]);
        const resolveResult = resolvePackageTarget(
          packageJsonUrl,
          conditionalTarget,
          subpath,
          packageSubpath,
          base,
          pattern,
          internal,
          isPathMap,
          conditions
        );
        if (resolveResult === undefined) continue
        return resolveResult
      }
    }

    return null
  }

  if (target === null) {
    return null
  }

  throw invalidPackageTarget(
    packageSubpath,
    target,
    packageJsonUrl,
    internal,
    base
  )
}

/**
 * @param {unknown} exports
 * @param {URL} packageJsonUrl
 * @param {URL} base
 * @returns {boolean}
 */
function isConditionalExportsMainSugar(exports$1, packageJsonUrl, base) {
  if (typeof exports$1 === 'string' || Array.isArray(exports$1)) return true
  if (typeof exports$1 !== 'object' || exports$1 === null) return false

  const keys = Object.getOwnPropertyNames(exports$1);
  let isConditionalSugar = false;
  let i = 0;
  let keyIndex = -1;
  while (++keyIndex < keys.length) {
    const key = keys[keyIndex];
    const currentIsConditionalSugar = key === '' || key[0] !== '.';
    if (i++ === 0) {
      isConditionalSugar = currentIsConditionalSugar;
    } else if (isConditionalSugar !== currentIsConditionalSugar) {
      throw new ERR_INVALID_PACKAGE_CONFIG(
        fileURLToPath$1(packageJsonUrl),
        base,
        '"exports" cannot contain some keys starting with \'.\' and some not.' +
          ' The exports object must either be an object of package subpath keys' +
          ' or an object of main entry condition name keys only.'
      )
    }
  }

  return isConditionalSugar
}

/**
 * @param {string} match
 * @param {URL} pjsonUrl
 * @param {URL} base
 */
function emitTrailingSlashPatternDeprecation(match, pjsonUrl, base) {
  // @ts-expect-error: apparently it does exist, TS.
  if (process$1.noDeprecation) {
    return
  }

  const pjsonPath = fileURLToPath$1(pjsonUrl);
  if (emittedPackageWarnings.has(pjsonPath + '|' + match)) return
  emittedPackageWarnings.add(pjsonPath + '|' + match);
  process$1.emitWarning(
    `Use of deprecated trailing slash pattern mapping "${match}" in the ` +
      `"exports" field module resolution of the package at ${pjsonPath}${
        base ? ` imported from ${fileURLToPath$1(base)}` : ''
      }. Mapping specifiers ending in "/" is no longer supported.`,
    'DeprecationWarning',
    'DEP0155'
  );
}

/**
 * @param {URL} packageJsonUrl
 * @param {string} packageSubpath
 * @param {Record<string, unknown>} packageConfig
 * @param {URL} base
 * @param {Set<string> | undefined} conditions
 * @returns {URL}
 */
function packageExportsResolve(
  packageJsonUrl,
  packageSubpath,
  packageConfig,
  base,
  conditions
) {
  let exports$1 = packageConfig.exports;

  if (isConditionalExportsMainSugar(exports$1, packageJsonUrl, base)) {
    exports$1 = {'.': exports$1};
  }

  if (
    own.call(exports$1, packageSubpath) &&
    !packageSubpath.includes('*') &&
    !packageSubpath.endsWith('/')
  ) {
    // @ts-expect-error: indexable.
    const target = exports$1[packageSubpath];
    const resolveResult = resolvePackageTarget(
      packageJsonUrl,
      target,
      '',
      packageSubpath,
      base,
      false,
      false,
      false,
      conditions
    );
    if (resolveResult === null || resolveResult === undefined) {
      throw exportsNotFound(packageSubpath, packageJsonUrl, base)
    }

    return resolveResult
  }

  let bestMatch = '';
  let bestMatchSubpath = '';
  const keys = Object.getOwnPropertyNames(exports$1);
  let i = -1;

  while (++i < keys.length) {
    const key = keys[i];
    const patternIndex = key.indexOf('*');

    if (
      patternIndex !== -1 &&
      packageSubpath.startsWith(key.slice(0, patternIndex))
    ) {
      // When this reaches EOL, this can throw at the top of the whole function:
      //
      // if (StringPrototypeEndsWith(packageSubpath, '/'))
      //   throwInvalidSubpath(packageSubpath)
      //
      // To match "imports" and the spec.
      if (packageSubpath.endsWith('/')) {
        emitTrailingSlashPatternDeprecation(
          packageSubpath,
          packageJsonUrl,
          base
        );
      }

      const patternTrailer = key.slice(patternIndex + 1);

      if (
        packageSubpath.length >= key.length &&
        packageSubpath.endsWith(patternTrailer) &&
        patternKeyCompare(bestMatch, key) === 1 &&
        key.lastIndexOf('*') === patternIndex
      ) {
        bestMatch = key;
        bestMatchSubpath = packageSubpath.slice(
          patternIndex,
          packageSubpath.length - patternTrailer.length
        );
      }
    }
  }

  if (bestMatch) {
    // @ts-expect-error: indexable.
    const target = /** @type {unknown} */ (exports$1[bestMatch]);
    const resolveResult = resolvePackageTarget(
      packageJsonUrl,
      target,
      bestMatchSubpath,
      bestMatch,
      base,
      true,
      false,
      packageSubpath.endsWith('/'),
      conditions
    );

    if (resolveResult === null || resolveResult === undefined) {
      throw exportsNotFound(packageSubpath, packageJsonUrl, base)
    }

    return resolveResult
  }

  throw exportsNotFound(packageSubpath, packageJsonUrl, base)
}

/**
 * @param {string} a
 * @param {string} b
 */
function patternKeyCompare(a, b) {
  const aPatternIndex = a.indexOf('*');
  const bPatternIndex = b.indexOf('*');
  const baseLengthA = aPatternIndex === -1 ? a.length : aPatternIndex + 1;
  const baseLengthB = bPatternIndex === -1 ? b.length : bPatternIndex + 1;
  if (baseLengthA > baseLengthB) return -1
  if (baseLengthB > baseLengthA) return 1
  if (aPatternIndex === -1) return 1
  if (bPatternIndex === -1) return -1
  if (a.length > b.length) return -1
  if (b.length > a.length) return 1
  return 0
}

/**
 * @param {string} name
 * @param {URL} base
 * @param {Set<string>} [conditions]
 * @returns {URL}
 */
function packageImportsResolve(name, base, conditions) {
  if (name === '#' || name.startsWith('#/') || name.endsWith('/')) {
    const reason = 'is not a valid internal imports specifier name';
    throw new ERR_INVALID_MODULE_SPECIFIER(name, reason, fileURLToPath$1(base))
  }

  /** @type {URL | undefined} */
  let packageJsonUrl;

  const packageConfig = getPackageScopeConfig(base);

  if (packageConfig.exists) {
    packageJsonUrl = pathToFileURL$1(packageConfig.pjsonPath);
    const imports = packageConfig.imports;
    if (imports) {
      if (own.call(imports, name) && !name.includes('*')) {
        const resolveResult = resolvePackageTarget(
          packageJsonUrl,
          imports[name],
          '',
          name,
          base,
          false,
          true,
          false,
          conditions
        );
        if (resolveResult !== null && resolveResult !== undefined) {
          return resolveResult
        }
      } else {
        let bestMatch = '';
        let bestMatchSubpath = '';
        const keys = Object.getOwnPropertyNames(imports);
        let i = -1;

        while (++i < keys.length) {
          const key = keys[i];
          const patternIndex = key.indexOf('*');

          if (patternIndex !== -1 && name.startsWith(key.slice(0, -1))) {
            const patternTrailer = key.slice(patternIndex + 1);
            if (
              name.length >= key.length &&
              name.endsWith(patternTrailer) &&
              patternKeyCompare(bestMatch, key) === 1 &&
              key.lastIndexOf('*') === patternIndex
            ) {
              bestMatch = key;
              bestMatchSubpath = name.slice(
                patternIndex,
                name.length - patternTrailer.length
              );
            }
          }
        }

        if (bestMatch) {
          const target = imports[bestMatch];
          const resolveResult = resolvePackageTarget(
            packageJsonUrl,
            target,
            bestMatchSubpath,
            bestMatch,
            base,
            true,
            true,
            false,
            conditions
          );

          if (resolveResult !== null && resolveResult !== undefined) {
            return resolveResult
          }
        }
      }
    }
  }

  throw importNotDefined(name, packageJsonUrl, base)
}

/**
 * @param {string} specifier
 * @param {URL} base
 */
function parsePackageName(specifier, base) {
  let separatorIndex = specifier.indexOf('/');
  let validPackageName = true;
  let isScoped = false;
  if (specifier[0] === '@') {
    isScoped = true;
    if (separatorIndex === -1 || specifier.length === 0) {
      validPackageName = false;
    } else {
      separatorIndex = specifier.indexOf('/', separatorIndex + 1);
    }
  }

  const packageName =
    separatorIndex === -1 ? specifier : specifier.slice(0, separatorIndex);

  // Package name cannot have leading . and cannot have percent-encoding or
  // \\ separators.
  if (invalidPackageNameRegEx.exec(packageName) !== null) {
    validPackageName = false;
  }

  if (!validPackageName) {
    throw new ERR_INVALID_MODULE_SPECIFIER(
      specifier,
      'is not a valid package name',
      fileURLToPath$1(base)
    )
  }

  const packageSubpath =
    '.' + (separatorIndex === -1 ? '' : specifier.slice(separatorIndex));

  return {packageName, packageSubpath, isScoped}
}

/**
 * @param {string} specifier
 * @param {URL} base
 * @param {Set<string> | undefined} conditions
 * @returns {URL}
 */
function packageResolve(specifier, base, conditions) {
  if (builtinModules.includes(specifier)) {
    return new URL$1('node:' + specifier)
  }

  const {packageName, packageSubpath, isScoped} = parsePackageName(
    specifier,
    base
  );

  // ResolveSelf
  const packageConfig = getPackageScopeConfig(base);

  // Can’t test.
  /* c8 ignore next 16 */
  if (packageConfig.exists) {
    const packageJsonUrl = pathToFileURL$1(packageConfig.pjsonPath);
    if (
      packageConfig.name === packageName &&
      packageConfig.exports !== undefined &&
      packageConfig.exports !== null
    ) {
      return packageExportsResolve(
        packageJsonUrl,
        packageSubpath,
        packageConfig,
        base,
        conditions
      )
    }
  }

  let packageJsonUrl = new URL$1(
    './node_modules/' + packageName + '/package.json',
    base
  );
  let packageJsonPath = fileURLToPath$1(packageJsonUrl);
  /** @type {string} */
  let lastPath;
  do {
    const stat = tryStatSync(packageJsonPath.slice(0, -13));
    if (!stat || !stat.isDirectory()) {
      lastPath = packageJsonPath;
      packageJsonUrl = new URL$1(
        (isScoped ? '../../../../node_modules/' : '../../../node_modules/') +
          packageName +
          '/package.json',
        packageJsonUrl
      );
      packageJsonPath = fileURLToPath$1(packageJsonUrl);
      continue
    }

    // Package match.
    const packageConfig = read(packageJsonPath, {base, specifier});
    if (packageConfig.exports !== undefined && packageConfig.exports !== null) {
      return packageExportsResolve(
        packageJsonUrl,
        packageSubpath,
        packageConfig,
        base,
        conditions
      )
    }

    if (packageSubpath === '.') {
      return legacyMainResolve(packageJsonUrl, packageConfig, base)
    }

    return new URL$1(packageSubpath, packageJsonUrl)
    // Cross-platform root check.
  } while (packageJsonPath.length !== lastPath.length)

  throw new ERR_MODULE_NOT_FOUND(packageName, fileURLToPath$1(base), false)
}

/**
 * @param {string} specifier
 * @returns {boolean}
 */
function isRelativeSpecifier(specifier) {
  if (specifier[0] === '.') {
    if (specifier.length === 1 || specifier[1] === '/') return true
    if (
      specifier[1] === '.' &&
      (specifier.length === 2 || specifier[2] === '/')
    ) {
      return true
    }
  }

  return false
}

/**
 * @param {string} specifier
 * @returns {boolean}
 */
function shouldBeTreatedAsRelativeOrAbsolutePath(specifier) {
  if (specifier === '') return false
  if (specifier[0] === '/') return true
  return isRelativeSpecifier(specifier)
}

/**
 * The “Resolver Algorithm Specification” as detailed in the Node docs (which is
 * sync and slightly lower-level than `resolve`).
 *
 * @param {string} specifier
 *   `/example.js`, `./example.js`, `../example.js`, `some-package`, `fs`, etc.
 * @param {URL} base
 *   Full URL (to a file) that `specifier` is resolved relative from.
 * @param {Set<string>} [conditions]
 *   Conditions.
 * @param {boolean} [preserveSymlinks]
 *   Keep symlinks instead of resolving them.
 * @returns {URL}
 *   A URL object to the found thing.
 */
function moduleResolve(specifier, base, conditions, preserveSymlinks) {
  // Note: The Node code supports `base` as a string (in this internal API) too,
  // we don’t.
  const protocol = base.protocol;
  const isData = protocol === 'data:';
  const isRemote = isData || protocol === 'http:' || protocol === 'https:';
  // Order swapped from spec for minor perf gain.
  // Ok since relative URLs cannot parse as URLs.
  /** @type {URL | undefined} */
  let resolved;

  if (shouldBeTreatedAsRelativeOrAbsolutePath(specifier)) {
    try {
      resolved = new URL$1(specifier, base);
    } catch (error_) {
      const error = new ERR_UNSUPPORTED_RESOLVE_REQUEST(specifier, base);
      error.cause = error_;
      throw error
    }
  } else if (protocol === 'file:' && specifier[0] === '#') {
    resolved = packageImportsResolve(specifier, base, conditions);
  } else {
    try {
      resolved = new URL$1(specifier);
    } catch (error_) {
      // Note: actual code uses `canBeRequiredWithoutScheme`.
      if (isRemote && !builtinModules.includes(specifier)) {
        const error = new ERR_UNSUPPORTED_RESOLVE_REQUEST(specifier, base);
        error.cause = error_;
        throw error
      }

      resolved = packageResolve(specifier, base, conditions);
    }
  }

  assert(resolved !== undefined, 'expected to be defined');

  if (resolved.protocol !== 'file:') {
    return resolved
  }

  return finalizeResolution(resolved, base)
}

function fileURLToPath(id) {
  if (typeof id === "string" && !id.startsWith("file://")) {
    return normalizeSlash(id);
  }
  return normalizeSlash(fileURLToPath$1(id));
}
function pathToFileURL(id) {
  return pathToFileURL$1(fileURLToPath(id)).toString();
}
function normalizeid(id) {
  if (typeof id !== "string") {
    id = id.toString();
  }
  if (/(?:node|data|http|https|file):/.test(id)) {
    return id;
  }
  if (BUILTIN_MODULES.has(id)) {
    return "node:" + id;
  }
  return "file://" + encodeURI(normalizeSlash(id));
}

const DEFAULT_CONDITIONS_SET = /* @__PURE__ */ new Set(["node", "import"]);
const DEFAULT_EXTENSIONS = [".mjs", ".cjs", ".js", ".json"];
const NOT_FOUND_ERRORS = /* @__PURE__ */ new Set([
  "ERR_MODULE_NOT_FOUND",
  "ERR_UNSUPPORTED_DIR_IMPORT",
  "MODULE_NOT_FOUND",
  "ERR_PACKAGE_PATH_NOT_EXPORTED"
]);
function _tryModuleResolve(id, url, conditions) {
  try {
    return moduleResolve(id, url, conditions);
  } catch (error) {
    if (!NOT_FOUND_ERRORS.has(error?.code)) {
      throw error;
    }
  }
}
function _resolve$1(id, options = {}) {
  if (typeof id !== "string") {
    if (id instanceof URL) {
      id = fileURLToPath(id);
    } else {
      throw new TypeError("input must be a `string` or `URL`");
    }
  }
  if (/(?:node|data|http|https):/.test(id)) {
    return id;
  }
  if (BUILTIN_MODULES.has(id)) {
    return "node:" + id;
  }
  if (id.startsWith("file://")) {
    id = fileURLToPath(id);
  }
  if (isAbsolute(id)) {
    try {
      const stat = statSync(id);
      if (stat.isFile()) {
        return pathToFileURL(id);
      }
    } catch (error) {
      if (error?.code !== "ENOENT") {
        throw error;
      }
    }
  }
  const conditionsSet = options.conditions ? new Set(options.conditions) : DEFAULT_CONDITIONS_SET;
  const _urls = (Array.isArray(options.url) ? options.url : [options.url]).filter(Boolean).map((url) => new URL(normalizeid(url.toString())));
  if (_urls.length === 0) {
    _urls.push(new URL(pathToFileURL(process.cwd())));
  }
  const urls = [..._urls];
  for (const url of _urls) {
    if (url.protocol === "file:") {
      urls.push(
        new URL("./", url),
        // If url is directory
        new URL(joinURL(url.pathname, "_index.js"), url),
        // TODO: Remove in next major version?
        new URL("node_modules", url)
      );
    }
  }
  let resolved;
  for (const url of urls) {
    resolved = _tryModuleResolve(id, url, conditionsSet);
    if (resolved) {
      break;
    }
    for (const prefix of ["", "/index"]) {
      for (const extension of options.extensions || DEFAULT_EXTENSIONS) {
        resolved = _tryModuleResolve(
          joinURL(id, prefix) + extension,
          url,
          conditionsSet
        );
        if (resolved) {
          break;
        }
      }
      if (resolved) {
        break;
      }
    }
    if (resolved) {
      break;
    }
  }
  if (!resolved) {
    const error = new Error(
      `Cannot find module ${id} imported from ${urls.join(", ")}`
    );
    error.code = "ERR_MODULE_NOT_FOUND";
    throw error;
  }
  return pathToFileURL(resolved);
}
function resolveSync(id, options) {
  return _resolve$1(id, options);
}
function resolvePathSync(id, options) {
  return fileURLToPath(resolveSync(id, options));
}

const GET_IS_ASYNC = Symbol.for("quansync.getIsAsync");
class QuansyncError extends Error {
  constructor(message = "Unexpected promise in sync context") {
    super(message);
    this.name = "QuansyncError";
  }
}
function isThenable(value) {
  return value && typeof value === "object" && typeof value.then === "function";
}
function isQuansyncGenerator(value) {
  return value && typeof value === "object" && typeof value[Symbol.iterator] === "function" && "__quansync" in value;
}
function fromObject(options) {
  const generator = function* (...args) {
    const isAsync = yield GET_IS_ASYNC;
    if (isAsync)
      return yield options.async.apply(this, args);
    return options.sync.apply(this, args);
  };
  function fn(...args) {
    const iter = generator.apply(this, args);
    iter.then = (...thenArgs) => options.async.apply(this, args).then(...thenArgs);
    iter.__quansync = true;
    return iter;
  }
  fn.sync = options.sync;
  fn.async = options.async;
  return fn;
}
function fromPromise(promise) {
  return fromObject({
    async: () => Promise.resolve(promise),
    sync: () => {
      if (isThenable(promise))
        throw new QuansyncError();
      return promise;
    }
  });
}
function unwrapYield(value, isAsync) {
  if (value === GET_IS_ASYNC)
    return isAsync;
  if (isQuansyncGenerator(value))
    return isAsync ? iterateAsync(value) : iterateSync(value);
  if (!isAsync && isThenable(value))
    throw new QuansyncError();
  return value;
}
const DEFAULT_ON_YIELD = (value) => value;
function iterateSync(generator, onYield = DEFAULT_ON_YIELD) {
  let current = generator.next();
  while (!current.done) {
    try {
      current = generator.next(unwrapYield(onYield(current.value, false)));
    } catch (err) {
      current = generator.throw(err);
    }
  }
  return unwrapYield(current.value);
}
async function iterateAsync(generator, onYield = DEFAULT_ON_YIELD) {
  let current = generator.next();
  while (!current.done) {
    try {
      current = generator.next(await unwrapYield(onYield(current.value, true), true));
    } catch (err) {
      current = generator.throw(err);
    }
  }
  return current.value;
}
function fromGeneratorFn(generatorFn, options) {
  return fromObject({
    name: generatorFn.name,
    async(...args) {
      return iterateAsync(generatorFn.apply(this, args), options?.onYield);
    },
    sync(...args) {
      return iterateSync(generatorFn.apply(this, args), options?.onYield);
    }
  });
}
function quansync$1(input, options) {
  if (isThenable(input))
    return fromPromise(input);
  if (typeof input === "function")
    return fromGeneratorFn(input, options);
  else
    return fromObject(input);
}
quansync$1({
  async: () => Promise.resolve(true),
  sync: () => false
});

const quansync = quansync$1;

const toPath = urlOrPath => urlOrPath instanceof URL ? fileURLToPath$1(urlOrPath) : urlOrPath;

async function findUp$1(name, {
	cwd = process$1.cwd(),
	type = 'file',
	stopAt,
} = {}) {
	let directory = path.resolve(toPath(cwd) ?? '');
	const {root} = path.parse(directory);
	stopAt = path.resolve(directory, toPath(stopAt ?? root));
	const isAbsoluteName = path.isAbsolute(name);

	while (directory) {
		const filePath = isAbsoluteName ? name : path.join(directory, name);
		try {
			const stats = await fs$1.stat(filePath); // eslint-disable-line no-await-in-loop
			if ((type === 'file' && stats.isFile()) || (type === 'directory' && stats.isDirectory())) {
				return filePath;
			}
		} catch {}

		if (directory === stopAt || directory === root) {
			break;
		}

		directory = path.dirname(directory);
	}
}

function findUpSync(name, {
	cwd = process$1.cwd(),
	type = 'file',
	stopAt,
} = {}) {
	let directory = path.resolve(toPath(cwd) ?? '');
	const {root} = path.parse(directory);
	stopAt = path.resolve(directory, toPath(stopAt) ?? root);
	const isAbsoluteName = path.isAbsolute(name);

	while (directory) {
		const filePath = isAbsoluteName ? name : path.join(directory, name);

		try {
			const stats = fs.statSync(filePath, {throwIfNoEntry: false});
			if ((type === 'file' && stats?.isFile()) || (type === 'directory' && stats?.isDirectory())) {
				return filePath;
			}
		} catch {}

		if (directory === stopAt || directory === root) {
			break;
		}

		directory = path.dirname(directory);
	}
}

function _resolve(path, options = {}) {
  if (options.platform === "auto" || !options.platform)
    options.platform = process$1.platform === "win32" ? "win32" : "posix";
  if (process$1.versions.pnp) {
    const paths = options.paths || [];
    if (paths.length === 0)
      paths.push(process$1.cwd());
    const targetRequire = createRequire(import.meta.url);
    try {
      return targetRequire.resolve(path, { paths });
    } catch {
    }
  }
  const modulePath = resolvePathSync(path, {
    url: options.paths
  });
  if (options.platform === "win32")
    return win32.normalize(modulePath);
  return modulePath;
}
function resolveModule(name, options = {}) {
  try {
    return _resolve(name, options);
  } catch {
    return void 0;
  }
}
function isPackageExists(name, options = {}) {
  return !!resolvePackage(name, options);
}
function getPackageJsonPath(name, options = {}) {
  const entry = resolvePackage(name, options);
  if (!entry)
    return;
  return searchPackageJSON(entry);
}
const readFile = quansync({
  async: (id) => fs.promises.readFile(id, "utf8"),
  sync: (id) => fs.readFileSync(id, "utf8")
});
const getPackageInfo = quansync(function* (name, options = {}) {
  const packageJsonPath = getPackageJsonPath(name, options);
  if (!packageJsonPath)
    return;
  const packageJson = JSON.parse(yield readFile(packageJsonPath));
  return {
    name,
    version: packageJson.version,
    rootPath: dirname(packageJsonPath),
    packageJsonPath,
    packageJson
  };
});
getPackageInfo.sync;
function resolvePackage(name, options = {}) {
  try {
    return _resolve(`${name}/package.json`, options);
  } catch {
  }
  try {
    return _resolve(name, options);
  } catch (e) {
    if (e.code !== "MODULE_NOT_FOUND" && e.code !== "ERR_MODULE_NOT_FOUND")
      console.error(e);
    return false;
  }
}
function searchPackageJSON(dir) {
  let packageJsonPath;
  while (true) {
    if (!dir)
      return;
    const newDir = dirname(dir);
    if (newDir === dir)
      return;
    dir = newDir;
    packageJsonPath = join(dir, "package.json");
    if (fs.existsSync(packageJsonPath))
      break;
  }
  return packageJsonPath;
}
const findUp = quansync({
  sync: findUpSync,
  async: findUp$1
});
const loadPackageJSON = quansync(function* (cwd = process$1.cwd()) {
  const path = yield findUp("package.json", { cwd });
  if (!path || !fs.existsSync(path))
    return null;
  return JSON.parse(yield readFile(path));
});
loadPackageJSON.sync;
const isPackageListed = quansync(function* (name, cwd) {
  const pkg = (yield loadPackageJSON(cwd)) || {};
  return name in (pkg.dependencies || {}) || name in (pkg.devDependencies || {});
});
isPackageListed.sync;

function getWorkersCountByPercentage(percent) {
	const maxWorkersCount = nodeos__default.availableParallelism?.() ?? nodeos__default.cpus().length;
	const workersCountByPercentage = Math.round(Number.parseInt(percent) / 100 * maxWorkersCount);
	return Math.max(1, Math.min(maxWorkersCount, workersCountByPercentage));
}

class BaseSequencer {
	ctx;
	constructor(ctx) {
		this.ctx = ctx;
	}
	// async so it can be extended by other sequelizers
	async shard(files) {
		const { config } = this.ctx;
		const { index, count } = config.shard;
		const [shardStart, shardEnd] = this.calculateShardRange(files.length, index, count);
		return [...files].map((spec) => {
			const specPath = resolve(slash(config.root), slash(spec.moduleId))?.slice(config.root.length);
			return {
				spec,
				hash: hash("sha1", specPath, "hex")
			};
		}).sort((a, b) => a.hash < b.hash ? -1 : a.hash > b.hash ? 1 : 0).slice(shardStart, shardEnd).map(({ spec }) => spec);
	}
	// async so it can be extended by other sequelizers
	async sort(files) {
		const cache = this.ctx.cache;
		return [...files].sort((a, b) => {
			// "sequence.groupOrder" is higher priority
			const groupOrderDiff = a.project.config.sequence.groupOrder - b.project.config.sequence.groupOrder;
			if (groupOrderDiff !== 0) return groupOrderDiff;
			// Projects run sequential
			if (a.project.name !== b.project.name) return a.project.name < b.project.name ? -1 : 1;
			// Isolated run first
			if (a.project.config.isolate && !b.project.config.isolate) return -1;
			if (!a.project.config.isolate && b.project.config.isolate) return 1;
			const keyA = `${a.project.name}:${relative(this.ctx.config.root, a.moduleId)}`;
			const keyB = `${b.project.name}:${relative(this.ctx.config.root, b.moduleId)}`;
			const aState = cache.getFileTestResults(keyA);
			const bState = cache.getFileTestResults(keyB);
			if (!aState || !bState) {
				const statsA = cache.getFileStats(keyA);
				const statsB = cache.getFileStats(keyB);
				// run unknown first
				if (!statsA || !statsB) return !statsA && statsB ? -1 : !statsB && statsA ? 1 : 0;
				// run larger files first
				return statsB.size - statsA.size;
			}
			// run failed first
			if (aState.failed && !bState.failed) return -1;
			if (!aState.failed && bState.failed) return 1;
			// run longer first
			return bState.duration - aState.duration;
		});
	}
	// Calculate distributed shard range [start, end] distributed equally
	calculateShardRange(filesCount, index, count) {
		const baseShardSize = Math.floor(filesCount / count);
		const remainderTestFilesCount = filesCount % count;
		if (remainderTestFilesCount >= index) {
			const shardSize = baseShardSize + 1;
			return [shardSize * (index - 1), shardSize * index];
		}
		const shardStart = remainderTestFilesCount * (baseShardSize + 1) + (index - remainderTestFilesCount - 1) * baseShardSize;
		return [shardStart, shardStart + baseShardSize];
	}
}

class RandomSequencer extends BaseSequencer {
	async sort(files) {
		const { sequence } = this.ctx.config;
		return shuffle(files, sequence.seed);
	}
}

function resolvePath(path, root) {
	return normalize(/* @__PURE__ */ resolveModule(path, { paths: [root] }) ?? resolve(root, path));
}
function parseInspector(inspect) {
	if (typeof inspect === "boolean" || inspect === void 0) return {};
	if (typeof inspect === "number") return { port: inspect };
	if (inspect.match(/https?:\//)) throw new Error(`Inspector host cannot be a URL. Use "host:port" instead of "${inspect}"`);
	const [host, port] = inspect.split(":");
	if (!port) return { host };
	return {
		host,
		port: Number(port) || defaultInspectPort
	};
}
function resolveApiServerConfig(options, defaultPort) {
	let api;
	if (options.ui && !options.api) api = { port: defaultPort };
	else if (options.api === true) api = { port: defaultPort };
	else if (typeof options.api === "number") api = { port: options.api };
	if (typeof options.api === "object") if (api) {
		if (options.api.port) api.port = options.api.port;
		if (options.api.strictPort) api.strictPort = options.api.strictPort;
		if (options.api.host) api.host = options.api.host;
	} else api = { ...options.api };
	if (api) {
		if (!api.port && !api.middlewareMode) api.port = defaultPort;
	} else api = { middlewareMode: true };
	return api;
}
function resolveInlineWorkerOption(value) {
	if (typeof value === "string" && value.trim().endsWith("%")) return getWorkersCountByPercentage(value);
	else return Number(value);
}
function resolveConfig$1(vitest, options, viteConfig) {
	const mode = vitest.mode;
	const logger = vitest.logger;
	if (options.dom) {
		if (viteConfig.test?.environment != null && viteConfig.test.environment !== "happy-dom") logger.console.warn(c.yellow(`${c.inverse(c.yellow(" Vitest "))} Your config.test.environment ("${viteConfig.test.environment}") conflicts with --dom flag ("happy-dom"), ignoring "${viteConfig.test.environment}"`));
		options.environment = "happy-dom";
	}
	const resolved = {
		...configDefaults,
		...options,
		root: viteConfig.root,
		mode
	};
	if (options.pool && typeof options.pool !== "string") {
		resolved.pool = options.pool.name;
		resolved.poolRunner = options.pool;
	}
	if ("poolOptions" in resolved) logger.deprecate("`test.poolOptions` was removed in Vitest 4. All previous `poolOptions` are now top-level options. Please, refer to the migration guide: https://vitest.dev/guide/migration#pool-rework");
	resolved.pool ??= "forks";
	resolved.project = toArray(resolved.project);
	resolved.provide ??= {};
	resolved.name = typeof options.name === "string" ? options.name : options.name?.label || "";
	resolved.color = typeof options.name !== "string" ? options.name?.color : void 0;
	if (resolved.environment === "browser") throw new Error(`Looks like you set "test.environment" to "browser". To enable Browser Mode, use "test.browser.enabled" instead.`);
	const inspector = resolved.inspect || resolved.inspectBrk;
	resolved.inspector = {
		...resolved.inspector,
		...parseInspector(inspector),
		enabled: !!inspector,
		waitForDebugger: options.inspector?.waitForDebugger ?? !!resolved.inspectBrk
	};
	if (viteConfig.base !== "/") resolved.base = viteConfig.base;
	resolved.clearScreen = resolved.clearScreen ?? viteConfig.clearScreen ?? true;
	if (options.shard) {
		if (resolved.watch) throw new Error("You cannot use --shard option with enabled watch");
		const [indexString, countString] = options.shard.split("/");
		const index = Math.abs(Number.parseInt(indexString, 10));
		const count = Math.abs(Number.parseInt(countString, 10));
		if (Number.isNaN(count) || count <= 0) throw new Error("--shard <count> must be a positive number");
		if (Number.isNaN(index) || index <= 0 || index > count) throw new Error("--shard <index> must be a positive number less then <count>");
		resolved.shard = {
			index,
			count
		};
	}
	if (resolved.standalone && !resolved.watch) throw new Error(`Vitest standalone mode requires --watch`);
	if (resolved.mergeReports && resolved.watch) throw new Error(`Cannot merge reports with --watch enabled`);
	if (resolved.maxWorkers) resolved.maxWorkers = resolveInlineWorkerOption(resolved.maxWorkers);
	if (!(options.fileParallelism ?? mode !== "benchmark"))
 // ignore user config, parallelism cannot be implemented without limiting workers
	resolved.maxWorkers = 1;
	if (resolved.maxConcurrency === 0) {
		logger.console.warn(c.yellow(`The option "maxConcurrency" cannot be set to 0. Using default value ${configDefaults.maxConcurrency} instead.`));
		resolved.maxConcurrency = configDefaults.maxConcurrency;
	}
	if (resolved.inspect || resolved.inspectBrk) {
		if (resolved.maxWorkers !== 1) {
			const inspectOption = `--inspect${resolved.inspectBrk ? "-brk" : ""}`;
			throw new Error(`You cannot use ${inspectOption} without "--no-file-parallelism"`);
		}
	}
	// apply browser CLI options only if the config already has the browser config and not disabled manually
	if (vitest._cliOptions.browser && resolved.browser && (resolved.browser.enabled !== false || vitest._cliOptions.browser.enabled)) resolved.browser = mergeConfig(resolved.browser, vitest._cliOptions.browser);
	resolved.browser ??= {};
	const browser = resolved.browser;
	if (browser.enabled) {
		const instances = browser.instances;
		if (!browser.instances) browser.instances = [];
		// use `chromium` by default when the preview provider is specified
		// for a smoother experience. if chromium is not available, it will
		// open the default browser anyway
		if (!browser.instances.length && browser.provider?.name === "preview") browser.instances = [{ browser: "chromium" }];
		if (browser.name && instances?.length) {
			// --browser=chromium filters configs to a single one
			browser.instances = browser.instances.filter((instance) => instance.browser === browser.name);
			// if `instances` were defined, but now they are empty,
			// let's throw an error because the filter is invalid
			if (!browser.instances.length) throw new Error([`"browser.instances" was set in the config, but the array is empty. Define at least one browser config.`, ` The "browser.name" was set to "${browser.name}" which filtered all configs (${instances.map((c) => c.browser).join(", ")}). Did you mean to use another name?`].join(""));
		}
	}
	const containsChromium = hasBrowserChromium(vitest, resolved);
	const hasOnlyChromium = hasOnlyBrowserChromium(vitest, resolved);
	// Browser-mode "Chromium" only features:
	if (browser.enabled && (!containsChromium || !hasOnlyChromium)) {
		const browserConfig = `
{
  browser: {
    provider: ${browser.provider?.name || "preview"}(),
    instances: [
      ${(browser.instances || []).map((i) => `{ browser: '${i.browser}' }`).join(",\n      ")}
    ],
  },
}
    `.trim();
		const preferredProvider = !browser.provider?.name || browser.provider.name === "preview" ? "playwright" : browser.provider.name;
		const correctExample = `
{
  browser: {
    provider: ${preferredProvider}(),
    instances: [
      { browser: '${preferredProvider === "playwright" ? "chromium" : "chrome"}' }
    ],
  },
}
    `.trim();
		// requires all projects to be chromium
		if (!hasOnlyChromium && resolved.coverage.enabled && resolved.coverage.provider === "v8") {
			const coverageExample = `
{
  coverage: {
    provider: 'istanbul',
  },
}
      `.trim();
			throw new Error(`@vitest/coverage-v8 does not work with\n${browserConfig}\n\nUse either:\n${correctExample}\n\n...or change your coverage provider to:\n${coverageExample}\n`);
		}
		// ignores non-chromium browsers when there is at least one chromium project
		if (!containsChromium && (resolved.inspect || resolved.inspectBrk)) {
			const inspectOption = `--inspect${resolved.inspectBrk ? "-brk" : ""}`;
			throw new Error(`${inspectOption} does not work with\n${browserConfig}\n\nUse either:\n${correctExample}\n\n...or disable ${inspectOption}\n`);
		}
	}
	resolved.coverage.reporter = resolveCoverageReporters(resolved.coverage.reporter);
	if (resolved.coverage.enabled && resolved.coverage.reportsDirectory) {
		const reportsDirectory = resolve(resolved.root, resolved.coverage.reportsDirectory);
		if (reportsDirectory === resolved.root || reportsDirectory === process.cwd()) throw new Error(`You cannot set "coverage.reportsDirectory" as ${reportsDirectory}. Vitest needs to be able to remove this directory before test run`);
	}
	if (resolved.coverage.enabled && resolved.coverage.provider === "custom" && resolved.coverage.customProviderModule) resolved.coverage.customProviderModule = resolvePath(resolved.coverage.customProviderModule, resolved.root);
	resolved.expect ??= {};
	resolved.deps ??= {};
	resolved.deps.moduleDirectories ??= [];
	resolved.deps.optimizer ??= {};
	resolved.deps.optimizer.ssr ??= {};
	resolved.deps.optimizer.ssr.enabled ??= false;
	resolved.deps.optimizer.client ??= {};
	resolved.deps.optimizer.client.enabled ??= false;
	resolved.deps.web ??= {};
	resolved.deps.web.transformAssets ??= true;
	resolved.deps.web.transformCss ??= true;
	resolved.deps.web.transformGlobPattern ??= [];
	resolved.setupFiles = toArray(resolved.setupFiles || []).map((file) => resolvePath(file, resolved.root));
	resolved.globalSetup = toArray(resolved.globalSetup || []).map((file) => resolvePath(file, resolved.root));
	// Add hard-coded default coverage exclusions. These cannot be overidden by user config.
	// Override original exclude array for cases where user re-uses same object in test.exclude.
	resolved.coverage.exclude = [
		...resolved.coverage.exclude,
		...resolved.setupFiles.map((file) => `${resolved.coverage.allowExternal ? "**/" : ""}${relative(resolved.root, file)}`),
		...resolved.include,
		resolved.config && slash(resolved.config),
		...configFiles,
		"**/virtual:*",
		"**/__x00__*",
		"**/node_modules/**"
	].filter((pattern) => typeof pattern === "string");
	resolved.forceRerunTriggers = [...resolved.forceRerunTriggers, ...resolved.setupFiles];
	if (resolved.cliExclude) resolved.exclude.push(...resolved.cliExclude);
	if (resolved.runner) resolved.runner = resolvePath(resolved.runner, resolved.root);
	resolved.attachmentsDir = resolve(resolved.root, resolved.attachmentsDir ?? ".vitest-attachments");
	if (resolved.snapshotEnvironment) resolved.snapshotEnvironment = resolvePath(resolved.snapshotEnvironment, resolved.root);
	resolved.testNamePattern = resolved.testNamePattern ? resolved.testNamePattern instanceof RegExp ? resolved.testNamePattern : new RegExp(resolved.testNamePattern) : void 0;
	if (resolved.snapshotFormat && "plugins" in resolved.snapshotFormat) {
		resolved.snapshotFormat.plugins = [];
		// TODO: support it via separate config (like DiffOptions) or via `Function.toString()`
		if (typeof resolved.snapshotFormat.compareKeys === "function") throw new TypeError(`"snapshotFormat.compareKeys" function is not supported.`);
	}
	const UPDATE_SNAPSHOT = resolved.update || process.env.UPDATE_SNAPSHOT;
	resolved.snapshotOptions = {
		expand: resolved.expandSnapshotDiff ?? false,
		snapshotFormat: resolved.snapshotFormat || {},
		updateSnapshot: isCI && !UPDATE_SNAPSHOT ? "none" : UPDATE_SNAPSHOT ? "all" : "new",
		resolveSnapshotPath: options.resolveSnapshotPath,
		snapshotEnvironment: null
	};
	resolved.snapshotSerializers ??= [];
	resolved.snapshotSerializers = resolved.snapshotSerializers.map((file) => resolvePath(file, resolved.root));
	resolved.forceRerunTriggers.push(...resolved.snapshotSerializers);
	if (options.resolveSnapshotPath) delete resolved.resolveSnapshotPath;
	resolved.execArgv ??= [];
	resolved.pool ??= "threads";
	if (resolved.pool === "vmForks" || resolved.pool === "vmThreads" || resolved.pool === "typescript") resolved.isolate = false;
	if (process.env.VITEST_MAX_WORKERS) resolved.maxWorkers = Number.parseInt(process.env.VITEST_MAX_WORKERS);
	if (mode === "benchmark") {
		resolved.benchmark = {
			...benchmarkConfigDefaults,
			...resolved.benchmark
		};
		// override test config
		resolved.coverage.enabled = false;
		resolved.typecheck.enabled = false;
		resolved.include = resolved.benchmark.include;
		resolved.exclude = resolved.benchmark.exclude;
		resolved.includeSource = resolved.benchmark.includeSource;
		const reporters = Array.from(new Set([...toArray(resolved.benchmark.reporters), ...toArray(options.reporter)])).filter(Boolean);
		if (reporters.length) resolved.benchmark.reporters = reporters;
		else resolved.benchmark.reporters = ["default"];
		if (options.outputFile) resolved.benchmark.outputFile = options.outputFile;
		// --compare from cli
		if (options.compare) resolved.benchmark.compare = options.compare;
		if (options.outputJson) resolved.benchmark.outputJson = options.outputJson;
	}
	if (typeof resolved.diff === "string") {
		resolved.diff = resolvePath(resolved.diff, resolved.root);
		resolved.forceRerunTriggers.push(resolved.diff);
	}
	resolved.api = {
		...resolveApiServerConfig(options, defaultPort),
		token: crypto.randomUUID()
	};
	if (options.related) resolved.related = toArray(options.related).map((file) => resolve(resolved.root, file));
	/*
	* Reporters can be defined in many different ways:
	* { reporter: 'json' }
	* { reporter: { onFinish() { method() } } }
	* { reporter: ['json', { onFinish() { method() } }] }
	* { reporter: [[ 'json' ]] }
	* { reporter: [[ 'json' ], 'html'] }
	* { reporter: [[ 'json', { outputFile: 'test.json' } ], 'html'] }
	*/
	if (options.reporters) if (!Array.isArray(options.reporters))
 // Reporter name, e.g. { reporters: 'json' }
	if (typeof options.reporters === "string") resolved.reporters = [[options.reporters, {}]];
	else resolved.reporters = [options.reporters];
	else {
		resolved.reporters = [];
		for (const reporter of options.reporters) if (Array.isArray(reporter))
 // Reporter with options, e.g. { reporters: [ [ 'json', { outputFile: 'test.json' } ] ] }
		resolved.reporters.push([reporter[0], reporter[1] || {}]);
		else if (typeof reporter === "string")
 // Reporter name in array, e.g. { reporters: ["html", "json"]}
		resolved.reporters.push([reporter, {}]);
		else
 // Inline reporter, e.g. { reporter: [{ onFinish() { method() } }] }
		resolved.reporters.push(reporter);
	}
	if (mode !== "benchmark") {
		// @ts-expect-error "reporter" is from CLI, should be absolute to the running directory
		// it is passed down as "vitest --reporter ../reporter.js"
		const reportersFromCLI = resolved.reporter;
		const cliReporters = toArray(reportersFromCLI || []).map((reporter) => {
			// ./reporter.js || ../reporter.js, but not .reporters/reporter.js
			if (/^\.\.?\//.test(reporter)) return resolve(process.cwd(), reporter);
			return reporter;
		});
		if (cliReporters.length) {
			// When CLI reporters are specified, preserve options from config file
			const configReportersMap = /* @__PURE__ */ new Map();
			// Build a map of reporter names to their options from the config
			for (const reporter of resolved.reporters) if (Array.isArray(reporter)) {
				const [reporterName, reporterOptions] = reporter;
				if (typeof reporterName === "string") configReportersMap.set(reporterName, reporterOptions);
			}
			resolved.reporters = Array.from(new Set(toArray(cliReporters))).filter(Boolean).map((reporter) => [reporter, configReportersMap.get(reporter) || {}]);
		}
	}
	if (!resolved.reporters.length) {
		resolved.reporters.push(["default", {}]);
		// also enable github-actions reporter as a default
		if (process.env.GITHUB_ACTIONS === "true") resolved.reporters.push(["github-actions", {}]);
	}
	if (resolved.changed) resolved.passWithNoTests ??= true;
	resolved.css ??= {};
	if (typeof resolved.css === "object") {
		resolved.css.modules ??= {};
		resolved.css.modules.classNameStrategy ??= "stable";
	}
	if (resolved.cache !== false) {
		if (resolved.cache && typeof resolved.cache.dir === "string") vitest.logger.deprecate(`"cache.dir" is deprecated, use Vite's "cacheDir" instead if you want to change the cache director. Note caches will be written to "cacheDir\/vitest"`);
		resolved.cache = { dir: viteConfig.cacheDir };
	}
	resolved.sequence ??= {};
	if (resolved.sequence.shuffle && typeof resolved.sequence.shuffle === "object") {
		const { files, tests } = resolved.sequence.shuffle;
		resolved.sequence.sequencer ??= files ? RandomSequencer : BaseSequencer;
		resolved.sequence.shuffle = tests;
	}
	if (!resolved.sequence?.sequencer)
 // CLI flag has higher priority
	resolved.sequence.sequencer = resolved.sequence.shuffle ? RandomSequencer : BaseSequencer;
	resolved.sequence.groupOrder ??= 0;
	resolved.sequence.hooks ??= "stack";
	if (resolved.sequence.sequencer === RandomSequencer) resolved.sequence.seed ??= Date.now();
	resolved.typecheck = {
		...configDefaults.typecheck,
		...resolved.typecheck
	};
	resolved.typecheck ??= {};
	resolved.typecheck.enabled ??= false;
	if (resolved.typecheck.enabled) logger.console.warn(c.yellow("Testing types with tsc and vue-tsc is an experimental feature.\nBreaking changes might not follow SemVer, please pin Vitest's version when using it."));
	resolved.browser.enabled ??= false;
	resolved.browser.headless ??= isCI;
	resolved.browser.isolate ??= resolved.isolate ?? true;
	resolved.browser.fileParallelism ??= options.fileParallelism ?? mode !== "benchmark";
	// disable in headless mode by default, and if CI is detected
	resolved.browser.ui ??= resolved.browser.headless === true ? false : !isCI;
	resolved.browser.commands ??= {};
	if (resolved.browser.screenshotDirectory) resolved.browser.screenshotDirectory = resolve(resolved.root, resolved.browser.screenshotDirectory);
	if (resolved.inspector.enabled) resolved.browser.trackUnhandledErrors ??= false;
	resolved.browser.viewport ??= {};
	resolved.browser.viewport.width ??= 414;
	resolved.browser.viewport.height ??= 896;
	resolved.browser.locators ??= {};
	resolved.browser.locators.testIdAttribute ??= "data-testid";
	if (typeof resolved.browser.provider === "string") {
		const source = `@vitest/browser-${resolved.browser.provider}`;
		throw new TypeError(`The \`browser.provider\` configuration was changed to accept a factory instead of a string. Add an import of "${resolved.browser.provider}" from "${source}" instead. See: https://vitest.dev/config/browser/provider`);
	}
	const isPreview = resolved.browser.provider?.name === "preview";
	if (!isPreview && resolved.browser.enabled && provider === "stackblitz") throw new Error(`stackblitz environment does not support the ${resolved.browser.provider?.name} provider. Please, use "@vitest/browser-preview" instead.`);
	if (isPreview && resolved.browser.screenshotFailures === true) {
		console.warn(c.yellow([
			`Browser provider "preview" doesn't support screenshots, `,
			`so "browser.screenshotFailures" option is forcefully disabled. `,
			`Set "browser.screenshotFailures" to false or remove it from the config to suppress this warning.`
		].join("")));
		resolved.browser.screenshotFailures = false;
	} else resolved.browser.screenshotFailures ??= !isPreview && !resolved.browser.ui;
	if (resolved.browser.provider && resolved.browser.provider.options == null) resolved.browser.provider.options = {};
	resolved.browser.api = resolveApiServerConfig(resolved.browser, defaultBrowserPort) || { port: defaultBrowserPort };
	// enable includeTaskLocation by default in UI mode
	if (resolved.browser.enabled) {
		if (resolved.browser.ui) resolved.includeTaskLocation ??= true;
	} else if (resolved.ui) resolved.includeTaskLocation ??= true;
	if (typeof resolved.browser.trace === "string" || !resolved.browser.trace) resolved.browser.trace = { mode: resolved.browser.trace || "off" };
	if (resolved.browser.trace.tracesDir != null) resolved.browser.trace.tracesDir = resolvePath(resolved.browser.trace.tracesDir, resolved.root);
	if (toArray(resolved.reporters).some((reporter) => {
		if (Array.isArray(reporter)) return reporter[0] === "html";
		return false;
	})) resolved.includeTaskLocation ??= true;
	resolved.server ??= {};
	resolved.server.deps ??= {};
	if (resolved.server.debug?.dump || process.env.VITEST_DEBUG_DUMP) {
		const userFolder = resolved.server.debug?.dump || process.env.VITEST_DEBUG_DUMP;
		resolved.dumpDir = resolve(resolved.root, typeof userFolder === "string" && userFolder !== "true" ? userFolder : ".vitest-dump", resolved.name || "root");
	}
	resolved.testTimeout ??= resolved.browser.enabled ? 15e3 : 5e3;
	resolved.hookTimeout ??= resolved.browser.enabled ? 3e4 : 1e4;
	resolved.experimental ??= {};
	if (resolved.experimental.openTelemetry?.sdkPath) {
		const sdkPath = resolve(resolved.root, resolved.experimental.openTelemetry.sdkPath);
		resolved.experimental.openTelemetry.sdkPath = pathToFileURL$1(sdkPath).toString();
	}
	if (resolved.experimental.fsModuleCachePath) resolved.experimental.fsModuleCachePath = resolve(resolved.root, resolved.experimental.fsModuleCachePath);
	return resolved;
}
function isBrowserEnabled(config) {
	return Boolean(config.browser?.enabled);
}
function resolveCoverageReporters(configReporters) {
	// E.g. { reporter: "html" }
	if (!Array.isArray(configReporters)) return [[configReporters, {}]];
	const resolvedReporters = [];
	for (const reporter of configReporters) if (Array.isArray(reporter))
 // E.g. { reporter: [ ["html", { skipEmpty: true }], ["lcov"], ["json", { file: "map.json" }] ]}
	resolvedReporters.push([reporter[0], reporter[1] || {}]);
	else
 // E.g. { reporter: ["html", "json"]}
	resolvedReporters.push([reporter, {}]);
	return resolvedReporters;
}
function isChromiumName(provider, name) {
	if (provider === "playwright") return name === "chromium";
	return name === "chrome" || name === "edge";
}
function hasBrowserChromium(vitest, config) {
	const browser = config.browser;
	if (!browser || !browser.provider || browser.provider.name === "preview" || !browser.enabled) return false;
	if (browser.name) return isChromiumName(browser.provider.name, browser.name);
	if (!browser.instances) return false;
	return browser.instances.some((instance) => {
		const name = instance.name || (config.name ? `${config.name} (${instance.browser})` : instance.browser);
		// browser config is filtered out
		if (!vitest.matchesProjectFilter(name)) return false;
		return isChromiumName(browser.provider.name, instance.browser);
	});
}
function hasOnlyBrowserChromium(vitest, config) {
	const browser = config.browser;
	if (!browser || !browser.provider || browser.provider.name === "preview" || !browser.enabled) return false;
	if (browser.name) return isChromiumName(browser.provider.name, browser.name);
	if (!browser.instances) return false;
	return browser.instances.every((instance) => {
		const name = instance.name || (config.name ? `${config.name} (${instance.browser})` : instance.browser);
		// browser config is filtered out
		if (!vitest.matchesProjectFilter(name)) return true;
		return isChromiumName(browser.provider.name, instance.browser);
	});
}

const THRESHOLD_KEYS = [
	"lines",
	"functions",
	"statements",
	"branches"
];
const GLOBAL_THRESHOLDS_KEY = "global";
const DEFAULT_PROJECT = Symbol.for("default-project");
let uniqueId = 0;
async function getCoverageProvider(options, loader) {
	const coverageModule = await resolveCoverageProviderModule(options, loader);
	if (coverageModule) return coverageModule.getProvider();
	return null;
}
class BaseCoverageProvider {
	ctx;
	name;
	version;
	options;
	globCache = /* @__PURE__ */ new Map();
	coverageFiles = /* @__PURE__ */ new Map();
	pendingPromises = [];
	coverageFilesDirectory;
	roots = [];
	_initialize(ctx) {
		this.ctx = ctx;
		if (ctx.version !== this.version) ctx.logger.warn(c.yellow(`Loaded ${c.inverse(c.yellow(` vitest@${ctx.version} `))} and ${c.inverse(c.yellow(` @vitest/coverage-${this.name}@${this.version} `))}.
Running mixed versions is not supported and may lead into bugs
Update your dependencies and make sure the versions match.`));
		const config = ctx._coverageOptions;
		this.options = {
			...coverageConfigDefaults,
			...config,
			provider: this.name,
			reportsDirectory: resolve(ctx.config.root, config.reportsDirectory || coverageConfigDefaults.reportsDirectory),
			reporter: resolveCoverageReporters(config.reporter || coverageConfigDefaults.reporter),
			thresholds: config.thresholds && {
				...config.thresholds,
				lines: config.thresholds["100"] ? 100 : config.thresholds.lines,
				branches: config.thresholds["100"] ? 100 : config.thresholds.branches,
				functions: config.thresholds["100"] ? 100 : config.thresholds.functions,
				statements: config.thresholds["100"] ? 100 : config.thresholds.statements
			}
		};
		const shard = this.ctx.config.shard;
		const tempDirectory = `.tmp${shard ? `-${shard.index}-${shard.count}` : ""}`;
		this.coverageFilesDirectory = resolve(this.options.reportsDirectory, tempDirectory);
		// If --project filter is set pick only roots of resolved projects
		this.roots = ctx.config.project?.length ? [...new Set(ctx.projects.map((project) => project.config.root))] : [ctx.config.root];
	}
	/**
	* Check if file matches `coverage.include` but not `coverage.exclude`
	*/
	isIncluded(_filename, root) {
		const roots = root ? [root] : this.roots;
		const filename = slash(_filename);
		const cacheHit = this.globCache.get(filename);
		if (cacheHit !== void 0) return cacheHit;
		// File outside project root with default allowExternal
		if (this.options.allowExternal === false && roots.every((root) => !filename.startsWith(root))) {
			this.globCache.set(filename, false);
			return false;
		}
		// By default `coverage.include` matches all files, except "coverage.exclude"
		const glob = this.options.include || "**";
		const included = pm.isMatch(filename, glob, {
			contains: true,
			dot: true,
			ignore: this.options.exclude
		});
		this.globCache.set(filename, included);
		return included;
	}
	async getUntestedFilesByRoot(testedFiles, include, root) {
		let includedFiles = await glob(include, {
			cwd: root,
			ignore: [...this.options.exclude, ...testedFiles.map((file) => slash(file))],
			absolute: true,
			dot: true,
			onlyFiles: true
		});
		// Run again through picomatch as tinyglobby's exclude pattern is different ({ "exclude": ["math"] } should ignore "src/math.ts")
		includedFiles = includedFiles.filter((file) => this.isIncluded(file, root));
		if (this.ctx.config.changed) includedFiles = (this.ctx.config.related || []).filter((file) => includedFiles.includes(file));
		return includedFiles.map((file) => slash(path.resolve(root, file)));
	}
	async getUntestedFiles(testedFiles) {
		if (this.options.include == null) return [];
		const rootMapper = this.getUntestedFilesByRoot.bind(this, testedFiles, this.options.include);
		return (await Promise.all(this.roots.map(rootMapper))).flatMap((files) => files);
	}
	createCoverageMap() {
		throw new Error("BaseReporter's createCoverageMap was not overwritten");
	}
	async generateReports(_, __) {
		throw new Error("BaseReporter's generateReports was not overwritten");
	}
	async parseConfigModule(_) {
		throw new Error("BaseReporter's parseConfigModule was not overwritten");
	}
	resolveOptions() {
		return this.options;
	}
	async clean(clean = true) {
		if (clean && existsSync(this.options.reportsDirectory)) await promises.rm(this.options.reportsDirectory, {
			recursive: true,
			force: true,
			maxRetries: 10
		});
		if (existsSync(this.coverageFilesDirectory)) await promises.rm(this.coverageFilesDirectory, {
			recursive: true,
			force: true,
			maxRetries: 10
		});
		await promises.mkdir(this.coverageFilesDirectory, { recursive: true });
		this.coverageFiles = /* @__PURE__ */ new Map();
		this.pendingPromises = [];
	}
	onAfterSuiteRun({ coverage, environment, projectName, testFiles }) {
		if (!coverage) return;
		let entry = this.coverageFiles.get(projectName || DEFAULT_PROJECT);
		if (!entry) {
			entry = {};
			this.coverageFiles.set(projectName || DEFAULT_PROJECT, entry);
		}
		const testFilenames = testFiles.join();
		const filename = resolve(this.coverageFilesDirectory, `coverage-${uniqueId++}.json`);
		entry[environment] ??= {};
		// If there's a result from previous run, overwrite it
		entry[environment][testFilenames] = filename;
		const promise = promises.writeFile(filename, JSON.stringify(coverage), "utf-8");
		this.pendingPromises.push(promise);
	}
	async readCoverageFiles({ onFileRead, onFinished, onDebug }) {
		let index = 0;
		const total = this.pendingPromises.length;
		await Promise.all(this.pendingPromises);
		this.pendingPromises = [];
		for (const [projectName, coveragePerProject] of this.coverageFiles.entries()) for (const [environment, coverageByTestfiles] of Object.entries(coveragePerProject)) {
			const filenames = Object.values(coverageByTestfiles);
			const project = this.ctx.getProjectByName(projectName);
			for (const chunk of this.toSlices(filenames, this.options.processingConcurrency)) {
				if (onDebug.enabled) {
					index += chunk.length;
					onDebug(`Reading coverage results ${index}/${total}`);
				}
				await Promise.all(chunk.map(async (filename) => {
					const contents = await promises.readFile(filename, "utf-8");
					onFileRead(JSON.parse(contents));
				}));
			}
			await onFinished(project, environment);
		}
	}
	async cleanAfterRun() {
		this.coverageFiles = /* @__PURE__ */ new Map();
		await promises.rm(this.coverageFilesDirectory, { recursive: true });
		// Remove empty reports directory, e.g. when only text-reporter is used
		if (readdirSync(this.options.reportsDirectory).length === 0) await promises.rm(this.options.reportsDirectory, { recursive: true });
	}
	async onTestFailure() {
		if (!this.options.reportOnFailure) await this.cleanAfterRun();
	}
	async reportCoverage(coverageMap, { allTestsRun }) {
		await this.generateReports(coverageMap || this.createCoverageMap(), allTestsRun);
		if (!(!this.options.cleanOnRerun && this.ctx.config.watch)) await this.cleanAfterRun();
	}
	async reportThresholds(coverageMap, allTestsRun) {
		const resolvedThresholds = this.resolveThresholds(coverageMap);
		this.checkThresholds(resolvedThresholds);
		if (this.options.thresholds?.autoUpdate && allTestsRun) {
			if (!this.ctx.vite.config.configFile) throw new Error("Missing configurationFile. The \"coverage.thresholds.autoUpdate\" can only be enabled when configuration file is used.");
			const configFilePath = this.ctx.vite.config.configFile;
			const configModule = await this.parseConfigModule(configFilePath);
			await this.updateThresholds({
				thresholds: resolvedThresholds,
				configurationFile: configModule,
				onUpdate: () => writeFileSync(configFilePath, configModule.generate().code, "utf-8")
			});
		}
	}
	/**
	* Constructs collected coverage and users' threshold options into separate sets
	* where each threshold set holds their own coverage maps. Threshold set is either
	* for specific files defined by glob pattern or global for all other files.
	*/
	resolveThresholds(coverageMap) {
		const resolvedThresholds = [];
		const files = coverageMap.files();
		const globalCoverageMap = this.createCoverageMap();
		for (const key of Object.keys(this.options.thresholds)) {
			if (key === "perFile" || key === "autoUpdate" || key === "100" || THRESHOLD_KEYS.includes(key)) continue;
			const glob = key;
			const globThresholds = resolveGlobThresholds(this.options.thresholds[glob]);
			const globCoverageMap = this.createCoverageMap();
			const matcher = pm(glob);
			const matchingFiles = files.filter((file) => matcher(relative(this.ctx.config.root, file)));
			for (const file of matchingFiles) {
				const fileCoverage = coverageMap.fileCoverageFor(file);
				globCoverageMap.addFileCoverage(fileCoverage);
			}
			resolvedThresholds.push({
				name: glob,
				coverageMap: globCoverageMap,
				thresholds: globThresholds
			});
		}
		// Global threshold is for all files, even if they are included by glob patterns
		for (const file of files) {
			const fileCoverage = coverageMap.fileCoverageFor(file);
			globalCoverageMap.addFileCoverage(fileCoverage);
		}
		resolvedThresholds.unshift({
			name: GLOBAL_THRESHOLDS_KEY,
			coverageMap: globalCoverageMap,
			thresholds: {
				branches: this.options.thresholds?.branches,
				functions: this.options.thresholds?.functions,
				lines: this.options.thresholds?.lines,
				statements: this.options.thresholds?.statements
			}
		});
		return resolvedThresholds;
	}
	/**
	* Check collected coverage against configured thresholds. Sets exit code to 1 when thresholds not reached.
	*/
	checkThresholds(allThresholds) {
		for (const { coverageMap, thresholds, name } of allThresholds) {
			if (thresholds.branches === void 0 && thresholds.functions === void 0 && thresholds.lines === void 0 && thresholds.statements === void 0) continue;
			// Construct list of coverage summaries where thresholds are compared against
			const summaries = this.options.thresholds?.perFile ? coverageMap.files().map((file) => ({
				file,
				summary: coverageMap.fileCoverageFor(file).toSummary()
			})) : [{
				file: null,
				summary: coverageMap.getCoverageSummary()
			}];
			// Check thresholds of each summary
			for (const { summary, file } of summaries) for (const thresholdKey of THRESHOLD_KEYS) {
				const threshold = thresholds[thresholdKey];
				if (threshold === void 0) continue;
				/**
				* Positive thresholds are treated as minimum coverage percentages (X means: X% of lines must be covered),
				* while negative thresholds are treated as maximum uncovered counts (-X means: X lines may be uncovered).
				*/
				if (threshold >= 0) {
					const coverage = summary.data[thresholdKey].pct;
					if (coverage < threshold) {
						process.exitCode = 1;
						/**
						* Generate error message based on perFile flag:
						* - ERROR: Coverage for statements (33.33%) does not meet threshold (85%) for src/math.ts
						* - ERROR: Coverage for statements (50%) does not meet global threshold (85%)
						*/
						let errorMessage = `ERROR: Coverage for ${thresholdKey} (${coverage}%) does not meet ${name === GLOBAL_THRESHOLDS_KEY ? name : `"${name}"`} threshold (${threshold}%)`;
						if (this.options.thresholds?.perFile && file) errorMessage += ` for ${relative("./", file).replace(/\\/g, "/")}`;
						this.ctx.logger.error(errorMessage);
					}
				} else {
					const uncovered = summary.data[thresholdKey].total - summary.data[thresholdKey].covered;
					const absoluteThreshold = threshold * -1;
					if (uncovered > absoluteThreshold) {
						process.exitCode = 1;
						/**
						* Generate error message based on perFile flag:
						* - ERROR: Uncovered statements (33) exceed threshold (30) for src/math.ts
						* - ERROR: Uncovered statements (33) exceed global threshold (30)
						*/
						let errorMessage = `ERROR: Uncovered ${thresholdKey} (${uncovered}) exceed ${name === GLOBAL_THRESHOLDS_KEY ? name : `"${name}"`} threshold (${absoluteThreshold})`;
						if (this.options.thresholds?.perFile && file) errorMessage += ` for ${relative("./", file).replace(/\\/g, "/")}`;
						this.ctx.logger.error(errorMessage);
					}
				}
			}
		}
	}
	/**
	* Check if current coverage is above configured thresholds and bump the thresholds if needed
	*/
	async updateThresholds({ thresholds: allThresholds, onUpdate, configurationFile }) {
		let updatedThresholds = false;
		const config = resolveConfig(configurationFile);
		assertConfigurationModule(config);
		for (const { coverageMap, thresholds, name } of allThresholds) {
			const summaries = this.options.thresholds?.perFile ? coverageMap.files().map((file) => coverageMap.fileCoverageFor(file).toSummary()) : [coverageMap.getCoverageSummary()];
			const thresholdsToUpdate = [];
			for (const key of THRESHOLD_KEYS) {
				const threshold = thresholds[key] ?? 100;
				/**
				* Positive thresholds are treated as minimum coverage percentages (X means: X% of lines must be covered),
				* while negative thresholds are treated as maximum uncovered counts (-X means: X lines may be uncovered).
				*/
				if (threshold >= 0) {
					const actual = Math.min(...summaries.map((summary) => summary[key].pct));
					if (actual > threshold) thresholdsToUpdate.push([key, actual]);
				} else {
					const absoluteThreshold = threshold * -1;
					const actual = Math.max(...summaries.map((summary) => summary[key].total - summary[key].covered));
					if (actual < absoluteThreshold) {
						// If everything was covered, set new threshold to 100% (since a threshold of 0 would be considered as 0%)
						const updatedThreshold = actual === 0 ? 100 : actual * -1;
						thresholdsToUpdate.push([key, updatedThreshold]);
					}
				}
			}
			if (thresholdsToUpdate.length === 0) continue;
			updatedThresholds = true;
			const thresholdFormatter = typeof this.options.thresholds?.autoUpdate === "function" ? this.options.thresholds?.autoUpdate : (value) => value;
			for (const [threshold, newValue] of thresholdsToUpdate) {
				const formattedValue = thresholdFormatter(newValue);
				if (name === GLOBAL_THRESHOLDS_KEY) config.test.coverage.thresholds[threshold] = formattedValue;
				else {
					const glob = config.test.coverage.thresholds[name];
					glob[threshold] = formattedValue;
				}
			}
		}
		if (updatedThresholds) {
			this.ctx.logger.log("Updating thresholds to configuration file. You may want to push with updated coverage thresholds.");
			onUpdate();
		}
	}
	async mergeReports(coverageMaps) {
		const coverageMap = this.createCoverageMap();
		for (const coverage of coverageMaps) coverageMap.merge(coverage);
		await this.generateReports(coverageMap, true);
	}
	hasTerminalReporter(reporters) {
		return reporters.some(([reporter]) => reporter === "text" || reporter === "text-summary" || reporter === "text-lcov" || reporter === "teamcity");
	}
	toSlices(array, size) {
		return array.reduce((chunks, item) => {
			const index = Math.max(0, chunks.length - 1);
			const lastChunk = chunks[index] || [];
			chunks[index] = lastChunk;
			if (lastChunk.length >= size) chunks.push([item]);
			else lastChunk.push(item);
			return chunks;
		}, []);
	}
	createUncoveredFileTransformer(ctx) {
		const servers = [...ctx.projects.map((project) => ({
			root: project.config.root,
			isBrowserEnabled: project.isBrowserEnabled(),
			vite: project.vite
		})), (
		// Check core last as it will match all files anyway
		{
			root: ctx.config.root,
			vite: ctx.vite,
			isBrowserEnabled: ctx.getRootProject().isBrowserEnabled()
		})];
		return async function transformFile(filename) {
			let lastError;
			for (const { root, vite, isBrowserEnabled } of servers) {
				// On Windows root doesn't start with "/" while filenames do
				if (!filename.startsWith(root) && !filename.startsWith(`/${root}`)) continue;
				if (isBrowserEnabled) {
					const result = await vite.environments.client.transformRequest(filename).catch(() => null);
					if (result) return result;
				}
				try {
					return await vite.environments.ssr.transformRequest(filename);
				} catch (error) {
					lastError = error;
				}
			}
			// All vite-node servers failed to transform the file
			throw lastError;
		};
	}
}
/**
* Narrow down `unknown` glob thresholds to resolved ones
*/
function resolveGlobThresholds(thresholds) {
	if (!thresholds || typeof thresholds !== "object") return {};
	if (100 in thresholds && thresholds[100] === true) return {
		lines: 100,
		branches: 100,
		functions: 100,
		statements: 100
	};
	return {
		lines: "lines" in thresholds && typeof thresholds.lines === "number" ? thresholds.lines : void 0,
		branches: "branches" in thresholds && typeof thresholds.branches === "number" ? thresholds.branches : void 0,
		functions: "functions" in thresholds && typeof thresholds.functions === "number" ? thresholds.functions : void 0,
		statements: "statements" in thresholds && typeof thresholds.statements === "number" ? thresholds.statements : void 0
	};
}
function assertConfigurationModule(config) {
	try {
		// @ts-expect-error -- Intentional unsafe null pointer check as wrapped in try-catch
		if (typeof config.test.coverage.thresholds !== "object") throw new TypeError("Expected config.test.coverage.thresholds to be an object");
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		throw new Error(`Unable to parse thresholds from configuration file: ${message}`);
	}
}
function resolveConfig(configModule) {
	const mod = configModule.exports.default;
	try {
		// Check for "export default { test: {...} }"
		if (mod.$type === "object") return mod;
		// "export default defineConfig(...)"
		let config = resolveDefineConfig(mod);
		if (config) return config;
		// "export default mergeConfig(..., defineConfig(...))"
		if (mod.$type === "function-call" && mod.$callee === "mergeConfig") {
			config = resolveMergeConfig(mod);
			if (config) return config;
		}
	} catch (error) {
		// Reduce magicast's verbose errors to readable ones
		throw new Error(error instanceof Error ? error.message : String(error));
	}
	throw new Error("Failed to update coverage thresholds. Configuration file is too complex.");
}
function resolveDefineConfig(mod) {
	if (mod.$type === "function-call" && mod.$callee === "defineConfig") {
		// "export default defineConfig({ test: {...} })"
		if (mod.$args[0].$type === "object") return mod.$args[0];
		if (mod.$args[0].$type === "arrow-function-expression") {
			if (mod.$args[0].$body.$type === "object")
 // "export default defineConfig(() => ({ test: {...} }))"
			return mod.$args[0].$body;
			// "export default defineConfig(() => mergeConfig({...}, ...))"
			const config = resolveMergeConfig(mod.$args[0].$body);
			if (config) return config;
		}
	}
}
function resolveMergeConfig(mod) {
	if (mod.$type === "function-call" && mod.$callee === "mergeConfig") for (const arg of mod.$args) {
		const config = resolveDefineConfig(arg);
		if (config) return config;
	}
}

export { BaseCoverageProvider as B, RandomSequencer as R, resolveApiServerConfig as a, BaseSequencer as b, isBrowserEnabled as c, resolveModule as d, getCoverageProvider as g, hash as h, isPackageExists as i, resolveConfig$1 as r };
