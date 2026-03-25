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
function _v8Coverage() {
  const data = require('@bcoe/v8-coverage');
  _v8Coverage = function () {
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
function _glob() {
  const data = _interopRequireDefault(require('glob'));
  _glob = function () {
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
function _istanbulLibCoverage() {
  const data = _interopRequireDefault(require('istanbul-lib-coverage'));
  _istanbulLibCoverage = function () {
    return data;
  };
  return data;
}
function _istanbulLibReport() {
  const data = _interopRequireDefault(require('istanbul-lib-report'));
  _istanbulLibReport = function () {
    return data;
  };
  return data;
}
function _istanbulLibSourceMaps() {
  const data = _interopRequireDefault(require('istanbul-lib-source-maps'));
  _istanbulLibSourceMaps = function () {
    return data;
  };
  return data;
}
function _istanbulReports() {
  const data = _interopRequireDefault(require('istanbul-reports'));
  _istanbulReports = function () {
    return data;
  };
  return data;
}
function _v8ToIstanbul() {
  const data = _interopRequireDefault(require('v8-to-istanbul'));
  _v8ToIstanbul = function () {
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
var _BaseReporter = _interopRequireDefault(require('./BaseReporter'));
var _getWatermarks = _interopRequireDefault(require('./getWatermarks'));
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

const FAIL_COLOR = _chalk().default.bold.red;
const RUNNING_TEST_COLOR = _chalk().default.bold.dim;
class CoverageReporter extends _BaseReporter.default {
  _context;
  _coverageMap;
  _globalConfig;
  _sourceMapStore;
  _v8CoverageResults;
  static filename = __filename;
  constructor(globalConfig, context) {
    super();
    this._context = context;
    this._coverageMap = _istanbulLibCoverage().default.createCoverageMap({});
    this._globalConfig = globalConfig;
    this._sourceMapStore =
      _istanbulLibSourceMaps().default.createSourceMapStore();
    this._v8CoverageResults = [];
  }
  onTestResult(_test, testResult) {
    if (testResult.v8Coverage) {
      this._v8CoverageResults.push(testResult.v8Coverage);
      return;
    }
    if (testResult.coverage) {
      this._coverageMap.merge(testResult.coverage);
    }
  }
  async onRunComplete(testContexts, aggregatedResults) {
    await this._addUntestedFiles(testContexts);
    const {map, reportContext} = await this._getCoverageResult();
    try {
      const coverageReporters = this._globalConfig.coverageReporters || [];
      if (!this._globalConfig.useStderr && coverageReporters.length < 1) {
        coverageReporters.push('text-summary');
      }
      coverageReporters.forEach(reporter => {
        let additionalOptions = {};
        if (Array.isArray(reporter)) {
          [reporter, additionalOptions] = reporter;
        }
        _istanbulReports()
          .default.create(reporter, {
            maxCols: process.stdout.columns || Infinity,
            ...additionalOptions
          })
          .execute(reportContext);
      });
      aggregatedResults.coverageMap = map;
    } catch (e) {
      console.error(
        _chalk().default.red(`
        Failed to write coverage reports:
        ERROR: ${e.toString()}
        STACK: ${e.stack}
      `)
      );
    }
    this._checkThreshold(map);
  }
  async _addUntestedFiles(testContexts) {
    const files = [];
    testContexts.forEach(context => {
      const config = context.config;
      if (
        this._globalConfig.collectCoverageFrom &&
        this._globalConfig.collectCoverageFrom.length
      ) {
        context.hasteFS
          .matchFilesWithGlob(
            this._globalConfig.collectCoverageFrom,
            config.rootDir
          )
          .forEach(filePath =>
            files.push({
              config,
              path: filePath
            })
          );
      }
    });
    if (!files.length) {
      return;
    }
    if (_jestUtil().isInteractive) {
      process.stderr.write(
        RUNNING_TEST_COLOR('Running coverage on untested files...')
      );
    }
    let worker;
    if (this._globalConfig.maxWorkers <= 1) {
      worker = require('./CoverageWorker');
    } else {
      worker = new (_jestWorker().Worker)(require.resolve('./CoverageWorker'), {
        enableWorkerThreads: this._globalConfig.workerThreads,
        exposedMethods: ['worker'],
        forkOptions: {
          serialization: 'json'
        },
        maxRetries: 2,
        numWorkers: this._globalConfig.maxWorkers
      });
    }
    const instrumentation = files.map(async fileObj => {
      const filename = fileObj.path;
      const config = fileObj.config;
      const hasCoverageData = this._v8CoverageResults.some(v8Res =>
        v8Res.some(innerRes => innerRes.result.url === filename)
      );
      if (
        !hasCoverageData &&
        !this._coverageMap.data[filename] &&
        'worker' in worker
      ) {
        try {
          const result = await worker.worker({
            config,
            context: {
              changedFiles:
                this._context.changedFiles &&
                Array.from(this._context.changedFiles),
              sourcesRelatedToTestsInChangedFiles:
                this._context.sourcesRelatedToTestsInChangedFiles &&
                Array.from(this._context.sourcesRelatedToTestsInChangedFiles)
            },
            globalConfig: this._globalConfig,
            path: filename
          });
          if (result) {
            if (result.kind === 'V8Coverage') {
              this._v8CoverageResults.push([
                {
                  codeTransformResult: undefined,
                  result: result.result
                }
              ]);
            } else {
              this._coverageMap.addFileCoverage(result.coverage);
            }
          }
        } catch (error) {
          console.error(
            _chalk().default.red(
              [
                `Failed to collect coverage from ${filename}`,
                `ERROR: ${error.message}`,
                `STACK: ${error.stack}`
              ].join('\n')
            )
          );
        }
      }
    });
    try {
      await Promise.all(instrumentation);
    } catch {
      // Do nothing; errors were reported earlier to the console.
    }
    if (_jestUtil().isInteractive) {
      (0, _jestUtil().clearLine)(process.stderr);
    }
    if (worker && 'end' in worker && typeof worker.end === 'function') {
      await worker.end();
    }
  }
  _checkThreshold(map) {
    const {coverageThreshold} = this._globalConfig;
    if (coverageThreshold) {
      function check(name, thresholds, actuals) {
        return ['statements', 'branches', 'lines', 'functions'].reduce(
          (errors, key) => {
            const actual = actuals[key].pct;
            const actualUncovered = actuals[key].total - actuals[key].covered;
            const threshold = thresholds[key];
            if (threshold !== undefined) {
              if (threshold < 0) {
                if (threshold * -1 < actualUncovered) {
                  errors.push(
                    `Jest: Uncovered count for ${key} (${actualUncovered}) ` +
                      `exceeds ${name} threshold (${-1 * threshold})`
                  );
                }
              } else if (actual < threshold) {
                errors.push(
                  `Jest: "${name}" coverage threshold for ${key} (${threshold}%) not met: ${actual}%`
                );
              }
            }
            return errors;
          },
          []
        );
      }
      const THRESHOLD_GROUP_TYPES = {
        GLOB: 'glob',
        GLOBAL: 'global',
        PATH: 'path'
      };
      const coveredFiles = map.files();
      const thresholdGroups = Object.keys(coverageThreshold);
      const groupTypeByThresholdGroup = {};
      const filesByGlob = {};
      const coveredFilesSortedIntoThresholdGroup = coveredFiles.reduce(
        (files, file) => {
          const pathOrGlobMatches = thresholdGroups.reduce(
            (agg, thresholdGroup) => {
              // Preserve trailing slash, but not required if root dir
              // See https://github.com/jestjs/jest/issues/12703
              const resolvedThresholdGroup = path().resolve(thresholdGroup);
              const suffix =
                (thresholdGroup.endsWith(path().sep) ||
                  (process.platform === 'win32' &&
                    thresholdGroup.endsWith('/'))) &&
                !resolvedThresholdGroup.endsWith(path().sep)
                  ? path().sep
                  : '';
              const absoluteThresholdGroup = `${resolvedThresholdGroup}${suffix}`;

              // The threshold group might be a path:

              if (file.indexOf(absoluteThresholdGroup) === 0) {
                groupTypeByThresholdGroup[thresholdGroup] =
                  THRESHOLD_GROUP_TYPES.PATH;
                return agg.concat([[file, thresholdGroup]]);
              }

              // If the threshold group is not a path it might be a glob:

              // Note: glob.sync is slow. By memoizing the files matching each glob
              // (rather than recalculating it for each covered file) we save a tonne
              // of execution time.
              if (filesByGlob[absoluteThresholdGroup] === undefined) {
                filesByGlob[absoluteThresholdGroup] = _glob()
                  .default.sync(absoluteThresholdGroup)
                  .map(filePath => path().resolve(filePath));
              }
              if (filesByGlob[absoluteThresholdGroup].indexOf(file) > -1) {
                groupTypeByThresholdGroup[thresholdGroup] =
                  THRESHOLD_GROUP_TYPES.GLOB;
                return agg.concat([[file, thresholdGroup]]);
              }
              return agg;
            },
            []
          );
          if (pathOrGlobMatches.length > 0) {
            return files.concat(pathOrGlobMatches);
          }

          // Neither a glob or a path? Toss it in global if there's a global threshold:
          if (thresholdGroups.indexOf(THRESHOLD_GROUP_TYPES.GLOBAL) > -1) {
            groupTypeByThresholdGroup[THRESHOLD_GROUP_TYPES.GLOBAL] =
              THRESHOLD_GROUP_TYPES.GLOBAL;
            return files.concat([[file, THRESHOLD_GROUP_TYPES.GLOBAL]]);
          }

          // A covered file that doesn't have a threshold:
          return files.concat([[file, undefined]]);
        },
        []
      );
      const getFilesInThresholdGroup = thresholdGroup =>
        coveredFilesSortedIntoThresholdGroup
          .filter(fileAndGroup => fileAndGroup[1] === thresholdGroup)
          .map(fileAndGroup => fileAndGroup[0]);
      function combineCoverage(filePaths) {
        return filePaths
          .map(filePath => map.fileCoverageFor(filePath))
          .reduce((combinedCoverage, nextFileCoverage) => {
            if (combinedCoverage === undefined || combinedCoverage === null) {
              return nextFileCoverage.toSummary();
            }
            return combinedCoverage.merge(nextFileCoverage.toSummary());
          }, undefined);
      }
      let errors = [];
      thresholdGroups.forEach(thresholdGroup => {
        switch (groupTypeByThresholdGroup[thresholdGroup]) {
          case THRESHOLD_GROUP_TYPES.GLOBAL: {
            const coverage = combineCoverage(
              getFilesInThresholdGroup(THRESHOLD_GROUP_TYPES.GLOBAL)
            );
            if (coverage) {
              errors = errors.concat(
                check(
                  thresholdGroup,
                  coverageThreshold[thresholdGroup],
                  coverage
                )
              );
            }
            break;
          }
          case THRESHOLD_GROUP_TYPES.PATH: {
            const coverage = combineCoverage(
              getFilesInThresholdGroup(thresholdGroup)
            );
            if (coverage) {
              errors = errors.concat(
                check(
                  thresholdGroup,
                  coverageThreshold[thresholdGroup],
                  coverage
                )
              );
            }
            break;
          }
          case THRESHOLD_GROUP_TYPES.GLOB:
            getFilesInThresholdGroup(thresholdGroup).forEach(
              fileMatchingGlob => {
                errors = errors.concat(
                  check(
                    fileMatchingGlob,
                    coverageThreshold[thresholdGroup],
                    map.fileCoverageFor(fileMatchingGlob).toSummary()
                  )
                );
              }
            );
            break;
          default:
            // If the file specified by path is not found, error is returned.
            if (thresholdGroup !== THRESHOLD_GROUP_TYPES.GLOBAL) {
              errors = errors.concat(
                `Jest: Coverage data for ${thresholdGroup} was not found.`
              );
            }
          // Sometimes all files in the coverage data are matched by
          // PATH and GLOB threshold groups in which case, don't error when
          // the global threshold group doesn't match any files.
        }
      });

      errors = errors.filter(
        err => err !== undefined && err !== null && err.length > 0
      );
      if (errors.length > 0) {
        this.log(`${FAIL_COLOR(errors.join('\n'))}`);
        this._setError(new Error(errors.join('\n')));
      }
    }
  }
  async _getCoverageResult() {
    if (this._globalConfig.coverageProvider === 'v8') {
      const mergedCoverages = (0, _v8Coverage().mergeProcessCovs)(
        this._v8CoverageResults.map(cov => ({
          result: cov.map(r => r.result)
        }))
      );
      const fileTransforms = new Map();
      this._v8CoverageResults.forEach(res =>
        res.forEach(r => {
          if (r.codeTransformResult && !fileTransforms.has(r.result.url)) {
            fileTransforms.set(r.result.url, r.codeTransformResult);
          }
        })
      );
      const transformedCoverage = await Promise.all(
        mergedCoverages.result.map(async res => {
          const fileTransform = fileTransforms.get(res.url);
          let sourcemapContent = undefined;
          if (
            fileTransform?.sourceMapPath &&
            fs().existsSync(fileTransform.sourceMapPath)
          ) {
            sourcemapContent = JSON.parse(
              fs().readFileSync(fileTransform.sourceMapPath, 'utf8')
            );
          }
          const converter = (0, _v8ToIstanbul().default)(
            res.url,
            fileTransform?.wrapperLength ?? 0,
            fileTransform && sourcemapContent
              ? {
                  originalSource: fileTransform.originalCode,
                  source: fileTransform.code,
                  sourceMap: {
                    sourcemap: {
                      file: res.url,
                      ...sourcemapContent
                    }
                  }
                }
              : {
                  source: fs().readFileSync(res.url, 'utf8')
                }
          );
          await converter.load();
          converter.applyCoverage(res.functions);
          const istanbulData = converter.toIstanbul();
          return istanbulData;
        })
      );
      const map = _istanbulLibCoverage().default.createCoverageMap({});
      transformedCoverage.forEach(res => map.merge(res));
      const reportContext = _istanbulLibReport().default.createContext({
        coverageMap: map,
        dir: this._globalConfig.coverageDirectory,
        watermarks: (0, _getWatermarks.default)(this._globalConfig)
      });
      return {
        map,
        reportContext
      };
    }
    const map = await this._sourceMapStore.transformCoverage(this._coverageMap);
    const reportContext = _istanbulLibReport().default.createContext({
      coverageMap: map,
      dir: this._globalConfig.coverageDirectory,
      sourceFinder: this._sourceMapStore.sourceFinder,
      watermarks: (0, _getWatermarks.default)(this._globalConfig)
    });
    return {
      map,
      reportContext
    };
  }
}
exports.default = CoverageReporter;
