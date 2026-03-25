'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = void 0;
var _constants = _interopRequireDefault(require('./constants'));
var fastPath = _interopRequireWildcard(require('./lib/fast_path'));
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

const EMPTY_OBJ = {};
const EMPTY_MAP = new Map();
class ModuleMap {
  static DuplicateHasteCandidatesError;
  _raw;
  json;
  static mapToArrayRecursive(map) {
    let arr = Array.from(map);
    if (arr[0] && arr[0][1] instanceof Map) {
      arr = arr.map(el => [el[0], this.mapToArrayRecursive(el[1])]);
    }
    return arr;
  }
  static mapFromArrayRecursive(arr) {
    if (arr[0] && Array.isArray(arr[1])) {
      arr = arr.map(el => [el[0], this.mapFromArrayRecursive(el[1])]);
    }
    return new Map(arr);
  }
  constructor(raw) {
    this._raw = raw;
  }
  getModule(name, platform, supportsNativePlatform, type) {
    if (type == null) {
      type = _constants.default.MODULE;
    }
    const module = this._getModuleMetadata(
      name,
      platform,
      !!supportsNativePlatform
    );
    if (module && module[_constants.default.TYPE] === type) {
      const modulePath = module[_constants.default.PATH];
      return modulePath && fastPath.resolve(this._raw.rootDir, modulePath);
    }
    return null;
  }
  getPackage(name, platform, _supportsNativePlatform) {
    return this.getModule(name, platform, null, _constants.default.PACKAGE);
  }
  getMockModule(name) {
    const mockPath =
      this._raw.mocks.get(name) || this._raw.mocks.get(`${name}/index`);
    return mockPath && fastPath.resolve(this._raw.rootDir, mockPath);
  }
  getRawModuleMap() {
    return {
      duplicates: this._raw.duplicates,
      map: this._raw.map,
      mocks: this._raw.mocks,
      rootDir: this._raw.rootDir
    };
  }
  toJSON() {
    if (!this.json) {
      this.json = {
        duplicates: ModuleMap.mapToArrayRecursive(this._raw.duplicates),
        map: Array.from(this._raw.map),
        mocks: Array.from(this._raw.mocks),
        rootDir: this._raw.rootDir
      };
    }
    return this.json;
  }
  static fromJSON(serializableModuleMap) {
    return new ModuleMap({
      duplicates: ModuleMap.mapFromArrayRecursive(
        serializableModuleMap.duplicates
      ),
      map: new Map(serializableModuleMap.map),
      mocks: new Map(serializableModuleMap.mocks),
      rootDir: serializableModuleMap.rootDir
    });
  }

  /**
   * When looking up a module's data, we walk through each eligible platform for
   * the query. For each platform, we want to check if there are known
   * duplicates for that name+platform pair. The duplication logic normally
   * removes elements from the `map` object, but we want to check upfront to be
   * extra sure. If metadata exists both in the `duplicates` object and the
   * `map`, this would be a bug.
   */
  _getModuleMetadata(name, platform, supportsNativePlatform) {
    const map = this._raw.map.get(name) || EMPTY_OBJ;
    const dupMap = this._raw.duplicates.get(name) || EMPTY_MAP;
    if (platform != null) {
      this._assertNoDuplicates(
        name,
        platform,
        supportsNativePlatform,
        dupMap.get(platform)
      );
      if (map[platform] != null) {
        return map[platform];
      }
    }
    if (supportsNativePlatform) {
      this._assertNoDuplicates(
        name,
        _constants.default.NATIVE_PLATFORM,
        supportsNativePlatform,
        dupMap.get(_constants.default.NATIVE_PLATFORM)
      );
      if (map[_constants.default.NATIVE_PLATFORM]) {
        return map[_constants.default.NATIVE_PLATFORM];
      }
    }
    this._assertNoDuplicates(
      name,
      _constants.default.GENERIC_PLATFORM,
      supportsNativePlatform,
      dupMap.get(_constants.default.GENERIC_PLATFORM)
    );
    if (map[_constants.default.GENERIC_PLATFORM]) {
      return map[_constants.default.GENERIC_PLATFORM];
    }
    return null;
  }
  _assertNoDuplicates(name, platform, supportsNativePlatform, relativePathSet) {
    if (relativePathSet == null) {
      return;
    }
    // Force flow refinement
    const previousSet = relativePathSet;
    const duplicates = new Map();
    for (const [relativePath, type] of previousSet) {
      const duplicatePath = fastPath.resolve(this._raw.rootDir, relativePath);
      duplicates.set(duplicatePath, type);
    }
    throw new DuplicateHasteCandidatesError(
      name,
      platform,
      supportsNativePlatform,
      duplicates
    );
  }
  static create(rootDir) {
    return new ModuleMap({
      duplicates: new Map(),
      map: new Map(),
      mocks: new Map(),
      rootDir
    });
  }
}
exports.default = ModuleMap;
class DuplicateHasteCandidatesError extends Error {
  hasteName;
  platform;
  supportsNativePlatform;
  duplicatesSet;
  constructor(name, platform, supportsNativePlatform, duplicatesSet) {
    const platformMessage = getPlatformMessage(platform);
    super(
      `The name \`${name}\` was looked up in the Haste module map. It ` +
        'cannot be resolved, because there exists several different ' +
        'files, or packages, that provide a module for ' +
        `that particular name and platform. ${platformMessage} You must ` +
        `delete or exclude files until there remains only one of these:\n\n${Array.from(
          duplicatesSet
        )
          .map(
            ([dupFilePath, dupFileType]) =>
              `  * \`${dupFilePath}\` (${getTypeMessage(dupFileType)})\n`
          )
          .sort()
          .join('')}`
    );
    this.hasteName = name;
    this.platform = platform;
    this.supportsNativePlatform = supportsNativePlatform;
    this.duplicatesSet = duplicatesSet;
  }
}
function getPlatformMessage(platform) {
  if (platform === _constants.default.GENERIC_PLATFORM) {
    return 'The platform is generic (no extension).';
  }
  return `The platform extension is \`${platform}\`.`;
}
function getTypeMessage(type) {
  switch (type) {
    case _constants.default.MODULE:
      return 'module';
    case _constants.default.PACKAGE:
      return 'package';
  }
  return 'unknown';
}
ModuleMap.DuplicateHasteCandidatesError = DuplicateHasteCandidatesError;
