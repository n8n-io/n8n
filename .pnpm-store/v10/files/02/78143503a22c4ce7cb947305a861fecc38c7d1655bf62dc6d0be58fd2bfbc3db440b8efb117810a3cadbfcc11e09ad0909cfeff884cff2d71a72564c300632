import { isPlainObject, validKeys, buildRecursive } from '../utils/index'

export function toSortedQueryString(entry) {
  if (!isPlainObject(entry)) {
    return entry
  }

  return validKeys(entry)
    .sort()
    .map((key) => {
      const value = entry[key]

      if (isPlainObject(value)) {
        return toSortedQueryString(value)
      }

      return buildRecursive(key, value)
    })
    .join('&')
    .replace(/%20/g, '+')
}

/**
 * Filters an `object` by keeping only the keys fulfilling the `predicate`
 *
 * @param {Object} object - An object
 * @param {Function} predicate - A function of type (key: string) => boolean
 * @returns {Object} The filtered object
 */
function filterByPredicate(object, predicate) {
  return Object.entries(object)
    .filter(([key]) => predicate(key))
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {})
}

/**
 * Verify if the object `A` is contained within object `B` - shallowly.
 * In other words, is A a subset of B?
 *
 * @see https://en.wikipedia.org/wiki/Subset
 *
 * @param {Object} A - The object to test
 * @param {Object} B - The superset object to verify against
 * @returns A boolean representing if A is a shallow subset of B
 */
export function isSubset(A, B) {
  // Make B only contain the non-nullish keys it has in in common with A
  const keysFromA = validKeys(A)
  const filteredB = filterByPredicate(B, (keyFromB) => keysFromA.includes(keyFromB))

  return toSortedQueryString(A) === toSortedQueryString(filteredB)
}

/**
 * Sort the query params on a URL based on the 'key=value' string value.
 * E.g. /example?b=2&a=1 will become /example?a=1&b=2
 *
 * @param {String} url - a URL that should be sorted (with or without query params)
 */
export function sortedUrl(url) {
  const urlParts = url.split('?')
  if (urlParts.length > 1) {
    const query = urlParts[1]
    const sortedQuery = query.split('&').sort().join('&')
    return `${urlParts[0]}?${sortedQuery}`
  } else {
    return urlParts[0]
  }
}
