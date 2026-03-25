"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmbeddedJWK = void 0;
const import_js_1 = require("../key/import.js");
const is_object_js_1 = require("../lib/is_object.js");
const errors_js_1 = require("../util/errors.js");
async function EmbeddedJWK(protectedHeader, token) {
    const joseHeader = {
        ...protectedHeader,
        ...token === null || token === void 0 ? void 0 : token.header,
    };
    if (!(0, is_object_js_1.default)(joseHeader.jwk)) {
        throw new errors_js_1.JWSInvalid('"jwk" (JSON Web Key) Header Parameter must be a JSON object');
    }
    const key = await (0, import_js_1.importJWK)({ ...joseHeader.jwk, ext: true }, joseHeader.alg, true);
    if (key instanceof Uint8Array || key.type !== 'public') {
        throw new errors_js_1.JWSInvalid('"jwk" (JSON Web Key) Header Parameter must be a public key');
    }
    return key;
}
exports.EmbeddedJWK = EmbeddedJWK;
