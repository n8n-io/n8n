'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = void 0;
var _jestGetType = require('jest-get-type');
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const supportTypes = ['map', 'array', 'object'];
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
class Replaceable {
  object;
  type;
  constructor(object) {
    this.object = object;
    this.type = (0, _jestGetType.getType)(object);
    if (!supportTypes.includes(this.type)) {
      throw new Error(`Type ${this.type} is not support in Replaceable!`);
    }
  }
  static isReplaceable(obj1, obj2) {
    const obj1Type = (0, _jestGetType.getType)(obj1);
    const obj2Type = (0, _jestGetType.getType)(obj2);
    return obj1Type === obj2Type && supportTypes.includes(obj1Type);
  }
  forEach(cb) {
    if (this.type === 'object') {
      const descriptors = Object.getOwnPropertyDescriptors(this.object);
      [
        ...Object.keys(descriptors),
        ...Object.getOwnPropertySymbols(descriptors)
      ]
        //@ts-expect-error because typescript do not support symbol key in object
        //https://github.com/microsoft/TypeScript/issues/1863
        .filter(key => descriptors[key].enumerable)
        .forEach(key => {
          cb(this.object[key], key, this.object);
        });
    } else {
      this.object.forEach(cb);
    }
  }
  get(key) {
    if (this.type === 'map') {
      return this.object.get(key);
    }
    return this.object[key];
  }
  set(key, value) {
    if (this.type === 'map') {
      this.object.set(key, value);
    } else {
      this.object[key] = value;
    }
  }
}
/* eslint-enable */
exports.default = Replaceable;
