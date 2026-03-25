/*
 * MIT License
 *
 * Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (https://sindresorhus.com)
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software
 * and associated documentation files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial
 * portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT
 * NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

const array = []
const characterCodeCache = []

module.exports = function leven (first, second) {
  if (first === second) {
    return 0
  }

  const swap = first

  // Swapping the strings if `a` is longer than `b` so we know which one is the
  // shortest & which one is the longest
  if (first.length > second.length) {
    first = second
    second = swap
  }

  let firstLength = first.length
  let secondLength = second.length

  // Performing suffix trimming:
  // We can linearly drop suffix common to both strings since they
  // don't increase distance at all
  // Note: `~-` is the bitwise way to perform a `- 1` operation
  while (firstLength > 0 && (first.charCodeAt(~-firstLength) === second.charCodeAt(~-secondLength))) {
    firstLength--
    secondLength--
  }

  // Performing prefix trimming
  // We can linearly drop prefix common to both strings since they
  // don't increase distance at all
  let start = 0

  while (start < firstLength && (first.charCodeAt(start) === second.charCodeAt(start))) {
    start++
  }

  firstLength -= start
  secondLength -= start

  if (firstLength === 0) {
    return secondLength
  }

  let bCharacterCode
  let result
  let temporary
  let temporary2
  let index = 0
  let index2 = 0

  while (index < firstLength) {
    characterCodeCache[index] = first.charCodeAt(start + index)
    array[index] = ++index
  }

  while (index2 < secondLength) {
    bCharacterCode = second.charCodeAt(start + index2)
    temporary = index2++
    result = index2

    for (index = 0; index < firstLength; index++) {
      temporary2 = bCharacterCode === characterCodeCache[index] ? temporary : temporary + 1
      temporary = array[index]
      // eslint-disable-next-line no-multi-assign
      result = array[index] = temporary > result ? (temporary2 > result ? result + 1 : temporary2) : (temporary2 > temporary ? temporary + 1 : temporary2)
    }
  }

  return result
}
