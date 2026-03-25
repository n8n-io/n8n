'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.getSha1 = getSha1;
exports.worker = worker;
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
function fs() {
  const data = _interopRequireWildcard(require('graceful-fs'));
  fs = function () {
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
var _blacklist = _interopRequireDefault(require('./blacklist'));
var _constants = _interopRequireDefault(require('./constants'));
var _dependencyExtractor = require('./lib/dependencyExtractor');
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

const PACKAGE_JSON = `${path().sep}package.json`;
let hasteImpl = null;
let hasteImplModulePath = null;
function sha1hex(content) {
  return (0, _crypto().createHash)('sha1').update(content).digest('hex');
}
async function worker(data) {
  if (
    data.hasteImplModulePath &&
    data.hasteImplModulePath !== hasteImplModulePath
  ) {
    if (hasteImpl) {
      throw new Error('jest-haste-map: hasteImplModulePath changed');
    }
    hasteImplModulePath = data.hasteImplModulePath;
    hasteImpl = require(hasteImplModulePath);
  }
  let content;
  let dependencies;
  let id;
  let module;
  let sha1;
  const {computeDependencies, computeSha1, rootDir, filePath} = data;
  const getContent = () => {
    if (content === undefined) {
      content = fs().readFileSync(filePath, 'utf8');
    }
    return content;
  };
  if (filePath.endsWith(PACKAGE_JSON)) {
    // Process a package.json that is returned as a PACKAGE type with its name.
    try {
      const fileData = JSON.parse(getContent());
      if (fileData.name) {
        const relativeFilePath = path().relative(rootDir, filePath);
        id = fileData.name;
        module = [relativeFilePath, _constants.default.PACKAGE];
      }
    } catch (err) {
      throw new Error(`Cannot parse ${filePath} as JSON: ${err.message}`);
    }
  } else if (
    !_blacklist.default.has(filePath.substring(filePath.lastIndexOf('.')))
  ) {
    // Process a random file that is returned as a MODULE.
    if (hasteImpl) {
      id = hasteImpl.getHasteName(filePath);
    }
    if (computeDependencies) {
      const content = getContent();
      const extractor = data.dependencyExtractor
        ? await (0, _jestUtil().requireOrImportModule)(
            data.dependencyExtractor,
            false
          )
        : _dependencyExtractor.extractor;
      dependencies = Array.from(
        extractor.extract(
          content,
          filePath,
          _dependencyExtractor.extractor.extract
        )
      );
    }
    if (id) {
      const relativeFilePath = path().relative(rootDir, filePath);
      module = [relativeFilePath, _constants.default.MODULE];
    }
  }

  // If a SHA-1 is requested on update, compute it.
  if (computeSha1) {
    sha1 = sha1hex(content || fs().readFileSync(filePath));
  }
  return {
    dependencies,
    id,
    module,
    sha1
  };
}
async function getSha1(data) {
  const sha1 = data.computeSha1
    ? sha1hex(fs().readFileSync(data.filePath))
    : null;
  return {
    dependencies: undefined,
    id: undefined,
    module: undefined,
    sha1
  };
}
