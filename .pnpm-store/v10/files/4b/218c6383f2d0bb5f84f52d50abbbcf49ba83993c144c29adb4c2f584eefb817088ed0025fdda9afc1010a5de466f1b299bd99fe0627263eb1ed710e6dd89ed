'use strict';

require('yjs');
var encoding = require('lib0/dist/encoding.cjs');
var decoding = require('lib0/dist/decoding.cjs');

function _interopNamespaceDefault(e) {
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
  n.default = e;
  return Object.freeze(n);
}

var encoding__namespace = /*#__PURE__*/_interopNamespaceDefault(encoding);
var decoding__namespace = /*#__PURE__*/_interopNamespaceDefault(decoding);

const messagePermissionDenied = 0;

/**
 * @param {encoding.Encoder} encoder
 * @param {string} reason
 */
const writePermissionDenied = (encoder, reason) => {
  encoding__namespace.writeVarUint(encoder, messagePermissionDenied);
  encoding__namespace.writeVarString(encoder, reason);
};

/**
 * @callback PermissionDeniedHandler
 * @param {any} y
 * @param {string} reason
 */

/**
 *
 * @param {decoding.Decoder} decoder
 * @param {Y.Doc} y
 * @param {PermissionDeniedHandler} permissionDeniedHandler
 */
const readAuthMessage = (decoder, y, permissionDeniedHandler) => {
  switch (decoding__namespace.readVarUint(decoder)) {
    case messagePermissionDenied: permissionDeniedHandler(y, decoding__namespace.readVarString(decoder));
  }
};

exports.messagePermissionDenied = messagePermissionDenied;
exports.readAuthMessage = readAuthMessage;
exports.writePermissionDenied = writePermissionDenied;
//# sourceMappingURL=auth.cjs.map
