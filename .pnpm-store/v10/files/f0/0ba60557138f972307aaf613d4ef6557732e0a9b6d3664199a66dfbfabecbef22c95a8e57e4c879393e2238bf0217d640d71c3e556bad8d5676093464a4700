import { createCipheriv, KeyObject } from 'crypto';
import checkIvLength from '../lib/check_iv_length.js';
import checkCekLength from './check_cek_length.js';
import { concat } from '../lib/buffer_utils.js';
import cbcTag from './cbc_tag.js';
import { isCryptoKey } from './webcrypto.js';
import { checkEncCryptoKey } from '../lib/crypto_key.js';
import isKeyObject from './is_key_object.js';
import invalidKeyInput from '../lib/invalid_key_input.js';
import { JOSENotSupported } from '../util/errors.js';
import supported from './ciphers.js';
import { types } from './is_key_like.js';
function cbcEncrypt(enc, plaintext, cek, iv, aad) {
    const keySize = parseInt(enc.slice(1, 4), 10);
    if (isKeyObject(cek)) {
        cek = cek.export();
    }
    const encKey = cek.subarray(keySize >> 3);
    const macKey = cek.subarray(0, keySize >> 3);
    const algorithm = `aes-${keySize}-cbc`;
    if (!supported(algorithm)) {
        throw new JOSENotSupported(`alg ${enc} is not supported by your javascript runtime`);
    }
    const cipher = createCipheriv(algorithm, encKey, iv);
    const ciphertext = concat(cipher.update(plaintext), cipher.final());
    const macSize = parseInt(enc.slice(-3), 10);
    const tag = cbcTag(aad, iv, ciphertext, macSize, macKey, keySize);
    return { ciphertext, tag };
}
function gcmEncrypt(enc, plaintext, cek, iv, aad) {
    const keySize = parseInt(enc.slice(1, 4), 10);
    const algorithm = `aes-${keySize}-gcm`;
    if (!supported(algorithm)) {
        throw new JOSENotSupported(`alg ${enc} is not supported by your javascript runtime`);
    }
    const cipher = createCipheriv(algorithm, cek, iv, { authTagLength: 16 });
    if (aad.byteLength) {
        cipher.setAAD(aad, { plaintextLength: plaintext.length });
    }
    const ciphertext = cipher.update(plaintext);
    cipher.final();
    const tag = cipher.getAuthTag();
    return { ciphertext, tag };
}
const encrypt = (enc, plaintext, cek, iv, aad) => {
    let key;
    if (isCryptoKey(cek)) {
        checkEncCryptoKey(cek, enc, 'encrypt');
        key = KeyObject.from(cek);
    }
    else if (cek instanceof Uint8Array || isKeyObject(cek)) {
        key = cek;
    }
    else {
        throw new TypeError(invalidKeyInput(cek, ...types, 'Uint8Array'));
    }
    checkCekLength(enc, key);
    checkIvLength(enc, iv);
    switch (enc) {
        case 'A128CBC-HS256':
        case 'A192CBC-HS384':
        case 'A256CBC-HS512':
            return cbcEncrypt(enc, plaintext, key, iv, aad);
        case 'A128GCM':
        case 'A192GCM':
        case 'A256GCM':
            return gcmEncrypt(enc, plaintext, key, iv, aad);
        default:
            throw new JOSENotSupported('Unsupported JWE Content Encryption Algorithm');
    }
};
export default encrypt;
