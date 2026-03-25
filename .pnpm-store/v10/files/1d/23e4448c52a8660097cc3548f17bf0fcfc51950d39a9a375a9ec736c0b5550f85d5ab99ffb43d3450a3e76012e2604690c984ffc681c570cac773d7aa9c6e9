"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const invalid_key_input_js_1 = require("./invalid_key_input.js");
const is_key_like_js_1 = require("../runtime/is_key_like.js");
const symmetricTypeCheck = (alg, key) => {
    if (key instanceof Uint8Array)
        return;
    if (!(0, is_key_like_js_1.default)(key)) {
        throw new TypeError((0, invalid_key_input_js_1.withAlg)(alg, key, ...is_key_like_js_1.types, 'Uint8Array'));
    }
    if (key.type !== 'secret') {
        throw new TypeError(`${is_key_like_js_1.types.join(' or ')} instances for symmetric algorithms must be of type "secret"`);
    }
};
const asymmetricTypeCheck = (alg, key, usage) => {
    if (!(0, is_key_like_js_1.default)(key)) {
        throw new TypeError((0, invalid_key_input_js_1.withAlg)(alg, key, ...is_key_like_js_1.types));
    }
    if (key.type === 'secret') {
        throw new TypeError(`${is_key_like_js_1.types.join(' or ')} instances for asymmetric algorithms must not be of type "secret"`);
    }
    if (usage === 'sign' && key.type === 'public') {
        throw new TypeError(`${is_key_like_js_1.types.join(' or ')} instances for asymmetric algorithm signing must be of type "private"`);
    }
    if (usage === 'decrypt' && key.type === 'public') {
        throw new TypeError(`${is_key_like_js_1.types.join(' or ')} instances for asymmetric algorithm decryption must be of type "private"`);
    }
    if (key.algorithm && usage === 'verify' && key.type === 'private') {
        throw new TypeError(`${is_key_like_js_1.types.join(' or ')} instances for asymmetric algorithm verifying must be of type "public"`);
    }
    if (key.algorithm && usage === 'encrypt' && key.type === 'private') {
        throw new TypeError(`${is_key_like_js_1.types.join(' or ')} instances for asymmetric algorithm encryption must be of type "public"`);
    }
};
const checkKeyType = (alg, key, usage) => {
    const symmetric = alg.startsWith('HS') ||
        alg === 'dir' ||
        alg.startsWith('PBES2') ||
        /^A\d{3}(?:GCM)?KW$/.test(alg);
    if (symmetric) {
        symmetricTypeCheck(alg, key);
    }
    else {
        asymmetricTypeCheck(alg, key, usage);
    }
};
exports.default = checkKeyType;
