"use strict";

const matchesStringOrRegExp = require("./matchesStringOrRegExp");

/**
 * Check if an options object's propertyName contains a user-defined string or
 * regex that matches the passed in input.
 *
 * @param {{ [x: string]: any; }} options
 * @param {string} propertyName
 * @param {unknown} input
 *
 * @returns {boolean}
 */
module.exports = function optionsMatches(options, propertyName, input) {
  return Boolean(
    options &&
      options[propertyName] &&
      typeof input === "string" &&
      matchesStringOrRegExp(input, options[propertyName])
  );
};
