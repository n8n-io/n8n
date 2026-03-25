/**
 * @param {number} count
 * @param {(index: number) => T} [callback]
 * @template T
 */
const seq = (count, callback = x => x) =>
  new Array(count).fill(0).map((_, index) => callback(index))

module.exports = seq
