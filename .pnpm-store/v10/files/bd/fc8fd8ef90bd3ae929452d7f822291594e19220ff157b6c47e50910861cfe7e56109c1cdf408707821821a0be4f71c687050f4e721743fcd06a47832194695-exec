// Licensed to the Software Freedom Conservancy (SFC) under one
// or more contributor license agreements.  See the NOTICE file
// distributed with this work for additional information
// regarding copyright ownership.  The SFC licenses this file
// to you under the Apache License, Version 2.0 (the
// "License"); you may not use this file except in compliance
// with the License.  You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.

'use strict'

const fs = require('node:fs')
const path = require('node:path')
const tmp = require('tmp')

/**
 * @param {!Function} fn .
 * @return {!Promise<T>} .
 * @template T
 */
function checkedCall(fn) {
  return new Promise((resolve, reject) => {
    try {
      fn((err, value) => {
        if (err) {
          reject(err)
        } else {
          resolve(value)
        }
      })
    } catch (e) {
      reject(e)
    }
  })
}

/**
 * Recursively removes a directory and all of its contents. This is equivalent
 * to {@code rm -rf} on a POSIX system.
 * @param {string} dirPath Path to the directory to remove.
 * @return {!Promise} A promise to be resolved when the operation has
 *     completed.
 */
function rmDir(dirPath) {
  return new Promise(function (fulfill, reject) {
    fs.rm(dirPath, { recursive: true, maxRetries: 2 }, function (err) {
      if (err && err.code === 'ENOENT') {
        fulfill()
      } else if (err) {
        reject(err)
      }
      fulfill()
    })
  })
}

/**
 * Copies one file to another.
 * @param {string} src The source file.
 * @param {string} dst The destination file.
 * @return {!Promise<string>} A promise for the copied file's path.
 */
function copy(src, dst) {
  return new Promise(function (fulfill, reject) {
    const rs = fs.createReadStream(src)
    rs.on('error', reject)

    const ws = fs.createWriteStream(dst)
    ws.on('error', reject)
    ws.on('close', () => fulfill(dst))

    rs.pipe(ws)
  })
}

/**
 * Recursively copies the contents of one directory to another.
 * @param {string} src The source directory to copy.
 * @param {string} dst The directory to copy into.
 * @param {(RegExp|function(string): boolean)=} opt_exclude An exclusion filter
 *     as either a regex or predicate function. All files matching this filter
 *     will not be copied.
 * @return {!Promise<string>} A promise for the destination
 *     directory's path once all files have been copied.
 */
function copyDir(src, dst, opt_exclude) {
  let predicate = opt_exclude
  if (opt_exclude && typeof opt_exclude !== 'function') {
    predicate = function (p) {
      return !opt_exclude.test(p)
    }
  }

  if (!fs.existsSync(dst)) {
    fs.mkdirSync(dst)
  }

  let files = fs.readdirSync(src)
  files = files.map(function (file) {
    return path.join(src, file)
  })

  if (predicate) {
    files = files.filter(/** @type {function(string): boolean} */ (predicate))
  }

  const results = []
  files.forEach(function (file) {
    const stats = fs.statSync(file)
    const target = path.join(dst, path.basename(file))

    if (stats.isDirectory()) {
      if (!fs.existsSync(target)) {
        fs.mkdirSync(target, stats.mode)
      }
      results.push(copyDir(file, target, predicate))
    } else {
      results.push(copy(file, target))
    }
  })

  return Promise.all(results).then(() => dst)
}

/**
 * Tests if a file path exists.
 * @param {string} aPath The path to test.
 * @return {!Promise<boolean>} A promise for whether the file exists.
 */
function exists(aPath) {
  return new Promise(function (fulfill, reject) {
    let type = typeof aPath
    if (type !== 'string') {
      reject(TypeError(`expected string path, but got ${type}`))
    } else {
      fulfill(fs.existsSync(aPath))
    }
  })
}

/**
 * Calls `stat(2)`.
 * @param {string} aPath The path to stat.
 * @return {!Promise<!fs.Stats>} A promise for the file stats.
 */
function stat(aPath) {
  return checkedCall((callback) => fs.stat(aPath, callback))
}

/**
 * Deletes a name from the filesystem and possibly the file it refers to. Has
 * no effect if the file does not exist.
 * @param {string} aPath The path to remove.
 * @return {!Promise} A promise for when the file has been removed.
 */
function unlink(aPath) {
  return new Promise(function (fulfill, reject) {
    const exists = fs.existsSync(aPath)
    if (exists) {
      fs.unlink(aPath, function (err) {
        ;(err && reject(err)) || fulfill()
      })
    } else {
      fulfill()
    }
  })
}

