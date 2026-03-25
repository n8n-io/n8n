"use strict";

const hasLessInterpolation = require("./hasLessInterpolation");
const hasPsvInterpolation = require("./hasPsvInterpolation");
const hasScssInterpolation = require("./hasScssInterpolation");
const hasTplInterpolation = require("./hasTplInterpolation");

/**
 * Check whether a string has interpolation
 *
 * @param {string} string
 * @return {boolean} If `true`, a string has interpolation
 */
module.exports = function (string) {
  // SCSS or Less interpolation
  return !!(
    hasLessInterpolation(string) ||
    hasScssInterpolation(string) ||
    hasTplInterpolation(string) ||
    hasPsvInterpolation(string)
  );
};
