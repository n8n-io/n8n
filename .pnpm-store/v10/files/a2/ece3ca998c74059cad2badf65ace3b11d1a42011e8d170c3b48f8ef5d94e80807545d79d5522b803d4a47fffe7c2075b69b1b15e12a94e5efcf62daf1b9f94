'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
Object.defineProperty(exports, 'bind', {
  enumerable: true,
  get: function () {
    return _bind.default;
  }
});
exports.default = void 0;
var _bind = _interopRequireDefault(require('./bind'));
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

const install = (g, table, ...data) => {
  const bindingWithArray = data.length === 0;
  const bindingWithTemplate = Array.isArray(table) && !!table.raw;
  if (!bindingWithArray && !bindingWithTemplate) {
    throw new Error(
      '`.each` must only be called with an Array or Tagged Template Literal.'
    );
  }
  const test = (title, test, timeout) =>
    (0, _bind.default)(g.test)(table, ...data)(title, test, timeout);
  test.skip = (0, _bind.default)(g.test.skip)(table, ...data);
  test.only = (0, _bind.default)(g.test.only)(table, ...data);
  const testConcurrent = (title, test, timeout) =>
    (0, _bind.default)(g.test.concurrent)(table, ...data)(title, test, timeout);
  test.concurrent = testConcurrent;
  testConcurrent.only = (0, _bind.default)(g.test.concurrent.only)(
    table,
    ...data
  );
  testConcurrent.skip = (0, _bind.default)(g.test.concurrent.skip)(
    table,
    ...data
  );
  const it = (title, test, timeout) =>
    (0, _bind.default)(g.it)(table, ...data)(title, test, timeout);
  it.skip = (0, _bind.default)(g.it.skip)(table, ...data);
  it.only = (0, _bind.default)(g.it.only)(table, ...data);
  it.concurrent = testConcurrent;
  const xit = (0, _bind.default)(g.xit)(table, ...data);
  const fit = (0, _bind.default)(g.fit)(table, ...data);
  const xtest = (0, _bind.default)(g.xtest)(table, ...data);
  const describe = (title, suite, timeout) =>
    (0, _bind.default)(g.describe, false)(table, ...data)(
      title,
      suite,
      timeout
    );
  describe.skip = (0, _bind.default)(g.describe.skip, false)(table, ...data);
  describe.only = (0, _bind.default)(g.describe.only, false)(table, ...data);
  const fdescribe = (0, _bind.default)(g.fdescribe, false)(table, ...data);
  const xdescribe = (0, _bind.default)(g.xdescribe, false)(table, ...data);
  return {
    describe,
    fdescribe,
    fit,
    it,
    test,
    xdescribe,
    xit,
    xtest
  };
};
const each = (table, ...data) => install(globalThis, table, ...data);
each.withGlobal =
  g =>
  (table, ...data) =>
    install(g, table, ...data);
var _default = each;
exports.default = _default;