/**
 * @return {!Promise<string>} A promise for the path to a temporary directory.
 * @see https://www.npmjs.org/package/tmp
 */
function tmpDir() {
  return checkedCall((callback) => tmp.dir({ unsafeCleanup: true }, callback))
}

/**
 * @param {{postfix: string}=} opt_options Temporary file options.
 * @return {!Promise<string>} A promise for the path to a temporary file.
 * @see https://www.npmjs.org/package/tmp
 */
function tmpFile(opt_options) {
  return checkedCall((callback) => {
    /**  check fixed in v > 0.2.1 if
     * (typeof options === 'function') {
     *     return [{}, options];
     * }
     */
    tmp.file(opt_options, callback)
  })
}

/**
 * Searches the {@code PATH} environment variable for the given file.
 * @param {string} file The file to locate on the PATH.
 * @param {boolean=} opt_checkCwd Whether to always start with the search with
 *     the current working directory, regardless of whether it is explicitly
 *     listed on the PATH.
 * @return {?string} Path to the located file, or {@code null} if it could
 *     not be found.
 */
function findInPath(file, opt_checkCwd) {
  const dirs = []
  if (opt_checkCwd) {
    dirs.push(process.cwd())
  }
  dirs.push.apply(dirs, process.env['PATH'].split(path.delimiter))

  let foundInDir = dirs.find((dir) => {
    let tmp = path.join(dir, file)
    try {
      let stats = fs.statSync(tmp)
      return stats.isFile() && !stats.isDirectory()
      /*eslint no-unused-vars: "off"*/
    } catch (ex) {
      return false
    }
  })

  return foundInDir ? path.join(foundInDir, file) : null
}

/**
 * Reads the contents of the given file.
 *
 * @param {string} aPath Path to the file to read.
 * @return {!Promise<!Buffer>} A promise that will resolve with a buffer of the
 *     file contents.
 */
function read(aPath) {
  return checkedCall((callback) => fs.readFile(aPath, callback))
}

/**
 * Writes to a file.
 *
 * @param {string} aPath Path to the file to write to.
 * @param {(string|!Buffer)} data The data to write.
 * @return {!Promise} A promise that will resolve when the operation has
 *     completed.
 */
function write(aPath, data) {
  return checkedCall((callback) => fs.writeFile(aPath, data, callback))
}

/**
 * Creates a directory.
 *
 * @param {string} aPath The directory path.
 * @return {!Promise<string>} A promise that will resolve with the path of the
 *     created directory.
 */
function mkdir(aPath) {
  return checkedCall((callback) => {
    fs.mkdir(aPath, undefined, (err) => {
      if (err && err.code !== 'EEXIST') {
        callback(err)
      } else {
        callback(null, aPath)
      }
    })
  })
}

/**
 * Recursively creates a directory and any ancestors that do not yet exist.
 *
 * @param {string} dir The directory path to create.
 * @return {!Promise<string>} A promise that will resolve with the path of the
 *     created directory.
 */
function mkdirp(dir) {
  return checkedCall((callback) => {
    fs.mkdir(dir, undefined, (err) => {
      if (!err) {
        callback(null, dir)
        return
      }

      switch (err.code) {
        case 'EEXIST':
          callback(null, dir)
          return
        case 'ENOENT':
          return mkdirp(path.dirname(dir))
            .then(() => mkdirp(dir))
            .then(
              () => callback(null, dir),
              (err) => callback(err),
            )
        default:
          callback(err)
          return
      }
    })
  })
}

/**
 * Recursively walks a directory, returning a promise that will resolve with
 * a list of all files/directories seen.
 *
 * @param {string} rootPath the directory to walk.
 * @return {!Promise<!Array<{path: string, dir: boolean}>>} a promise that will
 *     resolve with a list of entries seen. For each entry, the recorded path
 *     will be relative to `rootPath`.
 */
function walkDir(rootPath) {
  const seen = []
  return (function walk(dir) {
    return checkedCall((callback) => fs.readdir(dir, callback)).then((files) =>
      Promise.all(
        files.map((file) => {
          file = path.join(dir, file)
          return checkedCall((cb) => fs.stat(file, cb)).then((stats) => {
            seen.push({
              path: path.relative(rootPath, file),
              dir: stats.isDirectory(),
            })
            return stats.isDirectory() && walk(file)
          })
        }),
      ),
    )
  })(rootPath).then(() => seen)
}

// PUBLIC API
module.exports = {
  walkDir,
  rmDir,
  mkdirp,
  mkdir,
  write,
  read,
  findInPath,
  tmpFile,
  tmpDir,
  unlink,
  copy,
  copyDir,
  exists,
  stat,
}
