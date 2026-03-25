import { H as HashOptions } from './shared/ohash.DTXTHv91.cjs';
export { d as diff, i as isEqual, o as objectHash, o as serialize } from './shared/ohash.DTXTHv91.cjs';

/**
 * Hash any JS value into a string
 * @param {object} object value to hash
 * @param {HashOptions} options hashing options. See {@link HashOptions}.
 * @return {string} hash value
 * @api public
 */
declare function hash(object: any, options?: HashOptions): string;

/**
 * JS Implementation of MurmurHash3 (r136) (as of May 20, 2011)
 *
 * @param {Uint8Array | string} key
 * @param {number} seed Positive integer only
 * @return {number} 32-bit positive integer hash
 */
declare function murmurHash(key: Uint8Array | string, seed?: number): number;

/**
 * Calculates the SHA-256 hash of the message provided.
 *
 * @param {string} message - The message to hash.
 * @returns {string} The message hash as a hexadecimal string.
 */
declare function sha256(message: string): string;
/**
 * Calculates the SHA-256 hash of the given message and encodes it in Base64.
 *
 * @param {string} message - The message to hash.
 * @returns {string} The base64 encoded hash of the message.
 */
declare function sha256base64(message: string): string;

export { sha256base64 as digest, hash, murmurHash, sha256, sha256base64 };
