'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.createScriptTransformer = createScriptTransformer;
exports.createTranspilingRequire = createTranspilingRequire;
function _crypto() {
  const data = require('crypto');
  _crypto = function () {
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
function _core() {
  const data = require('@babel/core');
  _core = function () {
    return data;
  };
  return data;
}
function _babelPluginIstanbul() {
  const data = _interopRequireDefault(require('babel-plugin-istanbul'));
  _babelPluginIstanbul = function () {
    return data;
  };
  return data;
}
function _convertSourceMap() {
  const data = require('convert-source-map');
  _convertSourceMap = function () {
    return data;
  };
  return data;
}
function _fastJsonStableStringify() {
  const data = _interopRequireDefault(require('fast-json-stable-stringify'));
  _fastJsonStableStringify = function () {
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
function _pirates() {
  const data = require('pirates');
  _pirates = function () {
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
function _writeFileAtomic() {
  const data = require('write-file-atomic');
  _writeFileAtomic = function () {
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
function _jestUtil() {
  const data = require('jest-util');
  _jestUtil = function () {
    return data;
  };
  return data;
}
var _enhanceUnexpectedTokenMessage = _interopRequireDefault(
  require('./enhanceUnexpectedTokenMessage')
);
var _runtimeErrorsAndWarnings = require('./runtimeErrorsAndWarnings');
var _shouldInstrument = _interopRequireDefault(require('./shouldInstrument'));
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

// @ts-expect-error: should just be `require.resolve`, but the tests mess that up

// Use `require` to avoid TS rootDir
const {version: VERSION} = require('../package.json');
// This data structure is used to avoid recalculating some data every time that
// we need to transform a file. Since ScriptTransformer is instantiated for each
// file we need to keep this object in the local scope of this module.
const projectCaches = new Map();

// To reset the cache for specific changesets (rather than package version).
const CACHE_VERSION = '1';
async function waitForPromiseWithCleanup(promise, cleanup) {
  try {
    await promise;
  } finally {
    cleanup();
  }
}

// type predicate
function isTransformerFactory(t) {
  return typeof t.createTransformer === 'function';
}
class ScriptTransformer {
  _cache;
  _transformCache = new Map();
  _transformsAreLoaded = false;
  constructor(_config, _cacheFS) {
    this._config = _config;
    this._cacheFS = _cacheFS;
    const configString = (0, _fastJsonStableStringify().default)(this._config);
    let projectCache = projectCaches.get(configString);
    if (!projectCache) {
      projectCache = {
        configString,
        ignorePatternsRegExp: calcIgnorePatternRegExp(this._config),
        transformRegExp: calcTransformRegExp(this._config),
        transformedFiles: new Map()
      };
      projectCaches.set(configString, projectCache);
    }
    this._cache = projectCache;
  }
  _buildCacheKeyFromFileInfo(
    fileData,
    filename,
    transformOptions,
    transformerCacheKey
  ) {
    if (transformerCacheKey != null) {
      return (0, _crypto().createHash)('sha1')
        .update(transformerCacheKey)
        .update(CACHE_VERSION)
        .digest('hex')
        .substring(0, 32);
    }
    return (0, _crypto().createHash)('sha1')
      .update(fileData)
      .update(transformOptions.configString)
      .update(transformOptions.instrument ? 'instrument' : '')
      .update(filename)
      .update(CACHE_VERSION)
      .digest('hex')
      .substring(0, 32);
  }
  _buildTransformCacheKey(pattern, filepath) {
    return pattern + filepath;
  }
  _getCacheKey(fileData, filename, options) {
    const configString = this._cache.configString;
    const {transformer, transformerConfig = {}} =
      this._getTransformer(filename) ?? {};
    let transformerCacheKey = undefined;
    const transformOptions = {
      ...options,
      cacheFS: this._cacheFS,
      config: this._config,
      configString,
      transformerConfig
    };
    if (typeof transformer?.getCacheKey === 'function') {
      transformerCacheKey = transformer.getCacheKey(
        fileData,
        filename,
        transformOptions
      );
    }
    return this._buildCacheKeyFromFileInfo(
      fileData,
      filename,
      transformOptions,
      transformerCacheKey
    );
  }
  async _getCacheKeyAsync(fileData, filename, options) {
    const configString = this._cache.configString;
    const {transformer, transformerConfig = {}} =
      this._getTransformer(filename) ?? {};
    let transformerCacheKey = undefined;
    const transformOptions = {
      ...options,
      cacheFS: this._cacheFS,
      config: this._config,
      configString,
      transformerConfig
    };
    if (transformer) {
      const getCacheKey =
        transformer.getCacheKeyAsync ?? transformer.getCacheKey;
      if (typeof getCacheKey === 'function') {
        transformerCacheKey = await getCacheKey(
          fileData,
          filename,
          transformOptions
        );
      }
    }
    return this._buildCacheKeyFromFileInfo(
      fileData,
      filename,
      transformOptions,
      transformerCacheKey
    );
  }
  _createCachedFilename(filename, cacheKey) {
    const HasteMapClass = _jestHasteMap().default.getStatic(this._config);
    const baseCacheDir = HasteMapClass.getCacheFilePath(
      this._config.cacheDirectory,
      `jest-transform-cache-${this._config.id}`,
      VERSION
    );
    // Create sub folders based on the cacheKey to avoid creating one
    // directory with many files.
    const cacheDir = path().join(baseCacheDir, cacheKey[0] + cacheKey[1]);
    const cacheFilenamePrefix = path()
      .basename(filename, path().extname(filename))
      .replace(/\W/g, '');
    return (0, _slash().default)(
      path().join(cacheDir, `${cacheFilenamePrefix}_${cacheKey}`)
    );
  }
  _getFileCachePath(filename, content, options) {
    const cacheKey = this._getCacheKey(content, filename, options);
    return this._createCachedFilename(filename, cacheKey);
  }
  async _getFileCachePathAsync(filename, content, options) {
    const cacheKey = await this._getCacheKeyAsync(content, filename, options);
    return this._createCachedFilename(filename, cacheKey);
  }
  _getTransformPatternAndPath(filename) {
    const transformEntry = this._cache.transformRegExp;
    if (transformEntry == null) {
      return undefined;
    }
    for (let i = 0; i < transformEntry.length; i++) {
      const [transformRegExp, transformPath] = transformEntry[i];
      if (transformRegExp.test(filename)) {
        return [transformRegExp.source, transformPath];
      }
    }
    return undefined;
  }
  _getTransformPath(filename) {
    const transformInfo = this._getTransformPatternAndPath(filename);
    if (!Array.isArray(transformInfo)) {
      return undefined;
    }
    return transformInfo[1];
  }
  async loadTransformers() {
    await Promise.all(
      this._config.transform.map(
        async ([transformPattern, transformPath, transformerConfig], i) => {
          let transformer = await (0, _jestUtil().requireOrImportModule)(
            transformPath
          );
          if (transformer == null) {
            throw new Error(
              (0, _runtimeErrorsAndWarnings.makeInvalidTransformerError)(
                transformPath
              )
            );
          }
          if (isTransformerFactory(transformer)) {
            transformer = await transformer.createTransformer(
              transformerConfig
            );
          }
          if (
            typeof transformer.process !== 'function' &&
            typeof transformer.processAsync !== 'function'
          ) {
            throw new Error(
              (0, _runtimeErrorsAndWarnings.makeInvalidTransformerError)(
                transformPath
              )
            );
          }
          const res = {
            transformer,
            transformerConfig
          };
          const transformCacheKey = this._buildTransformCacheKey(
            this._cache.transformRegExp?.[i]?.[0].source ??
              new RegExp(transformPattern).source,
            transformPath
          );
          this._transformCache.set(transformCacheKey, res);
        }
      )
    );
    this._transformsAreLoaded = true;
  }
  _getTransformer(filename) {
    if (!this._transformsAreLoaded) {
      throw new Error(
        'Jest: Transformers have not been loaded yet - make sure to run `loadTransformers` and wait for it to complete before starting to transform files'
      );
    }
    if (this._config.transform.length === 0) {
      return null;
    }
    const transformPatternAndPath = this._getTransformPatternAndPath(filename);
    if (!Array.isArray(transformPatternAndPath)) {
      return null;
    }
    const [transformPattern, transformPath] = transformPatternAndPath;
    const transformCacheKey = this._buildTransformCacheKey(
      transformPattern,
      transformPath
    );
    const transformer = this._transformCache.get(transformCacheKey);
    if (transformer !== undefined) {
      return transformer;
    }
    throw new Error(
      `Jest was unable to load the transformer defined for ${filename}. This is a bug in Jest, please open up an issue`
    );
  }
  _instrumentFile(filename, input, canMapToInput, options) {
    const inputCode = typeof input === 'string' ? input : input.code;
    const inputMap = typeof input === 'string' ? null : input.map;
    const result = (0, _core().transformSync)(inputCode, {
      auxiliaryCommentBefore: ' istanbul ignore next ',
      babelrc: false,
      caller: {
        name: '@jest/transform',
        supportsDynamicImport: options.supportsDynamicImport,
        supportsExportNamespaceFrom: options.supportsExportNamespaceFrom,
        supportsStaticESM: options.supportsStaticESM,
        supportsTopLevelAwait: options.supportsTopLevelAwait
      },
      configFile: false,
      filename,
      plugins: [
        [
          _babelPluginIstanbul().default,
          {
            compact: false,
            // files outside `cwd` will not be instrumented
            cwd: this._config.rootDir,
            exclude: [],
            extension: false,
            inputSourceMap: inputMap,
            useInlineSourceMaps: false
          }
        ]
      ],
      sourceMaps: canMapToInput ? 'both' : false
    });
    if (result?.code != null) {
      return result;
    }
    return input;
  }
  _buildTransformResult(
    filename,
    cacheFilePath,
    content,
    transformer,
    shouldCallTransform,
    options,
    processed,
    sourceMapPath
  ) {
    let transformed = {
      code: content,
      map: null
    };
    if (transformer && shouldCallTransform) {
      if (processed != null && typeof processed.code === 'string') {
        transformed = processed;
      } else {
        const transformPath = this._getTransformPath(filename);
        invariant(transformPath);
        throw new Error(
          (0, _runtimeErrorsAndWarnings.makeInvalidReturnValueError)(
            transformPath
          )
        );
      }
    }
    if (transformed.map == null || transformed.map === '') {
      try {
        //Could be a potential freeze here.
        //See: https://github.com/facebook/jest/pull/5177#discussion_r158883570
        const inlineSourceMap = (0, _convertSourceMap().fromSource)(
          transformed.code
        );
        if (inlineSourceMap) {
          transformed.map = inlineSourceMap.toObject();
        }
      } catch {
        const transformPath = this._getTransformPath(filename);
        invariant(transformPath);
        console.warn(
          (0, _runtimeErrorsAndWarnings.makeInvalidSourceMapWarning)(
            filename,
            transformPath
          )
        );
      }
    }

    // That means that the transform has a custom instrumentation
    // logic and will handle it based on `config.collectCoverage` option
    const transformWillInstrument =
      shouldCallTransform && transformer && transformer.canInstrument;

    // Apply instrumentation to the code if necessary, keeping the instrumented code and new map
    let map = transformed.map;
    let code;
    if (transformWillInstrument !== true && options.instrument) {
      /**
       * We can map the original source code to the instrumented code ONLY if
       * - the process of transforming the code produced a source map e.g. ts-jest
       * - we did not transform the source code
       *
       * Otherwise we cannot make any statements about how the instrumented code corresponds to the original code,
       * and we should NOT emit any source maps
       *
       */
      const shouldEmitSourceMaps =
        (transformer != null && map != null) || transformer == null;
      const instrumented = this._instrumentFile(
        filename,
        transformed,
        shouldEmitSourceMaps,
        options
      );
      code =
        typeof instrumented === 'string' ? instrumented : instrumented.code;
      map = typeof instrumented === 'string' ? null : instrumented.map;
    } else {
      code = transformed.code;
    }
    if (map != null) {
      const sourceMapContent =
        typeof map === 'string' ? map : JSON.stringify(map);
      invariant(sourceMapPath, 'We should always have default sourceMapPath');
      writeCacheFile(sourceMapPath, sourceMapContent);
    } else {
      sourceMapPath = null;
    }
    writeCodeCacheFile(cacheFilePath, code);
    return {
      code,
      originalCode: content,
      sourceMapPath
    };
  }
  transformSource(filepath, content, options) {
    const filename = (0, _jestUtil().tryRealpath)(filepath);
    const {transformer, transformerConfig = {}} =
      this._getTransformer(filename) ?? {};
    const cacheFilePath = this._getFileCachePath(filename, content, options);
    const sourceMapPath = `${cacheFilePath}.map`;
    // Ignore cache if `config.cache` is set (--no-cache)
    const code = this._config.cache ? readCodeCacheFile(cacheFilePath) : null;
    if (code != null) {
      // This is broken: we return the code, and a path for the source map
      // directly from the cache. But, nothing ensures the source map actually
      // matches that source code. They could have gotten out-of-sync in case
      // two separate processes write concurrently to the same cache files.
      return {
        code,
        originalCode: content,
        sourceMapPath
      };
    }
    let processed = null;
    let shouldCallTransform = false;
    if (transformer && this.shouldTransform(filename)) {
      shouldCallTransform = true;
      assertSyncTransformer(transformer, this._getTransformPath(filename));
      processed = transformer.process(content, filename, {
        ...options,
        cacheFS: this._cacheFS,
        config: this._config,
        configString: this._cache.configString,
        transformerConfig
      });
    }
    (0, _jestUtil().createDirectory)(path().dirname(cacheFilePath));
    return this._buildTransformResult(
      filename,
      cacheFilePath,
      content,
      transformer,
      shouldCallTransform,
      options,
      processed,
      sourceMapPath
    );
  }
  async transformSourceAsync(filepath, content, options) {
    const filename = (0, _jestUtil().tryRealpath)(filepath);
    const {transformer, transformerConfig = {}} =
      this._getTransformer(filename) ?? {};
    const cacheFilePath = await this._getFileCachePathAsync(
      filename,
      content,
      options
    );
    const sourceMapPath = `${cacheFilePath}.map`;
    // Ignore cache if `config.cache` is set (--no-cache)
    const code = this._config.cache ? readCodeCacheFile(cacheFilePath) : null;
    if (code != null) {
      // This is broken: we return the code, and a path for the source map
      // directly from the cache. But, nothing ensures the source map actually
      // matches that source code. They could have gotten out-of-sync in case
      // two separate processes write concurrently to the same cache files.
      return {
        code,
        originalCode: content,
        sourceMapPath
      };
    }
    let processed = null;
    let shouldCallTransform = false;
    if (transformer && this.shouldTransform(filename)) {
      shouldCallTransform = true;
      const process = transformer.processAsync ?? transformer.process;

      // This is probably dead code since `_getTransformerAsync` already asserts this
      invariant(
        typeof process === 'function',
        'A transformer must always export either a `process` or `processAsync`'
      );
      processed = await process(content, filename, {
        ...options,
        cacheFS: this._cacheFS,
        config: this._config,
        configString: this._cache.configString,
        transformerConfig
      });
    }
    (0, _jestUtil().createDirectory)(path().dirname(cacheFilePath));
    return this._buildTransformResult(
      filename,
      cacheFilePath,
      content,
      transformer,
      shouldCallTransform,
      options,
      processed,
      sourceMapPath
    );
  }
  async _transformAndBuildScriptAsync(
    filename,
    options,
    transformOptions,
    fileSource
  ) {
    const {isInternalModule} = options;
    let fileContent = fileSource ?? this._cacheFS.get(filename);
    if (fileContent == null) {
      fileContent = fs().readFileSync(filename, 'utf8');
      this._cacheFS.set(filename, fileContent);
    }
    const content = stripShebang(fileContent);
    let code = content;
    let sourceMapPath = null;
    const willTransform =
      isInternalModule !== true &&
      (transformOptions.instrument || this.shouldTransform(filename));
    try {
      if (willTransform) {
        const transformedSource = await this.transformSourceAsync(
          filename,
          content,
          transformOptions
        );
        code = transformedSource.code;
        sourceMapPath = transformedSource.sourceMapPath;
      }
      return {
        code,
        originalCode: content,
        sourceMapPath
      };
    } catch (e) {
      if (!(e instanceof Error)) {
        throw e;
      }
      throw (0, _enhanceUnexpectedTokenMessage.default)(e);
    }
  }
  _transformAndBuildScript(filename, options, transformOptions, fileSource) {
    const {isInternalModule} = options;
    let fileContent = fileSource ?? this._cacheFS.get(filename);
    if (fileContent == null) {
      fileContent = fs().readFileSync(filename, 'utf8');
      this._cacheFS.set(filename, fileContent);
    }
    const content = stripShebang(fileContent);
    let code = content;
    let sourceMapPath = null;
    const willTransform =
      isInternalModule !== true &&
      (transformOptions.instrument || this.shouldTransform(filename));
    try {
      if (willTransform) {
        const transformedSource = this.transformSource(
          filename,
          content,
          transformOptions
        );
        code = transformedSource.code;
        sourceMapPath = transformedSource.sourceMapPath;
      }
      return {
        code,
        originalCode: content,
        sourceMapPath
      };
    } catch (e) {
      if (!(e instanceof Error)) {
        throw e;
      }
      throw (0, _enhanceUnexpectedTokenMessage.default)(e);
    }
  }
  async transformAsync(filename, options, fileSource) {
    const instrument =
      options.coverageProvider === 'babel' &&
      (0, _shouldInstrument.default)(filename, options, this._config);
    const scriptCacheKey = getScriptCacheKey(filename, instrument);
    let result = this._cache.transformedFiles.get(scriptCacheKey);
    if (result) {
      return result;
    }
    result = await this._transformAndBuildScriptAsync(
      filename,
      options,
      {
        ...options,
        instrument
      },
      fileSource
    );
    if (scriptCacheKey) {
      this._cache.transformedFiles.set(scriptCacheKey, result);
    }
    return result;
  }
  transform(filename, options, fileSource) {
    const instrument =
      options.coverageProvider === 'babel' &&
      (0, _shouldInstrument.default)(filename, options, this._config);
    const scriptCacheKey = getScriptCacheKey(filename, instrument);
    let result = this._cache.transformedFiles.get(scriptCacheKey);
    if (result) {
      return result;
    }
    result = this._transformAndBuildScript(
      filename,
      options,
      {
        ...options,
        instrument
      },
      fileSource
    );
    if (scriptCacheKey) {
      this._cache.transformedFiles.set(scriptCacheKey, result);
    }
    return result;
  }
  transformJson(filename, options, fileSource) {
    const {isInternalModule} = options;
    const willTransform =
      isInternalModule !== true && this.shouldTransform(filename);
    if (willTransform) {
      const {code: transformedJsonSource} = this.transformSource(
        filename,
        fileSource,
        {
          ...options,
          instrument: false
        }
      );
      return transformedJsonSource;
    }
    return fileSource;
  }
  async requireAndTranspileModule(
    moduleName,
    callback,
    options = {
      applyInteropRequireDefault: true,
      instrument: false,
      supportsDynamicImport: false,
      supportsExportNamespaceFrom: false,
      supportsStaticESM: false,
      supportsTopLevelAwait: false
    }
  ) {
    let transforming = false;
    const {applyInteropRequireDefault, ...transformOptions} = options;
    const revertHook = (0, _pirates().addHook)(
      (code, filename) => {
        try {
          transforming = true;
          return (
            this.transformSource(filename, code, transformOptions).code || code
          );
        } finally {
          transforming = false;
        }
      },
      {
        // Exclude `mjs` extension when addHook because pirates don't support hijack es module
        exts: this._config.moduleFileExtensions
          .filter(ext => ext !== 'mjs')
          .map(ext => `.${ext}`),
        ignoreNodeModules: false,
        matcher: filename => {
          if (transforming) {
            // Don't transform any dependency required by the transformer itself
            return false;
          }
          return this.shouldTransform(filename);
        }
      }
    );
    try {
      const module = await (0, _jestUtil().requireOrImportModule)(
        moduleName,
        applyInteropRequireDefault
      );
      if (!callback) {
        revertHook();
        return module;
      }
      const cbResult = callback(module);
      if ((0, _jestUtil().isPromise)(cbResult)) {
        return await waitForPromiseWithCleanup(cbResult, revertHook).then(
          () => module
        );
      }
      return module;
    } finally {
      revertHook();
    }
  }
  shouldTransform(filename) {
    const ignoreRegexp = this._cache.ignorePatternsRegExp;
    const isIgnored = ignoreRegexp ? ignoreRegexp.test(filename) : false;
    return this._config.transform.length !== 0 && !isIgnored;
  }
}

// TODO: do we need to define the generics twice?
async function createTranspilingRequire(config) {
  const transformer = await createScriptTransformer(config);
  return async function requireAndTranspileModule(
    resolverPath,
    applyInteropRequireDefault = false
  ) {
    const transpiledModule = await transformer.requireAndTranspileModule(
      resolverPath,
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      () => {},
      {
        applyInteropRequireDefault,
        instrument: false,
        supportsDynamicImport: false,
        // this might be true, depending on node version.
        supportsExportNamespaceFrom: false,
        supportsStaticESM: false,
        supportsTopLevelAwait: false
      }
    );
    return transpiledModule;
  };
}
const removeFile = path => {
  try {
    fs().unlinkSync(path);
  } catch {}
};
const stripShebang = content => {
  // If the file data starts with a shebang remove it. Leaves the empty line
  // to keep stack trace line numbers correct.
  if (content.startsWith('#!')) {
    return content.replace(/^#!.*/, '');
  } else {
    return content;
  }
};

/**
 * This is like `writeCacheFile` but with an additional sanity checksum. We
 * cannot use the same technique for source maps because we expose source map
 * cache file paths directly to callsites, with the expectation they can read
 * it right away. This is not a great system, because source map cache file
 * could get corrupted, out-of-sync, etc.
 */
function writeCodeCacheFile(cachePath, code) {
  const checksum = (0, _crypto().createHash)('sha1')
    .update(code)
    .digest('hex')
    .substring(0, 32);
  writeCacheFile(cachePath, `${checksum}\n${code}`);
}

/**
 * Read counterpart of `writeCodeCacheFile`. We verify that the content of the
 * file matches the checksum, in case some kind of corruption happened. This
 * could happen if an older version of `jest-runtime` writes non-atomically to
 * the same cache, for example.
 */
function readCodeCacheFile(cachePath) {
  const content = readCacheFile(cachePath);
  if (content == null) {
    return null;
  }
  const code = content.substring(33);
  const checksum = (0, _crypto().createHash)('sha1')
    .update(code)
    .digest('hex')
    .substring(0, 32);
  if (checksum === content.substring(0, 32)) {
    return code;
  }
  return null;
}

/**
 * Writing to the cache atomically relies on 'rename' being atomic on most
 * file systems. Doing atomic write reduces the risk of corruption by avoiding
 * two processes to write to the same file at the same time. It also reduces
 * the risk of reading a file that's being overwritten at the same time.
 */
const writeCacheFile = (cachePath, fileData) => {
  try {
    (0, _writeFileAtomic().sync)(cachePath, fileData, {
      encoding: 'utf8',
      fsync: false
    });
  } catch (e) {
    if (!(e instanceof Error)) {
      throw e;
    }
    if (cacheWriteErrorSafeToIgnore(e, cachePath)) {
      return;
    }
    e.message = `jest: failed to cache transform results in: ${cachePath}\nFailure message: ${e.message}`;
    removeFile(cachePath);
    throw e;
  }
};

/**
 * On Windows, renames are not atomic, leading to EPERM exceptions when two
 * processes attempt to rename to the same target file at the same time.
 * If the target file exists we can be reasonably sure another process has
 * legitimately won a cache write race and ignore the error.
 */
const cacheWriteErrorSafeToIgnore = (e, cachePath) =>
  process.platform === 'win32' &&
  e.code === 'EPERM' &&
  fs().existsSync(cachePath);
const readCacheFile = cachePath => {
  if (!fs().existsSync(cachePath)) {
    return null;
  }
  let fileData;
  try {
    fileData = fs().readFileSync(cachePath, 'utf8');
  } catch (e) {
    if (!(e instanceof Error)) {
      throw e;
    }
    // on windows write-file-atomic is not atomic which can
    // result in this error
    if (e.code === 'ENOENT' && process.platform === 'win32') {
      return null;
    }
    e.message = `jest: failed to read cache file: ${cachePath}\nFailure message: ${e.message}`;
    removeFile(cachePath);
    throw e;
  }
  if (fileData == null) {
    // We must have somehow created the file but failed to write to it,
    // let's delete it and retry.
    removeFile(cachePath);
  }
  return fileData;
};
const getScriptCacheKey = (filename, instrument) => {
  const mtime = fs().statSync(filename).mtime;
  return `${filename}_${mtime.getTime()}${instrument ? '_instrumented' : ''}`;
};
const calcIgnorePatternRegExp = config => {
  if (
    config.transformIgnorePatterns == null ||
    config.transformIgnorePatterns.length === 0
  ) {
    return undefined;
  }
  return new RegExp(config.transformIgnorePatterns.join('|'));
};
const calcTransformRegExp = config => {
  if (!config.transform.length) {
    return undefined;
  }
  const transformRegexp = [];
  for (let i = 0; i < config.transform.length; i++) {
    transformRegexp.push([
      new RegExp(config.transform[i][0]),
      config.transform[i][1],
      config.transform[i][2]
    ]);
  }
  return transformRegexp;
};
function invariant(condition, message) {
  if (condition == null || condition === false || condition === '') {
    throw new Error(message);
  }
}
function assertSyncTransformer(transformer, name) {
  invariant(name);
  invariant(
    typeof transformer.process === 'function',
    (0, _runtimeErrorsAndWarnings.makeInvalidSyncTransformerError)(name)
  );
}
async function createScriptTransformer(config, cacheFS = new Map()) {
  const transformer = new ScriptTransformer(config, cacheFS);
  await transformer.loadTransformers();
  return transformer;
}
