import { createDecipheriv, KeyObject } from 'crypto';
import checkIvLength from '../lib/check_iv_length.js';
import checkCekLength from './check_cek_length.js';
import { concat } from '../lib/buffer_utils.js';
import { JOSENotSupported, JWEDecryptionFailed } from '../util/errors.js';
import timingSafeEqual from './timing_safe_equal.js';
import cbcTag from './cbc_tag.js';
import { isCryptoKey } from './webcrypto.js';
import { checkEncCryptoKey } from '../lib/crypto_key.js';
import isKeyObject from './is_key_object.js';
import invalidKeyInput from '../lib/invalid_key_input.js';
import supported from './ciphers.js';
import { types } from './is_key_like.js';
function cbcDecrypt(enc, cek, ciphertext, iv, tag, aad) {
    const keySize = parseInt(enc.slice(1, 4), 10);
    if (isKeyObject(cek)) {
        cek = cek.export();
    }
    const encKey = cek.subarray(keySize >> 3);
    const macKey = cek.subarray(0, keySize >> 3);
    const macSize = parseInt(enc.slice(-3), 10);
    const algorithm = `aes-${keySize}-cbc`;
    if (!supported(algorithm)) {
        throw new JOSENotSupported(`alg ${enc} is not supported by your javascript runtime`);
    }
    const expectedTag = cbcTag(aad, iv, ciphertext, macSize, macKey, keySize);
    let macCheckPassed;
    try {
        macCheckPassed = timingSafeEqual(tag, expectedTag);
    }
    catch {
    }
    if (!macCheckPassed) {
        throw new JWEDecryptionFailed();
    }
    let plaintext;
    try {
        const decipher = createDecipheriv(algorithm, encKey, iv);
        plaintext = concat(decipher.update(ciphertext), decipher.final());
    }
    catch {
    }
    if (!plaintext) {
        throw new JWEDecryptionFailed();
    }
    return plaintext;
}
function gcmDecrypt(enc, cek, ciphertext, iv, tag, aad) {
    const keySize = parseInt(enc.slice(1, 4), 10);
    const algorithm = `aes-${keySize}-gcm`;
    if (!supported(algorithm)) {
        throw new JOSENotSupported(`alg ${enc} is not supported by your javascript runtime`);
    }
    try {
        const decipher = createDecipheriv(algorithm, cek, iv, { authTagLength: 16 });
        decipher.setAuthTag(tag);
        if (aad.byteLength) {
            decipher.setAAD(aad, { plaintextLength: ciphertext.length });
        }
        const plaintext = decipher.update(ciphertext);
        decipher.final();
        return plaintext;
    }
    catch {
        throw new JWEDecryptionFailed();
    }
}
const decrypt = (enc, cek, ciphertext, iv, tag, aad) => {
    let key;
    if (isCryptoKey(cek)) {
        checkEncCryptoKey(cek, enc, 'decrypt');
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
            return cbcDecrypt(enc, key, ciphertext, iv, tag, aad);
        case 'A128GCM':
        case 'A192GCM':
        case 'A256GCM':
            return gcmDecrypt(enc, key, ciphertext, iv, tag, aad);
        default:
            throw new JOSENotSupported('Unsupported JWE Content Encryption Algorithm');
    }
};
export default decrypt;
