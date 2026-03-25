'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = void 0;
function path() {
  const data = _interopRequireWildcard(require('path'));
  path = function () {
    return data;
  };
  return data;
}
function _chalk() {
  const data = _interopRequireDefault(require('chalk'));
  _chalk = function () {
    return data;
  };
  return data;
}
function _slash() {
  const data = _interopRequireDefault(require('slash'));
  _slash = function () {
    return data;
  };
  return data;
}
function _jestUtil() {
  const data = require('jest-util');
  _jestUtil = function () {
    return data;
  };
  return data;
}
var _ModuleNotFoundError = _interopRequireDefault(
  require('./ModuleNotFoundError')
);
var _defaultResolver = _interopRequireDefault(require('./defaultResolver'));
var _fileWalkers = require('./fileWalkers');
var _isBuiltinModule = _interopRequireDefault(require('./isBuiltinModule'));
var _nodeModulesPaths = _interopRequireWildcard(require('./nodeModulesPaths'));
var _shouldLoadAsEsm = _interopRequireWildcard(require('./shouldLoadAsEsm'));
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {default: obj};
}
function _getRequireWildcardCache(nodeInterop) {
  if (typeof WeakMap !== 'function') return null;
  var cacheBabelInterop = new WeakMap();
  var cacheNodeInterop = new WeakMap();
  return (_getRequireWildcardCache = function (nodeInterop) {
    return nodeInterop ? cacheNodeInterop : cacheBabelInterop;
  })(nodeInterop);
}
function _interopRequireWildcard(obj, nodeInterop) {
  if (!nodeInterop && obj && obj.__esModule) {
    return obj;
  }
  if (obj === null || (typeof obj !== 'object' && typeof obj !== 'function')) {
    return {default: obj};
  }
  var cache = _getRequireWildcardCache(nodeInterop);
  if (cache && cache.has(obj)) {
    return cache.get(obj);
  }
  var newObj = {};
  var hasPropertyDescriptor =
    Object.defineProperty && Object.getOwnPropertyDescriptor;
  for (var key in obj) {
    if (key !== 'default' && Object.prototype.hasOwnProperty.call(obj, key)) {
      var desc = hasPropertyDescriptor
        ? Object.getOwnPropertyDescriptor(obj, key)
        : null;
      if (desc && (desc.get || desc.set)) {
        Object.defineProperty(newObj, key, desc);
      } else {
        newObj[key] = obj[key];
      }
    }
  }
  newObj.default = obj;
  if (cache) {
    cache.set(obj, newObj);
  }
  return newObj;
}
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable local/prefer-spread-eventually */

const NATIVE_PLATFORM = 'native';

// We might be inside a symlink.
const resolvedCwd = (0, _jestUtil().tryRealpath)(process.cwd());
const {NODE_PATH} = process.env;
const nodePaths = NODE_PATH
  ? NODE_PATH.split(path().delimiter)
      .filter(Boolean)
      // The resolver expects absolute paths.
      .map(p => path().resolve(resolvedCwd, p))
  : undefined;
