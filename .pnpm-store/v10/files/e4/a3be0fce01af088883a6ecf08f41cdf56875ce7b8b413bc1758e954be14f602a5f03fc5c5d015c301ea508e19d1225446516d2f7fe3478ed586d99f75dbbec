import { promisify } from 'util';
import { KeyObject, pbkdf2 as pbkdf2cb } from 'crypto';
import random from './random.js';
import { p2s as concatSalt } from '../lib/buffer_utils.js';
import { encode as base64url } from './base64url.js';
import { wrap, unwrap } from './aeskw.js';
import checkP2s from '../lib/check_p2s.js';
import { isCryptoKey } from './webcrypto.js';
import { checkEncCryptoKey } from '../lib/crypto_key.js';
import isKeyObject from './is_key_object.js';
import invalidKeyInput from '../lib/invalid_key_input.js';
import { types } from './is_key_like.js';
const pbkdf2 = promisify(pbkdf2cb);
function getPassword(key, alg) {
    if (isKeyObject(key)) {
        return key.export();
    }
    if (key instanceof Uint8Array) {
        return key;
    }
    if (isCryptoKey(key)) {
        checkEncCryptoKey(key, alg, 'deriveBits', 'deriveKey');
        return KeyObject.from(key).export();
    }
    throw new TypeError(invalidKeyInput(key, ...types, 'Uint8Array'));
}
export const encrypt = async (alg, key, cek, p2c = 2048, p2s = random(new Uint8Array(16))) => {
    checkP2s(p2s);
    const salt = concatSalt(alg, p2s);
    const keylen = parseInt(alg.slice(13, 16), 10) >> 3;
    const password = getPassword(key, alg);
    const derivedKey = await pbkdf2(password, salt, p2c, keylen, `sha${alg.slice(8, 11)}`);
    const encryptedKey = await wrap(alg.slice(-6), derivedKey, cek);
    return { encryptedKey, p2c, p2s: base64url(p2s) };
};
export const decrypt = async (alg, key, encryptedKey, p2c, p2s) => {
    checkP2s(p2s);
    const salt = concatSalt(alg, p2s);
    const keylen = parseInt(alg.slice(13, 16), 10) >> 3;
    const password = getPassword(key, alg);
    const derivedKey = await pbkdf2(password, salt, p2c, keylen, `sha${alg.slice(8, 11)}`);
    return unwrap(alg.slice(-6), derivedKey, encryptedKey);
};
