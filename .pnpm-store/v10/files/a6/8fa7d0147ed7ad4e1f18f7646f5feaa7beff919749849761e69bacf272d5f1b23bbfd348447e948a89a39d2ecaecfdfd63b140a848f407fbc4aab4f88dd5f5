'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.errorMessage = void 0;
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
var _condition = require('./condition');
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

const errorMessage = (option, received, defaultValue, options, path) => {
  const conditions = (0, _condition.getValues)(defaultValue);
  const validTypes = Array.from(
    new Set(conditions.map(_jestGetType().getType))
  );
  const message = `  Option ${_chalk().default.bold(
    `"${path && path.length > 0 ? `${path.join('.')}.` : ''}${option}"`
  )} must be of type:
    ${validTypes.map(e => _chalk().default.bold.green(e)).join(' or ')}
  but instead received:
    ${_chalk().default.bold.red((0, _jestGetType().getType)(received))}

  Example:
${formatExamples(option, conditions)}`;
  const comment = options.comment;
  const name = (options.title && options.title.error) || _utils.ERROR;
  throw new _utils.ValidationError(name, message, comment);
};
exports.errorMessage = errorMessage;
function formatExamples(option, examples) {
  return examples.map(
    e => `  {
    ${_chalk().default.bold(`"${option}"`)}: ${_chalk().default.bold(
      (0, _utils.formatPrettyObject)(e)
    )}
  }`
  ).join(`

  or

`);
}
