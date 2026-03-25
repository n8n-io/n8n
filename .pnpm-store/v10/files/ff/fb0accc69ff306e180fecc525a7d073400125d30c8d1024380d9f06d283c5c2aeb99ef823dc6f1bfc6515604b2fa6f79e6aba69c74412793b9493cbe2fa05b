'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.watchmanCrawl = watchmanCrawl;
function path() {
  const data = _interopRequireWildcard(require('path'));
  path = function () {
    return data;
  };
  return data;
}
function _fbWatchman() {
  const data = _interopRequireDefault(require('fb-watchman'));
  _fbWatchman = function () {
    return data;
  };
  return data;
}
var _constants = _interopRequireDefault(require('../constants'));
var fastPath = _interopRequireWildcard(require('../lib/fast_path'));
var _normalizePathSep = _interopRequireDefault(
  require('../lib/normalizePathSep')
);
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
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const watchmanURL = 'https://facebook.github.io/watchman/docs/troubleshooting';
function WatchmanError(error) {
  error.message =
    `Watchman error: ${error.message.trim()}. Make sure watchman ` +
    `is running for this project. See ${watchmanURL}.`;
  return error;
}

/**
 * Wrap watchman capabilityCheck method as a promise.
 *
 * @param client watchman client
 * @param caps capabilities to verify
 * @returns a promise resolving to a list of verified capabilities
 */
