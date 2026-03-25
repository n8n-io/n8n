'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = generateEmptyCoverage;
function fs() {
  const data = _interopRequireWildcard(require('graceful-fs'));
  fs = function () {
    return data;
  };
  return data;
}
function _istanbulLibCoverage() {
  const data = require('istanbul-lib-coverage');
  _istanbulLibCoverage = function () {
    return data;
  };
  return data;
}
function _istanbulLibInstrument() {
  const data = require('istanbul-lib-instrument');
  _istanbulLibInstrument = function () {
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

async function generateEmptyCoverage(
  source,
  filename,
  globalConfig,
  config,
  changedFiles,
  sourcesRelatedToTestsInChangedFiles
) {
  const coverageOptions = {
    changedFiles,
    collectCoverage: globalConfig.collectCoverage,
    collectCoverageFrom: globalConfig.collectCoverageFrom,
    coverageProvider: globalConfig.coverageProvider,
    sourcesRelatedToTestsInChangedFiles
  };
  let coverageWorkerResult = null;
  if ((0, _transform().shouldInstrument)(filename, coverageOptions, config)) {
    if (coverageOptions.coverageProvider === 'v8') {
      const stat = fs().statSync(filename);
      return {
        kind: 'V8Coverage',
        result: {
          functions: [
            {
              functionName: '(empty-report)',
              isBlockCoverage: true,
              ranges: [
                {
                  count: 0,
                  endOffset: stat.size,
                  startOffset: 0
                }
              ]
            }
          ],
          scriptId: '0',
          url: filename
        }
      };
    }
    const scriptTransformer = await (0, _transform().createScriptTransformer)(
      config
    );

    // Transform file with instrumentation to make sure initial coverage data is well mapped to original code.
    const {code} = await scriptTransformer.transformSourceAsync(
      filename,
      source,
      {
        instrument: true,
        supportsDynamicImport: true,
        supportsExportNamespaceFrom: true,
        supportsStaticESM: true,
        supportsTopLevelAwait: true
      }
    );
    // TODO: consider passing AST
    const extracted = (0, _istanbulLibInstrument().readInitialCoverage)(code);
    // Check extracted initial coverage is not null, this can happen when using /* istanbul ignore file */
    if (extracted) {
      coverageWorkerResult = {
        coverage: (0, _istanbulLibCoverage().createFileCoverage)(
          extracted.coverageData
        ),
        kind: 'BabelCoverage'
      };
    }
  }
  return coverageWorkerResult;
}
