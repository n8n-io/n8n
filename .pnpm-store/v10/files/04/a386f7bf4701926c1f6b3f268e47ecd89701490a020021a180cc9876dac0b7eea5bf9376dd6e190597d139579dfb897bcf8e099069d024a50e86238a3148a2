'use strict';

/**
 * Working with value pairs.
 *
 * @module pair
 */

/**
 * @template L,R
 */
class Pair {
  /**
   * @param {L} left
   * @param {R} right
   */
  constructor (left, right) {
    this.left = left;
    this.right = right;
  }
}

/**
 * @template L,R
 * @param {L} left
 * @param {R} right
 * @return {Pair<L,R>}
 */
const create = (left, right) => new Pair(left, right);

/**
 * @template L,R
 * @param {R} right
 * @param {L} left
 * @return {Pair<L,R>}
 */
const createReversed = (right, left) => new Pair(left, right);

/**
 * @template L,R
 * @param {Array<Pair<L,R>>} arr
 * @param {function(L, R):any} f
 */
const forEach = (arr, f) => arr.forEach(p => f(p.left, p.right));

/**
 * @template L,R,X
 * @param {Array<Pair<L,R>>} arr
 * @param {function(L, R):X} f
 * @return {Array<X>}
 */
const map = (arr, f) => arr.map(p => f(p.left, p.right));

var pair = /*#__PURE__*/Object.freeze({
  __proto__: null,
  Pair: Pair,
  create: create,
  createReversed: createReversed,
  forEach: forEach,
  map: map
});

exports.Pair = Pair;
exports.create = create;
exports.createReversed = createReversed;
exports.forEach = forEach;
exports.map = map;
exports.pair = pair;
//# sourceMappingURL=pair-ab022bc3.cjs.map
