"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = require("crypto");
function md5(bytes) {
    if (Array.isArray(bytes)) {
        bytes = Buffer.from(bytes);
    }
    else if (typeof bytes === 'string') {
        bytes = Buffer.from(bytes, 'utf8');
    }
    return (0, crypto_1.createHash)('md5').update(bytes).digest();
}
exports.default = md5;
