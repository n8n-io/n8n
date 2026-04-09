"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getKeyPath = getKeyPath;
// Keys provided as functions or arrays or objects need to be stringified
const convertKey = key => typeof key === 'object' && key ? key + '' : key;

// https://www.w3.org/TR/IndexedDB/#dom-idbobjectstore-keypath
function getKeyPath(keyPath) {
  // It's important to clone the Array here because of the WPT test:
  // "Different instances are returned from different store instances."
  // Also note that the same instance must be returned across multiple gets
  return Array.isArray(keyPath) ? keyPath.map(convertKey) : convertKey(keyPath);
}