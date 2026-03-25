import encrypt from './encrypt.js';
import decrypt from './decrypt.js';
import { encode as b64u } from '../util/base64url.js';
export async function wrap(alg, key, cek, iv) {
    const jweAlgorithm = alg.slice(0, 7);
    const wrapped = await encrypt(jweAlgorithm, cek, key, iv, new Uint8Array(0));
    return {
        encryptedKey: wrapped.ciphertext,
        iv: b64u(wrapped.iv),
        tag: b64u(wrapped.tag),
    };
}
export async function unwrap(alg, key, encryptedKey, iv, tag) {
    const jweAlgorithm = alg.slice(0, 7);
    return decrypt(jweAlgorithm, key, encryptedKey, iv, tag, new Uint8Array(0));
}
