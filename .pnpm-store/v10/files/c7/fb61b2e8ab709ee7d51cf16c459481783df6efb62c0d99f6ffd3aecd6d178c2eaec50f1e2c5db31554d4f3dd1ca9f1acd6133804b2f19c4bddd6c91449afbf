'use strict';

/**
 * Dependencies
 */
const chalk = require('chalk');
const parseConfig = require('./helpers/parse-config');
const getPathsSync = require('./helpers/get-paths-sync');
const getPathsAsync = require('./helpers/get-paths-async');
const processSync = require('./helpers/process-sync');
const processAsync = require('./helpers/process-async');

function processFile(config, cb) {

  try {
    config = parseConfig(config);
  }
  catch (error) {
    if (typeof cb === 'function') {
      return cb(error, null);
    }
    return Promise.reject(error);
  }

  const {files, processor, dry, verbose} = config;

  //Dry run?
  //istanbul ignore if: No need to test console logs
  if (dry && verbose) {
    console.log(chalk.yellow('Dry run, not making actual changes'));
  }

  //Find paths
  return getPathsAsync(files, config)

    .then(paths => Promise.all(
      paths.map(file => processAsync(file, processor, config))
    ))
    .then(results => {
      if (typeof cb === 'function') {
        cb(null, results);
      }
      return results;
    })
    .catch(error => {
      if (typeof cb === 'function') {
        cb(error);
      }
      else {
        throw error;
      }
    });
}

/**
 * Sync API
 */
function processFileSync(config) {

  //Parse config
  config = parseConfig(config);

  //Get config, paths, and initialize changed files
  const {files, processor, dry, verbose} = config;
  const paths = getPathsSync(files, config);

  //Dry run?
  //istanbul ignore if: No need to test console logs
  if (dry && verbose) {
    console.log(chalk.yellow('Dry run, not making actual changes'));
  }

  //Process synchronously and return results
  return paths.map(path => processSync(path, processor, config));
}

// Self-reference to support named import
processFile.processFile = processFile;
processFile.processFileSync = processFileSync;
processFile.sync = processFileSync;

//Export
module.exports = processFile;
