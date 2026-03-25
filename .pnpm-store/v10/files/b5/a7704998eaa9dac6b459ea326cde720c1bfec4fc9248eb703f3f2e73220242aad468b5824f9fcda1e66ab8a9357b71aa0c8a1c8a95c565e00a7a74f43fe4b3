'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.testNameToKey =
  exports.serialize =
  exports.saveSnapshotFile =
  exports.removeLinesBeforeExternalMatcherTrap =
  exports.removeExtraLineBreaks =
  exports.minify =
  exports.keyToTestName =
  exports.getSnapshotData =
  exports.escapeBacktickString =
  exports.ensureDirectoryExists =
  exports.deserializeString =
  exports.deepMerge =
  exports.addExtraLineBreaks =
  exports.SNAPSHOT_VERSION_WARNING =
  exports.SNAPSHOT_VERSION =
  exports.SNAPSHOT_GUIDE_LINK =
    void 0;
var path = _interopRequireWildcard(require('path'));
var _chalk = _interopRequireDefault(require('chalk'));
var fs = _interopRequireWildcard(require('graceful-fs'));
var _naturalCompare = _interopRequireDefault(require('natural-compare'));
var _prettyFormat = require('pretty-format');
var _plugins = require('./plugins');
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {default: obj};
}
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
var jestWriteFile =
  globalThis[Symbol.for('jest-native-write-file')] || fs.writeFileSync;
var Symbol = globalThis['jest-symbol-do-not-touch'] || globalThis.Symbol;
var jestReadFile =
  globalThis[Symbol.for('jest-native-read-file')] || fs.readFileSync;
var Symbol = globalThis['jest-symbol-do-not-touch'] || globalThis.Symbol;
var jestExistsFile =
  globalThis[Symbol.for('jest-native-exists-file')] || fs.existsSync;
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
const SNAPSHOT_VERSION = '1';
exports.SNAPSHOT_VERSION = SNAPSHOT_VERSION;
const SNAPSHOT_VERSION_REGEXP = /^\/\/ Jest Snapshot v(.+),/;
const SNAPSHOT_GUIDE_LINK = 'https://goo.gl/fbAQLP';
exports.SNAPSHOT_GUIDE_LINK = SNAPSHOT_GUIDE_LINK;
const SNAPSHOT_VERSION_WARNING = _chalk.default.yellow(
  `${_chalk.default.bold('Warning')}: Before you upgrade snapshots, ` +
    'we recommend that you revert any local changes to tests or other code, ' +
    'to ensure that you do not store invalid state.'
);
exports.SNAPSHOT_VERSION_WARNING = SNAPSHOT_VERSION_WARNING;
const writeSnapshotVersion = () =>
  `// Jest Snapshot v${SNAPSHOT_VERSION}, ${SNAPSHOT_GUIDE_LINK}`;
const validateSnapshotVersion = snapshotContents => {
  const versionTest = SNAPSHOT_VERSION_REGEXP.exec(snapshotContents);
  const version = versionTest && versionTest[1];
  if (!version) {
    return new Error(
      _chalk.default.red(
        `${_chalk.default.bold(
          'Outdated snapshot'
        )}: No snapshot header found. ` +
          'Jest 19 introduced versioned snapshots to ensure all developers ' +
          'on a project are using the same version of Jest. ' +
          'Please update all snapshots during this upgrade of Jest.\n\n'
      ) + SNAPSHOT_VERSION_WARNING
    );
  }
  if (version < SNAPSHOT_VERSION) {
    return new Error(
      // eslint-disable-next-line prefer-template
      _chalk.default.red(
        `${_chalk.default.red.bold(
          'Outdated snapshot'
        )}: The version of the snapshot ` +
          'file associated with this test is outdated. The snapshot file ' +
          'version ensures that all developers on a project are using ' +
          'the same version of Jest. ' +
          'Please update all snapshots during this upgrade of Jest.'
      ) +
        '\n\n' +
        `Expected: v${SNAPSHOT_VERSION}\n` +
        `Received: v${version}\n\n` +
        SNAPSHOT_VERSION_WARNING
    );
  }
  if (version > SNAPSHOT_VERSION) {
    return new Error(
      // eslint-disable-next-line prefer-template
      _chalk.default.red(
        `${_chalk.default.red.bold(
          'Outdated Jest version'
        )}: The version of this ` +
          'snapshot file indicates that this project is meant to be used ' +
          'with a newer version of Jest. The snapshot file version ensures ' +
          'that all developers on a project are using the same version of ' +
          'Jest. Please update your version of Jest and re-run the tests.'
      ) +
        '\n\n' +
        `Expected: v${SNAPSHOT_VERSION}\n` +
        `Received: v${version}`
    );
  }
  return null;
};
function isObject(item) {
  return item != null && typeof item === 'object' && !Array.isArray(item);
}
const testNameToKey = (testName, count) => `${testName} ${count}`;
exports.testNameToKey = testNameToKey;
const keyToTestName = key => {
  if (!/ \d+$/.test(key)) {
    throw new Error('Snapshot keys must end with a number.');
  }
  return key.replace(/ \d+$/, '');
};
exports.keyToTestName = keyToTestName;
const getSnapshotData = (snapshotPath, update) => {
  const data = Object.create(null);
  let snapshotContents = '';
  let dirty = false;
  if (jestExistsFile(snapshotPath)) {
    try {
      snapshotContents = jestReadFile(snapshotPath, 'utf8');
      // eslint-disable-next-line no-new-func
      const populate = new Function('exports', snapshotContents);
      populate(data);
    } catch {}
  }
  const validationResult = validateSnapshotVersion(snapshotContents);
  const isInvalid = snapshotContents && validationResult;
  if (update === 'none' && isInvalid) {
    throw validationResult;
  }
  if ((update === 'all' || update === 'new') && isInvalid) {
    dirty = true;
  }
  return {
    data,
    dirty
  };
};

