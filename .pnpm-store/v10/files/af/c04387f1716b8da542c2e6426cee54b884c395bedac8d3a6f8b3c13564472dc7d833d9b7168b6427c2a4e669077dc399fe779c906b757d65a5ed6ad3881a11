'use strict';

/**
 * Dependencies
 */
const parseConfig = require('./parse-config');

/**
 * Combine CLI script arguments with config options
 */
module.exports = function combineConfig(config, argv) {

  //Extract options from config
  let {
    from, to, files, ignore, encoding, verbose,
    allowEmptyPaths, disableGlobs, isRegex, dry, quiet,
  } = config;

  //Get from/to parameters from CLI args if not defined in options
  if (typeof from === 'undefined') {
    from = argv._.shift();
  }
  if (typeof to === 'undefined') {
    to = argv._.shift();
  }

  //Get files and ignored files
  if (typeof files === 'undefined') {
    files = argv._;
  }
  if (typeof ignore === 'undefined' && typeof argv.ignore !== 'undefined') {
    ignore = argv.ignore;
  }

  //Other parameters
  if (typeof encoding === 'undefined') {
    encoding = argv.encoding;
  }
  if (typeof disableGlobs === 'undefined') {
    disableGlobs = !!argv.disableGlobs;
  }
  if (typeof isRegex === 'undefined') {
    isRegex = !!argv.isRegex;
  }
  if (typeof verbose === 'undefined') {
    verbose = !!argv.verbose;
  }
  if (typeof dry === 'undefined') {
    dry = !!argv.dry;
  }
  if (typeof quiet === 'undefined') {
    quiet = !!argv.quiet;
  }

  //Return through parser to validate
  return parseConfig({
    from, to, files, ignore, encoding, verbose,
    allowEmptyPaths, disableGlobs, isRegex, dry, quiet,
  });
};
