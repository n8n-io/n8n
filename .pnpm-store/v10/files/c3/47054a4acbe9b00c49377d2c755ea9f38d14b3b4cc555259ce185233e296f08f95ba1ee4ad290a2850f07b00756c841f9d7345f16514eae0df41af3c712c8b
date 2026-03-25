'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.DOCUMENTATION_NOTE = void 0;
exports.default = validateCLIOptions;
function _camelcase() {
  const data = _interopRequireDefault(require('camelcase'));
  _camelcase = function () {
    return data;
  };
  return data;
}
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

const BULLET = _chalk().default.bold('\u25cf');
const DOCUMENTATION_NOTE = `  ${_chalk().default.bold(
  'CLI Options Documentation:'
)}
  https://jestjs.io/docs/cli
`;
exports.DOCUMENTATION_NOTE = DOCUMENTATION_NOTE;
const createCLIValidationError = (unrecognizedOptions, allowedOptions) => {
  let title = `${BULLET} Unrecognized CLI Parameter`;
  let message;
  const comment =
    `  ${_chalk().default.bold('CLI Options Documentation')}:\n` +
    '  https://jestjs.io/docs/cli\n';
  if (unrecognizedOptions.length === 1) {
    const unrecognized = unrecognizedOptions[0];
    const didYouMeanMessage =
      unrecognized.length > 1
        ? (0, _utils.createDidYouMeanMessage)(
            unrecognized,
            Array.from(allowedOptions)
          )
        : '';
    message = `  Unrecognized option ${_chalk().default.bold(
      (0, _utils.format)(unrecognized)
    )}.${didYouMeanMessage ? ` ${didYouMeanMessage}` : ''}`;
  } else {
    title += 's';
    message =
      '  Following options were not recognized:\n' +
      `  ${_chalk().default.bold((0, _utils.format)(unrecognizedOptions))}`;
  }
  return new _utils.ValidationError(title, message, comment);
};
const validateDeprecatedOptions = (
  deprecatedOptions,
  deprecationEntries,
  argv
) => {
  deprecatedOptions.forEach(opt => {
    const name = opt.name;
    const message = deprecationEntries[name](argv);
    const comment = DOCUMENTATION_NOTE;
    if (opt.fatal) {
      throw new _utils.ValidationError(name, message, comment);
    } else {
      (0, _utils.logValidationWarning)(name, message, comment);
    }
  });
};
function validateCLIOptions(argv, options = {}, rawArgv = []) {
  const yargsSpecialOptions = ['$0', '_', 'help', 'h'];
  const allowedOptions = Object.keys(options).reduce(
    (acc, option) => acc.add(option).add(options[option].alias || option),
    new Set(yargsSpecialOptions)
  );
  const deprecationEntries = options.deprecationEntries ?? {};
  const CLIDeprecations = Object.keys(deprecationEntries).reduce(
    (acc, entry) => {
      acc[entry] = deprecationEntries[entry];
      if (options[entry]) {
        const alias = options[entry].alias;
        if (alias) {
          acc[alias] = deprecationEntries[entry];
        }
      }
      return acc;
    },
    {}
  );
  const deprecations = new Set(Object.keys(CLIDeprecations));
  const deprecatedOptions = Object.keys(argv)
    .filter(arg => deprecations.has(arg) && argv[arg] != null)
    .map(arg => ({
      fatal: !allowedOptions.has(arg),
      name: arg
    }));
  if (deprecatedOptions.length) {
    validateDeprecatedOptions(deprecatedOptions, CLIDeprecations, argv);
  }
  const unrecognizedOptions = Object.keys(argv).filter(
    arg =>
      !allowedOptions.has(
        (0, _camelcase().default)(arg, {
          locale: 'en-US'
        })
      ) &&
      !allowedOptions.has(arg) &&
      (!rawArgv.length || rawArgv.includes(arg)),
    []
  );
  if (unrecognizedOptions.length) {
    throw createCLIValidationError(unrecognizedOptions, allowedOptions);
  }
  return true;
}
