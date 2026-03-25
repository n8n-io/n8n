'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = handlePotentialSyntaxError;
exports.enhanceUnexpectedTokenMessage = enhanceUnexpectedTokenMessage;
function _chalk() {
  const data = _interopRequireDefault(require('chalk'));
  _chalk = function () {
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

const DOT = ' \u2022 ';
function handlePotentialSyntaxError(e) {
  if (e.codeFrame != null) {
    e.stack = `${e.message}\n${e.codeFrame}`;
  }
  if (
    // `instanceof` might come from the wrong context
    e.name === 'SyntaxError' &&
    !e.message.includes(' expected')
  ) {
    throw enhanceUnexpectedTokenMessage(e);
  }
  return e;
}
function enhanceUnexpectedTokenMessage(e) {
  e.stack = `${_chalk().default.bold.red(
    'Jest encountered an unexpected token'
  )}

Jest failed to parse a file. This happens e.g. when your code or its dependencies use non-standard JavaScript syntax, or when Jest is not configured to support such syntax.

Out of the box Jest supports Babel, which will be used to transform your files into valid JS based on your Babel configuration.

By default "node_modules" folder is ignored by transformers.

Here's what you can do:
${DOT}If you are trying to use ECMAScript Modules, see ${_chalk().default.underline(
    'https://jestjs.io/docs/ecmascript-modules'
  )} for how to enable it.
${DOT}If you are trying to use TypeScript, see ${_chalk().default.underline(
    'https://jestjs.io/docs/getting-started#using-typescript'
  )}
${DOT}To have some of your "node_modules" files transformed, you can specify a custom ${_chalk().default.bold(
    '"transformIgnorePatterns"'
  )} in your config.
${DOT}If you need a custom transformation specify a ${_chalk().default.bold(
    '"transform"'
  )} option in your config.
${DOT}If you simply want to mock your non-JS modules (e.g. binary assets) you can stub them out with the ${_chalk().default.bold(
    '"moduleNameMapper"'
  )} config option.

You'll find more details and examples of these config options in the docs:
${_chalk().default.cyan('https://jestjs.io/docs/configuration')}
For information about custom transformations, see:
${_chalk().default.cyan('https://jestjs.io/docs/code-transformation')}

${_chalk().default.bold.red('Details:')}

${e.stack ?? ''}`.trimRight();
  return e;
}
