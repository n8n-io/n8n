'use strict'

const assert = require('node:assert')
const { runtimeFeatures } = require('../../util/runtime-features.js')

/**
 * @typedef {object} Metadata
 * @property {SRIHashAlgorithm} alg - The algorithm used for the hash.
 * @property {string} val - The base64-encoded hash value.
 */

/**
 * @typedef {Metadata[]} MetadataList
 */

/**
 * @typedef {('sha256' | 'sha384' | 'sha512')} SRIHashAlgorithm
 */

/**
 * @type {Map<SRIHashAlgorithm, number>}
 *
 * The valid SRI hash algorithm token set is the ordered set « "sha256",
 * "sha384", "sha512" » (corresponding to SHA-256, SHA-384, and SHA-512
 * respectively). The ordering of this set is meaningful, with stronger
 * algorithms appearing later in the set.
 *
 * @see https://w3c.github.io/webappsec-subresource-integrity/#valid-sri-hash-algorithm-token-set
 */
const validSRIHashAlgorithmTokenSet = new Map([['sha256', 0], ['sha384', 1], ['sha512', 2]])

// https://nodejs.org/api/crypto.html#determining-if-crypto-support-is-unavailable
/** @type {import('node:crypto')} */
let crypto

if (runtimeFeatures.has('crypto')) {
  crypto = require('node:crypto')
  const cryptoHashes = crypto.getHashes()

  // If no hashes are available, we cannot support SRI.
  if (cryptoHashes.length === 0) {
    validSRIHashAlgorithmTokenSet.clear()
  }

  for (const algorithm of validSRIHashAlgorithmTokenSet.keys()) {
    // If the algorithm is not supported, remove it from the list.
    if (cryptoHashes.includes(algorithm) === false) {
      validSRIHashAlgorithmTokenSet.delete(algorithm)
    }
  }
} else {
  // If crypto is not available, we cannot support SRI.
  validSRIHashAlgorithmTokenSet.clear()
}

/**
 * @typedef GetSRIHashAlgorithmIndex
 * @type {(algorithm: SRIHashAlgorithm) => number}
 * @param {SRIHashAlgorithm} algorithm
 * @returns {number} The index of the algorithm in the valid SRI hash algorithm
 * token set.
 */

const getSRIHashAlgorithmIndex = /** @type {GetSRIHashAlgorithmIndex} */ (Map.prototype.get.bind(
  validSRIHashAlgorithmTokenSet))

/**
 * @typedef IsValidSRIHashAlgorithm
 * @type {(algorithm: string) => algorithm is SRIHashAlgorithm}
 * @param {*} algorithm
 * @returns {algorithm is SRIHashAlgorithm}
 */

const isValidSRIHashAlgorithm = /** @type {IsValidSRIHashAlgorithm} */ (
  Map.prototype.has.bind(validSRIHashAlgorithmTokenSet)
)

/**
 * @param {Uint8Array} bytes
 * @param {string} metadataList
 * @returns {boolean}
 *
 * @see https://w3c.github.io/webappsec-subresource-integrity/#does-response-match-metadatalist
 */
const bytesMatch = runtimeFeatures.has('crypto') === false || validSRIHashAlgorithmTokenSet.size === 0
  // If node is not built with OpenSSL support, we cannot check
  // a request's integrity, so allow it by default (the spec will
  // allow requests if an invalid hash is given, as precedence).
  ? () => true
  : (bytes, metadataList) => {
    // 1. Let parsedMetadata be the result of parsing metadataList.
      const parsedMetadata = parseMetadata(metadataList)

      // 2. If parsedMetadata is empty set, return true.
      if (parsedMetadata.length === 0) {
        return true
      }

      // 3. Let metadata be the result of getting the strongest
      //    metadata from parsedMetadata.
      const metadata = getStrongestMetadata(parsedMetadata)

      // 4. For each item in metadata:
      for (const item of metadata) {
      // 1. Let algorithm be the item["alg"].
        const algorithm = item.alg

        // 2. Let expectedValue be the item["val"].
        const expectedValue = item.val

        // See https://github.com/web-platform-tests/wpt/commit/e4c5cc7a5e48093220528dfdd1c4012dc3837a0e
        // "be liberal with padding". This is annoying, and it's not even in the spec.

        // 3. Let actualValue be the result of applying algorithm to bytes .
        const actualValue = applyAlgorithmToBytes(algorithm, bytes)

        // 4. If actualValue is a case-sensitive match for expectedValue,
        //    return true.
        if (caseSensitiveMatch(actualValue, expectedValue)) {
          return true
        }
      }

      // 5. Return false.
      return false
    }

/**
 * @param {MetadataList} metadataList
 * @returns {MetadataList} The strongest hash algorithm from the metadata list.
 */
