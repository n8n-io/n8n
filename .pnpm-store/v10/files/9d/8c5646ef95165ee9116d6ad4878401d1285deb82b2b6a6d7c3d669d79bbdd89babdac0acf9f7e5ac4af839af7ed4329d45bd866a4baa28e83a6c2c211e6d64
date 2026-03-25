"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = require("crypto");
const get_named_curve_js_1 = require("./get_named_curve.js");
const errors_js_1 = require("../util/errors.js");
const check_modulus_length_js_1 = require("./check_modulus_length.js");
const flags_js_1 = require("./flags.js");
const PSS = {
    padding: crypto_1.constants.RSA_PKCS1_PSS_PADDING,
    saltLength: crypto_1.constants.RSA_PSS_SALTLEN_DIGEST,
};
const ecCurveAlgMap = new Map([
    ['ES256', 'P-256'],
    ['ES256K', 'secp256k1'],
    ['ES384', 'P-384'],
    ['ES512', 'P-521'],
]);
function keyForCrypto(alg, key) {
    switch (alg) {
        case 'EdDSA':
            if (!['ed25519', 'ed448'].includes(key.asymmetricKeyType)) {
                throw new TypeError('Invalid key for this operation, its asymmetricKeyType must be ed25519 or ed448');
            }
            return key;
        case 'RS256':
        case 'RS384':
        case 'RS512':
            if (key.asymmetricKeyType !== 'rsa') {
                throw new TypeError('Invalid key for this operation, its asymmetricKeyType must be rsa');
            }
            (0, check_modulus_length_js_1.default)(key, alg);
            return key;
        case flags_js_1.rsaPssParams && 'PS256':
        case flags_js_1.rsaPssParams && 'PS384':
        case flags_js_1.rsaPssParams && 'PS512':
            if (key.asymmetricKeyType === 'rsa-pss') {
                const { hashAlgorithm, mgf1HashAlgorithm, saltLength } = key.asymmetricKeyDetails;
                const length = parseInt(alg.slice(-3), 10);
                if (hashAlgorithm !== undefined &&
                    (hashAlgorithm !== `sha${length}` || mgf1HashAlgorithm !== hashAlgorithm)) {
                    throw new TypeError(`Invalid key for this operation, its RSA-PSS parameters do not meet the requirements of "alg" ${alg}`);
                }
                if (saltLength !== undefined && saltLength > length >> 3) {
                    throw new TypeError(`Invalid key for this operation, its RSA-PSS parameter saltLength does not meet the requirements of "alg" ${alg}`);
                }
            }
            else if (key.asymmetricKeyType !== 'rsa') {
                throw new TypeError('Invalid key for this operation, its asymmetricKeyType must be rsa or rsa-pss');
            }
            (0, check_modulus_length_js_1.default)(key, alg);
            return { key, ...PSS };
        case !flags_js_1.rsaPssParams && 'PS256':
        case !flags_js_1.rsaPssParams && 'PS384':
        case !flags_js_1.rsaPssParams && 'PS512':
            if (key.asymmetricKeyType !== 'rsa') {
                throw new TypeError('Invalid key for this operation, its asymmetricKeyType must be rsa');
            }
            (0, check_modulus_length_js_1.default)(key, alg);
            return { key, ...PSS };
        case 'ES256':
        case 'ES256K':
        case 'ES384':
        case 'ES512': {
            if (key.asymmetricKeyType !== 'ec') {
                throw new TypeError('Invalid key for this operation, its asymmetricKeyType must be ec');
            }
            const actual = (0, get_named_curve_js_1.default)(key);
            const expected = ecCurveAlgMap.get(alg);
            if (actual !== expected) {
                throw new TypeError(`Invalid key curve for the algorithm, its curve must be ${expected}, got ${actual}`);
            }
            return { dsaEncoding: 'ieee-p1363', key };
        }
        default:
            throw new errors_js_1.JOSENotSupported(`alg ${alg} is not supported either by JOSE or your javascript runtime`);
    }
}
exports.default = keyForCrypto;
