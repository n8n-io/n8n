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
 * ECDSA is an asymmetric key for signing
 */

/**
 * @typedef {Array<'sign'|'verify'>} Usages
 */

/**
 * @type {Usages}
 */
const defaultUsages = ['sign', 'verify'];

const defaultSignAlgorithm = {
  name: 'ECDSA',
  hash: 'SHA-384'
};

/**
 * @experimental The API is not final!
 *
 * Sign a message
 *
 * @param {CryptoKey} key
 * @param {Uint8Array<ArrayBuffer>} data
 * @return {PromiseLike<Uint8Array<ArrayBuffer>>} signature
 */
const sign = (key, data) =>
  webcrypto__namespace.subtle.sign(
    defaultSignAlgorithm,
    key,
    data
  ).then(signature => new Uint8Array(signature));

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
const verify = (key, signature, data) =>
  webcrypto__namespace.subtle.verify(
    defaultSignAlgorithm,
    key,
    signature,
    data
  );

const defaultKeyAlgorithm = {
  name: 'ECDSA',
  namedCurve: 'P-384'
};

/* c8 ignore next */
/**
 * @param {Object} opts
 * @param {boolean} [opts.extractable]
 * @param {Usages} [opts.usages]
 */
const generateKeyPair = ({ extractable = false, usages = defaultUsages } = {}) =>
  webcrypto__namespace.subtle.generateKey(
    defaultKeyAlgorithm,
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
    /* c8 ignore next 2 */
    usages = jwk.key_ops || defaultUsages;
  }
  return webcrypto__namespace.subtle.importKey('jwk', jwk, defaultKeyAlgorithm, extractable, /** @type {Usages} */ (usages))
};

/**
 * Only suited for importing public keys.
 *
 * @param {any} raw
 * @param {Object} opts
 * @param {boolean} [opts.extractable]
 * @param {Usages} [opts.usages]
 */
const importKeyRaw = (raw, { extractable = false, usages = defaultUsages } = {}) =>
  webcrypto__namespace.subtle.importKey('raw', raw, defaultKeyAlgorithm, extractable, usages);

exports.exportKeyJwk = common.exportKeyJwk;
exports.exportKeyRaw = common.exportKeyRaw;
exports.generateKeyPair = generateKeyPair;
exports.importKeyJwk = importKeyJwk;
exports.importKeyRaw = importKeyRaw;
exports.sign = sign;
exports.verify = verify;
//# sourceMappingURL=ecdsa.cjs.map
