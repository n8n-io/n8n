'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = getConfigsOfProjectsToRun;
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

function getConfigsOfProjectsToRun(projectConfigs, opts) {
  const projectFilter = createProjectFilter(opts);
  return projectConfigs.filter(config => {
    const name = (0, _getProjectDisplayName.default)(config);
    return projectFilter(name);
  });
}
function createProjectFilter(opts) {
  const {selectProjects, ignoreProjects} = opts;
  const always = () => true;
  const selected = selectProjects
    ? name => name && selectProjects.includes(name)
    : always;
  const notIgnore = ignoreProjects
    ? name => !(name && ignoreProjects.includes(name))
    : always;
  function test(name) {
    return selected(name) && notIgnore(name);
  }
  return test;
}
