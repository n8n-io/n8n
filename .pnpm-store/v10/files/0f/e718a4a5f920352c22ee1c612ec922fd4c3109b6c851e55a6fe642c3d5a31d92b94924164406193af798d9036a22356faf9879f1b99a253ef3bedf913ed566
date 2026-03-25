'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.unknownOptionWarning = void 0;
function _chalk() {
  const data = _interopRequireDefault(require('chalk'));
  _chalk = function () {
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

const unknownOptionWarning = (config, exampleConfig, option, options, path) => {
  const didYouMean = (0, _utils.createDidYouMeanMessage)(
    option,
    Object.keys(exampleConfig)
  );
  const message = `  Unknown option ${_chalk().default.bold(
    `"${path && path.length > 0 ? `${path.join('.')}.` : ''}${option}"`
  )} with value ${_chalk().default.bold(
    (0, _utils.format)(config[option])
  )} was found.${
    didYouMean && ` ${didYouMean}`
  }\n  This is probably a typing mistake. Fixing it will remove this message.`;
  const comment = options.comment;
  const name = (options.title && options.title.warning) || _utils.WARNING;
  (0, _utils.logValidationWarning)(name, message, comment);
};
exports.unknownOptionWarning = unknownOptionWarning;