function getStrongestMetadata (metadataList) {
  // 1. Let result be the empty set and strongest be the empty string.
  const result = []
  /** @type {Metadata|null} */
  let strongest = null

  // 2. For each item in set:
  for (const item of metadataList) {
    // 1. Assert: item["alg"] is a valid SRI hash algorithm token.
    assert(isValidSRIHashAlgorithm(item.alg), 'Invalid SRI hash algorithm token')

    // 2. If result is the empty set, then:
    if (result.length === 0) {
      // 1. Append item to result.
      result.push(item)

      // 2. Set strongest to item.
      strongest = item

      // 3. Continue.
      continue
    }

    // 3. Let currentAlgorithm be strongest["alg"], and currentAlgorithmIndex be
    // the index of currentAlgorithm in the valid SRI hash algorithm token set.
    const currentAlgorithm = /** @type {Metadata} */ (strongest).alg
    const currentAlgorithmIndex = getSRIHashAlgorithmIndex(currentAlgorithm)

    // 4. Let newAlgorithm be the item["alg"], and newAlgorithmIndex be the
    // index of newAlgorithm in the valid SRI hash algorithm token set.
    const newAlgorithm = item.alg
    const newAlgorithmIndex = getSRIHashAlgorithmIndex(newAlgorithm)

    // 5. If newAlgorithmIndex is less than currentAlgorithmIndex, then continue.
    if (newAlgorithmIndex < currentAlgorithmIndex) {
      continue

    // 6. Otherwise, if newAlgorithmIndex is greater than
    // currentAlgorithmIndex:
    } else if (newAlgorithmIndex > currentAlgorithmIndex) {
      // 1. Set strongest to item.
      strongest = item

      // 2. Set result to « item ».
      result[0] = item
      result.length = 1

    // 7. Otherwise, newAlgorithmIndex and currentAlgorithmIndex are the same
    // value. Append item to result.
    } else {
      result.push(item)
    }
  }

  // 3. Return result.
  return result
}

/**
 * @param {string} metadata
 * @returns {MetadataList}
 *
 * @see https://w3c.github.io/webappsec-subresource-integrity/#parse-metadata
 */
function parseMetadata (metadata) {
  // 1. Let result be the empty set.
  /** @type {MetadataList} */
  const result = []

  // 2. For each item returned by splitting metadata on spaces:
  for (const item of metadata.split(' ')) {
    // 1. Let expression-and-options be the result of splitting item on U+003F (?).
    const expressionAndOptions = item.split('?', 1)

    // 2. Let algorithm-expression be expression-and-options[0].
    const algorithmExpression = expressionAndOptions[0]

    // 3. Let base64-value be the empty string.
    let base64Value = ''

    // 4. Let algorithm-and-value be the result of splitting algorithm-expression on U+002D (-).
    const algorithmAndValue = [algorithmExpression.slice(0, 6), algorithmExpression.slice(7)]

    // 5. Let algorithm be algorithm-and-value[0].
    const algorithm = algorithmAndValue[0]

    // 6. If algorithm is not a valid SRI hash algorithm token, then continue.
    if (!isValidSRIHashAlgorithm(algorithm)) {
      continue
    }

    // 7. If algorithm-and-value[1] exists, set base64-value to
    // algorithm-and-value[1].
    if (algorithmAndValue[1]) {
      base64Value = algorithmAndValue[1]
    }

    // 8. Let metadata be the ordered map
    // «["alg" → algorithm, "val" → base64-value]».
    const metadata = {
      alg: algorithm,
      val: base64Value
    }

    // 9. Append metadata to result.
    result.push(metadata)
  }

  // 3. Return result.
  return result
}

/**
 * Applies the specified hash algorithm to the given bytes
 *
 * @typedef {(algorithm: SRIHashAlgorithm, bytes: Uint8Array) => string} ApplyAlgorithmToBytes
 * @param {SRIHashAlgorithm} algorithm
 * @param {Uint8Array} bytes
 * @returns {string}
 */
const applyAlgorithmToBytes = (algorithm, bytes) => {
  return crypto.hash(algorithm, bytes, 'base64')
}

/**
 * Compares two base64 strings, allowing for base64url
 * in the second string.
 *
 * @param {string} actualValue base64 encoded string
 * @param {string} expectedValue base64 or base64url encoded string
 * @returns {boolean}
 */
function caseSensitiveMatch (actualValue, expectedValue) {
  // Ignore padding characters from the end of the strings by
  // decreasing the length by 1 or 2 if the last characters are `=`.
  let actualValueLength = actualValue.length
  if (actualValueLength !== 0 && actualValue[actualValueLength - 1] === '=') {
    actualValueLength -= 1
  }
  if (actualValueLength !== 0 && actualValue[actualValueLength - 1] === '=') {
    actualValueLength -= 1
  }
  let expectedValueLength = expectedValue.length
  if (expectedValueLength !== 0 && expectedValue[expectedValueLength - 1] === '=') {
    expectedValueLength -= 1
  }
  if (expectedValueLength !== 0 && expectedValue[expectedValueLength - 1] === '=') {
    expectedValueLength -= 1
  }

  if (actualValueLength !== expectedValueLength) {
    return false
  }

  for (let i = 0; i < actualValueLength; ++i) {
    if (
      actualValue[i] === expectedValue[i] ||
      (actualValue[i] === '+' && expectedValue[i] === '-') ||
      (actualValue[i] === '/' && expectedValue[i] === '_')
    ) {
      continue
    }
    return false
  }

  return true
}

module.exports = {
  applyAlgorithmToBytes,
  bytesMatch,
  caseSensitiveMatch,
  isValidSRIHashAlgorithm,
  getStrongestMetadata,
  parseMetadata
}
