'use strict';

/**
 * Utility module to create and manipulate Iterators.
 *
 * @module iterator
 */

/**
 * @template T,R
 * @param {Iterator<T>} iterator
 * @param {function(T):R} f
 * @return {IterableIterator<R>}
 */
const mapIterator = (iterator, f) => ({
  [Symbol.iterator] () {
    return this
  },
  // @ts-ignore
  next () {
    const r = iterator.next();
    return { value: r.done ? undefined : f(r.value), done: r.done }
  }
});

/**
 * @template T
 * @param {function():IteratorResult<T>} next
 * @return {IterableIterator<T>}
 */
const createIterator = next => ({
  /**
   * @return {IterableIterator<T>}
   */
  [Symbol.iterator] () {
    return this
  },
  // @ts-ignore
  next
});

/**
 * @template T
 * @param {Iterator<T>} iterator
 * @param {function(T):boolean} filter
 */
const iteratorFilter = (iterator, filter) => createIterator(() => {
  let res;
  do {
    res = iterator.next();
  } while (!res.done && !filter(res.value))
  return res
});

/**
 * @template T,M
 * @param {Iterator<T>} iterator
 * @param {function(T):M} fmap
 */
const iteratorMap = (iterator, fmap) => createIterator(() => {
  const { done, value } = iterator.next();
  return { done, value: done ? undefined : fmap(value) }
});

var iterator = /*#__PURE__*/Object.freeze({
  __proto__: null,
  mapIterator: mapIterator,
  createIterator: createIterator,
  iteratorFilter: iteratorFilter,
  iteratorMap: iteratorMap
});

exports.createIterator = createIterator;
exports.iterator = iterator;
exports.iteratorFilter = iteratorFilter;
exports.iteratorMap = iteratorMap;
exports.mapIterator = mapIterator;
//# sourceMappingURL=iterator-9fc627c1.cjs.map
