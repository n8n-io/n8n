"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const errors_js_1 = require("../util/errors.js");
const iv_js_1 = require("./iv.js");
const checkIvLength = (enc, iv) => {
    if (iv.length << 3 !== (0, iv_js_1.bitLength)(enc)) {
        throw new errors_js_1.JWEInvalid('Invalid Initialization Vector length');
    }
};
exports.default = checkIvLength;
