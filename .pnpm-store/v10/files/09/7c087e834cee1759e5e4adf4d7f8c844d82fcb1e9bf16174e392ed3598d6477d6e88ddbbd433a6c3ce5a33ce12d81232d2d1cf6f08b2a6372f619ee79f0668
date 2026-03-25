'use strict';

/**
 * Dependencies
 */
const fs = require('fs');
const runProcessors = require('./run-processors');

/**
 * Helper to process in a single file (async)
 */
module.exports = function processAsync(file, processor, config) {

  //Extract relevant config
  const {encoding, dry} = config;

  //Wrap in promise
  return new Promise((resolve, reject) => {
    fs.readFile(file, encoding, (error, contents) => {
      //istanbul ignore if
      if (error) {
        return reject(error);
      }

      //Make replacements
      const [result, newContents] = runProcessors(
        contents, processor, file,
      );

      //Not changed or dry run?
      if (!result.hasChanged || dry) {
        return resolve(result);
      }

      //Write to file
      fs.writeFile(file, newContents, encoding, error => {
        //istanbul ignore if
        if (error) {
          return reject(error);
        }
        resolve(result);
      });
    });
  });
};
