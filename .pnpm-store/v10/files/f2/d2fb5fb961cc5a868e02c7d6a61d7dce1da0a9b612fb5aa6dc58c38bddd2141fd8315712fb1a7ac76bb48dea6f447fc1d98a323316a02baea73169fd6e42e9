"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createCache = void 0;
const createCache = lastNumberWeakMap => {
  return (collection, nextNumber) => {
    lastNumberWeakMap.set(collection, nextNumber);
    return nextNumber;
  };
};
exports.createCache = createCache;