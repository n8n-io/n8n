'use strict';

const fs = require('fs');
const path = require('path');
const { debuglog } = require('util');

const debug = debuglog('stylus-lookup');

/**
 * Determines the resolved dependency path according to
 * the Stylus compiler's dependency lookup behavior
 *
 * @param  {Object} options
 * @param  {String} options.dependency - the import name
 * @param  {String} options.filename - the file containing the import
 * @param  {String} options.directory - the location of all stylus files
 * @return {String}
 */
module.exports = function({ dependency, filename, directory } = {}) {
  if (dependency === undefined) throw new Error('dependency is not supplied');
  if (filename === undefined) throw new Error('filename is not supplied');
  if (directory === undefined) throw new Error('directory is not supplied');

  const fileDir = path.dirname(filename);

  debug(`trying to resolve: ${dependency}`);
  debug(`filename: ${filename}`);
  debug(`directory: ${directory}`);

  // Use the file's extension if necessary
  const ext = path.extname(dependency) ? '' : path.extname(filename);

  if (!path.isAbsolute(dependency)) {
    const resolved = path.resolve(filename, dependency) + ext;

    debug(`resolved relative dependency: ${resolved}`);

    if (fs.existsSync(resolved)) return resolved;

    debug('resolved file does not exist');
  }

  const sameDir = path.resolve(fileDir, dependency) + ext;
  debug(`resolving dependency about the parent file's directory: ${sameDir}`);

  if (fs.existsSync(sameDir)) return sameDir;

  debug(`resolved file does not exist: ${sameDir}`);

  // Check for dependency/index.styl file
  const indexFile = path.join(path.resolve(fileDir, dependency), 'index.styl');
  debug(`resolving dependency as if it points to an index.styl file: ${indexFile}`);

  if (fs.existsSync(indexFile)) return indexFile;

  debug(`resolved file does not exist: ${indexFile}`);
  debug('could not resolve the dependency');

  return '';
};
