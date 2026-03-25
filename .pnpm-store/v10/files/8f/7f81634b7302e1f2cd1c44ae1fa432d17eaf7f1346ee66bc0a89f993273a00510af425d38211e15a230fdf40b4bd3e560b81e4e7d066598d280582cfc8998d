'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var math = require('./math-96d5e8c4.cjs');
var binary = require('./binary-ac8e39e2.cjs');
var webcrypto = require('lib0/webcrypto');

/**
 * Isomorphic module for true random numbers / buffers / uuids.
 *
 * Attention: falls back to Math.random if the browser does not support crypto.
 *
 * @module random
 */

const rand = Math.random;

const uint32 = () => webcrypto.getRandomValues(new Uint32Array(1))[0];

const uint53 = () => {
  const arr = webcrypto.getRandomValues(new Uint32Array(8));
  return (arr[0] & binary.BITS21) * (binary.BITS32 + 1) + (arr[1] >>> 0)
};

/**
 * @template T
 * @param {Array<T>} arr
 * @return {T}
 */
const oneOf = arr => arr[math.floor(rand() * arr.length)];

// @ts-ignore
const uuidv4Template = [1e7] + -1e3 + -4e3 + -8e3 + -1e11;

/**
 * @return {string}
 */
const uuidv4 = () => uuidv4Template.replace(/[018]/g, /** @param {number} c */ c =>
  (c ^ uint32() & 15 >> c / 4).toString(16)
);

exports.oneOf = oneOf;
exports.rand = rand;
exports.uint32 = uint32;
exports.uint53 = uint53;
exports.uuidv4 = uuidv4;
//# sourceMappingURL=random.cjs.map
