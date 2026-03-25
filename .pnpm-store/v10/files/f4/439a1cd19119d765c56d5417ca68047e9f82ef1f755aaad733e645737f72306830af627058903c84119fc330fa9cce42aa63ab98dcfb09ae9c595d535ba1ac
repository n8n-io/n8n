/**
 * AES-GCM is a symmetric key for encryption
 */

import * as encoding from '../encoding.js'
import * as decoding from '../decoding.js'
import * as webcrypto from 'lib0/webcrypto'
import * as string from '../string.js'
export { exportKeyJwk, exportKeyRaw } from './common.js'

/**
 * @typedef {Array<'encrypt'|'decrypt'>} Usages
 */

/**
 * @type {Usages}
 */
const defaultUsages = ['encrypt', 'decrypt']

/**
 * @param {CryptoKey} key
 * @param {Uint8Array<ArrayBuffer>} data
 */
export const encrypt = (key, data) => {
  const iv = webcrypto.getRandomValues(new Uint8Array(16)) // 92bit is enough. 128bit is recommended if space is not an issue.
  return webcrypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv
    },
    key,
    data
  ).then(cipher => {
    const encryptedDataEncoder = encoding.createEncoder()
    // iv may be sent in the clear to the other peers
    encoding.writeUint8Array(encryptedDataEncoder, iv)
    encoding.writeVarUint8Array(encryptedDataEncoder, new Uint8Array(cipher))
    return encoding.toUint8Array(encryptedDataEncoder)
  })
}

/**
 * @experimental The API is not final!
 *
 * Decrypt some data using AES-GCM method.
 *
 * @param {CryptoKey} key
 * @param {Uint8Array<ArrayBuffer>} data
 * @return {PromiseLike<Uint8Array>} decrypted buffer
 */
export const decrypt = (key, data) => {
  const dataDecoder = decoding.createDecoder(data)
  const iv = decoding.readUint8Array(dataDecoder, 16)
  const cipher = decoding.readVarUint8Array(dataDecoder)
  return webcrypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv
    },
    key,
    cipher
  ).then(data => new Uint8Array(data))
}

const aesAlgDef = {
  name: 'AES-GCM',
  length: 256
}

/**
 * @param {any} jwk
 * @param {Object} opts
 * @param {Usages} [opts.usages]
 * @param {boolean} [opts.extractable]
 */
export const importKeyJwk = (jwk, { usages, extractable = false } = {}) => {
  if (usages == null) {
    /* c8 ignore next */
    usages = jwk.key_ops || defaultUsages
  }
  return webcrypto.subtle.importKey('jwk', jwk, 'AES-GCM', extractable, /** @type {Usages} */ (usages))
}

/**
 * Only suited for importing public keys.
 *
 * @param {Uint8Array<ArrayBuffer>} raw
 * @param {Object} opts
 * @param {Usages} [opts.usages]
 * @param {boolean} [opts.extractable]
 */
export const importKeyRaw = (raw, { usages = defaultUsages, extractable = false } = {}) =>
  webcrypto.subtle.importKey('raw', raw, aesAlgDef, extractable, /** @type {Usages} */ (usages))

/**
 * @param {Uint8Array<ArrayBuffer> | string} data
 */
/* c8 ignore next */
const toBinary = data => typeof data === 'string' ? string.encodeUtf8(data) : data

/**
 * @experimental The API is not final!
 *
 * Derive an symmetric key using the Password-Based-Key-Derivation-Function-2.
 *
 * @param {Uint8Array<ArrayBuffer>|string} secret
 * @param {Uint8Array<ArrayBuffer>|string} salt
 * @param {Object} opts
 * @param {boolean} [opts.extractable]
 * @param {Usages} [opts.usages]
 */
export const deriveKey = (secret, salt, { extractable = false, usages = defaultUsages } = {}) =>
  webcrypto.subtle.importKey(
    'raw',
    toBinary(secret),
    'PBKDF2',
    false,
    ['deriveKey']
  ).then(keyMaterial =>
    webcrypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: toBinary(salt), // NIST recommends at least 64 bits
        iterations: 600000, // OWASP recommends 600k iterations
        hash: 'SHA-256'
      },
      keyMaterial,
      aesAlgDef,
      extractable,
      usages
    )
  )
