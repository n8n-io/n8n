'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = runGlobalHook;
function util() {
  const data = _interopRequireWildcard(require('util'));
  util = function () {
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
function _prettyFormat() {
  const data = _interopRequireDefault(require('pretty-format'));
  _prettyFormat = function () {
    return data;
  };
  return data;
}
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

async function runGlobalHook({allTests, globalConfig, moduleName}) {
  const globalModulePaths = new Set(
    allTests.map(test => test.context.config[moduleName])
  );
  if (globalConfig[moduleName]) {
    globalModulePaths.add(globalConfig[moduleName]);
  }
  if (globalModulePaths.size > 0) {
    for (const modulePath of globalModulePaths) {
      if (!modulePath) {
        continue;
      }
      const correctConfig = allTests.find(
        t => t.context.config[moduleName] === modulePath
      );
      const projectConfig = correctConfig
        ? correctConfig.context.config
        : // Fallback to first config
          allTests[0].context.config;
      const transformer = await (0, _transform().createScriptTransformer)(
        projectConfig
      );
      try {
        await transformer.requireAndTranspileModule(
          modulePath,
          async globalModule => {
            if (typeof globalModule !== 'function') {
              throw new TypeError(
                `${moduleName} file must export a function at ${modulePath}`
              );
            }
            await globalModule(globalConfig, projectConfig);
          }
        );
      } catch (error) {
        if (
          util().types.isNativeError(error) &&
          (Object.getOwnPropertyDescriptor(error, 'message')?.writable ||
            Object.getOwnPropertyDescriptor(
              Object.getPrototypeOf(error),
              'message'
            )?.writable)
        ) {
          error.message = `Jest: Got error running ${moduleName} - ${modulePath}, reason: ${error.message}`;
          throw error;
        }
        throw new Error(
          `Jest: Got error running ${moduleName} - ${modulePath}, reason: ${(0,
          _prettyFormat().default)(error, {
            maxDepth: 3
          })}`
        );
      }
    }
  }
}
