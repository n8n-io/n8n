'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = void 0;
function _module() {
  const data = _interopRequireDefault(require('module'));
  _module = function () {
    return data;
  };
  return data;
}
function path() {
  const data = _interopRequireWildcard(require('path'));
  path = function () {
    return data;
  };
  return data;
}
function _url() {
  const data = require('url');
  _url = function () {
    return data;
  };
  return data;
}
function _vm() {
  const data = require('vm');
  _vm = function () {
    return data;
  };
  return data;
}
function _cjsModuleLexer() {
  const data = require('cjs-module-lexer');
  _cjsModuleLexer = function () {
    return data;
  };
  return data;
}
function _collectV8Coverage() {
  const data = require('collect-v8-coverage');
  _collectV8Coverage = function () {
    return data;
  };
  return data;
}
function fs() {
  const data = _interopRequireWildcard(require('graceful-fs'));
  fs = function () {
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
function _stripBom() {
  const data = _interopRequireDefault(require('strip-bom'));
  _stripBom = function () {
    return data;
  };
  return data;
}
function _transform() {
  const data = require('@jest/transform');
  _transform = function () {
    return data;
  };
  return data;
}
function _jestHasteMap() {
  const data = _interopRequireDefault(require('jest-haste-map'));
  _jestHasteMap = function () {
    return data;
  };
  return data;
}
function _jestMessageUtil() {
  const data = require('jest-message-util');
  _jestMessageUtil = function () {
    return data;
  };
  return data;
}
function _jestRegexUtil() {
  const data = require('jest-regex-util');
  _jestRegexUtil = function () {
    return data;
  };
  return data;
}
function _jestResolve() {
  const data = _interopRequireDefault(require('jest-resolve'));
  _jestResolve = function () {
    return data;
  };
  return data;
}
function _jestSnapshot() {
  const data = require('jest-snapshot');
  _jestSnapshot = function () {
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
var _helpers = require('./helpers');
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
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {default: obj};
}
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const esmIsAvailable = typeof _vm().SourceTextModule === 'function';
const dataURIRegex =
  /^data:(?<mime>text\/javascript|application\/json|application\/wasm)(?:;(?<encoding>charset=utf-8|base64))?,(?<code>.*)$/;
const defaultTransformOptions = {
  isInternalModule: false,
  supportsDynamicImport: esmIsAvailable,
  supportsExportNamespaceFrom: false,
  supportsStaticESM: false,
  supportsTopLevelAwait: false
};
// These are modules that we know
// * are safe to require from the outside (not stateful, not prone to errors passing in instances from different realms), and
// * take sufficiently long to require to warrant an optimization.
// When required from the outside, they use the worker's require cache and are thus
// only loaded once per worker, not once per test file.
// Use /benchmarks/test-file-overhead to measure the impact.
// Note that this only applies when they are required in an internal context;
// users who require one of these modules in their tests will still get the module from inside the VM.
// Prefer listing a module here only if it is impractical to use the jest-resolve-outside-vm-option where it is required,
// e.g. because there are many require sites spread across the dependency graph.
const INTERNAL_MODULE_REQUIRE_OUTSIDE_OPTIMIZED_MODULES = new Set(['chalk']);
const JEST_RESOLVE_OUTSIDE_VM_OPTION = Symbol.for(
  'jest-resolve-outside-vm-option'
);
const testTimeoutSymbol = Symbol.for('TEST_TIMEOUT_SYMBOL');
const retryTimesSymbol = Symbol.for('RETRY_TIMES');
const logErrorsBeforeRetrySymbol = Symbol.for('LOG_ERRORS_BEFORE_RETRY');
const NODE_MODULES = `${path().sep}node_modules${path().sep}`;
const getModuleNameMapper = config => {
  if (
    Array.isArray(config.moduleNameMapper) &&
    config.moduleNameMapper.length
  ) {
    return config.moduleNameMapper.map(([regex, moduleName]) => ({
      moduleName,
      regex: new RegExp(regex)
    }));
  }
  return null;
};
const isWasm = modulePath => modulePath.endsWith('.wasm');
const unmockRegExpCache = new WeakMap();
const EVAL_RESULT_VARIABLE = 'Object.<anonymous>';
const runtimeSupportsVmModules = typeof _vm().SyntheticModule === 'function';
const supportsNodeColonModulePrefixInRequire = (() => {
  try {
    require('node:fs');
    return true;
  } catch {
    return false;
  }
})();
class Runtime {
  _cacheFS;
  _cacheFSBuffer = new Map();
  _config;
  _globalConfig;
  _coverageOptions;
  _currentlyExecutingModulePath;
  _environment;
  _explicitShouldMock;
  _explicitShouldMockModule;
  _fakeTimersImplementation;
  _internalModuleRegistry;
  _isCurrentlyExecutingManualMock;
  _mainModule;
  _mockFactories;
  _mockMetaDataCache;
  _mockRegistry;
  _isolatedMockRegistry;
  _moduleMockRegistry;
  _moduleMockFactories;
  _moduleMocker;
  _isolatedModuleRegistry;
  _moduleRegistry;
  _esmoduleRegistry;
  _cjsNamedExports;
  _esmModuleLinkingMap;
  _testPath;
  _resolver;
  _shouldAutoMock;
  _shouldMockModuleCache;
  _shouldUnmockTransitiveDependenciesCache;
  _sourceMapRegistry;
  _scriptTransformer;
  _fileTransforms;
  _fileTransformsMutex;
  _v8CoverageInstrumenter;
  _v8CoverageResult;
  _v8CoverageSources;
  _transitiveShouldMock;
  _unmockList;
  _virtualMocks;
  _virtualModuleMocks;
  _moduleImplementation;
  jestObjectCaches;
  jestGlobals;
  esmConditions;
  cjsConditions;
  isTornDown = false;
  constructor(
    config,
    environment,
    resolver,
    transformer,
    cacheFS,
    coverageOptions,
    testPath,
    // TODO: make mandatory in Jest 30
    globalConfig
  ) {
    this._cacheFS = cacheFS;
    this._config = config;
    this._coverageOptions = coverageOptions;
    this._currentlyExecutingModulePath = '';
    this._environment = environment;
    this._globalConfig = globalConfig;
    this._explicitShouldMock = new Map();
    this._explicitShouldMockModule = new Map();
    this._internalModuleRegistry = new Map();
    this._isCurrentlyExecutingManualMock = null;
    this._mainModule = null;
    this._mockFactories = new Map();
    this._mockRegistry = new Map();
    this._moduleMockRegistry = new Map();
    this._moduleMockFactories = new Map();
    invariant(
      this._environment.moduleMocker,
      '`moduleMocker` must be set on an environment when created'
    );
    this._moduleMocker = this._environment.moduleMocker;
    this._isolatedModuleRegistry = null;
    this._isolatedMockRegistry = null;
    this._moduleRegistry = new Map();
    this._esmoduleRegistry = new Map();
    this._cjsNamedExports = new Map();
    this._esmModuleLinkingMap = new WeakMap();
    this._testPath = testPath;
    this._resolver = resolver;
    this._scriptTransformer = transformer;
    this._shouldAutoMock = config.automock;
    this._sourceMapRegistry = new Map();
    this._fileTransforms = new Map();
    this._fileTransformsMutex = new Map();
    this._virtualMocks = new Map();
    this._virtualModuleMocks = new Map();
    this.jestObjectCaches = new Map();
    this._mockMetaDataCache = new Map();
    this._shouldMockModuleCache = new Map();
    this._shouldUnmockTransitiveDependenciesCache = new Map();
    this._transitiveShouldMock = new Map();
    this._fakeTimersImplementation = config.fakeTimers.legacyFakeTimers
      ? this._environment.fakeTimers
      : this._environment.fakeTimersModern;
    this._unmockList = unmockRegExpCache.get(config);
    if (!this._unmockList && config.unmockedModulePathPatterns) {
      this._unmockList = new RegExp(
        config.unmockedModulePathPatterns.join('|')
      );
      unmockRegExpCache.set(config, this._unmockList);
    }
    const envExportConditions = this._environment.exportConditions?.() ?? [];
    this.esmConditions = Array.from(
      new Set(['import', 'default', ...envExportConditions])
    );
    this.cjsConditions = Array.from(
      new Set(['require', 'default', ...envExportConditions])
    );
    if (config.automock) {
      config.setupFiles.forEach(filePath => {
        if (filePath.includes(NODE_MODULES)) {
          const moduleID = this._resolver.getModuleID(
            this._virtualMocks,
            filePath,
            undefined,
            // shouldn't really matter, but in theory this will make sure the caching is correct
            {
              conditions: this.unstable_shouldLoadAsEsm(filePath)
                ? this.esmConditions
                : this.cjsConditions
            }
          );
          this._transitiveShouldMock.set(moduleID, false);
        }
      });
    }
    this.resetModules();
  }
  static shouldInstrument = _transform().shouldInstrument;
  static async createContext(config, options) {
    (0, _jestUtil().createDirectory)(config.cacheDirectory);
    const instance = await Runtime.createHasteMap(config, {
      console: options.console,
      maxWorkers: options.maxWorkers,
      resetCache: !config.cache,
      watch: options.watch,
      watchman: options.watchman
    });
    const hasteMap = await instance.build();
    return {
      config,
      hasteFS: hasteMap.hasteFS,
      moduleMap: hasteMap.moduleMap,
      resolver: Runtime.createResolver(config, hasteMap.moduleMap)
    };
  }
  static createHasteMap(config, options) {
    const ignorePatternParts = [
      ...config.modulePathIgnorePatterns,
      ...(options && options.watch ? config.watchPathIgnorePatterns : []),
      config.cacheDirectory.startsWith(config.rootDir + path().sep) &&
        config.cacheDirectory
    ].filter(Boolean);
    const ignorePattern =
      ignorePatternParts.length > 0
        ? new RegExp(ignorePatternParts.join('|'))
        : undefined;
    return _jestHasteMap().default.create({
      cacheDirectory: config.cacheDirectory,
      computeSha1: config.haste.computeSha1,
      console: options?.console,
      dependencyExtractor: config.dependencyExtractor,
      enableSymlinks: config.haste.enableSymlinks,
      extensions: [_jestSnapshot().EXTENSION].concat(
        config.moduleFileExtensions
      ),
      forceNodeFilesystemAPI: config.haste.forceNodeFilesystemAPI,
      hasteImplModulePath: config.haste.hasteImplModulePath,
      hasteMapModulePath: config.haste.hasteMapModulePath,
      id: config.id,
      ignorePattern,
      maxWorkers: options?.maxWorkers || 1,
      mocksPattern: (0, _jestRegexUtil().escapePathForRegex)(
        `${path().sep}__mocks__${path().sep}`
      ),
      platforms: config.haste.platforms || ['ios', 'android'],
      resetCache: options?.resetCache,
      retainAllFiles: config.haste.retainAllFiles || false,
      rootDir: config.rootDir,
      roots: config.roots,
      throwOnModuleCollision: config.haste.throwOnModuleCollision,
      useWatchman: options?.watchman,
      watch: options?.watch,
      workerThreads: options?.workerThreads
    });
  }
  static createResolver(config, moduleMap) {
    return new (_jestResolve().default)(moduleMap, {
      defaultPlatform: config.haste.defaultPlatform,
      extensions: config.moduleFileExtensions.map(extension => `.${extension}`),
      hasCoreModules: true,
      moduleDirectories: config.moduleDirectories,
      moduleNameMapper: getModuleNameMapper(config),
      modulePaths: config.modulePaths,
      platforms: config.haste.platforms,
      resolver: config.resolver,
      rootDir: config.rootDir
    });
  }
  static async runCLI() {
    throw new Error('The jest-runtime CLI has been moved into jest-repl');
  }
  static getCLIOptions() {
    throw new Error('The jest-runtime CLI has been moved into jest-repl');
  }

  // unstable as it should be replaced by https://github.com/nodejs/modules/issues/393, and we don't want people to use it
  unstable_shouldLoadAsEsm(modulePath) {
    return (
      isWasm(modulePath) ||
      _jestResolve().default.unstable_shouldLoadAsEsm(
        modulePath,
        this._config.extensionsToTreatAsEsm
      )
    );
  }
  async loadEsmModule(modulePath, query = '') {
    const cacheKey = modulePath + query;
    if (this._fileTransformsMutex.has(cacheKey)) {
      await this._fileTransformsMutex.get(cacheKey);
    }
    if (!this._esmoduleRegistry.has(cacheKey)) {
      invariant(
        typeof this._environment.getVmContext === 'function',
        'ES Modules are only supported if your test environment has the `getVmContext` function'
      );
      const context = this._environment.getVmContext();
      invariant(context, 'Test environment has been torn down');
      let transformResolve;
      let transformReject;
      this._fileTransformsMutex.set(
        cacheKey,
        new Promise((resolve, reject) => {
          transformResolve = resolve;
          transformReject = reject;
        })
      );
      invariant(
        transformResolve && transformReject,
        'Promise initialization should be sync - please report this bug to Jest!'
      );
      if (isWasm(modulePath)) {
        const wasm = this._importWasmModule(
          this.readFileBuffer(modulePath),
          modulePath,
          context
        );
        this._esmoduleRegistry.set(cacheKey, wasm);
        transformResolve();
        return wasm;
      }
      if (this._resolver.isCoreModule(modulePath)) {
        const core = this._importCoreModule(modulePath, context);
        this._esmoduleRegistry.set(cacheKey, core);
        transformResolve();
        return core;
      }
      const transformedCode = await this.transformFileAsync(modulePath, {
        isInternalModule: false,
        supportsDynamicImport: true,
        supportsExportNamespaceFrom: true,
        supportsStaticESM: true,
        supportsTopLevelAwait: true
      });
      try {
        let module;
        if (modulePath.endsWith('.json')) {
          module = new (_vm().SyntheticModule)(
            ['default'],
            function () {
              const obj = JSON.parse(transformedCode);
              // @ts-expect-error: TS doesn't know what `this` is
              this.setExport('default', obj);
            },
            {
              context,
              identifier: modulePath
            }
          );
        } else {
          module = new (_vm().SourceTextModule)(transformedCode, {
            context,
            identifier: modulePath,
            importModuleDynamically: async (specifier, referencingModule) => {
              invariant(
                runtimeSupportsVmModules,
                'You need to run with a version of node that supports ES Modules in the VM API. See https://jestjs.io/docs/ecmascript-modules'
              );
              const module = await this.resolveModule(
                specifier,
                referencingModule.identifier,
                referencingModule.context
              );
              return this.linkAndEvaluateModule(module);
            },
            initializeImportMeta: meta => {
              meta.url = (0, _url().pathToFileURL)(modulePath).href;
              let jest = this.jestObjectCaches.get(modulePath);
              if (!jest) {
                jest = this._createJestObjectFor(modulePath);
                this.jestObjectCaches.set(modulePath, jest);
              }
              meta.jest = jest;
            }
          });
        }
        invariant(
          !this._esmoduleRegistry.has(cacheKey),
          `Module cache already has entry ${cacheKey}. This is a bug in Jest, please report it!`
        );
        this._esmoduleRegistry.set(cacheKey, module);
        transformResolve();
      } catch (error) {
        transformReject(error);
        throw error;
      }
    }
    const module = this._esmoduleRegistry.get(cacheKey);
    invariant(
      module,
      'Module cache does not contain module. This is a bug in Jest, please open up an issue'
    );
    return module;
  }
  async resolveModule(specifier, referencingIdentifier, context) {
    if (this.isTornDown) {
      this._logFormattedReferenceError(
        'You are trying to `import` a file after the Jest environment has been torn down.'
      );
      process.exitCode = 1;
      // @ts-expect-error - exiting
      return;
    }
    if (specifier === '@jest/globals') {
      const fromCache = this._esmoduleRegistry.get('@jest/globals');
      if (fromCache) {
        return fromCache;
      }
      const globals = this.getGlobalsForEsm(referencingIdentifier, context);
      this._esmoduleRegistry.set('@jest/globals', globals);
      return globals;
    }
    if (specifier.startsWith('data:')) {
      if (
        await this._shouldMockModule(
          referencingIdentifier,
          specifier,
          this._explicitShouldMockModule
        )
      ) {
        return this.importMock(referencingIdentifier, specifier, context);
      }
      const fromCache = this._esmoduleRegistry.get(specifier);
      if (fromCache) {
        return fromCache;
      }
      const match = specifier.match(dataURIRegex);
      if (!match || !match.groups) {
        throw new Error('Invalid data URI');
      }
      const mime = match.groups.mime;
      const encoding = match.groups.encoding;
      let module;
      if (mime === 'application/wasm') {
        if (!encoding) {
          throw new Error('Missing data URI encoding');
        }
        if (encoding !== 'base64') {
          throw new Error(`Invalid data URI encoding: ${encoding}`);
        }
        module = await this._importWasmModule(
          Buffer.from(match.groups.code, 'base64'),
          specifier,
          context
        );
      } else {
        let code = match.groups.code;
        if (!encoding || encoding === 'charset=utf-8') {
          code = decodeURIComponent(code);
        } else if (encoding === 'base64') {
          code = Buffer.from(code, 'base64').toString();
        } else {
          throw new Error(`Invalid data URI encoding: ${encoding}`);
        }
        if (mime === 'application/json') {
          module = new (_vm().SyntheticModule)(
            ['default'],
            function () {
              const obj = JSON.parse(code);
              // @ts-expect-error: TS doesn't know what `this` is
              this.setExport('default', obj);
            },
            {
              context,
              identifier: specifier
            }
          );
        } else {
          module = new (_vm().SourceTextModule)(code, {
            context,
            identifier: specifier,
            importModuleDynamically: async (specifier, referencingModule) => {
              invariant(
                runtimeSupportsVmModules,
                'You need to run with a version of node that supports ES Modules in the VM API. See https://jestjs.io/docs/ecmascript-modules'
              );
              const module = await this.resolveModule(
                specifier,
                referencingModule.identifier,
                referencingModule.context
              );
              return this.linkAndEvaluateModule(module);
            },
            initializeImportMeta(meta) {
              // no `jest` here as it's not loaded in a file
              meta.url = specifier;
            }
          });
        }
      }
      this._esmoduleRegistry.set(specifier, module);
      return module;
    }
    if (specifier.startsWith('file://')) {
      specifier = (0, _url().fileURLToPath)(specifier);
    }
    const [path, query] = specifier.split('?');
    if (
      await this._shouldMockModule(
        referencingIdentifier,
        path,
        this._explicitShouldMockModule
      )
    ) {
      return this.importMock(referencingIdentifier, path, context);
    }
    const resolved = await this._resolveModule(referencingIdentifier, path);
    if (
      // json files are modules when imported in modules
      resolved.endsWith('.json') ||
      this._resolver.isCoreModule(resolved) ||
      this.unstable_shouldLoadAsEsm(resolved)
    ) {
      return this.loadEsmModule(resolved, query);
    }
    return this.loadCjsAsEsm(referencingIdentifier, resolved, context);
  }
  async linkAndEvaluateModule(module) {
    if (this.isTornDown) {
      this._logFormattedReferenceError(
        'You are trying to `import` a file after the Jest environment has been torn down.'
      );
      process.exitCode = 1;
      return;
    }
    if (module.status === 'unlinked') {
      // since we might attempt to link the same module in parallel, stick the promise in a weak map so every call to
      // this method can await it
      this._esmModuleLinkingMap.set(
        module,
        module.link((specifier, referencingModule) =>
          this.resolveModule(
            specifier,
            referencingModule.identifier,
            referencingModule.context
          )
        )
      );
    }
    await this._esmModuleLinkingMap.get(module);
    if (module.status === 'linked') {
      await module.evaluate();
    }
    return module;
  }
  async unstable_importModule(from, moduleName) {
    invariant(
      runtimeSupportsVmModules,
      'You need to run with a version of node that supports ES Modules in the VM API. See https://jestjs.io/docs/ecmascript-modules'
    );
    const [path, query] = (moduleName ?? '').split('?');
    const modulePath = await this._resolveModule(from, path);
    const module = await this.loadEsmModule(modulePath, query);
    return this.linkAndEvaluateModule(module);
  }
  loadCjsAsEsm(from, modulePath, context) {
    // CJS loaded via `import` should share cache with other CJS: https://github.com/nodejs/modules/issues/503
    const cjs = this.requireModuleOrMock(from, modulePath);
    const parsedExports = this.getExportsOfCjs(modulePath);
    const cjsExports = [...parsedExports].filter(exportName => {
      // we don't wanna respect any exports _named_ default as a named export
      if (exportName === 'default') {
        return false;
      }
      return Object.hasOwnProperty.call(cjs, exportName);
    });
    const module = new (_vm().SyntheticModule)(
      [...cjsExports, 'default'],
      function () {
        cjsExports.forEach(exportName => {
          // @ts-expect-error: TS doesn't know what `this` is
          this.setExport(exportName, cjs[exportName]);
        });
        // @ts-expect-error: TS doesn't know what `this` is
        this.setExport('default', cjs);
      },
      {
        context,
        identifier: modulePath
      }
    );
    return evaluateSyntheticModule(module);
  }
  async importMock(from, moduleName, context) {
    const moduleID = await this._resolver.getModuleIDAsync(
      this._virtualModuleMocks,
      from,
      moduleName,
      {
        conditions: this.esmConditions
      }
    );
    if (this._moduleMockRegistry.has(moduleID)) {
      return this._moduleMockRegistry.get(moduleID);
    }
    if (this._moduleMockFactories.has(moduleID)) {
      const invokedFactory = await this._moduleMockFactories.get(
        moduleID
        // has check above makes this ok
      )();

      const module = new (_vm().SyntheticModule)(
        Object.keys(invokedFactory),
        function () {
          Object.entries(invokedFactory).forEach(([key, value]) => {
            // @ts-expect-error: TS doesn't know what `this` is
            this.setExport(key, value);
          });
        },
        {
          context,
          identifier: moduleName
        }
      );
      this._moduleMockRegistry.set(moduleID, module);
      return evaluateSyntheticModule(module);
    }
    throw new Error('Attempting to import a mock without a factory');
  }
  getExportsOfCjs(modulePath) {
    const cachedNamedExports = this._cjsNamedExports.get(modulePath);
    if (cachedNamedExports) {
      return cachedNamedExports;
    }
    const transformedCode =
      this._fileTransforms.get(modulePath)?.code ?? this.readFile(modulePath);
    const {exports, reexports} = (0, _cjsModuleLexer().parse)(transformedCode);
    const namedExports = new Set(exports);
    reexports.forEach(reexport => {
      if (this._resolver.isCoreModule(reexport)) {
        const exports = this.requireModule(modulePath, reexport);
        if (exports !== null && typeof exports === 'object') {
          Object.keys(exports).forEach(namedExports.add, namedExports);
        }
      } else {
        const resolved = this._resolveCjsModule(modulePath, reexport);
        const exports = this.getExportsOfCjs(resolved);
        exports.forEach(namedExports.add, namedExports);
      }
    });
    this._cjsNamedExports.set(modulePath, namedExports);
    return namedExports;
  }
  requireModule(from, moduleName, options, isRequireActual = false) {
    const isInternal = options?.isInternalModule ?? false;
    const moduleID = this._resolver.getModuleID(
      this._virtualMocks,
      from,
      moduleName,
      {
        conditions: this.cjsConditions
      }
    );
    let modulePath;

    // Some old tests rely on this mocking behavior. Ideally we'll change this
    // to be more explicit.
    const moduleResource = moduleName && this._resolver.getModule(moduleName);
    const manualMock =
      moduleName && this._resolver.getMockModule(from, moduleName);
    if (
      !options?.isInternalModule &&
      !isRequireActual &&
      !moduleResource &&
      manualMock &&
      manualMock !== this._isCurrentlyExecutingManualMock &&
      this._explicitShouldMock.get(moduleID) !== false
    ) {
      modulePath = manualMock;
    }
    if (moduleName && this._resolver.isCoreModule(moduleName)) {
      return this._requireCoreModule(
        moduleName,
        supportsNodeColonModulePrefixInRequire
      );
    }
    if (!modulePath) {
      modulePath = this._resolveCjsModule(from, moduleName);
    }
    if (this.unstable_shouldLoadAsEsm(modulePath)) {
      // Node includes more info in the message
      const error = new Error(
        `Must use import to load ES Module: ${modulePath}`
      );
      error.code = 'ERR_REQUIRE_ESM';
      throw error;
    }
    let moduleRegistry;
    if (isInternal) {
      moduleRegistry = this._internalModuleRegistry;
    } else if (this._isolatedModuleRegistry) {
      moduleRegistry = this._isolatedModuleRegistry;
    } else {
      moduleRegistry = this._moduleRegistry;
    }
    const module = moduleRegistry.get(modulePath);
    if (module) {
      return module.exports;
    }

    // We must register the pre-allocated module object first so that any
    // circular dependencies that may arise while evaluating the module can
    // be satisfied.
    const localModule = {
      children: [],
      exports: {},
      filename: modulePath,
      id: modulePath,
      loaded: false,
      path: path().dirname(modulePath)
    };
    moduleRegistry.set(modulePath, localModule);
    try {
      this._loadModule(
        localModule,
        from,
        moduleName,
        modulePath,
        options,
        moduleRegistry
      );
    } catch (error) {
      moduleRegistry.delete(modulePath);
      throw error;
    }
    return localModule.exports;
  }
  requireInternalModule(from, to) {
    if (to) {
      const require = (
        _module().default.createRequire ??
        _module().default.createRequireFromPath
      )(from);
      if (INTERNAL_MODULE_REQUIRE_OUTSIDE_OPTIMIZED_MODULES.has(to)) {
        return require(to);
      }
      const outsideJestVmPath = (0, _helpers.decodePossibleOutsideJestVmPath)(
        to
      );
      if (outsideJestVmPath) {
        return require(outsideJestVmPath);
      }
    }
    return this.requireModule(from, to, {
      isInternalModule: true,
      supportsDynamicImport: esmIsAvailable,
      supportsExportNamespaceFrom: false,
      supportsStaticESM: false,
      supportsTopLevelAwait: false
    });
  }
  requireActual(from, moduleName) {
    return this.requireModule(from, moduleName, undefined, true);
  }
  requireMock(from, moduleName) {
    const moduleID = this._resolver.getModuleID(
      this._virtualMocks,
      from,
      moduleName,
      {
        conditions: this.cjsConditions
      }
    );
    if (this._isolatedMockRegistry?.has(moduleID)) {
      return this._isolatedMockRegistry.get(moduleID);
    } else if (this._mockRegistry.has(moduleID)) {
      return this._mockRegistry.get(moduleID);
    }
    const mockRegistry = this._isolatedMockRegistry || this._mockRegistry;
    if (this._mockFactories.has(moduleID)) {
      // has check above makes this ok
      const module = this._mockFactories.get(moduleID)();
      mockRegistry.set(moduleID, module);
      return module;
    }
    const manualMockOrStub = this._resolver.getMockModule(from, moduleName);
    let modulePath =
      this._resolver.getMockModule(from, moduleName) ||
      this._resolveCjsModule(from, moduleName);
    let isManualMock =
      manualMockOrStub &&
      !this._resolver.resolveStubModuleName(from, moduleName);
    if (!isManualMock) {
      // If the actual module file has a __mocks__ dir sitting immediately next
      // to it, look to see if there is a manual mock for this file.
      //
      // subDir1/my_module.js
      // subDir1/__mocks__/my_module.js
      // subDir2/my_module.js
      // subDir2/__mocks__/my_module.js
      //
      // Where some other module does a relative require into each of the
      // respective subDir{1,2} directories and expects a manual mock
      // corresponding to that particular my_module.js file.

      const moduleDir = path().dirname(modulePath);
      const moduleFileName = path().basename(modulePath);
      const potentialManualMock = path().join(
        moduleDir,
        '__mocks__',
        moduleFileName
      );
      if (fs().existsSync(potentialManualMock)) {
        isManualMock = true;
        modulePath = potentialManualMock;
      }
    }
    if (isManualMock) {
      const localModule = {
        children: [],
        exports: {},
        filename: modulePath,
        id: modulePath,
        loaded: false,
        path: path().dirname(modulePath)
      };
      this._loadModule(
        localModule,
        from,
        moduleName,
        modulePath,
        undefined,
        mockRegistry
      );
      mockRegistry.set(moduleID, localModule.exports);
    } else {
      // Look for a real module to generate an automock from
      mockRegistry.set(moduleID, this._generateMock(from, moduleName));
    }
    return mockRegistry.get(moduleID);
  }
  _loadModule(
    localModule,
    from,
    moduleName,
    modulePath,
    options,
    moduleRegistry
  ) {
    if (path().extname(modulePath) === '.json') {
      const text = (0, _stripBom().default)(this.readFile(modulePath));
      const transformedFile = this._scriptTransformer.transformJson(
        modulePath,
        this._getFullTransformationOptions(options),
        text
      );
      localModule.exports =
        this._environment.global.JSON.parse(transformedFile);
    } else if (path().extname(modulePath) === '.node') {
      localModule.exports = require(modulePath);
    } else {
      // Only include the fromPath if a moduleName is given. Else treat as root.
      const fromPath = moduleName ? from : null;
      this._execModule(
        localModule,
        options,
        moduleRegistry,
        fromPath,
        moduleName
      );
    }
    localModule.loaded = true;
  }
  _getFullTransformationOptions(options = defaultTransformOptions) {
    return {
      ...options,
      ...this._coverageOptions
    };
  }
  requireModuleOrMock(from, moduleName) {
    // this module is unmockable
    if (moduleName === '@jest/globals') {
      // @ts-expect-error: we don't care that it's not assignable to T
      return this.getGlobalsForCjs(from);
    }
    try {
      if (this._shouldMockCjs(from, moduleName, this._explicitShouldMock)) {
        return this.requireMock(from, moduleName);
      } else {
        return this.requireModule(from, moduleName);
      }
    } catch (e) {
      const moduleNotFound =
        _jestResolve().default.tryCastModuleNotFoundError(e);
      if (moduleNotFound) {
        if (
          moduleNotFound.siblingWithSimilarExtensionFound === null ||
          moduleNotFound.siblingWithSimilarExtensionFound === undefined
        ) {
          moduleNotFound.hint = (0, _helpers.findSiblingsWithFileExtension)(
            this._config.moduleFileExtensions,
            from,
            moduleNotFound.moduleName || moduleName
          );
          moduleNotFound.siblingWithSimilarExtensionFound = Boolean(
            moduleNotFound.hint
          );
        }
        moduleNotFound.buildMessage(this._config.rootDir);
        throw moduleNotFound;
      }
      throw e;
    }
  }
  isolateModules(fn) {
    if (this._isolatedModuleRegistry || this._isolatedMockRegistry) {
      throw new Error(
        'isolateModules cannot be nested inside another isolateModules or isolateModulesAsync.'
      );
    }
    this._isolatedModuleRegistry = new Map();
    this._isolatedMockRegistry = new Map();
    try {
      fn();
    } finally {
      // might be cleared within the callback
      this._isolatedModuleRegistry?.clear();
      this._isolatedMockRegistry?.clear();
      this._isolatedModuleRegistry = null;
      this._isolatedMockRegistry = null;
    }
  }
  async isolateModulesAsync(fn) {
    if (this._isolatedModuleRegistry || this._isolatedMockRegistry) {
      throw new Error(
        'isolateModulesAsync cannot be nested inside another isolateModulesAsync or isolateModules.'
      );
    }
    this._isolatedModuleRegistry = new Map();
    this._isolatedMockRegistry = new Map();
    try {
      await fn();
    } finally {
      // might be cleared within the callback
      this._isolatedModuleRegistry?.clear();
      this._isolatedMockRegistry?.clear();
      this._isolatedModuleRegistry = null;
      this._isolatedMockRegistry = null;
    }
  }
  resetModules() {
    this._isolatedModuleRegistry?.clear();
    this._isolatedMockRegistry?.clear();
    this._isolatedModuleRegistry = null;
    this._isolatedMockRegistry = null;
    this._mockRegistry.clear();
    this._moduleRegistry.clear();
    this._esmoduleRegistry.clear();
    this._fileTransformsMutex.clear();
    this._cjsNamedExports.clear();
    this._moduleMockRegistry.clear();
    this._cacheFS.clear();
    this._cacheFSBuffer.clear();
    if (
      this._coverageOptions.collectCoverage &&
      this._coverageOptions.coverageProvider === 'v8' &&
      this._v8CoverageSources
    ) {
      this._v8CoverageSources = new Map([
        ...this._v8CoverageSources,
        ...this._fileTransforms
      ]);
    }
    this._fileTransforms.clear();
    if (this._environment) {
      if (this._environment.global) {
        const envGlobal = this._environment.global;
        Object.keys(envGlobal).forEach(key => {
          const globalMock = envGlobal[key];
          if (
            ((typeof globalMock === 'object' && globalMock !== null) ||
              typeof globalMock === 'function') &&
            '_isMockFunction' in globalMock &&
            globalMock._isMockFunction === true
          ) {
            globalMock.mockClear();
          }
        });
      }
      if (this._environment.fakeTimers) {
        this._environment.fakeTimers.clearAllTimers();
      }
    }
  }
  async collectV8Coverage() {
    this._v8CoverageInstrumenter =
      new (_collectV8Coverage().CoverageInstrumenter)();
    this._v8CoverageSources = new Map();
    await this._v8CoverageInstrumenter.startInstrumenting();
  }
  async stopCollectingV8Coverage() {
    if (!this._v8CoverageInstrumenter || !this._v8CoverageSources) {
      throw new Error('You need to call `collectV8Coverage` first.');
    }
    this._v8CoverageResult =
      await this._v8CoverageInstrumenter.stopInstrumenting();
    this._v8CoverageSources = new Map([
      ...this._v8CoverageSources,
      ...this._fileTransforms
    ]);
  }
  getAllCoverageInfoCopy() {
    return (0, _jestUtil().deepCyclicCopy)(
      this._environment.global.__coverage__
    );
  }
  getAllV8CoverageInfoCopy() {
    if (!this._v8CoverageResult || !this._v8CoverageSources) {
      throw new Error('You need to call `stopCollectingV8Coverage` first.');
    }
    return this._v8CoverageResult
      .filter(res => res.url.startsWith('file://'))
      .map(res => ({
        ...res,
        url: (0, _url().fileURLToPath)(res.url)
      }))
      .filter(
        res =>
          // TODO: will this work on windows? It might be better if `shouldInstrument` deals with it anyways
          res.url.startsWith(this._config.rootDir) &&
          (0, _transform().shouldInstrument)(
            res.url,
            this._coverageOptions,
            this._config,
            /* loadedFilenames */ Array.from(this._v8CoverageSources.keys())
          )
      )
      .map(result => {
        const transformedFile = this._v8CoverageSources.get(result.url);
        return {
          codeTransformResult: transformedFile,
          result
        };
      });
  }
  getSourceMaps() {
    return this._sourceMapRegistry;
  }
  setMock(from, moduleName, mockFactory, options) {
    if (options?.virtual) {
      const mockPath = this._resolver.getModulePath(from, moduleName);
      this._virtualMocks.set(mockPath, true);
    }
    const moduleID = this._resolver.getModuleID(
      this._virtualMocks,
      from,
      moduleName,
      {
        conditions: this.cjsConditions
      }
    );
    this._explicitShouldMock.set(moduleID, true);
    this._mockFactories.set(moduleID, mockFactory);
  }
  setModuleMock(from, moduleName, mockFactory, options) {
    if (options?.virtual) {
      const mockPath = this._resolver.getModulePath(from, moduleName);
      this._virtualModuleMocks.set(mockPath, true);
    }
    const moduleID = this._resolver.getModuleID(
      this._virtualModuleMocks,
      from,
      moduleName,
      {
        conditions: this.esmConditions
      }
    );
    this._explicitShouldMockModule.set(moduleID, true);
    this._moduleMockFactories.set(moduleID, mockFactory);
  }
  restoreAllMocks() {
    this._moduleMocker.restoreAllMocks();
  }
  resetAllMocks() {
    this._moduleMocker.resetAllMocks();
  }
  clearAllMocks() {
    this._moduleMocker.clearAllMocks();
  }
  teardown() {
    this.restoreAllMocks();
    this.resetModules();
    this._internalModuleRegistry.clear();
    this._mainModule = null;
    this._mockFactories.clear();
    this._moduleMockFactories.clear();
    this._mockMetaDataCache.clear();
    this._shouldMockModuleCache.clear();
    this._shouldUnmockTransitiveDependenciesCache.clear();
    this._explicitShouldMock.clear();
    this._explicitShouldMockModule.clear();
    this._transitiveShouldMock.clear();
    this._virtualMocks.clear();
    this._virtualModuleMocks.clear();
    this._cacheFS.clear();
    this._unmockList = undefined;
    this._sourceMapRegistry.clear();
    this._fileTransforms.clear();
    this.jestObjectCaches.clear();
    this._v8CoverageSources?.clear();
    this._v8CoverageResult = [];
    this._v8CoverageInstrumenter = undefined;
    this._moduleImplementation = undefined;
    this.isTornDown = true;
  }
  _resolveCjsModule(from, to) {
    return to
      ? this._resolver.resolveModule(from, to, {
          conditions: this.cjsConditions
        })
      : from;
  }
  _resolveModule(from, to) {
    return to
      ? this._resolver.resolveModuleAsync(from, to, {
          conditions: this.esmConditions
        })
      : from;
  }
  _requireResolve(from, moduleName, options = {}) {
    if (moduleName == null) {
      throw new Error(
        'The first argument to require.resolve must be a string. Received null or undefined.'
      );
    }
    if (path().isAbsolute(moduleName)) {
      const module = this._resolver.resolveModuleFromDirIfExists(
        moduleName,
        moduleName,
        {
          conditions: this.cjsConditions,
          paths: []
        }
      );
      if (module) {
        return module;
      }
    } else {
      const {paths} = options;
      if (paths) {
        for (const p of paths) {
          const absolutePath = path().resolve(from, '..', p);
          const module = this._resolver.resolveModuleFromDirIfExists(
            absolutePath,
            moduleName,
            // required to also resolve files without leading './' directly in the path
            {
              conditions: this.cjsConditions,
              paths: [absolutePath]
            }
          );
          if (module) {
            return module;
          }
        }
        throw new (_jestResolve().default.ModuleNotFoundError)(
          `Cannot resolve module '${moduleName}' from paths ['${paths.join(
            "', '"
          )}'] from ${from}`
        );
      }
    }
    try {
      return this._resolveCjsModule(from, moduleName);
    } catch (err) {
      const module = this._resolver.getMockModule(from, moduleName);
      if (module) {
        return module;
      } else {
        throw err;
      }
    }
  }
  _requireResolvePaths(from, moduleName) {
    const fromDir = path().resolve(from, '..');
    if (moduleName == null) {
      throw new Error(
        'The first argument to require.resolve.paths must be a string. Received null or undefined.'
      );
    }
    if (!moduleName.length) {
      throw new Error(
        'The first argument to require.resolve.paths must not be the empty string.'
      );
    }
    if (moduleName[0] === '.') {
      return [fromDir];
    }
    if (this._resolver.isCoreModule(moduleName)) {
      return null;
    }
    const modulePaths = this._resolver.getModulePaths(fromDir);
    const globalPaths = this._resolver.getGlobalPaths(moduleName);
    return [...modulePaths, ...globalPaths];
  }
  _execModule(localModule, options, moduleRegistry, from, moduleName) {
    if (this.isTornDown) {
      this._logFormattedReferenceError(
        'You are trying to `import` a file after the Jest environment has been torn down.'
      );
      process.exitCode = 1;
      return;
    }

    // If the environment was disposed, prevent this module from being executed.
    if (!this._environment.global) {
      return;
    }
    const module = localModule;
    const filename = module.filename;
    const lastExecutingModulePath = this._currentlyExecutingModulePath;
    this._currentlyExecutingModulePath = filename;
    const origCurrExecutingManualMock = this._isCurrentlyExecutingManualMock;
    this._isCurrentlyExecutingManualMock = filename;
    module.children = [];
    Object.defineProperty(module, 'parent', {
      enumerable: true,
      get() {
        const key = from || '';
        return moduleRegistry.get(key) || null;
      }
    });
    const modulePaths = this._resolver.getModulePaths(module.path);
    const globalPaths = this._resolver.getGlobalPaths(moduleName);
    module.paths = [...modulePaths, ...globalPaths];
    Object.defineProperty(module, 'require', {
      value: this._createRequireImplementation(module, options)
    });
    const transformedCode = this.transformFile(filename, options);
    let compiledFunction = null;
    const script = this.createScriptFromCode(transformedCode, filename);
    let runScript = null;
    const vmContext = this._environment.getVmContext();
    if (vmContext) {
      runScript = script.runInContext(vmContext, {
        filename
      });
    }
    if (runScript !== null) {
      compiledFunction = runScript[EVAL_RESULT_VARIABLE];
    }
    if (compiledFunction === null) {
      this._logFormattedReferenceError(
        'You are trying to `import` a file after the Jest environment has been torn down.'
      );
      process.exitCode = 1;
      return;
    }
    const jestObject = this._createJestObjectFor(filename);
    this.jestObjectCaches.set(filename, jestObject);
    const lastArgs = [
      this._config.injectGlobals ? jestObject : undefined,
      // jest object
      ...this._config.sandboxInjectedGlobals.map(globalVariable => {
        if (this._environment.global[globalVariable]) {
          return this._environment.global[globalVariable];
        }
        throw new Error(
          `You have requested '${globalVariable}' as a global variable, but it was not present. Please check your config or your global environment.`
        );
      })
    ];
    if (!this._mainModule && filename === this._testPath) {
      this._mainModule = module;
    }
    Object.defineProperty(module, 'main', {
      enumerable: true,
      value: this._mainModule
    });
    try {
      compiledFunction.call(
        module.exports,
        module,
        // module object
        module.exports,
        // module exports
        module.require,
        // require implementation
        module.path,
        // __dirname
        module.filename,
        // __filename
        lastArgs[0],
        ...lastArgs.slice(1).filter(notEmpty)
      );
    } catch (error) {
      this.handleExecutionError(error, module);
    }
    this._isCurrentlyExecutingManualMock = origCurrExecutingManualMock;
    this._currentlyExecutingModulePath = lastExecutingModulePath;
  }
  transformFile(filename, options) {
    const source = this.readFile(filename);
    if (options?.isInternalModule) {
      return source;
    }
    const transformedFile = this._scriptTransformer.transform(
      filename,
      this._getFullTransformationOptions(options),
      source
    );
    this._fileTransforms.set(filename, {
      ...transformedFile,
      wrapperLength: this.constructModuleWrapperStart().length
    });
    if (transformedFile.sourceMapPath) {
      this._sourceMapRegistry.set(filename, transformedFile.sourceMapPath);
    }
    return transformedFile.code;
  }
  async transformFileAsync(filename, options) {
    const source = this.readFile(filename);
    if (options?.isInternalModule) {
      return source;
    }
    const transformedFile = await this._scriptTransformer.transformAsync(
      filename,
      this._getFullTransformationOptions(options),
      source
    );
    if (this._fileTransforms.get(filename)?.code !== transformedFile.code) {
      this._fileTransforms.set(filename, {
        ...transformedFile,
        wrapperLength: 0
      });
    }
    if (transformedFile.sourceMapPath) {
      this._sourceMapRegistry.set(filename, transformedFile.sourceMapPath);
    }
    return transformedFile.code;
  }
  createScriptFromCode(scriptSource, filename) {
    try {
      const scriptFilename = this._resolver.isCoreModule(filename)
        ? `jest-nodejs-core-${filename}`
        : filename;
      return new (_vm().Script)(this.wrapCodeInModuleWrapper(scriptSource), {
        columnOffset: this._fileTransforms.get(filename)?.wrapperLength,
        displayErrors: true,
        filename: scriptFilename,
        // @ts-expect-error: Experimental ESM API
        importModuleDynamically: async specifier => {
          invariant(
            runtimeSupportsVmModules,
            'You need to run with a version of node that supports ES Modules in the VM API. See https://jestjs.io/docs/ecmascript-modules'
          );
          const context = this._environment.getVmContext?.();
          invariant(context, 'Test environment has been torn down');
          const module = await this.resolveModule(
            specifier,
            scriptFilename,
            context
          );
          return this.linkAndEvaluateModule(module);
        }
      });
    } catch (e) {
      throw (0, _transform().handlePotentialSyntaxError)(e);
    }
  }
  _requireCoreModule(moduleName, supportPrefix) {
    const moduleWithoutNodePrefix =
      supportPrefix && moduleName.startsWith('node:')
        ? moduleName.slice('node:'.length)
        : moduleName;
    if (moduleWithoutNodePrefix === 'process') {
      return this._environment.global.process;
    }
    if (moduleWithoutNodePrefix === 'module') {
      return this._getMockedNativeModule();
    }
    return require(moduleName);
  }
  _importCoreModule(moduleName, context) {
    const required = this._requireCoreModule(moduleName, true);
    const module = new (_vm().SyntheticModule)(
      ['default', ...Object.keys(required)],
      function () {
        // @ts-expect-error: TS doesn't know what `this` is
        this.setExport('default', required);
        Object.entries(required).forEach(([key, value]) => {
          // @ts-expect-error: TS doesn't know what `this` is
          this.setExport(key, value);
        });
      },
      // should identifier be `node://${moduleName}`?
      {
        context,
        identifier: moduleName
      }
    );
    return evaluateSyntheticModule(module);
  }
  async _importWasmModule(source, identifier, context) {
    const wasmModule = await WebAssembly.compile(source);
    const exports = WebAssembly.Module.exports(wasmModule);
    const imports = WebAssembly.Module.imports(wasmModule);
    const moduleLookup = {};
    for (const {module} of imports) {
      if (moduleLookup[module] === undefined) {
        const resolvedModule = await this.resolveModule(
          module,
          identifier,
          context
        );
        moduleLookup[module] = await this.linkAndEvaluateModule(resolvedModule);
      }
    }
    const syntheticModule = new (_vm().SyntheticModule)(
      exports.map(({name}) => name),
      function () {
        const importsObject = {};
        for (const {module, name} of imports) {
          if (!importsObject[module]) {
            importsObject[module] = {};
          }
          importsObject[module][name] = moduleLookup[module].namespace[name];
        }
        const wasmInstance = new WebAssembly.Instance(
          wasmModule,
          importsObject
        );
        for (const {name} of exports) {
          // @ts-expect-error: TS doesn't know what `this` is
          this.setExport(name, wasmInstance.exports[name]);
        }
      },
      {
        context,
        identifier
      }
    );
    return syntheticModule;
  }
  _getMockedNativeModule() {
    if (this._moduleImplementation) {
      return this._moduleImplementation;
    }
    const createRequire = modulePath => {
      const filename =
        typeof modulePath === 'string'
          ? modulePath.startsWith('file:///')
            ? (0, _url().fileURLToPath)(new (_url().URL)(modulePath))
            : modulePath
          : (0, _url().fileURLToPath)(modulePath);
      if (!path().isAbsolute(filename)) {
        const error = new TypeError(
          `The argument 'filename' must be a file URL object, file URL string, or absolute path string. Received '${filename}'`
        );
        error.code = 'ERR_INVALID_ARG_TYPE';
        throw error;
      }
      return this._createRequireImplementation({
        children: [],
        exports: {},
        filename,
        id: filename,
        loaded: false,
        path: path().dirname(filename)
      });
    };

    // should we implement the class ourselves?
    class Module extends _module().default.Module {}
    Object.entries(_module().default.Module).forEach(([key, value]) => {
      // @ts-expect-error: no index signature
      Module[key] = value;
    });
    Module.Module = Module;
    if ('createRequire' in _module().default) {
      Module.createRequire = createRequire;
    }
    if ('createRequireFromPath' in _module().default) {
      Module.createRequireFromPath = function createRequireFromPath(filename) {
        if (typeof filename !== 'string') {
          const error = new TypeError(
            `The argument 'filename' must be string. Received '${filename}'.${
              filename instanceof _url().URL
                ? ' Use createRequire for URL filename.'
                : ''
            }`
          );
          error.code = 'ERR_INVALID_ARG_TYPE';
          throw error;
        }
        return createRequire(filename);
      };
    }
    if ('syncBuiltinESMExports' in _module().default) {
      // cast since TS seems very confused about whether it exists or not
      Module.syncBuiltinESMExports =
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        function syncBuiltinESMExports() {};
    }
    this._moduleImplementation = Module;
    return Module;
  }
  _generateMock(from, moduleName) {
    const modulePath =
      this._resolver.resolveStubModuleName(from, moduleName) ||
      this._resolveCjsModule(from, moduleName);
    if (!this._mockMetaDataCache.has(modulePath)) {
      // This allows us to handle circular dependencies while generating an
      // automock

      this._mockMetaDataCache.set(
        modulePath,
        this._moduleMocker.getMetadata({}) || {}
      );

      // In order to avoid it being possible for automocking to potentially
      // cause side-effects within the module environment, we need to execute
      // the module in isolation. This could cause issues if the module being
      // mocked has calls into side-effectful APIs on another module.
      const origMockRegistry = this._mockRegistry;
      const origModuleRegistry = this._moduleRegistry;
      this._mockRegistry = new Map();
      this._moduleRegistry = new Map();
      const moduleExports = this.requireModule(from, moduleName);

      // Restore the "real" module/mock registries
      this._mockRegistry = origMockRegistry;
      this._moduleRegistry = origModuleRegistry;
      const mockMetadata = this._moduleMocker.getMetadata(moduleExports);
      if (mockMetadata == null) {
        throw new Error(
          `Failed to get mock metadata: ${modulePath}\n\n` +
            'See: https://jestjs.io/docs/manual-mocks#content'
        );
      }
      this._mockMetaDataCache.set(modulePath, mockMetadata);
    }
    return this._moduleMocker.generateFromMetadata(
      // added above if missing
      this._mockMetaDataCache.get(modulePath)
    );
  }
  _shouldMockCjs(from, moduleName, explicitShouldMock) {
    const options = {
      conditions: this.cjsConditions
    };
    const moduleID = this._resolver.getModuleID(
      this._virtualMocks,
      from,
      moduleName,
      options
    );
    const key = from + path().delimiter + moduleID;
    if (explicitShouldMock.has(moduleID)) {
      // guaranteed by `has` above
      return explicitShouldMock.get(moduleID);
    }
    if (
      !this._shouldAutoMock ||
      this._resolver.isCoreModule(moduleName) ||
      this._shouldUnmockTransitiveDependenciesCache.get(key)
    ) {
      return false;
    }
    if (this._shouldMockModuleCache.has(moduleID)) {
      // guaranteed by `has` above
      return this._shouldMockModuleCache.get(moduleID);
    }
    let modulePath;
    try {
      modulePath = this._resolveCjsModule(from, moduleName);
    } catch (e) {
      const manualMock = this._resolver.getMockModule(from, moduleName);
      if (manualMock) {
        this._shouldMockModuleCache.set(moduleID, true);
        return true;
      }
      throw e;
    }
    if (this._unmockList && this._unmockList.test(modulePath)) {
      this._shouldMockModuleCache.set(moduleID, false);
      return false;
    }

    // transitive unmocking for package managers that store flat packages (npm3)
    const currentModuleID = this._resolver.getModuleID(
      this._virtualMocks,
      from,
      undefined,
      options
    );
    if (
      this._transitiveShouldMock.get(currentModuleID) === false ||
      (from.includes(NODE_MODULES) &&
        modulePath.includes(NODE_MODULES) &&
        ((this._unmockList && this._unmockList.test(from)) ||
          explicitShouldMock.get(currentModuleID) === false))
    ) {
      this._transitiveShouldMock.set(moduleID, false);
      this._shouldUnmockTransitiveDependenciesCache.set(key, true);
      return false;
    }
    this._shouldMockModuleCache.set(moduleID, true);
    return true;
  }
  async _shouldMockModule(from, moduleName, explicitShouldMock) {
    const options = {
      conditions: this.esmConditions
    };
    const moduleID = await this._resolver.getModuleIDAsync(
      this._virtualMocks,
      from,
      moduleName,
      options
    );
    const key = from + path().delimiter + moduleID;
    if (explicitShouldMock.has(moduleID)) {
      // guaranteed by `has` above
      return explicitShouldMock.get(moduleID);
    }
    if (
      !this._shouldAutoMock ||
      this._resolver.isCoreModule(moduleName) ||
      this._shouldUnmockTransitiveDependenciesCache.get(key)
    ) {
      return false;
    }
    if (this._shouldMockModuleCache.has(moduleID)) {
      // guaranteed by `has` above
      return this._shouldMockModuleCache.get(moduleID);
    }
    let modulePath;
    try {
      modulePath = await this._resolveModule(from, moduleName);
    } catch (e) {
      const manualMock = await this._resolver.getMockModuleAsync(
        from,
        moduleName
      );
      if (manualMock) {
        this._shouldMockModuleCache.set(moduleID, true);
        return true;
      }
      throw e;
    }
    if (this._unmockList && this._unmockList.test(modulePath)) {
      this._shouldMockModuleCache.set(moduleID, false);
      return false;
    }

    // transitive unmocking for package managers that store flat packages (npm3)
    const currentModuleID = await this._resolver.getModuleIDAsync(
      this._virtualMocks,
      from,
      undefined,
      options
    );
    if (
      this._transitiveShouldMock.get(currentModuleID) === false ||
      (from.includes(NODE_MODULES) &&
        modulePath.includes(NODE_MODULES) &&
        ((this._unmockList && this._unmockList.test(from)) ||
          explicitShouldMock.get(currentModuleID) === false))
    ) {
      this._transitiveShouldMock.set(moduleID, false);
      this._shouldUnmockTransitiveDependenciesCache.set(key, true);
      return false;
    }
    this._shouldMockModuleCache.set(moduleID, true);
    return true;
  }
  _createRequireImplementation(from, options) {
    const resolve = (moduleName, resolveOptions) => {
      const resolved = this._requireResolve(
        from.filename,
        moduleName,
        resolveOptions
      );
      if (
        resolveOptions?.[JEST_RESOLVE_OUTSIDE_VM_OPTION] &&
        options?.isInternalModule
      ) {
        return (0, _helpers.createOutsideJestVmPath)(resolved);
      }
      return resolved;
    };
    resolve.paths = moduleName =>
      this._requireResolvePaths(from.filename, moduleName);
    const moduleRequire = options?.isInternalModule
      ? moduleName => this.requireInternalModule(from.filename, moduleName)
      : this.requireModuleOrMock.bind(this, from.filename);
    moduleRequire.extensions = Object.create(null);
    moduleRequire.resolve = resolve;
    moduleRequire.cache = (() => {
      // TODO: consider warning somehow that this does nothing. We should support deletions, anyways
      const notPermittedMethod = () => true;
      return new Proxy(Object.create(null), {
        defineProperty: notPermittedMethod,
        deleteProperty: notPermittedMethod,
        get: (_target, key) =>
          typeof key === 'string' ? this._moduleRegistry.get(key) : undefined,
        getOwnPropertyDescriptor() {
          return {
            configurable: true,
            enumerable: true
          };
        },
        has: (_target, key) =>
          typeof key === 'string' && this._moduleRegistry.has(key),
        ownKeys: () => Array.from(this._moduleRegistry.keys()),
        set: notPermittedMethod
      });
    })();
    Object.defineProperty(moduleRequire, 'main', {
      enumerable: true,
      value: this._mainModule
    });
    return moduleRequire;
  }
  _createJestObjectFor(from) {
    const disableAutomock = () => {
      this._shouldAutoMock = false;
      return jestObject;
    };
    const enableAutomock = () => {
      this._shouldAutoMock = true;
      return jestObject;
    };
    const unmock = moduleName => {
      const moduleID = this._resolver.getModuleID(
        this._virtualMocks,
        from,
        moduleName,
        {
          conditions: this.cjsConditions
        }
      );
      this._explicitShouldMock.set(moduleID, false);
      return jestObject;
    };
    const deepUnmock = moduleName => {
      const moduleID = this._resolver.getModuleID(
        this._virtualMocks,
        from,
        moduleName,
        {
          conditions: this.cjsConditions
        }
      );
      this._explicitShouldMock.set(moduleID, false);
      this._transitiveShouldMock.set(moduleID, false);
      return jestObject;
    };
    const mock = (moduleName, mockFactory, options) => {
      if (mockFactory !== undefined) {
        return setMockFactory(moduleName, mockFactory, options);
      }
      const moduleID = this._resolver.getModuleID(
        this._virtualMocks,
        from,
        moduleName,
        {
          conditions: this.cjsConditions
        }
      );
      this._explicitShouldMock.set(moduleID, true);
      return jestObject;
    };
    const setMockFactory = (moduleName, mockFactory, options) => {
      this.setMock(from, moduleName, mockFactory, options);
      return jestObject;
    };
    const mockModule = (moduleName, mockFactory, options) => {
      if (typeof mockFactory !== 'function') {
        throw new Error('`unstable_mockModule` must be passed a mock factory');
      }
      this.setModuleMock(from, moduleName, mockFactory, options);
      return jestObject;
    };
    const clearAllMocks = () => {
      this.clearAllMocks();
      return jestObject;
    };
    const resetAllMocks = () => {
      this.resetAllMocks();
      return jestObject;
    };
    const restoreAllMocks = () => {
      this.restoreAllMocks();
      return jestObject;
    };
    const _getFakeTimers = () => {
      if (
        this.isTornDown ||
        !(this._environment.fakeTimers || this._environment.fakeTimersModern)
      ) {
        this._logFormattedReferenceError(
          'You are trying to access a property or method of the Jest environment after it has been torn down.'
        );
        process.exitCode = 1;
      }
      return this._fakeTimersImplementation;
    };
    const useFakeTimers = fakeTimersConfig => {
      fakeTimersConfig = {
        ...this._config.fakeTimers,
        ...fakeTimersConfig
      };
      if (fakeTimersConfig?.legacyFakeTimers) {
        this._fakeTimersImplementation = this._environment.fakeTimers;
      } else {
        this._fakeTimersImplementation = this._environment.fakeTimersModern;
      }
      this._fakeTimersImplementation.useFakeTimers(fakeTimersConfig);
      return jestObject;
    };
    const useRealTimers = () => {
      _getFakeTimers().useRealTimers();
      return jestObject;
    };
    const resetModules = () => {
      this.resetModules();
      return jestObject;
    };
    const isolateModules = fn => {
      this.isolateModules(fn);
      return jestObject;
    };
    const isolateModulesAsync = fn => {
      return this.isolateModulesAsync(fn);
    };
    const fn = this._moduleMocker.fn.bind(this._moduleMocker);
    const spyOn = this._moduleMocker.spyOn.bind(this._moduleMocker);
    const mocked =
      this._moduleMocker.mocked?.bind(this._moduleMocker) ??
      (() => {
        throw new Error(
          'Your test environment does not support `mocked`, please update it.'
        );
      });
    const replaceProperty =
      typeof this._moduleMocker.replaceProperty === 'function'
        ? this._moduleMocker.replaceProperty.bind(this._moduleMocker)
        : () => {
            throw new Error(
              'Your test environment does not support `jest.replaceProperty` - please ensure its Jest dependencies are updated to version 29.4 or later'
            );
          };
    const setTimeout = timeout => {
      this._environment.global[testTimeoutSymbol] = timeout;
      return jestObject;
    };
    const retryTimes = (numTestRetries, options) => {
      this._environment.global[retryTimesSymbol] = numTestRetries;
      this._environment.global[logErrorsBeforeRetrySymbol] =
        options?.logErrorsBeforeRetry;
      return jestObject;
    };
    const jestObject = {
      advanceTimersByTime: msToRun =>
        _getFakeTimers().advanceTimersByTime(msToRun),
      advanceTimersByTimeAsync: async msToRun => {
        const fakeTimers = _getFakeTimers();
        if (fakeTimers === this._environment.fakeTimersModern) {
          // TODO: remove this check in Jest 30
          if (typeof fakeTimers.advanceTimersByTimeAsync !== 'function') {
            throw new TypeError(
              'Your test environment does not support async fake timers - please ensure its Jest dependencies are updated to version 29.5 or later'
            );
          }
          await fakeTimers.advanceTimersByTimeAsync(msToRun);
        } else {
          throw new TypeError(
            '`jest.advanceTimersByTimeAsync()` is not available when using legacy fake timers.'
          );
        }
      },
      advanceTimersToNextTimer: steps =>
        _getFakeTimers().advanceTimersToNextTimer(steps),
      advanceTimersToNextTimerAsync: async steps => {
        const fakeTimers = _getFakeTimers();
        if (fakeTimers === this._environment.fakeTimersModern) {
          // TODO: remove this check in Jest 30
          if (typeof fakeTimers.advanceTimersToNextTimerAsync !== 'function') {
            throw new TypeError(
              'Your test environment does not support async fake timers - please ensure its Jest dependencies are updated to version 29.5 or later'
            );
          }
          await fakeTimers.advanceTimersToNextTimerAsync(steps);
        } else {
          throw new TypeError(
            '`jest.advanceTimersToNextTimerAsync()` is not available when using legacy fake timers.'
          );
        }
      },
      autoMockOff: disableAutomock,
      autoMockOn: enableAutomock,
      clearAllMocks,
      clearAllTimers: () => _getFakeTimers().clearAllTimers(),
      createMockFromModule: moduleName => this._generateMock(from, moduleName),
      deepUnmock,
      disableAutomock,
      doMock: mock,
      dontMock: unmock,
      enableAutomock,
      fn,
      genMockFromModule: moduleName => this._generateMock(from, moduleName),
      getRealSystemTime: () => {
        const fakeTimers = _getFakeTimers();
        if (fakeTimers === this._environment.fakeTimersModern) {
          return fakeTimers.getRealSystemTime();
        } else {
          throw new TypeError(
            '`jest.getRealSystemTime()` is not available when using legacy fake timers.'
          );
        }
      },
      getSeed: () => {
        // TODO: remove this check in Jest 30
        if (this._globalConfig?.seed === undefined) {
          throw new Error(
            'The seed value is not available. Likely you are using older versions of the jest dependencies.'
          );
        }
        return this._globalConfig.seed;
      },
      getTimerCount: () => _getFakeTimers().getTimerCount(),
      isEnvironmentTornDown: () => this.isTornDown,
      isMockFunction: this._moduleMocker.isMockFunction,
      isolateModules,
      isolateModulesAsync,
      mock,
      mocked,
      now: () => _getFakeTimers().now(),
      replaceProperty,
      requireActual: moduleName => this.requireActual(from, moduleName),
      requireMock: moduleName => this.requireMock(from, moduleName),
      resetAllMocks,
      resetModules,
      restoreAllMocks,
      retryTimes,
      runAllImmediates: () => {
        const fakeTimers = _getFakeTimers();
        if (fakeTimers === this._environment.fakeTimers) {
          fakeTimers.runAllImmediates();
        } else {
          throw new TypeError(
            '`jest.runAllImmediates()` is only available when using legacy fake timers.'
          );
        }
      },
      runAllTicks: () => _getFakeTimers().runAllTicks(),
      runAllTimers: () => _getFakeTimers().runAllTimers(),
      runAllTimersAsync: async () => {
        const fakeTimers = _getFakeTimers();
        if (fakeTimers === this._environment.fakeTimersModern) {
          // TODO: remove this check in Jest 30
          if (typeof fakeTimers.runAllTimersAsync !== 'function') {
            throw new TypeError(
              'Your test environment does not support async fake timers - please ensure its Jest dependencies are updated to version 29.5 or later'
            );
          }
          await fakeTimers.runAllTimersAsync();
        } else {
          throw new TypeError(
            '`jest.runAllTimersAsync()` is not available when using legacy fake timers.'
          );
        }
      },
      runOnlyPendingTimers: () => _getFakeTimers().runOnlyPendingTimers(),
      runOnlyPendingTimersAsync: async () => {
        const fakeTimers = _getFakeTimers();
        if (fakeTimers === this._environment.fakeTimersModern) {
          // TODO: remove this check in Jest 30
          if (typeof fakeTimers.runOnlyPendingTimersAsync !== 'function') {
            throw new TypeError(
              'Your test environment does not support async fake timers - please ensure its Jest dependencies are updated to version 29.5 or later'
            );
          }
          await fakeTimers.runOnlyPendingTimersAsync();
        } else {
          throw new TypeError(
            '`jest.runOnlyPendingTimersAsync()` is not available when using legacy fake timers.'
          );
        }
      },
      setMock: (moduleName, mock) => setMockFactory(moduleName, () => mock),
      setSystemTime: now => {
        const fakeTimers = _getFakeTimers();
        if (fakeTimers === this._environment.fakeTimersModern) {
          fakeTimers.setSystemTime(now);
        } else {
          throw new TypeError(
            '`jest.setSystemTime()` is not available when using legacy fake timers.'
          );
        }
      },
      setTimeout,
      spyOn,
      unmock,
      unstable_mockModule: mockModule,
      useFakeTimers,
      useRealTimers
    };
    return jestObject;
  }
  _logFormattedReferenceError(errorMessage) {
    const testPath = this._testPath
      ? ` From ${(0, _slash().default)(
          path().relative(this._config.rootDir, this._testPath)
        )}.`
      : '';
    const originalStack = new ReferenceError(`${errorMessage}${testPath}`).stack
      .split('\n')
      // Remove this file from the stack (jest-message-utils will keep one line)
      .filter(line => line.indexOf(__filename) === -1)
      .join('\n');
    const {message, stack} = (0, _jestMessageUtil().separateMessageFromStack)(
      originalStack
    );
    console.error(
      `\n${message}\n${(0, _jestMessageUtil().formatStackTrace)(
        stack,
        this._config,
        {
          noStackTrace: false
        }
      )}`
    );
  }
  wrapCodeInModuleWrapper(content) {
    return `${this.constructModuleWrapperStart() + content}\n}});`;
  }
  constructModuleWrapperStart() {
    const args = this.constructInjectedModuleParameters();
    return `({"${EVAL_RESULT_VARIABLE}":function(${args.join(',')}){`;
  }
  constructInjectedModuleParameters() {
    return [
      'module',
      'exports',
      'require',
      '__dirname',
      '__filename',
      this._config.injectGlobals ? 'jest' : undefined,
      ...this._config.sandboxInjectedGlobals
    ].filter(notEmpty);
  }
  handleExecutionError(e, module) {
    const moduleNotFoundError =
      _jestResolve().default.tryCastModuleNotFoundError(e);
    if (moduleNotFoundError) {
      if (!moduleNotFoundError.requireStack) {
        moduleNotFoundError.requireStack = [module.filename || module.id];
        for (let cursor = module.parent; cursor; cursor = cursor.parent) {
          moduleNotFoundError.requireStack.push(cursor.filename || cursor.id);
        }
        moduleNotFoundError.buildMessage(this._config.rootDir);
      }
      throw moduleNotFoundError;
    }
    throw e;
  }
  getGlobalsForCjs(from) {
    const jest = this.jestObjectCaches.get(from);
    invariant(jest, 'There should always be a Jest object already');
    return {
      ...this.getGlobalsFromEnvironment(),
      jest
    };
  }
  getGlobalsForEsm(from, context) {
    let jest = this.jestObjectCaches.get(from);
    if (!jest) {
      jest = this._createJestObjectFor(from);
      this.jestObjectCaches.set(from, jest);
    }
    const globals = {
      ...this.getGlobalsFromEnvironment(),
      jest
    };
    const module = new (_vm().SyntheticModule)(
      Object.keys(globals),
      function () {
        Object.entries(globals).forEach(([key, value]) => {
          // @ts-expect-error: TS doesn't know what `this` is
          this.setExport(key, value);
        });
      },
      {
        context,
        identifier: '@jest/globals'
      }
    );
    return evaluateSyntheticModule(module);
  }
  getGlobalsFromEnvironment() {
    if (this.jestGlobals) {
      return {
        ...this.jestGlobals
      };
    }
    return {
      afterAll: this._environment.global.afterAll,
      afterEach: this._environment.global.afterEach,
      beforeAll: this._environment.global.beforeAll,
      beforeEach: this._environment.global.beforeEach,
      describe: this._environment.global.describe,
      expect: this._environment.global.expect,
      fdescribe: this._environment.global.fdescribe,
      fit: this._environment.global.fit,
      it: this._environment.global.it,
      test: this._environment.global.test,
      xdescribe: this._environment.global.xdescribe,
      xit: this._environment.global.xit,
      xtest: this._environment.global.xtest
    };
  }
  readFileBuffer(filename) {
    let source = this._cacheFSBuffer.get(filename);
    if (!source) {
      source = fs().readFileSync(filename);
      this._cacheFSBuffer.set(filename, source);
    }
    return source;
  }
  readFile(filename) {
    let source = this._cacheFS.get(filename);
    if (!source) {
      const buffer = this.readFileBuffer(filename);
      source = buffer.toString('utf8');
      this._cacheFS.set(filename, source);
    }
    return source;
  }
  setGlobalsForRuntime(globals) {
    this.jestGlobals = globals;
  }
}
exports.default = Runtime;
function invariant(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
function notEmpty(value) {
  return value !== null && value !== undefined;
}
async function evaluateSyntheticModule(module) {
  await module.link(() => {
    throw new Error('This should never happen');
  });
  await module.evaluate();
  return module;
}
