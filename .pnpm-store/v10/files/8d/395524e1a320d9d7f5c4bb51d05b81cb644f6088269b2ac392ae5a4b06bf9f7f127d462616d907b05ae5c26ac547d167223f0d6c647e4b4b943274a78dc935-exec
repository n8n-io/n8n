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

const jszip = require('jszip')
const path = require('node:path')

const io = require('./index')
const { InvalidArgumentError } = require('../lib/error')

/**
 * Manages a zip archive.
 */
class Zip {
  constructor() {
    /** @private @const */
    this.z_ = new jszip()

    /** @private @const {!Set<!Promise<?>>} */
    this.pendingAdds_ = new Set()
  }

  /**
   * Adds a file to this zip.
   *
   * @param {string} filePath path to the file to add.
   * @param {string=} zipPath path to the file in the zip archive, defaults
   *     to the basename of `filePath`.
   * @return {!Promise<?>} a promise that will resolve when added.
   */
  addFile(filePath, zipPath = path.basename(filePath)) {
    let add = io
      .read(filePath)
      .then((buffer) => this.z_.file(/** @type {string} */ (zipPath.replace(/\\/g, '/')), buffer))
    this.pendingAdds_.add(add)
    return add.then(
      () => this.pendingAdds_.delete(add),
      (e) => {
        this.pendingAdds_.delete(add)
        throw e
      },
    )
  }

  /**
   * Recursively adds a directory and all of its contents to this archive.
   *
   * @param {string} dirPath path to the directory to add.
   * @param {string=} zipPath path to the folder in the archive to add the
   *     directory contents to. Defaults to the root folder.
   * @return {!Promise<?>} returns a promise that will resolve when
   * the operation is complete.
   */
  addDir(dirPath, zipPath = '') {
    return io.walkDir(dirPath).then((entries) => {
      let archive = this.z_
      if (zipPath) {
        archive = archive.folder(zipPath)
      }

      let files = []
      entries.forEach((spec) => {
        if (spec.dir) {
          archive.folder(spec.path)
        } else {
          files.push(this.addFile(path.join(dirPath, spec.path), path.join(zipPath, spec.path)))
        }
      })

      return Promise.all(files)
    })
  }

  /**
   * @param {string} path File path to test for within the archive.
   * @return {boolean} Whether this zip archive contains an entry with the given
   *     path.
   */
  has(path) {
    return this.z_.file(path) !== null
  }

  /**
   * Returns the contents of the file in this zip archive with the given `path`.
   * The returned promise will be rejected with an {@link InvalidArgumentError}
   * if either `path` does not exist within the archive, or if `path` refers
   * to a directory.
   *
   * @param {string} path the path to the file whose contents to return.
   * @return {!Promise<!Buffer>} a promise that will be resolved with the file's
   *     contents as a buffer.
   */
  getFile(path) {
    let file = this.z_.file(path)
    if (!file) {
      return Promise.reject(new InvalidArgumentError(`No such file in zip archive: ${path}`))
    }

    if (file.dir) {
      return Promise.reject(new InvalidArgumentError(`The requested file is a directory: ${path}`))
    }

    return Promise.resolve(file.async('nodebuffer'))
  }

  /**
   * Returns the compressed data for this archive in a buffer. _This method will
   * not wait for any outstanding {@link #addFile add}
   * {@link #addDir operations} before encoding the archive._
   *
   * @param {string} compression The desired compression.
   *     Must be `STORE` (the default) or `DEFLATE`.
   * @return {!Promise<!Buffer>} a promise that will resolve with this archive
   *     as a buffer.
   */
  toBuffer(compression = 'STORE') {
    if (compression !== 'STORE' && compression !== 'DEFLATE') {
      return Promise.reject(new InvalidArgumentError(`compression must be one of {STORE, DEFLATE}, got ${compression}`))
    }
    return Promise.resolve(this.z_.generateAsync({ compression, type: 'nodebuffer' }))
  }
}

/**
 * Asynchronously opens a zip archive.
 *
 * @param {string} path to the zip archive to load.
 * @return {!Promise<!Zip>} a promise that will resolve with the opened
 *     archive.
 */
function load(path) {
  return io.read(path).then((data) => {
    let zip = new Zip()
    return zip.z_.loadAsync(data).then(() => zip)
  })
}

/**
 * Asynchronously unzips an archive file.
 *
 * @param {string} src path to the source file to unzip.
 * @param {string} dst path to the destination directory.
 * @return {!Promise<string>} a promise that will resolve with `dst` once the
 *     archive has been unzipped.
 */
function unzip(src, dst) {
  return load(src).then((zip) => {
    const promisedDirs = new Map()
    const promises = []

    zip.z_.forEach((relPath, file) => {
      let p
      if (file.dir) {
        p = createDir(relPath)
      } else {
        let dirname = path.dirname(relPath)
        if (dirname === '.') {
          p = writeFile(relPath, file)
        } else {
          p = createDir(dirname).then(() => writeFile(relPath, file))
        }
      }
      promises.push(p)
    })

    return Promise.all(promises).then(() => dst)

    function createDir(dir) {
      let p = promisedDirs.get(dir)
      if (!p) {
        p = io.mkdirp(path.join(dst, dir))
        promisedDirs.set(dir, p)
      }
      return p
    }

    function writeFile(relPath, file) {
      return file.async('nodebuffer').then((buffer) => io.write(path.join(dst, relPath), buffer))
    }
  })
}

// PUBLIC API
module.exports = { Zip, load, unzip }
