'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var webcrypto = require('lib0/webcrypto');
var common = require('./common.cjs');

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
 * RSA-OAEP is an asymmetric keypair used for encryption
 */

/**
 * @typedef {Array<'encrypt'|'decrypt'>} Usages
 */

/**
 * @type {Usages}
 */
const defaultUsages = ['encrypt', 'decrypt'];

/**
 * Note that the max data size is limited by the size of the RSA key.
 *
 * @param {CryptoKey} key
 * @param {Uint8Array<ArrayBuffer>} data
 * @return {PromiseLike<Uint8Array<ArrayBuffer>>}
 */
const encrypt = (key, data) =>
  webcrypto__namespace.subtle.encrypt(
    {
      name: 'RSA-OAEP'
    },
    key,
    data
  ).then(buf => new Uint8Array(buf));

/**
 * @experimental The API is not final!
 *
 * Decrypt some data using AES-GCM method.
 *
 * @param {CryptoKey} key
 * @param {Uint8Array<ArrayBuffer>} data
 * @return {PromiseLike<Uint8Array>} decrypted buffer
 */
const decrypt = (key, data) =>
  webcrypto__namespace.subtle.decrypt(
    {
      name: 'RSA-OAEP'
    },
    key,
    data
  ).then(data => new Uint8Array(data));

/**
 * @param {Object} opts
 * @param {boolean} [opts.extractable]
 * @param {Usages} [opts.usages]
 * @return {Promise<CryptoKeyPair>}
 */
const generateKeyPair = ({ extractable = false, usages = defaultUsages } = {}) =>
  webcrypto__namespace.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 4096,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256'
    },
    extractable,
    usages
  );

/**
 * @param {any} jwk
 * @param {Object} opts
 * @param {boolean} [opts.extractable]
 * @param {Usages} [opts.usages]
 */
const importKeyJwk = (jwk, { extractable = false, usages } = {}) => {
  if (usages == null) {
    /* c8 ignore next */
    usages = jwk.key_ops || defaultUsages;
  }
  return webcrypto__namespace.subtle.importKey('jwk', jwk, { name: 'RSA-OAEP', hash: 'SHA-256' }, extractable, /** @type {Usages} */ (usages))
};

exports.exportKeyJwk = common.exportKeyJwk;
exports.decrypt = decrypt;
exports.encrypt = encrypt;
exports.generateKeyPair = generateKeyPair;
exports.importKeyJwk = importKeyJwk;
//# sourceMappingURL=rsa-oaep.cjs.map
