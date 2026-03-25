'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = void 0;
var fs = _interopRequireWildcard(require('graceful-fs'));
var _jestMessageUtil = require('jest-message-util');
var _InlineSnapshots = require('./InlineSnapshots');
var _utils = require('./utils');
function _getRequireWildcardCache(nodeInterop) {
  if (typeof WeakMap !== 'function') return null;
  var cacheBabelInterop = new WeakMap();
  var cacheNodeInterop = new WeakMap();
  return (_getRequireWildcardCache = function (nodeInterop) {
    return nodeInterop ? cacheNodeInterop : cacheBabelInterop;
  })(nodeInterop);
}
function _interopRequireWildcard(obj, nodeInterop) {
  if (!nodeInterop && obj && obj.__esModule) {
    return obj;
  }
  if (obj === null || (typeof obj !== 'object' && typeof obj !== 'function')) {
    return {default: obj};
  }
  var cache = _getRequireWildcardCache(nodeInterop);
  if (cache && cache.has(obj)) {
    return cache.get(obj);
  }
  var newObj = {};
  var hasPropertyDescriptor =
    Object.defineProperty && Object.getOwnPropertyDescriptor;
  for (var key in obj) {
    if (key !== 'default' && Object.prototype.hasOwnProperty.call(obj, key)) {
      var desc = hasPropertyDescriptor
        ? Object.getOwnPropertyDescriptor(obj, key)
        : null;
      if (desc && (desc.get || desc.set)) {
        Object.defineProperty(newObj, key, desc);
      } else {
        newObj[key] = obj[key];
      }
    }
  }
  newObj.default = obj;
  if (cache) {
    cache.set(obj, newObj);
  }
  return newObj;
}
var Symbol = globalThis['jest-symbol-do-not-touch'] || globalThis.Symbol;
var Symbol = globalThis['jest-symbol-do-not-touch'] || globalThis.Symbol;
var jestExistsFile =
  globalThis[Symbol.for('jest-native-exists-file')] || fs.existsSync;
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
class SnapshotState {
  _counters;
  _dirty;
  // @ts-expect-error - seemingly unused?
  _index;
  _updateSnapshot;
  _snapshotData;
  _initialData;
  _snapshotPath;
  _inlineSnapshots;
  _uncheckedKeys;
  _prettierPath;
  _rootDir;
  snapshotFormat;
  added;
  expand;
  matched;
  unmatched;
  updated;
  constructor(snapshotPath, options) {
    this._snapshotPath = snapshotPath;
    const {data, dirty} = (0, _utils.getSnapshotData)(
      this._snapshotPath,
      options.updateSnapshot
    );
    this._initialData = data;
    this._snapshotData = data;
    this._dirty = dirty;
    this._prettierPath = options.prettierPath ?? null;
    this._inlineSnapshots = [];
    this._uncheckedKeys = new Set(Object.keys(this._snapshotData));
    this._counters = new Map();
    this._index = 0;
    this.expand = options.expand || false;
    this.added = 0;
    this.matched = 0;
    this.unmatched = 0;
    this._updateSnapshot = options.updateSnapshot;
    this.updated = 0;
    this.snapshotFormat = options.snapshotFormat;
    this._rootDir = options.rootDir;
  }
  markSnapshotsAsCheckedForTest(testName) {
    this._uncheckedKeys.forEach(uncheckedKey => {
      if ((0, _utils.keyToTestName)(uncheckedKey) === testName) {
        this._uncheckedKeys.delete(uncheckedKey);
      }
    });
  }
  _addSnapshot(key, receivedSerialized, options) {
    this._dirty = true;
    if (options.isInline) {
      const error = options.error || new Error();
      const lines = (0, _jestMessageUtil.getStackTraceLines)(
        (0, _utils.removeLinesBeforeExternalMatcherTrap)(error.stack || '')
      );
      const frame = (0, _jestMessageUtil.getTopFrame)(lines);
      if (!frame) {
        throw new Error(
          "Jest: Couldn't infer stack frame for inline snapshot."
        );
      }
      this._inlineSnapshots.push({
        frame,
        snapshot: receivedSerialized
      });
    } else {
      this._snapshotData[key] = receivedSerialized;
    }
  }
  clear() {
    this._snapshotData = this._initialData;
    this._inlineSnapshots = [];
    this._counters = new Map();
    this._index = 0;
    this.added = 0;
    this.matched = 0;
    this.unmatched = 0;
    this.updated = 0;
  }
  save() {
    const hasExternalSnapshots = Object.keys(this._snapshotData).length;
    const hasInlineSnapshots = this._inlineSnapshots.length;
    const isEmpty = !hasExternalSnapshots && !hasInlineSnapshots;
    const status = {
      deleted: false,
      saved: false
    };
    if ((this._dirty || this._uncheckedKeys.size) && !isEmpty) {
      if (hasExternalSnapshots) {
        (0, _utils.saveSnapshotFile)(this._snapshotData, this._snapshotPath);
      }
      if (hasInlineSnapshots) {
        (0, _InlineSnapshots.saveInlineSnapshots)(
          this._inlineSnapshots,
          this._rootDir,
          this._prettierPath
        );
      }
      status.saved = true;
    } else if (!hasExternalSnapshots && jestExistsFile(this._snapshotPath)) {
      if (this._updateSnapshot === 'all') {
        fs.unlinkSync(this._snapshotPath);
      }
      status.deleted = true;
    }
    return status;
  }
  getUncheckedCount() {
    return this._uncheckedKeys.size || 0;
  }
  getUncheckedKeys() {
    return Array.from(this._uncheckedKeys);
  }
  removeUncheckedKeys() {
    if (this._updateSnapshot === 'all' && this._uncheckedKeys.size) {
      this._dirty = true;
      this._uncheckedKeys.forEach(key => delete this._snapshotData[key]);
      this._uncheckedKeys.clear();
    }
  }
  match({testName, received, key, inlineSnapshot, isInline, error}) {
    this._counters.set(testName, (this._counters.get(testName) || 0) + 1);
    const count = Number(this._counters.get(testName));
    if (!key) {
      key = (0, _utils.testNameToKey)(testName, count);
    }

    // Do not mark the snapshot as "checked" if the snapshot is inline and
    // there's an external snapshot. This way the external snapshot can be
    // removed with `--updateSnapshot`.
    if (!(isInline && this._snapshotData[key] !== undefined)) {
      this._uncheckedKeys.delete(key);
    }
    const receivedSerialized = (0, _utils.addExtraLineBreaks)(
      (0, _utils.serialize)(received, undefined, this.snapshotFormat)
    );
    const expected = isInline ? inlineSnapshot : this._snapshotData[key];
    const pass = expected === receivedSerialized;
    const hasSnapshot = expected !== undefined;
    const snapshotIsPersisted = isInline || fs.existsSync(this._snapshotPath);
    if (pass && !isInline) {
      // Executing a snapshot file as JavaScript and writing the strings back
      // when other snapshots have changed loses the proper escaping for some
      // characters. Since we check every snapshot in every test, use the newly
      // generated formatted string.
      // Note that this is only relevant when a snapshot is added and the dirty
      // flag is set.
      this._snapshotData[key] = receivedSerialized;
    }

    // These are the conditions on when to write snapshots:
    //  * There's no snapshot file in a non-CI environment.
    //  * There is a snapshot file and we decided to update the snapshot.
    //  * There is a snapshot file, but it doesn't have this snaphsot.
    // These are the conditions on when not to write snapshots:
    //  * The update flag is set to 'none'.
    //  * There's no snapshot file or a file without this snapshot on a CI environment.
    if (
      (hasSnapshot && this._updateSnapshot === 'all') ||
      ((!hasSnapshot || !snapshotIsPersisted) &&
        (this._updateSnapshot === 'new' || this._updateSnapshot === 'all'))
    ) {
      if (this._updateSnapshot === 'all') {
        if (!pass) {
          if (hasSnapshot) {
            this.updated++;
          } else {
            this.added++;
          }
          this._addSnapshot(key, receivedSerialized, {
            error,
            isInline
          });
        } else {
          this.matched++;
        }
      } else {
        this._addSnapshot(key, receivedSerialized, {
          error,
          isInline
        });
        this.added++;
      }
      return {
        actual: '',
        count,
        expected: '',
        key,
        pass: true
      };
    } else {
      if (!pass) {
        this.unmatched++;
        return {
          actual: (0, _utils.removeExtraLineBreaks)(receivedSerialized),
          count,
          expected:
            expected !== undefined
              ? (0, _utils.removeExtraLineBreaks)(expected)
              : undefined,
          key,
          pass: false
        };
      } else {
        this.matched++;
        return {
          actual: '',
          count,
          expected: '',
          key,
          pass: true
        };
      }
    }
  }
  fail(testName, _received, key) {
    this._counters.set(testName, (this._counters.get(testName) || 0) + 1);
    const count = Number(this._counters.get(testName));
    if (!key) {
      key = (0, _utils.testNameToKey)(testName, count);
    }
    this._uncheckedKeys.delete(key);
    this.unmatched++;
    return key;
  }
}
exports.default = SnapshotState;
