import { z } from 'zod';

/**
 * Deliberately looser than `isObject` in `n8n-workflow`, which also rejects `Date`, `Map` and class
 * instances. Public API response schemas are validated at runtime, so a rejection is a 500 rather
 * than a 400 — legacy rows must keep passing.
 */
const isObjectLike = (value: unknown): boolean =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

export const objectGuardSchema = <T>(message = 'Must be an object') =>
	z.custom<T>(isObjectLike, { message });

export const nullableObjectGuardSchema = <T>(message = 'Must be an object or null') =>
	z.custom<T | null>((value) => value === null || isObjectLike(value), { message });
