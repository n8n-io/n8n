'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { debuglog } = require('node:util');
const cabinet = require('filing-cabinet');
const precinct = require('precinct');
const Config = require('./lib/config.js');

const debug = debuglog('tree');

/**
 * Recursively find all dependencies (avoiding circular) traversing the entire dependency tree
 * and returns a flat list of all unique, visited nodes
 *
 * @param {Object} options
 * @param {String} options.filename - The path of the module whose tree to traverse
 * @param {String} options.directory - The directory containing all JS files
 * @param {String} [options.requireConfig] - The path to a requirejs config
 * @param {String} [options.webpackConfig] - The path to a webpack config
 * @param {String} [options.nodeModulesConfig] - config for resolving entry file for node_modules
 * @param {Object} [options.visited] - Cache of visited, absolutely pathed files that should not be reprocessed.
 *                                     Format is a filename -> tree as list lookup table
 * @param {Array} [options.nonExistent] - List of partials that do not exist
 * @param {Boolean} [options.isListForm=false]
 * @param {String|Object} [options.tsConfig] Path to a typescript config (or a preloaded one).
 * @param {Boolean} [options.noTypeDefinitions] For TypeScript imports, whether to resolve to `*.js` instead of `*.d.ts`.
 * @return {Object}
 */
module.exports = function(options = {}) {
  const config = new Config(options);

  if (!fs.existsSync(config.filename)) {
    debug(`file ${config.filename} does not exist`);
    return config.isListForm ? [] : {};
  }

  const results = traverse(config);
  debug('traversal complete', results);

  dedupeNonExistent(config.nonExistent);
  debug('deduped list of nonExistent partials: ', config.nonExistent);

  let tree;
  if (config.isListForm) {
    debug('list form of results requested');
    tree = [...results];
  } else {
    debug('object form of results requested');
    tree = {};
    tree[config.filename] = results;
  }

  debug('final tree', tree);
  return tree;
};

/**
 * Executes a post-order depth first search on the dependency tree and returns a
 * list of absolute file paths. The order of files in the list will be the
 * proper concatenation order for bundling.
 *
 * In other words, for any file in the list, all of that file's dependencies (direct or indirect) will appear at
 * lower indices in the list. The root (entry point) file will therefore appear last.
 *
 * The list will not contain duplicates.
 *
 * Params are those of module.exports
 */
module.exports.toList = function(options = {}) {
  options.isListForm = true;

  return module.exports(options);
};

/**
 * Returns the list of dependencies for the given filename
 *
 * Protected for testing
 *
 * @param  {Config} config
 * @return {Array}
 */
module.exports._getDependencies = function(config = {}) {
  const precinctOptions = config.detectiveConfig;
  precinctOptions.includeCore = false;
  let dependencies;

  try {
    dependencies = precinct.paperwork(config.filename, precinctOptions);
    debug(`extracted ${dependencies.length} dependencies: `, dependencies);
  } catch (error) {
    debug(`error getting dependencies: ${error.message}`);
    debug(error.stack);
    return [];
  }

  const resolvedDependencies = [];

  for (const dependency of dependencies) {
    const result = cabinet({
      partial: dependency,
      filename: config.filename,
      directory: config.directory,
      ast: precinct.ast,
      config: config.requireConfig,
      webpackConfig: config.webpackConfig,
      nodeModulesConfig: config.nodeModulesConfig,
      tsConfig: config.tsConfig,
      tsConfigPath: config.tsConfigPath,
      noTypeDefinitions: config.noTypeDefinitions
    });

    if (!result) {
      debug(`skipping an empty filepath resolution for partial: ${dependency}`);
      config.nonExistent.push(dependency);
      continue;
    }

    const exists = fs.existsSync(result);

    if (!exists) {
      config.nonExistent.push(dependency);
      debug(`skipping non-empty but non-existent resolution: ${result} for partial: ${dependency}`);
      continue;
    }

    resolvedDependencies.push(result);
  }

  return resolvedDependencies;
};

/**
 * @param  {Config} config
 * @return {Object|Set}
 */
function traverse(config = {}) {
  const subTree = config.isListForm ? new Set() : {};

  debug(`traversing ${config.filename}`);

  if (config.visited[config.filename]) {
    debug(`already visited ${config.filename}`);
    return config.visited[config.filename];
  }

  let dependencies = module.exports._getDependencies(config);

  debug('cabinet-resolved all dependencies: ', dependencies);
  // Prevents cycles by eagerly marking the current file as read
  // so that any dependent dependencies exit
  config.visited[config.filename] = config.isListForm ? [] : {};

  if (config.filter) {
    debug('using filter function to filter out dependencies');
    debug(`unfiltered number of dependencies: ${dependencies.length}`);
    // eslint-disable-next-line unicorn/no-array-method-this-argument, unicorn/no-array-callback-reference
    dependencies = dependencies.filter(filePath => config.filter(filePath, config.filename));
    debug(`filtered number of dependencies: ${dependencies.length}`);
  }

  for (const dependency of dependencies) {
    const localConfig = config.clone();
    localConfig.filename = dependency;
    localConfig.directory = getDirectory(localConfig);

    if (localConfig.isListForm) {
      for (const item of traverse(localConfig)) {
        subTree.add(item);
      }
    } else {
      subTree[dependency] = traverse(localConfig);
    }
  }

  if (config.isListForm) {
    subTree.add(config.filename);
    config.visited[config.filename].push(...subTree);
  } else {
    config.visited[config.filename] = subTree;
  }

  return subTree;
}

// Mutate the list input to do a dereferenced modification of the user-supplied list
function dedupeNonExistent(nonExistent) {
  const deduped = new Set(nonExistent);
  nonExistent.length = deduped.size;

  let i = 0;
  for (const elem of deduped) {
    nonExistent[i] = elem;
    i++;
  }
}

// If the file is in a node module, use the root directory of the module
function getDirectory(localConfig) {
  if (!localConfig.filename.includes('node_modules')) {
    return localConfig.directory;
  }

  return getProjectPath(path.dirname(localConfig.filename)) || localConfig.directory;
}

function getProjectPath(filename) {
  try {
    const nodeModuleParts = filename.split('node_modules');
    const packageSubPathPath = nodeModuleParts.pop().split(path.sep).filter(Boolean);
    const packageName = packageSubPathPath[0].startsWith('@') ? `${packageSubPathPath[0]}${path.sep}${packageSubPathPath[1]}` : packageSubPathPath[0];

    return path.normalize([...nodeModuleParts, `${path.sep}${packageName}`].join('node_modules'));
  } catch {
    debug(`Could not determine the root directory of package file ${filename}. Using default`);
    return null;
  }
}
