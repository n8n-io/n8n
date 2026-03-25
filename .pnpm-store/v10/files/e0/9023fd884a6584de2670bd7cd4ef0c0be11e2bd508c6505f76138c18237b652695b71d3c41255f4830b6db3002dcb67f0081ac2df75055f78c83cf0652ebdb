'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = void 0;
function _chalk() {
  const data = _interopRequireDefault(require('chalk'));
  _chalk = function () {
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

const deprecatedOptions = {
  browser: () =>
    `  Option ${_chalk().default.bold(
      '"browser"'
    )} has been deprecated. Please install "browser-resolve" and use the "resolver" option in Jest configuration as shown in the documentation: https://jestjs.io/docs/configuration#resolver-string`,
  collectCoverageOnlyFrom: _options => `  Option ${_chalk().default.bold(
    '"collectCoverageOnlyFrom"'
  )} was replaced by ${_chalk().default.bold('"collectCoverageFrom"')}.

    Please update your configuration.`,
  extraGlobals: _options => `  Option ${_chalk().default.bold(
    '"extraGlobals"'
  )} was replaced by ${_chalk().default.bold('"sandboxInjectedGlobals"')}.

  Please update your configuration.`,
  moduleLoader: _options => `  Option ${_chalk().default.bold(
    '"moduleLoader"'
  )} was replaced by ${_chalk().default.bold('"runtime"')}.

  Please update your configuration.`,
  preprocessorIgnorePatterns: _options => `  Option ${_chalk().default.bold(
    '"preprocessorIgnorePatterns"'
  )} was replaced by ${_chalk().default.bold(
    '"transformIgnorePatterns"'
  )}, which support multiple preprocessors.

  Please update your configuration.`,
  scriptPreprocessor: _options => `  Option ${_chalk().default.bold(
    '"scriptPreprocessor"'
  )} was replaced by ${_chalk().default.bold(
    '"transform"'
  )}, which support multiple preprocessors.

  Please update your configuration.`,
  setupTestFrameworkScriptFile: _options => `  Option ${_chalk().default.bold(
    '"setupTestFrameworkScriptFile"'
  )} was replaced by configuration ${_chalk().default.bold(
    '"setupFilesAfterEnv"'
  )}, which supports multiple paths.

  Please update your configuration.`,
  testPathDirs: _options => `  Option ${_chalk().default.bold(
    '"testPathDirs"'
  )} was replaced by ${_chalk().default.bold('"roots"')}.

  Please update your configuration.
  `,
  testURL: _options => `  Option ${_chalk().default.bold(
    '"testURL"'
  )} was replaced by passing the URL via ${_chalk().default.bold(
    '"testEnvironmentOptions.url"'
  )}.

  Please update your configuration.`,
  timers: _options => `  Option ${_chalk().default.bold(
    '"timers"'
  )} was replaced by ${_chalk().default.bold('"fakeTimers"')}.

  Please update your configuration.`
};
var _default = deprecatedOptions;
exports.default = _default;
