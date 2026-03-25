'use strict';

/**
 * Dependencies
 */
const path = require('path');

/**
 * Helper to load options from a config file
 */
module.exports = function loadConfig(file) {

  //No config file provided?
  if (!file) {
    return {};
  }

  //Resolve path
  file = path.resolve(file);

  //Try to load
  return require(file);
};
