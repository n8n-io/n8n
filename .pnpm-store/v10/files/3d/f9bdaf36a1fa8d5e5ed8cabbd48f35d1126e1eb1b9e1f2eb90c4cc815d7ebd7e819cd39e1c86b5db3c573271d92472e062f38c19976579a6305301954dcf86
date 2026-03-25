'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.shouldRunInBand = shouldRunInBand;
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const SLOW_TEST_TIME = 1000;
function shouldRunInBand(
  tests,
  timings,
  {detectOpenHandles, maxWorkers, watch, watchAll, workerIdleMemoryLimit}
) {
  // detectOpenHandles makes no sense without runInBand, because it cannot detect leaks in workers
  if (detectOpenHandles) {
    return true;
  }

  /*
   * If we are using watch/watchAll mode, don't schedule anything in the main
   * thread to keep the TTY responsive and to prevent watch mode crashes caused
   * by leaks (improper test teardown).
   */
  if (watch || watchAll) {
    return false;
  }

  /*
   * Otherwise, run in band if we only have one test or one worker available.
   * Also, if we are confident from previous runs that the tests will finish
   * quickly we also run in band to reduce the overhead of spawning workers.
   * Finally, the user can provide the runInBand argument in the CLI to
   * force running in band, which sets maxWorkers to 1 here:
   * https://github.com/facebook/jest/blob/d106643a8ee0ffa9c2f11c6bb2d12094e99135aa/packages/jest-config/src/getMaxWorkers.ts#L27-L28
   */
  const areFastTests = timings.every(timing => timing < SLOW_TEST_TIME);
  const oneWorkerOrLess = maxWorkers <= 1;
  const oneTestOrLess = tests.length <= 1;
  return (
    // When specifying a memory limit, workers should be used
    !workerIdleMemoryLimit &&
    (oneWorkerOrLess ||
      oneTestOrLess ||
      (tests.length <= 20 && timings.length > 0 && areFastTests))
  );
}