class Resolver {
  _options;
  _moduleMap;
  _moduleIDCache;
  _moduleNameCache;
  _modulePathCache;
  _supportsNativePlatform;
  constructor(moduleMap, options) {
    this._options = {
      defaultPlatform: options.defaultPlatform,
      extensions: options.extensions,
      hasCoreModules:
        options.hasCoreModules === undefined ? true : options.hasCoreModules,
      moduleDirectories: options.moduleDirectories || ['node_modules'],
      moduleNameMapper: options.moduleNameMapper,
      modulePaths: options.modulePaths,
      platforms: options.platforms,
      resolver: options.resolver,
      rootDir: options.rootDir
    };
    this._supportsNativePlatform = options.platforms
      ? options.platforms.includes(NATIVE_PLATFORM)
      : false;
    this._moduleMap = moduleMap;
    this._moduleIDCache = new Map();
    this._moduleNameCache = new Map();
    this._modulePathCache = new Map();
  }
  static ModuleNotFoundError = _ModuleNotFoundError.default;
  static tryCastModuleNotFoundError(error) {
    if (error instanceof _ModuleNotFoundError.default) {
      return error;
    }
    const casted = error;
    if (casted.code === 'MODULE_NOT_FOUND') {
      return _ModuleNotFoundError.default.duckType(casted);
    }
    return null;
  }
  static clearDefaultResolverCache() {
    (0, _fileWalkers.clearFsCache)();
    (0, _shouldLoadAsEsm.clearCachedLookups)();
  }
  static findNodeModule(path, options) {
    const resolverModule = loadResolver(options.resolver);
    let resolver = _defaultResolver.default;
    if (typeof resolverModule === 'function') {
      resolver = resolverModule;
    } else if (typeof resolverModule.sync === 'function') {
      resolver = resolverModule.sync;
    }
    const paths = options.paths;
    try {
      return resolver(path, {
        basedir: options.basedir,
        conditions: options.conditions,
        defaultResolver: _defaultResolver.default,
        extensions: options.extensions,
        moduleDirectory: options.moduleDirectory,
        paths: paths ? (nodePaths || []).concat(paths) : nodePaths,
        rootDir: options.rootDir
      });
    } catch (e) {
      // we always wanna throw if it's an internal import
      if (options.throwIfNotFound || path.startsWith('#')) {
        throw e;
      }
    }
    return null;
  }
  static async findNodeModuleAsync(path, options) {
    const resolverModule = loadResolver(options.resolver);
    let resolver = _defaultResolver.default;
    if (typeof resolverModule === 'function') {
      resolver = resolverModule;
    } else if (
      typeof resolverModule.async === 'function' ||
      typeof resolverModule.sync === 'function'
    ) {
      const asyncOrSync = resolverModule.async || resolverModule.sync;
      if (asyncOrSync == null) {
        throw new Error(`Unable to load resolver at ${options.resolver}`);
      }
      resolver = asyncOrSync;
    }
    const paths = options.paths;
    try {
      const result = await resolver(path, {
        basedir: options.basedir,
        conditions: options.conditions,
        defaultResolver: _defaultResolver.default,
        extensions: options.extensions,
        moduleDirectory: options.moduleDirectory,
        paths: paths ? (nodePaths || []).concat(paths) : nodePaths,
        rootDir: options.rootDir
      });
      return result;
    } catch (e) {
      // we always wanna throw if it's an internal import
      if (options.throwIfNotFound || path.startsWith('#')) {
        throw e;
      }
    }
    return null;
  }

