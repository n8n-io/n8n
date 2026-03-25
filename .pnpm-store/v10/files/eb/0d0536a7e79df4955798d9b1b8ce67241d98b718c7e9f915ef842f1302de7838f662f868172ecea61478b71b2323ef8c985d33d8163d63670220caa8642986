/**
 * WebCrypto-based AES gcm/ctr/cbc, `managedNonce` and `randomBytes`.
 * We use WebCrypto aka globalThis.crypto, which exists in browsers and node.js 16+.
 * node.js versions earlier than v19 don't declare it in global scope.
 * For node.js, package.js on#exports field mapping rewrites import
 * from `crypto` to `cryptoNode`, which imports native module.
 * Makes the utils un-importable in browsers without a bundler.
 * Once node.js 18 is deprecated, we can just drop the import.
 * @module
 */
// Use full path so that Node.js can rewrite it to `cryptoNode.js`.
import { crypto } from '@noble/ciphers/crypto';
import { abytes, anumber, concatBytes } from "./utils.js";
/**
 * Secure PRNG. Uses `crypto.getRandomValues`, which defers to OS.
 */
export function randomBytes(bytesLength = 32) {
    if (crypto && typeof crypto.getRandomValues === 'function') {
        return crypto.getRandomValues(new Uint8Array(bytesLength));
    }
    // Legacy Node.js compatibility
    if (crypto && typeof crypto.randomBytes === 'function') {
        return Uint8Array.from(crypto.randomBytes(bytesLength));
    }
    throw new Error('crypto.getRandomValues must be defined');
}
export function getWebcryptoSubtle() {
    if (crypto && typeof crypto.subtle === 'object' && crypto.subtle != null)
        return crypto.subtle;
    throw new Error('crypto.subtle must be defined');
}
/**
 * Uses CSPRG for nonce, nonce injected in ciphertext.
 * @example
 * const gcm = managedNonce(aes.gcm);
 * const ciphr = gcm(key).encrypt(data);
 * const plain = gcm(key).decrypt(ciph);
 */
export function managedNonce(fn) {
    const { nonceLength } = fn;
    anumber(nonceLength);
    return ((key, ...args) => ({
        encrypt(plaintext, ...argsEnc) {
            const nonce = randomBytes(nonceLength);
            const ciphertext = fn(key, nonce, ...args).encrypt(plaintext, ...argsEnc);
            const out = concatBytes(nonce, ciphertext);
            ciphertext.fill(0);
            return out;
        },
        decrypt(ciphertext, ...argsDec) {
            const nonce = ciphertext.subarray(0, nonceLength);
            const data = ciphertext.subarray(nonceLength);
            return fn(key, nonce, ...args).decrypt(data, ...argsDec);
        },
    }));
}
// Overridable
// @TODO
export const utils = {
    async encrypt(key, keyParams, cryptParams, plaintext) {
        const cr = getWebcryptoSubtle();
        const iKey = await cr.importKey('raw', key, keyParams, true, ['encrypt']);
        const ciphertext = await cr.encrypt(cryptParams, iKey, plaintext);
        return new Uint8Array(ciphertext);
    },
    async decrypt(key, keyParams, cryptParams, ciphertext) {
        const cr = getWebcryptoSubtle();
        const iKey = await cr.importKey('raw', key, keyParams, true, ['decrypt']);
        const plaintext = await cr.decrypt(cryptParams, iKey, ciphertext);
        return new Uint8Array(plaintext);
    },
};
const mode = {
    CBC: 'AES-CBC',
    CTR: 'AES-CTR',
    GCM: 'AES-GCM',
};
function getCryptParams(algo, nonce, AAD) {
    if (algo === mode.CBC)
        return { name: mode.CBC, iv: nonce };
    if (algo === mode.CTR)
        return { name: mode.CTR, counter: nonce, length: 64 };
    if (algo === mode.GCM) {
        if (AAD)
            return { name: mode.GCM, iv: nonce, additionalData: AAD };
        else
            return { name: mode.GCM, iv: nonce };
    }
    throw new Error('unknown aes block mode');
}
function generate(algo) {
    return (key, nonce, AAD) => {
        abytes(key);
        abytes(nonce);
        const keyParams = { name: algo, length: key.length * 8 };
        const cryptParams = getCryptParams(algo, nonce, AAD);
        let consumed = false;
        return {
            // keyLength,
            encrypt(plaintext) {
                abytes(plaintext);
                if (consumed)
                    throw new Error('Cannot encrypt() twice with same key / nonce');
                consumed = true;
                return utils.encrypt(key, keyParams, cryptParams, plaintext);
            },
            decrypt(ciphertext) {
                abytes(ciphertext);
                return utils.decrypt(key, keyParams, cryptParams, ciphertext);
            },
        };
    };
}
/** AES-CBC, native webcrypto version */
export const cbc = /* @__PURE__ */ (() => generate(mode.CBC))();
/** AES-CTR, native webcrypto version */
export const ctr = /* @__PURE__ */ (() => generate(mode.CTR))();
/** AES-GCM, native webcrypto version */
export const gcm = 
/* @__PURE__ */ (() => generate(mode.GCM))();
// // Type tests
// import { siv, gcm, ctr, ecb, cbc } from '../aes.ts';
// import { xsalsa20poly1305 } from '../salsa.ts';
// import { chacha20poly1305, xchacha20poly1305 } from '../chacha.ts';
// const wsiv = managedNonce(siv);
// const wgcm = managedNonce(gcm);
// const wctr = managedNonce(ctr);
// const wcbc = managedNonce(cbc);
// const wsalsapoly = managedNonce(xsalsa20poly1305);
// const wchacha = managedNonce(chacha20poly1305);
// const wxchacha = managedNonce(xchacha20poly1305);
// // should fail
// const wcbc2 = managedNonce(managedNonce(cbc));
// const wctr = managedNonce(ctr);
//# sourceMappingURL=webcrypto.js.map