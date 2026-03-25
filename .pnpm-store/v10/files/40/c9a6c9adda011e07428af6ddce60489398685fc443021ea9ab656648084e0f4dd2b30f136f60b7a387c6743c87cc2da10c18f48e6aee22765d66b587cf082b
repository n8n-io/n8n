'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.deprecationWarning = void 0;
var _utils = require('./utils');
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const deprecationMessage = (message, options) => {
  const comment = options.comment;
  const name =
    (options.title && options.title.deprecation) || _utils.DEPRECATION;
  (0, _utils.logValidationWarning)(name, message, comment);
};
const deprecationWarning = (config, option, deprecatedOptions, options) => {
  if (option in deprecatedOptions) {
    deprecationMessage(deprecatedOptions[option](config), options);
    return true;
  }
  return false;
};
exports.deprecationWarning = deprecationWarning;
