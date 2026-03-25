"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportJWK = exports.exportPKCS8 = exports.exportSPKI = void 0;
const asn1_js_1 = require("../runtime/asn1.js");
const asn1_js_2 = require("../runtime/asn1.js");
const key_to_jwk_js_1 = require("../runtime/key_to_jwk.js");
async function exportSPKI(key) {
    return (0, asn1_js_1.toSPKI)(key);
}
exports.exportSPKI = exportSPKI;
async function exportPKCS8(key) {
    return (0, asn1_js_2.toPKCS8)(key);
}
exports.exportPKCS8 = exportPKCS8;
async function exportJWK(key) {
    return (0, key_to_jwk_js_1.default)(key);
}
exports.exportJWK = exportJWK;
