import fs, { statSync, realpathSync, promises as promises$1, mkdirSync, existsSync, readdirSync, writeFileSync } from 'node:fs';
import { g as getDefaultExportFromCjs } from './_commonjsHelpers.BFTU3MAI.js';
import require$$0 from 'util';
import require$$0$1 from 'path';
import { relative, resolve, dirname, isAbsolute, join as join$1, normalize } from 'pathe';
import c from 'tinyrainbow';
import { c as configDefaults, e as benchmarkConfigDefaults, a as coverageConfigDefaults } from './defaults.DSxsTG0h.js';
import crypto from 'node:crypto';
import { slash, createDefer, shuffle, toArray } from '@vitest/utils';
import { builtinModules, createRequire } from 'node:module';
import p, { win32, dirname as dirname$1, join, resolve as resolve$1 } from 'node:path';
import process$1 from 'node:process';
import fsPromises, { writeFile, rename, stat, unlink } from 'node:fs/promises';
import { fileURLToPath as fileURLToPath$1, pathToFileURL as pathToFileURL$1, URL as URL$1 } from 'node:url';
import assert from 'node:assert';
import v8 from 'node:v8';
import { format, inspect } from 'node:util';
import { e as extraInlineDeps, d as defaultBrowserPort, b as defaultInspectPort, a as defaultPort } from './constants.BZZyIeIE.js';
import { a as isWindows } from './env.Dq0hM4Xv.js';
import * as nodeos from 'node:os';
import nodeos__default from 'node:os';
import { isatty } from 'node:tty';
import { version } from 'vite';
import EventEmitter from 'node:events';
import { c as createBirpc } from './index.CJ0plNrh.js';
import Tinypool$1, { Tinypool } from 'tinypool';
import { w as wrapSerializableConfig, a as Typechecker } from './typechecker.DYQbn8uK.js';
import { MessageChannel } from 'node:worker_threads';
import { hasFailed } from '@vitest/runner/utils';
import { rootDir } from '../path.js';
import { slash as slash$1 } from 'vite-node/utils';
import { isCI, provider } from 'std-env';
import { r as resolveCoverageProviderModule } from './coverage.0iPg4Wrz.js';

