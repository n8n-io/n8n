'use strict';

/**
 * Defaults
 */
const defaults = {
  ignore: [],
  encoding: 'utf-8',
  disableGlobs: false,
  allowEmptyPaths: false,
  countMatches: false,
  isRegex: false,
  verbose: false,
  quiet: false,
  dry: false,
  glob: {},
  cwd: null,
};

/**
 * Parse config
 */
module.exports = function parseConfig(config) {

  //Validate config
  if (typeof config !== 'object' || config === null) {
    throw new Error('Must specify configuration object');
  }

  //Fix glob
  config.glob = config.glob || {};

  //Extract data
  const {files, from, to, processor, ignore, encoding} = config;


  if (typeof processor !== 'undefined') {
    if (typeof processor !== 'function' && !Array.isArray(processor)) {
      throw new Error('Processor should be either a function or an array of functions');
    }
  } else {
    //Validate values
    if (typeof files === 'undefined') {
      throw new Error('Must specify file or files');
    }
    if (typeof from === 'undefined') {
      throw new Error('Must specify string or regex to replace');
    }
    if (typeof to === 'undefined') {
      throw new Error('Must specify a replacement (can be blank string)');
    }
  }

  //Ensure arrays
  if (!Array.isArray(files)) {
    config.files = [files];
  }
  if (!Array.isArray(ignore)) {
    if (typeof ignore === 'undefined') {
      config.ignore = [];
    }
    else {
      config.ignore = [ignore];
    }
  }

  //Use default encoding if invalid
  if (typeof encoding !== 'string' || encoding === '') {
    config.encoding = 'utf-8';
  }

  //Merge config with defaults
  return Object.assign({}, defaults, config);
};
