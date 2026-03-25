"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const aeskw_js_1 = require("../runtime/aeskw.js");
const ECDH = require("../runtime/ecdhes.js");
const pbes2kw_js_1 = require("../runtime/pbes2kw.js");
const rsaes_js_1 = require("../runtime/rsaes.js");
const base64url_js_1 = require("../runtime/base64url.js");
const cek_js_1 = require("../lib/cek.js");
const errors_js_1 = require("../util/errors.js");
const export_js_1 = require("../key/export.js");
const check_key_type_js_1 = require("./check_key_type.js");
const aesgcmkw_js_1 = require("./aesgcmkw.js");
async function encryptKeyManagement(alg, enc, key, providedCek, providedParameters = {}) {
    let encryptedKey;
    let parameters;
    let cek;
    (0, check_key_type_js_1.default)(alg, key, 'encrypt');
    switch (alg) {
        case 'dir': {
            cek = key;
            break;
        }
        case 'ECDH-ES':
        case 'ECDH-ES+A128KW':
        case 'ECDH-ES+A192KW':
        case 'ECDH-ES+A256KW': {
            if (!ECDH.ecdhAllowed(key)) {
                throw new errors_js_1.JOSENotSupported('ECDH with the provided key is not allowed or not supported by your javascript runtime');
            }
            const { apu, apv } = providedParameters;
            let { epk: ephemeralKey } = providedParameters;
            ephemeralKey || (ephemeralKey = (await ECDH.generateEpk(key)).privateKey);
            const { x, y, crv, kty } = await (0, export_js_1.exportJWK)(ephemeralKey);
            const sharedSecret = await ECDH.deriveKey(key, ephemeralKey, alg === 'ECDH-ES' ? enc : alg, alg === 'ECDH-ES' ? (0, cek_js_1.bitLength)(enc) : parseInt(alg.slice(-5, -2), 10), apu, apv);
            parameters = { epk: { x, crv, kty } };
            if (kty === 'EC')
                parameters.epk.y = y;
            if (apu)
                parameters.apu = (0, base64url_js_1.encode)(apu);
            if (apv)
                parameters.apv = (0, base64url_js_1.encode)(apv);
            if (alg === 'ECDH-ES') {
                cek = sharedSecret;
                break;
            }
            cek = providedCek || (0, cek_js_1.default)(enc);
            const kwAlg = alg.slice(-6);
            encryptedKey = await (0, aeskw_js_1.wrap)(kwAlg, sharedSecret, cek);
            break;
        }
        case 'RSA1_5':
        case 'RSA-OAEP':
        case 'RSA-OAEP-256':
        case 'RSA-OAEP-384':
        case 'RSA-OAEP-512': {
            cek = providedCek || (0, cek_js_1.default)(enc);
            encryptedKey = await (0, rsaes_js_1.encrypt)(alg, key, cek);
            break;
        }
        case 'PBES2-HS256+A128KW':
        case 'PBES2-HS384+A192KW':
        case 'PBES2-HS512+A256KW': {
            cek = providedCek || (0, cek_js_1.default)(enc);
            const { p2c, p2s } = providedParameters;
            ({ encryptedKey, ...parameters } = await (0, pbes2kw_js_1.encrypt)(alg, key, cek, p2c, p2s));
            break;
        }
        case 'A128KW':
        case 'A192KW':
        case 'A256KW': {
            cek = providedCek || (0, cek_js_1.default)(enc);
            encryptedKey = await (0, aeskw_js_1.wrap)(alg, key, cek);
            break;
        }
        case 'A128GCMKW':
        case 'A192GCMKW':
        case 'A256GCMKW': {
            cek = providedCek || (0, cek_js_1.default)(enc);
            const { iv } = providedParameters;
            ({ encryptedKey, ...parameters } = await (0, aesgcmkw_js_1.wrap)(alg, key, cek, iv));
            break;
        }
        default: {
            throw new errors_js_1.JOSENotSupported('Invalid or unsupported "alg" (JWE Algorithm) header value');
        }
    }
    return { cek, encryptedKey, parameters };
}
exports.default = encryptKeyManagement;
