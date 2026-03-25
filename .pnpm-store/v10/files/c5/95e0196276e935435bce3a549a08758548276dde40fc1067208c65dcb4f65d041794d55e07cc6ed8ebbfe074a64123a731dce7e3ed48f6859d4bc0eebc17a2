// Copied from several files in node's source code.
// https://github.com/nodejs/node/blob/2d5d77306f6dff9110c1f77fefab25f973415770/lib/internal/modules/cjs/loader.js
// Each function and variable below must have a comment linking to the source in node's github repo.

'use strict';

const {
  ArrayIsArray,
  ArrayPrototypeIncludes,
  ArrayPrototypeJoin,
  ArrayPrototypePush,
  JSONParse,
  ObjectKeys,
  RegExpPrototypeTest,
  SafeMap,
  SafeWeakMap,
  StringPrototypeCharCodeAt,
  StringPrototypeEndsWith,
  StringPrototypeLastIndexOf,
  StringPrototypeIndexOf,
  StringPrototypeMatch,
  StringPrototypeSlice,
  StringPrototypeStartsWith,
} = require('./node-primordials');
const { NativeModule } = require('./node-nativemodule');
const { pathToFileURL, fileURLToPath } = require('url');
const fs = require('fs');
const path = require('path');
const { sep } = path;
const { internalModuleStat } = require('./node-internalBinding-fs');
const packageJsonReader = require('./node-internal-modules-package_json_reader');
const {
  cjsConditions,
} = require('./node-internal-modules-cjs-helpers');
const { getOptionValue } = require('./node-options');
const preserveSymlinks = getOptionValue('--preserve-symlinks');
const preserveSymlinksMain = getOptionValue('--preserve-symlinks-main');
const {normalizeSlashes} = require('../dist/util');
const {createErrRequireEsm} = require('./node-internal-errors');
const {
  codes: {
    ERR_INVALID_MODULE_SPECIFIER,
  },
} = require('./node-internal-errors');

const {
  CHAR_FORWARD_SLASH,
} = require('./node-internal-constants');

const Module = require('module');

const isWindows = process.platform === 'win32';

let statCache = null;

function stat(filename) {
  filename = path.toNamespacedPath(filename);
  if (statCache !== null) {
    const result = statCache.get(filename);
    if (result !== undefined) return result;
  }
  const result = internalModuleStat(filename);
  if (statCache !== null && result >= 0) {
    // Only set cache when `internalModuleStat(filename)` succeeds.
    statCache.set(filename, result);
  }
  return result;
}

// Note:
// we cannot get access to node's internal cache, which is populated from
// within node's Module constructor.  So the cache here will always be empty.
// It's possible we could approximate our own cache by building it up with
// hacky workarounds, but it's not worth the complexity and flakiness.
const moduleParentCache = new SafeWeakMap();

// Given a module name, and a list of paths to test, returns the first
// matching file in the following precedence.
//
// require("a.<ext>")
//   -> a.<ext>
//
// require("a")
//   -> a
//   -> a.<ext>
//   -> a/index.<ext>

const packageJsonCache = new SafeMap();

function readPackage(requestPath) {
  const jsonPath = path.resolve(requestPath, 'package.json');

  const existing = packageJsonCache.get(jsonPath);
  if (existing !== undefined) return existing;

  const result = packageJsonReader.read(jsonPath);
  const json = result.containsKeys === false ? '{}' : result.string;
  if (json === undefined) {
    packageJsonCache.set(jsonPath, false);
    return false;
  }

  try {
    const parsed = JSONParse(json);
    const filtered = {
      name: parsed.name,
      main: parsed.main,
      exports: parsed.exports,
      imports: parsed.imports,
      type: parsed.type
    };
    packageJsonCache.set(jsonPath, filtered);
    return filtered;
  } catch (e) {
    e.path = jsonPath;
    e.message = 'Error parsing ' + jsonPath + ': ' + e.message;
    throw e;
  }
}

