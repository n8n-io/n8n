"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  FileEntryCache: () => FileEntryCache,
  create: () => create,
  createFromFile: () => createFromFile,
  default: () => FileEntryDefault
});
module.exports = __toCommonJS(index_exports);
var import_node_crypto = __toESM(require("crypto"), 1);
var import_node_fs = __toESM(require("fs"), 1);
var import_node_path = __toESM(require("path"), 1);
var import_flat_cache = require("flat-cache");
function createFromFile(filePath, useCheckSum, currentWorkingDirectory) {
  const fname = import_node_path.default.basename(filePath);
  const directory = import_node_path.default.dirname(filePath);
  return create(fname, directory, useCheckSum, currentWorkingDirectory);
}
function create(cacheId, cacheDirectory, useCheckSum, currentWorkingDirectory) {
  const options = {
    currentWorkingDirectory,
    useCheckSum,
    cache: {
      cacheId,
      cacheDir: cacheDirectory
    }
  };
  const fileEntryCache = new FileEntryCache(options);
  if (cacheDirectory) {
    const cachePath = `${cacheDirectory}/${cacheId}`;
    if (import_node_fs.default.existsSync(cachePath)) {
      fileEntryCache.cache = (0, import_flat_cache.createFromFile)(cachePath, options.cache);
    }
  }
  return fileEntryCache;
}
var FileEntryDefault = class {
  static create = create;
  static createFromFile = createFromFile;
};
var FileEntryCache = class {
  _cache = new import_flat_cache.FlatCache({ useClone: false });
  _useCheckSum = false;
  _useModifiedTime = true;
  _currentWorkingDirectory;
  _hashAlgorithm = "md5";
  /**
   * Create a new FileEntryCache instance
   * @param options - The options for the FileEntryCache
   */
  constructor(options) {
    if (options?.cache) {
      this._cache = new import_flat_cache.FlatCache(options.cache);
    }
    if (options?.useModifiedTime) {
      this._useModifiedTime = options.useModifiedTime;
    }
    if (options?.useCheckSum) {
      this._useCheckSum = options.useCheckSum;
    }
    if (options?.currentWorkingDirectory) {
      this._currentWorkingDirectory = options.currentWorkingDirectory;
    }
    if (options?.hashAlgorithm) {
      this._hashAlgorithm = options.hashAlgorithm;
    }
  }
  /**
   * Get the cache
   * @returns {FlatCache} The cache
   */
  get cache() {
    return this._cache;
  }
  /**
   * Set the cache
   * @param {FlatCache} cache - The cache to set
   */
  set cache(cache) {
    this._cache = cache;
  }
  /**
   * Use the hash to check if the file has changed
   * @returns {boolean} if the hash is used to check if the file has changed
   */
  get useCheckSum() {
    return this._useCheckSum;
  }
  /**
   * Set the useCheckSum value
   * @param {boolean} value - The value to set
   */
  set useCheckSum(value) {
    this._useCheckSum = value;
  }
  /**
   * Use the modified time to check if the file has changed
   * @returns {boolean} if the modified time is used to check if the file has changed
   */
  get useModifiedTime() {
    return this._useModifiedTime;
  }
  /**
   * Set the useModifiedTime value
   * @param {boolean} value - The value to set
   */
  set useModifiedTime(value) {
    this._useModifiedTime = value;
  }
  /**
   * Get the hash algorithm
   * @returns {string} The hash algorithm
   */
  get hashAlgorithm() {
    return this._hashAlgorithm;
  }
  /**
   * Set the hash algorithm
   * @param {string} value - The value to set
   */
  set hashAlgorithm(value) {
    this._hashAlgorithm = value;
  }
  /**
   * Get the current working directory
   * @returns {string | undefined} The current working directory
   */
  get currentWorkingDirectory() {
    return this._currentWorkingDirectory;
  }
  /**
   * Set the current working directory
   * @param {string | undefined} value - The value to set
   */
  set currentWorkingDirectory(value) {
    this._currentWorkingDirectory = value;
  }
  /**
   * Given a buffer, calculate md5 hash of its content.
   * @method getHash
   * @param  {Buffer} buffer   buffer to calculate hash on
   * @return {String}          content hash digest
   */
  // eslint-disable-next-line @typescript-eslint/no-restricted-types
  getHash(buffer) {
    return import_node_crypto.default.createHash(this._hashAlgorithm).update(buffer).digest("hex");
  }
  /**
   * Create the key for the file path used for caching.
   * @method createFileKey
   * @param {String} filePath
   * @return {String}
   */
  createFileKey(filePath, options) {
    let result = filePath;
    const currentWorkingDirectory = options?.currentWorkingDirectory ?? this._currentWorkingDirectory;
    if (currentWorkingDirectory && filePath.startsWith(currentWorkingDirectory)) {
      const splitPath = filePath.split(currentWorkingDirectory).pop();
      if (splitPath) {
        result = splitPath;
        if (result.startsWith("/")) {
          result = result.slice(1);
        }
      }
    }
    return result;
  }
  /**
   * Check if the file path is a relative path
   * @method isRelativePath
   * @param filePath - The file path to check
   * @returns {boolean} if the file path is a relative path, false otherwise
   */
  isRelativePath(filePath) {
    return !import_node_path.default.isAbsolute(filePath);
  }
  /**
  * Delete the cache file from the disk
  * @method deleteCacheFile
  * @return {boolean}       true if the file was deleted, false otherwise
  */
  deleteCacheFile() {
    return this._cache.removeCacheFile();
  }
  /**
  * Remove the cache from the file and clear the memory cache
  * @method destroy
  */
  destroy() {
    this._cache.destroy();
  }
  /**
   * Remove and Entry From the Cache
   * @method removeEntry
   * @param filePath - The file path to remove from the cache
   */
  removeEntry(filePath, options) {
    if (this.isRelativePath(filePath)) {
      filePath = this.getAbsolutePath(filePath, { currentWorkingDirectory: options?.currentWorkingDirectory });
      this._cache.removeKey(this.createFileKey(filePath));
    }
    const key = this.createFileKey(filePath, { currentWorkingDirectory: options?.currentWorkingDirectory });
    this._cache.removeKey(key);
  }
  /**
   * Reconcile the cache
   * @method reconcile
   */
  reconcile() {
    const { items } = this._cache;
    for (const item of items) {
      const fileDescriptor = this.getFileDescriptor(item.key);
      if (fileDescriptor.notFound) {
        this._cache.removeKey(item.key);
      }
    }
    this._cache.save();
  }
  /**
   * Check if the file has changed
   * @method hasFileChanged
   * @param filePath - The file path to check
   * @returns {boolean} if the file has changed, false otherwise
   */
  hasFileChanged(filePath) {
    let result = false;
    const fileDescriptor = this.getFileDescriptor(filePath);
    if ((!fileDescriptor.err || !fileDescriptor.notFound) && fileDescriptor.changed) {
      result = true;
    }
    return result;
  }
  /**
   * Get the file descriptor for the file path
   * @method getFileDescriptor
   * @param filePath - The file path to get the file descriptor for
   * @param options - The options for getting the file descriptor
   * @returns The file descriptor
   */
  // eslint-disable-next-line complexity
  getFileDescriptor(filePath, options) {
    let fstat;
    const result = {
      key: this.createFileKey(filePath),
      changed: false,
      meta: {}
    };
    result.meta = this._cache.getKey(result.key) ?? {};
    filePath = this.getAbsolutePath(filePath, { currentWorkingDirectory: options?.currentWorkingDirectory });
    const useCheckSumValue = options?.useCheckSum ?? this._useCheckSum;
    const useModifiedTimeValue = options?.useModifiedTime ?? this._useModifiedTime;
    try {
      fstat = import_node_fs.default.statSync(filePath);
      result.meta = {
        size: fstat.size
      };
      result.meta.mtime = fstat.mtime.getTime();
      if (useCheckSumValue) {
        const buffer = import_node_fs.default.readFileSync(filePath);
        result.meta.hash = this.getHash(buffer);
      }
    } catch (error) {
      this.removeEntry(filePath);
      let notFound = false;
      if (error.message.includes("ENOENT")) {
        notFound = true;
      }
      return {
        key: result.key,
        err: error,
        notFound,
        meta: {}
      };
    }
    const metaCache = this._cache.getKey(result.key);
    if (!metaCache) {
      result.changed = true;
      this._cache.setKey(result.key, result.meta);
      return result;
    }
    if (result.meta.data === void 0) {
      result.meta.data = metaCache.data;
    }
    if (useModifiedTimeValue && metaCache?.mtime !== result.meta?.mtime) {
      result.changed = true;
    }
    if (metaCache?.size !== result.meta?.size) {
      result.changed = true;
    }
    if (useCheckSumValue && metaCache?.hash !== result.meta?.hash) {
      result.changed = true;
    }
    this._cache.setKey(result.key, result.meta);
    return result;
  }
  /**
   * Get the file descriptors for the files
   * @method normalizeEntries
   * @param files?: string[] - The files to get the file descriptors for
   * @returns The file descriptors
   */
  normalizeEntries(files) {
    const result = new Array();
    if (files) {
      for (const file of files) {
        const fileDescriptor = this.getFileDescriptor(file);
        result.push(fileDescriptor);
      }
      return result;
    }
    const keys = this.cache.keys();
    for (const key of keys) {
      const fileDescriptor = this.getFileDescriptor(key);
      if (!fileDescriptor.notFound && !fileDescriptor.err) {
        result.push(fileDescriptor);
      }
    }
    return result;
  }
  /**
   * Analyze the files
   * @method analyzeFiles
   * @param files - The files to analyze
   * @returns {AnalyzedFiles} The analysis of the files
   */
  analyzeFiles(files) {
    const result = {
      changedFiles: [],
      notFoundFiles: [],
      notChangedFiles: []
    };
    const fileDescriptors = this.normalizeEntries(files);
    for (const fileDescriptor of fileDescriptors) {
      if (fileDescriptor.notFound) {
        result.notFoundFiles.push(fileDescriptor.key);
      } else if (fileDescriptor.changed) {
        result.changedFiles.push(fileDescriptor.key);
      } else {
        result.notChangedFiles.push(fileDescriptor.key);
      }
    }
    return result;
  }
  /**
   * Get the updated files
   * @method getUpdatedFiles
   * @param files - The files to get the updated files for
   * @returns {string[]} The updated files
   */
  getUpdatedFiles(files) {
    const result = new Array();
    const fileDescriptors = this.normalizeEntries(files);
    for (const fileDescriptor of fileDescriptors) {
      if (fileDescriptor.changed) {
        result.push(fileDescriptor.key);
      }
    }
    return result;
  }
  /**
   * Get the not found files
   * @method getFileDescriptorsByPath
   * @param filePath - the files that you want to get from a path
   * @returns {FileDescriptor[]} The not found files
   */
  getFileDescriptorsByPath(filePath) {
    const result = new Array();
    const keys = this._cache.keys();
    for (const key of keys) {
      const absolutePath = this.getAbsolutePath(filePath);
      if (absolutePath.startsWith(filePath)) {
        const fileDescriptor = this.getFileDescriptor(key);
        result.push(fileDescriptor);
      }
    }
    return result;
  }
  /**
   * Get the Absolute Path. If it is already absolute it will return the path as is.
   * @method getAbsolutePath
   * @param filePath - The file path to get the absolute path for
   * @param options - The options for getting the absolute path. The current working directory is used if not provided.
   * @returns {string}
   */
  getAbsolutePath(filePath, options) {
    if (this.isRelativePath(filePath)) {
      const currentWorkingDirectory = options?.currentWorkingDirectory ?? this._currentWorkingDirectory ?? process.cwd();
      filePath = import_node_path.default.resolve(currentWorkingDirectory, filePath);
    }
    return filePath;
  }
  /**
   * Rename the absolute path keys. This is used when a directory is changed or renamed.
   * @method renameAbsolutePathKeys
   * @param oldPath - The old path to rename
   * @param newPath - The new path to rename to
   */
  renameAbsolutePathKeys(oldPath, newPath) {
    const keys = this._cache.keys();
    for (const key of keys) {
      if (key.startsWith(oldPath)) {
        const newKey = key.replace(oldPath, newPath);
        const meta = this._cache.getKey(key);
        this._cache.removeKey(key);
        this._cache.setKey(newKey, meta);
      }
    }
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  FileEntryCache,
  create,
  createFromFile
});
