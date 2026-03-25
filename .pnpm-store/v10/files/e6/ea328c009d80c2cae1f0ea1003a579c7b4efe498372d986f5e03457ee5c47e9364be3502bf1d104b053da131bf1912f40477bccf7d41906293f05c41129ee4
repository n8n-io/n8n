'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = deepCyclicCopyReplaceable;
var _prettyFormat = require('pretty-format');
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const builtInObject = [
  Array,
  Date,
  Float32Array,
  Float64Array,
  Int16Array,
  Int32Array,
  Int8Array,
  Map,
  Set,
  RegExp,
  Uint16Array,
  Uint32Array,
  Uint8Array,
  Uint8ClampedArray
];
if (typeof Buffer !== 'undefined') {
  builtInObject.push(Buffer);
}
const isBuiltInObject = object => builtInObject.includes(object.constructor);
const isMap = value => value.constructor === Map;
function deepCyclicCopyReplaceable(value, cycles = new WeakMap()) {
  if (typeof value !== 'object' || value === null) {
    return value;
  } else if (cycles.has(value)) {
    return cycles.get(value);
  } else if (Array.isArray(value)) {
    return deepCyclicCopyArray(value, cycles);
  } else if (isMap(value)) {
    return deepCyclicCopyMap(value, cycles);
  } else if (isBuiltInObject(value)) {
    return value;
  } else if (_prettyFormat.plugins.DOMElement.test(value)) {
    return value.cloneNode(true);
  } else {
    return deepCyclicCopyObject(value, cycles);
  }
}
function deepCyclicCopyObject(object, cycles) {
  const newObject = Object.create(Object.getPrototypeOf(object));
  const descriptors = Object.getOwnPropertyDescriptors(object);
  cycles.set(object, newObject);
  const newDescriptors = [
    ...Object.keys(descriptors),
    ...Object.getOwnPropertySymbols(descriptors)
  ].reduce(
    //@ts-expect-error because typescript do not support symbol key in object
    //https://github.com/microsoft/TypeScript/issues/1863
    (newDescriptors, key) => {
      const enumerable = descriptors[key].enumerable;
      newDescriptors[key] = {
        configurable: true,
        enumerable,
        value: deepCyclicCopyReplaceable(
          // this accesses the value or getter, depending. We just care about the value anyways, and this allows us to not mess with accessors
          // it has the side effect of invoking the getter here though, rather than copying it over
          object[key],
          cycles
        ),
        writable: true
      };
      return newDescriptors;
    },
    {}
  );
  //@ts-expect-error because typescript do not support symbol key in object
  //https://github.com/microsoft/TypeScript/issues/1863
  return Object.defineProperties(newObject, newDescriptors);
}
function deepCyclicCopyArray(array, cycles) {
  const newArray = new (Object.getPrototypeOf(array).constructor)(array.length);
  const length = array.length;
  cycles.set(array, newArray);
  for (let i = 0; i < length; i++) {
    newArray[i] = deepCyclicCopyReplaceable(array[i], cycles);
  }
  return newArray;
}
function deepCyclicCopyMap(map, cycles) {
  const newMap = new Map();
  cycles.set(map, newMap);
  map.forEach((value, key) => {
    newMap.set(key, deepCyclicCopyReplaceable(value, cycles));
  });
  return newMap;
}