function readPackageScope(checkPath) {
  const rootSeparatorIndex = StringPrototypeIndexOf(checkPath, sep);
  let separatorIndex;
  do {
    separatorIndex = StringPrototypeLastIndexOf(checkPath, sep);
    checkPath = StringPrototypeSlice(checkPath, 0, separatorIndex);
    if (StringPrototypeEndsWith(checkPath, sep + 'node_modules'))
      return false;
    const pjson = readPackage(checkPath + sep);
    if (pjson) return {
      data: pjson,
      path: checkPath,
    };
  } while (separatorIndex > rootSeparatorIndex);
  return false;
}

/**
 * @param {{
 *   nodeEsmResolver: ReturnType<typeof import('./node-internal-modules-esm-resolve').createResolve>,
 *   extensions: import('../src/file-extensions').Extensions,
 *   preferTsExts
 * }} opts
 */
function createCjsLoader(opts) {
const {nodeEsmResolver, preferTsExts} = opts;
const {replacementsForCjs, replacementsForJs, replacementsForMjs, replacementsForJsx} = opts.extensions;
const {
  encodedSepRegEx,
  packageExportsResolve,
  packageImportsResolve
} = nodeEsmResolver;

function tryPackage(requestPath, exts, isMain, originalPath) {
  // const pkg = readPackage(requestPath)?.main;
  const tmp = readPackage(requestPath)
  const pkg = tmp != null ? tmp.main : undefined;

  if (!pkg) {
    return tryExtensions(path.resolve(requestPath, 'index'), exts, isMain);
  }

  const filename = path.resolve(requestPath, pkg);
  let actual = tryReplacementExtensions(filename, isMain) ||
    tryFile(filename, isMain) ||
    tryExtensions(filename, exts, isMain) ||
    tryExtensions(path.resolve(filename, 'index'), exts, isMain);
  if (actual === false) {
    actual = tryExtensions(path.resolve(requestPath, 'index'), exts, isMain);
    if (!actual) {
      // eslint-disable-next-line no-restricted-syntax
      const err = new Error(
        `Cannot find module '${filename}'. ` +
        'Please verify that the package.json has a valid "main" entry'
      );
      err.code = 'MODULE_NOT_FOUND';
      err.path = path.resolve(requestPath, 'package.json');
      err.requestPath = originalPath;
      // TODO(BridgeAR): Add the requireStack as well.
      throw err;
    } else {
      const jsonPath = path.resolve(requestPath, 'package.json');
      process.emitWarning(
        `Invalid 'main' field in '${jsonPath}' of '${pkg}'. ` +
          'Please either fix that or report it to the module author',
        'DeprecationWarning',
        'DEP0128'
      );
    }
  }
  return actual;
}

// In order to minimize unnecessary lstat() calls,
// this cache is a list of known-real paths.
// Set to an empty Map to reset.
const realpathCache = new SafeMap();

// Check if the file exists and is not a directory
// if using --preserve-symlinks and isMain is false,
// keep symlinks intact, otherwise resolve to the
// absolute realpath.
function tryFile(requestPath, isMain) {
  const rc = stat(requestPath);
  if (rc !== 0) return;
  if (preserveSymlinks && !isMain) {
    return path.resolve(requestPath);
  }
  return toRealPath(requestPath);
}

function toRealPath(requestPath) {
  return fs.realpathSync(requestPath, {
    // [internalFS.realpathCacheKey]: realpathCache
  });
}

function statReplacementExtensions(p) {
  const lastDotIndex = p.lastIndexOf('.');
  if(lastDotIndex >= 0) {
    const ext = p.slice(lastDotIndex);
    if (ext === '.js' || ext === '.jsx' || ext === '.mjs' || ext === '.cjs') {
      const pathnameWithoutExtension = p.slice(0, lastDotIndex);
      const replacementExts =
        ext === '.js' ? replacementsForJs
        : ext === '.jsx' ? replacementsForJsx
        : ext === '.mjs' ? replacementsForMjs
        : replacementsForCjs;
      for (let i = 0; i < replacementExts.length; i++) {
        const filename = pathnameWithoutExtension + replacementExts[i];
        const rc = stat(filename);
        if (rc === 0) {
          return [rc, filename];
        }
      }
    }
  }
  return [stat(p), p];
}
function tryReplacementExtensions(p, isMain) {
  const lastDotIndex = p.lastIndexOf('.');
  if(lastDotIndex >= 0) {
    const ext = p.slice(lastDotIndex);
    if (ext === '.js' || ext === '.jsx' || ext === '.mjs' || ext === '.cjs') {
      const pathnameWithoutExtension = p.slice(0, lastDotIndex);
      const replacementExts =
        ext === '.js' ? replacementsForJs
        : ext === '.jsx' ? replacementsForJsx
        : ext === '.mjs' ? replacementsForMjs
        : replacementsForCjs;
      for (let i = 0; i < replacementExts.length; i++) {
        const filename = tryFile(pathnameWithoutExtension + replacementExts[i], isMain);
        if (filename) {
          return filename;
        }
      }
    }
  }
  return false;
}

// Given a path, check if the file exists with any of the set extensions
function tryExtensions(p, exts, isMain) {
  for (let i = 0; i < exts.length; i++) {
    const filename = tryFile(p + exts[i], isMain);

    if (filename) {
      return filename;
    }
  }
  return false;
}

function trySelfParentPath(parent) {
  if (!parent) return false;

  if (parent.filename) {
    return parent.filename;
  } else if (parent.id === '<repl>' || parent.id === 'internal/preload') {
    try {
      return process.cwd() + path.sep;
    } catch {
      return false;
    }
  }
}

function trySelf(parentPath, request) {
  if (!parentPath) return false;

  const { data: pkg, path: pkgPath } = readPackageScope(parentPath) || {};
  if (!pkg || pkg.exports === undefined) return false;
  if (typeof pkg.name !== 'string') return false;

  let expansion;
  if (request === pkg.name) {
    expansion = '.';
  } else if (StringPrototypeStartsWith(request, `${pkg.name}/`)) {
    expansion = '.' + StringPrototypeSlice(request, pkg.name.length);
  } else {
    return false;
  }

  try {
    return finalizeEsmResolution(packageExportsResolve(
      pathToFileURL(pkgPath + '/package.json'), expansion, pkg,
      pathToFileURL(parentPath), cjsConditions).resolved, parentPath, pkgPath);
  } catch (e) {
    if (e.code === 'ERR_MODULE_NOT_FOUND')
      throw createEsmNotFoundErr(request, pkgPath + '/package.json');
    throw e;
  }
}

// This only applies to requests of a specific form:
// 1. name/.*
// 2. @scope/name/.*
const EXPORTS_PATTERN = /^((?:@[^/\\%]+\/)?[^./\\%][^/\\%]*)(\/.*)?$/;
function resolveExports(nmPath, request) {
  // The implementation's behavior is meant to mirror resolution in ESM.
  const { 1: name, 2: expansion = '' } =
    StringPrototypeMatch(request, EXPORTS_PATTERN) || [];
  if (!name)
    return;
  const pkgPath = path.resolve(nmPath, name);
  const pkg = readPackage(pkgPath);
  // if (pkg?.exports != null) {
  if (pkg != null && pkg.exports != null) {
    try {
      return finalizeEsmResolution(packageExportsResolve(
        pathToFileURL(pkgPath + '/package.json'), '.' + expansion, pkg, null,
        cjsConditions).resolved, null, pkgPath);
    } catch (e) {
      if (e.code === 'ERR_MODULE_NOT_FOUND')
        throw createEsmNotFoundErr(request, pkgPath + '/package.json');
      throw e;
    }
  }
}

// Backwards compat for old node versions
const hasModulePathCache = !!require('module')._pathCache;
const Module_pathCache = Object.create(null);
const Module_pathCache_get = hasModulePathCache ? (cacheKey) => Module._pathCache[cacheKey] : (cacheKey) => Module_pathCache[cacheKey];
const Module_pathCache_set = hasModulePathCache ? (cacheKey, value) => (Module._pathCache[cacheKey] = value) : (cacheKey) => (Module_pathCache[cacheKey] = value);

const trailingSlashRegex = /(?:^|\/)\.?\.$/;
const Module_findPath = function _findPath(request, paths, isMain) {
  const absoluteRequest = path.isAbsolute(request);
  if (absoluteRequest) {
    paths = [''];
  } else if (!paths || paths.length === 0) {
    return false;
  }

  const cacheKey = request + '\x00' + ArrayPrototypeJoin(paths, '\x00');
  const entry = Module_pathCache_get(cacheKey);
  if (entry)
    return entry;

  let exts;
  let trailingSlash = request.length > 0 &&
    StringPrototypeCharCodeAt(request, request.length - 1) ===
    CHAR_FORWARD_SLASH;
  if (!trailingSlash) {
    trailingSlash = RegExpPrototypeTest(trailingSlashRegex, request);
  }

  // For each path
  for (let i = 0; i < paths.length; i++) {
    // Don't search further if path doesn't exist
    const curPath = paths[i];
    if (curPath && stat(curPath) < 1) continue;

    if (!absoluteRequest) {
      const exportsResolved = resolveExports(curPath, request);
      if (exportsResolved)
        return exportsResolved;
    }

    const _basePath = path.resolve(curPath, request);
    let filename;

    const [rc, basePath] = statReplacementExtensions(_basePath);
    if (!trailingSlash) {
      if (rc === 0) {  // File.
        if (!isMain) {
          if (preserveSymlinks) {
            filename = path.resolve(basePath);
          } else {
            filename = toRealPath(basePath);
          }
        } else if (preserveSymlinksMain) {
          // For the main module, we use the preserveSymlinksMain flag instead
          // mainly for backward compatibility, as the preserveSymlinks flag
          // historically has not applied to the main module.  Most likely this
          // was intended to keep .bin/ binaries working, as following those
          // symlinks is usually required for the imports in the corresponding
          // files to resolve; that said, in some use cases following symlinks
          // causes bigger problems which is why the preserveSymlinksMain option
          // is needed.
          filename = path.resolve(basePath);
        } else {
          filename = toRealPath(basePath);
        }
      }

      if (!filename) {
        // Try it with each of the extensions
        if (exts === undefined)
          exts = ObjectKeys(Module._extensions);
        filename = tryExtensions(basePath, exts, isMain);
      }
    }

    if (!filename && rc === 1) {  // Directory.
      // try it with each of the extensions at "index"
      if (exts === undefined)
        exts = ObjectKeys(Module._extensions);
      filename = tryPackage(basePath, exts, isMain, request);
    }

    if (filename) {
      Module_pathCache_set(cacheKey, filename);
      return filename;
    }
  }

  return false;
};

const Module_resolveFilename = function _resolveFilename(request, parent, isMain, options) {
  if (StringPrototypeStartsWith(request, 'node:') ||
      NativeModule.canBeRequiredByUsers(request)) {
    return request;
  }

  let paths;

  if (typeof options === 'object' && options !== null) {
    if (ArrayIsArray(options.paths)) {
      const isRelative = StringPrototypeStartsWith(request, './') ||
          StringPrototypeStartsWith(request, '../') ||
          ((isWindows && StringPrototypeStartsWith(request, '.\\')) ||
          StringPrototypeStartsWith(request, '..\\'));

      if (isRelative) {
        paths = options.paths;
      } else {
        const fakeParent = new Module('', null);

        paths = [];

        for (let i = 0; i < options.paths.length; i++) {
          const path = options.paths[i];
          fakeParent.paths = Module._nodeModulePaths(path);
          const lookupPaths = Module._resolveLookupPaths(request, fakeParent);

          for (let j = 0; j < lookupPaths.length; j++) {
            if (!ArrayPrototypeIncludes(paths, lookupPaths[j]))
              ArrayPrototypePush(paths, lookupPaths[j]);
          }
        }
      }
    } else if (options.paths === undefined) {
      paths = Module._resolveLookupPaths(request, parent);
    } else {
      throw new ERR_INVALID_ARG_VALUE('options.paths', options.paths);
    }
  } else {
    paths = Module._resolveLookupPaths(request, parent);
  }

  // if (parent?.filename) {
  // node 12 hack
  if (parent != null && parent.filename) {
    if (request[0] === '#') {
      const pkg = readPackageScope(parent.filename) || {};

      // if (pkg.data?.imports != null) {
      // node 12 hack
      if (pkg.data != null && pkg.data.imports != null) {
        try {
          return finalizeEsmResolution(
            packageImportsResolve(request, pathToFileURL(parent.filename),
                                  cjsConditions), parent.filename,
            pkg.path);
        } catch (e) {
          if (e.code === 'ERR_MODULE_NOT_FOUND')
            throw createEsmNotFoundErr(request);
          throw e;
        }
      }
    }
  }

  // Try module self resolution first
  const parentPath = trySelfParentPath(parent);
  const selfResolved = trySelf(parentPath, request);
  if (selfResolved) {
    const cacheKey = request + '\x00' +
         (paths.length === 1 ? paths[0] : ArrayPrototypeJoin(paths, '\x00'));
    Module._pathCache[cacheKey] = selfResolved;
    return selfResolved;
  }

  // Look up the filename first, since that's the cache key.
  const filename = Module._findPath(request, paths, isMain, false);
  if (filename) return filename;
  const requireStack = [];
  for (let cursor = parent;
    cursor;
    cursor = moduleParentCache.get(cursor)) {
    ArrayPrototypePush(requireStack, cursor.filename || cursor.id);
  }
  let message = `Cannot find module '${request}'`;
  if (requireStack.length > 0) {
    message = message + '\nRequire stack:\n- ' +
              ArrayPrototypeJoin(requireStack, '\n- ');
  }
  // eslint-disable-next-line no-restricted-syntax
  const err = new Error(message);
  err.code = 'MODULE_NOT_FOUND';
  err.requireStack = requireStack;
  throw err;
};

function finalizeEsmResolution(resolved, parentPath, pkgPath) {
  if (RegExpPrototypeTest(encodedSepRegEx, resolved))
    throw new ERR_INVALID_MODULE_SPECIFIER(
      resolved, 'must not include encoded "/" or "\\" characters', parentPath);
  const filename = fileURLToPath(resolved);
  const actual = tryReplacementExtensions(filename) || tryFile(filename);
  if (actual)
    return actual;
  const err = createEsmNotFoundErr(filename,
                                   path.resolve(pkgPath, 'package.json'));
  throw err;
}

function createEsmNotFoundErr(request, path) {
  // eslint-disable-next-line no-restricted-syntax
  const err = new Error(`Cannot find module '${request}'`);
  err.code = 'MODULE_NOT_FOUND';
  if (path)
    err.path = path;
  // TODO(BridgeAR): Add the requireStack as well.
  return err;
}


return {
  Module_findPath,
  Module_resolveFilename
}

}

