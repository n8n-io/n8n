'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.getSortedUsageRows = exports.filterInteractivePlugins = void 0;
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const filterInteractivePlugins = (watchPlugins, globalConfig) => {
  const usageInfos = watchPlugins.map(
    p => p.getUsageInfo && p.getUsageInfo(globalConfig)
  );
  return watchPlugins.filter((_plugin, i) => {
    const usageInfo = usageInfos[i];
    if (usageInfo) {
      const {key} = usageInfo;
      return !usageInfos.slice(i + 1).some(u => !!u && key === u.key);
    }
    return false;
  });
};
exports.filterInteractivePlugins = filterInteractivePlugins;
function notEmpty(value) {
  return value != null;
}
const getSortedUsageRows = (watchPlugins, globalConfig) =>
  filterInteractivePlugins(watchPlugins, globalConfig)
    .sort((a, b) => {
      if (a.isInternal && b.isInternal) {
        // internal plugins in the order we specify them
        return 0;
      }
      if (a.isInternal !== b.isInternal) {
        // external plugins afterwards
        return a.isInternal ? -1 : 1;
      }
      const usageInfoA = a.getUsageInfo && a.getUsageInfo(globalConfig);
      const usageInfoB = b.getUsageInfo && b.getUsageInfo(globalConfig);
      if (usageInfoA && usageInfoB) {
        // external plugins in alphabetical order
        return usageInfoA.key.localeCompare(usageInfoB.key);
      }
      return 0;
    })
    .map(p => p.getUsageInfo && p.getUsageInfo(globalConfig))
    .filter(notEmpty);
exports.getSortedUsageRows = getSortedUsageRows;
