import { NANOID_ALPHABET } from '@n8n/constants';
import { customAlphabet } from 'nanoid';

/**
 * Generates a unique 16-character nanoid.
 *
 * This is the canonical ID generator used across the entire n8n codebase for:
 * - Workflow IDs
 * - Project IDs
 * - Variable IDs
 * - API Key IDs
 * - And other entity IDs
 *
 * Both frontend and backend MUST use this function to ensure consistency.
 *
 * @returns A 16-character ID
 *
 * @example
 * ```ts
 * const id = generateNanoId();
 * // => 'aBcDeFgHiJkLmNoP' (16 characters)
 * ```
 */
export const generateNanoId = customAlphabet(NANOID_ALPHABET, 16);