/**
 * copied from Module._extensions['.js']
 * https://github.com/nodejs/node/blob/v15.3.0/lib/internal/modules/cjs/loader.js#L1113-L1120
 * @param {import('../src/index').Service} service
 * @param {NodeJS.Module} module
 * @param {string} filename
 */
function assertScriptCanLoadAsCJSImpl(service, module, filename) {
  const pkg = readPackageScope(filename);

  // ts-node modification: allow our configuration to override
  const tsNodeClassification = service.moduleTypeClassifier.classifyModuleByModuleTypeOverrides(normalizeSlashes(filename));
  if(tsNodeClassification.moduleType === 'cjs') return;

  // ignore package.json when file extension is ESM-only or CJS-only
  // [MUST_UPDATE_FOR_NEW_FILE_EXTENSIONS]
  const lastDotIndex = filename.lastIndexOf('.');
  const ext = lastDotIndex >= 0 ? filename.slice(lastDotIndex) : '';

  if((ext === '.cts' || ext === '.cjs') && tsNodeClassification.moduleType === 'auto') return;

  // Function require shouldn't be used in ES modules.
  if (ext === '.mts' || ext === '.mjs' || tsNodeClassification.moduleType === 'esm' || (pkg && pkg.data && pkg.data.type === 'module')) {
    const parentPath = module.parent && module.parent.filename;
    const packageJsonPath = pkg ? path.resolve(pkg.path, 'package.json') : null;
    throw createErrRequireEsm(filename, parentPath, packageJsonPath);
  }
}


module.exports = {
  createCjsLoader,
  assertScriptCanLoadAsCJSImpl,
  readPackageScope
};
