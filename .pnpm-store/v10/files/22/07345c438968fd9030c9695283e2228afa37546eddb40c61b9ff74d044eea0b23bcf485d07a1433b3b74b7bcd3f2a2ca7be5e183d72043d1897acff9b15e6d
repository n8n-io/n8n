'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = getSnapshotStatus;
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

const ARROW = ' \u203A ';
const DOT = ' \u2022 ';
const FAIL_COLOR = _chalk().default.bold.red;
const SNAPSHOT_ADDED = _chalk().default.bold.green;
const SNAPSHOT_UPDATED = _chalk().default.bold.green;
const SNAPSHOT_OUTDATED = _chalk().default.bold.yellow;
function getSnapshotStatus(snapshot, afterUpdate) {
  const statuses = [];
  if (snapshot.added) {
    statuses.push(
      SNAPSHOT_ADDED(
        `${
          ARROW + (0, _jestUtil().pluralize)('snapshot', snapshot.added)
        } written.`
      )
    );
  }
  if (snapshot.updated) {
    statuses.push(
      SNAPSHOT_UPDATED(
        `${
          ARROW + (0, _jestUtil().pluralize)('snapshot', snapshot.updated)
        } updated.`
      )
    );
  }
  if (snapshot.unmatched) {
    statuses.push(
      FAIL_COLOR(
        `${
          ARROW + (0, _jestUtil().pluralize)('snapshot', snapshot.unmatched)
        } failed.`
      )
    );
  }
  if (snapshot.unchecked) {
    if (afterUpdate) {
      statuses.push(
        SNAPSHOT_UPDATED(
          `${
            ARROW + (0, _jestUtil().pluralize)('snapshot', snapshot.unchecked)
          } removed.`
        )
      );
    } else {
      statuses.push(
        `${SNAPSHOT_OUTDATED(
          `${
            ARROW + (0, _jestUtil().pluralize)('snapshot', snapshot.unchecked)
          } obsolete`
        )}.`
      );
    }
    snapshot.uncheckedKeys.forEach(key => {
      statuses.push(`  ${DOT}${key}`);
    });
  }
  if (snapshot.fileDeleted) {
    statuses.push(SNAPSHOT_UPDATED(`${ARROW}snapshot file removed.`));
  }
  return statuses;
}
