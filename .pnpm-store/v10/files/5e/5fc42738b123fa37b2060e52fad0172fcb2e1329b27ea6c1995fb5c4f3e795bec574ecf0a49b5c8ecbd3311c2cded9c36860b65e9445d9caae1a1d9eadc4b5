'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.arrayBufferEquality = void 0;
exports.emptyObject = emptyObject;
exports.typeEquality =
  exports.subsetEquality =
  exports.sparseArrayEquality =
  exports.pathAsArray =
  exports.partition =
  exports.iterableEquality =
  exports.isOneline =
  exports.isError =
  exports.getPath =
  exports.getObjectSubset =
  exports.getObjectKeys =
    void 0;
var _jestGetType = require('jest-get-type');
var _immutableUtils = require('./immutableUtils');
var _jasmineUtils = require('./jasmineUtils');
var Symbol = globalThis['jest-symbol-do-not-touch'] || globalThis.Symbol;
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
/**
 * Checks if `hasOwnProperty(object, key)` up the prototype chain, stopping at `Object.prototype`.
 */
const hasPropertyInObject = (object, key) => {
  const shouldTerminate =
    !object || typeof object !== 'object' || object === Object.prototype;
  if (shouldTerminate) {
    return false;
  }
  return (
    Object.prototype.hasOwnProperty.call(object, key) ||
    hasPropertyInObject(Object.getPrototypeOf(object), key)
  );
};

// Retrieves an object's keys for evaluation by getObjectSubset.  This evaluates
// the prototype chain for string keys but not for symbols.  (Otherwise, it
// could find values such as a Set or Map's Symbol.toStringTag, with unexpected
// results.)
const getObjectKeys = object => [
  ...Object.keys(object),
  ...Object.getOwnPropertySymbols(object)
];
exports.getObjectKeys = getObjectKeys;
const getPath = (object, propertyPath) => {
  if (!Array.isArray(propertyPath)) {
    propertyPath = pathAsArray(propertyPath);
  }
  if (propertyPath.length) {
    const lastProp = propertyPath.length === 1;
    const prop = propertyPath[0];
    const newObject = object[prop];
    if (!lastProp && (newObject === null || newObject === undefined)) {
      // This is not the last prop in the chain. If we keep recursing it will
      // hit a `can't access property X of undefined | null`. At this point we
      // know that the chain has broken and we can return right away.
      return {
        hasEndProp: false,
        lastTraversedObject: object,
        traversedPath: []
      };
    }
    const result = getPath(newObject, propertyPath.slice(1));
    if (result.lastTraversedObject === null) {
      result.lastTraversedObject = object;
    }
    result.traversedPath.unshift(prop);
    if (lastProp) {
      // Does object have the property with an undefined value?
      // Although primitive values support bracket notation (above)
      // they would throw TypeError for in operator (below).
      result.endPropIsDefined =
        !(0, _jestGetType.isPrimitive)(object) && prop in object;
      result.hasEndProp = newObject !== undefined || result.endPropIsDefined;
      if (!result.hasEndProp) {
        result.traversedPath.shift();
      }
    }
    return result;
  }
  return {
    lastTraversedObject: null,
    traversedPath: [],
    value: object
  };
};

// Strip properties from object that are not present in the subset. Useful for
// printing the diff for toMatchObject() without adding unrelated noise.
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
exports.getPath = getPath;
const getObjectSubset = (
  object,
  subset,
  customTesters = [],
  seenReferences = new WeakMap()
) => {
  /* eslint-enable @typescript-eslint/explicit-module-boundary-types */
  if (Array.isArray(object)) {
    if (Array.isArray(subset) && subset.length === object.length) {
      // The map method returns correct subclass of subset.
      return subset.map((sub, i) =>
        getObjectSubset(object[i], sub, customTesters)
      );
    }
  } else if (object instanceof Date) {
    return object;
  } else if (isObject(object) && isObject(subset)) {
    if (
      (0, _jasmineUtils.equals)(object, subset, [
        ...customTesters,
        iterableEquality,
        subsetEquality
      ])
    ) {
      // Avoid unnecessary copy which might return Object instead of subclass.
      return subset;
    }
    const trimmed = {};
    seenReferences.set(object, trimmed);
    getObjectKeys(object)
      .filter(key => hasPropertyInObject(subset, key))
      .forEach(key => {
        trimmed[key] = seenReferences.has(object[key])
          ? seenReferences.get(object[key])
          : getObjectSubset(
              object[key],
              subset[key],
              customTesters,
              seenReferences
            );
      });
    if (getObjectKeys(trimmed).length > 0) {
      return trimmed;
    }
  }
  return object;
};
exports.getObjectSubset = getObjectSubset;
const IteratorSymbol = Symbol.iterator;
const hasIterator = object => !!(object != null && object[IteratorSymbol]);

