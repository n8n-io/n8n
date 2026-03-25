/**
 * ECDSA is an asymmetric key for signing
 */

import * as webcrypto from 'lib0/webcrypto'
export { exportKeyJwk, exportKeyRaw } from './common.js'

/**
 * @typedef {Array<'sign'|'verify'>} Usages
 */

/**
 * @type {Usages}
 */
const defaultUsages = ['sign', 'verify']

const defaultSignAlgorithm = {
  name: 'ECDSA',
  hash: 'SHA-384'
}

/**
 * @experimental The API is not final!
 *
 * Sign a message
 *
 * @param {CryptoKey} key
 * @param {Uint8Array<ArrayBuffer>} data
 * @return {PromiseLike<Uint8Array<ArrayBuffer>>} signature
 */
export const sign = (key, data) =>
  webcrypto.subtle.sign(
    defaultSignAlgorithm,
    key,
    data
  ).then(signature => new Uint8Array(signature))

/**
 * @experimental The API is not final!
 *
 * Sign a message
 *
 * @param {CryptoKey} key
 * @param {Uint8Array<ArrayBuffer>} signature
 * @param {Uint8Array<ArrayBuffer>} data
 * @return {PromiseLike<boolean>} signature
 */
export const verify = (key, signature, data) =>
  webcrypto.subtle.verify(
    defaultSignAlgorithm,
    key,
    signature,
    data
  )

const defaultKeyAlgorithm = {
  name: 'ECDSA',
  namedCurve: 'P-384'
}

/* c8 ignore next */
/**
 * @param {Object} opts
 * @param {boolean} [opts.extractable]
 * @param {Usages} [opts.usages]
 */
export const generateKeyPair = ({ extractable = false, usages = defaultUsages } = {}) =>
  webcrypto.subtle.generateKey(
    defaultKeyAlgorithm,
    extractable,
    usages
  )

/**
 * @param {any} jwk
 * @param {Object} opts
 * @param {boolean} [opts.extractable]
 * @param {Usages} [opts.usages]
 */
export const importKeyJwk = (jwk, { extractable = false, usages } = {}) => {
  if (usages == null) {
    /* c8 ignore next 2 */
    usages = jwk.key_ops || defaultUsages
  }
  return webcrypto.subtle.importKey('jwk', jwk, defaultKeyAlgorithm, extractable, /** @type {Usages} */ (usages))
}

/**
 * Only suited for importing public keys.
 *
 * @param {any} raw
 * @param {Object} opts
 * @param {boolean} [opts.extractable]
 * @param {Usages} [opts.usages]
 */
export const importKeyRaw = (raw, { extractable = false, usages = defaultUsages } = {}) =>
  webcrypto.subtle.importKey('raw', raw, defaultKeyAlgorithm, extractable, usages)
