"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = require("crypto");
const base64url_js_1 = require("./base64url.js");
const asn1_sequence_decoder_js_1 = require("./asn1_sequence_decoder.js");
const errors_js_1 = require("../util/errors.js");
const get_named_curve_js_1 = require("./get_named_curve.js");
const webcrypto_js_1 = require("./webcrypto.js");
const is_key_object_js_1 = require("./is_key_object.js");
const invalid_key_input_js_1 = require("../lib/invalid_key_input.js");
const is_key_like_js_1 = require("./is_key_like.js");
const flags_js_1 = require("./flags.js");
const keyToJWK = (key) => {
    let keyObject;
    if ((0, webcrypto_js_1.isCryptoKey)(key)) {
        if (!key.extractable) {
            throw new TypeError('CryptoKey is not extractable');
        }
        keyObject = crypto_1.KeyObject.from(key);
    }
    else if ((0, is_key_object_js_1.default)(key)) {
        keyObject = key;
    }
    else if (key instanceof Uint8Array) {
        return {
            kty: 'oct',
            k: (0, base64url_js_1.encode)(key),
        };
    }
    else {
        throw new TypeError((0, invalid_key_input_js_1.default)(key, ...is_key_like_js_1.types, 'Uint8Array'));
    }
    if (flags_js_1.jwkExport) {
        if (keyObject.type !== 'secret' &&
            !['rsa', 'ec', 'ed25519', 'x25519', 'ed448', 'x448'].includes(keyObject.asymmetricKeyType)) {
            throw new errors_js_1.JOSENotSupported('Unsupported key asymmetricKeyType');
        }
        return keyObject.export({ format: 'jwk' });
    }
    switch (keyObject.type) {
        case 'secret':
            return {
                kty: 'oct',
                k: (0, base64url_js_1.encode)(keyObject.export()),
            };
        case 'private':
        case 'public': {
            switch (keyObject.asymmetricKeyType) {
                case 'rsa': {
                    const der = keyObject.export({ format: 'der', type: 'pkcs1' });
                    const dec = new asn1_sequence_decoder_js_1.default(der);
                    if (keyObject.type === 'private') {
                        dec.unsignedInteger();
                    }
                    const n = (0, base64url_js_1.encode)(dec.unsignedInteger());
                    const e = (0, base64url_js_1.encode)(dec.unsignedInteger());
                    let jwk;
                    if (keyObject.type === 'private') {
                        jwk = {
                            d: (0, base64url_js_1.encode)(dec.unsignedInteger()),
                            p: (0, base64url_js_1.encode)(dec.unsignedInteger()),
                            q: (0, base64url_js_1.encode)(dec.unsignedInteger()),
                            dp: (0, base64url_js_1.encode)(dec.unsignedInteger()),
                            dq: (0, base64url_js_1.encode)(dec.unsignedInteger()),
                            qi: (0, base64url_js_1.encode)(dec.unsignedInteger()),
                        };
                    }
                    dec.end();
                    return { kty: 'RSA', n, e, ...jwk };
                }
                case 'ec': {
                    const crv = (0, get_named_curve_js_1.default)(keyObject);
                    let len;
                    let offset;
                    let correction;
                    switch (crv) {
                        case 'secp256k1':
                            len = 64;
                            offset = 31 + 2;
                            correction = -1;
                            break;
                        case 'P-256':
                            len = 64;
                            offset = 34 + 2;
                            correction = -1;
                            break;
                        case 'P-384':
                            len = 96;
                            offset = 33 + 2;
                            correction = -3;
                            break;
                        case 'P-521':
                            len = 132;
                            offset = 33 + 2;
                            correction = -3;
                            break;
                        default:
                            throw new errors_js_1.JOSENotSupported('Unsupported curve');
                    }
                    if (keyObject.type === 'public') {
                        const der = keyObject.export({ type: 'spki', format: 'der' });
                        return {
                            kty: 'EC',
                            crv,
                            x: (0, base64url_js_1.encode)(der.subarray(-len, -len / 2)),
                            y: (0, base64url_js_1.encode)(der.subarray(-len / 2)),
                        };
                    }
                    const der = keyObject.export({ type: 'pkcs8', format: 'der' });
                    if (der.length < 100) {
                        offset += correction;
                    }
                    return {
                        ...keyToJWK((0, crypto_1.createPublicKey)(keyObject)),
                        d: (0, base64url_js_1.encode)(der.subarray(offset, offset + len / 2)),
                    };
                }
                case 'ed25519':
                case 'x25519': {
                    const crv = (0, get_named_curve_js_1.default)(keyObject);
                    if (keyObject.type === 'public') {
                        const der = keyObject.export({ type: 'spki', format: 'der' });
                        return {
                            kty: 'OKP',
                            crv,
                            x: (0, base64url_js_1.encode)(der.subarray(-32)),
                        };
                    }
                    const der = keyObject.export({ type: 'pkcs8', format: 'der' });
                    return {
                        ...keyToJWK((0, crypto_1.createPublicKey)(keyObject)),
                        d: (0, base64url_js_1.encode)(der.subarray(-32)),
                    };
                }
                case 'ed448':
                case 'x448': {
                    const crv = (0, get_named_curve_js_1.default)(keyObject);
                    if (keyObject.type === 'public') {
                        const der = keyObject.export({ type: 'spki', format: 'der' });
                        return {
                            kty: 'OKP',
                            crv,
                            x: (0, base64url_js_1.encode)(der.subarray(crv === 'Ed448' ? -57 : -56)),
                        };
                    }
                    const der = keyObject.export({ type: 'pkcs8', format: 'der' });
                    return {
                        ...keyToJWK((0, crypto_1.createPublicKey)(keyObject)),
                        d: (0, base64url_js_1.encode)(der.subarray(crv === 'Ed448' ? -57 : -56)),
                    };
                }
                default:
                    throw new errors_js_1.JOSENotSupported('Unsupported key asymmetricKeyType');
            }
        }
        default:
            throw new errors_js_1.JOSENotSupported('Unsupported key type');
    }
};
exports.default = keyToJWK;
