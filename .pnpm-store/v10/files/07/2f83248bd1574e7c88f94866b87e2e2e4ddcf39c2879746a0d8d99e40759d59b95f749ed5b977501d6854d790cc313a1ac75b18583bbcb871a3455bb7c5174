'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = getNoTestFoundVerbose;
function _chalk() {
  const data = _interopRequireDefault(require('chalk'));
  _chalk = function () {
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
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {default: obj};
}
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

function getNoTestFoundVerbose(testRunData, globalConfig, willExitWith0) {
  const individualResults = testRunData.map(testRun => {
    const stats = testRun.matches.stats || {};
    const config = testRun.context.config;
    const statsMessage = Object.keys(stats)
      .map(key => {
        if (key === 'roots' && config.roots.length === 1) {
          return null;
        }
        const value = config[key];
        if (value) {
          const valueAsString = Array.isArray(value)
            ? value.join(', ')
            : String(value);
          const matches = (0, _jestUtil().pluralize)(
            'match',
            stats[key] || 0,
            'es'
          );
          return `  ${key}: ${_chalk().default.yellow(
            valueAsString
          )} - ${matches}`;
        }
        return null;
      })
      .filter(line => line)
      .join('\n');
    return testRun.matches.total
      ? `In ${_chalk().default.bold(config.rootDir)}\n` +
          `  ${(0, _jestUtil().pluralize)(
            'file',
            testRun.matches.total || 0,
            's'
          )} checked.\n${statsMessage}`
      : `No files found in ${config.rootDir}.\n` +
          "Make sure Jest's configuration does not exclude this directory." +
          '\nTo set up Jest, make sure a package.json file exists.\n' +
          'Jest Documentation: ' +
          'https://jestjs.io/docs/configuration';
  });
  let dataMessage;
  if (globalConfig.runTestsByPath) {
    dataMessage = `Files: ${globalConfig.nonFlagArgs
      .map(p => `"${p}"`)
      .join(', ')}`;
  } else {
    dataMessage = `Pattern: ${_chalk().default.yellow(
      globalConfig.testPathPattern
    )} - 0 matches`;
  }
  if (willExitWith0) {
    return `${_chalk().default.bold(
      'No tests found, exiting with code 0'
    )}\n${individualResults.join('\n')}\n${dataMessage}`;
  }
  return (
    `${_chalk().default.bold('No tests found, exiting with code 1')}\n` +
    'Run with `--passWithNoTests` to exit with code 0' +
    `\n${individualResults.join('\n')}\n${dataMessage}`
  );
}
