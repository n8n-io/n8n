'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var encoding = require('./encoding-1a745c43.cjs');
var decoding = require('./decoding-76e75827.cjs');
var webcrypto = require('lib0/webcrypto');
var string = require('./string-fddc5f8b.cjs');
var common = require('./common.cjs');
require('./math-96d5e8c4.cjs');
require('./number-1fb57bba.cjs');
require('./binary-ac8e39e2.cjs');
require('./array-78849c95.cjs');
require('./set-5b47859e.cjs');
require('./error-0c1f634f.cjs');

function _interopNamespace(e) {
  if (e && e.__esModule) return e;
  var n = Object.create(null);
  if (e) {
    Object.keys(e).forEach(function (k) {
      if (k !== 'default') {
        var d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: function () { return e[k]; }
        });
      }
    });
  }
  n["default"] = e;
  return Object.freeze(n);
}

var webcrypto__namespace = /*#__PURE__*/_interopNamespace(webcrypto);

/**
 * AES-GCM is a symmetric key for encryption
 */

/**
 * @typedef {Array<'encrypt'|'decrypt'>} Usages
 */

/**
 * @type {Usages}
 */
const defaultUsages = ['encrypt', 'decrypt'];

/**
 * @param {CryptoKey} key
 * @param {Uint8Array<ArrayBuffer>} data
 */
const encrypt = (key, data) => {
  const iv = webcrypto__namespace.getRandomValues(new Uint8Array(16)); // 92bit is enough. 128bit is recommended if space is not an issue.
  return webcrypto__namespace.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv
    },
    key,
    data
  ).then(cipher => {
    const encryptedDataEncoder = encoding.createEncoder();
    // iv may be sent in the clear to the other peers
    encoding.writeUint8Array(encryptedDataEncoder, iv);
    encoding.writeVarUint8Array(encryptedDataEncoder, new Uint8Array(cipher));
    return encoding.toUint8Array(encryptedDataEncoder)
  })
};

/**
 * @experimental The API is not final!
 *
 * Decrypt some data using AES-GCM method.
 *
 * @param {CryptoKey} key
 * @param {Uint8Array<ArrayBuffer>} data
 * @return {PromiseLike<Uint8Array>} decrypted buffer
 */
const decrypt = (key, data) => {
  const dataDecoder = decoding.createDecoder(data);
  const iv = decoding.readUint8Array(dataDecoder, 16);
  const cipher = decoding.readVarUint8Array(dataDecoder);
  return webcrypto__namespace.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv
    },
    key,
    cipher
  ).then(data => new Uint8Array(data))
};

const aesAlgDef = {
  name: 'AES-GCM',
  length: 256
};

/**
 * @param {any} jwk
 * @param {Object} opts
 * @param {Usages} [opts.usages]
 * @param {boolean} [opts.extractable]
 */
const importKeyJwk = (jwk, { usages, extractable = false } = {}) => {
  if (usages == null) {
    /* c8 ignore next */
    usages = jwk.key_ops || defaultUsages;
  }
  return webcrypto__namespace.subtle.importKey('jwk', jwk, 'AES-GCM', extractable, /** @type {Usages} */ (usages))
};

/**
 * Only suited for importing public keys.
 *
 * @param {Uint8Array<ArrayBuffer>} raw
 * @param {Object} opts
 * @param {Usages} [opts.usages]
 * @param {boolean} [opts.extractable]
 */
const importKeyRaw = (raw, { usages = defaultUsages, extractable = false } = {}) =>
  webcrypto__namespace.subtle.importKey('raw', raw, aesAlgDef, extractable, /** @type {Usages} */ (usages));

/**
 * @param {Uint8Array<ArrayBuffer> | string} data
 */
/* c8 ignore next */
const toBinary = data => typeof data === 'string' ? string.encodeUtf8(data) : data;

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
const deriveKey = (secret, salt, { extractable = false, usages = defaultUsages } = {}) =>
  webcrypto__namespace.subtle.importKey(
    'raw',
    toBinary(secret),
    'PBKDF2',
    false,
    ['deriveKey']
  ).then(keyMaterial =>
    webcrypto__namespace.subtle.deriveKey(
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
  );

exports.exportKeyJwk = common.exportKeyJwk;
exports.exportKeyRaw = common.exportKeyRaw;
exports.decrypt = decrypt;
exports.deriveKey = deriveKey;
exports.encrypt = encrypt;
exports.importKeyJwk = importKeyJwk;
exports.importKeyRaw = importKeyRaw;
//# sourceMappingURL=aes-gcm.cjs.map
