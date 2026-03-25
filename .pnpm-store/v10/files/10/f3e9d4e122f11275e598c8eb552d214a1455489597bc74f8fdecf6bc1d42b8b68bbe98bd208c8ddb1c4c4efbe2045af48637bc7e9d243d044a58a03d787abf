'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.buildArgv = buildArgv;
exports.run = run;
function path() {
  const data = _interopRequireWildcard(require('path'));
  path = function () {
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
function _yargs() {
  const data = _interopRequireDefault(require('yargs'));
  _yargs = function () {
    return data;
  };
  return data;
}
function _core() {
  const data = require('@jest/core');
  _core = function () {
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
var args = _interopRequireWildcard(require('./args'));
var _init = _interopRequireDefault(require('./init'));
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

async function run(maybeArgv, project) {
  try {
    const argv = await buildArgv(maybeArgv);
    if (argv.init) {
      await (0, _init.default)();
      return;
    }
    const projects = getProjectListFromCLIArgs(argv, project);
    const {results, globalConfig} = await (0, _core().runCLI)(argv, projects);
    readResultsAndExit(results, globalConfig);
  } catch (error) {
    (0, _jestUtil().clearLine)(process.stderr);
    (0, _jestUtil().clearLine)(process.stdout);
    if (error?.stack) {
      console.error(_chalk().default.red(error.stack));
    } else {
      console.error(_chalk().default.red(error));
    }
    (0, _exit().default)(1);
    throw error;
  }
}
async function buildArgv(maybeArgv) {
  const version =
    (0, _core().getVersion)() +
    (__dirname.includes(`packages${path().sep}jest-cli`) ? '-dev' : '');
  const rawArgv = maybeArgv || process.argv.slice(2);
  const argv = await (0, _yargs().default)(rawArgv)
    .usage(args.usage)
    .version(version)
    .alias('help', 'h')
    .options(args.options)
    .epilogue(args.docs)
    .check(args.check).argv;
  (0, _jestValidate().validateCLIOptions)(
    argv,
    {
      ...args.options,
      deprecationEntries: _jestConfig().deprecationEntries
    },
    // strip leading dashes
    Array.isArray(rawArgv)
      ? rawArgv.map(rawArgv => rawArgv.replace(/^--?/, ''))
      : Object.keys(rawArgv)
  );

  // strip dashed args
  return Object.keys(argv).reduce(
    (result, key) => {
      if (!key.includes('-')) {
        result[key] = argv[key];
      }
      return result;
    },
    {
      $0: argv.$0,
      _: argv._
    }
  );
}
const getProjectListFromCLIArgs = (argv, project) => {
  const projects = argv.projects ? argv.projects : [];
  if (project) {
    projects.push(project);
  }
  if (!projects.length && process.platform === 'win32') {
    try {
      projects.push((0, _jestUtil().tryRealpath)(process.cwd()));
    } catch {
      // do nothing, just catch error
      // process.binding('fs').realpath can throw, e.g. on mapped drives
    }
  }
  if (!projects.length) {
    projects.push(process.cwd());
  }
  return projects;
};
const readResultsAndExit = (result, globalConfig) => {
  const code = !result || result.success ? 0 : globalConfig.testFailureExitCode;

  // Only exit if needed
  process.on('exit', () => {
    if (typeof code === 'number' && code !== 0) {
      process.exitCode = code;
    }
  });
  if (globalConfig.forceExit) {
    if (!globalConfig.detectOpenHandles) {
      console.warn(
        `${_chalk().default.bold(
          'Force exiting Jest: '
        )}Have you considered using \`--detectOpenHandles\` to detect ` +
          'async operations that kept running after all tests finished?'
      );
    }
    (0, _exit().default)(code);
  } else if (
    !globalConfig.detectOpenHandles &&
    globalConfig.openHandlesTimeout !== 0
  ) {
    const timeout = globalConfig.openHandlesTimeout;
    setTimeout(() => {
      console.warn(
        _chalk().default.yellow.bold(
          `Jest did not exit ${
            timeout === 1000 ? 'one second' : `${timeout / 1000} seconds`
          } after the test run has completed.\n\n'`
        ) +
          _chalk().default.yellow(
            'This usually means that there are asynchronous operations that ' +
              "weren't stopped in your tests. Consider running Jest with " +
              '`--detectOpenHandles` to troubleshoot this issue.'
          )
      );
    }, timeout).unref();
  }
};
