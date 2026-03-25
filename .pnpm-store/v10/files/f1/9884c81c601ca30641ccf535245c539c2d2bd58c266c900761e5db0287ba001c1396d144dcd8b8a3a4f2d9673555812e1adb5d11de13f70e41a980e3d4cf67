'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.runCLI = runCLI;
function _perf_hooks() {
  const data = require('perf_hooks');
  _perf_hooks = function () {
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
function _exit() {
  const data = _interopRequireDefault(require('exit'));
  _exit = function () {
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
function _console() {
  const data = require('@jest/console');
  _console = function () {
    return data;
  };
  return data;
}
function _jestConfig() {
  const data = require('jest-config');
  _jestConfig = function () {
    return data;
  };
  return data;
}
function _jestRuntime() {
  const data = _interopRequireDefault(require('jest-runtime'));
  _jestRuntime = function () {
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
function _jestWatcher() {
  const data = require('jest-watcher');
  _jestWatcher = function () {
    return data;
  };
  return data;
}
var _collectHandles = require('../collectHandles');
var _getChangedFilesPromise = _interopRequireDefault(
  require('../getChangedFilesPromise')
);
var _getConfigsOfProjectsToRun = _interopRequireDefault(
  require('../getConfigsOfProjectsToRun')
);
var _getProjectNamesMissingWarning = _interopRequireDefault(
  require('../getProjectNamesMissingWarning')
);
var _getSelectProjectsMessage = _interopRequireDefault(
  require('../getSelectProjectsMessage')
);
var _createContext = _interopRequireDefault(require('../lib/createContext'));
var _handleDeprecationWarnings = _interopRequireDefault(
  require('../lib/handleDeprecationWarnings')
);
var _logDebugMessages = _interopRequireDefault(
  require('../lib/logDebugMessages')
);
var _runJest = _interopRequireDefault(require('../runJest'));
var _watch = _interopRequireDefault(require('../watch'));
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

const {print: preRunMessagePrint} = _jestUtil().preRunMessage;
async function runCLI(argv, projects) {
  _perf_hooks().performance.mark('jest/runCLI:start');
  let results;

  // If we output a JSON object, we can't write anything to stdout, since
  // it'll break the JSON structure and it won't be valid.
  const outputStream =
    argv.json || argv.useStderr ? process.stderr : process.stdout;
  const {globalConfig, configs, hasDeprecationWarnings} = await (0,
  _jestConfig().readConfigs)(argv, projects);
  if (argv.debug) {
    (0, _logDebugMessages.default)(globalConfig, configs, outputStream);
  }
  if (argv.showConfig) {
    (0, _logDebugMessages.default)(globalConfig, configs, process.stdout);
    (0, _exit().default)(0);
  }
  if (argv.clearCache) {
    // stick in a Set to dedupe the deletions
    new Set(configs.map(config => config.cacheDirectory)).forEach(
      cacheDirectory => {
        fs().rmSync(cacheDirectory, {
          force: true,
          recursive: true
        });
        process.stdout.write(`Cleared ${cacheDirectory}\n`);
      }
    );
    (0, _exit().default)(0);
  }
  const configsOfProjectsToRun = (0, _getConfigsOfProjectsToRun.default)(
    configs,
    {
      ignoreProjects: argv.ignoreProjects,
      selectProjects: argv.selectProjects
    }
  );
  if (argv.selectProjects || argv.ignoreProjects) {
    const namesMissingWarning = (0, _getProjectNamesMissingWarning.default)(
      configs,
      {
        ignoreProjects: argv.ignoreProjects,
        selectProjects: argv.selectProjects
      }
    );
    if (namesMissingWarning) {
      outputStream.write(namesMissingWarning);
    }
    outputStream.write(
      (0, _getSelectProjectsMessage.default)(configsOfProjectsToRun, {
        ignoreProjects: argv.ignoreProjects,
        selectProjects: argv.selectProjects
      })
    );
  }
  await _run10000(
    globalConfig,
    configsOfProjectsToRun,
    hasDeprecationWarnings,
    outputStream,
    r => {
      results = r;
    }
  );
  if (argv.watch || argv.watchAll) {
    // If in watch mode, return the promise that will never resolve.
    // If the watch mode is interrupted, watch should handle the process
    // shutdown.
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    return new Promise(() => {});
  }
  if (!results) {
    throw new Error(
      'AggregatedResult must be present after test run is complete'
    );
  }
  const {openHandles} = results;
  if (openHandles && openHandles.length) {
    const formatted = (0, _collectHandles.formatHandleErrors)(
      openHandles,
      configs[0]
    );
    const openHandlesString = (0, _jestUtil().pluralize)(
      'open handle',
      formatted.length,
      's'
    );
    const message =
      _chalk().default.red(
        `\nJest has detected the following ${openHandlesString} potentially keeping Jest from exiting:\n\n`
      ) + formatted.join('\n\n');
    console.error(message);
  }
  _perf_hooks().performance.mark('jest/runCLI:end');
  return {
    globalConfig,
    results
  };
}
const buildContextsAndHasteMaps = async (
  configs,
  globalConfig,
  outputStream
) => {
  const hasteMapInstances = Array(configs.length);
  const contexts = await Promise.all(
    configs.map(async (config, index) => {
      (0, _jestUtil().createDirectory)(config.cacheDirectory);
      const hasteMapInstance = await _jestRuntime().default.createHasteMap(
        config,
        {
          console: new (_console().CustomConsole)(outputStream, outputStream),
          maxWorkers: Math.max(
            1,
            Math.floor(globalConfig.maxWorkers / configs.length)
          ),
          resetCache: !config.cache,
          watch: globalConfig.watch || globalConfig.watchAll,
          watchman: globalConfig.watchman,
          workerThreads: globalConfig.workerThreads
        }
      );
      hasteMapInstances[index] = hasteMapInstance;
      return (0, _createContext.default)(
        config,
        await hasteMapInstance.build()
      );
    })
  );
  return {
    contexts,
    hasteMapInstances
  };
};
const _run10000 = async (
  globalConfig,
  configs,
  hasDeprecationWarnings,
  outputStream,
  onComplete
) => {
  // Queries to hg/git can take a while, so we need to start the process
  // as soon as possible, so by the time we need the result it's already there.
  const changedFilesPromise = (0, _getChangedFilesPromise.default)(
    globalConfig,
    configs
  );
  if (changedFilesPromise) {
    _perf_hooks().performance.mark('jest/getChangedFiles:start');
    changedFilesPromise.finally(() => {
      _perf_hooks().performance.mark('jest/getChangedFiles:end');
    });
  }

  // Filter may need to do an HTTP call or something similar to setup.
  // We will wait on an async response from this before using the filter.
  let filter;
  if (globalConfig.filter && !globalConfig.skipFilter) {
    const rawFilter = require(globalConfig.filter);
    let filterSetupPromise;
    if (rawFilter.setup) {
      // Wrap filter setup Promise to avoid "uncaught Promise" error.
      // If an error is returned, we surface it in the return value.
      filterSetupPromise = (async () => {
        try {
          await rawFilter.setup();
        } catch (err) {
          return err;
        }
        return undefined;
      })();
    }
    filter = async testPaths => {
      if (filterSetupPromise) {
        // Expect an undefined return value unless there was an error.
        const err = await filterSetupPromise;
        if (err) {
          throw err;
        }
      }
      return rawFilter(testPaths);
    };
  }
  _perf_hooks().performance.mark('jest/buildContextsAndHasteMaps:start');
  const {contexts, hasteMapInstances} = await buildContextsAndHasteMaps(
    configs,
    globalConfig,
    outputStream
  );
  _perf_hooks().performance.mark('jest/buildContextsAndHasteMaps:end');
  globalConfig.watch || globalConfig.watchAll
    ? await runWatch(
        contexts,
        configs,
        hasDeprecationWarnings,
        globalConfig,
        outputStream,
        hasteMapInstances,
        filter
      )
    : await runWithoutWatch(
        globalConfig,
        contexts,
        outputStream,
        onComplete,
        changedFilesPromise,
        filter
      );
};
const runWatch = async (
  contexts,
  _configs,
  hasDeprecationWarnings,
  globalConfig,
  outputStream,
  hasteMapInstances,
  filter
) => {
  if (hasDeprecationWarnings) {
    try {
      await (0, _handleDeprecationWarnings.default)(
        outputStream,
        process.stdin
      );
      return await (0, _watch.default)(
        globalConfig,
        contexts,
        outputStream,
        hasteMapInstances,
        undefined,
        undefined,
        filter
      );
    } catch {
      (0, _exit().default)(0);
    }
  }
  return (0, _watch.default)(
    globalConfig,
    contexts,
    outputStream,
    hasteMapInstances,
    undefined,
    undefined,
    filter
  );
};
const runWithoutWatch = async (
  globalConfig,
  contexts,
  outputStream,
  onComplete,
  changedFilesPromise,
  filter
) => {
  const startRun = async () => {
    if (!globalConfig.listTests) {
      preRunMessagePrint(outputStream);
    }
    return (0, _runJest.default)({
      changedFilesPromise,
      contexts,
      failedTestsCache: undefined,
      filter,
      globalConfig,
      onComplete,
      outputStream,
      startRun,
      testWatcher: new (_jestWatcher().TestWatcher)({
        isWatchMode: false
      })
    });
  };
  return startRun();
};
