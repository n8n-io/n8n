"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jwtDecrypt = void 0;
const decrypt_js_1 = require("../jwe/compact/decrypt.js");
const jwt_claims_set_js_1 = require("../lib/jwt_claims_set.js");
const errors_js_1 = require("../util/errors.js");
async function jwtDecrypt(jwt, key, options) {
    const decrypted = await (0, decrypt_js_1.compactDecrypt)(jwt, key, options);
    const payload = (0, jwt_claims_set_js_1.default)(decrypted.protectedHeader, decrypted.plaintext, options);
    const { protectedHeader } = decrypted;
    if (protectedHeader.iss !== undefined && protectedHeader.iss !== payload.iss) {
        throw new errors_js_1.JWTClaimValidationFailed('replicated "iss" claim header parameter mismatch', 'iss', 'mismatch');
    }
    if (protectedHeader.sub !== undefined && protectedHeader.sub !== payload.sub) {
        throw new errors_js_1.JWTClaimValidationFailed('replicated "sub" claim header parameter mismatch', 'sub', 'mismatch');
    }
    if (protectedHeader.aud !== undefined &&
        JSON.stringify(protectedHeader.aud) !== JSON.stringify(payload.aud)) {
        throw new errors_js_1.JWTClaimValidationFailed('replicated "aud" claim header parameter mismatch', 'aud', 'mismatch');
    }
    const result = { payload, protectedHeader };
    if (typeof key === 'function') {
        return { ...result, key: decrypted.key };
    }
    return result;
}
exports.jwtDecrypt = jwtDecrypt;
