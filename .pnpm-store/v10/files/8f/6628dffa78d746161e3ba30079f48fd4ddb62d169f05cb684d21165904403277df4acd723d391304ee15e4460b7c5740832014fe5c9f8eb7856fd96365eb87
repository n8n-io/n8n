"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = rng;
var _nodeCrypto = _interopRequireDefault(require("node:crypto"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const rnds8Pool = new Uint8Array(256); // # of random values to pre-allocate
let poolPtr = rnds8Pool.length;
function rng() {
  if (poolPtr > rnds8Pool.length - 16) {
    _nodeCrypto.default.randomFillSync(rnds8Pool);
    poolPtr = 0;
  }
  return rnds8Pool.slice(poolPtr, poolPtr += 16);
}