'use strict';

const path = require('path');

/**
 * @param  {Object} options
 * @param  {String} options.dependency - The dependency name to resolve
 * @param  {String} options.filename - Filename that contains the dependency
 * @param  {String} options.directory - Root of all files
 * @return {String} Absolute/resolved path of the dependency
 */
module.exports = function({ dependency, filename, directory } = {}) {
  if (!dependency) throw new Error('dependency path not given');
  if (!filename) throw new Error('filename not given');
  if (!directory) throw new Error('directory not given');

  const filepath = getDependencyPath(dependency, filename, directory);
  const ext = getDependencyExtension(dependency, filename);

  return filepath + ext;
};

/**
 * @param  {String} dependency
 * @param  {String} filename
 * @param  {String} directory
 * @return {String} Absolute path for the dependency
 */
function getDependencyPath(dependency, filename, directory) {
  if (dependency.startsWith('..') || dependency.startsWith('.')) {
    return path.resolve(path.dirname(filename), dependency);
  }

  return path.resolve(directory, dependency);
}

/**
 * @param  {String} dependency
 * @param  {String} filename
 * @return {String} The determined extension for the dependency (or empty if already supplied)
 */
function getDependencyExtension(dependency, filename) {
  const depExt = path.extname(dependency);
  const fileExt = path.extname(filename);

  if (!depExt) {
    return fileExt;
  }

  // If a dependency starts with a period AND it doesn't already end
  // in .js AND doesn't use a custom plugin, add .js back to path
  if (fileExt === '.js' && depExt !== '.js' && !dependency.includes('!')) {
    return fileExt;
  }

  // If using a SystemJS style plugin
  if (depExt.includes('!')) {
    return depExt.substring(0, depExt.indexOf('!'));
  }

  return '';
}
