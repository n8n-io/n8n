var colorspace = require('colorspace');
var kuler = require('kuler');

/**
 * Prefix the messages with a colored namespace.
 *
 * @param {Array} args The messages array that is getting written.
 * @param {Object} options Options for diagnostics.
 * @returns {Array} Altered messages array.
 * @public
 */
module.exports = function ansiModifier(args, options) {
  var namespace = options.namespace;
  var ansi = options.colors !== false
  ? kuler(namespace +':', colorspace(namespace))
  : namespace +':';

  args[0] = ansi +' '+ args[0];
  return args;
};