function groupBy(collection, iteratee) {
	return collection.reduce((acc, item) => {
		const key = iteratee(item);
		acc[key] ||= [];
		acc[key].push(item);
		return acc;
	}, {});
}
function stdout() {
	return console._stdout || process.stdout;
}
function escapeRegExp(s) {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function wildcardPatternToRegExp(pattern) {
	const negated = pattern.startsWith("!");
	if (negated) {
		pattern = pattern.slice(1);
	}
	let regexp = `${pattern.split("*").map(escapeRegExp).join(".*")}$`;
	if (negated) {
		regexp = `(?!${regexp})`;
	}
	return new RegExp(`^${regexp}`, "i");
}

const hash = crypto.hash ?? ((algorithm, data, outputEncoding) => crypto.createHash(algorithm).update(data).digest(outputEncoding));

class FilesStatsCache {
	cache = new Map();
	getStats(key) {
		return this.cache.get(key);
	}
	async populateStats(root, specs) {
		const promises = specs.map((spec) => {
			const key = `${spec[0].name}:${relative(root, spec.moduleId)}`;
			return this.updateStats(spec.moduleId, key);
		});
		await Promise.all(promises);
	}
	async updateStats(fsPath, key) {
		if (!fs.existsSync(fsPath)) {
			return;
		}
		const stats = await fs.promises.stat(fsPath);
		this.cache.set(key, { size: stats.size });
	}
	removeStats(fsPath) {
		this.cache.forEach((_, key) => {
			if (key.endsWith(fsPath)) {
				this.cache.delete(key);
			}
		});
	}
}

class ResultsCache {
	cache = new Map();
	workspacesKeyMap = new Map();
	cachePath = null;
	version;
	root = "/";
	constructor(version) {
		this.version = version;
	}
	getCachePath() {
		return this.cachePath;
	}
	setConfig(root, config) {
		this.root = root;
		if (config) {
			this.cachePath = resolve(config.dir, "results.json");
		}
	}
	getResults(key) {
		return this.cache.get(key);
	}
	async readFromCache() {
		if (!this.cachePath) {
			return;
		}
		if (!fs.existsSync(this.cachePath)) {
			return;
		}
		const resultsCache = await fs.promises.readFile(this.cachePath, "utf8");
		const { results, version } = JSON.parse(resultsCache || "[]");
		if (Number(version.split(".")[1]) >= 30) {
			this.cache = new Map(results);
			this.version = version;
			results.forEach(([spec]) => {
				const [projectName, relativePath] = spec.split(":");
				const keyMap = this.workspacesKeyMap.get(relativePath) || [];
				keyMap.push(projectName);
				this.workspacesKeyMap.set(relativePath, keyMap);
			});
		}
	}
	updateResults(files) {
		files.forEach((file) => {
			const result = file.result;
			if (!result) {
				return;
			}
			const duration = result.duration || 0;
			const relativePath = relative(this.root, file.filepath);
			this.cache.set(`${file.projectName || ""}:${relativePath}`, {
				duration: duration >= 0 ? duration : 0,
				failed: result.state === "fail"
			});
		});
	}
	removeFromCache(filepath) {
		this.cache.forEach((_, key) => {
			if (key.endsWith(filepath)) {
				this.cache.delete(key);
			}
		});
	}
	async writeToCache() {
		if (!this.cachePath) {
			return;
		}
		const results = Array.from(this.cache.entries());
		const cacheDirname = dirname(this.cachePath);
		if (!fs.existsSync(cacheDirname)) {
			await fs.promises.mkdir(cacheDirname, { recursive: true });
		}
		const cache = JSON.stringify({
			version: this.version,
			results
		});
		await fs.promises.writeFile(this.cachePath, cache);
	}
}

class VitestCache {
	results;
	stats = new FilesStatsCache();
	constructor(version) {
		this.results = new ResultsCache(version);
	}
	getFileTestResults(key) {
		return this.results.getResults(key);
	}
	getFileStats(key) {
		return this.stats.getStats(key);
	}
	static resolveCacheDir(root, dir, projectName) {
		const baseDir = slash(dir || "node_modules/.vite/vitest");
		return projectName ? resolve(root, baseDir, hash("md5", projectName, "hex")) : resolve(root, baseDir);
	}
}

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
    string = fs.readFileSync(p.toNamespacedPath(jsonPath), 'utf8');
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
  } else if (p.resolve(packagePath, main) !== urlPath) {
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
    resolved = pathToFileURL$1(real + (filePath.endsWith(p.sep) ? '/' : ''));
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
function isConditionalExportsMainSugar(exports, packageJsonUrl, base) {
  if (typeof exports === 'string' || Array.isArray(exports)) return true
  if (typeof exports !== 'object' || exports === null) return false

  const keys = Object.getOwnPropertyNames(exports);
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
  let exports = packageConfig.exports;

  if (isConditionalExportsMainSugar(exports, packageJsonUrl, base)) {
    exports = {'.': exports};
  }

  if (
    own.call(exports, packageSubpath) &&
    !packageSubpath.includes('*') &&
    !packageSubpath.endsWith('/')
  ) {
    // @ts-expect-error: indexable.
    const target = exports[packageSubpath];
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
  const keys = Object.getOwnPropertyNames(exports);
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
    const target = /** @type {unknown} */ (exports[bestMatch]);
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
  if (/(node|data|http|https|file):/.test(id)) {
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
  if (/(node|data|http|https):/.test(id)) {
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
function iterateSync(generator) {
  let current = generator.next();
  while (!current.done) {
    try {
      current = generator.next(unwrapYield(current.value));
    } catch (err) {
      current = generator.throw(err);
    }
  }
  return unwrapYield(current.value);
}
async function iterateAsync(generator) {
  let current = generator.next();
  while (!current.done) {
    try {
      current = generator.next(await unwrapYield(current.value, true));
    } catch (err) {
      current = generator.throw(err);
    }
  }
  return current.value;
}
function fromGeneratorFn(generatorFn) {
  return fromObject({
    name: generatorFn.name,
    async(...args) {
      return iterateAsync(generatorFn.apply(this, args));
    },
    sync(...args) {
      return iterateSync(generatorFn.apply(this, args));
    }
  });
}
function quansync$1(options) {
  if (isThenable(options))
    return fromPromise(options);
  if (typeof options === "function")
    return fromGeneratorFn(options);
  else
    return fromObject(options);
}

const quansync = quansync$1;

const toPath = urlOrPath => urlOrPath instanceof URL ? fileURLToPath$1(urlOrPath) : urlOrPath;

async function findUp$1(name, {
	cwd = process$1.cwd(),
	type = 'file',
	stopAt,
} = {}) {
	let directory = p.resolve(toPath(cwd) ?? '');
	const {root} = p.parse(directory);
	stopAt = p.resolve(directory, toPath(stopAt ?? root));
	const isAbsoluteName = p.isAbsolute(name);

	while (directory) {
		const filePath = isAbsoluteName ? name : p.join(directory, name);
		try {
			const stats = await fsPromises.stat(filePath); // eslint-disable-line no-await-in-loop
			if ((type === 'file' && stats.isFile()) || (type === 'directory' && stats.isDirectory())) {
				return filePath;
			}
		} catch {}

		if (directory === stopAt || directory === root) {
			break;
		}

		directory = p.dirname(directory);
	}
}

function findUpSync(name, {
	cwd = process$1.cwd(),
	type = 'file',
	stopAt,
} = {}) {
	let directory = p.resolve(toPath(cwd) ?? '');
	const {root} = p.parse(directory);
	stopAt = p.resolve(directory, toPath(stopAt) ?? root);
	const isAbsoluteName = p.isAbsolute(name);

	while (directory) {
		const filePath = isAbsoluteName ? name : p.join(directory, name);

		try {
			const stats = fs.statSync(filePath, {throwIfNoEntry: false});
			if ((type === 'file' && stats?.isFile()) || (type === 'directory' && stats?.isDirectory())) {
				return filePath;
			}
		} catch {}

		if (directory === stopAt || directory === root) {
			break;
		}

		directory = p.dirname(directory);
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
    rootPath: dirname$1(packageJsonPath),
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
    const newDir = dirname$1(dir);
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

var utils$1 = {};

var hasRequiredUtils$1;

function requireUtils$1 () {
	if (hasRequiredUtils$1) return utils$1;
	hasRequiredUtils$1 = 1;
	(function (exports) {

		exports.isInteger = num => {
		  if (typeof num === 'number') {
		    return Number.isInteger(num);
		  }
		  if (typeof num === 'string' && num.trim() !== '') {
		    return Number.isInteger(Number(num));
		  }
		  return false;
		};

		/**
		 * Find a node of the given type
		 */

		exports.find = (node, type) => node.nodes.find(node => node.type === type);

		/**
		 * Find a node of the given type
		 */

		exports.exceedsLimit = (min, max, step = 1, limit) => {
		  if (limit === false) return false;
		  if (!exports.isInteger(min) || !exports.isInteger(max)) return false;
		  return ((Number(max) - Number(min)) / Number(step)) >= limit;
		};

		/**
		 * Escape the given node with '\\' before node.value
		 */

		exports.escapeNode = (block, n = 0, type) => {
		  const node = block.nodes[n];
		  if (!node) return;

		  if ((type && node.type === type) || node.type === 'open' || node.type === 'close') {
		    if (node.escaped !== true) {
		      node.value = '\\' + node.value;
		      node.escaped = true;
		    }
		  }
		};

		/**
		 * Returns true if the given brace node should be enclosed in literal braces
		 */

		exports.encloseBrace = node => {
		  if (node.type !== 'brace') return false;
		  if ((node.commas >> 0 + node.ranges >> 0) === 0) {
		    node.invalid = true;
		    return true;
		  }
		  return false;
		};

		/**
		 * Returns true if a brace node is invalid.
		 */

		exports.isInvalidBrace = block => {
		  if (block.type !== 'brace') return false;
		  if (block.invalid === true || block.dollar) return true;
		  if ((block.commas >> 0 + block.ranges >> 0) === 0) {
		    block.invalid = true;
		    return true;
		  }
		  if (block.open !== true || block.close !== true) {
		    block.invalid = true;
		    return true;
		  }
		  return false;
		};

		/**
		 * Returns true if a node is an open or close node
		 */

		exports.isOpenOrClose = node => {
		  if (node.type === 'open' || node.type === 'close') {
		    return true;
		  }
		  return node.open === true || node.close === true;
		};

		/**
		 * Reduce an array of text nodes.
		 */

		exports.reduce = nodes => nodes.reduce((acc, node) => {
		  if (node.type === 'text') acc.push(node.value);
		  if (node.type === 'range') node.type = 'text';
		  return acc;
		}, []);

		/**
		 * Flatten an array
		 */

		exports.flatten = (...args) => {
		  const result = [];

		  const flat = arr => {
		    for (let i = 0; i < arr.length; i++) {
		      const ele = arr[i];

		      if (Array.isArray(ele)) {
		        flat(ele);
		        continue;
		      }

		      if (ele !== undefined) {
		        result.push(ele);
		      }
		    }
		    return result;
		  };

		  flat(args);
		  return result;
		}; 
	} (utils$1));
	return utils$1;
}

var stringify;
var hasRequiredStringify;

function requireStringify () {
	if (hasRequiredStringify) return stringify;
	hasRequiredStringify = 1;

	const utils = requireUtils$1();

	stringify = (ast, options = {}) => {
	  const stringify = (node, parent = {}) => {
	    const invalidBlock = options.escapeInvalid && utils.isInvalidBrace(parent);
	    const invalidNode = node.invalid === true && options.escapeInvalid === true;
	    let output = '';

	    if (node.value) {
	      if ((invalidBlock || invalidNode) && utils.isOpenOrClose(node)) {
	        return '\\' + node.value;
	      }
	      return node.value;
	    }

	    if (node.value) {
	      return node.value;
	    }

	    if (node.nodes) {
	      for (const child of node.nodes) {
	        output += stringify(child);
	      }
	    }
	    return output;
	  };

	  return stringify(ast);
	};
	return stringify;
}

/*!
 * is-number <https://github.com/jonschlinkert/is-number>
 *
 * Copyright (c) 2014-present, Jon Schlinkert.
 * Released under the MIT License.
 */

var isNumber;
var hasRequiredIsNumber;

function requireIsNumber () {
	if (hasRequiredIsNumber) return isNumber;
	hasRequiredIsNumber = 1;

	isNumber = function(num) {
	  if (typeof num === 'number') {
	    return num - num === 0;
	  }
	  if (typeof num === 'string' && num.trim() !== '') {
	    return Number.isFinite ? Number.isFinite(+num) : isFinite(+num);
	  }
	  return false;
	};
	return isNumber;
}

/*!
 * to-regex-range <https://github.com/micromatch/to-regex-range>
 *
 * Copyright (c) 2015-present, Jon Schlinkert.
 * Released under the MIT License.
 */

var toRegexRange_1;
var hasRequiredToRegexRange;

function requireToRegexRange () {
	if (hasRequiredToRegexRange) return toRegexRange_1;
	hasRequiredToRegexRange = 1;

	const isNumber = requireIsNumber();

	const toRegexRange = (min, max, options) => {
	  if (isNumber(min) === false) {
	    throw new TypeError('toRegexRange: expected the first argument to be a number');
	  }

	  if (max === void 0 || min === max) {
	    return String(min);
	  }

	  if (isNumber(max) === false) {
	    throw new TypeError('toRegexRange: expected the second argument to be a number.');
	  }

	  let opts = { relaxZeros: true, ...options };
	  if (typeof opts.strictZeros === 'boolean') {
	    opts.relaxZeros = opts.strictZeros === false;
	  }

	  let relax = String(opts.relaxZeros);
	  let shorthand = String(opts.shorthand);
	  let capture = String(opts.capture);
	  let wrap = String(opts.wrap);
	  let cacheKey = min + ':' + max + '=' + relax + shorthand + capture + wrap;

	  if (toRegexRange.cache.hasOwnProperty(cacheKey)) {
	    return toRegexRange.cache[cacheKey].result;
	  }

	  let a = Math.min(min, max);
	  let b = Math.max(min, max);

	  if (Math.abs(a - b) === 1) {
	    let result = min + '|' + max;
	    if (opts.capture) {
	      return `(${result})`;
	    }
	    if (opts.wrap === false) {
	      return result;
	    }
	    return `(?:${result})`;
	  }

	  let isPadded = hasPadding(min) || hasPadding(max);
	  let state = { min, max, a, b };
	  let positives = [];
	  let negatives = [];

	  if (isPadded) {
	    state.isPadded = isPadded;
	    state.maxLen = String(state.max).length;
	  }

	  if (a < 0) {
	    let newMin = b < 0 ? Math.abs(b) : 1;
	    negatives = splitToPatterns(newMin, Math.abs(a), state, opts);
	    a = state.a = 0;
	  }

	  if (b >= 0) {
	    positives = splitToPatterns(a, b, state, opts);
	  }

	  state.negatives = negatives;
	  state.positives = positives;
	  state.result = collatePatterns(negatives, positives);

	  if (opts.capture === true) {
	    state.result = `(${state.result})`;
	  } else if (opts.wrap !== false && (positives.length + negatives.length) > 1) {
	    state.result = `(?:${state.result})`;
	  }

	  toRegexRange.cache[cacheKey] = state;
	  return state.result;
	};

	function collatePatterns(neg, pos, options) {
	  let onlyNegative = filterPatterns(neg, pos, '-', false) || [];
	  let onlyPositive = filterPatterns(pos, neg, '', false) || [];
	  let intersected = filterPatterns(neg, pos, '-?', true) || [];
	  let subpatterns = onlyNegative.concat(intersected).concat(onlyPositive);
	  return subpatterns.join('|');
	}

	function splitToRanges(min, max) {
	  let nines = 1;
	  let zeros = 1;

	  let stop = countNines(min, nines);
	  let stops = new Set([max]);

	  while (min <= stop && stop <= max) {
	    stops.add(stop);
	    nines += 1;
	    stop = countNines(min, nines);
	  }

	  stop = countZeros(max + 1, zeros) - 1;

	  while (min < stop && stop <= max) {
	    stops.add(stop);
	    zeros += 1;
	    stop = countZeros(max + 1, zeros) - 1;
	  }

	  stops = [...stops];
	  stops.sort(compare);
	  return stops;
	}

	/**
	 * Convert a range to a regex pattern
	 * @param {Number} `start`
	 * @param {Number} `stop`
	 * @return {String}
	 */

	function rangeToPattern(start, stop, options) {
	  if (start === stop) {
	    return { pattern: start, count: [], digits: 0 };
	  }

	  let zipped = zip(start, stop);
	  let digits = zipped.length;
	  let pattern = '';
	  let count = 0;

	  for (let i = 0; i < digits; i++) {
	    let [startDigit, stopDigit] = zipped[i];

	    if (startDigit === stopDigit) {
	      pattern += startDigit;

	    } else if (startDigit !== '0' || stopDigit !== '9') {
	      pattern += toCharacterClass(startDigit, stopDigit);

	    } else {
	      count++;
	    }
	  }

	  if (count) {
	    pattern += options.shorthand === true ? '\\d' : '[0-9]';
	  }

	  return { pattern, count: [count], digits };
	}

	function splitToPatterns(min, max, tok, options) {
	  let ranges = splitToRanges(min, max);
	  let tokens = [];
	  let start = min;
	  let prev;

	  for (let i = 0; i < ranges.length; i++) {
	    let max = ranges[i];
	    let obj = rangeToPattern(String(start), String(max), options);
	    let zeros = '';

	    if (!tok.isPadded && prev && prev.pattern === obj.pattern) {
	      if (prev.count.length > 1) {
	        prev.count.pop();
	      }

	      prev.count.push(obj.count[0]);
	      prev.string = prev.pattern + toQuantifier(prev.count);
	      start = max + 1;
	      continue;
	    }

	    if (tok.isPadded) {
	      zeros = padZeros(max, tok, options);
	    }

	    obj.string = zeros + obj.pattern + toQuantifier(obj.count);
	    tokens.push(obj);
	    start = max + 1;
	    prev = obj;
	  }

	  return tokens;
	}

	function filterPatterns(arr, comparison, prefix, intersection, options) {
	  let result = [];

	  for (let ele of arr) {
	    let { string } = ele;

	    // only push if _both_ are negative...
	    if (!intersection && !contains(comparison, 'string', string)) {
	      result.push(prefix + string);
	    }

	    // or _both_ are positive
	    if (intersection && contains(comparison, 'string', string)) {
	      result.push(prefix + string);
	    }
	  }
	  return result;
	}

	/**
	 * Zip strings
	 */

	function zip(a, b) {
	  let arr = [];
	  for (let i = 0; i < a.length; i++) arr.push([a[i], b[i]]);
	  return arr;
	}

	function compare(a, b) {
	  return a > b ? 1 : b > a ? -1 : 0;
	}

	function contains(arr, key, val) {
	  return arr.some(ele => ele[key] === val);
	}

	function countNines(min, len) {
	  return Number(String(min).slice(0, -len) + '9'.repeat(len));
	}

	function countZeros(integer, zeros) {
	  return integer - (integer % Math.pow(10, zeros));
	}

	function toQuantifier(digits) {
	  let [start = 0, stop = ''] = digits;
	  if (stop || start > 1) {
	    return `{${start + (stop ? ',' + stop : '')}}`;
	  }
	  return '';
	}

	function toCharacterClass(a, b, options) {
	  return `[${a}${(b - a === 1) ? '' : '-'}${b}]`;
	}

	function hasPadding(str) {
	  return /^-?(0+)\d/.test(str);
	}

	function padZeros(value, tok, options) {
	  if (!tok.isPadded) {
	    return value;
	  }

	  let diff = Math.abs(tok.maxLen - String(value).length);
	  let relax = options.relaxZeros !== false;

	  switch (diff) {
	    case 0:
	      return '';
	    case 1:
	      return relax ? '0?' : '0';
	    case 2:
	      return relax ? '0{0,2}' : '00';
	    default: {
	      return relax ? `0{0,${diff}}` : `0{${diff}}`;
	    }
	  }
	}

	/**
	 * Cache
	 */

	toRegexRange.cache = {};
	toRegexRange.clearCache = () => (toRegexRange.cache = {});

	/**
	 * Expose `toRegexRange`
	 */

	toRegexRange_1 = toRegexRange;
	return toRegexRange_1;
}

/*!
 * fill-range <https://github.com/jonschlinkert/fill-range>
 *
 * Copyright (c) 2014-present, Jon Schlinkert.
 * Licensed under the MIT License.
 */

var fillRange;
var hasRequiredFillRange;

function requireFillRange () {
	if (hasRequiredFillRange) return fillRange;
	hasRequiredFillRange = 1;

	const util = require$$0;
	const toRegexRange = requireToRegexRange();

	const isObject = val => val !== null && typeof val === 'object' && !Array.isArray(val);

	const transform = toNumber => {
	  return value => toNumber === true ? Number(value) : String(value);
	};

	const isValidValue = value => {
	  return typeof value === 'number' || (typeof value === 'string' && value !== '');
	};

	const isNumber = num => Number.isInteger(+num);

	const zeros = input => {
	  let value = `${input}`;
	  let index = -1;
	  if (value[0] === '-') value = value.slice(1);
	  if (value === '0') return false;
	  while (value[++index] === '0');
	  return index > 0;
	};

	const stringify = (start, end, options) => {
	  if (typeof start === 'string' || typeof end === 'string') {
	    return true;
	  }
	  return options.stringify === true;
	};

	const pad = (input, maxLength, toNumber) => {
	  if (maxLength > 0) {
	    let dash = input[0] === '-' ? '-' : '';
	    if (dash) input = input.slice(1);
	    input = (dash + input.padStart(dash ? maxLength - 1 : maxLength, '0'));
	  }
	  if (toNumber === false) {
	    return String(input);
	  }
	  return input;
	};

	const toMaxLen = (input, maxLength) => {
	  let negative = input[0] === '-' ? '-' : '';
	  if (negative) {
	    input = input.slice(1);
	    maxLength--;
	  }
	  while (input.length < maxLength) input = '0' + input;
	  return negative ? ('-' + input) : input;
	};

	const toSequence = (parts, options, maxLen) => {
	  parts.negatives.sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
	  parts.positives.sort((a, b) => a < b ? -1 : a > b ? 1 : 0);

	  let prefix = options.capture ? '' : '?:';
	  let positives = '';
	  let negatives = '';
	  let result;

	  if (parts.positives.length) {
	    positives = parts.positives.map(v => toMaxLen(String(v), maxLen)).join('|');
	  }

	  if (parts.negatives.length) {
	    negatives = `-(${prefix}${parts.negatives.map(v => toMaxLen(String(v), maxLen)).join('|')})`;
	  }

	  if (positives && negatives) {
	    result = `${positives}|${negatives}`;
	  } else {
	    result = positives || negatives;
	  }

	  if (options.wrap) {
	    return `(${prefix}${result})`;
	  }

	  return result;
	};

	const toRange = (a, b, isNumbers, options) => {
	  if (isNumbers) {
	    return toRegexRange(a, b, { wrap: false, ...options });
	  }

	  let start = String.fromCharCode(a);
	  if (a === b) return start;

	  let stop = String.fromCharCode(b);
	  return `[${start}-${stop}]`;
	};

	const toRegex = (start, end, options) => {
	  if (Array.isArray(start)) {
	    let wrap = options.wrap === true;
	    let prefix = options.capture ? '' : '?:';
	    return wrap ? `(${prefix}${start.join('|')})` : start.join('|');
	  }
	  return toRegexRange(start, end, options);
	};

	const rangeError = (...args) => {
	  return new RangeError('Invalid range arguments: ' + util.inspect(...args));
	};

	const invalidRange = (start, end, options) => {
	  if (options.strictRanges === true) throw rangeError([start, end]);
	  return [];
	};

	const invalidStep = (step, options) => {
	  if (options.strictRanges === true) {
	    throw new TypeError(`Expected step "${step}" to be a number`);
	  }
	  return [];
	};

	const fillNumbers = (start, end, step = 1, options = {}) => {
	  let a = Number(start);
	  let b = Number(end);

	  if (!Number.isInteger(a) || !Number.isInteger(b)) {
	    if (options.strictRanges === true) throw rangeError([start, end]);
	    return [];
	  }

	  // fix negative zero
	  if (a === 0) a = 0;
	  if (b === 0) b = 0;

	  let descending = a > b;
	  let startString = String(start);
	  let endString = String(end);
	  let stepString = String(step);
	  step = Math.max(Math.abs(step), 1);

	  let padded = zeros(startString) || zeros(endString) || zeros(stepString);
	  let maxLen = padded ? Math.max(startString.length, endString.length, stepString.length) : 0;
	  let toNumber = padded === false && stringify(start, end, options) === false;
	  let format = options.transform || transform(toNumber);

	  if (options.toRegex && step === 1) {
	    return toRange(toMaxLen(start, maxLen), toMaxLen(end, maxLen), true, options);
	  }

	  let parts = { negatives: [], positives: [] };
	  let push = num => parts[num < 0 ? 'negatives' : 'positives'].push(Math.abs(num));
	  let range = [];
	  let index = 0;

	  while (descending ? a >= b : a <= b) {
	    if (options.toRegex === true && step > 1) {
	      push(a);
	    } else {
	      range.push(pad(format(a, index), maxLen, toNumber));
	    }
	    a = descending ? a - step : a + step;
	    index++;
	  }

	  if (options.toRegex === true) {
	    return step > 1
	      ? toSequence(parts, options, maxLen)
	      : toRegex(range, null, { wrap: false, ...options });
	  }

	  return range;
	};

	const fillLetters = (start, end, step = 1, options = {}) => {
	  if ((!isNumber(start) && start.length > 1) || (!isNumber(end) && end.length > 1)) {
	    return invalidRange(start, end, options);
	  }

	  let format = options.transform || (val => String.fromCharCode(val));
	  let a = `${start}`.charCodeAt(0);
	  let b = `${end}`.charCodeAt(0);

	  let descending = a > b;
	  let min = Math.min(a, b);
	  let max = Math.max(a, b);

	  if (options.toRegex && step === 1) {
	    return toRange(min, max, false, options);
	  }

	  let range = [];
	  let index = 0;

	  while (descending ? a >= b : a <= b) {
	    range.push(format(a, index));
	    a = descending ? a - step : a + step;
	    index++;
	  }

	  if (options.toRegex === true) {
	    return toRegex(range, null, { wrap: false, options });
	  }

	  return range;
	};

	const fill = (start, end, step, options = {}) => {
	  if (end == null && isValidValue(start)) {
	    return [start];
	  }

	  if (!isValidValue(start) || !isValidValue(end)) {
	    return invalidRange(start, end, options);
	  }

	  if (typeof step === 'function') {
	    return fill(start, end, 1, { transform: step });
	  }

	  if (isObject(step)) {
	    return fill(start, end, 0, step);
	  }

	  let opts = { ...options };
	  if (opts.capture === true) opts.wrap = true;
	  step = step || opts.step || 1;

	  if (!isNumber(step)) {
	    if (step != null && !isObject(step)) return invalidStep(step, opts);
	    return fill(start, end, 1, step);
	  }

	  if (isNumber(start) && isNumber(end)) {
	    return fillNumbers(start, end, step, opts);
	  }

	  return fillLetters(start, end, Math.max(Math.abs(step), 1), opts);
	};

	fillRange = fill;
	return fillRange;
}

var compile_1;
var hasRequiredCompile;

function requireCompile () {
	if (hasRequiredCompile) return compile_1;
	hasRequiredCompile = 1;

	const fill = requireFillRange();
	const utils = requireUtils$1();

	const compile = (ast, options = {}) => {
	  const walk = (node, parent = {}) => {
	    const invalidBlock = utils.isInvalidBrace(parent);
	    const invalidNode = node.invalid === true && options.escapeInvalid === true;
	    const invalid = invalidBlock === true || invalidNode === true;
	    const prefix = options.escapeInvalid === true ? '\\' : '';
	    let output = '';

	    if (node.isOpen === true) {
	      return prefix + node.value;
	    }

	    if (node.isClose === true) {
	      console.log('node.isClose', prefix, node.value);
	      return prefix + node.value;
	    }

	    if (node.type === 'open') {
	      return invalid ? prefix + node.value : '(';
	    }

	    if (node.type === 'close') {
	      return invalid ? prefix + node.value : ')';
	    }

	    if (node.type === 'comma') {
	      return node.prev.type === 'comma' ? '' : invalid ? node.value : '|';
	    }

	    if (node.value) {
	      return node.value;
	    }

	    if (node.nodes && node.ranges > 0) {
	      const args = utils.reduce(node.nodes);
	      const range = fill(...args, { ...options, wrap: false, toRegex: true, strictZeros: true });

	      if (range.length !== 0) {
	        return args.length > 1 && range.length > 1 ? `(${range})` : range;
	      }
	    }

	    if (node.nodes) {
	      for (const child of node.nodes) {
	        output += walk(child, node);
	      }
	    }

	    return output;
	  };

	  return walk(ast);
	};

	compile_1 = compile;
	return compile_1;
}

var expand_1;
var hasRequiredExpand;

function requireExpand () {
	if (hasRequiredExpand) return expand_1;
	hasRequiredExpand = 1;

	const fill = requireFillRange();
	const stringify = requireStringify();
	const utils = requireUtils$1();

	const append = (queue = '', stash = '', enclose = false) => {
	  const result = [];

	  queue = [].concat(queue);
	  stash = [].concat(stash);

	  if (!stash.length) return queue;
	  if (!queue.length) {
	    return enclose ? utils.flatten(stash).map(ele => `{${ele}}`) : stash;
	  }

	  for (const item of queue) {
	    if (Array.isArray(item)) {
	      for (const value of item) {
	        result.push(append(value, stash, enclose));
	      }
	    } else {
	      for (let ele of stash) {
	        if (enclose === true && typeof ele === 'string') ele = `{${ele}}`;
	        result.push(Array.isArray(ele) ? append(item, ele, enclose) : item + ele);
	      }
	    }
	  }
	  return utils.flatten(result);
	};

	const expand = (ast, options = {}) => {
	  const rangeLimit = options.rangeLimit === undefined ? 1000 : options.rangeLimit;

	  const walk = (node, parent = {}) => {
	    node.queue = [];

	    let p = parent;
	    let q = parent.queue;

	    while (p.type !== 'brace' && p.type !== 'root' && p.parent) {
	      p = p.parent;
	      q = p.queue;
	    }

	    if (node.invalid || node.dollar) {
	      q.push(append(q.pop(), stringify(node, options)));
	      return;
	    }

	    if (node.type === 'brace' && node.invalid !== true && node.nodes.length === 2) {
	      q.push(append(q.pop(), ['{}']));
	      return;
	    }

	    if (node.nodes && node.ranges > 0) {
	      const args = utils.reduce(node.nodes);

	      if (utils.exceedsLimit(...args, options.step, rangeLimit)) {
	        throw new RangeError('expanded array length exceeds range limit. Use options.rangeLimit to increase or disable the limit.');
	      }

	      let range = fill(...args, options);
	      if (range.length === 0) {
	        range = stringify(node, options);
	      }

	      q.push(append(q.pop(), range));
	      node.nodes = [];
	      return;
	    }

	    const enclose = utils.encloseBrace(node);
	    let queue = node.queue;
	    let block = node;

	    while (block.type !== 'brace' && block.type !== 'root' && block.parent) {
	      block = block.parent;
	      queue = block.queue;
	    }

	    for (let i = 0; i < node.nodes.length; i++) {
	      const child = node.nodes[i];

	      if (child.type === 'comma' && node.type === 'brace') {
	        if (i === 1) queue.push('');
	        queue.push('');
	        continue;
	      }

	      if (child.type === 'close') {
	        q.push(append(q.pop(), queue, enclose));
	        continue;
	      }

	      if (child.value && child.type !== 'open') {
	        queue.push(append(queue.pop(), child.value));
	        continue;
	      }

	      if (child.nodes) {
	        walk(child, node);
	      }
	    }

	    return queue;
	  };

	  return utils.flatten(walk(ast));
	};

	expand_1 = expand;
	return expand_1;
}

var constants$1;
var hasRequiredConstants$1;

function requireConstants$1 () {
	if (hasRequiredConstants$1) return constants$1;
	hasRequiredConstants$1 = 1;

	constants$1 = {
	  MAX_LENGTH: 10000,

	  // Digits
	  CHAR_0: '0', /* 0 */
	  CHAR_9: '9', /* 9 */

	  // Alphabet chars.
	  CHAR_UPPERCASE_A: 'A', /* A */
	  CHAR_LOWERCASE_A: 'a', /* a */
	  CHAR_UPPERCASE_Z: 'Z', /* Z */
	  CHAR_LOWERCASE_Z: 'z', /* z */

	  CHAR_LEFT_PARENTHESES: '(', /* ( */
	  CHAR_RIGHT_PARENTHESES: ')', /* ) */

	  CHAR_ASTERISK: '*', /* * */

	  // Non-alphabetic chars.
	  CHAR_AMPERSAND: '&', /* & */
	  CHAR_AT: '@', /* @ */
	  CHAR_BACKSLASH: '\\', /* \ */
	  CHAR_BACKTICK: '`', /* ` */
	  CHAR_CARRIAGE_RETURN: '\r', /* \r */
	  CHAR_CIRCUMFLEX_ACCENT: '^', /* ^ */
	  CHAR_COLON: ':', /* : */
	  CHAR_COMMA: ',', /* , */
	  CHAR_DOLLAR: '$', /* . */
	  CHAR_DOT: '.', /* . */
	  CHAR_DOUBLE_QUOTE: '"', /* " */
	  CHAR_EQUAL: '=', /* = */
	  CHAR_EXCLAMATION_MARK: '!', /* ! */
	  CHAR_FORM_FEED: '\f', /* \f */
	  CHAR_FORWARD_SLASH: '/', /* / */
	  CHAR_HASH: '#', /* # */
	  CHAR_HYPHEN_MINUS: '-', /* - */
	  CHAR_LEFT_ANGLE_BRACKET: '<', /* < */
	  CHAR_LEFT_CURLY_BRACE: '{', /* { */
	  CHAR_LEFT_SQUARE_BRACKET: '[', /* [ */
	  CHAR_LINE_FEED: '\n', /* \n */
	  CHAR_NO_BREAK_SPACE: '\u00A0', /* \u00A0 */
	  CHAR_PERCENT: '%', /* % */
	  CHAR_PLUS: '+', /* + */
	  CHAR_QUESTION_MARK: '?', /* ? */
	  CHAR_RIGHT_ANGLE_BRACKET: '>', /* > */
	  CHAR_RIGHT_CURLY_BRACE: '}', /* } */
	  CHAR_RIGHT_SQUARE_BRACKET: ']', /* ] */
	  CHAR_SEMICOLON: ';', /* ; */
	  CHAR_SINGLE_QUOTE: '\'', /* ' */
	  CHAR_SPACE: ' ', /*   */
	  CHAR_TAB: '\t', /* \t */
	  CHAR_UNDERSCORE: '_', /* _ */
	  CHAR_VERTICAL_LINE: '|', /* | */
	  CHAR_ZERO_WIDTH_NOBREAK_SPACE: '\uFEFF' /* \uFEFF */
	};
	return constants$1;
}

var parse_1$1;
var hasRequiredParse$1;

function requireParse$1 () {
	if (hasRequiredParse$1) return parse_1$1;
	hasRequiredParse$1 = 1;

	const stringify = requireStringify();

	/**
	 * Constants
	 */

	const {
	  MAX_LENGTH,
	  CHAR_BACKSLASH, /* \ */
	  CHAR_BACKTICK, /* ` */
	  CHAR_COMMA, /* , */
	  CHAR_DOT, /* . */
	  CHAR_LEFT_PARENTHESES, /* ( */
	  CHAR_RIGHT_PARENTHESES, /* ) */
	  CHAR_LEFT_CURLY_BRACE, /* { */
	  CHAR_RIGHT_CURLY_BRACE, /* } */
	  CHAR_LEFT_SQUARE_BRACKET, /* [ */
	  CHAR_RIGHT_SQUARE_BRACKET, /* ] */
	  CHAR_DOUBLE_QUOTE, /* " */
	  CHAR_SINGLE_QUOTE, /* ' */
	  CHAR_NO_BREAK_SPACE,
	  CHAR_ZERO_WIDTH_NOBREAK_SPACE
	} = requireConstants$1();

	/**
	 * parse
	 */

	const parse = (input, options = {}) => {
	  if (typeof input !== 'string') {
	    throw new TypeError('Expected a string');
	  }

	  const opts = options || {};
	  const max = typeof opts.maxLength === 'number' ? Math.min(MAX_LENGTH, opts.maxLength) : MAX_LENGTH;
	  if (input.length > max) {
	    throw new SyntaxError(`Input length (${input.length}), exceeds max characters (${max})`);
	  }

	  const ast = { type: 'root', input, nodes: [] };
	  const stack = [ast];
	  let block = ast;
	  let prev = ast;
	  let brackets = 0;
	  const length = input.length;
	  let index = 0;
	  let depth = 0;
	  let value;

	  /**
	   * Helpers
	   */

	  const advance = () => input[index++];
	  const push = node => {
	    if (node.type === 'text' && prev.type === 'dot') {
	      prev.type = 'text';
	    }

	    if (prev && prev.type === 'text' && node.type === 'text') {
	      prev.value += node.value;
	      return;
	    }

	    block.nodes.push(node);
	    node.parent = block;
	    node.prev = prev;
	    prev = node;
	    return node;
	  };

	  push({ type: 'bos' });

	  while (index < length) {
	    block = stack[stack.length - 1];
	    value = advance();

	    /**
	     * Invalid chars
	     */

	    if (value === CHAR_ZERO_WIDTH_NOBREAK_SPACE || value === CHAR_NO_BREAK_SPACE) {
	      continue;
	    }

	    /**
	     * Escaped chars
	     */

	    if (value === CHAR_BACKSLASH) {
	      push({ type: 'text', value: (options.keepEscaping ? value : '') + advance() });
	      continue;
	    }

	    /**
	     * Right square bracket (literal): ']'
	     */

	    if (value === CHAR_RIGHT_SQUARE_BRACKET) {
	      push({ type: 'text', value: '\\' + value });
	      continue;
	    }

	    /**
	     * Left square bracket: '['
	     */

	    if (value === CHAR_LEFT_SQUARE_BRACKET) {
	      brackets++;

	      let next;

	      while (index < length && (next = advance())) {
	        value += next;

	        if (next === CHAR_LEFT_SQUARE_BRACKET) {
	          brackets++;
	          continue;
	        }

	        if (next === CHAR_BACKSLASH) {
	          value += advance();
	          continue;
	        }

	        if (next === CHAR_RIGHT_SQUARE_BRACKET) {
	          brackets--;

	          if (brackets === 0) {
	            break;
	          }
	        }
	      }

	      push({ type: 'text', value });
	      continue;
	    }

	    /**
	     * Parentheses
	     */

	    if (value === CHAR_LEFT_PARENTHESES) {
	      block = push({ type: 'paren', nodes: [] });
	      stack.push(block);
	      push({ type: 'text', value });
	      continue;
	    }

	    if (value === CHAR_RIGHT_PARENTHESES) {
	      if (block.type !== 'paren') {
	        push({ type: 'text', value });
	        continue;
	      }
	      block = stack.pop();
	      push({ type: 'text', value });
	      block = stack[stack.length - 1];
	      continue;
	    }

	    /**
	     * Quotes: '|"|`
	     */

	    if (value === CHAR_DOUBLE_QUOTE || value === CHAR_SINGLE_QUOTE || value === CHAR_BACKTICK) {
	      const open = value;
	      let next;

	      if (options.keepQuotes !== true) {
	        value = '';
	      }

	      while (index < length && (next = advance())) {
	        if (next === CHAR_BACKSLASH) {
	          value += next + advance();
	          continue;
	        }

	        if (next === open) {
	          if (options.keepQuotes === true) value += next;
	          break;
	        }

	        value += next;
	      }

	      push({ type: 'text', value });
	      continue;
	    }

	    /**
	     * Left curly brace: '{'
	     */

	    if (value === CHAR_LEFT_CURLY_BRACE) {
	      depth++;

	      const dollar = prev.value && prev.value.slice(-1) === '$' || block.dollar === true;
	      const brace = {
	        type: 'brace',
	        open: true,
	        close: false,
	        dollar,
	        depth,
	        commas: 0,
	        ranges: 0,
	        nodes: []
	      };

	      block = push(brace);
	      stack.push(block);
	      push({ type: 'open', value });
	      continue;
	    }

	    /**
	     * Right curly brace: '}'
	     */

	    if (value === CHAR_RIGHT_CURLY_BRACE) {
	      if (block.type !== 'brace') {
	        push({ type: 'text', value });
	        continue;
	      }

	      const type = 'close';
	      block = stack.pop();
	      block.close = true;

	      push({ type, value });
	      depth--;

	      block = stack[stack.length - 1];
	      continue;
	    }

	    /**
	     * Comma: ','
	     */

	    if (value === CHAR_COMMA && depth > 0) {
	      if (block.ranges > 0) {
	        block.ranges = 0;
	        const open = block.nodes.shift();
	        block.nodes = [open, { type: 'text', value: stringify(block) }];
	      }

	      push({ type: 'comma', value });
	      block.commas++;
	      continue;
	    }

	    /**
	     * Dot: '.'
	     */

	    if (value === CHAR_DOT && depth > 0 && block.commas === 0) {
	      const siblings = block.nodes;

	      if (depth === 0 || siblings.length === 0) {
	        push({ type: 'text', value });
	        continue;
	      }

	      if (prev.type === 'dot') {
	        block.range = [];
	        prev.value += value;
	        prev.type = 'range';

	        if (block.nodes.length !== 3 && block.nodes.length !== 5) {
	          block.invalid = true;
	          block.ranges = 0;
	          prev.type = 'text';
	          continue;
	        }

	        block.ranges++;
	        block.args = [];
	        continue;
	      }

	      if (prev.type === 'range') {
	        siblings.pop();

	        const before = siblings[siblings.length - 1];
	        before.value += prev.value + value;
	        prev = before;
	        block.ranges--;
	        continue;
	      }

	      push({ type: 'dot', value });
	      continue;
	    }

	    /**
	     * Text
	     */

	    push({ type: 'text', value });
	  }

	  // Mark imbalanced braces and brackets as invalid
	  do {
	    block = stack.pop();

	    if (block.type !== 'root') {
	      block.nodes.forEach(node => {
	        if (!node.nodes) {
	          if (node.type === 'open') node.isOpen = true;
	          if (node.type === 'close') node.isClose = true;
	          if (!node.nodes) node.type = 'text';
	          node.invalid = true;
	        }
	      });

	      // get the location of the block on parent.nodes (block's siblings)
	      const parent = stack[stack.length - 1];
	      const index = parent.nodes.indexOf(block);
	      // replace the (invalid) block with it's nodes
	      parent.nodes.splice(index, 1, ...block.nodes);
	    }
	  } while (stack.length > 0);

	  push({ type: 'eos' });
	  return ast;
	};

	parse_1$1 = parse;
	return parse_1$1;
}

var braces_1;
var hasRequiredBraces;

function requireBraces () {
	if (hasRequiredBraces) return braces_1;
	hasRequiredBraces = 1;

	const stringify = requireStringify();
	const compile = requireCompile();
	const expand = requireExpand();
	const parse = requireParse$1();

	/**
	 * Expand the given pattern or create a regex-compatible string.
	 *
	 * ```js
	 * const braces = require('braces');
	 * console.log(braces('{a,b,c}', { compile: true })); //=> ['(a|b|c)']
	 * console.log(braces('{a,b,c}')); //=> ['a', 'b', 'c']
	 * ```
	 * @param {String} `str`
	 * @param {Object} `options`
	 * @return {String}
	 * @api public
	 */

	const braces = (input, options = {}) => {
	  let output = [];

	  if (Array.isArray(input)) {
	    for (const pattern of input) {
	      const result = braces.create(pattern, options);
	      if (Array.isArray(result)) {
	        output.push(...result);
	      } else {
	        output.push(result);
	      }
	    }
	  } else {
	    output = [].concat(braces.create(input, options));
	  }

	  if (options && options.expand === true && options.nodupes === true) {
	    output = [...new Set(output)];
	  }
	  return output;
	};

	/**
	 * Parse the given `str` with the given `options`.
	 *
	 * ```js
	 * // braces.parse(pattern, [, options]);
	 * const ast = braces.parse('a/{b,c}/d');
	 * console.log(ast);
	 * ```
	 * @param {String} pattern Brace pattern to parse
	 * @param {Object} options
	 * @return {Object} Returns an AST
	 * @api public
	 */

	braces.parse = (input, options = {}) => parse(input, options);

	/**
	 * Creates a braces string from an AST, or an AST node.
	 *
	 * ```js
	 * const braces = require('braces');
	 * let ast = braces.parse('foo/{a,b}/bar');
	 * console.log(stringify(ast.nodes[2])); //=> '{a,b}'
	 * ```
	 * @param {String} `input` Brace pattern or AST.
	 * @param {Object} `options`
	 * @return {Array} Returns an array of expanded values.
	 * @api public
	 */

	braces.stringify = (input, options = {}) => {
	  if (typeof input === 'string') {
	    return stringify(braces.parse(input, options), options);
	  }
	  return stringify(input, options);
	};

	/**
	 * Compiles a brace pattern into a regex-compatible, optimized string.
	 * This method is called by the main [braces](#braces) function by default.
	 *
	 * ```js
	 * const braces = require('braces');
	 * console.log(braces.compile('a/{b,c}/d'));
	 * //=> ['a/(b|c)/d']
	 * ```
	 * @param {String} `input` Brace pattern or AST.
	 * @param {Object} `options`
	 * @return {Array} Returns an array of expanded values.
	 * @api public
	 */

	braces.compile = (input, options = {}) => {
	  if (typeof input === 'string') {
	    input = braces.parse(input, options);
	  }
	  return compile(input, options);
	};

	/**
	 * Expands a brace pattern into an array. This method is called by the
	 * main [braces](#braces) function when `options.expand` is true. Before
	 * using this method it's recommended that you read the [performance notes](#performance))
	 * and advantages of using [.compile](#compile) instead.
	 *
	 * ```js
	 * const braces = require('braces');
	 * console.log(braces.expand('a/{b,c}/d'));
	 * //=> ['a/b/d', 'a/c/d'];
	 * ```
	 * @param {String} `pattern` Brace pattern
	 * @param {Object} `options`
	 * @return {Array} Returns an array of expanded values.
	 * @api public
	 */

	braces.expand = (input, options = {}) => {
	  if (typeof input === 'string') {
	    input = braces.parse(input, options);
	  }

	  let result = expand(input, options);

	  // filter out empty strings if specified
	  if (options.noempty === true) {
	    result = result.filter(Boolean);
	  }

	  // filter out duplicates if specified
	  if (options.nodupes === true) {
	    result = [...new Set(result)];
	  }

	  return result;
	};

	/**
	 * Processes a brace pattern and returns either an expanded array
	 * (if `options.expand` is true), a highly optimized regex-compatible string.
	 * This method is called by the main [braces](#braces) function.
	 *
	 * ```js
	 * const braces = require('braces');
	 * console.log(braces.create('user-{200..300}/project-{a,b,c}-{1..10}'))
	 * //=> 'user-(20[0-9]|2[1-9][0-9]|300)/project-(a|b|c)-([1-9]|10)'
	 * ```
	 * @param {String} `pattern` Brace pattern
	 * @param {Object} `options`
	 * @return {Array} Returns an array of expanded values.
	 * @api public
	 */

	braces.create = (input, options = {}) => {
	  if (input === '' || input.length < 3) {
	    return [input];
	  }

	  return options.expand !== true
	    ? braces.compile(input, options)
	    : braces.expand(input, options);
	};

	/**
	 * Expose "braces"
	 */

	braces_1 = braces;
	return braces_1;
}

var utils = {};

var constants;
var hasRequiredConstants;

function requireConstants () {
	if (hasRequiredConstants) return constants;
	hasRequiredConstants = 1;

	const path = require$$0$1;
	const WIN_SLASH = '\\\\/';
	const WIN_NO_SLASH = `[^${WIN_SLASH}]`;

	/**
	 * Posix glob regex
	 */

	const DOT_LITERAL = '\\.';
	const PLUS_LITERAL = '\\+';
	const QMARK_LITERAL = '\\?';
	const SLASH_LITERAL = '\\/';
	const ONE_CHAR = '(?=.)';
	const QMARK = '[^/]';
	const END_ANCHOR = `(?:${SLASH_LITERAL}|$)`;
	const START_ANCHOR = `(?:^|${SLASH_LITERAL})`;
	const DOTS_SLASH = `${DOT_LITERAL}{1,2}${END_ANCHOR}`;
	const NO_DOT = `(?!${DOT_LITERAL})`;
	const NO_DOTS = `(?!${START_ANCHOR}${DOTS_SLASH})`;
	const NO_DOT_SLASH = `(?!${DOT_LITERAL}{0,1}${END_ANCHOR})`;
	const NO_DOTS_SLASH = `(?!${DOTS_SLASH})`;
	const QMARK_NO_DOT = `[^.${SLASH_LITERAL}]`;
	const STAR = `${QMARK}*?`;

	const POSIX_CHARS = {
	  DOT_LITERAL,
	  PLUS_LITERAL,
	  QMARK_LITERAL,
	  SLASH_LITERAL,
	  ONE_CHAR,
	  QMARK,
	  END_ANCHOR,
	  DOTS_SLASH,
	  NO_DOT,
	  NO_DOTS,
	  NO_DOT_SLASH,
	  NO_DOTS_SLASH,
	  QMARK_NO_DOT,
	  STAR,
	  START_ANCHOR
	};

	/**
	 * Windows glob regex
	 */

	const WINDOWS_CHARS = {
	  ...POSIX_CHARS,

	  SLASH_LITERAL: `[${WIN_SLASH}]`,
	  QMARK: WIN_NO_SLASH,
	  STAR: `${WIN_NO_SLASH}*?`,
	  DOTS_SLASH: `${DOT_LITERAL}{1,2}(?:[${WIN_SLASH}]|$)`,
	  NO_DOT: `(?!${DOT_LITERAL})`,
	  NO_DOTS: `(?!(?:^|[${WIN_SLASH}])${DOT_LITERAL}{1,2}(?:[${WIN_SLASH}]|$))`,
	  NO_DOT_SLASH: `(?!${DOT_LITERAL}{0,1}(?:[${WIN_SLASH}]|$))`,
	  NO_DOTS_SLASH: `(?!${DOT_LITERAL}{1,2}(?:[${WIN_SLASH}]|$))`,
	  QMARK_NO_DOT: `[^.${WIN_SLASH}]`,
	  START_ANCHOR: `(?:^|[${WIN_SLASH}])`,
	  END_ANCHOR: `(?:[${WIN_SLASH}]|$)`
	};

	/**
	 * POSIX Bracket Regex
	 */

	const POSIX_REGEX_SOURCE = {
	  alnum: 'a-zA-Z0-9',
	  alpha: 'a-zA-Z',
	  ascii: '\\x00-\\x7F',
	  blank: ' \\t',
	  cntrl: '\\x00-\\x1F\\x7F',
	  digit: '0-9',
	  graph: '\\x21-\\x7E',
	  lower: 'a-z',
	  print: '\\x20-\\x7E ',
	  punct: '\\-!"#$%&\'()\\*+,./:;<=>?@[\\]^_`{|}~',
	  space: ' \\t\\r\\n\\v\\f',
	  upper: 'A-Z',
	  word: 'A-Za-z0-9_',
	  xdigit: 'A-Fa-f0-9'
	};

	constants = {
	  MAX_LENGTH: 1024 * 64,
	  POSIX_REGEX_SOURCE,

	  // regular expressions
	  REGEX_BACKSLASH: /\\(?![*+?^${}(|)[\]])/g,
	  REGEX_NON_SPECIAL_CHARS: /^[^@![\].,$*+?^{}()|\\/]+/,
	  REGEX_SPECIAL_CHARS: /[-*+?.^${}(|)[\]]/,
	  REGEX_SPECIAL_CHARS_BACKREF: /(\\?)((\W)(\3*))/g,
	  REGEX_SPECIAL_CHARS_GLOBAL: /([-*+?.^${}(|)[\]])/g,
	  REGEX_REMOVE_BACKSLASH: /(?:\[.*?[^\\]\]|\\(?=.))/g,

	  // Replace globs with equivalent patterns to reduce parsing time.
	  REPLACEMENTS: {
	    '***': '*',
	    '**/**': '**',
	    '**/**/**': '**'
	  },

	  // Digits
	  CHAR_0: 48, /* 0 */
	  CHAR_9: 57, /* 9 */

	  // Alphabet chars.
	  CHAR_UPPERCASE_A: 65, /* A */
	  CHAR_LOWERCASE_A: 97, /* a */
	  CHAR_UPPERCASE_Z: 90, /* Z */
	  CHAR_LOWERCASE_Z: 122, /* z */

	  CHAR_LEFT_PARENTHESES: 40, /* ( */
	  CHAR_RIGHT_PARENTHESES: 41, /* ) */

	  CHAR_ASTERISK: 42, /* * */

	  // Non-alphabetic chars.
	  CHAR_AMPERSAND: 38, /* & */
	  CHAR_AT: 64, /* @ */
	  CHAR_BACKWARD_SLASH: 92, /* \ */
	  CHAR_CARRIAGE_RETURN: 13, /* \r */
	  CHAR_CIRCUMFLEX_ACCENT: 94, /* ^ */
	  CHAR_COLON: 58, /* : */
	  CHAR_COMMA: 44, /* , */
	  CHAR_DOT: 46, /* . */
	  CHAR_DOUBLE_QUOTE: 34, /* " */
	  CHAR_EQUAL: 61, /* = */
	  CHAR_EXCLAMATION_MARK: 33, /* ! */
	  CHAR_FORM_FEED: 12, /* \f */
	  CHAR_FORWARD_SLASH: 47, /* / */
	  CHAR_GRAVE_ACCENT: 96, /* ` */
	  CHAR_HASH: 35, /* # */
	  CHAR_HYPHEN_MINUS: 45, /* - */
	  CHAR_LEFT_ANGLE_BRACKET: 60, /* < */
	  CHAR_LEFT_CURLY_BRACE: 123, /* { */
	  CHAR_LEFT_SQUARE_BRACKET: 91, /* [ */
	  CHAR_LINE_FEED: 10, /* \n */
	  CHAR_NO_BREAK_SPACE: 160, /* \u00A0 */
	  CHAR_PERCENT: 37, /* % */
	  CHAR_PLUS: 43, /* + */
	  CHAR_QUESTION_MARK: 63, /* ? */
	  CHAR_RIGHT_ANGLE_BRACKET: 62, /* > */
	  CHAR_RIGHT_CURLY_BRACE: 125, /* } */
	  CHAR_RIGHT_SQUARE_BRACKET: 93, /* ] */
	  CHAR_SEMICOLON: 59, /* ; */
	  CHAR_SINGLE_QUOTE: 39, /* ' */
	  CHAR_SPACE: 32, /*   */
	  CHAR_TAB: 9, /* \t */
	  CHAR_UNDERSCORE: 95, /* _ */
	  CHAR_VERTICAL_LINE: 124, /* | */
	  CHAR_ZERO_WIDTH_NOBREAK_SPACE: 65279, /* \uFEFF */

	  SEP: path.sep,

	  /**
	   * Create EXTGLOB_CHARS
	   */

	  extglobChars(chars) {
	    return {
	      '!': { type: 'negate', open: '(?:(?!(?:', close: `))${chars.STAR})` },
	      '?': { type: 'qmark', open: '(?:', close: ')?' },
	      '+': { type: 'plus', open: '(?:', close: ')+' },
	      '*': { type: 'star', open: '(?:', close: ')*' },
	      '@': { type: 'at', open: '(?:', close: ')' }
	    };
	  },

	  /**
	   * Create GLOB_CHARS
	   */

	  globChars(win32) {
	    return win32 === true ? WINDOWS_CHARS : POSIX_CHARS;
	  }
	};
	return constants;
}

var hasRequiredUtils;

function requireUtils () {
	if (hasRequiredUtils) return utils;
	hasRequiredUtils = 1;
	(function (exports) {

		const path = require$$0$1;
		const win32 = process.platform === 'win32';
		const {
		  REGEX_BACKSLASH,
		  REGEX_REMOVE_BACKSLASH,
		  REGEX_SPECIAL_CHARS,
		  REGEX_SPECIAL_CHARS_GLOBAL
		} = requireConstants();

		exports.isObject = val => val !== null && typeof val === 'object' && !Array.isArray(val);
		exports.hasRegexChars = str => REGEX_SPECIAL_CHARS.test(str);
		exports.isRegexChar = str => str.length === 1 && exports.hasRegexChars(str);
		exports.escapeRegex = str => str.replace(REGEX_SPECIAL_CHARS_GLOBAL, '\\$1');
		exports.toPosixSlashes = str => str.replace(REGEX_BACKSLASH, '/');

		exports.removeBackslashes = str => {
		  return str.replace(REGEX_REMOVE_BACKSLASH, match => {
		    return match === '\\' ? '' : match;
		  });
		};

		exports.supportsLookbehinds = () => {
		  const segs = process.version.slice(1).split('.').map(Number);
		  if (segs.length === 3 && segs[0] >= 9 || (segs[0] === 8 && segs[1] >= 10)) {
		    return true;
		  }
		  return false;
		};

		exports.isWindows = options => {
		  if (options && typeof options.windows === 'boolean') {
		    return options.windows;
		  }
		  return win32 === true || path.sep === '\\';
		};

		exports.escapeLast = (input, char, lastIdx) => {
		  const idx = input.lastIndexOf(char, lastIdx);
		  if (idx === -1) return input;
		  if (input[idx - 1] === '\\') return exports.escapeLast(input, char, idx - 1);
		  return `${input.slice(0, idx)}\\${input.slice(idx)}`;
		};

		exports.removePrefix = (input, state = {}) => {
		  let output = input;
		  if (output.startsWith('./')) {
		    output = output.slice(2);
		    state.prefix = './';
		  }
		  return output;
		};

		exports.wrapOutput = (input, state = {}, options = {}) => {
		  const prepend = options.contains ? '' : '^';
		  const append = options.contains ? '' : '$';

		  let output = `${prepend}(?:${input})${append}`;
		  if (state.negated === true) {
		    output = `(?:^(?!${output}).*$)`;
		  }
		  return output;
		}; 
	} (utils));
	return utils;
}

var scan_1;
var hasRequiredScan;

function requireScan () {
	if (hasRequiredScan) return scan_1;
	hasRequiredScan = 1;

	const utils = requireUtils();
	const {
	  CHAR_ASTERISK,             /* * */
	  CHAR_AT,                   /* @ */
	  CHAR_BACKWARD_SLASH,       /* \ */
	  CHAR_COMMA,                /* , */
	  CHAR_DOT,                  /* . */
	  CHAR_EXCLAMATION_MARK,     /* ! */
	  CHAR_FORWARD_SLASH,        /* / */
	  CHAR_LEFT_CURLY_BRACE,     /* { */
	  CHAR_LEFT_PARENTHESES,     /* ( */
	  CHAR_LEFT_SQUARE_BRACKET,  /* [ */
	  CHAR_PLUS,                 /* + */
	  CHAR_QUESTION_MARK,        /* ? */
	  CHAR_RIGHT_CURLY_BRACE,    /* } */
	  CHAR_RIGHT_PARENTHESES,    /* ) */
	  CHAR_RIGHT_SQUARE_BRACKET  /* ] */
	} = requireConstants();

	const isPathSeparator = code => {
	  return code === CHAR_FORWARD_SLASH || code === CHAR_BACKWARD_SLASH;
	};

	const depth = token => {
	  if (token.isPrefix !== true) {
	    token.depth = token.isGlobstar ? Infinity : 1;
	  }
	};

	/**
	 * Quickly scans a glob pattern and returns an object with a handful of
	 * useful properties, like `isGlob`, `path` (the leading non-glob, if it exists),
	 * `glob` (the actual pattern), `negated` (true if the path starts with `!` but not
	 * with `!(`) and `negatedExtglob` (true if the path starts with `!(`).
	 *
	 * ```js
	 * const pm = require('picomatch');
	 * console.log(pm.scan('foo/bar/*.js'));
	 * { isGlob: true, input: 'foo/bar/*.js', base: 'foo/bar', glob: '*.js' }
	 * ```
	 * @param {String} `str`
	 * @param {Object} `options`
	 * @return {Object} Returns an object with tokens and regex source string.
	 * @api public
	 */

	const scan = (input, options) => {
	  const opts = options || {};

	  const length = input.length - 1;
	  const scanToEnd = opts.parts === true || opts.scanToEnd === true;
	  const slashes = [];
	  const tokens = [];
	  const parts = [];

	  let str = input;
	  let index = -1;
	  let start = 0;
	  let lastIndex = 0;
	  let isBrace = false;
	  let isBracket = false;
	  let isGlob = false;
	  let isExtglob = false;
	  let isGlobstar = false;
	  let braceEscaped = false;
	  let backslashes = false;
	  let negated = false;
	  let negatedExtglob = false;
	  let finished = false;
	  let braces = 0;
	  let prev;
	  let code;
	  let token = { value: '', depth: 0, isGlob: false };

	  const eos = () => index >= length;
	  const peek = () => str.charCodeAt(index + 1);
	  const advance = () => {
	    prev = code;
	    return str.charCodeAt(++index);
	  };

	  while (index < length) {
	    code = advance();
	    let next;

	    if (code === CHAR_BACKWARD_SLASH) {
	      backslashes = token.backslashes = true;
	      code = advance();

	      if (code === CHAR_LEFT_CURLY_BRACE) {
	        braceEscaped = true;
	      }
	      continue;
	    }

	    if (braceEscaped === true || code === CHAR_LEFT_CURLY_BRACE) {
	      braces++;

	      while (eos() !== true && (code = advance())) {
	        if (code === CHAR_BACKWARD_SLASH) {
	          backslashes = token.backslashes = true;
	          advance();
	          continue;
	        }

	        if (code === CHAR_LEFT_CURLY_BRACE) {
	          braces++;
	          continue;
	        }

	        if (braceEscaped !== true && code === CHAR_DOT && (code = advance()) === CHAR_DOT) {
	          isBrace = token.isBrace = true;
	          isGlob = token.isGlob = true;
	          finished = true;

	          if (scanToEnd === true) {
	            continue;
	          }

	          break;
	        }

	        if (braceEscaped !== true && code === CHAR_COMMA) {
	          isBrace = token.isBrace = true;
	          isGlob = token.isGlob = true;
	          finished = true;

	          if (scanToEnd === true) {
	            continue;
	          }

	          break;
	        }

	        if (code === CHAR_RIGHT_CURLY_BRACE) {
	          braces--;

	          if (braces === 0) {
	            braceEscaped = false;
	            isBrace = token.isBrace = true;
	            finished = true;
	            break;
	          }
	        }
	      }

	      if (scanToEnd === true) {
	        continue;
	      }

	      break;
	    }

	    if (code === CHAR_FORWARD_SLASH) {
	      slashes.push(index);
	      tokens.push(token);
	      token = { value: '', depth: 0, isGlob: false };

	      if (finished === true) continue;
	      if (prev === CHAR_DOT && index === (start + 1)) {
	        start += 2;
	        continue;
	      }

	      lastIndex = index + 1;
	      continue;
	    }

	    if (opts.noext !== true) {
	      const isExtglobChar = code === CHAR_PLUS
	        || code === CHAR_AT
	        || code === CHAR_ASTERISK
	        || code === CHAR_QUESTION_MARK
	        || code === CHAR_EXCLAMATION_MARK;

	      if (isExtglobChar === true && peek() === CHAR_LEFT_PARENTHESES) {
	        isGlob = token.isGlob = true;
	        isExtglob = token.isExtglob = true;
	        finished = true;
	        if (code === CHAR_EXCLAMATION_MARK && index === start) {
	          negatedExtglob = true;
	        }

	        if (scanToEnd === true) {
	          while (eos() !== true && (code = advance())) {
	            if (code === CHAR_BACKWARD_SLASH) {
	              backslashes = token.backslashes = true;
	              code = advance();
	              continue;
	            }

	            if (code === CHAR_RIGHT_PARENTHESES) {
	              isGlob = token.isGlob = true;
	              finished = true;
	              break;
	            }
	          }
	          continue;
	        }
	        break;
	      }
	    }

	    if (code === CHAR_ASTERISK) {
	      if (prev === CHAR_ASTERISK) isGlobstar = token.isGlobstar = true;
	      isGlob = token.isGlob = true;
	      finished = true;

	      if (scanToEnd === true) {
	        continue;
	      }
	      break;
	    }

	    if (code === CHAR_QUESTION_MARK) {
	      isGlob = token.isGlob = true;
	      finished = true;

	      if (scanToEnd === true) {
	        continue;
	      }
	      break;
	    }

	    if (code === CHAR_LEFT_SQUARE_BRACKET) {
	      while (eos() !== true && (next = advance())) {
	        if (next === CHAR_BACKWARD_SLASH) {
	          backslashes = token.backslashes = true;
	          advance();
	          continue;
	        }

	        if (next === CHAR_RIGHT_SQUARE_BRACKET) {
	          isBracket = token.isBracket = true;
	          isGlob = token.isGlob = true;
	          finished = true;
	          break;
	        }
	      }

	      if (scanToEnd === true) {
	        continue;
	      }

	      break;
	    }

	    if (opts.nonegate !== true && code === CHAR_EXCLAMATION_MARK && index === start) {
	      negated = token.negated = true;
	      start++;
	      continue;
	    }

	    if (opts.noparen !== true && code === CHAR_LEFT_PARENTHESES) {
	      isGlob = token.isGlob = true;

	      if (scanToEnd === true) {
	        while (eos() !== true && (code = advance())) {
	          if (code === CHAR_LEFT_PARENTHESES) {
	            backslashes = token.backslashes = true;
	            code = advance();
	            continue;
	          }

	          if (code === CHAR_RIGHT_PARENTHESES) {
	            finished = true;
	            break;
	          }
	        }
	        continue;
	      }
	      break;
	    }

	    if (isGlob === true) {
	      finished = true;

	      if (scanToEnd === true) {
	        continue;
	      }

	      break;
	    }
	  }

	  if (opts.noext === true) {
	    isExtglob = false;
	    isGlob = false;
	  }

	  let base = str;
	  let prefix = '';
	  let glob = '';

	  if (start > 0) {
	    prefix = str.slice(0, start);
	    str = str.slice(start);
	    lastIndex -= start;
	  }

	  if (base && isGlob === true && lastIndex > 0) {
	    base = str.slice(0, lastIndex);
	    glob = str.slice(lastIndex);
	  } else if (isGlob === true) {
	    base = '';
	    glob = str;
	  } else {
	    base = str;
	  }

	  if (base && base !== '' && base !== '/' && base !== str) {
	    if (isPathSeparator(base.charCodeAt(base.length - 1))) {
	      base = base.slice(0, -1);
	    }
	  }

	  if (opts.unescape === true) {
	    if (glob) glob = utils.removeBackslashes(glob);

	    if (base && backslashes === true) {
	      base = utils.removeBackslashes(base);
	    }
	  }

	  const state = {
	    prefix,
	    input,
	    start,
	    base,
	    glob,
	    isBrace,
	    isBracket,
	    isGlob,
	    isExtglob,
	    isGlobstar,
	    negated,
	    negatedExtglob
	  };

	  if (opts.tokens === true) {
	    state.maxDepth = 0;
	    if (!isPathSeparator(code)) {
	      tokens.push(token);
	    }
	    state.tokens = tokens;
	  }

	  if (opts.parts === true || opts.tokens === true) {
	    let prevIndex;

	    for (let idx = 0; idx < slashes.length; idx++) {
	      const n = prevIndex ? prevIndex + 1 : start;
	      const i = slashes[idx];
	      const value = input.slice(n, i);
	      if (opts.tokens) {
	        if (idx === 0 && start !== 0) {
	          tokens[idx].isPrefix = true;
	          tokens[idx].value = prefix;
	        } else {
	          tokens[idx].value = value;
	        }
	        depth(tokens[idx]);
	        state.maxDepth += tokens[idx].depth;
	      }
	      if (idx !== 0 || value !== '') {
	        parts.push(value);
	      }
	      prevIndex = i;
	    }

	    if (prevIndex && prevIndex + 1 < input.length) {
	      const value = input.slice(prevIndex + 1);
	      parts.push(value);

	      if (opts.tokens) {
	        tokens[tokens.length - 1].value = value;
	        depth(tokens[tokens.length - 1]);
	        state.maxDepth += tokens[tokens.length - 1].depth;
	      }
	    }

	    state.slashes = slashes;
	    state.parts = parts;
	  }

	  return state;
	};

	scan_1 = scan;
	return scan_1;
}

var parse_1;
var hasRequiredParse;

function requireParse () {
	if (hasRequiredParse) return parse_1;
	hasRequiredParse = 1;

	const constants = requireConstants();
	const utils = requireUtils();

	/**
	 * Constants
	 */

	const {
	  MAX_LENGTH,
	  POSIX_REGEX_SOURCE,
	  REGEX_NON_SPECIAL_CHARS,
	  REGEX_SPECIAL_CHARS_BACKREF,
	  REPLACEMENTS
	} = constants;

	/**
	 * Helpers
	 */

	const expandRange = (args, options) => {
	  if (typeof options.expandRange === 'function') {
	    return options.expandRange(...args, options);
	  }

	  args.sort();
	  const value = `[${args.join('-')}]`;

	  try {
	    /* eslint-disable-next-line no-new */
	    new RegExp(value);
	  } catch (ex) {
	    return args.map(v => utils.escapeRegex(v)).join('..');
	  }

	  return value;
	};

	/**
	 * Create the message for a syntax error
	 */

	const syntaxError = (type, char) => {
	  return `Missing ${type}: "${char}" - use "\\\\${char}" to match literal characters`;
	};

	/**
	 * Parse the given input string.
	 * @param {String} input
	 * @param {Object} options
	 * @return {Object}
	 */

	const parse = (input, options) => {
	  if (typeof input !== 'string') {
	    throw new TypeError('Expected a string');
	  }

	  input = REPLACEMENTS[input] || input;

	  const opts = { ...options };
	  const max = typeof opts.maxLength === 'number' ? Math.min(MAX_LENGTH, opts.maxLength) : MAX_LENGTH;

	  let len = input.length;
	  if (len > max) {
	    throw new SyntaxError(`Input length: ${len}, exceeds maximum allowed length: ${max}`);
	  }

	  const bos = { type: 'bos', value: '', output: opts.prepend || '' };
	  const tokens = [bos];

	  const capture = opts.capture ? '' : '?:';
	  const win32 = utils.isWindows(options);

	  // create constants based on platform, for windows or posix
	  const PLATFORM_CHARS = constants.globChars(win32);
	  const EXTGLOB_CHARS = constants.extglobChars(PLATFORM_CHARS);

	  const {
	    DOT_LITERAL,
	    PLUS_LITERAL,
	    SLASH_LITERAL,
	    ONE_CHAR,
	    DOTS_SLASH,
	    NO_DOT,
	    NO_DOT_SLASH,
	    NO_DOTS_SLASH,
	    QMARK,
	    QMARK_NO_DOT,
	    STAR,
	    START_ANCHOR
	  } = PLATFORM_CHARS;

	  const globstar = opts => {
	    return `(${capture}(?:(?!${START_ANCHOR}${opts.dot ? DOTS_SLASH : DOT_LITERAL}).)*?)`;
	  };

	  const nodot = opts.dot ? '' : NO_DOT;
	  const qmarkNoDot = opts.dot ? QMARK : QMARK_NO_DOT;
	  let star = opts.bash === true ? globstar(opts) : STAR;

	  if (opts.capture) {
	    star = `(${star})`;
	  }

	  // minimatch options support
	  if (typeof opts.noext === 'boolean') {
	    opts.noextglob = opts.noext;
	  }

	  const state = {
	    input,
	    index: -1,
	    start: 0,
	    dot: opts.dot === true,
	    consumed: '',
	    output: '',
	    prefix: '',
	    backtrack: false,
	    negated: false,
	    brackets: 0,
	    braces: 0,
	    parens: 0,
	    quotes: 0,
	    globstar: false,
	    tokens
	  };

	  input = utils.removePrefix(input, state);
	  len = input.length;

	  const extglobs = [];
	  const braces = [];
	  const stack = [];
	  let prev = bos;
	  let value;

	  /**
	   * Tokenizing helpers
	   */

	  const eos = () => state.index === len - 1;
	  const peek = state.peek = (n = 1) => input[state.index + n];
	  const advance = state.advance = () => input[++state.index] || '';
	  const remaining = () => input.slice(state.index + 1);
	  const consume = (value = '', num = 0) => {
	    state.consumed += value;
	    state.index += num;
	  };

	  const append = token => {
	    state.output += token.output != null ? token.output : token.value;
	    consume(token.value);
	  };

	  const negate = () => {
	    let count = 1;

	    while (peek() === '!' && (peek(2) !== '(' || peek(3) === '?')) {
	      advance();
	      state.start++;
	      count++;
	    }

	    if (count % 2 === 0) {
	      return false;
	    }

	    state.negated = true;
	    state.start++;
	    return true;
	  };

	  const increment = type => {
	    state[type]++;
	    stack.push(type);
	  };

	  const decrement = type => {
	    state[type]--;
	    stack.pop();
	  };

	  /**
	   * Push tokens onto the tokens array. This helper speeds up
	   * tokenizing by 1) helping us avoid backtracking as much as possible,
	   * and 2) helping us avoid creating extra tokens when consecutive
	   * characters are plain text. This improves performance and simplifies
	   * lookbehinds.
	   */

	  const push = tok => {
	    if (prev.type === 'globstar') {
	      const isBrace = state.braces > 0 && (tok.type === 'comma' || tok.type === 'brace');
	      const isExtglob = tok.extglob === true || (extglobs.length && (tok.type === 'pipe' || tok.type === 'paren'));

	      if (tok.type !== 'slash' && tok.type !== 'paren' && !isBrace && !isExtglob) {
	        state.output = state.output.slice(0, -prev.output.length);
	        prev.type = 'star';
	        prev.value = '*';
	        prev.output = star;
	        state.output += prev.output;
	      }
	    }

	    if (extglobs.length && tok.type !== 'paren') {
	      extglobs[extglobs.length - 1].inner += tok.value;
	    }

	    if (tok.value || tok.output) append(tok);
	    if (prev && prev.type === 'text' && tok.type === 'text') {
	      prev.value += tok.value;
	      prev.output = (prev.output || '') + tok.value;
	      return;
	    }

	    tok.prev = prev;
	    tokens.push(tok);
	    prev = tok;
	  };

	  const extglobOpen = (type, value) => {
	    const token = { ...EXTGLOB_CHARS[value], conditions: 1, inner: '' };

	    token.prev = prev;
	    token.parens = state.parens;
	    token.output = state.output;
	    const output = (opts.capture ? '(' : '') + token.open;

	    increment('parens');
	    push({ type, value, output: state.output ? '' : ONE_CHAR });
	    push({ type: 'paren', extglob: true, value: advance(), output });
	    extglobs.push(token);
	  };

	  const extglobClose = token => {
	    let output = token.close + (opts.capture ? ')' : '');
	    let rest;

	    if (token.type === 'negate') {
	      let extglobStar = star;

	      if (token.inner && token.inner.length > 1 && token.inner.includes('/')) {
	        extglobStar = globstar(opts);
	      }

	      if (extglobStar !== star || eos() || /^\)+$/.test(remaining())) {
	        output = token.close = `)$))${extglobStar}`;
	      }

	      if (token.inner.includes('*') && (rest = remaining()) && /^\.[^\\/.]+$/.test(rest)) {
	        // Any non-magical string (`.ts`) or even nested expression (`.{ts,tsx}`) can follow after the closing parenthesis.
	        // In this case, we need to parse the string and use it in the output of the original pattern.
	        // Suitable patterns: `/!(*.d).ts`, `/!(*.d).{ts,tsx}`, `**/!(*-dbg).@(js)`.
	        //
	        // Disabling the `fastpaths` option due to a problem with parsing strings as `.ts` in the pattern like `**/!(*.d).ts`.
	        const expression = parse(rest, { ...options, fastpaths: false }).output;

	        output = token.close = `)${expression})${extglobStar})`;
	      }

	      if (token.prev.type === 'bos') {
	        state.negatedExtglob = true;
	      }
	    }

	    push({ type: 'paren', extglob: true, value, output });
	    decrement('parens');
	  };

	  /**
	   * Fast paths
	   */

	  if (opts.fastpaths !== false && !/(^[*!]|[/()[\]{}"])/.test(input)) {
	    let backslashes = false;

	    let output = input.replace(REGEX_SPECIAL_CHARS_BACKREF, (m, esc, chars, first, rest, index) => {
	      if (first === '\\') {
	        backslashes = true;
	        return m;
	      }

	      if (first === '?') {
	        if (esc) {
	          return esc + first + (rest ? QMARK.repeat(rest.length) : '');
	        }
	        if (index === 0) {
	          return qmarkNoDot + (rest ? QMARK.repeat(rest.length) : '');
	        }
	        return QMARK.repeat(chars.length);
	      }

	      if (first === '.') {
	        return DOT_LITERAL.repeat(chars.length);
	      }

	      if (first === '*') {
	        if (esc) {
	          return esc + first + (rest ? star : '');
	        }
	        return star;
	      }
	      return esc ? m : `\\${m}`;
	    });

	    if (backslashes === true) {
	      if (opts.unescape === true) {
	        output = output.replace(/\\/g, '');
	      } else {
	        output = output.replace(/\\+/g, m => {
	          return m.length % 2 === 0 ? '\\\\' : (m ? '\\' : '');
	        });
	      }
	    }

	    if (output === input && opts.contains === true) {
	      state.output = input;
	      return state;
	    }

	    state.output = utils.wrapOutput(output, state, options);
	    return state;
	  }

	  /**
	   * Tokenize input until we reach end-of-string
	   */

	  while (!eos()) {
	    value = advance();

	    if (value === '\u0000') {
	      continue;
	    }

	    /**
	     * Escaped characters
	     */

	    if (value === '\\') {
	      const next = peek();

	      if (next === '/' && opts.bash !== true) {
	        continue;
	      }

	      if (next === '.' || next === ';') {
	        continue;
	      }

	      if (!next) {
	        value += '\\';
	        push({ type: 'text', value });
	        continue;
	      }

	      // collapse slashes to reduce potential for exploits
	      const match = /^\\+/.exec(remaining());
	      let slashes = 0;

	      if (match && match[0].length > 2) {
	        slashes = match[0].length;
	        state.index += slashes;
	        if (slashes % 2 !== 0) {
	          value += '\\';
	        }
	      }

	      if (opts.unescape === true) {
	        value = advance();
	      } else {
	        value += advance();
	      }

	      if (state.brackets === 0) {
	        push({ type: 'text', value });
	        continue;
	      }
	    }

	    /**
	     * If we're inside a regex character class, continue
	     * until we reach the closing bracket.
	     */

	    if (state.brackets > 0 && (value !== ']' || prev.value === '[' || prev.value === '[^')) {
	      if (opts.posix !== false && value === ':') {
	        const inner = prev.value.slice(1);
	        if (inner.includes('[')) {
	          prev.posix = true;

	          if (inner.includes(':')) {
	            const idx = prev.value.lastIndexOf('[');
	            const pre = prev.value.slice(0, idx);
	            const rest = prev.value.slice(idx + 2);
	            const posix = POSIX_REGEX_SOURCE[rest];
	            if (posix) {
	              prev.value = pre + posix;
	              state.backtrack = true;
	              advance();

	              if (!bos.output && tokens.indexOf(prev) === 1) {
	                bos.output = ONE_CHAR;
	              }
	              continue;
	            }
	          }
	        }
	      }

	      if ((value === '[' && peek() !== ':') || (value === '-' && peek() === ']')) {
	        value = `\\${value}`;
	      }

	      if (value === ']' && (prev.value === '[' || prev.value === '[^')) {
	        value = `\\${value}`;
	      }

	      if (opts.posix === true && value === '!' && prev.value === '[') {
	        value = '^';
	      }

	      prev.value += value;
	      append({ value });
	      continue;
	    }

	    /**
	     * If we're inside a quoted string, continue
	     * until we reach the closing double quote.
	     */

	    if (state.quotes === 1 && value !== '"') {
	      value = utils.escapeRegex(value);
	      prev.value += value;
	      append({ value });
	      continue;
	    }

	    /**
	     * Double quotes
	     */

	    if (value === '"') {
	      state.quotes = state.quotes === 1 ? 0 : 1;
	      if (opts.keepQuotes === true) {
	        push({ type: 'text', value });
	      }
	      continue;
	    }

	    /**
	     * Parentheses
	     */

	    if (value === '(') {
	      increment('parens');
	      push({ type: 'paren', value });
	      continue;
	    }

	    if (value === ')') {
	      if (state.parens === 0 && opts.strictBrackets === true) {
	        throw new SyntaxError(syntaxError('opening', '('));
	      }

	      const extglob = extglobs[extglobs.length - 1];
	      if (extglob && state.parens === extglob.parens + 1) {
	        extglobClose(extglobs.pop());
	        continue;
	      }

	      push({ type: 'paren', value, output: state.parens ? ')' : '\\)' });
	      decrement('parens');
	      continue;
	    }

	    /**
	     * Square brackets
	     */

	    if (value === '[') {
	      if (opts.nobracket === true || !remaining().includes(']')) {
	        if (opts.nobracket !== true && opts.strictBrackets === true) {
	          throw new SyntaxError(syntaxError('closing', ']'));
	        }

	        value = `\\${value}`;
	      } else {
	        increment('brackets');
	      }

	      push({ type: 'bracket', value });
	      continue;
	    }

	    if (value === ']') {
	      if (opts.nobracket === true || (prev && prev.type === 'bracket' && prev.value.length === 1)) {
	        push({ type: 'text', value, output: `\\${value}` });
	        continue;
	      }

	      if (state.brackets === 0) {
	        if (opts.strictBrackets === true) {
	          throw new SyntaxError(syntaxError('opening', '['));
	        }

	        push({ type: 'text', value, output: `\\${value}` });
	        continue;
	      }

	      decrement('brackets');

	      const prevValue = prev.value.slice(1);
	      if (prev.posix !== true && prevValue[0] === '^' && !prevValue.includes('/')) {
	        value = `/${value}`;
	      }

	      prev.value += value;
	      append({ value });

	      // when literal brackets are explicitly disabled
	      // assume we should match with a regex character class
	      if (opts.literalBrackets === false || utils.hasRegexChars(prevValue)) {
	        continue;
	      }

	      const escaped = utils.escapeRegex(prev.value);
	      state.output = state.output.slice(0, -prev.value.length);

	      // when literal brackets are explicitly enabled
	      // assume we should escape the brackets to match literal characters
	      if (opts.literalBrackets === true) {
	        state.output += escaped;
	        prev.value = escaped;
	        continue;
	      }

	      // when the user specifies nothing, try to match both
	      prev.value = `(${capture}${escaped}|${prev.value})`;
	      state.output += prev.value;
	      continue;
	    }

	    /**
	     * Braces
	     */

	    if (value === '{' && opts.nobrace !== true) {
	      increment('braces');

	      const open = {
	        type: 'brace',
	        value,
	        output: '(',
	        outputIndex: state.output.length,
	        tokensIndex: state.tokens.length
	      };

	      braces.push(open);
	      push(open);
	      continue;
	    }

	    if (value === '}') {
	      const brace = braces[braces.length - 1];

	      if (opts.nobrace === true || !brace) {
	        push({ type: 'text', value, output: value });
	        continue;
	      }

	      let output = ')';

	      if (brace.dots === true) {
	        const arr = tokens.slice();
	        const range = [];

	        for (let i = arr.length - 1; i >= 0; i--) {
	          tokens.pop();
	          if (arr[i].type === 'brace') {
	            break;
	          }
	          if (arr[i].type !== 'dots') {
	            range.unshift(arr[i].value);
	          }
	        }

	        output = expandRange(range, opts);
	        state.backtrack = true;
	      }

	      if (brace.comma !== true && brace.dots !== true) {
	        const out = state.output.slice(0, brace.outputIndex);
	        const toks = state.tokens.slice(brace.tokensIndex);
	        brace.value = brace.output = '\\{';
	        value = output = '\\}';
	        state.output = out;
	        for (const t of toks) {
	          state.output += (t.output || t.value);
	        }
	      }

	      push({ type: 'brace', value, output });
	      decrement('braces');
	      braces.pop();
	      continue;
	    }

	    /**
	     * Pipes
	     */

	    if (value === '|') {
	      if (extglobs.length > 0) {
	        extglobs[extglobs.length - 1].conditions++;
	      }
	      push({ type: 'text', value });
	      continue;
	    }

	    /**
	     * Commas
	     */

	    if (value === ',') {
	      let output = value;

	      const brace = braces[braces.length - 1];
	      if (brace && stack[stack.length - 1] === 'braces') {
	        brace.comma = true;
	        output = '|';
	      }

	      push({ type: 'comma', value, output });
	      continue;
	    }

	    /**
	     * Slashes
	     */

	    if (value === '/') {
	      // if the beginning of the glob is "./", advance the start
	      // to the current index, and don't add the "./" characters
	      // to the state. This greatly simplifies lookbehinds when
	      // checking for BOS characters like "!" and "." (not "./")
	      if (prev.type === 'dot' && state.index === state.start + 1) {
	        state.start = state.index + 1;
	        state.consumed = '';
	        state.output = '';
	        tokens.pop();
	        prev = bos; // reset "prev" to the first token
	        continue;
	      }

	      push({ type: 'slash', value, output: SLASH_LITERAL });
	      continue;
	    }

	    /**
	     * Dots
	     */

	    if (value === '.') {
	      if (state.braces > 0 && prev.type === 'dot') {
	        if (prev.value === '.') prev.output = DOT_LITERAL;
	        const brace = braces[braces.length - 1];
	        prev.type = 'dots';
	        prev.output += value;
	        prev.value += value;
	        brace.dots = true;
	        continue;
	      }

	      if ((state.braces + state.parens) === 0 && prev.type !== 'bos' && prev.type !== 'slash') {
	        push({ type: 'text', value, output: DOT_LITERAL });
	        continue;
	      }

	      push({ type: 'dot', value, output: DOT_LITERAL });
	      continue;
	    }

	    /**
	     * Question marks
	     */

	    if (value === '?') {
	      const isGroup = prev && prev.value === '(';
	      if (!isGroup && opts.noextglob !== true && peek() === '(' && peek(2) !== '?') {
	        extglobOpen('qmark', value);
	        continue;
	      }

	      if (prev && prev.type === 'paren') {
	        const next = peek();
	        let output = value;

	        if (next === '<' && !utils.supportsLookbehinds()) {
	          throw new Error('Node.js v10 or higher is required for regex lookbehinds');
	        }

	        if ((prev.value === '(' && !/[!=<:]/.test(next)) || (next === '<' && !/<([!=]|\w+>)/.test(remaining()))) {
	          output = `\\${value}`;
	        }

	        push({ type: 'text', value, output });
	        continue;
	      }

	      if (opts.dot !== true && (prev.type === 'slash' || prev.type === 'bos')) {
	        push({ type: 'qmark', value, output: QMARK_NO_DOT });
	        continue;
	      }

	      push({ type: 'qmark', value, output: QMARK });
	      continue;
	    }

	    /**
	     * Exclamation
	     */

	    if (value === '!') {
	      if (opts.noextglob !== true && peek() === '(') {
	        if (peek(2) !== '?' || !/[!=<:]/.test(peek(3))) {
	          extglobOpen('negate', value);
	          continue;
	        }
	      }

	      if (opts.nonegate !== true && state.index === 0) {
	        negate();
	        continue;
	      }
	    }

	    /**
	     * Plus
	     */

	    if (value === '+') {
	      if (opts.noextglob !== true && peek() === '(' && peek(2) !== '?') {
	        extglobOpen('plus', value);
	        continue;
	      }

	      if ((prev && prev.value === '(') || opts.regex === false) {
	        push({ type: 'plus', value, output: PLUS_LITERAL });
	        continue;
	      }

	      if ((prev && (prev.type === 'bracket' || prev.type === 'paren' || prev.type === 'brace')) || state.parens > 0) {
	        push({ type: 'plus', value });
	        continue;
	      }

	      push({ type: 'plus', value: PLUS_LITERAL });
	      continue;
	    }

	    /**
	     * Plain text
	     */

	    if (value === '@') {
	      if (opts.noextglob !== true && peek() === '(' && peek(2) !== '?') {
	        push({ type: 'at', extglob: true, value, output: '' });
	        continue;
	      }

	      push({ type: 'text', value });
	      continue;
	    }

	    /**
	     * Plain text
	     */

	    if (value !== '*') {
	      if (value === '$' || value === '^') {
	        value = `\\${value}`;
	      }

	      const match = REGEX_NON_SPECIAL_CHARS.exec(remaining());
	      if (match) {
	        value += match[0];
	        state.index += match[0].length;
	      }

	      push({ type: 'text', value });
	      continue;
	    }

	    /**
	     * Stars
	     */

	    if (prev && (prev.type === 'globstar' || prev.star === true)) {
	      prev.type = 'star';
	      prev.star = true;
	      prev.value += value;
	      prev.output = star;
	      state.backtrack = true;
	      state.globstar = true;
	      consume(value);
	      continue;
	    }

	    let rest = remaining();
	    if (opts.noextglob !== true && /^\([^?]/.test(rest)) {
	      extglobOpen('star', value);
	      continue;
	    }

	    if (prev.type === 'star') {
	      if (opts.noglobstar === true) {
	        consume(value);
	        continue;
	      }

	      const prior = prev.prev;
	      const before = prior.prev;
	      const isStart = prior.type === 'slash' || prior.type === 'bos';
	      const afterStar = before && (before.type === 'star' || before.type === 'globstar');

	      if (opts.bash === true && (!isStart || (rest[0] && rest[0] !== '/'))) {
	        push({ type: 'star', value, output: '' });
	        continue;
	      }

	      const isBrace = state.braces > 0 && (prior.type === 'comma' || prior.type === 'brace');
	      const isExtglob = extglobs.length && (prior.type === 'pipe' || prior.type === 'paren');
	      if (!isStart && prior.type !== 'paren' && !isBrace && !isExtglob) {
	        push({ type: 'star', value, output: '' });
	        continue;
	      }

	      // strip consecutive `/**/`
	      while (rest.slice(0, 3) === '/**') {
	        const after = input[state.index + 4];
	        if (after && after !== '/') {
	          break;
	        }
	        rest = rest.slice(3);
	        consume('/**', 3);
	      }

	      if (prior.type === 'bos' && eos()) {
	        prev.type = 'globstar';
	        prev.value += value;
	        prev.output = globstar(opts);
	        state.output = prev.output;
	        state.globstar = true;
	        consume(value);
	        continue;
	      }

	      if (prior.type === 'slash' && prior.prev.type !== 'bos' && !afterStar && eos()) {
	        state.output = state.output.slice(0, -(prior.output + prev.output).length);
	        prior.output = `(?:${prior.output}`;

	        prev.type = 'globstar';
	        prev.output = globstar(opts) + (opts.strictSlashes ? ')' : '|$)');
	        prev.value += value;
	        state.globstar = true;
	        state.output += prior.output + prev.output;
	        consume(value);
	        continue;
	      }

	      if (prior.type === 'slash' && prior.prev.type !== 'bos' && rest[0] === '/') {
	        const end = rest[1] !== void 0 ? '|$' : '';

	        state.output = state.output.slice(0, -(prior.output + prev.output).length);
	        prior.output = `(?:${prior.output}`;

	        prev.type = 'globstar';
	        prev.output = `${globstar(opts)}${SLASH_LITERAL}|${SLASH_LITERAL}${end})`;
	        prev.value += value;

	        state.output += prior.output + prev.output;
	        state.globstar = true;

	        consume(value + advance());

	        push({ type: 'slash', value: '/', output: '' });
	        continue;
	      }

	      if (prior.type === 'bos' && rest[0] === '/') {
	        prev.type = 'globstar';
	        prev.value += value;
	        prev.output = `(?:^|${SLASH_LITERAL}|${globstar(opts)}${SLASH_LITERAL})`;
	        state.output = prev.output;
	        state.globstar = true;
	        consume(value + advance());
	        push({ type: 'slash', value: '/', output: '' });
	        continue;
	      }

	      // remove single star from output
	      state.output = state.output.slice(0, -prev.output.length);

	      // reset previous token to globstar
	      prev.type = 'globstar';
	      prev.output = globstar(opts);
	      prev.value += value;

	      // reset output with globstar
	      state.output += prev.output;
	      state.globstar = true;
	      consume(value);
	      continue;
	    }

	    const token = { type: 'star', value, output: star };

	    if (opts.bash === true) {
	      token.output = '.*?';
	      if (prev.type === 'bos' || prev.type === 'slash') {
	        token.output = nodot + token.output;
	      }
	      push(token);
	      continue;
	    }

	    if (prev && (prev.type === 'bracket' || prev.type === 'paren') && opts.regex === true) {
	      token.output = value;
	      push(token);
	      continue;
	    }

	    if (state.index === state.start || prev.type === 'slash' || prev.type === 'dot') {
	      if (prev.type === 'dot') {
	        state.output += NO_DOT_SLASH;
	        prev.output += NO_DOT_SLASH;

	      } else if (opts.dot === true) {
	        state.output += NO_DOTS_SLASH;
	        prev.output += NO_DOTS_SLASH;

	      } else {
	        state.output += nodot;
	        prev.output += nodot;
	      }

	      if (peek() !== '*') {
	        state.output += ONE_CHAR;
	        prev.output += ONE_CHAR;
	      }
	    }

	    push(token);
	  }

	  while (state.brackets > 0) {
	    if (opts.strictBrackets === true) throw new SyntaxError(syntaxError('closing', ']'));
	    state.output = utils.escapeLast(state.output, '[');
	    decrement('brackets');
	  }

	  while (state.parens > 0) {
	    if (opts.strictBrackets === true) throw new SyntaxError(syntaxError('closing', ')'));
	    state.output = utils.escapeLast(state.output, '(');
	    decrement('parens');
	  }

	  while (state.braces > 0) {
	    if (opts.strictBrackets === true) throw new SyntaxError(syntaxError('closing', '}'));
	    state.output = utils.escapeLast(state.output, '{');
	    decrement('braces');
	  }

	  if (opts.strictSlashes !== true && (prev.type === 'star' || prev.type === 'bracket')) {
	    push({ type: 'maybe_slash', value: '', output: `${SLASH_LITERAL}?` });
	  }

	  // rebuild the output if we had to backtrack at any point
	  if (state.backtrack === true) {
	    state.output = '';

	    for (const token of state.tokens) {
	      state.output += token.output != null ? token.output : token.value;

	      if (token.suffix) {
	        state.output += token.suffix;
	      }
	    }
	  }

	  return state;
	};

	/**
	 * Fast paths for creating regular expressions for common glob patterns.
	 * This can significantly speed up processing and has very little downside
	 * impact when none of the fast paths match.
	 */

	parse.fastpaths = (input, options) => {
	  const opts = { ...options };
	  const max = typeof opts.maxLength === 'number' ? Math.min(MAX_LENGTH, opts.maxLength) : MAX_LENGTH;
	  const len = input.length;
	  if (len > max) {
	    throw new SyntaxError(`Input length: ${len}, exceeds maximum allowed length: ${max}`);
	  }

	  input = REPLACEMENTS[input] || input;
	  const win32 = utils.isWindows(options);

	  // create constants based on platform, for windows or posix
	  const {
	    DOT_LITERAL,
	    SLASH_LITERAL,
	    ONE_CHAR,
	    DOTS_SLASH,
	    NO_DOT,
	    NO_DOTS,
	    NO_DOTS_SLASH,
	    STAR,
	    START_ANCHOR
	  } = constants.globChars(win32);

	  const nodot = opts.dot ? NO_DOTS : NO_DOT;
	  const slashDot = opts.dot ? NO_DOTS_SLASH : NO_DOT;
	  const capture = opts.capture ? '' : '?:';
	  const state = { negated: false, prefix: '' };
	  let star = opts.bash === true ? '.*?' : STAR;

	  if (opts.capture) {
	    star = `(${star})`;
	  }

	  const globstar = opts => {
	    if (opts.noglobstar === true) return star;
	    return `(${capture}(?:(?!${START_ANCHOR}${opts.dot ? DOTS_SLASH : DOT_LITERAL}).)*?)`;
	  };

	  const create = str => {
	    switch (str) {
	      case '*':
	        return `${nodot}${ONE_CHAR}${star}`;

	      case '.*':
	        return `${DOT_LITERAL}${ONE_CHAR}${star}`;

	      case '*.*':
	        return `${nodot}${star}${DOT_LITERAL}${ONE_CHAR}${star}`;

	      case '*/*':
	        return `${nodot}${star}${SLASH_LITERAL}${ONE_CHAR}${slashDot}${star}`;

	      case '**':
	        return nodot + globstar(opts);

	      case '**/*':
	        return `(?:${nodot}${globstar(opts)}${SLASH_LITERAL})?${slashDot}${ONE_CHAR}${star}`;

	      case '**/*.*':
	        return `(?:${nodot}${globstar(opts)}${SLASH_LITERAL})?${slashDot}${star}${DOT_LITERAL}${ONE_CHAR}${star}`;

	      case '**/.*':
	        return `(?:${nodot}${globstar(opts)}${SLASH_LITERAL})?${DOT_LITERAL}${ONE_CHAR}${star}`;

	      default: {
	        const match = /^(.*?)\.(\w+)$/.exec(str);
	        if (!match) return;

	        const source = create(match[1]);
	        if (!source) return;

	        return source + DOT_LITERAL + match[2];
	      }
	    }
	  };

	  const output = utils.removePrefix(input, state);
	  let source = create(output);

	  if (source && opts.strictSlashes !== true) {
	    source += `${SLASH_LITERAL}?`;
	  }

	  return source;
	};

	parse_1 = parse;
	return parse_1;
}

var picomatch_1;
var hasRequiredPicomatch$1;

function requirePicomatch$1 () {
	if (hasRequiredPicomatch$1) return picomatch_1;
	hasRequiredPicomatch$1 = 1;

	const path = require$$0$1;
	const scan = requireScan();
	const parse = requireParse();
	const utils = requireUtils();
	const constants = requireConstants();
	const isObject = val => val && typeof val === 'object' && !Array.isArray(val);

	/**
	 * Creates a matcher function from one or more glob patterns. The
	 * returned function takes a string to match as its first argument,
	 * and returns true if the string is a match. The returned matcher
	 * function also takes a boolean as the second argument that, when true,
	 * returns an object with additional information.
	 *
	 * ```js
	 * const picomatch = require('picomatch');
	 * // picomatch(glob[, options]);
	 *
	 * const isMatch = picomatch('*.!(*a)');
	 * console.log(isMatch('a.a')); //=> false
	 * console.log(isMatch('a.b')); //=> true
	 * ```
	 * @name picomatch
	 * @param {String|Array} `globs` One or more glob patterns.
	 * @param {Object=} `options`
	 * @return {Function=} Returns a matcher function.
	 * @api public
	 */

	const picomatch = (glob, options, returnState = false) => {
	  if (Array.isArray(glob)) {
	    const fns = glob.map(input => picomatch(input, options, returnState));
	    const arrayMatcher = str => {
	      for (const isMatch of fns) {
	        const state = isMatch(str);
	        if (state) return state;
	      }
	      return false;
	    };
	    return arrayMatcher;
	  }

	  const isState = isObject(glob) && glob.tokens && glob.input;

	  if (glob === '' || (typeof glob !== 'string' && !isState)) {
	    throw new TypeError('Expected pattern to be a non-empty string');
	  }

	  const opts = options || {};
	  const posix = utils.isWindows(options);
	  const regex = isState
	    ? picomatch.compileRe(glob, options)
	    : picomatch.makeRe(glob, options, false, true);

	  const state = regex.state;
	  delete regex.state;

	  let isIgnored = () => false;
	  if (opts.ignore) {
	    const ignoreOpts = { ...options, ignore: null, onMatch: null, onResult: null };
	    isIgnored = picomatch(opts.ignore, ignoreOpts, returnState);
	  }

	  const matcher = (input, returnObject = false) => {
	    const { isMatch, match, output } = picomatch.test(input, regex, options, { glob, posix });
	    const result = { glob, state, regex, posix, input, output, match, isMatch };

	    if (typeof opts.onResult === 'function') {
	      opts.onResult(result);
	    }

	    if (isMatch === false) {
	      result.isMatch = false;
	      return returnObject ? result : false;
	    }

	    if (isIgnored(input)) {
	      if (typeof opts.onIgnore === 'function') {
	        opts.onIgnore(result);
	      }
	      result.isMatch = false;
	      return returnObject ? result : false;
	    }

	    if (typeof opts.onMatch === 'function') {
	      opts.onMatch(result);
	    }
	    return returnObject ? result : true;
	  };

	  if (returnState) {
	    matcher.state = state;
	  }

	  return matcher;
	};

	/**
	 * Test `input` with the given `regex`. This is used by the main
	 * `picomatch()` function to test the input string.
	 *
	 * ```js
	 * const picomatch = require('picomatch');
	 * // picomatch.test(input, regex[, options]);
	 *
	 * console.log(picomatch.test('foo/bar', /^(?:([^/]*?)\/([^/]*?))$/));
	 * // { isMatch: true, match: [ 'foo/', 'foo', 'bar' ], output: 'foo/bar' }
	 * ```
	 * @param {String} `input` String to test.
	 * @param {RegExp} `regex`
	 * @return {Object} Returns an object with matching info.
	 * @api public
	 */

	picomatch.test = (input, regex, options, { glob, posix } = {}) => {
	  if (typeof input !== 'string') {
	    throw new TypeError('Expected input to be a string');
	  }

	  if (input === '') {
	    return { isMatch: false, output: '' };
	  }

	  const opts = options || {};
	  const format = opts.format || (posix ? utils.toPosixSlashes : null);
	  let match = input === glob;
	  let output = (match && format) ? format(input) : input;

	  if (match === false) {
	    output = format ? format(input) : input;
	    match = output === glob;
	  }

	  if (match === false || opts.capture === true) {
	    if (opts.matchBase === true || opts.basename === true) {
	      match = picomatch.matchBase(input, regex, options, posix);
	    } else {
	      match = regex.exec(output);
	    }
	  }

	  return { isMatch: Boolean(match), match, output };
	};

	/**
	 * Match the basename of a filepath.
	 *
	 * ```js
	 * const picomatch = require('picomatch');
	 * // picomatch.matchBase(input, glob[, options]);
	 * console.log(picomatch.matchBase('foo/bar.js', '*.js'); // true
	 * ```
	 * @param {String} `input` String to test.
	 * @param {RegExp|String} `glob` Glob pattern or regex created by [.makeRe](#makeRe).
	 * @return {Boolean}
	 * @api public
	 */

	picomatch.matchBase = (input, glob, options, posix = utils.isWindows(options)) => {
	  const regex = glob instanceof RegExp ? glob : picomatch.makeRe(glob, options);
	  return regex.test(path.basename(input));
	};

	/**
	 * Returns true if **any** of the given glob `patterns` match the specified `string`.
	 *
	 * ```js
	 * const picomatch = require('picomatch');
	 * // picomatch.isMatch(string, patterns[, options]);
	 *
	 * console.log(picomatch.isMatch('a.a', ['b.*', '*.a'])); //=> true
	 * console.log(picomatch.isMatch('a.a', 'b.*')); //=> false
	 * ```
	 * @param {String|Array} str The string to test.
	 * @param {String|Array} patterns One or more glob patterns to use for matching.
	 * @param {Object} [options] See available [options](#options).
	 * @return {Boolean} Returns true if any patterns match `str`
	 * @api public
	 */

	picomatch.isMatch = (str, patterns, options) => picomatch(patterns, options)(str);

	/**
	 * Parse a glob pattern to create the source string for a regular
	 * expression.
	 *
	 * ```js
	 * const picomatch = require('picomatch');
	 * const result = picomatch.parse(pattern[, options]);
	 * ```
	 * @param {String} `pattern`
	 * @param {Object} `options`
	 * @return {Object} Returns an object with useful properties and output to be used as a regex source string.
	 * @api public
	 */

	picomatch.parse = (pattern, options) => {
	  if (Array.isArray(pattern)) return pattern.map(p => picomatch.parse(p, options));
	  return parse(pattern, { ...options, fastpaths: false });
	};

	/**
	 * Scan a glob pattern to separate the pattern into segments.
	 *
	 * ```js
	 * const picomatch = require('picomatch');
	 * // picomatch.scan(input[, options]);
	 *
	 * const result = picomatch.scan('!./foo/*.js');
	 * console.log(result);
	 * { prefix: '!./',
	 *   input: '!./foo/*.js',
	 *   start: 3,
	 *   base: 'foo',
	 *   glob: '*.js',
	 *   isBrace: false,
	 *   isBracket: false,
	 *   isGlob: true,
	 *   isExtglob: false,
	 *   isGlobstar: false,
	 *   negated: true }
	 * ```
	 * @param {String} `input` Glob pattern to scan.
	 * @param {Object} `options`
	 * @return {Object} Returns an object with
	 * @api public
	 */

	picomatch.scan = (input, options) => scan(input, options);

	/**
	 * Compile a regular expression from the `state` object returned by the
	 * [parse()](#parse) method.
	 *
	 * @param {Object} `state`
	 * @param {Object} `options`
	 * @param {Boolean} `returnOutput` Intended for implementors, this argument allows you to return the raw output from the parser.
	 * @param {Boolean} `returnState` Adds the state to a `state` property on the returned regex. Useful for implementors and debugging.
	 * @return {RegExp}
	 * @api public
	 */

	picomatch.compileRe = (state, options, returnOutput = false, returnState = false) => {
	  if (returnOutput === true) {
	    return state.output;
	  }

	  const opts = options || {};
	  const prepend = opts.contains ? '' : '^';
	  const append = opts.contains ? '' : '$';

	  let source = `${prepend}(?:${state.output})${append}`;
	  if (state && state.negated === true) {
	    source = `^(?!${source}).*$`;
	  }

	  const regex = picomatch.toRegex(source, options);
	  if (returnState === true) {
	    regex.state = state;
	  }

	  return regex;
	};

	/**
	 * Create a regular expression from a parsed glob pattern.
	 *
	 * ```js
	 * const picomatch = require('picomatch');
	 * const state = picomatch.parse('*.js');
	 * // picomatch.compileRe(state[, options]);
	 *
	 * console.log(picomatch.compileRe(state));
	 * //=> /^(?:(?!\.)(?=.)[^/]*?\.js)$/
	 * ```
	 * @param {String} `state` The object returned from the `.parse` method.
	 * @param {Object} `options`
	 * @param {Boolean} `returnOutput` Implementors may use this argument to return the compiled output, instead of a regular expression. This is not exposed on the options to prevent end-users from mutating the result.
	 * @param {Boolean} `returnState` Implementors may use this argument to return the state from the parsed glob with the returned regular expression.
	 * @return {RegExp} Returns a regex created from the given pattern.
	 * @api public
	 */

	picomatch.makeRe = (input, options = {}, returnOutput = false, returnState = false) => {
	  if (!input || typeof input !== 'string') {
	    throw new TypeError('Expected a non-empty string');
	  }

	  let parsed = { negated: false, fastpaths: true };

	  if (options.fastpaths !== false && (input[0] === '.' || input[0] === '*')) {
	    parsed.output = parse.fastpaths(input, options);
	  }

	  if (!parsed.output) {
	    parsed = parse(input, options);
	  }

	  return picomatch.compileRe(parsed, options, returnOutput, returnState);
	};

	/**
	 * Create a regular expression from the given regex source string.
	 *
	 * ```js
	 * const picomatch = require('picomatch');
	 * // picomatch.toRegex(source[, options]);
	 *
	 * const { output } = picomatch.parse('*.js');
	 * console.log(picomatch.toRegex(output));
	 * //=> /^(?:(?!\.)(?=.)[^/]*?\.js)$/
	 * ```
	 * @param {String} `source` Regular expression source string.
	 * @param {Object} `options`
	 * @return {RegExp}
	 * @api public
	 */

	picomatch.toRegex = (source, options) => {
	  try {
	    const opts = options || {};
	    return new RegExp(source, opts.flags || (opts.nocase ? 'i' : ''));
	  } catch (err) {
	    if (options && options.debug === true) throw err;
	    return /$^/;
	  }
	};

	/**
	 * Picomatch constants.
	 * @return {Object}
	 */

	picomatch.constants = constants;

	/**
	 * Expose "picomatch"
	 */

	picomatch_1 = picomatch;
	return picomatch_1;
}

var picomatch;
var hasRequiredPicomatch;

function requirePicomatch () {
	if (hasRequiredPicomatch) return picomatch;
	hasRequiredPicomatch = 1;

	picomatch = requirePicomatch$1();
	return picomatch;
}

var micromatch_1;
var hasRequiredMicromatch;

function requireMicromatch () {
	if (hasRequiredMicromatch) return micromatch_1;
	hasRequiredMicromatch = 1;

	const util = require$$0;
	const braces = requireBraces();
	const picomatch = requirePicomatch();
	const utils = requireUtils();

	const isEmptyString = v => v === '' || v === './';
	const hasBraces = v => {
	  const index = v.indexOf('{');
	  return index > -1 && v.indexOf('}', index) > -1;
	};

	/**
	 * Returns an array of strings that match one or more glob patterns.
	 *
	 * ```js
	 * const mm = require('micromatch');
	 * // mm(list, patterns[, options]);
	 *
	 * console.log(mm(['a.js', 'a.txt'], ['*.js']));
	 * //=> [ 'a.js' ]
	 * ```
	 * @param {String|Array<string>} `list` List of strings to match.
	 * @param {String|Array<string>} `patterns` One or more glob patterns to use for matching.
	 * @param {Object} `options` See available [options](#options)
	 * @return {Array} Returns an array of matches
	 * @summary false
	 * @api public
	 */

	const micromatch = (list, patterns, options) => {
	  patterns = [].concat(patterns);
	  list = [].concat(list);

	  let omit = new Set();
	  let keep = new Set();
	  let items = new Set();
	  let negatives = 0;

	  let onResult = state => {
	    items.add(state.output);
	    if (options && options.onResult) {
	      options.onResult(state);
	    }
	  };

	  for (let i = 0; i < patterns.length; i++) {
	    let isMatch = picomatch(String(patterns[i]), { ...options, onResult }, true);
	    let negated = isMatch.state.negated || isMatch.state.negatedExtglob;
	    if (negated) negatives++;

	    for (let item of list) {
	      let matched = isMatch(item, true);

	      let match = negated ? !matched.isMatch : matched.isMatch;
	      if (!match) continue;

	      if (negated) {
	        omit.add(matched.output);
	      } else {
	        omit.delete(matched.output);
	        keep.add(matched.output);
	      }
	    }
	  }

	  let result = negatives === patterns.length ? [...items] : [...keep];
	  let matches = result.filter(item => !omit.has(item));

	  if (options && matches.length === 0) {
	    if (options.failglob === true) {
	      throw new Error(`No matches found for "${patterns.join(', ')}"`);
	    }

	    if (options.nonull === true || options.nullglob === true) {
	      return options.unescape ? patterns.map(p => p.replace(/\\/g, '')) : patterns;
	    }
	  }

	  return matches;
	};

	/**
	 * Backwards compatibility
	 */

	micromatch.match = micromatch;

	/**
	 * Returns a matcher function from the given glob `pattern` and `options`.
	 * The returned function takes a string to match as its only argument and returns
	 * true if the string is a match.
	 *
	 * ```js
	 * const mm = require('micromatch');
	 * // mm.matcher(pattern[, options]);
	 *
	 * const isMatch = mm.matcher('*.!(*a)');
	 * console.log(isMatch('a.a')); //=> false
	 * console.log(isMatch('a.b')); //=> true
	 * ```
	 * @param {String} `pattern` Glob pattern
	 * @param {Object} `options`
	 * @return {Function} Returns a matcher function.
	 * @api public
	 */

	micromatch.matcher = (pattern, options) => picomatch(pattern, options);

	/**
	 * Returns true if **any** of the given glob `patterns` match the specified `string`.
	 *
	 * ```js
	 * const mm = require('micromatch');
	 * // mm.isMatch(string, patterns[, options]);
	 *
	 * console.log(mm.isMatch('a.a', ['b.*', '*.a'])); //=> true
	 * console.log(mm.isMatch('a.a', 'b.*')); //=> false
	 * ```
	 * @param {String} `str` The string to test.
	 * @param {String|Array} `patterns` One or more glob patterns to use for matching.
	 * @param {Object} `[options]` See available [options](#options).
	 * @return {Boolean} Returns true if any patterns match `str`
	 * @api public
	 */

	micromatch.isMatch = (str, patterns, options) => picomatch(patterns, options)(str);

	/**
	 * Backwards compatibility
	 */

	micromatch.any = micromatch.isMatch;

	/**
	 * Returns a list of strings that _**do not match any**_ of the given `patterns`.
	 *
	 * ```js
	 * const mm = require('micromatch');
	 * // mm.not(list, patterns[, options]);
	 *
	 * console.log(mm.not(['a.a', 'b.b', 'c.c'], '*.a'));
	 * //=> ['b.b', 'c.c']
	 * ```
	 * @param {Array} `list` Array of strings to match.
	 * @param {String|Array} `patterns` One or more glob pattern to use for matching.
	 * @param {Object} `options` See available [options](#options) for changing how matches are performed
	 * @return {Array} Returns an array of strings that **do not match** the given patterns.
	 * @api public
	 */

	micromatch.not = (list, patterns, options = {}) => {
	  patterns = [].concat(patterns).map(String);
	  let result = new Set();
	  let items = [];

	  let onResult = state => {
	    if (options.onResult) options.onResult(state);
	    items.push(state.output);
	  };

	  let matches = new Set(micromatch(list, patterns, { ...options, onResult }));

	  for (let item of items) {
	    if (!matches.has(item)) {
	      result.add(item);
	    }
	  }
	  return [...result];
	};

	/**
	 * Returns true if the given `string` contains the given pattern. Similar
	 * to [.isMatch](#isMatch) but the pattern can match any part of the string.
	 *
	 * ```js
	 * var mm = require('micromatch');
	 * // mm.contains(string, pattern[, options]);
	 *
	 * console.log(mm.contains('aa/bb/cc', '*b'));
	 * //=> true
	 * console.log(mm.contains('aa/bb/cc', '*d'));
	 * //=> false
	 * ```
	 * @param {String} `str` The string to match.
	 * @param {String|Array} `patterns` Glob pattern to use for matching.
	 * @param {Object} `options` See available [options](#options) for changing how matches are performed
	 * @return {Boolean} Returns true if any of the patterns matches any part of `str`.
	 * @api public
	 */

	micromatch.contains = (str, pattern, options) => {
	  if (typeof str !== 'string') {
	    throw new TypeError(`Expected a string: "${util.inspect(str)}"`);
	  }

	  if (Array.isArray(pattern)) {
	    return pattern.some(p => micromatch.contains(str, p, options));
	  }

	  if (typeof pattern === 'string') {
	    if (isEmptyString(str) || isEmptyString(pattern)) {
	      return false;
	    }

	    if (str.includes(pattern) || (str.startsWith('./') && str.slice(2).includes(pattern))) {
	      return true;
	    }
	  }

	  return micromatch.isMatch(str, pattern, { ...options, contains: true });
	};

	/**
	 * Filter the keys of the given object with the given `glob` pattern
	 * and `options`. Does not attempt to match nested keys. If you need this feature,
	 * use [glob-object][] instead.
	 *
	 * ```js
	 * const mm = require('micromatch');
	 * // mm.matchKeys(object, patterns[, options]);
	 *
	 * const obj = { aa: 'a', ab: 'b', ac: 'c' };
	 * console.log(mm.matchKeys(obj, '*b'));
	 * //=> { ab: 'b' }
	 * ```
	 * @param {Object} `object` The object with keys to filter.
	 * @param {String|Array} `patterns` One or more glob patterns to use for matching.
	 * @param {Object} `options` See available [options](#options) for changing how matches are performed
	 * @return {Object} Returns an object with only keys that match the given patterns.
	 * @api public
	 */

	micromatch.matchKeys = (obj, patterns, options) => {
	  if (!utils.isObject(obj)) {
	    throw new TypeError('Expected the first argument to be an object');
	  }
	  let keys = micromatch(Object.keys(obj), patterns, options);
	  let res = {};
	  for (let key of keys) res[key] = obj[key];
	  return res;
	};

	/**
	 * Returns true if some of the strings in the given `list` match any of the given glob `patterns`.
	 *
	 * ```js
	 * const mm = require('micromatch');
	 * // mm.some(list, patterns[, options]);
	 *
	 * console.log(mm.some(['foo.js', 'bar.js'], ['*.js', '!foo.js']));
	 * // true
	 * console.log(mm.some(['foo.js'], ['*.js', '!foo.js']));
	 * // false
	 * ```
	 * @param {String|Array} `list` The string or array of strings to test. Returns as soon as the first match is found.
	 * @param {String|Array} `patterns` One or more glob patterns to use for matching.
	 * @param {Object} `options` See available [options](#options) for changing how matches are performed
	 * @return {Boolean} Returns true if any `patterns` matches any of the strings in `list`
	 * @api public
	 */

	micromatch.some = (list, patterns, options) => {
	  let items = [].concat(list);

	  for (let pattern of [].concat(patterns)) {
	    let isMatch = picomatch(String(pattern), options);
	    if (items.some(item => isMatch(item))) {
	      return true;
	    }
	  }
	  return false;
	};

	/**
	 * Returns true if every string in the given `list` matches
	 * any of the given glob `patterns`.
	 *
	 * ```js
	 * const mm = require('micromatch');
	 * // mm.every(list, patterns[, options]);
	 *
	 * console.log(mm.every('foo.js', ['foo.js']));
	 * // true
	 * console.log(mm.every(['foo.js', 'bar.js'], ['*.js']));
	 * // true
	 * console.log(mm.every(['foo.js', 'bar.js'], ['*.js', '!foo.js']));
	 * // false
	 * console.log(mm.every(['foo.js'], ['*.js', '!foo.js']));
	 * // false
	 * ```
	 * @param {String|Array} `list` The string or array of strings to test.
	 * @param {String|Array} `patterns` One or more glob patterns to use for matching.
	 * @param {Object} `options` See available [options](#options) for changing how matches are performed
	 * @return {Boolean} Returns true if all `patterns` matches all of the strings in `list`
	 * @api public
	 */

	micromatch.every = (list, patterns, options) => {
	  let items = [].concat(list);

	  for (let pattern of [].concat(patterns)) {
	    let isMatch = picomatch(String(pattern), options);
	    if (!items.every(item => isMatch(item))) {
	      return false;
	    }
	  }
	  return true;
	};

	/**
	 * Returns true if **all** of the given `patterns` match
	 * the specified string.
	 *
	 * ```js
	 * const mm = require('micromatch');
	 * // mm.all(string, patterns[, options]);
	 *
	 * console.log(mm.all('foo.js', ['foo.js']));
	 * // true
	 *
	 * console.log(mm.all('foo.js', ['*.js', '!foo.js']));
	 * // false
	 *
	 * console.log(mm.all('foo.js', ['*.js', 'foo.js']));
	 * // true
	 *
	 * console.log(mm.all('foo.js', ['*.js', 'f*', '*o*', '*o.js']));
	 * // true
	 * ```
	 * @param {String|Array} `str` The string to test.
	 * @param {String|Array} `patterns` One or more glob patterns to use for matching.
	 * @param {Object} `options` See available [options](#options) for changing how matches are performed
	 * @return {Boolean} Returns true if any patterns match `str`
	 * @api public
	 */

	micromatch.all = (str, patterns, options) => {
	  if (typeof str !== 'string') {
	    throw new TypeError(`Expected a string: "${util.inspect(str)}"`);
	  }

	  return [].concat(patterns).every(p => picomatch(p, options)(str));
	};

	/**
	 * Returns an array of matches captured by `pattern` in `string, or `null` if the pattern did not match.
	 *
	 * ```js
	 * const mm = require('micromatch');
	 * // mm.capture(pattern, string[, options]);
	 *
	 * console.log(mm.capture('test/*.js', 'test/foo.js'));
	 * //=> ['foo']
	 * console.log(mm.capture('test/*.js', 'foo/bar.css'));
	 * //=> null
	 * ```
	 * @param {String} `glob` Glob pattern to use for matching.
	 * @param {String} `input` String to match
	 * @param {Object} `options` See available [options](#options) for changing how matches are performed
	 * @return {Array|null} Returns an array of captures if the input matches the glob pattern, otherwise `null`.
	 * @api public
	 */

	micromatch.capture = (glob, input, options) => {
	  let posix = utils.isWindows(options);
	  let regex = picomatch.makeRe(String(glob), { ...options, capture: true });
	  let match = regex.exec(posix ? utils.toPosixSlashes(input) : input);

	  if (match) {
	    return match.slice(1).map(v => v === void 0 ? '' : v);
	  }
	};

	/**
	 * Create a regular expression from the given glob `pattern`.
	 *
	 * ```js
	 * const mm = require('micromatch');
	 * // mm.makeRe(pattern[, options]);
	 *
	 * console.log(mm.makeRe('*.js'));
	 * //=> /^(?:(\.[\\\/])?(?!\.)(?=.)[^\/]*?\.js)$/
	 * ```
	 * @param {String} `pattern` A glob pattern to convert to regex.
	 * @param {Object} `options`
	 * @return {RegExp} Returns a regex created from the given pattern.
	 * @api public
	 */

	micromatch.makeRe = (...args) => picomatch.makeRe(...args);

	/**
	 * Scan a glob pattern to separate the pattern into segments. Used
	 * by the [split](#split) method.
	 *
	 * ```js
	 * const mm = require('micromatch');
	 * const state = mm.scan(pattern[, options]);
	 * ```
	 * @param {String} `pattern`
	 * @param {Object} `options`
	 * @return {Object} Returns an object with
	 * @api public
	 */

	micromatch.scan = (...args) => picomatch.scan(...args);

	/**
	 * Parse a glob pattern to create the source string for a regular
	 * expression.
	 *
	 * ```js
	 * const mm = require('micromatch');
	 * const state = mm.parse(pattern[, options]);
	 * ```
	 * @param {String} `glob`
	 * @param {Object} `options`
	 * @return {Object} Returns an object with useful properties and output to be used as regex source string.
	 * @api public
	 */

	micromatch.parse = (patterns, options) => {
	  let res = [];
	  for (let pattern of [].concat(patterns || [])) {
	    for (let str of braces(String(pattern), options)) {
	      res.push(picomatch.parse(str, options));
	    }
	  }
	  return res;
	};

	/**
	 * Process the given brace `pattern`.
	 *
	 * ```js
	 * const { braces } = require('micromatch');
	 * console.log(braces('foo/{a,b,c}/bar'));
	 * //=> [ 'foo/(a|b|c)/bar' ]
	 *
	 * console.log(braces('foo/{a,b,c}/bar', { expand: true }));
	 * //=> [ 'foo/a/bar', 'foo/b/bar', 'foo/c/bar' ]
	 * ```
	 * @param {String} `pattern` String with brace pattern to process.
	 * @param {Object} `options` Any [options](#options) to change how expansion is performed. See the [braces][] library for all available options.
	 * @return {Array}
	 * @api public
	 */

	micromatch.braces = (pattern, options) => {
	  if (typeof pattern !== 'string') throw new TypeError('Expected a string');
	  if ((options && options.nobrace === true) || !hasBraces(pattern)) {
	    return [pattern];
	  }
	  return braces(pattern, options);
	};

	/**
	 * Expand braces
	 */

	micromatch.braceExpand = (pattern, options) => {
	  if (typeof pattern !== 'string') throw new TypeError('Expected a string');
	  return micromatch.braces(pattern, { ...options, expand: true });
	};

	/**
	 * Expose micromatch
	 */

	// exposed for tests
	micromatch.hasBraces = hasBraces;
	micromatch_1 = micromatch;
	return micromatch_1;
}

var micromatchExports = requireMicromatch();
var mm = /*@__PURE__*/getDefaultExportFromCjs(micromatchExports);

const envsOrder = [
	"node",
	"jsdom",
	"happy-dom",
	"edge-runtime"
];
function getTransformMode(patterns, filename) {
	if (patterns.web && mm.isMatch(filename, patterns.web)) {
		return "web";
	}
	if (patterns.ssr && mm.isMatch(filename, patterns.ssr)) {
		return "ssr";
	}
	return undefined;
}
async function groupFilesByEnv(files) {
	const filesWithEnv = await Promise.all(files.map(async ({ moduleId: filepath, project, testLines }) => {
		const code = await promises$1.readFile(filepath, "utf-8");
		let env = code.match(/@(?:vitest|jest)-environment\s+([\w-]+)\b/)?.[1];
		if (!env) {
			for (const [glob, target] of project.config.environmentMatchGlobs || []) {
				if (mm.isMatch(filepath, glob, { cwd: project.config.root })) {
					env = target;
					break;
				}
			}
		}
		env ||= project.config.environment || "node";
		const transformMode = getTransformMode(project.config.testTransformMode, filepath);
		let envOptionsJson = code.match(/@(?:vitest|jest)-environment-options\s+(.+)/)?.[1];
		if (envOptionsJson?.endsWith("*/")) {
			envOptionsJson = envOptionsJson.slice(0, -2);
		}
		const envOptions = JSON.parse(envOptionsJson || "null");
		const envKey = env === "happy-dom" ? "happyDOM" : env;
		const environment = {
			name: env,
			transformMode,
			options: envOptions ? { [envKey]: envOptions } : null
		};
		return {
			file: {
				filepath,
				testLocations: testLines
			},
			project,
			environment
		};
	}));
	return groupBy(filesWithEnv, ({ environment }) => environment.name);
}

const created = new Set();
const promises = new Map();
function createMethodsRPC(project, options = {}) {
	const ctx = project.vitest;
	const cacheFs = options.cacheFs ?? false;
	return {
		snapshotSaved(snapshot) {
			ctx.snapshot.add(snapshot);
		},
		resolveSnapshotPath(testPath) {
			return ctx.snapshot.resolvePath(testPath, { config: project.serializedConfig });
		},
		async getSourceMap(id, force) {
			if (force) {
				const mod = project.vite.moduleGraph.getModuleById(id);
				if (mod) {
					project.vite.moduleGraph.invalidateModule(mod);
				}
			}
			const r = await project.vitenode.transformRequest(id);
			return r?.map;
		},
		async fetch(id, transformMode) {
			const result = await project.vitenode.fetchResult(id, transformMode).catch(handleRollupError);
			const code = result.code;
			if (!cacheFs || result.externalize) {
				return result;
			}
			if ("id" in result && typeof result.id === "string") {
				return { id: result.id };
			}
			if (code == null) {
				throw new Error(`Failed to fetch module ${id}`);
			}
			const dir = join$1(project.tmpDir, transformMode);
			const name = hash("sha1", id, "hex");
			const tmp = join$1(dir, name);
			if (!created.has(dir)) {
				mkdirSync(dir, { recursive: true });
				created.add(dir);
			}
			if (promises.has(tmp)) {
				await promises.get(tmp);
				return { id: tmp };
			}
			promises.set(tmp, atomicWriteFile(tmp, code).catch(() => writeFile(tmp, code, "utf-8")).finally(() => promises.delete(tmp)));
			await promises.get(tmp);
			Object.assign(result, { id: tmp });
			return { id: tmp };
		},
		resolveId(id, importer, transformMode) {
			return project.vitenode.resolveId(id, importer, transformMode).catch(handleRollupError);
		},
		transform(id, environment) {
			return project.vitenode.transformModule(id, environment).catch(handleRollupError);
		},
		async onQueued(file) {
			if (options.collect) {
				ctx.state.collectFiles(project, [file]);
			} else {
				await ctx._testRun.enqueued(project, file);
			}
		},
		async onCollected(files) {
			if (options.collect) {
				ctx.state.collectFiles(project, files);
			} else {
				await ctx._testRun.collected(project, files);
			}
		},
		onAfterSuiteRun(meta) {
			ctx.coverageProvider?.onAfterSuiteRun(meta);
		},
		async onTaskUpdate(packs, events) {
			if (options.collect) {
				ctx.state.updateTasks(packs);
			} else {
				await ctx._testRun.updated(packs, events);
			}
		},
		async onUserConsoleLog(log) {
			if (options.collect) {
				ctx.state.updateUserLog(log);
			} else {
				await ctx._testRun.log(log);
			}
		},
		onUnhandledError(err, type) {
			ctx.state.catchError(err, type);
		},
		onCancel(reason) {
			ctx.cancelCurrentRun(reason);
		},
		getCountOfFailedTests() {
			return ctx.state.getCountOfFailedTests();
		}
	};
}
function handleRollupError(e) {
	if (e instanceof Error && ("plugin" in e || "frame" in e || "id" in e)) {
		throw {
			name: e.name,
			message: e.message,
			stack: e.stack,
			cause: e.cause,
			__vitest_rollup_error__: {
				plugin: e.plugin,
				id: e.id,
				loc: e.loc,
				frame: e.frame
			}
		};
	}
	throw e;
}
/**
* Performs an atomic write operation using the write-then-rename pattern.
*
* Why we need this:
* - Ensures file integrity by never leaving partially written files on disk
* - Prevents other processes from reading incomplete data during writes
* - Particularly important for test files where incomplete writes could cause test failures
*
* The implementation writes to a temporary file first, then renames it to the target path.
* This rename operation is atomic on most filesystems (including POSIX-compliant ones),
* guaranteeing that other processes will only ever see the complete file.
*
* Added in https://github.com/vitest-dev/vitest/pull/7531
*/
async function atomicWriteFile(realFilePath, data) {
	const dir = dirname(realFilePath);
	const tmpFilePath = join$1(dir, `.tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`);
	try {
		await writeFile(tmpFilePath, data, "utf-8");
		await rename(tmpFilePath, realFilePath);
	} finally {
		try {
			if (await stat(tmpFilePath)) {
				await unlink(tmpFilePath);
			}
		} catch {}
	}
}

function createChildProcessChannel$1(project, collect = false) {
	const emitter = new EventEmitter();
	const cleanup = () => emitter.removeAllListeners();
	const events = {
		message: "message",
		response: "response"
	};
	const channel = {
		onMessage: (callback) => emitter.on(events.message, callback),
		postMessage: (message) => emitter.emit(events.response, message)
	};
	const rpc = createBirpc(createMethodsRPC(project, {
		cacheFs: true,
		collect
	}), {
		eventNames: ["onCancel"],
		serialize: v8.serialize,
		deserialize: (v) => v8.deserialize(Buffer.from(v)),
		post(v) {
			emitter.emit(events.message, v);
		},
		on(fn) {
			emitter.on(events.response, fn);
		},
		onTimeoutError(functionName) {
			throw new Error(`[vitest-pool]: Timeout calling "${functionName}"`);
		}
	});
	project.ctx.onCancel((reason) => rpc.onCancel(reason));
	return {
		channel,
		cleanup
	};
}
function createForksPool(ctx, { execArgv, env }) {
	const numCpus = typeof nodeos.availableParallelism === "function" ? nodeos.availableParallelism() : nodeos.cpus().length;
	const threadsCount = ctx.config.watch ? Math.max(Math.floor(numCpus / 2), 1) : Math.max(numCpus - 1, 1);
	const poolOptions = ctx.config.poolOptions?.forks ?? {};
	const maxThreads = poolOptions.maxForks ?? ctx.config.maxWorkers ?? threadsCount;
	const minThreads = poolOptions.minForks ?? ctx.config.minWorkers ?? threadsCount;
	const worker = resolve$1(ctx.distPath, "workers/forks.js");
	const options = {
		runtime: "child_process",
		filename: resolve$1(ctx.distPath, "worker.js"),
		maxThreads,
		minThreads,
		env,
		execArgv: [...poolOptions.execArgv ?? [], ...execArgv],
		terminateTimeout: ctx.config.teardownTimeout,
		concurrentTasksPerWorker: 1
	};
	const isolated = poolOptions.isolate ?? true;
	if (isolated) {
		options.isolateWorkers = true;
	}
	if (poolOptions.singleFork || !ctx.config.fileParallelism) {
		options.maxThreads = 1;
		options.minThreads = 1;
	}
	const pool = new Tinypool(options);
	const runWithFiles = (name) => {
		let id = 0;
		async function runFiles(project, config, files, environment, invalidates = []) {
			const paths = files.map((f) => f.filepath);
			ctx.state.clearFiles(project, paths);
			const { channel, cleanup } = createChildProcessChannel$1(project, name === "collect");
			const workerId = ++id;
			const data = {
				pool: "forks",
				worker,
				config,
				files,
				invalidates,
				environment,
				workerId,
				projectName: project.name,
				providedContext: project.getProvidedContext()
			};
			try {
				await pool.run(data, {
					name,
					channel
				});
			} catch (error) {
				if (error instanceof Error && /Failed to terminate worker/.test(error.message)) {
					ctx.state.addProcessTimeoutCause(`Failed to terminate worker while running ${paths.join(", ")}.`);
				} else if (ctx.isCancelling && error instanceof Error && /The task has been cancelled/.test(error.message)) {
					ctx.state.cancelFiles(paths, project);
				} else {
					throw error;
				}
			} finally {
				cleanup();
			}
		}
		return async (specs, invalidates) => {
			ctx.onCancel(() => pool.cancelPendingTasks());
			const configs = new WeakMap();
			const getConfig = (project) => {
				if (configs.has(project)) {
					return configs.get(project);
				}
				const _config = project.getSerializableConfig();
				const config = wrapSerializableConfig(_config);
				configs.set(project, config);
				return config;
			};
			const singleFork = specs.filter((spec) => spec.project.config.poolOptions?.forks?.singleFork);
			const multipleForks = specs.filter((spec) => !spec.project.config.poolOptions?.forks?.singleFork);
			if (multipleForks.length) {
				const filesByEnv = await groupFilesByEnv(multipleForks);
				const files = Object.values(filesByEnv).flat();
				const results = [];
				if (isolated) {
					results.push(...await Promise.allSettled(files.map(({ file, environment, project }) => runFiles(project, getConfig(project), [file], environment, invalidates))));
				} else {
					const grouped = groupBy(files, ({ project, environment }) => project.name + environment.name + JSON.stringify(environment.options));
					for (const group of Object.values(grouped)) {
						results.push(...await Promise.allSettled(group.map(({ file, environment, project }) => runFiles(project, getConfig(project), [file], environment, invalidates))));
						await new Promise((resolve) => pool.queueSize === 0 ? resolve() : pool.once("drain", resolve));
						await pool.recycleWorkers();
					}
				}
				const errors = results.filter((r) => r.status === "rejected").map((r) => r.reason);
				if (errors.length > 0) {
					throw new AggregateError(errors, "Errors occurred while running tests. For more information, see serialized error.");
				}
			}
			if (singleFork.length) {
				const filesByEnv = await groupFilesByEnv(singleFork);
				const envs = envsOrder.concat(Object.keys(filesByEnv).filter((env) => !envsOrder.includes(env)));
				for (const env of envs) {
					const files = filesByEnv[env];
					if (!files?.length) {
						continue;
					}
					const filesByOptions = groupBy(files, ({ project, environment }) => project.name + JSON.stringify(environment.options));
					for (const files of Object.values(filesByOptions)) {
						await pool.recycleWorkers();
						const filenames = files.map((f) => f.file);
						await runFiles(files[0].project, getConfig(files[0].project), filenames, files[0].environment, invalidates);
					}
				}
			}
		};
	};
	return {
		name: "forks",
		runTests: runWithFiles("run"),
		collectTests: runWithFiles("collect"),
		close: () => pool.destroy()
	};
}

function createWorkerChannel$1(project, collect) {
	const channel = new MessageChannel();
	const port = channel.port2;
	const workerPort = channel.port1;
	const rpc = createBirpc(createMethodsRPC(project, { collect }), {
		eventNames: ["onCancel"],
		post(v) {
			port.postMessage(v);
		},
		on(fn) {
			port.on("message", fn);
		},
		onTimeoutError(functionName) {
			throw new Error(`[vitest-pool]: Timeout calling "${functionName}"`);
		}
	});
	project.ctx.onCancel((reason) => rpc.onCancel(reason));
	return {
		workerPort,
		port
	};
}
function createThreadsPool(ctx, { execArgv, env }) {
	const numCpus = typeof nodeos.availableParallelism === "function" ? nodeos.availableParallelism() : nodeos.cpus().length;
	const threadsCount = ctx.config.watch ? Math.max(Math.floor(numCpus / 2), 1) : Math.max(numCpus - 1, 1);
	const poolOptions = ctx.config.poolOptions?.threads ?? {};
	const maxThreads = poolOptions.maxThreads ?? ctx.config.maxWorkers ?? threadsCount;
	const minThreads = poolOptions.minThreads ?? ctx.config.minWorkers ?? threadsCount;
	const worker = resolve$1(ctx.distPath, "workers/threads.js");
	const options = {
		filename: resolve$1(ctx.distPath, "worker.js"),
		useAtomics: poolOptions.useAtomics ?? false,
		maxThreads,
		minThreads,
		env,
		execArgv: [...poolOptions.execArgv ?? [], ...execArgv],
		terminateTimeout: ctx.config.teardownTimeout,
		concurrentTasksPerWorker: 1
	};
	const isolated = poolOptions.isolate ?? true;
	if (isolated) {
		options.isolateWorkers = true;
	}
	if (poolOptions.singleThread || !ctx.config.fileParallelism) {
		options.maxThreads = 1;
		options.minThreads = 1;
	}
	const pool = new Tinypool$1(options);
	const runWithFiles = (name) => {
		let id = 0;
		async function runFiles(project, config, files, environment, invalidates = []) {
			const paths = files.map((f) => f.filepath);
			ctx.state.clearFiles(project, paths);
			const { workerPort, port } = createWorkerChannel$1(project, name === "collect");
			const workerId = ++id;
			const data = {
				pool: "threads",
				worker,
				port: workerPort,
				config,
				files,
				invalidates,
				environment,
				workerId,
				projectName: project.name,
				providedContext: project.getProvidedContext()
			};
			try {
				await pool.run(data, {
					transferList: [workerPort],
					name
				});
			} catch (error) {
				if (error instanceof Error && /Failed to terminate worker/.test(error.message)) {
					ctx.state.addProcessTimeoutCause(`Failed to terminate worker while running ${paths.join(", ")}. \nSee https://vitest.dev/guide/common-errors.html#failed-to-terminate-worker for troubleshooting.`);
				} else if (ctx.isCancelling && error instanceof Error && /The task has been cancelled/.test(error.message)) {
					ctx.state.cancelFiles(paths, project);
				} else {
					throw error;
				}
			} finally {
				port.close();
				workerPort.close();
			}
		}
		return async (specs, invalidates) => {
			ctx.onCancel(() => pool.cancelPendingTasks());
			const configs = new WeakMap();
			const getConfig = (project) => {
				if (configs.has(project)) {
					return configs.get(project);
				}
				const config = project.getSerializableConfig();
				configs.set(project, config);
				return config;
			};
			const singleThreads = specs.filter((spec) => spec.project.config.poolOptions?.threads?.singleThread);
			const multipleThreads = specs.filter((spec) => !spec.project.config.poolOptions?.threads?.singleThread);
			if (multipleThreads.length) {
				const filesByEnv = await groupFilesByEnv(multipleThreads);
				const files = Object.values(filesByEnv).flat();
				const results = [];
				if (isolated) {
					results.push(...await Promise.allSettled(files.map(({ file, environment, project }) => runFiles(project, getConfig(project), [file], environment, invalidates))));
				} else {
					const grouped = groupBy(files, ({ project, environment }) => project.name + environment.name + JSON.stringify(environment.options));
					for (const group of Object.values(grouped)) {
						results.push(...await Promise.allSettled(group.map(({ file, environment, project }) => runFiles(project, getConfig(project), [file], environment, invalidates))));
						await new Promise((resolve) => pool.queueSize === 0 ? resolve() : pool.once("drain", resolve));
						await pool.recycleWorkers();
					}
				}
				const errors = results.filter((r) => r.status === "rejected").map((r) => r.reason);
				if (errors.length > 0) {
					throw new AggregateError(errors, "Errors occurred while running tests. For more information, see serialized error.");
				}
			}
			if (singleThreads.length) {
				const filesByEnv = await groupFilesByEnv(singleThreads);
				const envs = envsOrder.concat(Object.keys(filesByEnv).filter((env) => !envsOrder.includes(env)));
				for (const env of envs) {
					const files = filesByEnv[env];
					if (!files?.length) {
						continue;
					}
					const filesByOptions = groupBy(files, ({ project, environment }) => project.name + JSON.stringify(environment.options));
					for (const files of Object.values(filesByOptions)) {
						await pool.recycleWorkers();
						const filenames = files.map((f) => f.file);
						await runFiles(files[0].project, getConfig(files[0].project), filenames, files[0].environment, invalidates);
					}
				}
			}
		};
	};
	return {
		name: "threads",
		runTests: runWithFiles("run"),
		collectTests: runWithFiles("collect"),
		close: () => pool.destroy()
	};
}

function createTypecheckPool(ctx) {
	const promisesMap = new WeakMap();
	const rerunTriggered = new WeakSet();
	async function onParseEnd(project, { files, sourceErrors }) {
		const checker = project.typechecker;
		const { packs, events } = checker.getTestPacksAndEvents();
		await ctx._testRun.updated(packs, events);
		if (!project.config.typecheck.ignoreSourceErrors) {
			sourceErrors.forEach((error) => ctx.state.catchError(error, "Unhandled Source Error"));
		}
		const processError = !hasFailed(files) && !sourceErrors.length && checker.getExitCode();
		if (processError) {
			const error = new Error(checker.getOutput());
			error.stack = "";
			ctx.state.catchError(error, "Typecheck Error");
		}
		promisesMap.get(project)?.resolve();
		rerunTriggered.delete(project);
		if (ctx.config.watch && !ctx.runningPromise) {
			await ctx.report("onFinished", files, []);
			await ctx.report("onWatcherStart", files, [...project.config.typecheck.ignoreSourceErrors ? [] : sourceErrors, ...ctx.state.getUnhandledErrors()]);
		}
	}
	async function createWorkspaceTypechecker(project, files) {
		const checker = project.typechecker ?? new Typechecker(project);
		if (project.typechecker) {
			return checker;
		}
		project.typechecker = checker;
		checker.setFiles(files);
		checker.onParseStart(async () => {
			const files = checker.getTestFiles();
			for (const file of files) {
				await ctx._testRun.enqueued(project, file);
			}
			await ctx._testRun.collected(project, files);
		});
		checker.onParseEnd((result) => onParseEnd(project, result));
		checker.onWatcherRerun(async () => {
			rerunTriggered.add(project);
			if (!ctx.runningPromise) {
				ctx.state.clearErrors();
				await ctx.report("onWatcherRerun", files, "File change detected. Triggering rerun.");
			}
			await checker.collectTests();
			const testFiles = checker.getTestFiles();
			for (const file of testFiles) {
				await ctx._testRun.enqueued(project, file);
			}
			await ctx._testRun.collected(project, testFiles);
			const { packs, events } = checker.getTestPacksAndEvents();
			await ctx._testRun.updated(packs, events);
		});
		await checker.prepare();
		return checker;
	}
	async function startTypechecker(project, files) {
		if (project.typechecker) {
			return project.typechecker;
		}
		const checker = await createWorkspaceTypechecker(project, files);
		await checker.collectTests();
		await checker.start();
	}
	async function collectTests(specs) {
		const specsByProject = groupBy(specs, (spec) => spec.project.name);
		for (const name in specsByProject) {
			const project = specsByProject[name][0].project;
			const files = specsByProject[name].map((spec) => spec.moduleId);
			const checker = await createWorkspaceTypechecker(project, files);
			checker.setFiles(files);
			await checker.collectTests();
			const testFiles = checker.getTestFiles();
			for (const file of testFiles) {
				await ctx._testRun.enqueued(project, file);
			}
			await ctx._testRun.collected(project, testFiles);
		}
	}
	async function runTests(specs) {
		const specsByProject = groupBy(specs, (spec) => spec.project.name);
		const promises = [];
		for (const name in specsByProject) {
			const project = specsByProject[name][0].project;
			const files = specsByProject[name].map((spec) => spec.moduleId);
			const promise = createDefer();
			const _p = new Promise((resolve) => {
				const _i = setInterval(() => {
					if (!project.typechecker || rerunTriggered.has(project)) {
						resolve(true);
						clearInterval(_i);
					}
				});
				setTimeout(() => {
					resolve(false);
					clearInterval(_i);
				}, 500).unref();
			});
			const triggered = await _p;
			if (project.typechecker && !triggered) {
				const testFiles = project.typechecker.getTestFiles();
				for (const file of testFiles) {
					await ctx._testRun.enqueued(project, file);
				}
				await ctx._testRun.collected(project, testFiles);
				await onParseEnd(project, project.typechecker.getResult());
				continue;
			}
			promises.push(promise);
			promisesMap.set(project, promise);
			startTypechecker(project, files);
		}
		await Promise.all(promises);
	}
	return {
		name: "typescript",
		runTests,
		collectTests,
		async close() {
			const promises = ctx.projects.map((project) => project.typechecker?.stop());
			await Promise.all(promises);
		}
	};
}

function getDefaultThreadsCount(config) {
	const numCpus = typeof nodeos.availableParallelism === "function" ? nodeos.availableParallelism() : nodeos.cpus().length;
	return config.watch ? Math.max(Math.floor(numCpus / 2), 1) : Math.max(numCpus - 1, 1);
}
function getWorkerMemoryLimit(config) {
	const memoryLimit = config.poolOptions?.vmThreads?.memoryLimit;
	if (memoryLimit) {
		return memoryLimit;
	}
	return 1 / (config.poolOptions?.vmThreads?.maxThreads ?? getDefaultThreadsCount(config));
}
/**
* Converts a string representing an amount of memory to bytes.
*
* @param input The value to convert to bytes.
* @param percentageReference The reference value to use when a '%' value is supplied.
*/
function stringToBytes(input, percentageReference) {
	if (input === null || input === undefined) {
		return input;
	}
	if (typeof input === "string") {
		if (Number.isNaN(Number.parseFloat(input.slice(-1)))) {
			let [, numericString, trailingChars] = input.match(/(.*?)([^0-9.-]+)$/) || [];
			if (trailingChars && numericString) {
				const numericValue = Number.parseFloat(numericString);
				trailingChars = trailingChars.toLowerCase();
				switch (trailingChars) {
					case "%":
						input = numericValue / 100;
						break;
					case "kb":
					case "k": return numericValue * 1e3;
					case "kib": return numericValue * 1024;
					case "mb":
					case "m": return numericValue * 1e3 * 1e3;
					case "mib": return numericValue * 1024 * 1024;
					case "gb":
					case "g": return numericValue * 1e3 * 1e3 * 1e3;
					case "gib": return numericValue * 1024 * 1024 * 1024;
				}
			}
		} else {
			input = Number.parseFloat(input);
		}
	}
	if (typeof input === "number") {
		if (input <= 1 && input > 0) {
			if (percentageReference) {
				return Math.floor(input * percentageReference);
			} else {
				throw new Error("For a percentage based memory limit a percentageReference must be supplied");
			}
		} else if (input > 1) {
			return Math.floor(input);
		} else {
			throw new Error("Unexpected numerical input for \"memoryLimit\"");
		}
	}
	return null;
}

const suppressWarningsPath$1 = resolve$1(rootDir, "./suppress-warnings.cjs");
function createChildProcessChannel(project, collect) {
	const emitter = new EventEmitter();
	const cleanup = () => emitter.removeAllListeners();
	const events = {
		message: "message",
		response: "response"
	};
	const channel = {
		onMessage: (callback) => emitter.on(events.message, callback),
		postMessage: (message) => emitter.emit(events.response, message)
	};
	const rpc = createBirpc(createMethodsRPC(project, {
		cacheFs: true,
		collect
	}), {
		eventNames: ["onCancel"],
		serialize: v8.serialize,
		deserialize: (v) => v8.deserialize(Buffer.from(v)),
		post(v) {
			emitter.emit(events.message, v);
		},
		on(fn) {
			emitter.on(events.response, fn);
		},
		onTimeoutError(functionName) {
			throw new Error(`[vitest-pool]: Timeout calling "${functionName}"`);
		}
	});
	project.ctx.onCancel((reason) => rpc.onCancel(reason));
	return {
		channel,
		cleanup
	};
}
function createVmForksPool(ctx, { execArgv, env }) {
	const numCpus = typeof nodeos.availableParallelism === "function" ? nodeos.availableParallelism() : nodeos.cpus().length;
	const threadsCount = ctx.config.watch ? Math.max(Math.floor(numCpus / 2), 1) : Math.max(numCpus - 1, 1);
	const poolOptions = ctx.config.poolOptions?.vmForks ?? {};
	const maxThreads = poolOptions.maxForks ?? ctx.config.maxWorkers ?? threadsCount;
	const minThreads = poolOptions.maxForks ?? ctx.config.minWorkers ?? threadsCount;
	const worker = resolve$1(ctx.distPath, "workers/vmForks.js");
	const options = {
		runtime: "child_process",
		filename: resolve$1(ctx.distPath, "worker.js"),
		maxThreads,
		minThreads,
		env,
		execArgv: [
			"--experimental-import-meta-resolve",
			"--experimental-vm-modules",
			"--require",
			suppressWarningsPath$1,
			...poolOptions.execArgv ?? [],
			...execArgv
		],
		terminateTimeout: ctx.config.teardownTimeout,
		concurrentTasksPerWorker: 1,
		maxMemoryLimitBeforeRecycle: getMemoryLimit$1(ctx.config) || undefined
	};
	if (poolOptions.singleFork || !ctx.config.fileParallelism) {
		options.maxThreads = 1;
		options.minThreads = 1;
	}
	const pool = new Tinypool$1(options);
	const runWithFiles = (name) => {
		let id = 0;
		async function runFiles(project, config, files, environment, invalidates = []) {
			const paths = files.map((f) => f.filepath);
			ctx.state.clearFiles(project, paths);
			const { channel, cleanup } = createChildProcessChannel(project, name === "collect");
			const workerId = ++id;
			const data = {
				pool: "forks",
				worker,
				config,
				files,
				invalidates,
				environment,
				workerId,
				projectName: project.name,
				providedContext: project.getProvidedContext()
			};
			try {
				await pool.run(data, {
					name,
					channel
				});
			} catch (error) {
				if (error instanceof Error && /Failed to terminate worker/.test(error.message)) {
					ctx.state.addProcessTimeoutCause(`Failed to terminate worker while running ${paths.join(", ")}.`);
				} else if (ctx.isCancelling && error instanceof Error && /The task has been cancelled/.test(error.message)) {
					ctx.state.cancelFiles(paths, project);
				} else {
					throw error;
				}
			} finally {
				cleanup();
			}
		}
		return async (specs, invalidates) => {
			ctx.onCancel(() => pool.cancelPendingTasks());
			const configs = new Map();
			const getConfig = (project) => {
				if (configs.has(project)) {
					return configs.get(project);
				}
				const _config = project.getSerializableConfig();
				const config = wrapSerializableConfig(_config);
				configs.set(project, config);
				return config;
			};
			const filesByEnv = await groupFilesByEnv(specs);
			const promises = Object.values(filesByEnv).flat();
			const results = await Promise.allSettled(promises.map(({ file, environment, project }) => runFiles(project, getConfig(project), [file], environment, invalidates)));
			const errors = results.filter((r) => r.status === "rejected").map((r) => r.reason);
			if (errors.length > 0) {
				throw new AggregateError(errors, "Errors occurred while running tests. For more information, see serialized error.");
			}
		};
	};
	return {
		name: "vmForks",
		runTests: runWithFiles("run"),
		collectTests: runWithFiles("collect"),
		close: () => pool.destroy()
	};
}
function getMemoryLimit$1(config) {
	const memory = nodeos.totalmem();
	const limit = getWorkerMemoryLimit(config);
	if (typeof memory === "number") {
		return stringToBytes(limit, config.watch ? memory / 2 : memory);
	}
	if (typeof limit === "number" && limit > 1 || typeof limit === "string" && limit.at(-1) !== "%") {
		return stringToBytes(limit);
	}
	return null;
}

const suppressWarningsPath = resolve$1(rootDir, "./suppress-warnings.cjs");
function createWorkerChannel(project, collect) {
	const channel = new MessageChannel();
	const port = channel.port2;
	const workerPort = channel.port1;
	const rpc = createBirpc(createMethodsRPC(project, { collect }), {
		eventNames: ["onCancel"],
		post(v) {
			port.postMessage(v);
		},
		on(fn) {
			port.on("message", fn);
		},
		onTimeoutError(functionName) {
			throw new Error(`[vitest-pool]: Timeout calling "${functionName}"`);
		}
	});
	project.ctx.onCancel((reason) => rpc.onCancel(reason));
	return {
		workerPort,
		port
	};
}
function createVmThreadsPool(ctx, { execArgv, env }) {
	const numCpus = typeof nodeos.availableParallelism === "function" ? nodeos.availableParallelism() : nodeos.cpus().length;
	const threadsCount = ctx.config.watch ? Math.max(Math.floor(numCpus / 2), 1) : Math.max(numCpus - 1, 1);
	const poolOptions = ctx.config.poolOptions?.vmThreads ?? {};
	const maxThreads = poolOptions.maxThreads ?? ctx.config.maxWorkers ?? threadsCount;
	const minThreads = poolOptions.minThreads ?? ctx.config.minWorkers ?? threadsCount;
	const worker = resolve$1(ctx.distPath, "workers/vmThreads.js");
	const options = {
		filename: resolve$1(ctx.distPath, "worker.js"),
		useAtomics: poolOptions.useAtomics ?? false,
		maxThreads,
		minThreads,
		env,
		execArgv: [
			"--experimental-import-meta-resolve",
			"--experimental-vm-modules",
			"--require",
			suppressWarningsPath,
			...poolOptions.execArgv ?? [],
			...execArgv
		],
		terminateTimeout: ctx.config.teardownTimeout,
		concurrentTasksPerWorker: 1,
		maxMemoryLimitBeforeRecycle: getMemoryLimit(ctx.config) || undefined
	};
	if (poolOptions.singleThread || !ctx.config.fileParallelism) {
		options.maxThreads = 1;
		options.minThreads = 1;
	}
	const pool = new Tinypool$1(options);
	const runWithFiles = (name) => {
		let id = 0;
		async function runFiles(project, config, files, environment, invalidates = []) {
			const paths = files.map((f) => f.filepath);
			ctx.state.clearFiles(project, paths);
			const { workerPort, port } = createWorkerChannel(project, name === "collect");
			const workerId = ++id;
			const data = {
				pool: "vmThreads",
				worker,
				port: workerPort,
				config,
				files: paths,
				invalidates,
				environment,
				workerId,
				projectName: project.name,
				providedContext: project.getProvidedContext()
			};
			try {
				await pool.run(data, {
					transferList: [workerPort],
					name
				});
			} catch (error) {
				if (error instanceof Error && /Failed to terminate worker/.test(error.message)) {
					ctx.state.addProcessTimeoutCause(`Failed to terminate worker while running ${paths.join(", ")}. \nSee https://vitest.dev/guide/common-errors.html#failed-to-terminate-worker for troubleshooting.`);
				} else if (ctx.isCancelling && error instanceof Error && /The task has been cancelled/.test(error.message)) {
					ctx.state.cancelFiles(paths, project);
				} else {
					throw error;
				}
			} finally {
				port.close();
				workerPort.close();
			}
		}
		return async (specs, invalidates) => {
			ctx.onCancel(() => pool.cancelPendingTasks());
			const configs = new Map();
			const getConfig = (project) => {
				if (configs.has(project)) {
					return configs.get(project);
				}
				const config = project.serializedConfig;
				configs.set(project, config);
				return config;
			};
			const filesByEnv = await groupFilesByEnv(specs);
			const promises = Object.values(filesByEnv).flat();
			const results = await Promise.allSettled(promises.map(({ file, environment, project }) => runFiles(project, getConfig(project), [file], environment, invalidates)));
			const errors = results.filter((r) => r.status === "rejected").map((r) => r.reason);
			if (errors.length > 0) {
				throw new AggregateError(errors, "Errors occurred while running tests. For more information, see serialized error.");
			}
		};
	};
	return {
		name: "vmThreads",
		runTests: runWithFiles("run"),
		collectTests: runWithFiles("collect"),
		close: () => pool.destroy()
	};
}
function getMemoryLimit(config) {
	const memory = nodeos.totalmem();
	const limit = getWorkerMemoryLimit(config);
	if (typeof memory === "number") {
		return stringToBytes(limit, config.watch ? memory / 2 : memory);
	}
	if (typeof limit === "number" && limit > 1 || typeof limit === "string" && limit.at(-1) !== "%") {
		return stringToBytes(limit);
	}
	return null;
}

const builtinPools = [
	"forks",
	"threads",
	"browser",
	"vmThreads",
	"vmForks",
	"typescript"
];
function getDefaultPoolName(project) {
	if (project.config.browser.enabled) {
		return "browser";
	}
	return project.config.pool;
}
function getFilePoolName(project, file) {
	for (const [glob, pool] of project.config.poolMatchGlobs) {
		if (pool === "browser") {
			throw new Error("Since Vitest 0.31.0 \"browser\" pool is not supported in \"poolMatchGlobs\". You can create a workspace to run some of your tests in browser in parallel. Read more: https://vitest.dev/guide/workspace");
		}
		if (mm.isMatch(file, glob, { cwd: project.config.root })) {
			return pool;
		}
	}
	return getDefaultPoolName(project);
}
function createPool(ctx) {
	const pools = {
		forks: null,
		threads: null,
		browser: null,
		vmThreads: null,
		vmForks: null,
		typescript: null
	};
	const viteMajor = Number(version.split(".")[0]);
	const potentialConditions = new Set(viteMajor >= 6 ? ctx.vite.config.ssr.resolve?.conditions ?? [] : [
		"production",
		"development",
		...ctx.vite.config.resolve.conditions
	]);
	const conditions = [...potentialConditions].filter((condition) => {
		if (condition === "production") {
			return ctx.vite.config.isProduction;
		}
		if (condition === "development") {
			return !ctx.vite.config.isProduction;
		}
		return true;
	}).map((condition) => {
		if (viteMajor >= 6 && condition === "development|production") {
			return ctx.vite.config.isProduction ? "production" : "development";
		}
		return condition;
	}).flatMap((c) => ["--conditions", c]);
	const execArgv = process.execArgv.filter((execArg) => execArg.startsWith("--cpu-prof") || execArg.startsWith("--heap-prof") || execArg.startsWith("--diagnostic-dir"));
	async function executeTests(method, files, invalidate) {
		const options = {
			execArgv: [...execArgv, ...conditions],
			env: {
				TEST: "true",
				VITEST: "true",
				NODE_ENV: process.env.NODE_ENV || "test",
				VITEST_MODE: ctx.config.watch ? "WATCH" : "RUN",
				FORCE_TTY: isatty(1) ? "true" : "",
				...process.env,
				...ctx.config.env
			}
		};
		if (isWindows) {
			for (const name in options.env) {
				options.env[name.toUpperCase()] = options.env[name];
			}
		}
		const customPools = new Map();
		async function resolveCustomPool(filepath) {
			if (customPools.has(filepath)) {
				return customPools.get(filepath);
			}
			const pool = await ctx.runner.executeId(filepath);
			if (typeof pool.default !== "function") {
				throw new TypeError(`Custom pool "${filepath}" must export a function as default export`);
			}
			const poolInstance = await pool.default(ctx, options);
			if (typeof poolInstance?.name !== "string") {
				throw new TypeError(`Custom pool "${filepath}" should return an object with "name" property`);
			}
			if (typeof poolInstance?.[method] !== "function") {
				throw new TypeError(`Custom pool "${filepath}" should return an object with "${method}" method`);
			}
			customPools.set(filepath, poolInstance);
			return poolInstance;
		}
		const filesByPool = {
			forks: [],
			threads: [],
			vmThreads: [],
			vmForks: [],
			typescript: []
		};
		const factories = {
			vmThreads: () => createVmThreadsPool(ctx, options),
			threads: () => createThreadsPool(ctx, options),
			forks: () => createForksPool(ctx, options),
			vmForks: () => createVmForksPool(ctx, options),
			typescript: () => createTypecheckPool(ctx)
		};
		for (const spec of files) {
			const { pool } = spec[2];
			filesByPool[pool] ??= [];
			filesByPool[pool].push(spec);
		}
		const Sequencer = ctx.config.sequence.sequencer;
		const sequencer = new Sequencer(ctx);
		async function sortSpecs(specs) {
			if (ctx.config.shard) {
				specs = await sequencer.shard(specs);
			}
			return sequencer.sort(specs);
		}
		await Promise.all(Object.entries(filesByPool).map(async (entry) => {
			const [pool, files] = entry;
			if (!files.length) {
				return null;
			}
			const specs = await sortSpecs(files);
			if (pool in factories) {
				const factory = factories[pool];
				pools[pool] ??= factory();
				return pools[pool][method](specs, invalidate);
			}
			if (pool === "browser") {
				pools[pool] ??= await (async () => {
					const { createBrowserPool } = await import('@vitest/browser');
					return createBrowserPool(ctx);
				})();
				return pools[pool][method](specs, invalidate);
			}
			const poolHandler = await resolveCustomPool(pool);
			pools[poolHandler.name] ??= poolHandler;
			return poolHandler[method](specs, invalidate);
		}));
	}
	return {
		name: "default",
		runTests: (files, invalidates) => executeTests("runTests", files, invalidates),
		collectTests: (files, invalidates) => executeTests("collectTests", files, invalidates),
		async close() {
			await Promise.all(Object.values(pools).map((p) => p?.close?.()));
		}
	};
}

class BaseSequencer {
	ctx;
	constructor(ctx) {
		this.ctx = ctx;
	}
	async shard(files) {
		const { config } = this.ctx;
		const { index, count } = config.shard;
		const shardSize = Math.ceil(files.length / count);
		const shardStart = shardSize * (index - 1);
		const shardEnd = shardSize * index;
		return [...files].map((spec) => {
			const fullPath = resolve(slash$1(config.root), slash$1(spec.moduleId));
			const specPath = fullPath?.slice(config.root.length);
			return {
				spec,
				hash: hash("sha1", specPath, "hex")
			};
		}).sort((a, b) => a.hash < b.hash ? -1 : a.hash > b.hash ? 1 : 0).slice(shardStart, shardEnd).map(({ spec }) => spec);
	}
	async sort(files) {
		const cache = this.ctx.cache;
		return [...files].sort((a, b) => {
			const keyA = `${a.project.name}:${relative(this.ctx.config.root, a.moduleId)}`;
			const keyB = `${b.project.name}:${relative(this.ctx.config.root, b.moduleId)}`;
			const aState = cache.getFileTestResults(keyA);
			const bState = cache.getFileTestResults(keyB);
			if (!aState || !bState) {
				const statsA = cache.getFileStats(keyA);
				const statsB = cache.getFileStats(keyB);
				if (!statsA || !statsB) {
					return !statsA && statsB ? -1 : !statsB && statsA ? 1 : 0;
				}
				return statsB.size - statsA.size;
			}
			if (aState.failed && !bState.failed) {
				return -1;
			}
			if (!aState.failed && bState.failed) {
				return 1;
			}
			return bState.duration - aState.duration;
		});
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
	if (typeof inspect === "boolean" || inspect === undefined) {
		return {};
	}
	if (typeof inspect === "number") {
		return { port: inspect };
	}
	if (inspect.match(/https?:\//)) {
		throw new Error(`Inspector host cannot be a URL. Use "host:port" instead of "${inspect}"`);
	}
	const [host, port] = inspect.split(":");
	if (!port) {
		return { host };
	}
	return {
		host,
		port: Number(port) || defaultInspectPort
	};
}
function resolveApiServerConfig(options, defaultPort) {
	let api;
	if (options.ui && !options.api) {
		api = { port: defaultPort };
	} else if (options.api === true) {
		api = { port: defaultPort };
	} else if (typeof options.api === "number") {
		api = { port: options.api };
	}
	if (typeof options.api === "object") {
		if (api) {
			if (options.api.port) {
				api.port = options.api.port;
			}
			if (options.api.strictPort) {
				api.strictPort = options.api.strictPort;
			}
			if (options.api.host) {
				api.host = options.api.host;
			}
		} else {
			api = { ...options.api };
		}
	}
	if (api) {
		if (!api.port && !api.middlewareMode) {
			api.port = defaultPort;
		}
	} else {
		api = { middlewareMode: true };
	}
	return api;
}
function resolveInlineWorkerOption(value) {
	if (typeof value === "string" && value.trim().endsWith("%")) {
		return getWorkersCountByPercentage(value);
	} else {
		return Number(value);
	}
}
function resolveConfig$1(vitest, options, viteConfig) {
	const mode = vitest.mode;
	const logger = vitest.logger;
	if (options.dom) {
		if (viteConfig.test?.environment != null && viteConfig.test.environment !== "happy-dom") {
			logger.console.warn(c.yellow(`${c.inverse(c.yellow(" Vitest "))} Your config.test.environment ("${viteConfig.test.environment}") conflicts with --dom flag ("happy-dom"), ignoring "${viteConfig.test.environment}"`));
		}
		options.environment = "happy-dom";
	}
	const resolved = {
		...configDefaults,
		...options,
		root: viteConfig.root,
		mode
	};
	resolved.project = toArray(resolved.project);
	resolved.provide ??= {};
	const inspector = resolved.inspect || resolved.inspectBrk;
	resolved.inspector = {
		...resolved.inspector,
		...parseInspector(inspector),
		enabled: !!inspector,
		waitForDebugger: options.inspector?.waitForDebugger ?? !!resolved.inspectBrk
	};
	if (viteConfig.base !== "/") {
		resolved.base = viteConfig.base;
	}
	resolved.clearScreen = resolved.clearScreen ?? viteConfig.clearScreen ?? true;
	if (options.shard) {
		if (resolved.watch) {
			throw new Error("You cannot use --shard option with enabled watch");
		}
		const [indexString, countString] = options.shard.split("/");
		const index = Math.abs(Number.parseInt(indexString, 10));
		const count = Math.abs(Number.parseInt(countString, 10));
		if (Number.isNaN(count) || count <= 0) {
			throw new Error("--shard <count> must be a positive number");
		}
		if (Number.isNaN(index) || index <= 0 || index > count) {
			throw new Error("--shard <index> must be a positive number less then <count>");
		}
		resolved.shard = {
			index,
			count
		};
	}
	if (resolved.standalone && !resolved.watch) {
		throw new Error(`Vitest standalone mode requires --watch`);
	}
	if (resolved.mergeReports && resolved.watch) {
		throw new Error(`Cannot merge reports with --watch enabled`);
	}
	if (resolved.maxWorkers) {
		resolved.maxWorkers = resolveInlineWorkerOption(resolved.maxWorkers);
	}
	if (resolved.minWorkers) {
		resolved.minWorkers = resolveInlineWorkerOption(resolved.minWorkers);
	}
	resolved.browser ??= {};
	resolved.fileParallelism ??= mode !== "benchmark";
	if (!resolved.fileParallelism) {
		resolved.maxWorkers = 1;
		resolved.minWorkers = 1;
	}
	if (resolved.maxConcurrency === 0) {
		logger.console.warn(c.yellow(`The option "maxConcurrency" cannot be set to 0. Using default value ${configDefaults.maxConcurrency} instead.`));
		resolved.maxConcurrency = configDefaults.maxConcurrency;
	}
	if (resolved.inspect || resolved.inspectBrk) {
		const isSingleThread = resolved.pool === "threads" && resolved.poolOptions?.threads?.singleThread;
		const isSingleFork = resolved.pool === "forks" && resolved.poolOptions?.forks?.singleFork;
		if (resolved.fileParallelism && !isSingleThread && !isSingleFork) {
			const inspectOption = `--inspect${resolved.inspectBrk ? "-brk" : ""}`;
			throw new Error(`You cannot use ${inspectOption} without "--no-file-parallelism", "poolOptions.threads.singleThread" or "poolOptions.forks.singleFork"`);
		}
	}
	const browser = resolved.browser;
	if (browser.enabled && viteConfig.test?.browser) {
		if (!browser.name && !browser.instances) {
			throw new Error(`Vitest Browser Mode requires "browser.name" (deprecated) or "browser.instances" options, none were set.`);
		}
		const instances = browser.instances;
		if (browser.name && browser.instances) {
			browser.instances = browser.instances.filter((instance) => instance.browser === browser.name);
		}
		if (browser.instances && !browser.instances.length) {
			throw new Error([`"browser.instances" was set in the config, but the array is empty. Define at least one browser config.`, browser.name && instances?.length ? ` The "browser.name" was set to "${browser.name}" which filtered all configs (${instances.map((c) => c.browser).join(", ")}). Did you mean to use another name?` : ""].join(""));
		}
	}
	const playwrightChromiumOnly = isPlaywrightChromiumOnly(vitest, resolved);
	if (browser.enabled && !playwrightChromiumOnly) {
		const browserConfig = { browser: {
			provider: browser.provider,
			name: browser.name,
			instances: browser.instances?.map((i) => ({ browser: i.browser }))
		} };
		if (resolved.coverage.enabled && resolved.coverage.provider === "v8") {
			throw new Error(`@vitest/coverage-v8 does not work with\n${JSON.stringify(browserConfig, null, 2)}\n` + `\nUse either:\n${JSON.stringify({ browser: {
				provider: "playwright",
				instances: [{ browser: "chromium" }]
			} }, null, 2)}` + `\n\n...or change your coverage provider to:\n${JSON.stringify({ coverage: { provider: "istanbul" } }, null, 2)}\n`);
		}
		if (resolved.inspect || resolved.inspectBrk) {
			const inspectOption = `--inspect${resolved.inspectBrk ? "-brk" : ""}`;
			throw new Error(`${inspectOption} does not work with\n${JSON.stringify(browserConfig, null, 2)}\n` + `\nUse either:\n${JSON.stringify({ browser: {
				provider: "playwright",
				instances: [{ browser: "chromium" }]
			} }, null, 2)}` + `\n\n...or disable ${inspectOption}\n`);
		}
	}
	resolved.coverage.reporter = resolveCoverageReporters(resolved.coverage.reporter);
	if (resolved.coverage.enabled && resolved.coverage.reportsDirectory) {
		const reportsDirectory = resolve(resolved.root, resolved.coverage.reportsDirectory);
		if (reportsDirectory === resolved.root || reportsDirectory === process.cwd()) {
			throw new Error(`You cannot set "coverage.reportsDirectory" as ${reportsDirectory}. Vitest needs to be able to remove this directory before test run`);
		}
	}
	if (resolved.coverage.enabled && resolved.coverage.provider === "custom" && resolved.coverage.customProviderModule) {
		resolved.coverage.customProviderModule = resolvePath(resolved.coverage.customProviderModule, resolved.root);
	}
	resolved.expect ??= {};
	resolved.deps ??= {};
	resolved.deps.moduleDirectories ??= [];
	resolved.deps.moduleDirectories = resolved.deps.moduleDirectories.map((dir) => {
		if (!dir.startsWith("/")) {
			dir = `/${dir}`;
		}
		if (!dir.endsWith("/")) {
			dir += "/";
		}
		return normalize(dir);
	});
	if (!resolved.deps.moduleDirectories.includes("/node_modules/")) {
		resolved.deps.moduleDirectories.push("/node_modules/");
	}
	resolved.deps.optimizer ??= {};
	resolved.deps.optimizer.ssr ??= {};
	resolved.deps.optimizer.ssr.enabled ??= true;
	resolved.deps.optimizer.web ??= {};
	resolved.deps.optimizer.web.enabled ??= true;
	resolved.deps.web ??= {};
	resolved.deps.web.transformAssets ??= true;
	resolved.deps.web.transformCss ??= true;
	resolved.deps.web.transformGlobPattern ??= [];
	resolved.setupFiles = toArray(resolved.setupFiles || []).map((file) => resolvePath(file, resolved.root));
	resolved.globalSetup = toArray(resolved.globalSetup || []).map((file) => resolvePath(file, resolved.root));
	resolved.coverage.exclude = [
		...resolved.coverage.exclude,
		...resolved.setupFiles.map((file) => `${resolved.coverage.allowExternal ? "**/" : ""}${relative(resolved.root, file)}`),
		...resolved.include
	];
	resolved.forceRerunTriggers = [...resolved.forceRerunTriggers, ...resolved.setupFiles];
	resolved.server ??= {};
	resolved.server.deps ??= {};
	const deprecatedDepsOptions = [
		"inline",
		"external",
		"fallbackCJS"
	];
	deprecatedDepsOptions.forEach((option) => {
		if (resolved.deps[option] === undefined) {
			return;
		}
		if (option === "fallbackCJS") {
			logger.console.warn(c.yellow(`${c.inverse(c.yellow(" Vitest "))} "deps.${option}" is deprecated. Use "server.deps.${option}" instead`));
		} else {
			const transformMode = resolved.environment === "happy-dom" || resolved.environment === "jsdom" ? "web" : "ssr";
			logger.console.warn(c.yellow(`${c.inverse(c.yellow(" Vitest "))} "deps.${option}" is deprecated. If you rely on vite-node directly, use "server.deps.${option}" instead. Otherwise, consider using "deps.optimizer.${transformMode}.${option === "external" ? "exclude" : "include"}"`));
		}
		if (resolved.server.deps[option] === undefined) {
			resolved.server.deps[option] = resolved.deps[option];
		}
	});
	if (resolved.cliExclude) {
		resolved.exclude.push(...resolved.cliExclude);
	}
	if (resolved.server.deps.inline !== true) {
		const ssrOptions = viteConfig.ssr;
		if (ssrOptions?.noExternal === true && resolved.server.deps.inline == null) {
			resolved.server.deps.inline = true;
		} else {
			resolved.server.deps.inline ??= [];
			resolved.server.deps.inline.push(...extraInlineDeps);
		}
	}
	resolved.server.deps.inlineFiles ??= [];
	resolved.server.deps.inlineFiles.push(...resolved.setupFiles);
	resolved.server.deps.moduleDirectories ??= [];
	resolved.server.deps.moduleDirectories.push(...resolved.deps.moduleDirectories);
	if (resolved.runner) {
		resolved.runner = resolvePath(resolved.runner, resolved.root);
	}
	if (resolved.snapshotEnvironment) {
		resolved.snapshotEnvironment = resolvePath(resolved.snapshotEnvironment, resolved.root);
	}
	resolved.testNamePattern = resolved.testNamePattern ? resolved.testNamePattern instanceof RegExp ? resolved.testNamePattern : new RegExp(resolved.testNamePattern) : undefined;
	if (resolved.snapshotFormat && "plugins" in resolved.snapshotFormat) {
		resolved.snapshotFormat.plugins = [];
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
	if (options.resolveSnapshotPath) {
		delete resolved.resolveSnapshotPath;
	}
	resolved.pool ??= "threads";
	if (process.env.VITEST_MAX_THREADS) {
		resolved.poolOptions = {
			...resolved.poolOptions,
			threads: {
				...resolved.poolOptions?.threads,
				maxThreads: Number.parseInt(process.env.VITEST_MAX_THREADS)
			},
			vmThreads: {
				...resolved.poolOptions?.vmThreads,
				maxThreads: Number.parseInt(process.env.VITEST_MAX_THREADS)
			}
		};
	}
	if (process.env.VITEST_MIN_THREADS) {
		resolved.poolOptions = {
			...resolved.poolOptions,
			threads: {
				...resolved.poolOptions?.threads,
				minThreads: Number.parseInt(process.env.VITEST_MIN_THREADS)
			},
			vmThreads: {
				...resolved.poolOptions?.vmThreads,
				minThreads: Number.parseInt(process.env.VITEST_MIN_THREADS)
			}
		};
	}
	if (process.env.VITEST_MAX_FORKS) {
		resolved.poolOptions = {
			...resolved.poolOptions,
			forks: {
				...resolved.poolOptions?.forks,
				maxForks: Number.parseInt(process.env.VITEST_MAX_FORKS)
			},
			vmForks: {
				...resolved.poolOptions?.vmForks,
				maxForks: Number.parseInt(process.env.VITEST_MAX_FORKS)
			}
		};
	}
	if (process.env.VITEST_MIN_FORKS) {
		resolved.poolOptions = {
			...resolved.poolOptions,
			forks: {
				...resolved.poolOptions?.forks,
				minForks: Number.parseInt(process.env.VITEST_MIN_FORKS)
			},
			vmForks: {
				...resolved.poolOptions?.vmForks,
				minForks: Number.parseInt(process.env.VITEST_MIN_FORKS)
			}
		};
	}
	const poolThreadsOptions = [
		["threads", "minThreads"],
		["threads", "maxThreads"],
		["vmThreads", "minThreads"],
		["vmThreads", "maxThreads"]
	];
	for (const [poolOptionKey, workerOptionKey] of poolThreadsOptions) {
		if (resolved.poolOptions?.[poolOptionKey]?.[workerOptionKey]) {
			resolved.poolOptions[poolOptionKey][workerOptionKey] = resolveInlineWorkerOption(resolved.poolOptions[poolOptionKey][workerOptionKey]);
		}
	}
	const poolForksOptions = [
		["forks", "minForks"],
		["forks", "maxForks"],
		["vmForks", "minForks"],
		["vmForks", "maxForks"]
	];
	for (const [poolOptionKey, workerOptionKey] of poolForksOptions) {
		if (resolved.poolOptions?.[poolOptionKey]?.[workerOptionKey]) {
			resolved.poolOptions[poolOptionKey][workerOptionKey] = resolveInlineWorkerOption(resolved.poolOptions[poolOptionKey][workerOptionKey]);
		}
	}
	if (typeof resolved.workspace === "string") {
		resolved.workspace = typeof options.workspace === "string" && options.workspace[0] === "." ? resolve(process.cwd(), options.workspace) : resolvePath(resolved.workspace, resolved.root);
	}
	if (!builtinPools.includes(resolved.pool)) {
		resolved.pool = resolvePath(resolved.pool, resolved.root);
	}
	if (resolved.poolMatchGlobs) {
		logger.warn(c.yellow(`${c.inverse(c.yellow(" Vitest "))} "poolMatchGlobs" is deprecated. Use "workspace" to define different configurations instead.`));
	}
	resolved.poolMatchGlobs = (resolved.poolMatchGlobs || []).map(([glob, pool]) => {
		if (!builtinPools.includes(pool)) {
			pool = resolvePath(pool, resolved.root);
		}
		return [glob, pool];
	});
	if (mode === "benchmark") {
		resolved.benchmark = {
			...benchmarkConfigDefaults,
			...resolved.benchmark
		};
		resolved.coverage.enabled = false;
		resolved.typecheck.enabled = false;
		resolved.include = resolved.benchmark.include;
		resolved.exclude = resolved.benchmark.exclude;
		resolved.includeSource = resolved.benchmark.includeSource;
		const reporters = Array.from(new Set([...toArray(resolved.benchmark.reporters), ...toArray(options.reporter)])).filter(Boolean);
		if (reporters.length) {
			resolved.benchmark.reporters = reporters;
		} else {
			resolved.benchmark.reporters = ["default"];
		}
		if (options.outputFile) {
			resolved.benchmark.outputFile = options.outputFile;
		}
		if (options.compare) {
			resolved.benchmark.compare = options.compare;
		}
		if (options.outputJson) {
			resolved.benchmark.outputJson = options.outputJson;
		}
	}
	if (typeof resolved.diff === "string") {
		resolved.diff = resolvePath(resolved.diff, resolved.root);
		resolved.forceRerunTriggers.push(resolved.diff);
	}
	const api = resolveApiServerConfig(options, defaultPort);
	resolved.api = {
		...api,
		token: crypto.randomUUID()
	};
	if (options.related) {
		resolved.related = toArray(options.related).map((file) => resolve(resolved.root, file));
	}
	if (options.reporters) {
		if (!Array.isArray(options.reporters)) {
			if (typeof options.reporters === "string") {
				resolved.reporters = [[options.reporters, {}]];
			} else {
				resolved.reporters = [options.reporters];
			}
		} else {
			resolved.reporters = [];
			for (const reporter of options.reporters) {
				if (Array.isArray(reporter)) {
					resolved.reporters.push([reporter[0], reporter[1] || {}]);
				} else if (typeof reporter === "string") {
					resolved.reporters.push([reporter, {}]);
				} else {
					resolved.reporters.push(reporter);
				}
			}
		}
	}
	if (mode !== "benchmark") {
		const reportersFromCLI = resolved.reporter;
		const cliReporters = toArray(reportersFromCLI || []).map((reporter) => {
			if (/^\.\.?\//.test(reporter)) {
				return resolve(process.cwd(), reporter);
			}
			return reporter;
		});
		if (cliReporters.length) {
			resolved.reporters = Array.from(new Set(toArray(cliReporters))).filter(Boolean).map((reporter) => [reporter, {}]);
		}
	}
	if (!resolved.reporters.length) {
		resolved.reporters.push(["default", {}]);
		if (process.env.GITHUB_ACTIONS === "true") {
			resolved.reporters.push(["github-actions", {}]);
		}
	}
	if (resolved.changed) {
		resolved.passWithNoTests ??= true;
	}
	resolved.css ??= {};
	if (typeof resolved.css === "object") {
		resolved.css.modules ??= {};
		resolved.css.modules.classNameStrategy ??= "stable";
	}
	if (resolved.cache !== false) {
		let cacheDir = VitestCache.resolveCacheDir("", viteConfig.cacheDir, resolved.name);
		if (resolved.cache && resolved.cache.dir) {
			logger.console.warn(c.yellow(`${c.inverse(c.yellow(" Vitest "))} "cache.dir" is deprecated, use Vite's "cacheDir" instead if you want to change the cache director. Note caches will be written to "cacheDir\/vitest"`));
			cacheDir = VitestCache.resolveCacheDir(resolved.root, resolved.cache.dir, resolved.name);
		}
		resolved.cache = { dir: cacheDir };
	}
	resolved.sequence ??= {};
	if (resolved.sequence.shuffle && typeof resolved.sequence.shuffle === "object") {
		const { files, tests } = resolved.sequence.shuffle;
		resolved.sequence.sequencer ??= files ? RandomSequencer : BaseSequencer;
		resolved.sequence.shuffle = tests;
	}
	if (!resolved.sequence?.sequencer) {
		resolved.sequence.sequencer = resolved.sequence.shuffle ? RandomSequencer : BaseSequencer;
	}
	resolved.sequence.hooks ??= "stack";
	if (resolved.sequence.sequencer === RandomSequencer) {
		resolved.sequence.seed ??= Date.now();
	}
	resolved.typecheck = {
		...configDefaults.typecheck,
		...resolved.typecheck
	};
	if (resolved.environmentMatchGlobs) {
		logger.warn(c.yellow(`${c.inverse(c.yellow(" Vitest "))} "environmentMatchGlobs" is deprecated. Use "workspace" to define different configurations instead.`));
	}
	resolved.environmentMatchGlobs = (resolved.environmentMatchGlobs || []).map((i) => [resolve(resolved.root, i[0]), i[1]]);
	resolved.typecheck ??= {};
	resolved.typecheck.enabled ??= false;
	if (resolved.typecheck.enabled) {
		logger.console.warn(c.yellow("Testing types with tsc and vue-tsc is an experimental feature.\nBreaking changes might not follow SemVer, please pin Vitest's version when using it."));
	}
	resolved.browser ??= {};
	resolved.browser.enabled ??= false;
	resolved.browser.headless ??= isCI;
	resolved.browser.isolate ??= true;
	resolved.browser.fileParallelism ??= options.fileParallelism ?? mode !== "benchmark";
	resolved.browser.ui ??= resolved.browser.headless === true ? false : !isCI;
	if (resolved.browser.screenshotDirectory) {
		resolved.browser.screenshotDirectory = resolve(resolved.root, resolved.browser.screenshotDirectory);
	}
	const isPreview = resolved.browser.provider === "preview";
	if (isPreview && resolved.browser.screenshotFailures === true) {
		console.warn(c.yellow([
			`Browser provider "preview" doesn't support screenshots, `,
			`so "browser.screenshotFailures" option is forcefully disabled. `,
			`Set "browser.screenshotFailures" to false or remove it from the config to suppress this warning.`
		].join("")));
		resolved.browser.screenshotFailures = false;
	} else {
		resolved.browser.screenshotFailures ??= !isPreview && !resolved.browser.ui;
	}
	resolved.browser.viewport ??= {};
	resolved.browser.viewport.width ??= 414;
	resolved.browser.viewport.height ??= 896;
	resolved.browser.locators ??= {};
	resolved.browser.locators.testIdAttribute ??= "data-testid";
	if (resolved.browser.enabled && provider === "stackblitz") {
		resolved.browser.provider = "preview";
	}
	resolved.browser.api = resolveApiServerConfig(resolved.browser, defaultBrowserPort) || { port: defaultBrowserPort };
	if (resolved.browser.enabled) {
		if (resolved.browser.ui) {
			resolved.includeTaskLocation ??= true;
		}
	} else if (resolved.ui) {
		resolved.includeTaskLocation ??= true;
	}
	const htmlReporter = toArray(resolved.reporters).some((reporter) => {
		if (Array.isArray(reporter)) {
			return reporter[0] === "html";
		}
		return false;
	});
	if (htmlReporter) {
		resolved.includeTaskLocation ??= true;
	}
	resolved.testTransformMode ??= {};
	resolved.testTimeout ??= resolved.browser.enabled ? 15e3 : 5e3;
	resolved.hookTimeout ??= resolved.browser.enabled ? 3e4 : 1e4;
	return resolved;
}
function isBrowserEnabled(config) {
	return Boolean(config.browser?.enabled);
}
function resolveCoverageReporters(configReporters) {
	if (!Array.isArray(configReporters)) {
		return [[configReporters, {}]];
	}
	const resolvedReporters = [];
	for (const reporter of configReporters) {
		if (Array.isArray(reporter)) {
			resolvedReporters.push([reporter[0], reporter[1] || {}]);
		} else {
			resolvedReporters.push([reporter, {}]);
		}
	}
	return resolvedReporters;
}
function isPlaywrightChromiumOnly(vitest, config) {
	const browser = config.browser;
	if (!browser || browser.provider !== "playwright" || !browser.enabled) {
		return false;
	}
	if (browser.name) {
		return browser.name === "chromium";
	}
	if (!browser.instances) {
		return false;
	}
	for (const instance of browser.instances) {
		const name = instance.name || (config.name ? `${config.name} (${instance.browser})` : instance.browser);
		if (!vitest.matchesProjectFilter(name)) {
			continue;
		}
		if (instance.browser !== "chromium") {
			return false;
		}
	}
	return true;
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
	if (coverageModule) {
		return coverageModule.getProvider();
	}
	return null;
}
class BaseCoverageProvider {
	ctx;
	name;
	version;
	options;
	coverageFiles = new Map();
	pendingPromises = [];
	coverageFilesDirectory;
	_initialize(ctx) {
		this.ctx = ctx;
		if (ctx.version !== this.version) {
			ctx.logger.warn(c.yellow(`Loaded ${c.inverse(c.yellow(` vitest@${ctx.version} `))} and ${c.inverse(c.yellow(` @vitest/coverage-${this.name}@${this.version} `))}.` + "\nRunning mixed versions is not supported and may lead into bugs" + "\nUpdate your dependencies and make sure the versions match."));
		}
		const config = ctx.config.coverage;
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
		if (clean && existsSync(this.options.reportsDirectory)) {
			await promises$1.rm(this.options.reportsDirectory, {
				recursive: true,
				force: true,
				maxRetries: 10
			});
		}
		if (existsSync(this.coverageFilesDirectory)) {
			await promises$1.rm(this.coverageFilesDirectory, {
				recursive: true,
				force: true,
				maxRetries: 10
			});
		}
		await promises$1.mkdir(this.coverageFilesDirectory, { recursive: true });
		this.coverageFiles = new Map();
		this.pendingPromises = [];
	}
	onAfterSuiteRun({ coverage, transformMode, projectName, testFiles }) {
		if (!coverage) {
			return;
		}
		if (transformMode !== "web" && transformMode !== "ssr" && transformMode !== "browser") {
			throw new Error(`Invalid transform mode: ${transformMode}`);
		}
		let entry = this.coverageFiles.get(projectName || DEFAULT_PROJECT);
		if (!entry) {
			entry = {
				web: {},
				ssr: {},
				browser: {}
			};
			this.coverageFiles.set(projectName || DEFAULT_PROJECT, entry);
		}
		const testFilenames = testFiles.join();
		const filename = resolve(this.coverageFilesDirectory, `coverage-${uniqueId++}.json`);
		entry[transformMode][testFilenames] = filename;
		const promise = promises$1.writeFile(filename, JSON.stringify(coverage), "utf-8");
		this.pendingPromises.push(promise);
	}
	async readCoverageFiles({ onFileRead, onFinished, onDebug }) {
		let index = 0;
		const total = this.pendingPromises.length;
		await Promise.all(this.pendingPromises);
		this.pendingPromises = [];
		for (const [projectName, coveragePerProject] of this.coverageFiles.entries()) {
			for (const [transformMode, coverageByTestfiles] of Object.entries(coveragePerProject)) {
				const filenames = Object.values(coverageByTestfiles);
				const project = this.ctx.getProjectByName(projectName);
				for (const chunk of this.toSlices(filenames, this.options.processingConcurrency)) {
					if (onDebug.enabled) {
						index += chunk.length;
						onDebug(`Reading coverage results ${index}/${total}`);
					}
					await Promise.all(chunk.map(async (filename) => {
						const contents = await promises$1.readFile(filename, "utf-8");
						const coverage = JSON.parse(contents);
						onFileRead(coverage);
					}));
				}
				await onFinished(project, transformMode);
			}
		}
	}
	async cleanAfterRun() {
		this.coverageFiles = new Map();
		await promises$1.rm(this.coverageFilesDirectory, { recursive: true });
		if (readdirSync(this.options.reportsDirectory).length === 0) {
			await promises$1.rm(this.options.reportsDirectory, { recursive: true });
		}
	}
	async onTestFailure() {
		if (!this.options.reportOnFailure) {
			await this.cleanAfterRun();
		}
	}
	async reportCoverage(coverageMap, { allTestsRun }) {
		await this.generateReports(coverageMap || this.createCoverageMap(), allTestsRun);
		const keepResults = !this.options.cleanOnRerun && this.ctx.config.watch;
		if (!keepResults) {
			await this.cleanAfterRun();
		}
	}
	async reportThresholds(coverageMap, allTestsRun) {
		const resolvedThresholds = this.resolveThresholds(coverageMap);
		this.checkThresholds(resolvedThresholds);
		if (this.options.thresholds?.autoUpdate && allTestsRun) {
			if (!this.ctx.server.config.configFile) {
				throw new Error("Missing configurationFile. The \"coverage.thresholds.autoUpdate\" can only be enabled when configuration file is used.");
			}
			const configFilePath = this.ctx.server.config.configFile;
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
			if (key === "perFile" || key === "autoUpdate" || key === "100" || THRESHOLD_KEYS.includes(key)) {
				continue;
			}
			const glob = key;
			const globThresholds = resolveGlobThresholds(this.options.thresholds[glob]);
			const globCoverageMap = this.createCoverageMap();
			const matchingFiles = files.filter((file) => mm.isMatch(relative(this.ctx.config.root, file), glob));
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
			if (thresholds.branches === undefined && thresholds.functions === undefined && thresholds.lines === undefined && thresholds.statements === undefined) {
				continue;
			}
			const summaries = this.options.thresholds?.perFile ? coverageMap.files().map((file) => ({
				file,
				summary: coverageMap.fileCoverageFor(file).toSummary()
			})) : [{
				file: null,
				summary: coverageMap.getCoverageSummary()
			}];
			for (const { summary, file } of summaries) {
				for (const thresholdKey of THRESHOLD_KEYS) {
					const threshold = thresholds[thresholdKey];
					if (threshold === undefined) {
						continue;
					}
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
							if (this.options.thresholds?.perFile && file) {
								errorMessage += ` for ${relative("./", file).replace(/\\/g, "/")}`;
							}
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
							if (this.options.thresholds?.perFile && file) {
								errorMessage += ` for ${relative("./", file).replace(/\\/g, "/")}`;
							}
							this.ctx.logger.error(errorMessage);
						}
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
					if (actual > threshold) {
						thresholdsToUpdate.push([key, actual]);
					}
				} else {
					const absoluteThreshold = threshold * -1;
					const actual = Math.max(...summaries.map((summary) => summary[key].total - summary[key].covered));
					if (actual < absoluteThreshold) {
						const updatedThreshold = actual === 0 ? 100 : actual * -1;
						thresholdsToUpdate.push([key, updatedThreshold]);
					}
				}
			}
			if (thresholdsToUpdate.length === 0) {
				continue;
			}
			updatedThresholds = true;
			for (const [threshold, newValue] of thresholdsToUpdate) {
				if (name === GLOBAL_THRESHOLDS_KEY) {
					config.test.coverage.thresholds[threshold] = newValue;
				} else {
					const glob = config.test.coverage.thresholds[name];
					glob[threshold] = newValue;
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
		for (const coverage of coverageMaps) {
			coverageMap.merge(coverage);
		}
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
			if (lastChunk.length >= size) {
				chunks.push([item]);
			} else {
				lastChunk.push(item);
			}
			return chunks;
		}, []);
	}
	createUncoveredFileTransformer(ctx) {
		const servers = [...ctx.projects.map((project) => ({
			root: project.config.root,
			isBrowserEnabled: project.isBrowserEnabled(),
			vitenode: project.vitenode
		})), {
			root: ctx.config.root,
			vitenode: ctx.vitenode,
			isBrowserEnabled: ctx.getRootProject().isBrowserEnabled()
		}];
		return async function transformFile(filename) {
			let lastError;
			for (const { root, vitenode, isBrowserEnabled } of servers) {
				if (!filename.startsWith(root) && !filename.startsWith(`/${root}`)) {
					continue;
				}
				if (isBrowserEnabled) {
					const result = await vitenode.transformRequest(filename, undefined, "web").catch(() => null);
					if (result) {
						return result;
					}
				}
				try {
					return await vitenode.transformRequest(filename);
				} catch (error) {
					lastError = error;
				}
			}
			throw lastError;
		};
	}
}
/**
* Narrow down `unknown` glob thresholds to resolved ones
*/
function resolveGlobThresholds(thresholds) {
	if (!thresholds || typeof thresholds !== "object") {
		return {};
	}
	if (100 in thresholds && thresholds[100] === true) {
		return {
			lines: 100,
			branches: 100,
			functions: 100,
			statements: 100
		};
	}
	return {
		lines: "lines" in thresholds && typeof thresholds.lines === "number" ? thresholds.lines : undefined,
		branches: "branches" in thresholds && typeof thresholds.branches === "number" ? thresholds.branches : undefined,
		functions: "functions" in thresholds && typeof thresholds.functions === "number" ? thresholds.functions : undefined,
		statements: "statements" in thresholds && typeof thresholds.statements === "number" ? thresholds.statements : undefined
	};
}
function assertConfigurationModule(config) {
	try {
		if (typeof config.test.coverage.thresholds !== "object") {
			throw new TypeError("Expected config.test.coverage.thresholds to be an object");
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		throw new Error(`Unable to parse thresholds from configuration file: ${message}`);
	}
}
function resolveConfig(configModule) {
	const mod = configModule.exports.default;
	try {
		if (mod.$type === "object") {
			return mod;
		}
		let config = resolveDefineConfig(mod);
		if (config) {
			return config;
		}
		if (mod.$type === "function-call" && mod.$callee === "mergeConfig") {
			config = resolveMergeConfig(mod);
			if (config) {
				return config;
			}
		}
	} catch (error) {
		throw new Error(error instanceof Error ? error.message : String(error));
	}
	throw new Error("Failed to update coverage thresholds. Configuration file is too complex.");
}
function resolveDefineConfig(mod) {
	if (mod.$type === "function-call" && mod.$callee === "defineConfig") {
		if (mod.$args[0].$type === "object") {
			return mod.$args[0];
		}
		if (mod.$args[0].$type === "arrow-function-expression") {
			if (mod.$args[0].$body.$type === "object") {
				return mod.$args[0].$body;
			}
			const config = resolveMergeConfig(mod.$args[0].$body);
			if (config) {
				return config;
			}
		}
	}
}
function resolveMergeConfig(mod) {
	if (mod.$type === "function-call" && mod.$callee === "mergeConfig") {
		for (const arg of mod.$args) {
			const config = resolveDefineConfig(arg);
			if (config) {
				return config;
			}
		}
	}
}

export { BaseCoverageProvider as B, RandomSequencer as R, VitestCache as V, resolveApiServerConfig as a, BaseSequencer as b, createMethodsRPC as c, isBrowserEnabled as d, groupBy as e, getCoverageProvider as f, getFilePoolName as g, hash as h, isPackageExists as i, createPool as j, mm as m, resolveConfig$1 as r, stdout as s, wildcardPatternToRegExp as w };