  // unstable as it should be replaced by https://github.com/nodejs/modules/issues/393, and we don't want people to use it
  static unstable_shouldLoadAsEsm = _shouldLoadAsEsm.default;
  resolveModuleFromDirIfExists(dirname, moduleName, options) {
    const {extensions, key, moduleDirectory, paths, skipResolution} =
      this._prepareForResolution(dirname, moduleName, options);
    let module;

    // 1. If we have already resolved this module for this directory name,
    // return a value from the cache.
    const cacheResult = this._moduleNameCache.get(key);
    if (cacheResult) {
      return cacheResult;
    }

    // 2. Check if the module is a haste module.
    module = this.getModule(moduleName);
    if (module) {
      this._moduleNameCache.set(key, module);
      return module;
    }

    // 3. Check if the module is a node module and resolve it based on
    // the node module resolution algorithm. If skipNodeResolution is given we
    // ignore all modules that look like node modules (ie. are not relative
    // requires). This enables us to speed up resolution when we build a
    // dependency graph because we don't have to look at modules that may not
    // exist and aren't mocked.
    const resolveNodeModule = (name, throwIfNotFound = false) => {
      // Only skip default resolver
      if (this.isCoreModule(name) && !this._options.resolver) {
        return name;
      }
      return Resolver.findNodeModule(name, {
        basedir: dirname,
        conditions: options?.conditions,
        extensions,
        moduleDirectory,
        paths,
        resolver: this._options.resolver,
        rootDir: this._options.rootDir,
        throwIfNotFound
      });
    };
    if (!skipResolution) {
      module = resolveNodeModule(moduleName, Boolean(process.versions.pnp));
      if (module) {
        this._moduleNameCache.set(key, module);
        return module;
      }
    }

    // 4. Resolve "haste packages" which are `package.json` files outside of
    // `node_modules` folders anywhere in the file system.
    try {
      const hasteModulePath = this._getHasteModulePath(moduleName);
      if (hasteModulePath) {
        // try resolving with custom resolver first to support extensions,
        // then fallback to require.resolve
        const resolvedModule =
          resolveNodeModule(hasteModulePath) ||
          require.resolve(hasteModulePath);
        this._moduleNameCache.set(key, resolvedModule);
        return resolvedModule;
      }
    } catch {}
    return null;
  }
  async resolveModuleFromDirIfExistsAsync(dirname, moduleName, options) {
    const {extensions, key, moduleDirectory, paths, skipResolution} =
      this._prepareForResolution(dirname, moduleName, options);
    let module;

    // 1. If we have already resolved this module for this directory name,
    // return a value from the cache.
    const cacheResult = this._moduleNameCache.get(key);
    if (cacheResult) {
      return cacheResult;
    }

    // 2. Check if the module is a haste module.
    module = this.getModule(moduleName);
    if (module) {
      this._moduleNameCache.set(key, module);
      return module;
    }

    // 3. Check if the module is a node module and resolve it based on
    // the node module resolution algorithm. If skipNodeResolution is given we
    // ignore all modules that look like node modules (ie. are not relative
    // requires). This enables us to speed up resolution when we build a
    // dependency graph because we don't have to look at modules that may not
    // exist and aren't mocked.
    const resolveNodeModule = async (name, throwIfNotFound = false) => {
      // Only skip default resolver
      if (this.isCoreModule(name) && !this._options.resolver) {
        return name;
      }
      return Resolver.findNodeModuleAsync(name, {
        basedir: dirname,
        conditions: options?.conditions,
        extensions,
        moduleDirectory,
        paths,
        resolver: this._options.resolver,
        rootDir: this._options.rootDir,
        throwIfNotFound
      });
    };
    if (!skipResolution) {
      module = await resolveNodeModule(
        moduleName,
        Boolean(process.versions.pnp)
      );
      if (module) {
        this._moduleNameCache.set(key, module);
        return module;
      }
    }

    // 4. Resolve "haste packages" which are `package.json` files outside of
    // `node_modules` folders anywhere in the file system.
    try {
      const hasteModulePath = this._getHasteModulePath(moduleName);
      if (hasteModulePath) {
        // try resolving with custom resolver first to support extensions,
        // then fallback to require.resolve
        const resolvedModule =
          (await resolveNodeModule(hasteModulePath)) ||
          // QUESTION: should this be async?
          require.resolve(hasteModulePath);
        this._moduleNameCache.set(key, resolvedModule);
        return resolvedModule;
      }
    } catch {}
    return null;
  }
  resolveModule(from, moduleName, options) {
    const dirname = path().dirname(from);
    const module =
      this.resolveStubModuleName(from, moduleName) ||
      this.resolveModuleFromDirIfExists(dirname, moduleName, options);
    if (module) return module;

    // 5. Throw an error if the module could not be found. `resolve.sync` only
    // produces an error based on the dirname but we have the actual current
    // module name available.
    this._throwModNotFoundError(from, moduleName);
  }
  async resolveModuleAsync(from, moduleName, options) {
    const dirname = path().dirname(from);
    const module =
      (await this.resolveStubModuleNameAsync(from, moduleName)) ||
      (await this.resolveModuleFromDirIfExistsAsync(
        dirname,
        moduleName,
        options
      ));
    if (module) return module;

    // 5. Throw an error if the module could not be found. `resolve` only
    // produces an error based on the dirname but we have the actual current
    // module name available.
    this._throwModNotFoundError(from, moduleName);
  }

  /**
   * _prepareForResolution is shared between the sync and async module resolution
   * methods, to try to keep them as DRY as possible.
   */
  _prepareForResolution(dirname, moduleName, options) {
    const paths = options?.paths || this._options.modulePaths;
    const moduleDirectory = this._options.moduleDirectories;
    const stringifiedOptions = options ? JSON.stringify(options) : '';
    const key = dirname + path().delimiter + moduleName + stringifiedOptions;
    const defaultPlatform = this._options.defaultPlatform;
    const extensions = this._options.extensions.slice();
    if (this._supportsNativePlatform) {
      extensions.unshift(
        ...this._options.extensions.map(ext => `.${NATIVE_PLATFORM}${ext}`)
      );
    }
    if (defaultPlatform) {
      extensions.unshift(
        ...this._options.extensions.map(ext => `.${defaultPlatform}${ext}`)
      );
    }
    const skipResolution =
      options && options.skipNodeResolution && !moduleName.includes(path().sep);
    return {
      extensions,
      key,
      moduleDirectory,
      paths,
      skipResolution
    };
  }

