/**
 * The idea of the Rabin fingerprint algorithm is to represent the binary as a polynomial in a
 * finite field (Galois Field G(2)). The polynomial will then be taken "modulo" by an irreducible
 * polynomial of the desired size.
 *
 * This implementation is inefficient and is solely used to verify the actually performant
 * implementation in `./rabin.js`.
 *
 * @module rabin-gf2-polynomial
 */

import * as math from '../math.js'
import * as webcrypto from 'lib0/webcrypto'
import * as array from '../array.js'
import * as buffer from '../buffer.js'

/**
 * @param {number} degree
 */
const _degreeToMinByteLength = degree => math.floor(degree / 8) + 1

/**
 * This is a GF2 Polynomial abstraction that is not meant for production!
 *
 * It is easy to understand and it's correctness is as obvious as possible. It can be used to verify
 * efficient implementations of algorithms on GF2.
 */
export class GF2Polynomial {
  constructor () {
    /**
      * @type {Set<number>}
      */
    this.degrees = new Set()
  }
}

/**
 * From Uint8Array (MSB).
 *
 * @param {Uint8Array} bytes
 */
export const createFromBytes = bytes => {
  const p = new GF2Polynomial()
  for (let bsi = bytes.length - 1, currDegree = 0; bsi >= 0; bsi--) {
    const currByte = bytes[bsi]
    for (let i = 0; i < 8; i++) {
      if (((currByte >>> i) & 1) === 1) {
        p.degrees.add(currDegree)
      }
      currDegree++
    }
  }
  return p
}

/**
 * Transform to Uint8Array (MSB).
 *
 * @param {GF2Polynomial} p
 * @param {number} byteLength
 */
export const toUint8Array = (p, byteLength = _degreeToMinByteLength(getHighestDegree(p))) => {
  const buf = buffer.createUint8ArrayFromLen(byteLength)
  /**
   * @param {number} i
   */
  const setBit = i => {
    const bi = math.floor(i / 8)
    buf[buf.length - 1 - bi] |= (1 << (i % 8))
  }
  p.degrees.forEach(setBit)
  return buf
}

/**
 * Create from unsigned integer (max 32bit uint) - read most-significant-byte first.
 *
 * @param {number} uint
 */
export const createFromUint = uint => {
  const buf = new Uint8Array(4)
  for (let i = 0; i < 4; i++) {
    buf[i] = uint >>> 8 * (3 - i)
  }
  return createFromBytes(buf)
}

/**
 * Create a random polynomial of a specified degree.
 *
 * @param {number} degree
 */
export const createRandom = degree => {
  const bs = new Uint8Array(_degreeToMinByteLength(degree))
  webcrypto.getRandomValues(bs)
  // Get first byte and explicitly set the bit of "degree" to 1 (the result must have the specified
  // degree).
  const firstByte = bs[0] | 1 << (degree % 8)
  // Find out how many bits of the first byte need to be filled with zeros because they are >degree.
  const zeros = 7 - (degree % 8)
  bs[0] = ((firstByte << zeros) & 0xff) >>> zeros
  return createFromBytes(bs)
}

/**
 * @param {GF2Polynomial} p
 * @return number
 */
export const getHighestDegree = p => array.fold(array.from(p.degrees), 0, math.max)

/**
 * Add (+) p2 int the p1 polynomial.
 *
 * Addition is defined as xor in F2. Substraction is equivalent to addition in F2.
 *
 * @param {GF2Polynomial} p1
 * @param {GF2Polynomial} p2
 */
export const addInto = (p1, p2) => {
  p2.degrees.forEach(degree => {
    if (p1.degrees.has(degree)) {
      p1.degrees.delete(degree)
    } else {
      p1.degrees.add(degree)
    }
  })
}

/**
 * Or (|) p2 into the p1 polynomial.
 *
 * Addition is defined as xor in F2. Substraction is equivalent to addition in F2.
 *
 * @param {GF2Polynomial} p1
 * @param {GF2Polynomial} p2
 */
export const orInto = (p1, p2) => {
  p2.degrees.forEach(degree => {
    p1.degrees.add(degree)
  })
}

/**
 * Add (+) p2 to the p1 polynomial.
 *
 * Addition is defined as xor in F2. Substraction is equivalent to addition in F2.
 *
 * @param {GF2Polynomial} p1
 * @param {GF2Polynomial} p2
 */
export const add = (p1, p2) => {
  const result = new GF2Polynomial()
  p2.degrees.forEach(degree => {
    if (!p1.degrees.has(degree)) {
      result.degrees.add(degree)
    }
  })
  p1.degrees.forEach(degree => {
    if (!p2.degrees.has(degree)) {
      result.degrees.add(degree)
    }
  })
  return result
}

/**
 * Add (+) p2 to the p1 polynomial.
 *
 * Addition is defined as xor in F2. Substraction is equivalent to addition in F2.
 *
 * @param {GF2Polynomial} p
 */
export const clone = (p) => {
  const result = new GF2Polynomial()
  p.degrees.forEach(d => result.degrees.add(d))
  return result
}

/**
 * Add (+) p2 to the p1 polynomial.
 *
 * Addition is defined as xor in F2. Substraction is equivalent to addition in F2.
 *
 * @param {GF2Polynomial} p
 * @param {number} degree
 */
