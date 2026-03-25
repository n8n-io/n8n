import { type Cipher } from "@noble/ciphers/utils";
/**
 * make `node:crypto`'s ciphers compatible with `@noble/ciphers`.
 *
 * `Cipher`'s interface is the same for both `aes-256-gcm` and `chacha20-poly1305`,
 * albeit the latter is one of `CipherCCMTypes`.
 * Interestingly, whether to set `plaintextLength` or not, or which value to set, has no actual effect.
 */
export declare const _compat: (algorithm: "aes-256-gcm" | "aes-256-cbc" | "chacha20-poly1305", key: Uint8Array, nonce: Uint8Array, AAD?: Uint8Array) => Cipher;
