/**
 * Efficient diffs.
 *
 * @module diff
 */

import { equalityStrict } from './function.js'

/**
 * A SimpleDiff describes a change on a String.
 *
 * ```js
 * console.log(a) // the old value
 * console.log(b) // the updated value
 * // Apply changes of diff (pseudocode)
 * a.remove(diff.index, diff.remove) // Remove `diff.remove` characters
 * a.insert(diff.index, diff.insert) // Insert `diff.insert`
 * a === b // values match
 * ```
 *
 * @template {string|Array<any>} T
 * @typedef {Object} SimpleDiff
 * @property {Number} index The index where changes were applied
 * @property {Number} remove The number of characters to delete starting
 *                                  at `index`.
 * @property {T} insert The new text to insert at `index` after applying
 */

const highSurrogateRegex = /[\uD800-\uDBFF]/
const lowSurrogateRegex = /[\uDC00-\uDFFF]/

/**
 * Create a diff between two strings. This diff implementation is highly
 * efficient, but not very sophisticated.
 *
 * @function
 *
 * @param {string} a The old version of the string
 * @param {string} b The updated version of the string
 * @return {SimpleDiff<string>} The diff description.
 */
export const simpleDiffString = (a, b) => {
  let left = 0 // number of same characters counting from left
  let right = 0 // number of same characters counting from right
  while (left < a.length && left < b.length && a[left] === b[left]) {
    left++
  }
  // If the last same character is a high surrogate, we need to rollback to the previous character
  if (left > 0 && highSurrogateRegex.test(a[left - 1])) left--
  while (right + left < a.length && right + left < b.length && a[a.length - right - 1] === b[b.length - right - 1]) {
    right++
  }
  // If the last same character is a low surrogate, we need to rollback to the previous character
  if (right > 0 && lowSurrogateRegex.test(a[a.length - right])) right--
  return {
    index: left,
    remove: a.length - left - right,
    insert: b.slice(left, b.length - right)
  }
}

/**
 * @todo Remove in favor of simpleDiffString
 * @deprecated
 */
export const simpleDiff = simpleDiffString

/**
 * Create a diff between two arrays. This diff implementation is highly
 * efficient, but not very sophisticated.
 *
 * Note: This is basically the same function as above. Another function was created so that the runtime
 * can better optimize these function calls.
 *
 * @function
 * @template T
 *
 * @param {Array<T>} a The old version of the array
 * @param {Array<T>} b The updated version of the array
 * @param {function(T, T):boolean} [compare]
 * @return {SimpleDiff<Array<T>>} The diff description.
 */
export const simpleDiffArray = (a, b, compare = equalityStrict) => {
  let left = 0 // number of same characters counting from left
  let right = 0 // number of same characters counting from right
  while (left < a.length && left < b.length && compare(a[left], b[left])) {
    left++
  }
  while (right + left < a.length && right + left < b.length && compare(a[a.length - right - 1], b[b.length - right - 1])) {
    right++
  }
  return {
    index: left,
    remove: a.length - left - right,
    insert: b.slice(left, b.length - right)
  }
}

/**
 * Diff text and try to diff at the current cursor position.
 *
 * @param {string} a
 * @param {string} b
 * @param {number} cursor This should refer to the current left cursor-range position
 */
export const simpleDiffStringWithCursor = (a, b, cursor) => {
  let left = 0 // number of same characters counting from left
  let right = 0 // number of same characters counting from right
  // Iterate left to the right until we find a changed character
  // First iteration considers the current cursor position
  while (
    left < a.length &&
    left < b.length &&
    a[left] === b[left] &&
    left < cursor
  ) {
    left++
  }
  // If the last same character is a high surrogate, we need to rollback to the previous character
  if (left > 0 && highSurrogateRegex.test(a[left - 1])) left--
  // Iterate right to the left until we find a changed character
  while (
    right + left < a.length &&
    right + left < b.length &&
    a[a.length - right - 1] === b[b.length - right - 1]
  ) {
    right++
  }
  // If the last same character is a low surrogate, we need to rollback to the previous character
  if (right > 0 && lowSurrogateRegex.test(a[a.length - right])) right--
  // Try to iterate left further to the right without caring about the current cursor position
  while (
    right + left < a.length &&
    right + left < b.length &&
    a[left] === b[left]
  ) {
    left++
  }
  if (left > 0 && highSurrogateRegex.test(a[left - 1])) left--
  return {
    index: left,
    remove: a.length - left - right,
    insert: b.slice(left, b.length - right)
  }
}
