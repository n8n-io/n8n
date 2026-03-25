'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = getSnapshotSummary;
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
var _formatTestPath = _interopRequireDefault(require('./formatTestPath'));
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
const DOWN_ARROW = ' \u21B3 ';
const DOT = ' \u2022 ';
const FAIL_COLOR = _chalk().default.bold.red;
const OBSOLETE_COLOR = _chalk().default.bold.yellow;
const SNAPSHOT_ADDED = _chalk().default.bold.green;
const SNAPSHOT_NOTE = _chalk().default.dim;
const SNAPSHOT_REMOVED = _chalk().default.bold.green;
const SNAPSHOT_SUMMARY = _chalk().default.bold;
const SNAPSHOT_UPDATED = _chalk().default.bold.green;
function getSnapshotSummary(snapshots, globalConfig, updateCommand) {
  const summary = [];
  summary.push(SNAPSHOT_SUMMARY('Snapshot Summary'));
  if (snapshots.added) {
    summary.push(
      `${SNAPSHOT_ADDED(
        `${
          ARROW + (0, _jestUtil().pluralize)('snapshot', snapshots.added)
        } written `
      )}from ${(0, _jestUtil().pluralize)('test suite', snapshots.filesAdded)}.`
    );
  }
  if (snapshots.unmatched) {
    summary.push(
      `${FAIL_COLOR(
        `${ARROW}${(0, _jestUtil().pluralize)(
          'snapshot',
          snapshots.unmatched
        )} failed`
      )} from ${(0, _jestUtil().pluralize)(
        'test suite',
        snapshots.filesUnmatched
      )}. ${SNAPSHOT_NOTE(
        `Inspect your code changes or ${updateCommand} to update them.`
      )}`
    );
  }
  if (snapshots.updated) {
    summary.push(
      `${SNAPSHOT_UPDATED(
        `${
          ARROW + (0, _jestUtil().pluralize)('snapshot', snapshots.updated)
        } updated `
      )}from ${(0, _jestUtil().pluralize)(
        'test suite',
        snapshots.filesUpdated
      )}.`
    );
  }
  if (snapshots.filesRemoved) {
    if (snapshots.didUpdate) {
      summary.push(
        `${SNAPSHOT_REMOVED(
          `${ARROW}${(0, _jestUtil().pluralize)(
            'snapshot file',
            snapshots.filesRemoved
          )} removed `
        )}from ${(0, _jestUtil().pluralize)(
          'test suite',
          snapshots.filesRemoved
        )}.`
      );
    } else {
      summary.push(
        `${OBSOLETE_COLOR(
          `${ARROW}${(0, _jestUtil().pluralize)(
            'snapshot file',
            snapshots.filesRemoved
          )} obsolete `
        )}from ${(0, _jestUtil().pluralize)(
          'test suite',
          snapshots.filesRemoved
        )}. ${SNAPSHOT_NOTE(
          `To remove ${
            snapshots.filesRemoved === 1 ? 'it' : 'them all'
          }, ${updateCommand}.`
        )}`
      );
    }
  }
  if (snapshots.filesRemovedList && snapshots.filesRemovedList.length) {
    const [head, ...tail] = snapshots.filesRemovedList;
    summary.push(
      `  ${DOWN_ARROW} ${DOT}${(0, _formatTestPath.default)(
        globalConfig,
        head
      )}`
    );
    tail.forEach(key => {
      summary.push(
        `      ${DOT}${(0, _formatTestPath.default)(globalConfig, key)}`
      );
    });
  }
  if (snapshots.unchecked) {
    if (snapshots.didUpdate) {
      summary.push(
        `${SNAPSHOT_REMOVED(
          `${ARROW}${(0, _jestUtil().pluralize)(
            'snapshot',
            snapshots.unchecked
          )} removed `
        )}from ${(0, _jestUtil().pluralize)(
          'test suite',
          snapshots.uncheckedKeysByFile.length
        )}.`
      );
    } else {
      summary.push(
        `${OBSOLETE_COLOR(
          `${ARROW}${(0, _jestUtil().pluralize)(
            'snapshot',
            snapshots.unchecked
          )} obsolete `
        )}from ${(0, _jestUtil().pluralize)(
          'test suite',
          snapshots.uncheckedKeysByFile.length
        )}. ${SNAPSHOT_NOTE(
          `To remove ${
            snapshots.unchecked === 1 ? 'it' : 'them all'
          }, ${updateCommand}.`
        )}`
      );
    }
    snapshots.uncheckedKeysByFile.forEach(uncheckedFile => {
      summary.push(
        `  ${DOWN_ARROW}${(0, _formatTestPath.default)(
          globalConfig,
          uncheckedFile.filePath
        )}`
      );
      uncheckedFile.keys.forEach(key => {
        summary.push(`      ${DOT}${key}`);
      });
    });
  }
  return summary;
}
