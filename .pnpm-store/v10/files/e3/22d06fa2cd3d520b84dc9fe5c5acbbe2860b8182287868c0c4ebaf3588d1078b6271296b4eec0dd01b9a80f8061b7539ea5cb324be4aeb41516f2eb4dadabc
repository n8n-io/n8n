'use strict';

/**
 * Dependencies
 */
const chalk = require('chalk');

/**
 * Success handler
 */
module.exports = function successHandler(results, verbose) {
  const changed = results.filter(result => result.hasChanged);
  const numChanges = changed.length;
  if (numChanges > 0) {
    console.log(chalk.green(`${numChanges} file(s) were changed`));
    if (verbose) {
      changed.forEach(result => console.log(chalk.grey('-', result.file)));
    }
  }
  else {
    console.log(chalk.yellow('No files were changed'));
  }
};