  /**
   * _getHasteModulePath attempts to return the path to a haste module.
   */
  _getHasteModulePath(moduleName) {
    const parts = moduleName.split('/');
    const hastePackage = this.getPackage(parts.shift());
    if (hastePackage) {
      return path().join.apply(
        path(),
        [path().dirname(hastePackage)].concat(parts)
      );
    }
    return null;
  }
  _throwModNotFoundError(from, moduleName) {
    const relativePath =
      (0, _slash().default)(path().relative(this._options.rootDir, from)) ||
      '.';
    throw new _ModuleNotFoundError.default(
      `Cannot find module '${moduleName}' from '${relativePath}'`,
      moduleName
    );
  }
  _getMapModuleName(matches) {
    return matches
      ? moduleName =>
          moduleName.replace(
            /\$([0-9]+)/g,
            (_, index) => matches[parseInt(index, 10)] || ''
          )
      : moduleName => moduleName;
  }
  _isAliasModule(moduleName) {
    const moduleNameMapper = this._options.moduleNameMapper;
    if (!moduleNameMapper) {
      return false;
    }
    return moduleNameMapper.some(({regex}) => regex.test(moduleName));
  }
  isCoreModule(moduleName) {
    return (
      this._options.hasCoreModules &&
      ((0, _isBuiltinModule.default)(moduleName) ||
        moduleName.startsWith('node:')) &&
      !this._isAliasModule(moduleName)
    );
  }
  getModule(name) {
    return this._moduleMap.getModule(
      name,
      this._options.defaultPlatform,
      this._supportsNativePlatform
    );
  }
  getModulePath(from, moduleName) {
    if (moduleName[0] !== '.' || path().isAbsolute(moduleName)) {
      return moduleName;
    }
    return path().normalize(`${path().dirname(from)}/${moduleName}`);
  }
  getPackage(name) {
    return this._moduleMap.getPackage(
      name,
      this._options.defaultPlatform,
      this._supportsNativePlatform
    );
  }
  getMockModule(from, name) {
    const mock = this._moduleMap.getMockModule(name);
    if (mock) {
      return mock;
    } else {
      const moduleName = this.resolveStubModuleName(from, name);
      if (moduleName) {
        return this.getModule(moduleName) || moduleName;
      }
    }
    return null;
  }
  async getMockModuleAsync(from, name) {
    const mock = this._moduleMap.getMockModule(name);
    if (mock) {
      return mock;
    } else {
      const moduleName = await this.resolveStubModuleNameAsync(from, name);
      if (moduleName) {
        return this.getModule(moduleName) || moduleName;
      }
    }
    return null;
  }
  getModulePaths(from) {
    const cachedModule = this._modulePathCache.get(from);
    if (cachedModule) {
      return cachedModule;
    }
    const moduleDirectory = this._options.moduleDirectories;
    const paths = (0, _nodeModulesPaths.default)(from, {
      moduleDirectory
    });
    if (paths[paths.length - 1] === undefined) {
      // circumvent node-resolve bug that adds `undefined` as last item.
      paths.pop();
    }
    this._modulePathCache.set(from, paths);
    return paths;
  }
  getGlobalPaths(moduleName) {
    if (!moduleName || moduleName[0] === '.' || this.isCoreModule(moduleName)) {
      return [];
    }
    return _nodeModulesPaths.GlobalPaths;
  }
  getModuleID(virtualMocks, from, moduleName = '', options) {
    const stringifiedOptions = options ? JSON.stringify(options) : '';
    const key = from + path().delimiter + moduleName + stringifiedOptions;
    const cachedModuleID = this._moduleIDCache.get(key);
    if (cachedModuleID) {
      return cachedModuleID;
    }
    const moduleType = this._getModuleType(moduleName);
    const absolutePath = this._getAbsolutePath(
      virtualMocks,
      from,
      moduleName,
      options
    );
    const mockPath = this._getMockPath(from, moduleName);
    const sep = path().delimiter;
    const id =
      moduleType +
      sep +
      (absolutePath ? absolutePath + sep : '') +
      (mockPath ? mockPath + sep : '') +
      (stringifiedOptions ? stringifiedOptions + sep : '');
    this._moduleIDCache.set(key, id);
    return id;
  }
  async getModuleIDAsync(virtualMocks, from, moduleName = '', options) {
    const stringifiedOptions = options ? JSON.stringify(options) : '';
    const key = from + path().delimiter + moduleName + stringifiedOptions;
    const cachedModuleID = this._moduleIDCache.get(key);
    if (cachedModuleID) {
      return cachedModuleID;
    }
    if (moduleName.startsWith('data:')) {
      return moduleName;
    }
    const moduleType = this._getModuleType(moduleName);
    const absolutePath = await this._getAbsolutePathAsync(
      virtualMocks,
      from,
      moduleName,
      options
    );
    const mockPath = await this._getMockPathAsync(from, moduleName);
    const sep = path().delimiter;
    const id =
      moduleType +
      sep +
      (absolutePath ? absolutePath + sep : '') +
      (mockPath ? mockPath + sep : '') +
      (stringifiedOptions ? stringifiedOptions + sep : '');
    this._moduleIDCache.set(key, id);
    return id;
  }
  _getModuleType(moduleName) {
    return this.isCoreModule(moduleName) ? 'node' : 'user';
  }
  _getAbsolutePath(virtualMocks, from, moduleName, options) {
    if (this.isCoreModule(moduleName)) {
      return moduleName;
    }
    if (moduleName.startsWith('data:')) {
      return moduleName;
    }
    return this._isModuleResolved(from, moduleName)
      ? this.getModule(moduleName)
      : this._getVirtualMockPath(virtualMocks, from, moduleName, options);
  }
  async _getAbsolutePathAsync(virtualMocks, from, moduleName, options) {
    if (this.isCoreModule(moduleName)) {
      return moduleName;
    }
    if (moduleName.startsWith('data:')) {
      return moduleName;
    }
    const isModuleResolved = await this._isModuleResolvedAsync(
      from,
      moduleName
    );
    return isModuleResolved
      ? this.getModule(moduleName)
      : this._getVirtualMockPathAsync(virtualMocks, from, moduleName, options);
  }
  _getMockPath(from, moduleName) {
    return !this.isCoreModule(moduleName)
      ? this.getMockModule(from, moduleName)
      : null;
  }
  async _getMockPathAsync(from, moduleName) {
    return !this.isCoreModule(moduleName)
      ? this.getMockModuleAsync(from, moduleName)
      : null;
  }
  _getVirtualMockPath(virtualMocks, from, moduleName, options) {
    const virtualMockPath = this.getModulePath(from, moduleName);
    return virtualMocks.get(virtualMockPath)
      ? virtualMockPath
      : moduleName
      ? this.resolveModule(from, moduleName, options)
      : from;
  }
  async _getVirtualMockPathAsync(virtualMocks, from, moduleName, options) {
    const virtualMockPath = this.getModulePath(from, moduleName);
    return virtualMocks.get(virtualMockPath)
      ? virtualMockPath
      : moduleName
      ? this.resolveModuleAsync(from, moduleName, options)
      : from;
  }
  _isModuleResolved(from, moduleName) {
    return !!(
      this.getModule(moduleName) || this.getMockModule(from, moduleName)
    );
  }
  async _isModuleResolvedAsync(from, moduleName) {
    return !!(
      this.getModule(moduleName) ||
      (await this.getMockModuleAsync(from, moduleName))
    );
  }
  resolveStubModuleName(from, moduleName) {
    const dirname = path().dirname(from);
    const {extensions, moduleDirectory, paths} = this._prepareForResolution(
      dirname,
      moduleName
    );
    const moduleNameMapper = this._options.moduleNameMapper;
    const resolver = this._options.resolver;
    if (moduleNameMapper) {
      for (const {moduleName: mappedModuleName, regex} of moduleNameMapper) {
        if (regex.test(moduleName)) {
          // Note: once a moduleNameMapper matches the name, it must result
          // in a module, or else an error is thrown.
          const matches = moduleName.match(regex);
          const mapModuleName = this._getMapModuleName(matches);
          const possibleModuleNames = Array.isArray(mappedModuleName)
            ? mappedModuleName
            : [mappedModuleName];
          let module = null;
          for (const possibleModuleName of possibleModuleNames) {
            const updatedName = mapModuleName(possibleModuleName);
            module =
              this.getModule(updatedName) ||
              Resolver.findNodeModule(updatedName, {
                basedir: dirname,
                extensions,
                moduleDirectory,
                paths,
                resolver,
                rootDir: this._options.rootDir
              });
            if (module) {
              break;
            }
          }
          if (!module) {
            throw createNoMappedModuleFoundError(
              moduleName,
              mapModuleName,
              mappedModuleName,
              regex,
              resolver
            );
          }
          return module;
        }
      }
    }
    return null;
  }
  async resolveStubModuleNameAsync(from, moduleName) {
    const dirname = path().dirname(from);
    const {extensions, moduleDirectory, paths} = this._prepareForResolution(
      dirname,
      moduleName
    );
    const moduleNameMapper = this._options.moduleNameMapper;
    const resolver = this._options.resolver;
    if (moduleNameMapper) {
      for (const {moduleName: mappedModuleName, regex} of moduleNameMapper) {
        if (regex.test(moduleName)) {
          // Note: once a moduleNameMapper matches the name, it must result
          // in a module, or else an error is thrown.
          const matches = moduleName.match(regex);
          const mapModuleName = this._getMapModuleName(matches);
          const possibleModuleNames = Array.isArray(mappedModuleName)
            ? mappedModuleName
            : [mappedModuleName];
          let module = null;
          for (const possibleModuleName of possibleModuleNames) {
            const updatedName = mapModuleName(possibleModuleName);
            module =
              this.getModule(updatedName) ||
              (await Resolver.findNodeModuleAsync(updatedName, {
                basedir: dirname,
                extensions,
                moduleDirectory,
                paths,
                resolver,
                rootDir: this._options.rootDir
              }));
            if (module) {
              break;
            }
          }
          if (!module) {
            throw createNoMappedModuleFoundError(
              moduleName,
              mapModuleName,
              mappedModuleName,
              regex,
              resolver
            );
          }
          return module;
        }
      }
    }
    return null;
  }
}
exports.default = Resolver;
const createNoMappedModuleFoundError = (
  moduleName,
  mapModuleName,
  mappedModuleName,
  regex,
  resolver
) => {
  const mappedAs = Array.isArray(mappedModuleName)
    ? JSON.stringify(mappedModuleName.map(mapModuleName), null, 2)
    : mappedModuleName;
  const original = Array.isArray(mappedModuleName)
    ? `${
        JSON.stringify(mappedModuleName, null, 6) // using 6 because of misalignment when nested below
          .slice(0, -1) + ' '.repeat(4)
      }]` /// align last bracket correctly as well
    : mappedModuleName;
  const error = new Error(
    _chalk().default.red(`${_chalk().default.bold('Configuration error')}:

Could not locate module ${_chalk().default.bold(moduleName)} mapped as:
${_chalk().default.bold(mappedAs)}.

Please check your configuration for these entries:
{
  "moduleNameMapper": {
    "${regex.toString()}": "${_chalk().default.bold(original)}"
  },
  "resolver": ${_chalk().default.bold(String(resolver))}
}`)
  );
  error.name = '';
  return error;
};
function loadResolver(resolver) {
  if (resolver == null) {
    return _defaultResolver.default;
  }
  const loadedResolver = require(resolver);
  if (loadedResolver == null) {
    throw new Error(`Resolver located at ${resolver} does not export anything`);
  }
  if (typeof loadedResolver === 'function') {
    return loadedResolver;
  }
  if (
    typeof loadedResolver === 'object' &&
    (loadedResolver.sync != null || loadedResolver.async != null)
  ) {
    return loadedResolver;
  }
  throw new Error(
    `Resolver located at ${resolver} does not export a function or an object with "sync" and "async" props`
  );
}
