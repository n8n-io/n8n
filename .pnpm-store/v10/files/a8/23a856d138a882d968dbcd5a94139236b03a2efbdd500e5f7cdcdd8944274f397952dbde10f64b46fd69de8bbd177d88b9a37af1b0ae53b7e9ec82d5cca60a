'use strict';

const fs = require('fs');
const Walker = require('node-source-walk');
const types = require('ast-module-types');

/**
 * Determines the type of the module from the supplied source code or AST
 *
 * @param  {String|Object} source - The string content or AST of a file
 * @return {String}
 */
function fromSource(source) {
  if (source === undefined) throw new Error('source not supplied');

  const walker = new Walker();
  let type = 'none';
  let hasDefine = false;
  let hasAMDTopLevelRequire = false;
  let hasRequire = false;
  let hasExports = false;
  let hasES6Import = false;
  let hasES6Export = false;
  const hasDynamicImport = false;

  // Walker accepts as AST to avoid reparsing
  walker.walk(source, node => {
    if (types.isDefineAMD(node)) hasDefine = true;
    if (types.isRequire(node)) hasRequire = true;
    if (types.isExports(node)) hasExports = true;
    if (types.isAMDDriverScriptRequire(node)) hasAMDTopLevelRequire = true;
    if (types.isES6Import(node)) hasES6Import = true;
    if (types.isES6Export(node)) hasES6Export = true;

    if (hasES6Import || hasES6Export || hasDynamicImport) {
      type = 'es6';
      walker.stopWalking();
      return;
    }

    if (hasDefine || hasAMDTopLevelRequire) {
      type = 'amd';
      walker.stopWalking();
      return;
    }

    if (hasExports || (hasRequire && !hasDefine)) {
      type = 'commonjs';
      walker.stopWalking();
    }
  });

  return type;
}

/**
 * Synchronously determine the module type for the contents of the passed filepath
 *
 * @param  {String} filepath
 * @param  {Object} options
 * @return {String}
 */
function sync(filepath, options = {}) {
  if (!filepath) throw new Error('filename missing');

  const fileSystem = options.fileSystem ?? fs;
  const data = fileSystem.readFileSync(filepath, 'utf8');

  return fromSource(data);
}

/**
 * Asynchronously determines the module type for the contents of the given filepath
 *
 * @param  {String}   filepath
 * @param  {Function} callback - Executed with (error, type)
 * @param  {Object}   options
 */
module.exports = function(filepath, callback, options = {}) {
  if (!filepath) throw new Error('filename missing');
  if (!callback) throw new Error('callback missing');

  const fileSystem = options.fileSystem ?? fs;

  // eslint-disable-next-line n/prefer-promises/fs
  fileSystem.readFile(filepath, 'utf8', (error, data) => {
    if (error) return callback(error);

    let type;

    try {
      type = fromSource(data);
    } catch (error) {
      return callback(error);
    }

    callback(null, type);
  });
};

module.exports.sync = sync;
module.exports.fromSource = fromSource;
