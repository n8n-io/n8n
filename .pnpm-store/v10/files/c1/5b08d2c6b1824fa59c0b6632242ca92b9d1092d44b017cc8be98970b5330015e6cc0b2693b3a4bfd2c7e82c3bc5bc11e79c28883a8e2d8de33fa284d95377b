'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.createArrayReporterError = createArrayReporterError;
exports.createReporterError = createReporterError;
exports.validateReporters = validateReporters;
function _chalk() {
  const data = _interopRequireDefault(require('chalk'));
  _chalk = function () {
    return data;
  };
  return data;
}
function _jestGetType() {
  const data = require('jest-get-type');
  _jestGetType = function () {
    return data;
  };
  return data;
}
function _jestValidate() {
  const data = require('jest-validate');
  _jestValidate = function () {
    return data;
  };
  return data;
}
var _utils = require('./utils');
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {default: obj};
}
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const validReporterTypes = ['array', 'string'];
const ERROR = `${_utils.BULLET}Reporter Validation Error`;

/**
 * Reporter Validation Error is thrown if the given arguments
 * within the reporter are not valid.
 *
 * This is a highly specific reporter error and in the future will be
 * merged with jest-validate. Till then, we can make use of it. It works
 * and that's what counts most at this time.
 */
function createReporterError(reporterIndex, reporterValue) {
  const errorMessage =
    `  Reporter at index ${reporterIndex} must be of type:\n` +
    `    ${_chalk().default.bold.green(validReporterTypes.join(' or '))}\n` +
    '  but instead received:\n' +
    `    ${_chalk().default.bold.red(
      (0, _jestGetType().getType)(reporterValue)
    )}`;
  return new (_jestValidate().ValidationError)(
    ERROR,
    errorMessage,
    _utils.DOCUMENTATION_NOTE
  );
}
function createArrayReporterError(
  arrayReporter,
  reporterIndex,
  valueIndex,
  value,
  expectedType,
  valueName
) {
  const errorMessage =
    `  Unexpected value for ${valueName} ` +
    `at index ${valueIndex} of reporter at index ${reporterIndex}\n` +
    '  Expected:\n' +
    `    ${_chalk().default.bold.red(expectedType)}\n` +
    '  Got:\n' +
    `    ${_chalk().default.bold.green((0, _jestGetType().getType)(value))}\n` +
    '  Reporter configuration:\n' +
    `    ${_chalk().default.bold.green(
      JSON.stringify(arrayReporter, null, 2).split('\n').join('\n    ')
    )}`;
  return new (_jestValidate().ValidationError)(
    ERROR,
    errorMessage,
    _utils.DOCUMENTATION_NOTE
  );
}
function validateReporters(reporterConfig) {
  return reporterConfig.every((reporter, index) => {
    if (Array.isArray(reporter)) {
      validateArrayReporter(reporter, index);
    } else if (typeof reporter !== 'string') {
      throw createReporterError(index, reporter);
    }
    return true;
  });
}
function validateArrayReporter(arrayReporter, reporterIndex) {
  const [path, options] = arrayReporter;
  if (typeof path !== 'string') {
    throw createArrayReporterError(
      arrayReporter,
      reporterIndex,
      0,
      path,
      'string',
      'Path'
    );
  } else if (typeof options !== 'object') {
    throw createArrayReporterError(
      arrayReporter,
      reporterIndex,
      1,
      options,
      'object',
      'Reporter Configuration'
    );
  }
}
