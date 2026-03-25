import { encode as b64u } from '../util/base64url.js';
import * as aeskw from './aeskw.js';
import { checkEncCryptoKey } from './crypto_key.js';
import { concat, encoder } from './buffer_utils.js';
import { JWEInvalid } from '../util/errors.js';
function getCryptoKey(key, alg) {
    if (key instanceof Uint8Array) {
        return crypto.subtle.importKey('raw', key, 'PBKDF2', false, ['deriveBits']);
    }
    checkEncCryptoKey(key, alg, 'deriveBits');
    return key;
}
const concatSalt = (alg, p2sInput) => concat(encoder.encode(alg), new Uint8Array([0]), p2sInput);
async function deriveKey(p2s, alg, p2c, key) {
    if (!(p2s instanceof Uint8Array) || p2s.length < 8) {
        throw new JWEInvalid('PBES2 Salt Input must be 8 or more octets');
    }
    const salt = concatSalt(alg, p2s);
    const keylen = parseInt(alg.slice(13, 16), 10);
    const subtleAlg = {
        hash: `SHA-${alg.slice(8, 11)}`,
        iterations: p2c,
        name: 'PBKDF2',
        salt,
    };
    const cryptoKey = await getCryptoKey(key, alg);
    return new Uint8Array(await crypto.subtle.deriveBits(subtleAlg, cryptoKey, keylen));
}
export async function wrap(alg, key, cek, p2c = 2048, p2s = crypto.getRandomValues(new Uint8Array(16))) {
    const derived = await deriveKey(p2s, alg, p2c, key);
    const encryptedKey = await aeskw.wrap(alg.slice(-6), derived, cek);
    return { encryptedKey, p2c, p2s: b64u(p2s) };
}
export async function unwrap(alg, key, encryptedKey, p2c, p2s) {
    const derived = await deriveKey(p2s, alg, p2c, key);
    return aeskw.unwrap(alg.slice(-6), derived, encryptedKey);
}
