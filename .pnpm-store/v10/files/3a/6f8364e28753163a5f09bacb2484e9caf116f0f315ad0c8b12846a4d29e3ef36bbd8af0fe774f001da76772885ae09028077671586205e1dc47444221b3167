'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = getProjectNamesMissingWarning;
function _chalk() {
  const data = _interopRequireDefault(require('chalk'));
  _chalk = function () {
    return data;
  };
  return data;
}
var _getProjectDisplayName = _interopRequireDefault(
  require('./getProjectDisplayName')
);
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {default: obj};
}
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

function getProjectNamesMissingWarning(projectConfigs, opts) {
  const numberOfProjectsWithoutAName = projectConfigs.filter(
    config => !(0, _getProjectDisplayName.default)(config)
  ).length;
  if (numberOfProjectsWithoutAName === 0) {
    return undefined;
  }
  const args = [];
  if (opts.selectProjects) {
    args.push('--selectProjects');
  }
  if (opts.ignoreProjects) {
    args.push('--ignoreProjects');
  }
  return _chalk().default.yellow(
    `You provided values for ${args.join(' and ')} but ${
      numberOfProjectsWithoutAName === 1
        ? 'a project does not have a name'
        : `${numberOfProjectsWithoutAName} projects do not have a name`
    }.\n` +
      'Set displayName in the config of all projects in order to disable this warning.\n'
  );
}
