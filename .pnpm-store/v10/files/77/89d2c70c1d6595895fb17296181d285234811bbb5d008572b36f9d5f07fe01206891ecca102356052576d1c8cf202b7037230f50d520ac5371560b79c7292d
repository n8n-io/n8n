'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.testScriptQuestion = exports.default = void 0;
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const defaultQuestions = [
  {
    initial: false,
    message: 'Would you like to use Typescript for the configuration file?',
    name: 'useTypescript',
    type: 'confirm'
  },
  {
    choices: [
      {
        title: 'node',
        value: 'node'
      },
      {
        title: 'jsdom (browser-like)',
        value: 'jsdom'
      }
    ],
    initial: 0,
    message: 'Choose the test environment that will be used for testing',
    name: 'environment',
    type: 'select'
  },
  {
    initial: false,
    message: 'Do you want Jest to add coverage reports?',
    name: 'coverage',
    type: 'confirm'
  },
  {
    choices: [
      {
        title: 'v8',
        value: 'v8'
      },
      {
        title: 'babel',
        value: 'babel'
      }
    ],
    initial: 0,
    message: 'Which provider should be used to instrument code for coverage?',
    name: 'coverageProvider',
    type: 'select'
  },
  {
    initial: false,
    message:
      'Automatically clear mock calls, instances, contexts and results before every test?',
    name: 'clearMocks',
    type: 'confirm'
  }
];
var _default = defaultQuestions;
exports.default = _default;
const testScriptQuestion = {
  initial: true,
  message:
    'Would you like to use Jest when running "test" script in "package.json"?',
  name: 'scripts',
  type: 'confirm'
};
exports.testScriptQuestion = testScriptQuestion;
