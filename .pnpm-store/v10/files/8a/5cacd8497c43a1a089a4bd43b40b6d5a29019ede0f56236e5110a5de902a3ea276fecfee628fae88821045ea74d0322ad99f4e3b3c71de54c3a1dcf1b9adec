'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = void 0;
function _jestConfig() {
  const data = require('jest-config');
  _jestConfig = function () {
    return data;
  };
  return data;
}
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const stringifyOption = (option, map, linePrefix = '') => {
  const optionDescription = `  // ${_jestConfig().descriptions[option]}`;
  const stringifiedObject = `${option}: ${JSON.stringify(
    map[option],
    null,
    2
  )}`;
  return `${optionDescription}\n${stringifiedObject
    .split('\n')
    .map(line => `  ${linePrefix}${line}`)
    .join('\n')},`;
};
const generateConfigFile = (results, generateEsm = false) => {
  const {useTypescript, coverage, coverageProvider, clearMocks, environment} =
    results;
  const overrides = {};
  if (coverage) {
    Object.assign(overrides, {
      collectCoverage: true,
      coverageDirectory: 'coverage'
    });
  }
  if (coverageProvider === 'v8') {
    Object.assign(overrides, {
      coverageProvider: 'v8'
    });
  }
  if (environment === 'jsdom') {
    Object.assign(overrides, {
      testEnvironment: 'jsdom'
    });
  }
  if (clearMocks) {
    Object.assign(overrides, {
      clearMocks: true
    });
  }
  const overrideKeys = Object.keys(overrides);
  const properties = [];
  for (const option in _jestConfig().descriptions) {
    const opt = option;
    if (overrideKeys.includes(opt)) {
      properties.push(stringifyOption(opt, overrides));
    } else {
      properties.push(stringifyOption(opt, _jestConfig().defaults, '// '));
    }
  }
  const configHeaderMessage = `/**
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */
`;
  const jsDeclaration = `/** @type {import('jest').Config} */
const config = {`;
  const tsDeclaration = `import type {Config} from 'jest';

const config: Config = {`;
  const cjsExport = 'module.exports = config;';
  const esmExport = 'export default config;';
  return [
    configHeaderMessage,
    useTypescript ? tsDeclaration : jsDeclaration,
    properties.join('\n\n'),
    '};\n',
    useTypescript || generateEsm ? esmExport : cjsExport,
    ''
  ].join('\n');
};
var _default = generateConfigFile;
exports.default = _default;
