"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setCurve = exports.weakMap = void 0;
const buffer_1 = require("buffer");
const crypto_1 = require("crypto");
const errors_js_1 = require("../util/errors.js");
const webcrypto_js_1 = require("./webcrypto.js");
const is_key_object_js_1 = require("./is_key_object.js");
const invalid_key_input_js_1 = require("../lib/invalid_key_input.js");
const is_key_like_js_1 = require("./is_key_like.js");
const p256 = buffer_1.Buffer.from([42, 134, 72, 206, 61, 3, 1, 7]);
const p384 = buffer_1.Buffer.from([43, 129, 4, 0, 34]);
const p521 = buffer_1.Buffer.from([43, 129, 4, 0, 35]);
const secp256k1 = buffer_1.Buffer.from([43, 129, 4, 0, 10]);
exports.weakMap = new WeakMap();
const namedCurveToJOSE = (namedCurve) => {
    switch (namedCurve) {
        case 'prime256v1':
            return 'P-256';
        case 'secp384r1':
            return 'P-384';
        case 'secp521r1':
            return 'P-521';
        case 'secp256k1':
            return 'secp256k1';
        default:
            throw new errors_js_1.JOSENotSupported('Unsupported key curve for this operation');
    }
};
const getNamedCurve = (kee, raw) => {
    var _a;
    let key;
    if ((0, webcrypto_js_1.isCryptoKey)(kee)) {
        key = crypto_1.KeyObject.from(kee);
    }
    else if ((0, is_key_object_js_1.default)(kee)) {
        key = kee;
    }
    else {
        throw new TypeError((0, invalid_key_input_js_1.default)(kee, ...is_key_like_js_1.types));
    }
    if (key.type === 'secret') {
        throw new TypeError('only "private" or "public" type keys can be used for this operation');
    }
    switch (key.asymmetricKeyType) {
        case 'ed25519':
        case 'ed448':
            return `Ed${key.asymmetricKeyType.slice(2)}`;
        case 'x25519':
        case 'x448':
            return `X${key.asymmetricKeyType.slice(1)}`;
        case 'ec': {
            if (exports.weakMap.has(key)) {
                return exports.weakMap.get(key);
            }
            let namedCurve = (_a = key.asymmetricKeyDetails) === null || _a === void 0 ? void 0 : _a.namedCurve;
            if (!namedCurve && key.type === 'private') {
                namedCurve = getNamedCurve((0, crypto_1.createPublicKey)(key), true);
            }
            else if (!namedCurve) {
                const buf = key.export({ format: 'der', type: 'spki' });
                const i = buf[1] < 128 ? 14 : 15;
                const len = buf[i];
                const curveOid = buf.slice(i + 1, i + 1 + len);
                if (curveOid.equals(p256)) {
                    namedCurve = 'prime256v1';
                }
                else if (curveOid.equals(p384)) {
                    namedCurve = 'secp384r1';
                }
                else if (curveOid.equals(p521)) {
                    namedCurve = 'secp521r1';
                }
                else if (curveOid.equals(secp256k1)) {
                    namedCurve = 'secp256k1';
                }
                else {
                    throw new errors_js_1.JOSENotSupported('Unsupported key curve for this operation');
                }
            }
            if (raw)
                return namedCurve;
            const curve = namedCurveToJOSE(namedCurve);
            exports.weakMap.set(key, curve);
            return curve;
        }
        default:
            throw new TypeError('Invalid asymmetric key type for this operation');
    }
};
function setCurve(keyObject, curve) {
    exports.weakMap.set(keyObject, curve);
}
exports.setCurve = setCurve;
exports.default = getNamedCurve;
