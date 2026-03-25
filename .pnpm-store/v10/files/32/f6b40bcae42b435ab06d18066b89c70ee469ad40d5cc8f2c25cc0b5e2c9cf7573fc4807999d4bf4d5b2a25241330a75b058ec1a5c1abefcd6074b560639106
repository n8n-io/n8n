'use strict';

/*
 * @api public
 * @property {function} format
 * Both the construction method and set of exposed
 * formats.
 */
var format = exports.format = require('././format');

/*
 * @api public
 * @method {function} levels
 * Registers the specified levels with logform.
 */
exports.levels = require('././levels');

//
// Setup all transports as eager-loaded exports
// so that they are static for the bundlers.
//
Object.defineProperty(format, 'align', {
  value: require('./align')
});
Object.defineProperty(format, 'cli', {
  value: require('./cli')
});
Object.defineProperty(format, 'colorize', {
  value: require('./colorize')
});
Object.defineProperty(format, 'combine', {
  value: require('./combine')
});
Object.defineProperty(format, 'errors', {
  value: require('./errors')
});
Object.defineProperty(format, 'json', {
  value: require('./json')
});
Object.defineProperty(format, 'label', {
  value: require('./label')
});
Object.defineProperty(format, 'logstash', {
  value: require('./logstash')
});
Object.defineProperty(format, 'metadata', {
  value: require('./metadata')
});
Object.defineProperty(format, 'ms', {
  value: require('./ms')
});
Object.defineProperty(format, 'padLevels', {
  value: require('./pad-levels')
});
Object.defineProperty(format, 'prettyPrint', {
  value: require('./pretty-print')
});
Object.defineProperty(format, 'printf', {
  value: require('./printf')
});
Object.defineProperty(format, 'simple', {
  value: require('./simple')
});
Object.defineProperty(format, 'splat', {
  value: require('./splat')
});
Object.defineProperty(format, 'timestamp', {
  value: require('./timestamp')
});
Object.defineProperty(format, 'uncolorize', {
  value: require('./uncolorize')
});