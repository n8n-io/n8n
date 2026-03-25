"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto = require("crypto");
const util_1 = require("util");
const dsa_digest_js_1 = require("./dsa_digest.js");
const node_key_js_1 = require("./node_key.js");
const sign_js_1 = require("./sign.js");
const get_sign_verify_key_js_1 = require("./get_sign_verify_key.js");
const flags_js_1 = require("./flags.js");
let oneShotVerify;
if (crypto.verify.length > 4 && flags_js_1.oneShotCallback) {
    oneShotVerify = (0, util_1.promisify)(crypto.verify);
}
else {
    oneShotVerify = crypto.verify;
}
const verify = async (alg, key, signature, data) => {
    const keyObject = (0, get_sign_verify_key_js_1.default)(alg, key, 'verify');
    if (alg.startsWith('HS')) {
        const expected = await (0, sign_js_1.default)(alg, keyObject, data);
        const actual = signature;
        try {
            return crypto.timingSafeEqual(actual, expected);
        }
        catch {
            return false;
        }
    }
    const algorithm = (0, dsa_digest_js_1.default)(alg);
    const keyInput = (0, node_key_js_1.default)(alg, keyObject);
    try {
        return await oneShotVerify(algorithm, data, keyInput, signature);
    }
    catch {
        return false;
    }
};
exports.default = verify;
