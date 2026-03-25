'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = void 0;
var _defaultConfig = _interopRequireDefault(require('./defaultConfig'));
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

let hasDeprecationWarnings = false;
const shouldSkipValidationForPath = (path, key, denylist) =>
  denylist ? denylist.includes([...path, key].join('.')) : false;
const _validate = (config, exampleConfig, options, path = []) => {
  if (
    typeof config !== 'object' ||
    config == null ||
    typeof exampleConfig !== 'object' ||
    exampleConfig == null
  ) {
    return {
      hasDeprecationWarnings
    };
  }
  for (const key in config) {
    if (
      options.deprecatedConfig &&
      key in options.deprecatedConfig &&
      typeof options.deprecate === 'function'
    ) {
      const isDeprecatedKey = options.deprecate(
        config,
        key,
        options.deprecatedConfig,
        options
      );
      hasDeprecationWarnings = hasDeprecationWarnings || isDeprecatedKey;
    } else if (allowsMultipleTypes(key)) {
      const value = config[key];
      if (
        typeof options.condition === 'function' &&
        typeof options.error === 'function'
      ) {
        if (key === 'maxWorkers' && !isOfTypeStringOrNumber(value)) {
          throw new _utils.ValidationError(
            'Validation Error',
            `${key} has to be of type string or number`,
            'maxWorkers=50% or\nmaxWorkers=3'
          );
        }
      }
    } else if (Object.hasOwnProperty.call(exampleConfig, key)) {
      if (
        typeof options.condition === 'function' &&
        typeof options.error === 'function' &&
        !options.condition(config[key], exampleConfig[key])
      ) {
        options.error(key, config[key], exampleConfig[key], options, path);
      }
    } else if (
      shouldSkipValidationForPath(path, key, options.recursiveDenylist)
    ) {
      // skip validating unknown options inside blacklisted paths
    } else {
      options.unknown &&
        options.unknown(config, exampleConfig, key, options, path);
    }
    if (
      options.recursive &&
      !Array.isArray(exampleConfig[key]) &&
      options.recursiveDenylist &&
      !shouldSkipValidationForPath(path, key, options.recursiveDenylist)
    ) {
      _validate(config[key], exampleConfig[key], options, [...path, key]);
    }
  }
  return {
    hasDeprecationWarnings
  };
};
const allowsMultipleTypes = key => key === 'maxWorkers';
const isOfTypeStringOrNumber = value =>
  typeof value === 'number' || typeof value === 'string';
const validate = (config, options) => {
  hasDeprecationWarnings = false;

  // Preserve default denylist entries even with user-supplied denylist
  const combinedDenylist = [
    ...(_defaultConfig.default.recursiveDenylist || []),
    ...(options.recursiveDenylist || [])
  ];
  const defaultedOptions = Object.assign({
    ..._defaultConfig.default,
    ...options,
    recursiveDenylist: combinedDenylist,
    title: options.title || _defaultConfig.default.title
  });
  const {hasDeprecationWarnings: hdw} = _validate(
    config,
    options.exampleConfig,
    defaultedOptions
  );
  return {
    hasDeprecationWarnings: hdw,
    isValid: true
  };
};
var _default = validate;
exports.default = _default;
