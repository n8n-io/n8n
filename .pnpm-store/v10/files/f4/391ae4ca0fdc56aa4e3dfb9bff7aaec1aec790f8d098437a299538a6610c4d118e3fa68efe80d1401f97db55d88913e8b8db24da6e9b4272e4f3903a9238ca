'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = watch;
function path() {
  const data = _interopRequireWildcard(require('path'));
  path = function () {
    return data;
  };
  return data;
}
function _ansiEscapes() {
  const data = _interopRequireDefault(require('ansi-escapes'));
  _ansiEscapes = function () {
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
function _slash() {
  const data = _interopRequireDefault(require('slash'));
  _slash = function () {
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
function _jestUtil() {
  const data = require('jest-util');
  _jestUtil = function () {
    return data;
  };
  return data;
}
function _jestValidate() {
  const data = require('jest-validate');
  _jestValidate = function () {
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
var _FailedTestsCache = _interopRequireDefault(require('./FailedTestsCache'));
var _SearchSource = _interopRequireDefault(require('./SearchSource'));
var _getChangedFilesPromise = _interopRequireDefault(
  require('./getChangedFilesPromise')
);
var _activeFiltersMessage = _interopRequireDefault(
  require('./lib/activeFiltersMessage')
);
var _createContext = _interopRequireDefault(require('./lib/createContext'));
var _isValidPath = _interopRequireDefault(require('./lib/isValidPath'));
var _updateGlobalConfig = _interopRequireDefault(
  require('./lib/updateGlobalConfig')
);
var _watchPluginsHelpers = require('./lib/watchPluginsHelpers');
var _FailedTestsInteractive = _interopRequireDefault(
  require('./plugins/FailedTestsInteractive')
);
var _Quit = _interopRequireDefault(require('./plugins/Quit'));
var _TestNamePattern = _interopRequireDefault(
  require('./plugins/TestNamePattern')
);
var _TestPathPattern = _interopRequireDefault(
  require('./plugins/TestPathPattern')
);
var _UpdateSnapshots = _interopRequireDefault(
  require('./plugins/UpdateSnapshots')
);
var _UpdateSnapshotsInteractive = _interopRequireDefault(
  require('./plugins/UpdateSnapshotsInteractive')
);
var _runJest = _interopRequireDefault(require('./runJest'));
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

const {print: preRunMessagePrint} = _jestUtil().preRunMessage;
let hasExitListener = false;
const INTERNAL_PLUGINS = [
  _FailedTestsInteractive.default,
  _TestPathPattern.default,
  _TestNamePattern.default,
  _UpdateSnapshots.default,
  _UpdateSnapshotsInteractive.default,
  _Quit.default
];
const RESERVED_KEY_PLUGINS = new Map([
  [
    _UpdateSnapshots.default,
    {
      forbiddenOverwriteMessage: 'updating snapshots',
      key: 'u'
    }
  ],
  [
    _UpdateSnapshotsInteractive.default,
    {
      forbiddenOverwriteMessage: 'updating snapshots interactively',
      key: 'i'
    }
  ],
  [
    _Quit.default,
    {
      forbiddenOverwriteMessage: 'quitting watch mode'
    }
  ]
]);
async function watch(
  initialGlobalConfig,
  contexts,
  outputStream,
  hasteMapInstances,
  stdin = process.stdin,
  hooks = new (_jestWatcher().JestHook)(),
  filter
) {
  // `globalConfig` will be constantly updated and reassigned as a result of
  // watch mode interactions.
  let globalConfig = initialGlobalConfig;
  let activePlugin;
  globalConfig = (0, _updateGlobalConfig.default)(globalConfig, {
    mode: globalConfig.watch ? 'watch' : 'watchAll',
    passWithNoTests: true
  });
  const updateConfigAndRun = ({
    bail,
    changedSince,
    collectCoverage,
    collectCoverageFrom,
    coverageDirectory,
    coverageReporters,
    findRelatedTests,
    mode,
    nonFlagArgs,
    notify,
    notifyMode,
    onlyFailures,
    reporters,
    testNamePattern,
    testPathPattern,
    updateSnapshot,
    verbose
  } = {}) => {
    const previousUpdateSnapshot = globalConfig.updateSnapshot;
    globalConfig = (0, _updateGlobalConfig.default)(globalConfig, {
      bail,
      changedSince,
      collectCoverage,
      collectCoverageFrom,
      coverageDirectory,
      coverageReporters,
      findRelatedTests,
      mode,
      nonFlagArgs,
      notify,
      notifyMode,
      onlyFailures,
      reporters,
      testNamePattern,
      testPathPattern,
      updateSnapshot,
      verbose
    });
    startRun(globalConfig);
    globalConfig = (0, _updateGlobalConfig.default)(globalConfig, {
      // updateSnapshot is not sticky after a run.
      updateSnapshot:
        previousUpdateSnapshot === 'all' ? 'none' : previousUpdateSnapshot
    });
  };
  const watchPlugins = INTERNAL_PLUGINS.map(
    InternalPlugin =>
      new InternalPlugin({
        stdin,
        stdout: outputStream
      })
  );
  watchPlugins.forEach(plugin => {
    const hookSubscriber = hooks.getSubscriber();
    if (plugin.apply) {
      plugin.apply(hookSubscriber);
    }
  });
  if (globalConfig.watchPlugins != null) {
    const watchPluginKeys = new Map();
    for (const plugin of watchPlugins) {
      const reservedInfo = RESERVED_KEY_PLUGINS.get(plugin.constructor) || {};
      const key = reservedInfo.key || getPluginKey(plugin, globalConfig);
      if (!key) {
        continue;
      }
      const {forbiddenOverwriteMessage} = reservedInfo;
      watchPluginKeys.set(key, {
        forbiddenOverwriteMessage,
        overwritable: forbiddenOverwriteMessage == null,
        plugin
      });
    }
    for (const pluginWithConfig of globalConfig.watchPlugins) {
      let plugin;
      try {
        const ThirdPartyPlugin = await (0, _jestUtil().requireOrImportModule)(
          pluginWithConfig.path
        );
        plugin = new ThirdPartyPlugin({
          config: pluginWithConfig.config,
          stdin,
          stdout: outputStream
        });
      } catch (error) {
        const errorWithContext = new Error(
          `Failed to initialize watch plugin "${_chalk().default.bold(
            (0, _slash().default)(
              path().relative(process.cwd(), pluginWithConfig.path)
            )
          )}":\n\n${(0, _jestMessageUtil().formatExecError)(
            error,
            contexts[0].config,
            {
              noStackTrace: false
            }
          )}`
        );
        delete errorWithContext.stack;
        return Promise.reject(errorWithContext);
      }
      checkForConflicts(watchPluginKeys, plugin, globalConfig);
      const hookSubscriber = hooks.getSubscriber();
      if (plugin.apply) {
        plugin.apply(hookSubscriber);
      }
      watchPlugins.push(plugin);
    }
  }
  const failedTestsCache = new _FailedTestsCache.default();
  let searchSources = contexts.map(context => ({
    context,
    searchSource: new _SearchSource.default(context)
  }));
  let isRunning = false;
  let testWatcher;
  let shouldDisplayWatchUsage = true;
  let isWatchUsageDisplayed = false;
  const emitFileChange = () => {
    if (hooks.isUsed('onFileChange')) {
      const projects = searchSources.map(({context, searchSource}) => ({
        config: context.config,
        testPaths: searchSource.findMatchingTests('').tests.map(t => t.path)
      }));
      hooks.getEmitter().onFileChange({
        projects
      });
    }
  };
  emitFileChange();
  hasteMapInstances.forEach((hasteMapInstance, index) => {
    hasteMapInstance.on('change', ({eventsQueue, hasteFS, moduleMap}) => {
      const validPaths = eventsQueue.filter(({filePath}) =>
        (0, _isValidPath.default)(globalConfig, filePath)
      );
      if (validPaths.length) {
        const context = (contexts[index] = (0, _createContext.default)(
          contexts[index].config,
          {
            hasteFS,
            moduleMap
          }
        ));
        activePlugin = null;
        searchSources = searchSources.slice();
        searchSources[index] = {
          context,
          searchSource: new _SearchSource.default(context)
        };
        emitFileChange();
        startRun(globalConfig);
      }
    });
  });
  if (!hasExitListener) {
    hasExitListener = true;
    process.on('exit', () => {
      if (activePlugin) {
        outputStream.write(_ansiEscapes().default.cursorDown());
        outputStream.write(_ansiEscapes().default.eraseDown);
      }
    });
  }
  const startRun = globalConfig => {
    if (isRunning) {
      return Promise.resolve(null);
    }
    testWatcher = new (_jestWatcher().TestWatcher)({
      isWatchMode: true
    });
    _jestUtil().isInteractive &&
      outputStream.write(_jestUtil().specialChars.CLEAR);
    preRunMessagePrint(outputStream);
    isRunning = true;
    const configs = contexts.map(context => context.config);
    const changedFilesPromise = (0, _getChangedFilesPromise.default)(
      globalConfig,
      configs
    );
    return (0, _runJest.default)({
      changedFilesPromise,
      contexts,
      failedTestsCache,
      filter,
      globalConfig,
      jestHooks: hooks.getEmitter(),
      onComplete: results => {
        isRunning = false;
        hooks.getEmitter().onTestRunComplete(results);

        // Create a new testWatcher instance so that re-runs won't be blocked.
        // The old instance that was passed to Jest will still be interrupted
        // and prevent test runs from the previous run.
        testWatcher = new (_jestWatcher().TestWatcher)({
          isWatchMode: true
        });

        // Do not show any Watch Usage related stuff when running in a
        // non-interactive environment
        if (_jestUtil().isInteractive) {
          if (shouldDisplayWatchUsage) {
            outputStream.write(usage(globalConfig, watchPlugins));
            shouldDisplayWatchUsage = false; // hide Watch Usage after first run
            isWatchUsageDisplayed = true;
          } else {
            outputStream.write(showToggleUsagePrompt());
            shouldDisplayWatchUsage = false;
            isWatchUsageDisplayed = false;
          }
        } else {
          outputStream.write('\n');
        }
        failedTestsCache.setTestResults(results.testResults);
      },
      outputStream,
      startRun,
      testWatcher
    }).catch(error =>
      // Errors thrown inside `runJest`, e.g. by resolvers, are caught here for
      // continuous watch mode execution. We need to reprint them to the
      // terminal and give just a little bit of extra space so they fit below
      // `preRunMessagePrint` message nicely.
      console.error(
        `\n\n${(0, _jestMessageUtil().formatExecError)(
          error,
          contexts[0].config,
          {
            noStackTrace: false
          }
        )}`
      )
    );
  };
  const onKeypress = key => {
    if (
      key === _jestWatcher().KEYS.CONTROL_C ||
      key === _jestWatcher().KEYS.CONTROL_D
    ) {
      if (typeof stdin.setRawMode === 'function') {
        stdin.setRawMode(false);
      }
      outputStream.write('\n');
      (0, _exit().default)(0);
      return;
    }
    if (activePlugin != null && activePlugin.onKey) {
      // if a plugin is activate, Jest should let it handle keystrokes, so ignore
      // them here
      activePlugin.onKey(key);
      return;
    }

    // Abort test run
    const pluginKeys = (0, _watchPluginsHelpers.getSortedUsageRows)(
      watchPlugins,
      globalConfig
    ).map(usage => Number(usage.key).toString(16));
    if (
      isRunning &&
      testWatcher &&
      ['q', _jestWatcher().KEYS.ENTER, 'a', 'o', 'f']
        .concat(pluginKeys)
        .includes(key)
    ) {
      testWatcher.setState({
        interrupted: true
      });
      return;
    }
    const matchingWatchPlugin = (0,
    _watchPluginsHelpers.filterInteractivePlugins)(
      watchPlugins,
      globalConfig
    ).find(plugin => getPluginKey(plugin, globalConfig) === key);
    if (matchingWatchPlugin != null) {
      if (isRunning) {
        testWatcher.setState({
          interrupted: true
        });
        return;
      }
      // "activate" the plugin, which has jest ignore keystrokes so the plugin
      // can handle them
      activePlugin = matchingWatchPlugin;
      if (activePlugin.run) {
        activePlugin.run(globalConfig, updateConfigAndRun).then(
          shouldRerun => {
            activePlugin = null;
            if (shouldRerun) {
              updateConfigAndRun();
            }
          },
          () => {
            activePlugin = null;
            onCancelPatternPrompt();
          }
        );
      } else {
        activePlugin = null;
      }
    }
    switch (key) {
      case _jestWatcher().KEYS.ENTER:
        startRun(globalConfig);
        break;
      case 'a':
        globalConfig = (0, _updateGlobalConfig.default)(globalConfig, {
          mode: 'watchAll',
          testNamePattern: '',
          testPathPattern: ''
        });
        startRun(globalConfig);
        break;
      case 'c':
        updateConfigAndRun({
          mode: 'watch',
          testNamePattern: '',
          testPathPattern: ''
        });
        break;
      case 'f':
        globalConfig = (0, _updateGlobalConfig.default)(globalConfig, {
          onlyFailures: !globalConfig.onlyFailures
        });
        startRun(globalConfig);
        break;
      case 'o':
        globalConfig = (0, _updateGlobalConfig.default)(globalConfig, {
          mode: 'watch',
          testNamePattern: '',
          testPathPattern: ''
        });
        startRun(globalConfig);
        break;
      case '?':
        break;
      case 'w':
        if (!shouldDisplayWatchUsage && !isWatchUsageDisplayed) {
          outputStream.write(_ansiEscapes().default.cursorUp());
          outputStream.write(_ansiEscapes().default.eraseDown);
          outputStream.write(usage(globalConfig, watchPlugins));
          isWatchUsageDisplayed = true;
          shouldDisplayWatchUsage = false;
        }
        break;
    }
  };
  const onCancelPatternPrompt = () => {
    outputStream.write(_ansiEscapes().default.cursorHide);
    outputStream.write(_jestUtil().specialChars.CLEAR);
    outputStream.write(usage(globalConfig, watchPlugins));
    outputStream.write(_ansiEscapes().default.cursorShow);
  };
  if (typeof stdin.setRawMode === 'function') {
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    stdin.on('data', onKeypress);
  }
  startRun(globalConfig);
  return Promise.resolve();
}
const checkForConflicts = (watchPluginKeys, plugin, globalConfig) => {
  const key = getPluginKey(plugin, globalConfig);
  if (!key) {
    return;
  }
  const conflictor = watchPluginKeys.get(key);
  if (!conflictor || conflictor.overwritable) {
    watchPluginKeys.set(key, {
      overwritable: false,
      plugin
    });
    return;
  }
  let error;
  if (conflictor.forbiddenOverwriteMessage) {
    error = `
  Watch plugin ${_chalk().default.bold.red(
    getPluginIdentifier(plugin)
  )} attempted to register key ${_chalk().default.bold.red(`<${key}>`)},
  that is reserved internally for ${_chalk().default.bold.red(
    conflictor.forbiddenOverwriteMessage
  )}.
  Please change the configuration key for this plugin.`.trim();
  } else {
    const plugins = [conflictor.plugin, plugin]
      .map(p => _chalk().default.bold.red(getPluginIdentifier(p)))
      .join(' and ');
    error = `
  Watch plugins ${plugins} both attempted to register key ${_chalk().default.bold.red(
      `<${key}>`
    )}.
  Please change the key configuration for one of the conflicting plugins to avoid overlap.`.trim();
  }
  throw new (_jestValidate().ValidationError)(
    'Watch plugin configuration error',
    error
  );
};
const getPluginIdentifier = plugin =>
  // This breaks as `displayName` is not defined as a static, but since
  // WatchPlugin is an interface, and it is my understanding interface
  // static fields are not definable anymore, no idea how to circumvent
  // this :-(
  // @ts-expect-error: leave `displayName` be.
  plugin.constructor.displayName || plugin.constructor.name;
const getPluginKey = (plugin, globalConfig) => {
  if (typeof plugin.getUsageInfo === 'function') {
    return (
      plugin.getUsageInfo(globalConfig) || {
        key: null
      }
    ).key;
  }
  return null;
};
const usage = (globalConfig, watchPlugins, delimiter = '\n') => {
  const messages = [
    (0, _activeFiltersMessage.default)(globalConfig),
    globalConfig.testPathPattern || globalConfig.testNamePattern
      ? `${_chalk().default.dim(' \u203A Press ')}c${_chalk().default.dim(
          ' to clear filters.'
        )}`
      : null,
    `\n${_chalk().default.bold('Watch Usage')}`,
    globalConfig.watch
      ? `${_chalk().default.dim(' \u203A Press ')}a${_chalk().default.dim(
          ' to run all tests.'
        )}`
      : null,
    globalConfig.onlyFailures
      ? `${_chalk().default.dim(' \u203A Press ')}f${_chalk().default.dim(
          ' to quit "only failed tests" mode.'
        )}`
      : `${_chalk().default.dim(' \u203A Press ')}f${_chalk().default.dim(
          ' to run only failed tests.'
        )}`,
    (globalConfig.watchAll ||
      globalConfig.testPathPattern ||
      globalConfig.testNamePattern) &&
    !globalConfig.noSCM
      ? `${_chalk().default.dim(' \u203A Press ')}o${_chalk().default.dim(
          ' to only run tests related to changed files.'
        )}`
      : null,
    ...(0, _watchPluginsHelpers.getSortedUsageRows)(
      watchPlugins,
      globalConfig
    ).map(
      plugin =>
        `${_chalk().default.dim(' \u203A Press')} ${
          plugin.key
        } ${_chalk().default.dim(`to ${plugin.prompt}.`)}`
    ),
    `${_chalk().default.dim(' \u203A Press ')}Enter${_chalk().default.dim(
      ' to trigger a test run.'
    )}`
  ];
  return `${messages.filter(message => !!message).join(delimiter)}\n`;
};
const showToggleUsagePrompt = () =>
  '\n' +
  `${_chalk().default.bold('Watch Usage: ')}${_chalk().default.dim(
    'Press '
  )}w${_chalk().default.dim(' to show more.')}`;
