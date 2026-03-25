'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var webcrypto = require('lib0/webcrypto');

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
 * @param {CryptoKey} key
 */
const exportKeyJwk = async key => {
  const jwk = await webcrypto__namespace.subtle.exportKey('jwk', key);
  jwk.key_ops = key.usages;
  return jwk
};

/**
 * Only suited for exporting public keys.
 *
 * @param {CryptoKey} key
 * @return {Promise<Uint8Array<ArrayBuffer>>}
 */
const exportKeyRaw = key =>
  webcrypto__namespace.subtle.exportKey('raw', key).then(key => new Uint8Array(key));

exports.exportKeyJwk = exportKeyJwk;
exports.exportKeyRaw = exportKeyRaw;
//# sourceMappingURL=common.cjs.map
