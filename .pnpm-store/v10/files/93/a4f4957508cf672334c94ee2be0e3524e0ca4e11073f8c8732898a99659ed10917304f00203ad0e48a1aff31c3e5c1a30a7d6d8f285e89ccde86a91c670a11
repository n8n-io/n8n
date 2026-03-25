"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSharedKey = exports.deriveKey = void 0;
var utils_1 = require("@noble/ciphers/utils");
var hkdf_1 = require("@noble/hashes/hkdf");
var sha2_1 = require("@noble/hashes/sha2");
var deriveKey = function (master, salt, info) {
    // 32 bytes shared secret for aes256 and xchacha20 derived from HKDF-SHA256
    return (0, hkdf_1.hkdf)(sha2_1.sha256, master, salt, info, 32);
};
exports.deriveKey = deriveKey;
var getSharedKey = function () {
    var parts = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        parts[_i] = arguments[_i];
    }
    return (0, exports.deriveKey)(utils_1.concatBytes.apply(void 0, parts));
};
exports.getSharedKey = getSharedKey;
