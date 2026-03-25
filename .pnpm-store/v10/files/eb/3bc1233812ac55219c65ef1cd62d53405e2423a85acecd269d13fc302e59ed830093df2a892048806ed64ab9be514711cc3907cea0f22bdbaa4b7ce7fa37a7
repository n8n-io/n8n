'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = exports.ModuleMap = exports.DuplicateError = void 0;
function _crypto() {
  const data = require('crypto');
  _crypto = function () {
    return data;
  };
  return data;
}
function _events() {
  const data = require('events');
  _events = function () {
    return data;
  };
  return data;
}
function _os() {
  const data = require('os');
  _os = function () {
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
function _v() {
  const data = require('v8');
  _v = function () {
    return data;
  };
  return data;
}
function _gracefulFs() {
  const data = require('graceful-fs');
  _gracefulFs = function () {
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
function _jestUtil() {
  const data = require('jest-util');
  _jestUtil = function () {
    return data;
  };
  return data;
}
function _jestWorker() {
  const data = require('jest-worker');
  _jestWorker = function () {
    return data;
  };
  return data;
}
var _HasteFS = _interopRequireDefault(require('./HasteFS'));
var _ModuleMap = _interopRequireDefault(require('./ModuleMap'));
var _constants = _interopRequireDefault(require('./constants'));
var _node = require('./crawlers/node');
var _watchman = require('./crawlers/watchman');
var _getMockName = _interopRequireDefault(require('./getMockName'));
var fastPath = _interopRequireWildcard(require('./lib/fast_path'));
var _getPlatformExtension = _interopRequireDefault(
  require('./lib/getPlatformExtension')
);
var _isWatchmanInstalled = _interopRequireDefault(
  require('./lib/isWatchmanInstalled')
);
var _normalizePathSep = _interopRequireDefault(
  require('./lib/normalizePathSep')
);
var _FSEventsWatcher = require('./watchers/FSEventsWatcher');
var _NodeWatcher = _interopRequireDefault(require('./watchers/NodeWatcher'));
var _WatchmanWatcher = _interopRequireDefault(
  require('./watchers/WatchmanWatcher')
);
var _worker = require('./worker');
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

// @ts-expect-error: not converted to TypeScript - it's a fork: https://github.com/facebook/jest/pull/10919

// @ts-expect-error: not converted to TypeScript - it's a fork: https://github.com/facebook/jest/pull/5387

// TypeScript doesn't like us importing from outside `rootDir`, but it doesn't
// understand `require`.
const {version: VERSION} = require('../package.json');
const ModuleMap = _ModuleMap.default;
exports.ModuleMap = ModuleMap;
const CHANGE_INTERVAL = 30;
const MAX_WAIT_TIME = 240000;
const NODE_MODULES = `${path().sep}node_modules${path().sep}`;
const PACKAGE_JSON = `${path().sep}package.json`;
const VCS_DIRECTORIES = ['.git', '.hg', '.sl']
  .map(vcs =>
    (0, _jestRegexUtil().escapePathForRegex)(path().sep + vcs + path().sep)
  )
  .join('|');
function invariant(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

/**
 * HasteMap is a JavaScript implementation of Facebook's haste module system.
 *
 * This implementation is inspired by https://github.com/facebook/node-haste
 * and was built with for high-performance in large code repositories with
 * hundreds of thousands of files. This implementation is scalable and provides
 * predictable performance.
 *
 * Because the haste map creation and synchronization is critical to startup
 * performance and most tasks are blocked by I/O this class makes heavy use of
 * synchronous operations. It uses worker processes for parallelizing file
 * access and metadata extraction.
 *
 * The data structures created by `jest-haste-map` can be used directly from the
 * cache without further processing. The metadata objects in the `files` and
 * `map` objects contain cross-references: a metadata object from one can look
 * up the corresponding metadata object in the other map. Note that in most
 * projects, the number of files will be greater than the number of haste
 * modules one module can refer to many files based on platform extensions.
 *
 * type HasteMap = {
 *   clocks: WatchmanClocks,
 *   files: {[filepath: string]: FileMetaData},
 *   map: {[id: string]: ModuleMapItem},
 *   mocks: {[id: string]: string},
 * }
 *
 * // Watchman clocks are used for query synchronization and file system deltas.
 * type WatchmanClocks = {[filepath: string]: string};
 *
 * type FileMetaData = {
 *   id: ?string, // used to look up module metadata objects in `map`.
 *   mtime: number, // check for outdated files.
 *   size: number, // size of the file in bytes.
 *   visited: boolean, // whether the file has been parsed or not.
 *   dependencies: Array<string>, // all relative dependencies of this file.
 *   sha1: ?string, // SHA-1 of the file, if requested via options.
 * };
 *
 * // Modules can be targeted to a specific platform based on the file name.
 * // Example: platform.ios.js and Platform.android.js will both map to the same
 * // `Platform` module. The platform should be specified during resolution.
 * type ModuleMapItem = {[platform: string]: ModuleMetaData};
 *
 * //
 * type ModuleMetaData = {
 *   path: string, // the path to look up the file object in `files`.
 *   type: string, // the module type (either `package` or `module`).
 * };
 *
 * Note that the data structures described above are conceptual only. The actual
 * implementation uses arrays and constant keys for metadata storage. Instead of
 * `{id: 'flatMap', mtime: 3421, size: 42, visited: true, dependencies: []}` the real
 * representation is similar to `['flatMap', 3421, 42, 1, []]` to save storage space
 * and reduce parse and write time of a big JSON blob.
 *
 * The HasteMap is created as follows:
 *  1. read data from the cache or create an empty structure.
 *
 *  2. crawl the file system.
 *     * empty cache: crawl the entire file system.
 *     * cache available:
 *       * if watchman is available: get file system delta changes.
 *       * if watchman is unavailable: crawl the entire file system.
 *     * build metadata objects for every file. This builds the `files` part of
 *       the `HasteMap`.
 *
 *  3. parse and extract metadata from changed files.
 *     * this is done in parallel over worker processes to improve performance.
 *     * the worst case is to parse all files.
 *     * the best case is no file system access and retrieving all data from
 *       the cache.
 *     * the average case is a small number of changed files.
 *
 *  4. serialize the new `HasteMap` in a cache file.
 *     Worker processes can directly access the cache through `HasteMap.read()`.
 *
 */
class HasteMap extends _events().EventEmitter {
  _buildPromise = null;
  _cachePath = '';
  _changeInterval;
  _console;
  _isWatchmanInstalledPromise = null;
  _options;
  _watchers = [];
  _worker = null;
  static getStatic(config) {
    if (config.haste.hasteMapModulePath) {
      return require(config.haste.hasteMapModulePath);
    }
    return HasteMap;
  }
  static async create(options) {
    if (options.hasteMapModulePath) {
      const CustomHasteMap = require(options.hasteMapModulePath);
      return new CustomHasteMap(options);
    }
    const hasteMap = new HasteMap(options);
    await hasteMap.setupCachePath(options);
    return hasteMap;
  }
  constructor(options) {
    super();
    this._options = {
      cacheDirectory: options.cacheDirectory || (0, _os().tmpdir)(),
      computeDependencies: options.computeDependencies ?? true,
      computeSha1: options.computeSha1 || false,
      dependencyExtractor: options.dependencyExtractor || null,
      enableSymlinks: options.enableSymlinks || false,
      extensions: options.extensions,
      forceNodeFilesystemAPI: !!options.forceNodeFilesystemAPI,
      hasteImplModulePath: options.hasteImplModulePath,
      id: options.id,
      maxWorkers: options.maxWorkers,
      mocksPattern: options.mocksPattern
        ? new RegExp(options.mocksPattern)
        : null,
      platforms: options.platforms,
      resetCache: options.resetCache,
      retainAllFiles: options.retainAllFiles,
      rootDir: options.rootDir,
      roots: Array.from(new Set(options.roots)),
      skipPackageJson: !!options.skipPackageJson,
      throwOnModuleCollision: !!options.throwOnModuleCollision,
      useWatchman: options.useWatchman ?? true,
      watch: !!options.watch,
      workerThreads: options.workerThreads
    };
    this._console = options.console || globalThis.console;
    if (options.ignorePattern) {
      if (options.ignorePattern instanceof RegExp) {
        this._options.ignorePattern = new RegExp(
          options.ignorePattern.source.concat(`|${VCS_DIRECTORIES}`),
          options.ignorePattern.flags
        );
      } else {
        throw new Error(
          'jest-haste-map: the `ignorePattern` option must be a RegExp'
        );
      }
    } else {
      this._options.ignorePattern = new RegExp(VCS_DIRECTORIES);
    }
    if (this._options.enableSymlinks && this._options.useWatchman) {
      throw new Error(
        'jest-haste-map: enableSymlinks config option was set, but ' +
          'is incompatible with watchman.\n' +
          'Set either `enableSymlinks` to false or `useWatchman` to false.'
      );
    }
  }
  async setupCachePath(options) {
    const rootDirHash = (0, _crypto().createHash)('sha1')
      .update(options.rootDir)
      .digest('hex')
      .substring(0, 32);
    let hasteImplHash = '';
    let dependencyExtractorHash = '';
    if (options.hasteImplModulePath) {
      const hasteImpl = require(options.hasteImplModulePath);
      if (hasteImpl.getCacheKey) {
        hasteImplHash = String(hasteImpl.getCacheKey());
      }
    }
    if (options.dependencyExtractor) {
      const dependencyExtractor = await (0, _jestUtil().requireOrImportModule)(
        options.dependencyExtractor,
        false
      );
      if (dependencyExtractor.getCacheKey) {
        dependencyExtractorHash = String(dependencyExtractor.getCacheKey());
      }
    }
    this._cachePath = HasteMap.getCacheFilePath(
      this._options.cacheDirectory,
      `haste-map-${this._options.id}-${rootDirHash}`,
      VERSION,
      this._options.id,
      this._options.roots
        .map(root => fastPath.relative(options.rootDir, root))
        .join(':'),
      this._options.extensions.join(':'),
      this._options.platforms.join(':'),
      this._options.computeSha1.toString(),
      options.mocksPattern || '',
      (options.ignorePattern || '').toString(),
      hasteImplHash,
      dependencyExtractorHash,
      this._options.computeDependencies.toString()
    );
  }
  static getCacheFilePath(tmpdir, id, ...extra) {
    const hash = (0, _crypto().createHash)('sha1').update(extra.join(''));
    return path().join(
      tmpdir,
      `${id.replace(/\W/g, '-')}-${hash.digest('hex').substring(0, 32)}`
    );
  }
  static getModuleMapFromJSON(json) {
    return _ModuleMap.default.fromJSON(json);
  }
  getCacheFilePath() {
    return this._cachePath;
  }
  build() {
    if (!this._buildPromise) {
      this._buildPromise = (async () => {
        const data = await this._buildFileMap();

        // Persist when we don't know if files changed (changedFiles undefined)
        // or when we know a file was changed or deleted.
        let hasteMap;
        if (
          data.changedFiles === undefined ||
          data.changedFiles.size > 0 ||
          data.removedFiles.size > 0
        ) {
          hasteMap = await this._buildHasteMap(data);
          this._persist(hasteMap);
        } else {
          hasteMap = data.hasteMap;
        }
        const rootDir = this._options.rootDir;
        const hasteFS = new _HasteFS.default({
          files: hasteMap.files,
          rootDir
        });
        const moduleMap = new _ModuleMap.default({
          duplicates: hasteMap.duplicates,
          map: hasteMap.map,
          mocks: hasteMap.mocks,
          rootDir
        });
        const __hasteMapForTest =
          (process.env.NODE_ENV === 'test' && hasteMap) || null;
        await this._watch(hasteMap);
        return {
          __hasteMapForTest,
          hasteFS,
          moduleMap
        };
      })();
    }
    return this._buildPromise;
  }

  /**
   * 1. read data from the cache or create an empty structure.
   */
  read() {
    let hasteMap;
    try {
      hasteMap = (0, _v().deserialize)(
        (0, _gracefulFs().readFileSync)(this._cachePath)
      );
    } catch {
      hasteMap = this._createEmptyMap();
    }
    return hasteMap;
  }
  readModuleMap() {
    const data = this.read();
    return new _ModuleMap.default({
      duplicates: data.duplicates,
      map: data.map,
      mocks: data.mocks,
      rootDir: this._options.rootDir
    });
  }

  /**
   * 2. crawl the file system.
   */
  async _buildFileMap() {
    let hasteMap;
    try {
      const read = this._options.resetCache ? this._createEmptyMap : this.read;
      hasteMap = read.call(this);
    } catch {
      hasteMap = this._createEmptyMap();
    }
    return this._crawl(hasteMap);
  }

  /**
   * 3. parse and extract metadata from changed files.
   */
  _processFile(hasteMap, map, mocks, filePath, workerOptions) {
    const rootDir = this._options.rootDir;
    const setModule = (id, module) => {
      let moduleMap = map.get(id);
      if (!moduleMap) {
        moduleMap = Object.create(null);
        map.set(id, moduleMap);
      }
      const platform =
        (0, _getPlatformExtension.default)(
          module[_constants.default.PATH],
          this._options.platforms
        ) || _constants.default.GENERIC_PLATFORM;
      const existingModule = moduleMap[platform];
      if (
        existingModule &&
        existingModule[_constants.default.PATH] !==
          module[_constants.default.PATH]
      ) {
        const method = this._options.throwOnModuleCollision ? 'error' : 'warn';
        this._console[method](
          [
            `jest-haste-map: Haste module naming collision: ${id}`,
            '  The following files share their name; please adjust your hasteImpl:',
            `    * <rootDir>${path().sep}${
              existingModule[_constants.default.PATH]
            }`,
            `    * <rootDir>${path().sep}${module[_constants.default.PATH]}`,
            ''
          ].join('\n')
        );
        if (this._options.throwOnModuleCollision) {
          throw new DuplicateError(
            existingModule[_constants.default.PATH],
            module[_constants.default.PATH]
          );
        }

        // We do NOT want consumers to use a module that is ambiguous.
        delete moduleMap[platform];
        if (Object.keys(moduleMap).length === 1) {
          map.delete(id);
        }
        let dupsByPlatform = hasteMap.duplicates.get(id);
        if (dupsByPlatform == null) {
          dupsByPlatform = new Map();
          hasteMap.duplicates.set(id, dupsByPlatform);
        }
        const dups = new Map([
          [module[_constants.default.PATH], module[_constants.default.TYPE]],
          [
            existingModule[_constants.default.PATH],
            existingModule[_constants.default.TYPE]
          ]
        ]);
        dupsByPlatform.set(platform, dups);
        return;
      }
      const dupsByPlatform = hasteMap.duplicates.get(id);
      if (dupsByPlatform != null) {
        const dups = dupsByPlatform.get(platform);
        if (dups != null) {
          dups.set(
            module[_constants.default.PATH],
            module[_constants.default.TYPE]
          );
        }
        return;
      }
      moduleMap[platform] = module;
    };
    const relativeFilePath = fastPath.relative(rootDir, filePath);
    const fileMetadata = hasteMap.files.get(relativeFilePath);
    if (!fileMetadata) {
      throw new Error(
        'jest-haste-map: File to process was not found in the haste map.'
      );
    }
    const moduleMetadata = hasteMap.map.get(
      fileMetadata[_constants.default.ID]
    );
    const computeSha1 =
      this._options.computeSha1 && !fileMetadata[_constants.default.SHA1];

    // Callback called when the response from the worker is successful.
    const workerReply = metadata => {
      // `1` for truthy values instead of `true` to save cache space.
      fileMetadata[_constants.default.VISITED] = 1;
      const metadataId = metadata.id;
      const metadataModule = metadata.module;
      if (metadataId && metadataModule) {
        fileMetadata[_constants.default.ID] = metadataId;
        setModule(metadataId, metadataModule);
      }
      fileMetadata[_constants.default.DEPENDENCIES] = metadata.dependencies
        ? metadata.dependencies.join(_constants.default.DEPENDENCY_DELIM)
        : '';
      if (computeSha1) {
        fileMetadata[_constants.default.SHA1] = metadata.sha1;
      }
    };

    // Callback called when the response from the worker is an error.
    const workerError = error => {
      if (typeof error !== 'object' || !error.message || !error.stack) {
        error = new Error(error);
        error.stack = ''; // Remove stack for stack-less errors.
      }

      if (!['ENOENT', 'EACCES'].includes(error.code)) {
        throw error;
      }

      // If a file cannot be read we remove it from the file list and
      // ignore the failure silently.
      hasteMap.files.delete(relativeFilePath);
    };

    // If we retain all files in the virtual HasteFS representation, we avoid
    // reading them if they aren't important (node_modules).
    if (this._options.retainAllFiles && filePath.includes(NODE_MODULES)) {
      if (computeSha1) {
        return this._getWorker(workerOptions)
          .getSha1({
            computeDependencies: this._options.computeDependencies,
            computeSha1,
            dependencyExtractor: this._options.dependencyExtractor,
            filePath,
            hasteImplModulePath: this._options.hasteImplModulePath,
            rootDir
          })
          .then(workerReply, workerError);
      }
      return null;
    }
    if (
      this._options.mocksPattern &&
      this._options.mocksPattern.test(filePath)
    ) {
      const mockPath = (0, _getMockName.default)(filePath);
      const existingMockPath = mocks.get(mockPath);
      if (existingMockPath) {
        const secondMockPath = fastPath.relative(rootDir, filePath);
        if (existingMockPath !== secondMockPath) {
          const method = this._options.throwOnModuleCollision
            ? 'error'
            : 'warn';
          this._console[method](
            [
              `jest-haste-map: duplicate manual mock found: ${mockPath}`,
              '  The following files share their name; please delete one of them:',
              `    * <rootDir>${path().sep}${existingMockPath}`,
              `    * <rootDir>${path().sep}${secondMockPath}`,
              ''
            ].join('\n')
          );
          if (this._options.throwOnModuleCollision) {
            throw new DuplicateError(existingMockPath, secondMockPath);
          }
        }
      }
      mocks.set(mockPath, relativeFilePath);
    }
    if (fileMetadata[_constants.default.VISITED]) {
      if (!fileMetadata[_constants.default.ID]) {
        return null;
      }
      if (moduleMetadata != null) {
        const platform =
          (0, _getPlatformExtension.default)(
            filePath,
            this._options.platforms
          ) || _constants.default.GENERIC_PLATFORM;
        const module = moduleMetadata[platform];
        if (module == null) {
          return null;
        }
        const moduleId = fileMetadata[_constants.default.ID];
        let modulesByPlatform = map.get(moduleId);
        if (!modulesByPlatform) {
          modulesByPlatform = Object.create(null);
          map.set(moduleId, modulesByPlatform);
        }
        modulesByPlatform[platform] = module;
        return null;
      }
    }
    return this._getWorker(workerOptions)
      .worker({
        computeDependencies: this._options.computeDependencies,
        computeSha1,
        dependencyExtractor: this._options.dependencyExtractor,
        filePath,
        hasteImplModulePath: this._options.hasteImplModulePath,
        rootDir
      })
      .then(workerReply, workerError);
  }
  _buildHasteMap(data) {
    const {removedFiles, changedFiles, hasteMap} = data;

    // If any files were removed or we did not track what files changed, process
    // every file looking for changes. Otherwise, process only changed files.
    let map;
    let mocks;
    let filesToProcess;
    if (changedFiles === undefined || removedFiles.size) {
      map = new Map();
      mocks = new Map();
      filesToProcess = hasteMap.files;
    } else {
      map = hasteMap.map;
      mocks = hasteMap.mocks;
      filesToProcess = changedFiles;
    }
    for (const [relativeFilePath, fileMetadata] of removedFiles) {
      this._recoverDuplicates(
        hasteMap,
        relativeFilePath,
        fileMetadata[_constants.default.ID]
      );
    }
    const promises = [];
    for (const relativeFilePath of filesToProcess.keys()) {
      if (
        this._options.skipPackageJson &&
        relativeFilePath.endsWith(PACKAGE_JSON)
      ) {
        continue;
      }
      // SHA-1, if requested, should already be present thanks to the crawler.
      const filePath = fastPath.resolve(
        this._options.rootDir,
        relativeFilePath
      );
      const promise = this._processFile(hasteMap, map, mocks, filePath);
      if (promise) {
        promises.push(promise);
      }
    }
    return Promise.all(promises).then(
      () => {
        this._cleanup();
        hasteMap.map = map;
        hasteMap.mocks = mocks;
        return hasteMap;
      },
      error => {
        this._cleanup();
        throw error;
      }
    );
  }
  _cleanup() {
    const worker = this._worker;
    if (worker && 'end' in worker) {
      worker.end();
    }
    this._worker = null;
  }

  /**
   * 4. serialize the new `HasteMap` in a cache file.
   */
  _persist(hasteMap) {
    (0, _gracefulFs().writeFileSync)(
      this._cachePath,
      (0, _v().serialize)(hasteMap)
    );
  }

  /**
   * Creates workers or parses files and extracts metadata in-process.
   */
  _getWorker(
    options = {
      forceInBand: false
    }
  ) {
    if (!this._worker) {
      if (options.forceInBand || this._options.maxWorkers <= 1) {
        this._worker = {
          getSha1: _worker.getSha1,
          worker: _worker.worker
        };
      } else {
        this._worker = new (_jestWorker().Worker)(require.resolve('./worker'), {
          enableWorkerThreads: this._options.workerThreads,
          exposedMethods: ['getSha1', 'worker'],
          forkOptions: {
            serialization: 'json'
          },
          maxRetries: 3,
          numWorkers: this._options.maxWorkers
        });
      }
    }
    return this._worker;
  }
  async _crawl(hasteMap) {
    const options = this._options;
    const ignore = this._ignore.bind(this);
    const crawl = (await this._shouldUseWatchman())
      ? _watchman.watchmanCrawl
      : _node.nodeCrawl;
    const crawlerOptions = {
      computeSha1: options.computeSha1,
      data: hasteMap,
      enableSymlinks: options.enableSymlinks,
      extensions: options.extensions,
      forceNodeFilesystemAPI: options.forceNodeFilesystemAPI,
      ignore,
      rootDir: options.rootDir,
      roots: options.roots
    };
    const retry = error => {
      if (crawl === _watchman.watchmanCrawl) {
        this._console.warn(
          'jest-haste-map: Watchman crawl failed. Retrying once with node ' +
            'crawler.\n' +
            "  Usually this happens when watchman isn't running. Create an " +
            "empty `.watchmanconfig` file in your project's root folder or " +
            'initialize a git or hg repository in your project.\n' +
            `  ${error}`
        );
        return (0, _node.nodeCrawl)(crawlerOptions).catch(e => {
          throw new Error(
            'Crawler retry failed:\n' +
              `  Original error: ${error.message}\n` +
              `  Retry error: ${e.message}\n`
          );
        });
      }
      throw error;
    };
    try {
      return await crawl(crawlerOptions);
    } catch (error) {
      return retry(error);
    }
  }

  /**
   * Watch mode
   */
  async _watch(hasteMap) {
    if (!this._options.watch) {
      return Promise.resolve();
    }

    // In watch mode, we'll only warn about module collisions and we'll retain
    // all files, even changes to node_modules.
    this._options.throwOnModuleCollision = false;
    this._options.retainAllFiles = true;

    // WatchmanWatcher > FSEventsWatcher > sane.NodeWatcher
    const Watcher = (await this._shouldUseWatchman())
      ? _WatchmanWatcher.default
      : _FSEventsWatcher.FSEventsWatcher.isSupported()
      ? _FSEventsWatcher.FSEventsWatcher
      : _NodeWatcher.default;
    const extensions = this._options.extensions;
    const ignorePattern = this._options.ignorePattern;
    const rootDir = this._options.rootDir;
    let changeQueue = Promise.resolve();
    let eventsQueue = [];
    // We only need to copy the entire haste map once on every "frame".
    let mustCopy = true;
    const createWatcher = root => {
      const watcher = new Watcher(root, {
        dot: true,
        glob: extensions.map(extension => `**/*.${extension}`),
        ignored: ignorePattern
      });
      return new Promise((resolve, reject) => {
        const rejectTimeout = setTimeout(
          () => reject(new Error('Failed to start watch mode.')),
          MAX_WAIT_TIME
        );
        watcher.once('ready', () => {
          clearTimeout(rejectTimeout);
          watcher.on('all', onChange);
          resolve(watcher);
        });
      });
    };
    const emitChange = () => {
      if (eventsQueue.length) {
        mustCopy = true;
        const changeEvent = {
          eventsQueue,
          hasteFS: new _HasteFS.default({
            files: hasteMap.files,
            rootDir
          }),
          moduleMap: new _ModuleMap.default({
            duplicates: hasteMap.duplicates,
            map: hasteMap.map,
            mocks: hasteMap.mocks,
            rootDir
          })
        };
        this.emit('change', changeEvent);
        eventsQueue = [];
      }
    };
    const onChange = (type, filePath, root, stat) => {
      filePath = path().join(root, (0, _normalizePathSep.default)(filePath));
      if (
        (stat && stat.isDirectory()) ||
        this._ignore(filePath) ||
        !extensions.some(extension => filePath.endsWith(extension))
      ) {
        return;
      }
      const relativeFilePath = fastPath.relative(rootDir, filePath);
      const fileMetadata = hasteMap.files.get(relativeFilePath);

      // The file has been accessed, not modified
      if (
        type === 'change' &&
        fileMetadata &&
        stat &&
        fileMetadata[_constants.default.MTIME] === stat.mtime.getTime()
      ) {
        return;
      }
      changeQueue = changeQueue
        .then(() => {
          // If we get duplicate events for the same file, ignore them.
          if (
            eventsQueue.find(
              event =>
                event.type === type &&
                event.filePath === filePath &&
                ((!event.stat && !stat) ||
                  (!!event.stat &&
                    !!stat &&
                    event.stat.mtime.getTime() === stat.mtime.getTime()))
            )
          ) {
            return null;
          }
          if (mustCopy) {
            mustCopy = false;
            hasteMap = {
              clocks: new Map(hasteMap.clocks),
              duplicates: new Map(hasteMap.duplicates),
              files: new Map(hasteMap.files),
              map: new Map(hasteMap.map),
              mocks: new Map(hasteMap.mocks)
            };
          }
          const add = () => {
            eventsQueue.push({
              filePath,
              stat,
              type
            });
            return null;
          };
          const fileMetadata = hasteMap.files.get(relativeFilePath);

          // If it's not an addition, delete the file and all its metadata
          if (fileMetadata != null) {
            const moduleName = fileMetadata[_constants.default.ID];
            const platform =
              (0, _getPlatformExtension.default)(
                filePath,
                this._options.platforms
              ) || _constants.default.GENERIC_PLATFORM;
            hasteMap.files.delete(relativeFilePath);
            let moduleMap = hasteMap.map.get(moduleName);
            if (moduleMap != null) {
              // We are forced to copy the object because jest-haste-map exposes
              // the map as an immutable entity.
              moduleMap = copy(moduleMap);
              delete moduleMap[platform];
              if (Object.keys(moduleMap).length === 0) {
                hasteMap.map.delete(moduleName);
              } else {
                hasteMap.map.set(moduleName, moduleMap);
              }
            }
            if (
              this._options.mocksPattern &&
              this._options.mocksPattern.test(filePath)
            ) {
              const mockName = (0, _getMockName.default)(filePath);
              hasteMap.mocks.delete(mockName);
            }
            this._recoverDuplicates(hasteMap, relativeFilePath, moduleName);
          }

          // If the file was added or changed,
          // parse it and update the haste map.
          if (type === 'add' || type === 'change') {
            invariant(
              stat,
              'since the file exists or changed, it should have stats'
            );
            const fileMetadata = [
              '',
              stat.mtime.getTime(),
              stat.size,
              0,
              '',
              null
            ];
            hasteMap.files.set(relativeFilePath, fileMetadata);
            const promise = this._processFile(
              hasteMap,
              hasteMap.map,
              hasteMap.mocks,
              filePath,
              {
                forceInBand: true
              }
            );
            // Cleanup
            this._cleanup();
            if (promise) {
              return promise.then(add);
            } else {
              // If a file in node_modules has changed,
              // emit an event regardless.
              add();
            }
          } else {
            add();
          }
          return null;
        })
        .catch(error => {
          this._console.error(
            `jest-haste-map: watch error:\n  ${error.stack}\n`
          );
        });
    };
    this._changeInterval = setInterval(emitChange, CHANGE_INTERVAL);
    return Promise.all(this._options.roots.map(createWatcher)).then(
      watchers => {
        this._watchers = watchers;
      }
    );
  }

  /**
   * This function should be called when the file under `filePath` is removed
   * or changed. When that happens, we want to figure out if that file was
   * part of a group of files that had the same ID. If it was, we want to
   * remove it from the group. Furthermore, if there is only one file
   * remaining in the group, then we want to restore that single file as the
   * correct resolution for its ID, and cleanup the duplicates index.
   */
  _recoverDuplicates(hasteMap, relativeFilePath, moduleName) {
    let dupsByPlatform = hasteMap.duplicates.get(moduleName);
    if (dupsByPlatform == null) {
      return;
    }
    const platform =
      (0, _getPlatformExtension.default)(
        relativeFilePath,
        this._options.platforms
      ) || _constants.default.GENERIC_PLATFORM;
    let dups = dupsByPlatform.get(platform);
    if (dups == null) {
      return;
    }
    dupsByPlatform = copyMap(dupsByPlatform);
    hasteMap.duplicates.set(moduleName, dupsByPlatform);
    dups = copyMap(dups);
    dupsByPlatform.set(platform, dups);
    dups.delete(relativeFilePath);
    if (dups.size !== 1) {
      return;
    }
    const uniqueModule = dups.entries().next().value;
    if (!uniqueModule) {
      return;
    }
    let dedupMap = hasteMap.map.get(moduleName);
    if (!dedupMap) {
      dedupMap = Object.create(null);
      hasteMap.map.set(moduleName, dedupMap);
    }
    dedupMap[platform] = uniqueModule;
    dupsByPlatform.delete(platform);
    if (dupsByPlatform.size === 0) {
      hasteMap.duplicates.delete(moduleName);
    }
  }
  async end() {
    if (this._changeInterval) {
      clearInterval(this._changeInterval);
    }
    if (!this._watchers.length) {
      return;
    }
    await Promise.all(this._watchers.map(watcher => watcher.close()));
    this._watchers = [];
  }

  /**
   * Helpers
   */
  _ignore(filePath) {
    const ignorePattern = this._options.ignorePattern;
    const ignoreMatched =
      ignorePattern instanceof RegExp
        ? ignorePattern.test(filePath)
        : ignorePattern && ignorePattern(filePath);
    return (
      ignoreMatched ||
      (!this._options.retainAllFiles && filePath.includes(NODE_MODULES))
    );
  }
  async _shouldUseWatchman() {
    if (!this._options.useWatchman) {
      return false;
    }
    if (!this._isWatchmanInstalledPromise) {
      this._isWatchmanInstalledPromise = (0, _isWatchmanInstalled.default)();
    }
    return this._isWatchmanInstalledPromise;
  }
  _createEmptyMap() {
    return {
      clocks: new Map(),
      duplicates: new Map(),
      files: new Map(),
      map: new Map(),
      mocks: new Map()
    };
  }
  static H = _constants.default;
}
class DuplicateError extends Error {
  mockPath1;
  mockPath2;
  constructor(mockPath1, mockPath2) {
    super('Duplicated files or mocks. Please check the console for more info');
    this.mockPath1 = mockPath1;
    this.mockPath2 = mockPath2;
  }
}
exports.DuplicateError = DuplicateError;
function copy(object) {
  return Object.assign(Object.create(null), object);
}
function copyMap(input) {
  return new Map(input);
}

// Export the smallest API surface required by Jest

const JestHasteMap = HasteMap;
var _default = JestHasteMap;
exports.default = _default;
