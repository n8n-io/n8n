"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto = require("crypto");
const util_1 = require("util");
const dsa_digest_js_1 = require("./dsa_digest.js");
const hmac_digest_js_1 = require("./hmac_digest.js");
const node_key_js_1 = require("./node_key.js");
const get_sign_verify_key_js_1 = require("./get_sign_verify_key.js");
let oneShotSign;
if (crypto.sign.length > 3) {
    oneShotSign = (0, util_1.promisify)(crypto.sign);
}
else {
    oneShotSign = crypto.sign;
}
const sign = async (alg, key, data) => {
    const keyObject = (0, get_sign_verify_key_js_1.default)(alg, key, 'sign');
    if (alg.startsWith('HS')) {
        const hmac = crypto.createHmac((0, hmac_digest_js_1.default)(alg), keyObject);
        hmac.update(data);
        return hmac.digest();
    }
    return oneShotSign((0, dsa_digest_js_1.default)(alg), data, (0, node_key_js_1.default)(alg, keyObject));
};
exports.default = sign;
