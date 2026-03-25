"use strict";

/**
 * Create configurationError from text and set CLI exit code
 *
 * @param {string} text
 * @return {Error} - The error, with text and exit code
 */
module.exports = function (text) {
  const err = new Error(text);

  err.code = 78;

  return err;
};
