"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.types = void 0;
const webcrypto_js_1 = require("./webcrypto.js");
const is_key_object_js_1 = require("./is_key_object.js");
exports.default = (key) => (0, is_key_object_js_1.default)(key) || (0, webcrypto_js_1.isCryptoKey)(key);
const types = ['KeyObject'];
exports.types = types;
if (globalThis.CryptoKey || (webcrypto_js_1.default === null || webcrypto_js_1.default === void 0 ? void 0 : webcrypto_js_1.default.CryptoKey)) {
    types.push('CryptoKey');
}
