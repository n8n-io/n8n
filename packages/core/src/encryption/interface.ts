export type CipherAlgorithm = 'aes-256-cbc' | 'aes-256-gcm';

/**
 * Adapter for a single cipher algorithm. `Cipher` dispatches encrypt/decrypt
 * calls to an implementation by algorithm.
 *
 * Key format is implementation-specific:
 * - `CipherAes256CBC` accepts any string (passed to the MD5-based legacy KDF).
 * - `CipherAes256GCM` requires a 64-character hex string (32 raw bytes).
 */
export interface CipherWrapper {
	encrypt(data: string, key: string): string;
	decrypt(data: string, key: string): string;
}
