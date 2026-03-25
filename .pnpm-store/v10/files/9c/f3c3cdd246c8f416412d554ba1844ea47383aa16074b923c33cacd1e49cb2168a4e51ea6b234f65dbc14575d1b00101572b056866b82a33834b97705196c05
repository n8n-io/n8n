"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = require("crypto");
const buffer_utils_js_1 = require("../lib/buffer_utils.js");
function cbcTag(aad, iv, ciphertext, macSize, macKey, keySize) {
    const macData = (0, buffer_utils_js_1.concat)(aad, iv, ciphertext, (0, buffer_utils_js_1.uint64be)(aad.length << 3));
    const hmac = (0, crypto_1.createHmac)(`sha${macSize}`, macKey);
    hmac.update(macData);
    return hmac.digest().slice(0, keySize >> 3);
}
exports.default = cbcTag;