async function capabilityCheck(client, caps) {
  return new Promise((resolve, reject) => {
    client.capabilityCheck(
      // @ts-expect-error: incorrectly typed
      caps,
      (error, response) => {
        if (error) {
          reject(error);
        } else {
          resolve(response);
        }
      }
    );
  });
}
async function watchmanCrawl(options) {
  const fields = ['name', 'exists', 'mtime_ms', 'size'];
  const {data, extensions, ignore, rootDir, roots} = options;
  const defaultWatchExpression = ['allof', ['type', 'f']];
  const clocks = data.clocks;
  const client = new (_fbWatchman().default.Client)();

  // https://facebook.github.io/watchman/docs/capabilities.html
  // Check adds about ~28ms
  const capabilities = await capabilityCheck(client, {
    // If a required capability is missing then an error will be thrown,
    // we don't need this assertion, so using optional instead.
    optional: ['suffix-set']
  });
  if (capabilities?.capabilities['suffix-set']) {
    // If available, use the optimized `suffix-set` operation:
    // https://facebook.github.io/watchman/docs/expr/suffix.html#suffix-set
    defaultWatchExpression.push(['suffix', extensions]);
  } else {
    // Otherwise use the older and less optimal suffix tuple array
    defaultWatchExpression.push([
      'anyof',
      ...extensions.map(extension => ['suffix', extension])
    ]);
  }
  let clientError;
  client.on('error', error => (clientError = WatchmanError(error)));
  const cmd = (...args) =>
    new Promise((resolve, reject) =>
      client.command(args, (error, result) =>
        error ? reject(WatchmanError(error)) : resolve(result)
      )
    );
  if (options.computeSha1) {
    const {capabilities} = await cmd('list-capabilities');
    if (capabilities.indexOf('field-content.sha1hex') !== -1) {
      fields.push('content.sha1hex');
    }
  }
  async function getWatchmanRoots(roots) {
    const watchmanRoots = new Map();
    await Promise.all(
      roots.map(async root => {
        const response = await cmd('watch-project', root);
        const existing = watchmanRoots.get(response.watch);
        // A root can only be filtered if it was never seen with a
        // relative_path before.
        const canBeFiltered = !existing || existing.length > 0;
        if (canBeFiltered) {
          if (response.relative_path) {
            watchmanRoots.set(
              response.watch,
              (existing || []).concat(response.relative_path)
            );
          } else {
            // Make the filter directories an empty array to signal that this
            // root was already seen and needs to be watched for all files or
            // directories.
            watchmanRoots.set(response.watch, []);
          }
        }
      })
    );
    return watchmanRoots;
  }
  async function queryWatchmanForDirs(rootProjectDirMappings) {
    const results = new Map();
    let isFresh = false;
    await Promise.all(
      Array.from(rootProjectDirMappings).map(
        async ([root, directoryFilters]) => {
          const expression = Array.from(defaultWatchExpression);
          const glob = [];
          if (directoryFilters.length > 0) {
            expression.push([
              'anyof',
              ...directoryFilters.map(dir => ['dirname', dir])
            ]);
            for (const directory of directoryFilters) {
              for (const extension of extensions) {
                glob.push(`${directory}/**/*.${extension}`);
              }
            }
          } else {
            for (const extension of extensions) {
              glob.push(`**/*.${extension}`);
            }
          }

          // Jest is only going to store one type of clock; a string that
          // represents a local clock. However, the Watchman crawler supports
          // a second type of clock that can be written by automation outside of
          // Jest, called an "scm query", which fetches changed files based on
          // source control mergebases. The reason this is necessary is because
          // local clocks are not portable across systems, but scm queries are.
          // By using scm queries, we can create the haste map on a different
          // system and import it, transforming the clock into a local clock.
          const since = clocks.get(fastPath.relative(rootDir, root));
          const query =
            since !== undefined
              ? // Use the `since` generator if we have a clock available
                {
                  expression,
                  fields,
                  since
                }
              : // Otherwise use the `glob` filter
                {
                  expression,
                  fields,
                  glob,
                  glob_includedotfiles: true
                };
          const response = await cmd('query', root, query);
          if ('warning' in response) {
            console.warn('watchman warning: ', response.warning);
          }

          // When a source-control query is used, we ignore the "is fresh"
          // response from Watchman because it will be true despite the query
          // being incremental.
          const isSourceControlQuery =
            typeof since !== 'string' &&
            since?.scm?.['mergebase-with'] !== undefined;
          if (!isSourceControlQuery) {
            isFresh = isFresh || response.is_fresh_instance;
          }
          results.set(root, response);
        }
      )
    );
    return {
      isFresh,
      results
    };
  }
  let files = data.files;
  let removedFiles = new Map();
  const changedFiles = new Map();
  let results;
  let isFresh = false;
  try {
    const watchmanRoots = await getWatchmanRoots(roots);
    const watchmanFileResults = await queryWatchmanForDirs(watchmanRoots);

    // Reset the file map if watchman was restarted and sends us a list of
    // files.
    if (watchmanFileResults.isFresh) {
      files = new Map();
      removedFiles = new Map(data.files);
      isFresh = true;
    }
    results = watchmanFileResults.results;
  } finally {
    client.end();
  }
  if (clientError) {
    throw clientError;
  }
  for (const [watchRoot, response] of results) {
    const fsRoot = (0, _normalizePathSep.default)(watchRoot);
    const relativeFsRoot = fastPath.relative(rootDir, fsRoot);
    clocks.set(
      relativeFsRoot,
      // Ensure we persist only the local clock.
      typeof response.clock === 'string' ? response.clock : response.clock.clock
    );
    for (const fileData of response.files) {
      const filePath =
        fsRoot + path().sep + (0, _normalizePathSep.default)(fileData.name);
      const relativeFilePath = fastPath.relative(rootDir, filePath);
      const existingFileData = data.files.get(relativeFilePath);

      // If watchman is fresh, the removed files map starts with all files
      // and we remove them as we verify they still exist.
      if (isFresh && existingFileData && fileData.exists) {
        removedFiles.delete(relativeFilePath);
      }
      if (!fileData.exists) {
        // No need to act on files that do not exist and were not tracked.
        if (existingFileData) {
          files.delete(relativeFilePath);

          // If watchman is not fresh, we will know what specific files were
          // deleted since we last ran and can track only those files.
          if (!isFresh) {
            removedFiles.set(relativeFilePath, existingFileData);
          }
        }
      } else if (!ignore(filePath)) {
        const mtime =
          typeof fileData.mtime_ms === 'number'
            ? fileData.mtime_ms
            : fileData.mtime_ms.toNumber();
        const size = fileData.size;
        let sha1hex = fileData['content.sha1hex'];
        if (typeof sha1hex !== 'string' || sha1hex.length !== 40) {
          sha1hex = undefined;
        }
        let nextData;
        if (
          existingFileData &&
          existingFileData[_constants.default.MTIME] === mtime
        ) {
          nextData = existingFileData;
        } else if (
          existingFileData &&
          sha1hex &&
          existingFileData[_constants.default.SHA1] === sha1hex
        ) {
          nextData = [
            existingFileData[0],
            mtime,
            existingFileData[2],
            existingFileData[3],
            existingFileData[4],
            existingFileData[5]
          ];
        } else {
          // See ../constants.ts
          nextData = ['', mtime, size, 0, '', sha1hex ?? null];
        }
        files.set(relativeFilePath, nextData);
        changedFiles.set(relativeFilePath, nextData);
      }
    }
  }
  data.files = files;
  return {
    changedFiles: isFresh ? undefined : changedFiles,
    hasteMap: data,
    removedFiles
  };
}
