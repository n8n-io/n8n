'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.isImmutableList = isImmutableList;
exports.isImmutableOrderedKeyed = isImmutableOrderedKeyed;
exports.isImmutableOrderedSet = isImmutableOrderedSet;
exports.isImmutableRecord = isImmutableRecord;
exports.isImmutableUnorderedKeyed = isImmutableUnorderedKeyed;
exports.isImmutableUnorderedSet = isImmutableUnorderedSet;
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// SENTINEL constants are from https://github.com/immutable-js/immutable-js/tree/main/src/predicates
const IS_KEYED_SENTINEL = '@@__IMMUTABLE_KEYED__@@';
const IS_SET_SENTINEL = '@@__IMMUTABLE_SET__@@';
const IS_LIST_SENTINEL = '@@__IMMUTABLE_LIST__@@';
const IS_ORDERED_SENTINEL = '@@__IMMUTABLE_ORDERED__@@';
const IS_RECORD_SYMBOL = '@@__IMMUTABLE_RECORD__@@';
function isObjectLiteral(source) {
  return source != null && typeof source === 'object' && !Array.isArray(source);
}
function isImmutableUnorderedKeyed(source) {
  return Boolean(
    source &&
      isObjectLiteral(source) &&
      source[IS_KEYED_SENTINEL] &&
      !source[IS_ORDERED_SENTINEL]
  );
}
function isImmutableUnorderedSet(source) {
  return Boolean(
    source &&
      isObjectLiteral(source) &&
      source[IS_SET_SENTINEL] &&
      !source[IS_ORDERED_SENTINEL]
  );
}
function isImmutableList(source) {
  return Boolean(source && isObjectLiteral(source) && source[IS_LIST_SENTINEL]);
}
function isImmutableOrderedKeyed(source) {
  return Boolean(
    source &&
      isObjectLiteral(source) &&
      source[IS_KEYED_SENTINEL] &&
      source[IS_ORDERED_SENTINEL]
  );
}
function isImmutableOrderedSet(source) {
  return Boolean(
    source &&
      isObjectLiteral(source) &&
      source[IS_SET_SENTINEL] &&
      source[IS_ORDERED_SENTINEL]
  );
}
function isImmutableRecord(source) {
  return Boolean(source && isObjectLiteral(source) && source[IS_RECORD_SYMBOL]);
}
