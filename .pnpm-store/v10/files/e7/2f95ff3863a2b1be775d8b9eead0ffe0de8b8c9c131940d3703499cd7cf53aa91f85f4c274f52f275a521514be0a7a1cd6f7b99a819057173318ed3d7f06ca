/**
 * RSA-OAEP is an asymmetric keypair used for encryption
 */

import * as webcrypto from 'lib0/webcrypto'
export { exportKeyJwk } from './common.js'

/**
 * @typedef {Array<'encrypt'|'decrypt'>} Usages
 */

/**
 * @type {Usages}
 */
const defaultUsages = ['encrypt', 'decrypt']

/**
 * Note that the max data size is limited by the size of the RSA key.
 *
 * @param {CryptoKey} key
 * @param {Uint8Array<ArrayBuffer>} data
 * @return {PromiseLike<Uint8Array<ArrayBuffer>>}
 */
export const encrypt = (key, data) =>
  webcrypto.subtle.encrypt(
    {
      name: 'RSA-OAEP'
    },
    key,
    data
  ).then(buf => new Uint8Array(buf))

/**
 * @experimental The API is not final!
 *
 * Decrypt some data using AES-GCM method.
 *
 * @param {CryptoKey} key
 * @param {Uint8Array<ArrayBuffer>} data
 * @return {PromiseLike<Uint8Array>} decrypted buffer
 */
export const decrypt = (key, data) =>
  webcrypto.subtle.decrypt(
    {
      name: 'RSA-OAEP'
    },
    key,
    data
  ).then(data => new Uint8Array(data))

/**
 * @param {Object} opts
 * @param {boolean} [opts.extractable]
 * @param {Usages} [opts.usages]
 * @return {Promise<CryptoKeyPair>}
 */
export const generateKeyPair = ({ extractable = false, usages = defaultUsages } = {}) =>
  webcrypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 4096,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256'
    },
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
    /* c8 ignore next */
    usages = jwk.key_ops || defaultUsages
  }
  return webcrypto.subtle.importKey('jwk', jwk, { name: 'RSA-OAEP', hash: 'SHA-256' }, extractable, /** @type {Usages} */ (usages))
}
