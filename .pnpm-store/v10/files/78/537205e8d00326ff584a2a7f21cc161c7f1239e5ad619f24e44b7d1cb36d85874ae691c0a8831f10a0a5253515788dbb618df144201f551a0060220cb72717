'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = getMaxWorkers;
function _os() {
  const data = require('os');
  _os = function () {
    return data;
  };
  return data;
}
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

function getNumCpus() {
  return typeof _os().availableParallelism === 'function'
    ? (0, _os().availableParallelism)()
    : (0, _os().cpus)()?.length ?? 1;
}
function getMaxWorkers(argv, defaultOptions) {
  if (argv.runInBand) {
    return 1;
  } else if (argv.maxWorkers) {
    return parseWorkers(argv.maxWorkers);
  } else if (defaultOptions && defaultOptions.maxWorkers) {
    return parseWorkers(defaultOptions.maxWorkers);
  } else {
    // In watch mode, Jest should be unobtrusive and not use all available CPUs.
    const numCpus = getNumCpus();
    const isWatchModeEnabled = argv.watch || argv.watchAll;
    return Math.max(
      isWatchModeEnabled ? Math.floor(numCpus / 2) : numCpus - 1,
      1
    );
  }
}
const parseWorkers = maxWorkers => {
  const parsed = parseInt(maxWorkers.toString(), 10);
  if (
    typeof maxWorkers === 'string' &&
    maxWorkers.trim().endsWith('%') &&
    parsed > 0 &&
    parsed <= 100
  ) {
    const numCpus = getNumCpus();
    const workers = Math.floor((parsed / 100) * numCpus);
    return Math.max(workers, 1);
  }
  return parsed > 0 ? parsed : 1;
};
