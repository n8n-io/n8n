"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.importJWK = exports.importPKCS8 = exports.importX509 = exports.importSPKI = void 0;
const base64url_js_1 = require("../runtime/base64url.js");
const asn1_js_1 = require("../runtime/asn1.js");
const jwk_to_key_js_1 = require("../runtime/jwk_to_key.js");
const errors_js_1 = require("../util/errors.js");
const is_object_js_1 = require("../lib/is_object.js");
async function importSPKI(spki, alg, options) {
    if (typeof spki !== 'string' || spki.indexOf('-----BEGIN PUBLIC KEY-----') !== 0) {
        throw new TypeError('"spki" must be SPKI formatted string');
    }
    return (0, asn1_js_1.fromSPKI)(spki, alg, options);
}
exports.importSPKI = importSPKI;
async function importX509(x509, alg, options) {
    if (typeof x509 !== 'string' || x509.indexOf('-----BEGIN CERTIFICATE-----') !== 0) {
        throw new TypeError('"x509" must be X.509 formatted string');
    }
    return (0, asn1_js_1.fromX509)(x509, alg, options);
}
exports.importX509 = importX509;
async function importPKCS8(pkcs8, alg, options) {
    if (typeof pkcs8 !== 'string' || pkcs8.indexOf('-----BEGIN PRIVATE KEY-----') !== 0) {
        throw new TypeError('"pkcs8" must be PKCS#8 formatted string');
    }
    return (0, asn1_js_1.fromPKCS8)(pkcs8, alg, options);
}
exports.importPKCS8 = importPKCS8;
async function importJWK(jwk, alg, octAsKeyObject) {
    var _a;
    if (!(0, is_object_js_1.default)(jwk)) {
        throw new TypeError('JWK must be an object');
    }
    alg || (alg = jwk.alg);
    switch (jwk.kty) {
        case 'oct':
            if (typeof jwk.k !== 'string' || !jwk.k) {
                throw new TypeError('missing "k" (Key Value) Parameter value');
            }
            octAsKeyObject !== null && octAsKeyObject !== void 0 ? octAsKeyObject : (octAsKeyObject = jwk.ext !== true);
            if (octAsKeyObject) {
                return (0, jwk_to_key_js_1.default)({ ...jwk, alg, ext: (_a = jwk.ext) !== null && _a !== void 0 ? _a : false });
            }
            return (0, base64url_js_1.decode)(jwk.k);
        case 'RSA':
            if (jwk.oth !== undefined) {
                throw new errors_js_1.JOSENotSupported('RSA JWK "oth" (Other Primes Info) Parameter value is not supported');
            }
        case 'EC':
        case 'OKP':
            return (0, jwk_to_key_js_1.default)({ ...jwk, alg });
        default:
            throw new errors_js_1.JOSENotSupported('Unsupported "kty" (Key Type) Parameter value');
    }
}
exports.importJWK = importJWK;
