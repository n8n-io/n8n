/**
 * index.js: Default settings for all levels that winston knows about.
 *
 * (C) 2010 Charlie Robbins
 * MIT LICENCE
 */

'use strict';

var logform = require('logform');
var _require = require('triple-beam'),
  configs = _require.configs;

/**
 * Export config set for the CLI.
 * @type {Object}
 */
exports.cli = logform.levels(configs.cli);

/**
 * Export config set for npm.
 * @type {Object}
 */
exports.npm = logform.levels(configs.npm);

/**
 * Export config set for the syslog.
 * @type {Object}
 */
exports.syslog = logform.levels(configs.syslog);

/**
 * Hoist addColors from logform where it was refactored into in winston@3.
 * @type {Object}
 */
exports.addColors = logform.levels;