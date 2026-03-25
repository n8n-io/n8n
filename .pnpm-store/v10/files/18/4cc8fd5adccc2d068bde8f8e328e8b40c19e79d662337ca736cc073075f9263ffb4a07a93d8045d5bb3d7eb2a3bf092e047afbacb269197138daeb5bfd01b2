'use strict';

/**
 * Checks if a given namespace is allowed by the given variable.
 *
 * @param {String} name namespace that should be included.
 * @param {String} variable Value that needs to be tested.
 * @returns {Boolean} Indication if namespace is enabled.
 * @public
 */
module.exports = function enabled(name, variable) {
  if (!variable) return false;

  var variables = variable.split(/[\s,]+/)
    , i = 0;

  for (; i < variables.length; i++) {
    variable = variables[i].replace('*', '.*?');

    if ('-' === variable.charAt(0)) {
      if ((new RegExp('^'+ variable.substr(1) +'$')).test(name)) {
        return false;
      }

      continue;
    }

    if ((new RegExp('^'+ variable +'$')).test(name)) {
      return true;
    }
  }

  return false;
};
