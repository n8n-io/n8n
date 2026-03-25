'use strict';

var _require = require('./colorize'),
  Colorizer = _require.Colorizer;

/*
 * Simple method to register colors with a simpler require
 * path within the module.
 */
module.exports = function (config) {
  Colorizer.addColors(config.colors || config);
  return config;
};