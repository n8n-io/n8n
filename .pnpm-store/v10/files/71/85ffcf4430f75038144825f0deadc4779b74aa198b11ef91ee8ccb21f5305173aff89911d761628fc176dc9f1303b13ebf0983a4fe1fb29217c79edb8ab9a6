'use strict';

/**
 * Dependencies
 */
const fs = require('fs');
const runProcessors = require('./run-processors');

/**
 * Helper to process in a single file (sync)
 */
module.exports = function processSync(file, processor, config) {

  //Extract relevant config and read file contents
  const {encoding, dry} = config;
  const contents = fs.readFileSync(file, encoding);

  //Process contents and check if anything changed
  const [result, newContents] = runProcessors(
    contents, processor, file,
  );

  //Contents changed and not a dry run? Write to file
  if (result.hasChanged && !dry) {
    fs.writeFileSync(file, newContents, encoding);
  }

  //Return result
  return result;
};
