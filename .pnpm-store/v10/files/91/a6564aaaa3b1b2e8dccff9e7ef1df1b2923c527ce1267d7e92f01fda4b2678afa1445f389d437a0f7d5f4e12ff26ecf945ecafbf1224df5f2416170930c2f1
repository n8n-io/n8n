/* jshint browserify: true */

'use strict';

/**
 * Optional entry point for browser builds.
 *
 * To use it: `require('avsc/etc/browser/avsc-types')`.
 */

var types = require('../../lib/types');


/** Basic parse method, only supporting JSON parsing. */
function parse(any, opts) {
  var schema;
  if (typeof any == 'string') {
    try {
      schema = JSON.parse(any);
    } catch (err) {
      schema = any;
    }
  } else {
    schema = any;
  }
  return types.Type.forSchema(schema, opts);
}


module.exports = {
  Type: types.Type,
  parse: parse,
  types: types.builtins,
  // Deprecated exports (not using `util.deprecate` since it causes stack
  // overflow errors in the browser).
  combine: types.Type.forTypes,
  infer: types.Type.forValue
};
