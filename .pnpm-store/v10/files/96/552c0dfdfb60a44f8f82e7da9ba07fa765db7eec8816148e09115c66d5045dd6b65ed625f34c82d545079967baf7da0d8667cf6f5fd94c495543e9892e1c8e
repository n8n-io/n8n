"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generalVerify = void 0;
const verify_js_1 = require("../flattened/verify.js");
const errors_js_1 = require("../../util/errors.js");
const is_object_js_1 = require("../../lib/is_object.js");
async function generalVerify(jws, key, options) {
    if (!(0, is_object_js_1.default)(jws)) {
        throw new errors_js_1.JWSInvalid('General JWS must be an object');
    }
    if (!Array.isArray(jws.signatures) || !jws.signatures.every(is_object_js_1.default)) {
        throw new errors_js_1.JWSInvalid('JWS Signatures missing or incorrect type');
    }
    for (const signature of jws.signatures) {
        try {
            return await (0, verify_js_1.flattenedVerify)({
                header: signature.header,
                payload: jws.payload,
                protected: signature.protected,
                signature: signature.signature,
            }, key, options);
        }
        catch {
        }
    }
    throw new errors_js_1.JWSSignatureVerificationFailed();
}
exports.generalVerify = generalVerify;
