/**
 * Safe Property Access Utilities
 *
 * Type-safe utilities for accessing object properties without unsafe casts.
 */

/**
 * Type guard to check if a value is a plain object (not null, array, or primitive).
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Safely get a property from an unknown value.
 * Returns undefined if the value is not a plain object or the property doesn't exist.
 *
 * @param value - The value to get a property from
 * @param key - The property key
 * @returns The property value, or undefined if not accessible
 */
export function getProperty<T>(value: unknown, key: string): T | undefined {
	if (!isPlainObject(value)) {
		return undefined;
	}
	return value[key] as T | undefined;
}

/**
 * Check if a plain object has a specific property.
 * Returns false if the value is not a plain object.
 *
 * @param value - The value to check
 * @param key - The property key
 * @returns true if the value is an object and has the property
 */
export function hasProperty(value: unknown, key: string): boolean {
	if (!isPlainObject(value)) {
		return false;
	}
	return key in value;
}
