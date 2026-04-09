"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.intersection = intersection;
/**
 * Minimal polyfill of `Set.prototype.intersection`, available in Node 22+.
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set/intersection
 * @param set1
 * @param set2
 */
function intersection(set1, set2) {
  if ("intersection" in set1) {
    return set1.intersection(set2);
  }
  return new Set([...set1].filter(item => set2.has(item)));
}