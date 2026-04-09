var colorspace = require('@so-ric/colorspace');

/**
 * Prefix the messages with a colored namespace.
 *
 * @param {Array} messages The messages array that is getting written.
 * @param {Object} options Options for diagnostics.
 * @returns {Array} Altered messages array.
 * @public
 */
module.exports = function colorNamespace(args, options) {
  var namespace = options.namespace;

  if (options.colors === false) {
    args[0] = namespace +': '+ args[0];
    return args;
  }

  var color = colorspace(namespace);

  //
  // The console API supports a special %c formatter in browsers. This is used
  // to style console messages with any CSS styling, in our case we want to
  // use colorize the namespace for clarity. As these are formatters, and
  // we need to inject our CSS string as second messages argument so it
  // gets picked up correctly.
  //
  args[0] = '%c'+ namespace +':%c '+ args[0];
  args.splice(1, 0, 'color:'+ color, 'color:inherit');

  return args;
};
