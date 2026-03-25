/* jshint node: true */

'use strict';

/** Shim without file-system operations. */

function createError() { return new Error('unsupported in the browser'); }

function createImportHook() {
  return function (fpath, kind, cb) { cb(createError()); };
}

function createSyncImportHook() {
  return function () { throw createError(); };
}


module.exports = {
  createImportHook: createImportHook,
  createSyncImportHook: createSyncImportHook,
  existsSync: function () { return false; },
  readFileSync: function () { throw createError(); }
};
