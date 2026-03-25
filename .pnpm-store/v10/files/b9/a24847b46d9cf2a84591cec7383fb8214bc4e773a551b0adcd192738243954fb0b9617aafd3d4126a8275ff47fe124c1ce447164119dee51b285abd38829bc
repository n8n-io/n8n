import { type AsyncCipher, type Cipher } from './utils.ts';
/**
 * Secure PRNG. Uses `crypto.getRandomValues`, which defers to OS.
 */
export declare function randomBytes(bytesLength?: number): Uint8Array;
export declare function getWebcryptoSubtle(): any;
type RemoveNonceInner<T extends any[], Ret> = ((...args: T) => Ret) extends (arg0: any, arg1: any, ...rest: infer R) => any ? (key: Uint8Array, ...args: R) => Ret : never;
type RemoveNonce<T extends (...args: any) => any> = RemoveNonceInner<Parameters<T>, ReturnType<T>>;
type CipherWithNonce = ((key: Uint8Array, nonce: Uint8Array, ...args: any[]) => Cipher) & {
    nonceLength: number;
};
/**
 * Uses CSPRG for nonce, nonce injected in ciphertext.
 * @example
 * const gcm = managedNonce(aes.gcm);
 * const ciphr = gcm(key).encrypt(data);
 * const plain = gcm(key).decrypt(ciph);
 */
export declare function managedNonce<T extends CipherWithNonce>(fn: T): RemoveNonce<T>;
export declare const utils: {
    encrypt: (key: Uint8Array, ...all: any[]) => Promise<Uint8Array>;
    decrypt: (key: Uint8Array, ...all: any[]) => Promise<Uint8Array>;
};
/** AES-CBC, native webcrypto version */
export declare const cbc: (key: Uint8Array, iv: Uint8Array) => AsyncCipher;
/** AES-CTR, native webcrypto version */
export declare const ctr: (key: Uint8Array, nonce: Uint8Array) => AsyncCipher;
/** AES-GCM, native webcrypto version */
export declare const gcm: (key: Uint8Array, nonce: Uint8Array, AAD?: Uint8Array) => AsyncCipher;
export {};
//# sourceMappingURL=webcrypto.d.ts.map