import { KeyObject, createPublicKey } from 'crypto';
import { encode as base64url } from './base64url.js';
import Asn1SequenceDecoder from './asn1_sequence_decoder.js';
import { JOSENotSupported } from '../util/errors.js';
import getNamedCurve from './get_named_curve.js';
import { isCryptoKey } from './webcrypto.js';
import isKeyObject from './is_key_object.js';
import invalidKeyInput from '../lib/invalid_key_input.js';
import { types } from './is_key_like.js';
import { jwkExport } from './flags.js';
const keyToJWK = (key) => {
    let keyObject;
    if (isCryptoKey(key)) {
        if (!key.extractable) {
            throw new TypeError('CryptoKey is not extractable');
        }
        keyObject = KeyObject.from(key);
    }
    else if (isKeyObject(key)) {
        keyObject = key;
    }
    else if (key instanceof Uint8Array) {
        return {
            kty: 'oct',
            k: base64url(key),
        };
    }
    else {
        throw new TypeError(invalidKeyInput(key, ...types, 'Uint8Array'));
    }
    if (jwkExport) {
        if (keyObject.type !== 'secret' &&
            !['rsa', 'ec', 'ed25519', 'x25519', 'ed448', 'x448'].includes(keyObject.asymmetricKeyType)) {
            throw new JOSENotSupported('Unsupported key asymmetricKeyType');
        }
        return keyObject.export({ format: 'jwk' });
    }
    switch (keyObject.type) {
        case 'secret':
            return {
                kty: 'oct',
                k: base64url(keyObject.export()),
            };
        case 'private':
        case 'public': {
            switch (keyObject.asymmetricKeyType) {
                case 'rsa': {
                    const der = keyObject.export({ format: 'der', type: 'pkcs1' });
                    const dec = new Asn1SequenceDecoder(der);
                    if (keyObject.type === 'private') {
                        dec.unsignedInteger();
                    }
                    const n = base64url(dec.unsignedInteger());
                    const e = base64url(dec.unsignedInteger());
                    let jwk;
                    if (keyObject.type === 'private') {
                        jwk = {
                            d: base64url(dec.unsignedInteger()),
                            p: base64url(dec.unsignedInteger()),
                            q: base64url(dec.unsignedInteger()),
                            dp: base64url(dec.unsignedInteger()),
                            dq: base64url(dec.unsignedInteger()),
                            qi: base64url(dec.unsignedInteger()),
                        };
                    }
                    dec.end();
                    return { kty: 'RSA', n, e, ...jwk };
                }
                case 'ec': {
                    const crv = getNamedCurve(keyObject);
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
                            throw new JOSENotSupported('Unsupported curve');
                    }
                    if (keyObject.type === 'public') {
                        const der = keyObject.export({ type: 'spki', format: 'der' });
                        return {
                            kty: 'EC',
                            crv,
                            x: base64url(der.subarray(-len, -len / 2)),
                            y: base64url(der.subarray(-len / 2)),
                        };
                    }
                    const der = keyObject.export({ type: 'pkcs8', format: 'der' });
                    if (der.length < 100) {
                        offset += correction;
                    }
                    return {
                        ...keyToJWK(createPublicKey(keyObject)),
                        d: base64url(der.subarray(offset, offset + len / 2)),
                    };
                }
                case 'ed25519':
                case 'x25519': {
                    const crv = getNamedCurve(keyObject);
                    if (keyObject.type === 'public') {
                        const der = keyObject.export({ type: 'spki', format: 'der' });
                        return {
                            kty: 'OKP',
                            crv,
                            x: base64url(der.subarray(-32)),
                        };
                    }
                    const der = keyObject.export({ type: 'pkcs8', format: 'der' });
                    return {
                        ...keyToJWK(createPublicKey(keyObject)),
                        d: base64url(der.subarray(-32)),
                    };
                }
                case 'ed448':
                case 'x448': {
                    const crv = getNamedCurve(keyObject);
                    if (keyObject.type === 'public') {
                        const der = keyObject.export({ type: 'spki', format: 'der' });
                        return {
                            kty: 'OKP',
                            crv,
                            x: base64url(der.subarray(crv === 'Ed448' ? -57 : -56)),
                        };
                    }
                    const der = keyObject.export({ type: 'pkcs8', format: 'der' });
                    return {
                        ...keyToJWK(createPublicKey(keyObject)),
                        d: base64url(der.subarray(crv === 'Ed448' ? -57 : -56)),
                    };
                }
                default:
                    throw new JOSENotSupported('Unsupported key asymmetricKeyType');
            }
        }
        default:
            throw new JOSENotSupported('Unsupported key type');
    }
};
export default keyToJWK;