/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
const iterableEquality = (
  a,
  b,
  customTesters = [] /* eslint-enable @typescript-eslint/explicit-module-boundary-types */,
  aStack = [],
  bStack = []
) => {
  if (
    typeof a !== 'object' ||
    typeof b !== 'object' ||
    Array.isArray(a) ||
    Array.isArray(b) ||
    !hasIterator(a) ||
    !hasIterator(b)
  ) {
    return undefined;
  }
  if (a.constructor !== b.constructor) {
    return false;
  }
  let length = aStack.length;
  while (length--) {
    // Linear search. Performance is inversely proportional to the number of
    // unique nested structures.
    // circular references at same depth are equal
    // circular reference is not equal to non-circular one
    if (aStack[length] === a) {
      return bStack[length] === b;
    }
  }
  aStack.push(a);
  bStack.push(b);
  const iterableEqualityWithStack = (a, b) =>
    iterableEquality(
      a,
      b,
      [...filteredCustomTesters],
      [...aStack],
      [...bStack]
    );

  // Replace any instance of iterableEquality with the new
  // iterableEqualityWithStack so we can do circular detection
  const filteredCustomTesters = [
    ...customTesters.filter(t => t !== iterableEquality),
    iterableEqualityWithStack
  ];
  if (a.size !== undefined) {
    if (a.size !== b.size) {
      return false;
    } else if (
      (0, _jasmineUtils.isA)('Set', a) ||
      (0, _immutableUtils.isImmutableUnorderedSet)(a)
    ) {
      let allFound = true;
      for (const aValue of a) {
        if (!b.has(aValue)) {
          let has = false;
          for (const bValue of b) {
            const isEqual = (0, _jasmineUtils.equals)(
              aValue,
              bValue,
              filteredCustomTesters
            );
            if (isEqual === true) {
              has = true;
            }
          }
          if (has === false) {
            allFound = false;
            break;
          }
        }
      }
      // Remove the first value from the stack of traversed values.
      aStack.pop();
      bStack.pop();
      return allFound;
    } else if (
      (0, _jasmineUtils.isA)('Map', a) ||
      (0, _immutableUtils.isImmutableUnorderedKeyed)(a)
    ) {
      let allFound = true;
      for (const aEntry of a) {
        if (
          !b.has(aEntry[0]) ||
          !(0, _jasmineUtils.equals)(
            aEntry[1],
            b.get(aEntry[0]),
            filteredCustomTesters
          )
        ) {
          let has = false;
          for (const bEntry of b) {
            const matchedKey = (0, _jasmineUtils.equals)(
              aEntry[0],
              bEntry[0],
              filteredCustomTesters
            );
            let matchedValue = false;
            if (matchedKey === true) {
              matchedValue = (0, _jasmineUtils.equals)(
                aEntry[1],
                bEntry[1],
                filteredCustomTesters
              );
            }
            if (matchedValue === true) {
              has = true;
            }
          }
          if (has === false) {
            allFound = false;
            break;
          }
        }
      }
      // Remove the first value from the stack of traversed values.
      aStack.pop();
      bStack.pop();
      return allFound;
    }
  }
  const bIterator = b[IteratorSymbol]();
  for (const aValue of a) {
    const nextB = bIterator.next();
    if (
      nextB.done ||
      !(0, _jasmineUtils.equals)(aValue, nextB.value, filteredCustomTesters)
    ) {
      return false;
    }
  }
  if (!bIterator.next().done) {
    return false;
  }
  if (
    !(0, _immutableUtils.isImmutableList)(a) &&
    !(0, _immutableUtils.isImmutableOrderedKeyed)(a) &&
    !(0, _immutableUtils.isImmutableOrderedSet)(a) &&
    !(0, _immutableUtils.isImmutableRecord)(a)
  ) {
    const aEntries = Object.entries(a);
    const bEntries = Object.entries(b);
    if (!(0, _jasmineUtils.equals)(aEntries, bEntries)) {
      return false;
    }
  }

  // Remove the first value from the stack of traversed values.
  aStack.pop();
  bStack.pop();
  return true;
};
exports.iterableEquality = iterableEquality;
const isObject = a => a !== null && typeof a === 'object';
const isObjectWithKeys = a =>
  isObject(a) &&
  !(a instanceof Error) &&
  !(a instanceof Array) &&
  !(a instanceof Date);
