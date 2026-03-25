'use strict';

/*
 * @api public
 * @property {function} format
 * Both the construction method and set of exposed
 * formats.
 */
const format = exports.format = require('./format');

/*
 * @api public
 * @method {function} levels
 * Registers the specified levels with logform.
 */
exports.levels = require('./levels');

/*
 * @api private
 * method {function} exposeFormat
 * Exposes a sub-format on the main format object
 * as a lazy-loaded getter.
 */
function exposeFormat(name, requireFormat) {
  Object.defineProperty(format, name, {
    get() {
      return requireFormat();
    },
    configurable: true
  });
}

//
// Setup all transports as lazy-loaded getters.
//
exposeFormat('align', function () { return require('./align'); });
exposeFormat('errors', function () { return require('./errors'); });
exposeFormat('cli', function () { return require('./cli'); });
exposeFormat('combine', function () { return require('./combine'); });
exposeFormat('colorize', function () { return require('./colorize'); });
exposeFormat('json', function () { return require('./json'); });
exposeFormat('label', function () { return require('./label'); });
exposeFormat('logstash', function () { return require('./logstash'); });
exposeFormat('metadata', function () { return require('./metadata'); });
exposeFormat('ms', function () { return require('./ms'); });
exposeFormat('padLevels', function () { return require('./pad-levels'); });
exposeFormat('prettyPrint', function () { return require('./pretty-print'); });
exposeFormat('printf', function () { return require('./printf'); });
exposeFormat('simple', function () { return require('./simple'); });
exposeFormat('splat', function () { return require('./splat'); });
exposeFormat('timestamp', function () { return require('./timestamp'); });
exposeFormat('uncolorize', function () { return require('./uncolorize'); });
