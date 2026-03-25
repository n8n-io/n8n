"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertUuid = assertUuid;
exports.uuid7FromTime = uuid7FromTime;
exports.getUuidVersion = getUuidVersion;
exports.warnIfNotUuidV7 = warnIfNotUuidV7;
exports.nonCryptographicUuid7Deterministic = nonCryptographicUuid7Deterministic;
// Relaxed UUID validation regex (allows any valid UUID format including nil UUIDs)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const uuid_1 = require("uuid");
const warn_js_1 = require("./warn.cjs");
const xxhash_js_1 = require("./xxhash/xxhash.cjs");
let UUID7_WARNING_EMITTED = false;
function assertUuid(str, which) {
    // Use relaxed regex validation instead of strict uuid.validate()
    // This allows edge cases like nil UUIDs or test UUIDs that might not pass strict validation
    if (!UUID_REGEX.test(str)) {
        const msg = which !== undefined
            ? `Invalid UUID for ${which}: ${str}`
            : `Invalid UUID: ${str}`;
        throw new Error(msg);
    }
    return str;
}
/**
 * Generate a UUID v7 from a timestamp.
 *
 * @param timestamp - The timestamp in milliseconds
 * @returns A UUID v7 string
 */
function uuid7FromTime(timestamp) {
    const msecs = typeof timestamp === "string" ? Date.parse(timestamp) : timestamp;
    // Work around uuid@10 behavior where providing only { msecs }
    // may not set the internal timestamp used for stringification.
    // Providing a seq ensures the implementation updates its internal state
    // and encodes the provided milliseconds into the UUID bytes.
    return (0, uuid_1.v7)({ msecs, seq: 0 });
}
/**
 * Get the version of a UUID string.
 * @param uuidStr - The UUID string to check
 * @returns The version number (1-7) or null if invalid
 */
function getUuidVersion(uuidStr) {
    if (!UUID_REGEX.test(uuidStr)) {
        return null;
    }
    // Version is in bits 48-51
    // Format: xxxxxxxx-xxxx-Vxxx-xxxx-xxxxxxxxxxxx
    const versionChar = uuidStr[14];
    return parseInt(versionChar, 16);
}
/**
 * Warn if a UUID is not version 7.
 *
 * @param uuidStr - The UUID string to check
 * @param idType - The type of ID (e.g., "run_id", "trace_id") for the warning message
 */
function warnIfNotUuidV7(uuidStr, _idType) {
    const version = getUuidVersion(uuidStr);
    if (version !== null && version !== 7 && !UUID7_WARNING_EMITTED) {
        UUID7_WARNING_EMITTED = true;
        (0, warn_js_1.warnOnce)(`LangSmith now uses UUID v7 for run and trace identifiers. ` +
            `This warning appears when passing custom IDs. ` +
            `Please use: import { uuidv7 } from 'langsmith'; const id = uuidv7(); ` +
            `Future versions will require UUID v7.`);
    }
}
/**
 * Convert a UUID string to its 16-byte representation.
 * @param uuidStr - The UUID string (with or without dashes)
 * @returns A Uint8Array containing the 16 bytes of the UUID
 */
function uuidToBytes(uuidStr) {
    const hex = uuidStr.replace(/-/g, "");
    const bytes = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
        bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes;
}
/**
 * Convert 16 bytes to a UUID string.
 * @param bytes - A Uint8Array containing 16 bytes
 * @returns A UUID string in standard format
 */
function bytesToUuid(bytes) {
    const hex = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
// Reuse TextEncoder instance for performance
const _textEncoder = new TextEncoder();
/**
 * Generates a 16-byte fingerprint for deterministic UUID generation using XXH3-128.
 *
 * XXH3 is an extremely fast, non-cryptographic hash function that provides excellent
 * collision resistance. It's widely used in production systems and compatible with
 * xxHash implementations in other languages.
 *
 * See: https://github.com/Cyan4973/xxHash
 *
 * @param str - The input string to hash
 * @returns A Uint8Array containing 16 bytes of hash output
 */
function _fastHash128(str) {
    const data = _textEncoder.encode(str);
    // Compute XXH3-128 hash and convert to bytes
    const hash128 = (0, xxhash_js_1.XXH3_128)(data);
    return (0, xxhash_js_1.xxh128ToBytes)(hash128);
}
/**
 * Generate a deterministic UUID v7 derived from an original UUID and a key.
 *
 * This function creates a new UUID that:
 * - Preserves the timestamp from the original UUID if it's UUID v7
 * - Uses current time if the original is not UUID v7
 * - Uses deterministic "random" bits derived from hashing the original + key
 * - Is valid UUID v7 format
 *
 * This is used for creating replica IDs that maintain time-ordering properties
 * while being deterministic across distributed systems.
 *
 * @param originalId - The source UUID string (ideally UUID v7 to preserve timestamp)
 * @param key - A string key used for deterministic derivation (e.g., project name)
 * @returns A new UUID v7 string with preserved timestamp (if original is v7) and
 *          deterministic random bits
 *
 * @example
 * ```typescript
 * const original = uuidv7();
 * const replicaId = nonCryptographicUuid7Deterministic(original, "replica-project");
 * // Same inputs always produce same output
 * assert(nonCryptographicUuid7Deterministic(original, "replica-project") === replicaId);
 * ```
 */
function nonCryptographicUuid7Deterministic(originalId, key) {
    // Generate deterministic bytes from hash of original + key
    const hashInput = `${originalId}:${key}`;
    const h = _fastHash128(hashInput);
    // Build new UUID7:
    // UUID7 structure (RFC 9562):
    // [0-5]  48 bits: unix_ts_ms (timestamp in milliseconds)
    // [6]    4 bits: version (0111 = 7) + 4 bits rand_a
    // [7]    8 bits: rand_a (continued)
    // [8]    2 bits: variant (10) + 6 bits rand_b
    // [9-15] 56 bits: rand_b (continued)
    const b = new Uint8Array(16);
    // Check if original is UUID v7 - if so, preserve its timestamp
    // If not, use current time to ensure the derived UUID has a valid timestamp
    const version = getUuidVersion(originalId);
    if (version === 7) {
        // Preserve timestamp from original UUID7 (bytes 0-5)
        const originalBytes = uuidToBytes(originalId);
        b.set(originalBytes.slice(0, 6), 0);
    }
    else {
        // Generate fresh timestamp for non-UUID7 inputs
        // This matches the uuid npm package's v7 implementation:
        // https://github.com/uuidjs/uuid/blob/main/src/v7.ts
        const msecs = Date.now();
        b[0] = (msecs / 0x10000000000) & 0xff;
        b[1] = (msecs / 0x100000000) & 0xff;
        b[2] = (msecs / 0x1000000) & 0xff;
        b[3] = (msecs / 0x10000) & 0xff;
        b[4] = (msecs / 0x100) & 0xff;
        b[5] = msecs & 0xff;
    }
    // Set version 7 (0111) in high nibble + 4 bits from hash
    b[6] = 0x70 | (h[0] & 0x0f);
    // rand_a continued (8 bits from hash)
    b[7] = h[1];
    // Set variant (10) in high 2 bits + 6 bits from hash
    b[8] = 0x80 | (h[2] & 0x3f);
    // rand_b (56 bits = 7 bytes from hash)
    b.set(h.slice(3, 10), 9);
    return bytesToUuid(b);
}
