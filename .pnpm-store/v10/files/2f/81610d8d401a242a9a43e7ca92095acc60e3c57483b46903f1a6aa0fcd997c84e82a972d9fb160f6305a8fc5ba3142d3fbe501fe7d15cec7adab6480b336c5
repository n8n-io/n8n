/**
 * Generates a RFC4122 version 4 UUID
 *
 * This function generates a random UUID using one of two methods:
 * 1. The native randomUUID() function if available
 * 2. A fallback implementation using crypto.getRandomValues()
 *
 * The fallback implementation:
 * - Generates 16 random bytes using crypto.getRandomValues()
 * - Sets the version bits to indicate version 4
 * - Sets the variant bits to indicate RFC4122
 * - Formats the bytes as a UUID string with dashes
 *
 * @returns A version 4 UUID string in the format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 * where x is any hexadecimal digit and y is one of 8, 9, a, or b.
 *
 * @internal
 */
export declare const v4: () => string;
