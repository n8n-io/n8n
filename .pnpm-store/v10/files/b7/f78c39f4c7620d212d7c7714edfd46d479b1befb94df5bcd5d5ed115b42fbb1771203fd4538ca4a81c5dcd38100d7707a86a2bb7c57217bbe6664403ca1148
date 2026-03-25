'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.nodeCrawl = nodeCrawl;
function _child_process() {
  const data = require('child_process');
  _child_process = function () {
    return data;
  };
  return data;
}
function path() {
  const data = _interopRequireWildcard(require('path'));
  path = function () {
    return data;
  };
  return data;
}
function fs() {
  const data = _interopRequireWildcard(require('graceful-fs'));
  fs = function () {
    return data;
  };
  return data;
}
var _constants = _interopRequireDefault(require('../constants'));
var fastPath = _interopRequireWildcard(require('../lib/fast_path'));
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

async function hasNativeFindSupport(forceNodeFilesystemAPI) {
  if (forceNodeFilesystemAPI) {
    return false;
  }
  try {
    return await new Promise(resolve => {
      // Check the find binary supports the non-POSIX -iname parameter wrapped in parens.
      const args = [
        '.',
        '-type',
        'f',
        '(',
        '-iname',
        '*.ts',
        '-o',
        '-iname',
        '*.js',
        ')'
      ];
      const child = (0, _child_process().spawn)('find', args, {
        cwd: __dirname
      });
      child.on('error', () => {
        resolve(false);
      });
      child.on('exit', code => {
        resolve(code === 0);
      });
    });
  } catch {
    return false;
  }
}
function find(roots, extensions, ignore, enableSymlinks, callback) {
  const result = [];
  let activeCalls = 0;
  function search(directory) {
    activeCalls++;
    fs().readdir(
      directory,
      {
        withFileTypes: true
      },
      (err, entries) => {
        activeCalls--;
        if (err) {
          if (activeCalls === 0) {
            callback(result);
          }
          return;
        }
        entries.forEach(entry => {
          const file = path().join(directory, entry.name);
          if (ignore(file)) {
            return;
          }
          if (entry.isSymbolicLink()) {
            return;
          }
          if (entry.isDirectory()) {
            search(file);
            return;
          }
          activeCalls++;
          const stat = enableSymlinks ? fs().stat : fs().lstat;
          stat(file, (err, stat) => {
            activeCalls--;

            // This logic is unnecessary for node > v10.10, but leaving it in
            // since we need it for backwards-compatibility still.
            if (!err && stat && !stat.isSymbolicLink()) {
              if (stat.isDirectory()) {
                search(file);
              } else {
                const ext = path().extname(file).substr(1);
                if (extensions.indexOf(ext) !== -1) {
                  result.push([file, stat.mtime.getTime(), stat.size]);
                }
              }
            }
            if (activeCalls === 0) {
              callback(result);
            }
          });
        });
        if (activeCalls === 0) {
          callback(result);
        }
      }
    );
  }
  if (roots.length > 0) {
    roots.forEach(search);
  } else {
    callback(result);
  }
}
function findNative(roots, extensions, ignore, enableSymlinks, callback) {
  const args = Array.from(roots);
  if (enableSymlinks) {
    args.push('(', '-type', 'f', '-o', '-type', 'l', ')');
  } else {
    args.push('-type', 'f');
  }
  if (extensions.length) {
    args.push('(');
  }
  extensions.forEach((ext, index) => {
    if (index) {
      args.push('-o');
    }
    args.push('-iname');
    args.push(`*.${ext}`);
  });
  if (extensions.length) {
    args.push(')');
  }
  const child = (0, _child_process().spawn)('find', args);
  let stdout = '';
  if (child.stdout === null) {
    throw new Error(
      'stdout is null - this should never happen. Please open up an issue at https://github.com/facebook/jest'
    );
  }
  child.stdout.setEncoding('utf-8');
  child.stdout.on('data', data => (stdout += data));
  child.stdout.on('close', () => {
    const lines = stdout
      .trim()
      .split('\n')
      .filter(x => !ignore(x));
    const result = [];
    let count = lines.length;
    if (!count) {
      callback([]);
    } else {
      lines.forEach(path => {
        fs().stat(path, (err, stat) => {
          // Filter out symlinks that describe directories
          if (!err && stat && !stat.isDirectory()) {
            result.push([path, stat.mtime.getTime(), stat.size]);
          }
          if (--count === 0) {
            callback(result);
          }
        });
      });
    }
  });
}
async function nodeCrawl(options) {
  const {
    data,
    extensions,
    forceNodeFilesystemAPI,
    ignore,
    rootDir,
    enableSymlinks,
    roots
  } = options;
  const useNativeFind = await hasNativeFindSupport(forceNodeFilesystemAPI);
  return new Promise(resolve => {
    const callback = list => {
      const files = new Map();
      const removedFiles = new Map(data.files);
      list.forEach(fileData => {
        const [filePath, mtime, size] = fileData;
        const relativeFilePath = fastPath.relative(rootDir, filePath);
        const existingFile = data.files.get(relativeFilePath);
        if (existingFile && existingFile[_constants.default.MTIME] === mtime) {
          files.set(relativeFilePath, existingFile);
        } else {
          // See ../constants.js; SHA-1 will always be null and fulfilled later.
          files.set(relativeFilePath, ['', mtime, size, 0, '', null]);
        }
        removedFiles.delete(relativeFilePath);
      });
      data.files = files;
      resolve({
        hasteMap: data,
        removedFiles
      });
    };
    if (useNativeFind) {
      findNative(roots, extensions, ignore, enableSymlinks, callback);
    } else {
      find(roots, extensions, ignore, enableSymlinks, callback);
    }
  });
}
