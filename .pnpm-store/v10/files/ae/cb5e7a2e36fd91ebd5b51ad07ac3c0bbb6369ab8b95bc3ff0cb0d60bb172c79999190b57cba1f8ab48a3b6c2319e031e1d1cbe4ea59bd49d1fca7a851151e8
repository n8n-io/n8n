'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.getSerializers = exports.addSerializer = void 0;
var _prettyFormat = require('pretty-format');
var _mockSerializer = _interopRequireDefault(require('./mockSerializer'));
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {default: obj};
}
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const {
  DOMCollection,
  DOMElement,
  Immutable,
  ReactElement,
  ReactTestComponent,
  AsymmetricMatcher
} = _prettyFormat.plugins;
let PLUGINS = [
  ReactTestComponent,
  ReactElement,
  DOMElement,
  DOMCollection,
  Immutable,
  _mockSerializer.default,
  AsymmetricMatcher
];

// Prepend to list so the last added is the first tested.
const addSerializer = plugin => {
  PLUGINS = [plugin].concat(PLUGINS);
};
exports.addSerializer = addSerializer;
const getSerializers = () => PLUGINS;
exports.getSerializers = getSerializers;
