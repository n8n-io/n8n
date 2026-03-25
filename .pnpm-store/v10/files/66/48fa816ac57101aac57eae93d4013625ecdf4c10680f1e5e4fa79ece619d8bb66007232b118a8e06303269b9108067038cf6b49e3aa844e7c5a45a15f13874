"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = require("crypto");
let ciphers;
exports.default = (algorithm) => {
    ciphers || (ciphers = new Set((0, crypto_1.getCiphers)()));
    return ciphers.has(algorithm);
};
