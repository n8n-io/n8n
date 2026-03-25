'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.NotFoundPackageJsonError = exports.MalformedPackageJsonError = void 0;
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

class NotFoundPackageJsonError extends Error {
  constructor(rootDir) {
    super(`Could not find a "package.json" file in ${rootDir}`);
    this.name = '';
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    Error.captureStackTrace(this, () => {});
  }
}
exports.NotFoundPackageJsonError = NotFoundPackageJsonError;
class MalformedPackageJsonError extends Error {
  constructor(packageJsonPath) {
    super(`There is malformed json in ${packageJsonPath}`);
    this.name = '';
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    Error.captureStackTrace(this, () => {});
  }
}
exports.MalformedPackageJsonError = MalformedPackageJsonError;
