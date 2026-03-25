import { checkEncCryptoKey } from './crypto_key.js';
function checkKeySize(key, alg) {
    if (key.algorithm.length !== parseInt(alg.slice(1, 4), 10)) {
        throw new TypeError(`Invalid key size for alg: ${alg}`);
    }
}
function getCryptoKey(key, alg, usage) {
    if (key instanceof Uint8Array) {
        return crypto.subtle.importKey('raw', key, 'AES-KW', true, [usage]);
    }
    checkEncCryptoKey(key, alg, usage);
    return key;
}
export async function wrap(alg, key, cek) {
    const cryptoKey = await getCryptoKey(key, alg, 'wrapKey');
    checkKeySize(cryptoKey, alg);
    const cryptoKeyCek = await crypto.subtle.importKey('raw', cek, { hash: 'SHA-256', name: 'HMAC' }, true, ['sign']);
    return new Uint8Array(await crypto.subtle.wrapKey('raw', cryptoKeyCek, cryptoKey, 'AES-KW'));
}
export async function unwrap(alg, key, encryptedKey) {
    const cryptoKey = await getCryptoKey(key, alg, 'unwrapKey');
    checkKeySize(cryptoKey, alg);
    const cryptoKeyCek = await crypto.subtle.unwrapKey('raw', encryptedKey, cryptoKey, 'AES-KW', { hash: 'SHA-256', name: 'HMAC' }, true, ['sign']);
    return new Uint8Array(await crypto.subtle.exportKey('raw', cryptoKeyCek));
}
