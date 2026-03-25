"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jwtVerify = void 0;
const verify_js_1 = require("../jws/compact/verify.js");
const jwt_claims_set_js_1 = require("../lib/jwt_claims_set.js");
const errors_js_1 = require("../util/errors.js");
async function jwtVerify(jwt, key, options) {
    var _a;
    const verified = await (0, verify_js_1.compactVerify)(jwt, key, options);
    if (((_a = verified.protectedHeader.crit) === null || _a === void 0 ? void 0 : _a.includes('b64')) && verified.protectedHeader.b64 === false) {
        throw new errors_js_1.JWTInvalid('JWTs MUST NOT use unencoded payload');
    }
    const payload = (0, jwt_claims_set_js_1.default)(verified.protectedHeader, verified.payload, options);
    const result = { payload, protectedHeader: verified.protectedHeader };
    if (typeof key === 'function') {
        return { ...result, key: verified.key };
    }
    return result;
}
exports.jwtVerify = jwtVerify;
