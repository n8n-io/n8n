'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = convertDescriptorToString;
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

function convertDescriptorToString(descriptor) {
  switch (typeof descriptor) {
    case 'function':
      if (descriptor.name) {
        return descriptor.name;
      }
      break;
    case 'number':
    case 'undefined':
      return `${descriptor}`;
    case 'string':
      return descriptor;
  }
  throw new Error(
    `Invalid first argument, ${descriptor}. It must be a named class, named function, number, or string.`
  );
}
