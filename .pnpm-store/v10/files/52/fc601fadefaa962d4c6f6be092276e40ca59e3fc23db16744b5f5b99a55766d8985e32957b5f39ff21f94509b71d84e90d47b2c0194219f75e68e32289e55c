'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.logValidationWarning =
  exports.formatPrettyObject =
  exports.format =
  exports.createDidYouMeanMessage =
  exports.WARNING =
  exports.ValidationError =
  exports.ERROR =
  exports.DEPRECATION =
    void 0;
function _chalk() {
  const data = _interopRequireDefault(require('chalk'));
  _chalk = function () {
    return data;
  };
  return data;
}
function _leven() {
  const data = _interopRequireDefault(require('leven'));
  _leven = function () {
    return data;
  };
  return data;
}
function _prettyFormat() {
  const data = require('pretty-format');
  _prettyFormat = function () {
    return data;
  };
  return data;
}
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {default: obj};
}
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const BULLET = _chalk().default.bold('\u25cf');
const DEPRECATION = `${BULLET} Deprecation Warning`;
exports.DEPRECATION = DEPRECATION;
const ERROR = `${BULLET} Validation Error`;
exports.ERROR = ERROR;
const WARNING = `${BULLET} Validation Warning`;
exports.WARNING = WARNING;
const format = value =>
  typeof value === 'function'
    ? value.toString()
    : (0, _prettyFormat().format)(value, {
        min: true
      });
exports.format = format;
const formatPrettyObject = value =>
  typeof value === 'function'
    ? value.toString()
    : typeof value === 'undefined'
    ? 'undefined'
    : JSON.stringify(value, null, 2).split('\n').join('\n    ');
exports.formatPrettyObject = formatPrettyObject;
class ValidationError extends Error {
  name;
  message;
  constructor(name, message, comment) {
    super();
    comment = comment ? `\n\n${comment}` : '\n';
    this.name = '';
    this.message = _chalk().default.red(
      `${_chalk().default.bold(name)}:\n\n${message}${comment}`
    );
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    Error.captureStackTrace(this, () => {});
  }
}
exports.ValidationError = ValidationError;
const logValidationWarning = (name, message, comment) => {
  comment = comment ? `\n\n${comment}` : '\n';
  console.warn(
    _chalk().default.yellow(
      `${_chalk().default.bold(name)}:\n\n${message}${comment}`
    )
  );
};
exports.logValidationWarning = logValidationWarning;
const createDidYouMeanMessage = (unrecognized, allowedOptions) => {
  const suggestion = allowedOptions.find(option => {
    const steps = (0, _leven().default)(option, unrecognized);
    return steps < 3;
  });
  return suggestion
    ? `Did you mean ${_chalk().default.bold(format(suggestion))}?`
    : '';
};
exports.createDidYouMeanMessage = createDidYouMeanMessage;
