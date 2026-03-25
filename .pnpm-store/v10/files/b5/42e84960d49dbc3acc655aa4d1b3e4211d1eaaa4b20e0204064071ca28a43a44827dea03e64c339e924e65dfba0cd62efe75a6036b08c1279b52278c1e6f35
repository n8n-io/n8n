import { diffieHellman, generateKeyPair as generateKeyPairCb, KeyObject } from 'crypto';
import { promisify } from 'util';
import getNamedCurve from './get_named_curve.js';
import { encoder, concat, uint32be, lengthAndInput, concatKdf } from '../lib/buffer_utils.js';
import { JOSENotSupported } from '../util/errors.js';
import { isCryptoKey } from './webcrypto.js';
import { checkEncCryptoKey } from '../lib/crypto_key.js';
import isKeyObject from './is_key_object.js';
import invalidKeyInput from '../lib/invalid_key_input.js';
import { types } from './is_key_like.js';
const generateKeyPair = promisify(generateKeyPairCb);
export async function deriveKey(publicKee, privateKee, algorithm, keyLength, apu = new Uint8Array(0), apv = new Uint8Array(0)) {
    let publicKey;
    if (isCryptoKey(publicKee)) {
        checkEncCryptoKey(publicKee, 'ECDH');
        publicKey = KeyObject.from(publicKee);
    }
    else if (isKeyObject(publicKee)) {
        publicKey = publicKee;
    }
    else {
        throw new TypeError(invalidKeyInput(publicKee, ...types));
    }
    let privateKey;
    if (isCryptoKey(privateKee)) {
        checkEncCryptoKey(privateKee, 'ECDH', 'deriveBits');
        privateKey = KeyObject.from(privateKee);
    }
    else if (isKeyObject(privateKee)) {
        privateKey = privateKee;
    }
    else {
        throw new TypeError(invalidKeyInput(privateKee, ...types));
    }
    const value = concat(lengthAndInput(encoder.encode(algorithm)), lengthAndInput(apu), lengthAndInput(apv), uint32be(keyLength));
    const sharedSecret = diffieHellman({ privateKey, publicKey });
    return concatKdf(sharedSecret, keyLength, value);
}
export async function generateEpk(kee) {
    let key;
    if (isCryptoKey(kee)) {
        key = KeyObject.from(kee);
    }
    else if (isKeyObject(kee)) {
        key = kee;
    }
    else {
        throw new TypeError(invalidKeyInput(kee, ...types));
    }
    switch (key.asymmetricKeyType) {
        case 'x25519':
            return generateKeyPair('x25519');
        case 'x448': {
            return generateKeyPair('x448');
        }
        case 'ec': {
            const namedCurve = getNamedCurve(key);
            return generateKeyPair('ec', { namedCurve });
        }
        default:
            throw new JOSENotSupported('Invalid or unsupported EPK');
    }
}
export const ecdhAllowed = (key) => ['P-256', 'P-384', 'P-521', 'X25519', 'X448'].includes(getNamedCurve(key));
