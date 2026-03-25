/* jshint node: true */

'use strict';

/**
 * Filesystem specifics.
 *
 * This module contains functions only used by node.js. It is shimmed by
 * another module when `avsc` is required from `browserify`.
 */

var fs = require('fs'),
    path = require('path');

/** Default (asynchronous) file loading function for assembling IDLs. */
function createImportHook() {
  var imports = {};
  return function (fpath, kind, cb) {
    fpath = path.resolve(fpath);
    if (imports[fpath]) {
      // Already imported, return nothing to avoid duplicating attributes.
      process.nextTick(cb);
      return;
    }
    imports[fpath] = true;
    fs.readFile(fpath, {encoding: 'utf8'}, cb);
  };
}

/**
 * Synchronous file loading function for assembling IDLs.
 *
 * This is only for internal use (inside `specs.parse`). The returned
 * hook should only be called on paths that are guaranteed to exist (where
 * `fs.readFileSync` will not throw, otherwise the calling `assemble` call will
 * throw rather than return the error to the callback).
 */
function createSyncImportHook() {
  var imports = {};
  return function (fpath, kind, cb) {
    fpath = path.resolve(fpath);
    if (imports[fpath]) {
      cb();
    } else {
      imports[fpath] = true;
      cb(null, fs.readFileSync(fpath, {encoding: 'utf8'}));
    }
  };
}


module.exports = {
  createImportHook: createImportHook,
  createSyncImportHook: createSyncImportHook,
  // Proxy a few methods to better shim them for browserify.
  existsSync: fs.existsSync,
  readFileSync: fs.readFileSync
};