const subsetEquality = (object, subset, customTesters = []) => {
  const filteredCustomTesters = customTesters.filter(t => t !== subsetEquality);

  // subsetEquality needs to keep track of the references
  // it has already visited to avoid infinite loops in case
  // there are circular references in the subset passed to it.
  const subsetEqualityWithContext =
    (seenReferences = new WeakMap()) =>
    (object, subset) => {
      if (!isObjectWithKeys(subset)) {
        return undefined;
      }
      return getObjectKeys(subset).every(key => {
        if (isObjectWithKeys(subset[key])) {
          if (seenReferences.has(subset[key])) {
            return (0, _jasmineUtils.equals)(
              object[key],
              subset[key],
              filteredCustomTesters
            );
          }
          seenReferences.set(subset[key], true);
        }
        const result =
          object != null &&
          hasPropertyInObject(object, key) &&
          (0, _jasmineUtils.equals)(object[key], subset[key], [
            ...filteredCustomTesters,
            subsetEqualityWithContext(seenReferences)
          ]);
        // The main goal of using seenReference is to avoid circular node on tree.
        // It will only happen within a parent and its child, not a node and nodes next to it (same level)
        // We should keep the reference for a parent and its child only
        // Thus we should delete the reference immediately so that it doesn't interfere
        // other nodes within the same level on tree.
        seenReferences.delete(subset[key]);
        return result;
      });
    };
  return subsetEqualityWithContext()(object, subset);
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
exports.subsetEquality = subsetEquality;
const typeEquality = (a, b) => {
  if (
    a == null ||
    b == null ||
    a.constructor === b.constructor ||
    // Since Jest globals are different from Node globals,
    // constructors are different even between arrays when comparing properties of mock objects.
    // Both of them should be able to compare correctly when they are array-to-array.
    // https://github.com/jestjs/jest/issues/2549
    (Array.isArray(a) && Array.isArray(b))
  ) {
    return undefined;
  }
  return false;
};
exports.typeEquality = typeEquality;
const arrayBufferEquality = (a, b) => {
  if (!(a instanceof ArrayBuffer) || !(b instanceof ArrayBuffer)) {
    return undefined;
  }
  const dataViewA = new DataView(a);
  const dataViewB = new DataView(b);

  // Buffers are not equal when they do not have the same byte length
  if (dataViewA.byteLength !== dataViewB.byteLength) {
    return false;
  }

  // Check if every byte value is equal to each other
  for (let i = 0; i < dataViewA.byteLength; i++) {
    if (dataViewA.getUint8(i) !== dataViewB.getUint8(i)) {
      return false;
    }
  }
  return true;
};
exports.arrayBufferEquality = arrayBufferEquality;
const sparseArrayEquality = (a, b, customTesters = []) => {
  if (!Array.isArray(a) || !Array.isArray(b)) {
    return undefined;
  }

  // A sparse array [, , 1] will have keys ["2"] whereas [undefined, undefined, 1] will have keys ["0", "1", "2"]
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  return (
    (0, _jasmineUtils.equals)(
      a,
      b,
      customTesters.filter(t => t !== sparseArrayEquality),
      true
    ) && (0, _jasmineUtils.equals)(aKeys, bKeys)
  );
};
exports.sparseArrayEquality = sparseArrayEquality;
const partition = (items, predicate) => {
  const result = [[], []];
  items.forEach(item => result[predicate(item) ? 0 : 1].push(item));
  return result;
};
exports.partition = partition;
const pathAsArray = propertyPath => {
  const properties = [];
  if (propertyPath === '') {
    properties.push('');
    return properties;
  }

  // will match everything that's not a dot or a bracket, and "" for consecutive dots.
  const pattern = RegExp('[^.[\\]]+|(?=(?:\\.)(?:\\.|$))', 'g');

  // Because the regex won't match a dot in the beginning of the path, if present.
  if (propertyPath[0] === '.') {
    properties.push('');
  }
  propertyPath.replace(pattern, match => {
    properties.push(match);
    return match;
  });
  return properties;
};

// Copied from https://github.com/graingert/angular.js/blob/a43574052e9775cbc1d7dd8a086752c979b0f020/src/Angular.js#L685-L693
exports.pathAsArray = pathAsArray;
const isError = value => {
  switch (Object.prototype.toString.call(value)) {
    case '[object Error]':
    case '[object Exception]':
    case '[object DOMException]':
      return true;
    default:
      return value instanceof Error;
  }
};
exports.isError = isError;
function emptyObject(obj) {
  return obj && typeof obj === 'object' ? !Object.keys(obj).length : false;
}
const MULTILINE_REGEXP = /[\r\n]/;
const isOneline = (expected, received) =>
  typeof expected === 'string' &&
  typeof received === 'string' &&
  (!MULTILINE_REGEXP.test(expected) || !MULTILINE_REGEXP.test(received));
exports.isOneline = isOneline;
