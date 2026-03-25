#!/usr/bin/env node
'use strict';

/**
 * Dependencies
 */
const {argv} = require('yargs');
const replace = require('../lib/replace-in-file');
const loadConfig = require('../lib/helpers/load-config');
const combineConfig = require('../lib/helpers/combine-config');
const errorHandler = require('../lib/helpers/error-handler');
const successHandler = require('../lib/helpers/success-handler');

/**
 * Main routine
 */
async function main() {

  //Extract parameters
  const {configFile} = argv;

  //Verify arguments
  if (argv._.length < 3 && !configFile) {
    throw new Error('Replace in file needs at least 3 arguments');
  }

  //Load config and combine with passed arguments
  const config = await loadConfig(configFile);
  const options = combineConfig(config, argv);

  //Extract settings
  const {from, to, files, isRegex, verbose, quiet} = options;

  //Single star globs already get expanded in the command line
  options.files = files.reduce((files, file) => {
    return files.concat(file.split(','));
  }, []);

  //If the isRegex flag is passed, convert the from parameter to a RegExp object
  if (isRegex) {
    const flags = from.replace(/.*\/([gimyus]*)$/, '$1');
    const pattern = from.replace(new RegExp(`^/(.*?)/${flags}$`), '$1');
    options.from = new RegExp(pattern, flags);
  }

  //Log
  if (!quiet) {
    console.log(`Replacing '${from}' with '${to}'`);
  }

  //Replace
  const results = replace.sync(options);
  if (!quiet) {
    successHandler(results, verbose);
  }
}

//Call main routine
main().catch(error => errorHandler(error));