export const addDegreeInto = (p, degree) => {
  if (p.degrees.has(degree)) {
    p.degrees.delete(degree)
  } else {
    p.degrees.add(degree)
  }
}

/**
 * Multiply (•) p1 with p2 and store the result in p1.
 *
 * @param {GF2Polynomial} p1
 * @param {GF2Polynomial} p2
 */
export const multiply = (p1, p2) => {
  const result = new GF2Polynomial()
  p1.degrees.forEach(degree1 => {
    p2.degrees.forEach(degree2 => {
      addDegreeInto(result, degree1 + degree2)
    })
  })
  return result
}

/**
 * Multiply (•) p1 with p2 and store the result in p1.
 *
 * @param {GF2Polynomial} p
 * @param {number} shift
 */
export const shiftLeft = (p, shift) => {
  const result = new GF2Polynomial()
  p.degrees.forEach(degree => {
    const r = degree + shift
    r >= 0 && result.degrees.add(r)
  })
  return result
}

/**
 * Computes p1 % p2. I.e. the remainder of p1/p2.
 *
 * @param {GF2Polynomial} p1
 * @param {GF2Polynomial} p2
 */
export const mod = (p1, p2) => {
  const maxDeg1 = getHighestDegree(p1)
  const maxDeg2 = getHighestDegree(p2)
  const result = clone(p1)
  for (let i = maxDeg1 - maxDeg2; i >= 0; i--) {
    if (result.degrees.has(maxDeg2 + i)) {
      const shifted = shiftLeft(p2, i)
      addInto(result, shifted)
    }
  }
  return result
}

/**
 * Computes (p^e mod m).
 *
 * http://en.wikipedia.org/wiki/Modular_exponentiation
 *
 * @param {GF2Polynomial} p
 * @param {number} e
 * @param {GF2Polynomial} m
 */
export const modPow = (p, e, m) => {
  let result = ONE
  while (true) {
    if ((e & 1) === 1) {
      result = mod(multiply(result, p), m)
    }
    e >>>= 1
    if (e === 0) {
      return result
    }
    p = mod(multiply(p, p), m)
  }
}

/**
 * Find the greatest common divisor using Euclid's Algorithm.
 *
 * @param {GF2Polynomial} p1
 * @param {GF2Polynomial} p2
 */
export const gcd = (p1, p2) => {
  while (p2.degrees.size > 0) {
    const modded = mod(p1, p2)
    p1 = p2
    p2 = modded
  }
  return p1
}

/**
 * true iff p1 equals p2
 *
 * @param {GF2Polynomial} p1
 * @param {GF2Polynomial} p2
 */
export const equals = (p1, p2) => {
  if (p1.degrees.size !== p2.degrees.size) return false
  for (const d of p1.degrees) {
    if (!p2.degrees.has(d)) return false
  }
  return true
}

const X = createFromBytes(new Uint8Array([2]))
const ONE = createFromBytes(new Uint8Array([1]))

/**
 * Computes ( x^(2^p) - x ) mod f
 *
 * (shamelessly copied from
 * https://github.com/opendedup/rabinfingerprint/blob/master/src/org/rabinfingerprint/polynomial/Polynomial.java)
 *
 * @param {GF2Polynomial} f
 * @param {number} p
 */
const reduceExponent = (f, p) => {
  // compute (x^q^p mod f)
  const q2p = math.pow(2, p)
  const x2q2p = modPow(X, q2p, f)
  // subtract (x mod f)
  return mod(add(x2q2p, X), f)
}

/**
 * BenOr Reducibility Test
 *
 * Tests and Constructions of Irreducible Polynomials over Finite Fields
 * (1997) Shuhong Gao, Daniel Panario
 *
 * http://citeseer.ist.psu.edu/cache/papers/cs/27167/http:zSzzSzwww.math.clemson.eduzSzfacultyzSzGaozSzpaperszSzGP97a.pdf/gao97tests.pdf
 *
 * @param {GF2Polynomial} p
 */
export const isIrreducibleBenOr = p => {
  const degree = getHighestDegree(p)
  for (let i = 1; i < degree / 2; i++) {
    const b = reduceExponent(p, i)
    const g = gcd(p, b)
    if (!equals(g, ONE)) {
      return false
    }
  }
  return true
}

/**
 * @param {number} degree
 */
export const createIrreducible = degree => {
  while (true) {
    const p = createRandom(degree)
    if (isIrreducibleBenOr(p)) return p
  }
}

/**
 * Create a fingerprint of buf using the irreducible polynomial m.
 *
 * @param {Uint8Array} buf
 * @param {GF2Polynomial} m
 */
export const fingerprint = (buf, m) => toUint8Array(mod(createFromBytes(buf), m), _degreeToMinByteLength(getHighestDegree(m) - 1))

export class RabinPolynomialEncoder {
  /**
   * @param {GF2Polynomial} m The irreducible polynomial
   */
  constructor (m) {
    this.fingerprint = new GF2Polynomial()
    this.m = m
  }

  /**
   * @param {number} b
   */
  write (b) {
    const bp = createFromBytes(new Uint8Array([b]))
    const fingerprint = shiftLeft(this.fingerprint, 8)
    orInto(fingerprint, bp)
    this.fingerprint = mod(fingerprint, this.m)
  }

  getFingerprint () {
    return toUint8Array(this.fingerprint, _degreeToMinByteLength(getHighestDegree(this.m) - 1))
  }
}
