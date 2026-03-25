export declare function assertUuid(str: string, which?: string): string;
/**
 * Generate a UUID v7 from a timestamp.
 *
 * @param timestamp - The timestamp in milliseconds
 * @returns A UUID v7 string
 */
export declare function uuid7FromTime(timestamp: number | string): string;
/**
 * Get the version of a UUID string.
 * @param uuidStr - The UUID string to check
 * @returns The version number (1-7) or null if invalid
 */
export declare function getUuidVersion(uuidStr: string): number | null;
/**
 * Warn if a UUID is not version 7.
 *
 * @param uuidStr - The UUID string to check
 * @param idType - The type of ID (e.g., "run_id", "trace_id") for the warning message
 */
export declare function warnIfNotUuidV7(uuidStr: string, _idType: string): void;
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
export declare function nonCryptographicUuid7Deterministic(originalId: string, key: string): string;
