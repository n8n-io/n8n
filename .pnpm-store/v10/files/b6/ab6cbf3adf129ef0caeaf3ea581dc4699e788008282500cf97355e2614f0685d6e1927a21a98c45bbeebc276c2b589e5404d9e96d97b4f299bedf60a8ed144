'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var node_crypto = require('node:crypto');

/**
 * @param {Uint8Array} data
 */
const digest = data => {
  const hasher = node_crypto.createHash('sha256');
  hasher.update(data);
  return hasher.digest()
};

exports.digest = digest;
//# sourceMappingURL=sha256.node.cjs.map
