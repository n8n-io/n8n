import { KeyObject, publicEncrypt, constants, privateDecrypt } from 'crypto';
import checkModulusLength from './check_modulus_length.js';
import { isCryptoKey } from './webcrypto.js';
import { checkEncCryptoKey } from '../lib/crypto_key.js';
import isKeyObject from './is_key_object.js';
import invalidKeyInput from '../lib/invalid_key_input.js';
import { types } from './is_key_like.js';
const checkKey = (key, alg) => {
    if (key.asymmetricKeyType !== 'rsa') {
        throw new TypeError('Invalid key for this operation, its asymmetricKeyType must be rsa');
    }
    checkModulusLength(key, alg);
};
const resolvePadding = (alg) => {
    switch (alg) {
        case 'RSA-OAEP':
        case 'RSA-OAEP-256':
        case 'RSA-OAEP-384':
        case 'RSA-OAEP-512':
            return constants.RSA_PKCS1_OAEP_PADDING;
        case 'RSA1_5':
            return constants.RSA_PKCS1_PADDING;
        default:
            return undefined;
    }
};
const resolveOaepHash = (alg) => {
    switch (alg) {
        case 'RSA-OAEP':
            return 'sha1';
        case 'RSA-OAEP-256':
            return 'sha256';
        case 'RSA-OAEP-384':
            return 'sha384';
        case 'RSA-OAEP-512':
            return 'sha512';
        default:
            return undefined;
    }
};
function ensureKeyObject(key, alg, ...usages) {
    if (isKeyObject(key)) {
        return key;
    }
    if (isCryptoKey(key)) {
        checkEncCryptoKey(key, alg, ...usages);
        return KeyObject.from(key);
    }
    throw new TypeError(invalidKeyInput(key, ...types));
}
export const encrypt = (alg, key, cek) => {
    const padding = resolvePadding(alg);
    const oaepHash = resolveOaepHash(alg);
    const keyObject = ensureKeyObject(key, alg, 'wrapKey', 'encrypt');
    checkKey(keyObject, alg);
    return publicEncrypt({ key: keyObject, oaepHash, padding }, cek);
};
export const decrypt = (alg, key, encryptedKey) => {
    const padding = resolvePadding(alg);
    const oaepHash = resolveOaepHash(alg);
    const keyObject = ensureKeyObject(key, alg, 'unwrapKey', 'decrypt');
    checkKey(keyObject, alg);
    return privateDecrypt({ key: keyObject, oaepHash, padding }, encryptedKey);
};
