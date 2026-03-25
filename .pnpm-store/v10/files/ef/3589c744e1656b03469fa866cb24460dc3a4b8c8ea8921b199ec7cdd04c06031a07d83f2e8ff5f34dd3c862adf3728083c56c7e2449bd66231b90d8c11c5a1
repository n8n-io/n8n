/**
 * @param {T[]} array
 * @returns T[]
 * @template T
 */
module.exports = array => {
  if (!Array.isArray(array)) {
    throw new TypeError("'array' is not an array")
  }

  if (array.length < 2) {
    return array
  }

  const copy = array.slice()

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = copy[i]
    copy[i] = copy[j]
    copy[j] = temp
  }

  return copy
}
