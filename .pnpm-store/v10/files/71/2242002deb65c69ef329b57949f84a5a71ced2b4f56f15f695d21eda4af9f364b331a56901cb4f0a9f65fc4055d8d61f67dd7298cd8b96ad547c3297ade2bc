'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = bind;
function _jestUtil() {
  const data = require('jest-util');
  _jestUtil = function () {
    return data;
  };
  return data;
}
var _array = _interopRequireDefault(require('./table/array'));
var _template = _interopRequireDefault(require('./table/template'));
var _validation = require('./validation');
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {default: obj};
}
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// type TestFn = (done?: Global.DoneFn) => Promise<any> | void | undefined;

function bind(cb, supportsDone = true, needsEachError = false) {
  const bindWrap = (table, ...taggedTemplateData) => {
    const error = new (_jestUtil().ErrorWithStack)(undefined, bindWrap);
    return function eachBind(title, test, timeout) {
      title = (0, _jestUtil().convertDescriptorToString)(title);
      try {
        const tests = isArrayTable(taggedTemplateData)
          ? buildArrayTests(title, table)
          : buildTemplateTests(title, table, taggedTemplateData);
        return tests.forEach(row =>
          needsEachError
            ? cb(
                row.title,
                applyArguments(supportsDone, row.arguments, test),
                timeout,
                error
              )
            : cb(
                row.title,
                applyArguments(supportsDone, row.arguments, test),
                timeout
              )
        );
      } catch (e) {
        const err = new Error(e.message);
        err.stack = error.stack?.replace(/^Error: /s, `Error: ${e.message}`);
        return cb(title, () => {
          throw err;
        });
      }
    };
  };
  return bindWrap;
}
const isArrayTable = data => data.length === 0;
const buildArrayTests = (title, table) => {
  (0, _validation.validateArrayTable)(table);
  return (0, _array.default)(title, table);
};
const buildTemplateTests = (title, table, taggedTemplateData) => {
  const headings = getHeadingKeys(table[0]);
  (0, _validation.validateTemplateTableArguments)(headings, taggedTemplateData);
  return (0, _template.default)(title, headings, taggedTemplateData);
};
const getHeadingKeys = headings =>
  (0, _validation.extractValidTemplateHeadings)(headings)
    .replace(/\s/g, '')
    .split('|');
const applyArguments = (supportsDone, params, test) =>
  supportsDone && params.length < test.length
    ? done => test(...params, done)
    : () => test(...params);