// Add extra line breaks at beginning and end of multiline snapshot
// to make the content easier to read.
exports.getSnapshotData = getSnapshotData;
const addExtraLineBreaks = string =>
  string.includes('\n') ? `\n${string}\n` : string;

// Remove extra line breaks at beginning and end of multiline snapshot.
// Instead of trim, which can remove additional newlines or spaces
// at beginning or end of the content from a custom serializer.
exports.addExtraLineBreaks = addExtraLineBreaks;
const removeExtraLineBreaks = string =>
  string.length > 2 && string.startsWith('\n') && string.endsWith('\n')
    ? string.slice(1, -1)
    : string;
exports.removeExtraLineBreaks = removeExtraLineBreaks;
const removeLinesBeforeExternalMatcherTrap = stack => {
  const lines = stack.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    // It's a function name specified in `packages/expect/src/index.ts`
    // for external custom matchers.
    if (lines[i].includes('__EXTERNAL_MATCHER_TRAP__')) {
      return lines.slice(i + 1).join('\n');
    }
  }
  return stack;
};
exports.removeLinesBeforeExternalMatcherTrap =
  removeLinesBeforeExternalMatcherTrap;
const escapeRegex = true;
const printFunctionName = false;
const serialize = (val, indent = 2, formatOverrides = {}) =>
  normalizeNewlines(
    (0, _prettyFormat.format)(val, {
      escapeRegex,
      indent,
      plugins: (0, _plugins.getSerializers)(),
      printFunctionName,
      ...formatOverrides
    })
  );
exports.serialize = serialize;
const minify = val =>
  (0, _prettyFormat.format)(val, {
    escapeRegex,
    min: true,
    plugins: (0, _plugins.getSerializers)(),
    printFunctionName
  });

// Remove double quote marks and unescape double quotes and backslashes.
exports.minify = minify;
const deserializeString = stringified =>
  stringified.slice(1, -1).replace(/\\("|\\)/g, '$1');
exports.deserializeString = deserializeString;
const escapeBacktickString = str => str.replace(/`|\\|\${/g, '\\$&');
exports.escapeBacktickString = escapeBacktickString;
const printBacktickString = str => `\`${escapeBacktickString(str)}\``;
const ensureDirectoryExists = filePath => {
  try {
    fs.mkdirSync(path.dirname(filePath), {
      recursive: true
    });
  } catch {}
};
exports.ensureDirectoryExists = ensureDirectoryExists;
const normalizeNewlines = string => string.replace(/\r\n|\r/g, '\n');
const saveSnapshotFile = (snapshotData, snapshotPath) => {
  const snapshots = Object.keys(snapshotData)
    .sort(_naturalCompare.default)
    .map(
      key =>
        `exports[${printBacktickString(key)}] = ${printBacktickString(
          normalizeNewlines(snapshotData[key])
        )};`
    );
  ensureDirectoryExists(snapshotPath);
  jestWriteFile(
    snapshotPath,
    `${writeSnapshotVersion()}\n\n${snapshots.join('\n\n')}\n`
  );
};
exports.saveSnapshotFile = saveSnapshotFile;
const isAnyOrAnything = input =>
  '$$typeof' in input &&
  input.$$typeof === Symbol.for('jest.asymmetricMatcher') &&
  ['Any', 'Anything'].includes(input.constructor.name);
const deepMergeArray = (target, source) => {
  const mergedOutput = Array.from(target);
  source.forEach((sourceElement, index) => {
    const targetElement = mergedOutput[index];
    if (Array.isArray(target[index]) && Array.isArray(sourceElement)) {
      mergedOutput[index] = deepMergeArray(target[index], sourceElement);
    } else if (isObject(targetElement) && !isAnyOrAnything(sourceElement)) {
      mergedOutput[index] = deepMerge(target[index], sourceElement);
    } else {
      // Source does not exist in target or target is primitive and cannot be deep merged
      mergedOutput[index] = sourceElement;
    }
  });
  return mergedOutput;
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
const deepMerge = (target, source) => {
  if (isObject(target) && isObject(source)) {
    const mergedOutput = {
      ...target
    };
    Object.keys(source).forEach(key => {
      if (isObject(source[key]) && !source[key].$$typeof) {
        if (!(key in target))
          Object.assign(mergedOutput, {
            [key]: source[key]
          });
        else mergedOutput[key] = deepMerge(target[key], source[key]);
      } else if (Array.isArray(source[key])) {
        mergedOutput[key] = deepMergeArray(target[key], source[key]);
      } else {
        Object.assign(mergedOutput, {
          [key]: source[key]
        });
      }
    });
    return mergedOutput;
  } else if (Array.isArray(target) && Array.isArray(source)) {
    return deepMergeArray(target, source);
  }
  return target;
};
exports.deepMerge = deepMerge;
