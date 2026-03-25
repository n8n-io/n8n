import encrypt from '../runtime/encrypt.js';
import decrypt from '../runtime/decrypt.js';
import generateIv from './iv.js';
import { encode as base64url } from '../runtime/base64url.js';
export async function wrap(alg, key, cek, iv) {
    const jweAlgorithm = alg.slice(0, 7);
    iv || (iv = generateIv(jweAlgorithm));
    const { ciphertext: encryptedKey, tag } = await encrypt(jweAlgorithm, cek, key, iv, new Uint8Array(0));
    return { encryptedKey, iv: base64url(iv), tag: base64url(tag) };
}
export async function unwrap(alg, key, encryptedKey, iv, tag) {
    const jweAlgorithm = alg.slice(0, 7);
    return decrypt(jweAlgorithm, key, encryptedKey, iv, tag, new Uint8Array(0));
}
