import _filter from './_filter.js';

/**
 * @private
 * @param {Function} fn The strategy for extracting function names from an object
 * @return {Function} A function that takes an object and returns an array of function names.
 */
export default function _functionsWith(fn) {
  return function (obj) {
    return _filter(function (key) {
      return typeof obj[key] === 'function';
    }, fn(obj));
  };
}